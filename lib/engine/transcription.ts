import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { env, pipeline } from '@huggingface/transformers';
import type { Caption, CaptionWord } from '../types';
import { LANGUAGES } from '../constants';
import { ApiError } from './validation';

type WhisperChunk = { text: string; timestamp: [number, number] };
type WhisperOutput = { text?: string; chunks?: WhisperChunk[] };
type LocalWhisper = (audio: Float32Array, options: {
  language: string;
  task: 'transcribe';
  return_timestamps: 'word';
  chunk_length_s: number;
  stride_length_s: number;
}) => Promise<WhisperOutput>;

const DEFAULT_MODEL = 'onnx-community/whisper-base_timestamped';
const MODEL_CACHE = path.resolve(/*turbopackIgnore: true*/ process.env.KAPTIO_MODEL_CACHE || path.join(process.cwd(), '.cache', 'huggingface'));
env.cacheDir = MODEL_CACHE;
env.allowRemoteModels = true;
let modelPromise: Promise<LocalWhisper> | undefined;

function getTranscriber(): Promise<LocalWhisper> {
  if (!modelPromise) {
    const model = process.env.KAPTIO_WHISPER_MODEL || DEFAULT_MODEL;
    modelPromise = pipeline('automatic-speech-recognition', model, { device: 'cpu', dtype: 'q8' }) as unknown as Promise<LocalWhisper>;
    modelPromise = modelPromise.catch(error => {
      modelPromise = undefined;
      throw error;
    });
  }
  return modelPromise;
}

/** Decode the exact mono, 16 kHz, signed 16-bit PCM WAV emitted by FFmpeg. */
export function decodePcm16Wav(buffer: Buffer): Float32Array {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') {
    throw new ApiError('Audio conversion returned an invalid WAV file.', 500);
  }

  let format: number | undefined;
  let channels: number | undefined;
  let sampleRate: number | undefined;
  let bitsPerSample: number | undefined;
  let dataOffset = -1;
  let dataLength = 0;

  for (let offset = 12; offset + 8 <= buffer.length;) {
    const chunkName = buffer.toString('ascii', offset, offset + 4);
    const chunkLength = buffer.readUInt32LE(offset + 4);
    const body = offset + 8;
    if (body + chunkLength > buffer.length) break;
    if (chunkName === 'fmt ' && chunkLength >= 16) {
      format = buffer.readUInt16LE(body);
      channels = buffer.readUInt16LE(body + 2);
      sampleRate = buffer.readUInt32LE(body + 4);
      bitsPerSample = buffer.readUInt16LE(body + 14);
    } else if (chunkName === 'data') {
      dataOffset = body;
      dataLength = chunkLength;
    }
    offset = body + chunkLength + (chunkLength % 2);
  }

  if (format !== 1 || channels !== 1 || sampleRate !== 16000 || bitsPerSample !== 16 || dataOffset < 0 || dataLength < 2) {
    throw new ApiError('Audio conversion returned an unsupported format. Please retry transcription.', 500);
  }
  const sampleCount = Math.floor(dataLength / 2);
  const samples = new Float32Array(sampleCount);
  for (let i = 0; i < sampleCount; i++) samples[i] = buffer.readInt16LE(dataOffset + i * 2) / 32768;
  return samples;
}

/** Group Whisper word timestamps into compact, readable caption lines. */
export function normalizeTranscript(data: { text?: string; words?: CaptionWord[] }, duration: number, language = 'en'): Caption[] {
  const words = (data.words || [])
    .filter(word => Number.isFinite(word.start) && Number.isFinite(word.end) && word.end > word.start && word.start < duration && word.word.trim())
    .map(word => ({ word: word.word.trim(), start: Math.max(0, word.start), end: Math.min(duration, word.end) }));
  if (!words.length) return [];
  const separator = language === 'ja' || language === 'zh' ? '' : ' ';

  const groups: CaptionWord[][] = [];
  let group: CaptionWord[] = [];
  for (const word of words) {
    const characters = group.reduce((sum, item) => sum + item.word.length + 1, 0);
    if (group.length && (group.length >= 7 || characters + word.word.length > 48 || word.end - group[0].start > 4.5 || word.start - group[group.length - 1].end > 0.8)) {
      groups.push(group);
      group = [];
    }
    group.push(word);
    if (group.length >= 3 && /[.!?।。！？]$/.test(word.word)) {
      groups.push(group);
      group = [];
    }
  }
  if (group.length) groups.push(group);
  return groups.map((items, index) => ({
    id: `caption-${index + 1}`,
    start: items[0].start,
    end: items[items.length - 1].end,
    text: items.map(item => item.word).join(separator),
    words: items,
  }));
}

function whisperLanguage(code: string): string {
  if (code === 'hinglish') return 'hindi';
  return LANGUAGES.find(language => language.code === code)?.name.toLowerCase() || 'english';
}

export async function transcribeAudio(audioPath: string, language: string, duration: number, signal?: AbortSignal): Promise<Caption[]> {
  if (signal?.aborted) throw new ApiError('Transcription was cancelled.', 499);
  let output: WhisperOutput;
  try {
    const bytes = await readFile(audioPath);
    const samples = decodePcm16Wav(bytes);
    const transcriber = await getTranscriber();
    if (signal?.aborted) throw new ApiError('Transcription was cancelled.', 499);
    output = await transcriber(samples, {
      language: whisperLanguage(language),
      task: 'transcribe',
      return_timestamps: 'word',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (signal?.aborted) throw new ApiError('Transcription was cancelled.', 499);
    if (error instanceof Error && error.message.toLowerCase().includes('cross attentions')) {
      throw new ApiError('This Whisper model does not include the cross-attention outputs needed for word-level timestamps. Set KAPTIO_WHISPER_MODEL to a timestamp-enabled Whisper export, such as onnx-community/whisper-base_timestamped.', 503);
    }
    console.error('[Kaptio local Whisper]', error instanceof Error ? error.message : 'Local model failed');
    throw new ApiError(
      'The local Whisper model could not start or finish. On first use, this server downloads the open model (about 80 MB) and caches it in the configured model folder. Check this server’s internet access, available disk space, and memory, then retry.',
      503,
    );
  }

  const words: CaptionWord[] = (output.chunks || []).flatMap(chunk => {
    const [start, end] = chunk.timestamp;
    const word = chunk.text.trim();
    if (!word || !Number.isFinite(start) || !Number.isFinite(end) || end <= start || start >= duration) return [];
    return [{ word, start: Math.max(0, start), end: Math.min(duration, end) }];
  });
  const captions = normalizeTranscript({ text: output.text, words }, duration, language);
  if (!captions.length) throw new ApiError('No speech was detected. Try a clip with clear speech, or add captions manually.', 422);
  return captions;
}
