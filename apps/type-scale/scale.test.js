import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScale, initial, sizeAtViewport, valid } from './scale.js';

test('computes monotonic modular steps and fluid clamp formulas', () => {
  assert.equal(valid(initial), true);
  const ramp = buildScale(initial);
  assert.equal(ramp.length, 8);
  for (let i = 1; i < ramp.length; i++) {
    assert.ok(ramp[i].minPx > ramp[i - 1].minPx);
    assert.ok(ramp[i].maxPx > ramp[i - 1].maxPx);
  }
  const base = ramp.find((r) => r.name === 'base');
  assert.equal(base.minPx, initial.minBasePx);
  assert.equal(base.maxPx, initial.maxBasePx);
  assert.match(base.clampCss, /^clamp\(/);
});

test('clamps interpolated sizes at viewport bounds', () => {
  assert.equal(sizeAtViewport(16, 20, 400, 1200, 300), 16);
  assert.equal(sizeAtViewport(16, 20, 400, 1200, 1400), 20);
  assert.equal(sizeAtViewport(16, 20, 400, 1200, 800), 18);
  assert.equal(valid({ ...initial, minRatio: 1.5, maxRatio: 1.2 }), false);
});
