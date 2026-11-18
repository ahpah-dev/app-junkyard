import test from 'node:test';
import assert from 'node:assert/strict';
import { initial, posterSVG } from './layout.js';
test('poster escapes all authored text and fits wide headings', () => {
  const svg = posterSVG({ ...initial, title: '<Title> & "art"' }, (t) => t.length * 0.6);
  assert.match(svg, /&lt;Title&gt; &amp; &quot;art&quot;/);
  assert.doesNotMatch(svg, /NaN|Infinity|<Title>/);
});
