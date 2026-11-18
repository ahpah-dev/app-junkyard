import test from 'node:test';
import assert from 'node:assert/strict';
import { atlas, initialProject, valid } from './frames.js';
test('atlas packs a partially filled final row', () => {
  const p = initialProject();
  p.frames.push(p.frames[0]);
  const a = atlas(p);
  assert.equal(a.width, 48);
  assert.equal(a.height, 32);
  assert.deepEqual(a.frames[4], { x: 16, y: 16, width: 16, height: 16 });
  assert.equal(valid(p), true);
});
test('invalid pixels and frame rates rejected on import', () => {
  const p = initialProject();
  p.frames[0][0] = '#bad';
  assert.equal(valid(p), false);
  p.fps = 0;
  assert.equal(valid(p), false);
});
