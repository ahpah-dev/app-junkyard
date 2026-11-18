import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, patternMetrics, patternSVG } from './pattern.js';
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

test('supports new motifs, mirror/rotational symmetries, and pattern metrics', () => {
  for (const motif of ['truchet', 'hex', 'bauhaus']) {
    for (const symmetry of ['random', 'mirror', 'rotational']) {
      const spec = { ...initial, motif, symmetry };
      const svg = patternSVG(spec);
      assert.match(svg, /<svg/);
      const m = patternMetrics(spec);
      assert.equal(m.cellCount, 16);
      assert.equal(m.primaryCount + m.accentCount, 16);
    }
  }
});
