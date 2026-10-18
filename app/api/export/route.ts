import path from 'node:path';
import { authorizeMutation, createSession, errorResponse, readMultipart } from '@/lib/engine/http';
import { canQueueExport, enqueueExport } from '@/lib/engine/jobs';
import { cleanDirectory, createWorkDirectory, persistUpload, SAMPLE_PATH } from '@/lib/engine/media';
import { ApiError, outputDimensions, parseJson, validateCaptions, validateLanguage, validateStyle, validateVideo } from '@/lib/engine/validation';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  let directory: string | undefined;
  let queued = false;
  try {
    authorizeMutation(request);
    canQueueExport();
    const form = await readMultipart(request);
    const captions = validateCaptions(parseJson(form.get('captions'), 'captions'));
    if (!captions.some(caption => caption.text.trim())) throw new ApiError('Add at least one caption before exporting.');
    const style = validateStyle(parseJson(form.get('style'), 'caption style'));
    const language = validateLanguage(form.get('language'));
    const resolution = String(form.get('resolution') || 'source');
    outputDimensions(1920, 1080, resolution); // Validate options before saving a file.
    const sample = form.get('sample') === 'true';
    const file = sample ? undefined : validateVideo(form.get('video'));
    directory = await createWorkDirectory();
    const video = sample ? SAMPLE_PATH : path.join(directory, 'input.video');
    if (file) await persistUpload(file, video);
    const { session, cookie } = createSession(request);
    const job = enqueueExport({ directory, video, captions, style, resolution, language, session, ownedVideo: !sample });
    queued = true;
    return Response.json({ jobId: job.id }, { status: 202, headers: cookie ? { 'Set-Cookie': cookie } : undefined });
  } catch (error) { return errorResponse(error); }
  finally { if (directory && !queued) await cleanDirectory(directory).catch(() => undefined); }
}
