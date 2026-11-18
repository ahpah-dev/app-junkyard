import test from 'node:test';
import assert from 'node:assert/strict';
import { score, compare } from './model.js';
test('multiset F1 counts duplicates without overmatching', () => {
  assert.equal(score('f1', 'a a b', 'a b b'), 2 / 3);
  assert.equal(score('exact', 'a b', '  A  b'), 1);
});
test('detects regressions and preserves empty candidate answers', () => {
  const row = { id: 'a', expected: 'ok', baseline: 'ok', candidate: '' };
  const r = compare([row], 0.8);
  assert.equal(r.cases[0].change, 'Regression');
  assert.equal(r.groups[0].after, 0);
  assert.throws(() => compare([row, row], 0.8), /Duplicate/);
});
