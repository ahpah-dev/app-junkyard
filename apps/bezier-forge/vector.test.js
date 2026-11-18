import test from 'node:test';
import assert from 'node:assert/strict';
import { iconSVG, initial, measurePath, pathData, presets, valid } from './vector.js';

test('validates presets, mirrors vertices, and renders clean SVG', () => {
  for (const preset of presets) {
    assert.equal(valid(preset.values), true);
    const svg = iconSVG(preset.values, false);
    assert.match(svg, /<svg/);
    assert.match(svg, /<path/);
  }
  const m = measurePath(initial);
  assert.equal(m.vertices, 4); // 3 points mirrored across x=12 gives 4 vertices
  assert.ok(m.perimeter > 0);
  assert.match(pathData(initial), /^M/);
});

test('escapes icon name and rejects invalid stroke widths', () => {
  const svg = iconSVG({ ...initial, name: '<bad>' }, false);
  assert.match(svg, /&lt;bad&gt;/);
  assert.equal(valid({ ...initial, strokeWidth: 99 }), false);
});
