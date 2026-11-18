import test from 'node:test';
import assert from 'node:assert/strict';
import { flood, line } from './bitmap.js';
test('fill follows orthogonal connections and stops at row boundaries', () => {
  const pixels = [1, 2, 1, 1, 2, 1];
  flood(pixels, 3, 2, 0);
  assert.deepEqual(pixels, [1, 2, 0, 1, 2, 0]);
});
test('pencil interpolates fast pointer drags in reverse', () => {
  const p = [];
  line(4, 3, 1, 0, (x, y) => p.push([x, y]));
  assert.deepEqual(p, [
    [4, 3],
    [3, 2],
    [2, 1],
    [1, 0],
  ]);
});
