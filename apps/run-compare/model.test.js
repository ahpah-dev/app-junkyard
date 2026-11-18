import test from 'node:test';
import assert from 'node:assert/strict';
import { compare, score, significance } from './model.js';

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

test('supports jaccard, bleu scoring rules and paired statistical significance', () => {
  assert.equal(score('jaccard', 'apple banana pear', 'apple pear'), 2 / 3);
  const bleuPerfect = score('bleu', 'the quick brown fox', 'the quick brown fox');
  assert.equal(bleuPerfect, 1);
  assert.ok(score('bleu', 'the quick brown fox', 'quick fox') < bleuPerfect);

  const r = compare(
    [
      { id: '1', rule: 'exact', expected: 'a', baseline: 'b', candidate: 'a' },
      { id: '2', rule: 'exact', expected: 'a', baseline: 'b', candidate: 'a' },
      { id: '3', rule: 'exact', expected: 'a', baseline: 'b', candidate: 'a' },
      { id: '4', rule: 'exact', expected: 'a', baseline: 'b', candidate: 'a' },
      { id: '5', rule: 'exact', expected: 'a', baseline: 'b', candidate: 'a' },
      { id: '6', rule: 'exact', expected: 'a', baseline: 'b', candidate: 'a' },
    ],
    0.8,
  );
  assert.equal(r.stats.wins, 6);
  assert.equal(r.stats.losses, 0);
  assert.ok(r.stats.pValue < 0.05);
  assert.equal(significance([]).pValue, 1);
});
