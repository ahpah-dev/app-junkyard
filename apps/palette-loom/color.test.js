import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, harmonyPairings, ramp, simulateCVD, wcagGrade } from './color.js';
test('standard black/white contrast and identical colors', () => {
  assert.equal(contrast('#000000', '#ffffff'), 21);
  assert.equal(contrast('#ff2222', '#ff2222'), 1);
});
test('perceptual ramp preserves both endpoints', () => {
  const colors = ramp('#234441', '#fa3102', 7);
  assert.equal(colors.length, 7);
  assert.equal(colors[0], '#234441');
  assert.equal(colors.at(-1), '#fa3102');
  assert.throws(() => ramp('bad', '#000000', 5));
});

test('evaluates WCAG grades, simulates CVD, and identifies accessible ramp pairings', () => {
  assert.equal(wcagGrade(7.5), 'AAA');
  assert.equal(wcagGrade(4.6), 'AA');
  assert.equal(wcagGrade(3.2), 'AA Large');
  assert.equal(wcagGrade(2.1), 'Fail');
  assert.equal(simulateCVD('#123456', 'none'), '#123456');
  assert.match(simulateCVD('#ff3300', 'deuteranopia'), /^#[0-9a-f]{6}$/);
  const pairs = harmonyPairings(ramp('#ffffff', '#111111', 7));
  assert.ok(pairs.length > 0);
  assert.ok(pairs.every((p) => p.ratio >= 4.5));
});
