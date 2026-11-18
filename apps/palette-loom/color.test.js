import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, ramp } from './color.js';
test('standard black/white contrast and identical colors', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ff2222', '#ff2222'), 1);
});
test('perceptual ramp preserves both endpoints', () => {
  const colors = ramp('#234441', '#fa3102', 7);
  assert.equal(colors.length, 7);
  assert.equal(colors[0], '#234441');
  assert.equal(colors.at(-1), '#fa3102');
  assert.throws(() => ramp('bad', '#000000', 5));
});
