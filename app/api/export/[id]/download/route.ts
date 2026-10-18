import { stat } from 'node:fs/promises';
import { errorResponse, getSession } from '@/lib/engine/http';
import { findExport } from '@/lib/engine/jobs';
import { fileResponseStream } from '@/lib/engine/media';
import { ApiError } from '@/lib/engine/validation';

export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = findExport(id, getSession(request));
    if (job.status !== 'complete') throw new ApiError('Your export is still being prepared.', 409);
    const file = await stat(job.output);
    return new Response(fileResponseStream(job.output), { headers: { 'Content-Type': 'video/mp4', 'Content-Disposition': 'attachment; filename="kaptio-captioned.mp4"', 'Content-Length': String(file.size), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) { return errorResponse(error); }
}
