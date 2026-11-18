import test from 'node:test';
import assert from 'node:assert/strict';
import { ellipse, flip, flood, line, paletteCounts, rect, rotateCW, shift } from './bitmap.js';
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
test('supports rect, ellipse, shift, flip, rotateCW, and paletteCounts', () => {
  const filled = [];
  rect(1, 1, 2, 2, true, (x, y) => filled.push([x, y]));
  assert.equal(filled.length, 4);

  const circle = [];
  ellipse(0, 0, 4, 4, false, (x, y) => circle.push([x, y]));
  assert.ok(circle.length > 0);

  const grid = ['#111111', null, null, '#222222'];
  assert.deepEqual(flip(grid, 2, false), [null, '#111111', '#222222', null]);
  assert.deepEqual(flip(grid, 2, true), [null, '#222222', '#111111', null]);
  assert.deepEqual(rotateCW(grid, 2), [null, '#111111', '#222222', null]);
  assert.deepEqual(shift(grid, 2, 1, 0), [null, '#111111', null, null]);
  assert.deepEqual(paletteCounts(['#aa0000', '#bb0000', '#aa0000', null]), [
    { color: '#aa0000', count: 2 },
    { color: '#bb0000', count: 1 },
  ]);
});
