import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, patternSVG } from './pattern.js';
test('seeded layout is deterministic across preview and export', () => {
  const tile = patternSVG(initial),
    preview = patternSVG(initial, 3);
  assert.equal(tile.match(/<defs>.*<\/defs>/)[0], preview.match(/<defs>.*<\/defs>/)[0]);
  assert.notEqual(tile, patternSVG({ ...initial, seed: 5 }));
});
test('SVG rejects unknown colors and fractional cells', () => {
  assert.throws(() => patternSVG({ ...initial, ink: 'url(http://example.com)' }));
  assert.throws(() => patternSVG({ ...initial, cells: 2.5 }));
});
