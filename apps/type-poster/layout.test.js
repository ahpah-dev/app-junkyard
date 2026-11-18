import test from 'node:test';
import assert from 'node:assert/strict';
import { contrastCheck, initial, layouts, posterSVG, presets } from './layout.js';
test('poster escapes all authored text and fits wide headings', () => {
  const svg = posterSVG({ ...initial, title: '<Title> & "art"' }, (t) => t.length * 0.6);
  assert.match(svg, /&lt;Title&gt; &amp; &quot;art&quot;/);
  assert.doesNotMatch(svg, /NaN|Infinity|<Title>/);
});
test('renders all compositions, presets, and computes WCAG contrast grades', () => {
  for (const layout of layouts) {
    const svg = posterSVG({ ...initial, layout }, (t) => t.length * 0.55);
    assert.match(svg, /<svg/);
    assert.doesNotMatch(svg, /NaN|Infinity/);
  }
  assert.ok(presets.length >= 3);
  const check = contrastCheck(initial);
  assert.ok(check.textRatio > 4.5);
  assert.ok(['AAA', 'AA'].includes(check.textGrade));
});
