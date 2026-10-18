import { errorResponse, getSession } from '@/lib/engine/http';
import { findExport } from '@/lib/engine/jobs';

export const runtime = 'nodejs';
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const job = findExport(id, getSession(request));
    return Response.json({ status: job.status, progress: job.progress, error: job.error, ...(job.status === 'complete' ? { downloadUrl: `/api/export/${job.id}/download` } : {}) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return errorResponse(error); }
}
