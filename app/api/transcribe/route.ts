import path from 'node:path';
import { authorizeMutation, errorResponse, readMultipart } from '@/lib/engine/http';
import { acquireTranscription } from '@/lib/engine/jobs';
import { cleanDirectory, createWorkDirectory, extractAudio, persistUpload, probeVideo } from '@/lib/engine/media';
import { transcribeAudio } from '@/lib/engine/transcription';
import { ApiError, validateLanguage, validateVideo } from '@/lib/engine/validation';

export const runtime = 'nodejs';
export const maxDuration = 300;

export async function POST(request: Request) {
  let directory: string | undefined;
  let release: (() => void) | undefined;
  try {
    authorizeMutation(request);
    release = acquireTranscription();
    const form = await readMultipart(request);
    const video = validateVideo(form.get('video'));
    const language = validateLanguage(form.get('language'));
    directory = await createWorkDirectory();
    const videoPath = path.join(directory, 'input.video');
    const audioPath = path.join(directory, 'audio.wav');
    await persistUpload(video, videoPath);
    const metadata = await probeVideo(videoPath, request.signal);
    if (!metadata.hasAudio) throw new ApiError('This video has no audio track. Add captions manually or upload a video with speech.', 422);
    await extractAudio(videoPath, audioPath, request.signal);
    const captions = await transcribeAudio(audioPath, language, metadata.duration, request.signal);
    return Response.json({ captions, language, duration: metadata.duration });
  } catch (error) { return errorResponse(error); }
  finally {
    release?.();
    if (directory) await cleanDirectory(directory).catch(() => undefined);
  }
}
