import { randomUUID } from 'node:crypto';
import { copyFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { LANGUAGES } from '../constants';
import type { Caption, CaptionStyle } from '../types';
import { toAss } from './captions';
import { cleanDirectory, ffmpegPath, FONT_DIRECTORY, probeVideo, runProcess } from './media';
import { ApiError, outputDimensions } from './validation';

type JobStatus = 'queued' | 'processing' | 'complete' | 'failed';
export type ExportJob = { id: string; session: string; status: JobStatus; progress: number; createdAt: number; finishedAt?: number; error?: string; directory: string; output: string };
type ExportInput = { directory: string; video: string; captions: Caption[]; style: CaptionStyle; resolution: string; language: string; session: string; ownedVideo: boolean };
type JobState = { jobs: Map<string, ExportJob>; running: number; transcriptions: number; queue: { job: ExportJob; input: ExportInput }[]; timer?: ReturnType<typeof setInterval> };
const globalJobs = globalThis as typeof globalThis & { kaptioJobState?: JobState };
const state: JobState = globalJobs.kaptioJobState ?? { jobs: new Map<string, ExportJob>(), running: 0, transcriptions: 0, queue: [] };
globalJobs.kaptioJobState = state;
const MAX_CONCURRENT = 2;
const RETENTION = 60 * 60 * 1000;

async function sweepJobs() {
  for (const [id, job] of state.jobs) {
    if (job.finishedAt && Date.now() - job.finishedAt > RETENTION) {
      await cleanDirectory(job.directory).catch(() => undefined);
      state.jobs.delete(id);
    }
  }
}
if (!state.timer) {
  state.timer = setInterval(() => { void sweepJobs(); }, 5 * 60 * 1000);
  state.timer.unref();
}

export function acquireTranscription(): () => void {
  if (state.transcriptions >= 1) throw new ApiError('A local transcription is already running on this server. Please try again when it finishes.', 429);
  state.transcriptions++;
  return () => { state.transcriptions = Math.max(0, state.transcriptions - 1); };
}

export function canQueueExport(): void {
  if (state.queue.length + state.running >= 8) throw new ApiError('The export queue is full. Please try again shortly.', 429);
}

export function enqueueExport(input: ExportInput): ExportJob {
  canQueueExport();
  const job: ExportJob = { id: randomUUID(), session: input.session, status: 'queued', progress: 0, createdAt: Date.now(), directory: input.directory, output: path.join(input.directory, 'kaptio.mp4') };
  state.jobs.set(job.id, job);
  state.queue.push({ job, input });
  drain();
  return job;
}

export function findExport(id: string, session?: string): ExportJob {
  const job = state.jobs.get(id);
  if (!job || !session || job.session !== session || (job.finishedAt && Date.now() - job.finishedAt > RETENTION)) throw new ApiError('This export is unavailable or has expired. Export the project again.', 404);
  return job;
}

function drain() {
  while (state.running < MAX_CONCURRENT && state.queue.length) {
    const item = state.queue.shift()!;
    state.running++;
    void render(item.job, item.input).finally(() => { state.running--; drain(); });
  }
}

async function render(job: ExportJob, input: ExportInput) {
  job.status = 'processing';
  job.progress = 2;
  try {
    const metadata = await probeVideo(input.video);
    if (input.captions.some(caption => caption.end > metadata.duration + 0.15)) throw new ApiError('A caption extends past the end of the video. Adjust its timing before exporting.');
    const dimensions = outputDimensions(metadata.width, metadata.height, input.resolution);
    const rtl = LANGUAGES.find(language => language.code === input.language)?.dir === 'rtl';
    const ass = toAss(input.captions, input.style, dimensions.width, dimensions.height, rtl);
    await writeFile(path.join(input.directory, 'captions.ass'), ass, 'utf8');
    // Relative filter paths avoid platform-specific escaping and untrusted interpolation.
    const fontFiles = await readdir(FONT_DIRECTORY).catch((): string[] => []);
    const fontFile = `${input.style.fontFamily.replace(/\s+/g, '-')}.ttf`;
    // Bundled fonts are preferred, but fontconfig on the host may provide a usable fallback.
    if (fontFiles.includes(fontFile)) await copyFile(path.join(FONT_DIRECTORY, fontFile), path.join(input.directory, 'caption-font.ttf'));
    const filter = `scale=${dimensions.width}:${dimensions.height},setsar=1,ass=filename=captions.ass:fontsdir=.`;
    let lineBuffer = '';
    job.progress = 5;
    await runProcess(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', input.video, '-map', '0:v:0', '-map', '0:a:0?', '-vf', filter, '-c:v', 'libx264', '-preset', 'fast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', '-progress', 'pipe:1', '-nostats', '-y', 'kaptio.mp4'], {
      cwd: input.directory, timeout: 30 * 60 * 1000,
      onOutput(chunk) {
        lineBuffer += chunk;
        const lines = lineBuffer.split(/\r?\n/);
        lineBuffer = lines.pop() || '';
        for (const line of lines) {
          const match = line.match(/^out_time_us=(\d+)/);
          if (match) job.progress = Math.min(98, Math.max(job.progress, Math.round(Number(match[1]) / 1_000_000 / metadata.duration * 94 + 5)));
        }
      },
    });
    job.status = 'complete';
    job.progress = 100;
  } catch (error) {
    job.status = 'failed';
    job.error = error instanceof ApiError ? error.message : 'Export could not finish. Please try again.';
    await rm(job.output, { force: true }).catch(() => undefined);
  } finally {
    job.finishedAt = Date.now();
    // Only the completed result remains on disk during the download window.
    if (input.ownedVideo) await rm(input.video, { force: true }).catch(() => undefined);
    await Promise.all(['captions.ass', 'caption-font.ttf'].map(file => rm(path.join(/*turbopackIgnore: true*/ input.directory, file), { force: true }).catch(() => undefined)));
  }
}
