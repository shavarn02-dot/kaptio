import { spawn } from 'node:child_process';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import { ApiError, MAX_DURATION } from './validation';

export const TEMP_ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.KAPTIO_TEMP_DIR || path.join(os.tmpdir(), 'kaptio'));
export const FONT_DIRECTORY = path.join(process.cwd(), 'public', 'fonts');
export const SAMPLE_PATH = path.join(process.cwd(), 'public', 'media', 'demo.mp4');

export async function createWorkDirectory(): Promise<string> {
  await mkdir(TEMP_ROOT, { recursive: true });
  return mkdtemp(path.join(TEMP_ROOT, 'job-'));
}

export async function cleanDirectory(directory: string): Promise<void> {
  const relative = path.relative(TEMP_ROOT, path.resolve(directory));
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) await rm(directory, { recursive: true, force: true });
}

export async function persistUpload(file: File, destination: string): Promise<void> {
  await pipeline(Readable.fromWeb(file.stream() as import('node:stream/web').ReadableStream<Uint8Array>), createWriteStream(destination, { flags: 'wx' }));
}

type RunOptions = { cwd?: string; timeout?: number; signal?: AbortSignal; onOutput?: (line: string) => void };

export function runProcess(binary: string, args: string[], options: RunOptions = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(binary, args, { cwd: options.cwd, windowsHide: true, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let settled = false;
    const abort = () => { child.kill('SIGKILL'); finish(new ApiError('Processing was cancelled.', 499)); };
    const timer = setTimeout(() => { child.kill('SIGKILL'); finish(new ApiError('Video processing timed out. Try a shorter video.', 504)); }, options.timeout || 120_000);
    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
      if (error) reject(error); else resolve(stdout);
    };
    if (options.signal?.aborted) { abort(); return; }
    options.signal?.addEventListener('abort', abort, { once: true });
    child.stdout.on('data', (data: Buffer) => {
      const text = data.toString();
      stdout = (stdout + text).slice(-250_000);
      options.onOutput?.(text);
    });
    child.stderr.on('data', (data: Buffer) => { stderr = (stderr + data.toString()).slice(-8000); });
    child.on('error', (error) => finish(new ApiError(`The video processor could not start. Check the FFmpeg installation. (${(error as NodeJS.ErrnoException).code || 'unavailable'})`, 503)));
    child.on('close', code => {
      if (code === 0) finish();
      else {
        console.error('[Kaptio FFmpeg]', stderr.slice(-2500));
        finish(new ApiError('This video could not be processed. Try an MP4 with H.264 video and AAC audio.', 422));
      }
    });
  });
}

export function ffmpegPath(): string {
  const binary = process.env.FFMPEG_PATH || ffmpegStatic;
  if (!binary) throw new ApiError('FFmpeg is not available on this server.', 503);
  return binary;
}

export type VideoMetadata = { width: number; height: number; duration: number; hasAudio: boolean };

export async function probeVideo(filePath: string, signal?: AbortSignal): Promise<VideoMetadata> {
  const raw = await runProcess(process.env.FFPROBE_PATH || ffprobeStatic.path, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', filePath], { signal, timeout: 30_000 });
  const data = JSON.parse(raw) as { streams: { codec_type: string; width?: number; height?: number; duration?: string; tags?: { rotate?: string }; side_data_list?: { rotation?: number }[] }[]; format: { duration?: string } };
  const stream = data.streams.find(s => s.codec_type === 'video');
  if (!stream?.width || !stream.height) throw new ApiError('This file does not contain a readable video track.', 422);
  const duration = Number(data.format.duration || stream.duration);
  if (!Number.isFinite(duration) || duration <= 0 || duration > MAX_DURATION) throw new ApiError('Choose a video between one second and 30 minutes long.', 422);
  let { width, height } = stream;
  if (width > 7680 || height > 7680) throw new ApiError('The maximum supported source resolution is 8K.', 422);
  const rotation = Number(stream.tags?.rotate || stream.side_data_list?.find(s => s.rotation !== undefined)?.rotation || 0);
  if (Math.abs(rotation) % 180 === 90) [width, height] = [height, width];
  return { width, height, duration, hasAudio: data.streams.some(s => s.codec_type === 'audio') };
}

export async function extractAudio(videoPath: string, audioPath: string, signal?: AbortSignal): Promise<void> {
  await runProcess(ffmpegPath(), ['-hide_banner', '-loglevel', 'error', '-nostdin', '-i', videoPath, '-vn', '-ac', '1', '-ar', '16000', '-c:a', 'pcm_s16le', '-f', 'wav', '-y', audioPath], { signal, timeout: 180_000 });
}

export function fileResponseStream(file: string): ReadableStream<Uint8Array> {
  return Readable.toWeb(createReadStream(file)) as ReadableStream<Uint8Array>;
}
