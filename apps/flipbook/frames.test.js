import test from 'node:test';
import assert from 'node:assert/strict';
import { animatedSVG, atlas, initialProject, transformFrame, valid } from './frames.js';
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
test('transforms frames and exports looping animated SVG', () => {
  const f = Array(256).fill(null);
  f[0] = '#ff0000';
  assert.equal(transformFrame(f, 'flipH')[15], '#ff0000');
  assert.equal(transformFrame(f, 'flipV')[15 * 16], '#ff0000');
  assert.equal(transformFrame(f, 'rotateCW')[15], '#ff0000');
  assert.equal(transformFrame(f, 'shiftR')[1], '#ff0000');
  const svg = animatedSVG(initialProject(), 4);
  assert.match(svg, /@keyframes k0/);
  assert.match(svg, /width="64"/);
});
