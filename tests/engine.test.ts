import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_STYLE } from '../lib/constants';
import { toSrt } from '../lib/engine/captions';
import { decodePcm16Wav, normalizeTranscript } from '../lib/engine/transcription';
import { validateStyle } from '../lib/engine/validation';

function pcmWav(samples: number[]): Buffer {
  const dataSize = samples.length * 2;
  const file = Buffer.alloc(44 + dataSize);
  file.write('RIFF', 0, 'ascii');
  file.writeUInt32LE(36 + dataSize, 4);
  file.write('WAVE', 8, 'ascii');
  file.write('fmt ', 12, 'ascii');
  file.writeUInt32LE(16, 16);
  file.writeUInt16LE(1, 20);
  file.writeUInt16LE(1, 22);
  file.writeUInt32LE(16000, 24);
  file.writeUInt32LE(32000, 28);
  file.writeUInt16LE(2, 32);
  file.writeUInt16LE(16, 34);
  file.write('data', 36, 'ascii');
  file.writeUInt32LE(dataSize, 40);
  samples.forEach((sample, index) => file.writeInt16LE(sample, 44 + index * 2));
  return file;
}

test('decodes mono 16 kHz PCM WAV samples to normalized float audio', () => {
  const decoded = decodePcm16Wav(pcmWav([0, 16384, -16384, 32767]));
  assert.equal(decoded.length, 4);
  assert.equal(decoded[0], 0);
  assert.equal(decoded[1], 0.5);
  assert.equal(decoded[2], -0.5);
  assert.ok(decoded[3] < 1 && decoded[3] > 0.99);
});

test('rejects unsupported WAV audio formats', () => {
  const wav = pcmWav([100]);
  wav.writeUInt16LE(2, 22);
  assert.throws(() => decodePcm16Wav(wav), /unsupported format/i);
});

test('groups word timestamps into concise editable captions', () => {
  const captions = normalizeTranscript({ text: 'A small story begins.', words: [
    { word: 'A', start: 0, end: 0.2 },
    { word: 'small', start: 0.21, end: 0.52 },
    { word: 'story', start: 0.53, end: 0.91 },
    { word: 'begins.', start: 0.92, end: 1.35 },
  ] }, 4);
  assert.equal(captions.length, 1);
  assert.equal(captions[0].text, 'A small story begins.');
  assert.equal(captions[0].start, 0);
  assert.equal(captions[0].end, 1.35);
  assert.equal(captions[0].words?.length, 4);
});

test('preserves natural spacing for Japanese and Chinese captions', () => {
  const words = [{ word: 'こんにちは', start: 0, end: 0.5 }, { word: '世界。', start: 0.5, end: 1 }];
  assert.equal(normalizeTranscript({ words }, 2, 'ja')[0].text, 'こんにちは世界。');
  assert.equal(normalizeTranscript({ words: [{ word: '你好', start: 0, end: 0.4 }, { word: '世界。', start: 0.4, end: 0.9 }] }, 2, 'zh')[0].text, '你好世界。');
});

test('validates editor opacity as percentages and accepts the default style', () => {
  const style = validateStyle(DEFAULT_STYLE);
  assert.equal(style.opacity, 100);
  assert.equal(style.backgroundOpacity, 0);
  assert.throws(() => validateStyle({ ...DEFAULT_STYLE, opacity: 101 }), /Opacity must be between 0 and 100/);
});

test('exports normalized caption times as SRT', () => {
  assert.equal(toSrt([{ id: 'one', start: 1.2, end: 2.8, text: 'Hello world.' }]), '1\n00:00:01,200 --> 00:00:02,800\nHello world.\n');
});
