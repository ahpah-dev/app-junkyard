import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWAV, initial, midiToHz, presets, renderPCM, valid } from './synth.js';

test('validates presets, converts MIDI pitch, and renders bounded PCM samples', () => {
  for (const pr of presets) assert.equal(valid(pr.values), true);
  assert.equal(Math.round(midiToHz(69)), 440);
  const pcm = renderPCM(initial, 22050);
  assert.ok(pcm.length > 0);
  assert.ok(pcm.every((v) => v >= -1 && v <= 1));
});

test('encodes canonical RIFF WAVE headers with accurate data byte size', () => {
  const pcm = renderPCM(initial, 8000);
  const wav = encodeWAV(pcm, 8000);
  assert.equal(String.fromCharCode(...wav.slice(0, 4)), 'RIFF');
  assert.equal(String.fromCharCode(...wav.slice(8, 12)), 'WAVE');
  assert.equal(wav.length, 44 + pcm.length * 2);
});
