import { LANGUAGES } from '../constants';
import type { Caption, CaptionStyle } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); this.name = 'ApiError'; }
}

export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024;
export const MAX_DURATION = 30 * 60;
export const FONT_FAMILIES = ['Manrope', 'Instrument Sans', 'DM Sans', 'Space Grotesk', 'Bebas Neue', 'Noto Sans', 'Noto Sans Devanagari', 'Noto Sans Tamil', 'Noto Sans Telugu', 'Noto Sans Bengali', 'Noto Sans Gujarati', 'Noto Sans Gurmukhi', 'Noto Nastaliq Urdu', 'Noto Sans Arabic', 'Noto Sans JP', 'Noto Sans KR', 'Noto Sans SC'];

function object(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ApiError('Invalid caption data.');
  return value as Record<string, unknown>;
}

function number(value: unknown, min: number, max: number, label: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new ApiError(`${label} must be between ${min} and ${max}.`);
  return value;
}

function color(value: unknown): string {
  if (typeof value !== 'string' || !/^#[0-9a-f]{6}$/i.test(value)) throw new ApiError('Colors must be six-digit hex values.');
  return value;
}

export function parseJson(value: FormDataEntryValue | null, label: string): unknown {
  if (typeof value !== 'string' || value.length > 2_000_000) throw new ApiError(`Invalid ${label}.`);
  try { return JSON.parse(value); } catch { throw new ApiError(`Could not read ${label}.`); }
}

export function validateCaptions(value: unknown): Caption[] {
  if (!Array.isArray(value) || value.length > 3000) throw new ApiError('A project can contain up to 3,000 captions.');
  const ids = new Set<string>();
  return value.map((input, index) => {
    const c = object(input);
    if (typeof c.id !== 'string' || c.id.length > 100 || ids.has(c.id)) throw new ApiError('Caption IDs must be unique.');
    ids.add(c.id);
    const start = number(c.start, 0, MAX_DURATION, 'Caption start');
    const end = number(c.end, 0, MAX_DURATION, 'Caption end');
    if (end <= start) throw new ApiError(`Caption ${index + 1} must end after it starts.`);
    if (typeof c.text !== 'string' || c.text.length > 500) throw new ApiError(`Caption ${index + 1} must contain at most 500 characters.`);
    const caption: Caption = { id: c.id, start, end, text: c.text.replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, '') };
    if (Array.isArray(c.words) && c.words.length <= 150) {
      caption.words = c.words.map(inputWord => {
        const word = object(inputWord);
        if (typeof word.word !== 'string' || word.word.length > 100) throw new ApiError('Invalid word timestamps.');
        const wordStart = number(word.start, start, end, 'Word start');
        const wordEnd = number(word.end, wordStart, end, 'Word end');
        return { word: word.word, start: wordStart, end: wordEnd };
      });
    }
    return caption;
  }).sort((a, b) => a.start - b.start);
}

export function validateStyle(value: unknown): CaptionStyle {
  const s = object(value);
  if (typeof s.fontFamily !== 'string' || !FONT_FAMILIES.includes(s.fontFamily)) throw new ApiError('Choose one of the supported caption fonts.');
  const animations = ['none', 'pop', 'fade', 'typewriter', 'highlight'];
  if (typeof s.animation !== 'string' || !animations.includes(s.animation)) throw new ApiError('Unknown caption animation.');
  return {
    fontFamily: s.fontFamily, fontSize: number(s.fontSize, 1, 20, 'Font size'),
    color: color(s.color), highlightColor: color(s.highlightColor), strokeColor: color(s.strokeColor),
    strokeWidth: number(s.strokeWidth, 0, 12, 'Stroke'), shadow: s.shadow === true,
    backgroundColor: color(s.backgroundColor), backgroundOpacity: number(s.backgroundOpacity, 0, 100, 'Background opacity'),
    opacity: number(s.opacity, 0, 100, 'Opacity'), animation: s.animation as CaptionStyle['animation'],
    x: number(s.x, 0, 100, 'Horizontal position'), y: number(s.y, 0, 100, 'Vertical position'),
  };
}

export function validateLanguage(input: FormDataEntryValue | null): string {
  const value = typeof input === 'string' ? input : 'en';
  if (!LANGUAGES.some(language => language.code === value)) throw new ApiError('Select a supported caption language.');
  return value;
}

export function validateVideo(value: FormDataEntryValue | null): File {
  if (!(value instanceof File) || value.size === 0) throw new ApiError('Choose a video to continue.');
  if (value.size > MAX_UPLOAD_BYTES) throw new ApiError('This video is too large. Choose a file under 150 MB.', 413);
  if (!/\.(mp4|mov|webm|mkv|m4v|avi)$/i.test(value.name) && !/^video\//.test(value.type)) throw new ApiError('Upload an MP4, MOV, WebM, MKV, M4V, or AVI video.');
  return value;
}

export function outputDimensions(width: number, height: number, resolution: string): { width: number; height: number } {
  if (!['source', '1080', '720', '480'].includes(resolution)) throw new ApiError('Choose a supported export resolution.');
  const target = resolution === 'source' ? Math.max(width, height) : Number(resolution);
  const scale = Math.min(1, target / Math.min(width, height));
  return { width: Math.max(2, Math.round(width * scale / 2) * 2), height: Math.max(2, Math.round(height * scale / 2) * 2) };
}
