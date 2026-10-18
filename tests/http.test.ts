import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeMutation } from '../lib/engine/http';

test('accepts a localhost alias from the actual Host header', () => {
  const request = new Request('http://127.0.0.1:3179/api/transcribe', {
    method: 'POST',
    headers: { origin: 'http://localhost:3179', host: 'localhost:3179' },
  });
  assert.doesNotThrow(() => authorizeMutation(request));
});

test('accepts the public origin reconstructed from reverse-proxy headers', () => {
  const request = new Request('http://next-internal:3000/api/transcribe', {
    method: 'POST',
    headers: {
      origin: 'https://captions.example',
      host: 'next-internal:3000',
      'x-forwarded-host': 'captions.example',
      'x-forwarded-proto': 'https',
    },
  });
  assert.doesNotThrow(() => authorizeMutation(request));
});

test('rejects a genuinely cross-origin mutation', () => {
  const request = new Request('https://captions.example/api/transcribe', {
    method: 'POST',
    headers: { origin: 'https://attacker.example', host: 'captions.example' },
  });
  assert.throws(() => authorizeMutation(request), /This request is not permitted/);
});
