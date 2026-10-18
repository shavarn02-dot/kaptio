import { randomBytes, timingSafeEqual } from 'node:crypto';
import { ApiError, MAX_UPLOAD_BYTES } from './validation';

export function errorResponse(error: unknown): Response {
  if (error instanceof ApiError) return Response.json({ error: error.message }, { status: error.status });
  console.error('[Kaptio]', error instanceof Error ? error.message : 'Unexpected error');
  return Response.json({ error: 'Something went wrong while processing your video. Please try again.' }, { status: 500 });
}

/** Reject cross-origin mutations. Optional bearer token protects private deployments. */
export function authorizeMutation(request: Request): void {
  const originHeader = request.headers.get('origin');
  if (originHeader) {
    const requestUrl = new URL(request.url);
    const headerValue = (name: string) => request.headers.get(name)?.split(',')[0].trim();
    const host = headerValue('x-forwarded-host') || headerValue('host') || requestUrl.host;
    const protocol = headerValue('x-forwarded-proto') || requestUrl.protocol.slice(0, -1);
    try {
      const origin = new URL(originHeader).origin;
      const expectedOrigin = new URL(`${protocol}://${host}`).origin;
      if (origin !== expectedOrigin) throw new ApiError('This request is not permitted.', 403);
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError('This request is not permitted.', 403);
    }
  }
  const configured = process.env.KAPTIO_API_TOKEN;
  if (configured) {
    const supplied = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') || '';
    const expected = Buffer.from(configured);
    const actual = Buffer.from(supplied);
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) throw new ApiError('This private server requires an API access token.', 401);
  }
}

/** The byte limit also applies to requests without Content-Length. */
export async function readMultipart(request: Request): Promise<FormData> {
  const maximum = MAX_UPLOAD_BYTES + 3_000_000;
  if (Number(request.headers.get('content-length')) > maximum) throw new ApiError('Choose a video under 150 MB.', 413);
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.startsWith('multipart/form-data') || !request.body) throw new ApiError('Send the video as multipart form data.');
  let received = 0;
  const limit = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      received += chunk.byteLength;
      if (received > maximum) throw new ApiError('Choose a video under 150 MB.', 413);
      controller.enqueue(chunk);
    },
  });
  try {
    return await new Response(request.body.pipeThrough(limit), { headers: { 'Content-Type': contentType } }).formData();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError('The upload was interrupted or could not be read. Please try again.');
  }
}

export function getSession(request: Request): string | undefined {
  return request.headers.get('cookie')?.match(/(?:^|;\s*)kaptio_session=([a-f0-9]{64})(?:;|$)/)?.[1];
}

export function createSession(request: Request): { session: string; cookie?: string } {
  const existing = getSession(request);
  if (existing) return { session: existing };
  const session = randomBytes(32).toString('hex');
  const secure = new URL(request.url).protocol === 'https:' ? '; Secure' : '';
  return { session, cookie: `kaptio_session=${session}; HttpOnly; SameSite=Strict; Path=/; Max-Age=86400${secure}` };
}
