import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, evaluate, topFeatures, train } from './model.js';
const m = train([
  { label: 'one', text: 'paint paint brush' },
  { label: 'two', text: 'write pen' },
  { label: 'two', text: 'paper pen' },
]);
test('learns words and normalizes even long documents', () => {
  const res = classify(m, 'paint '.repeat(10000));
  assert.equal(res.label, 'one');
  assert.ok(Math.abs(res.scores.reduce((n, s) => n + s.probability, 0) - 1) < 1e-9);
});
test('unknown terms preserve priors and holdout compares actual labels', () => {
  assert.equal(classify(m, 'xyz').label, 'two');
  assert.equal(evaluate(m, [{ label: 'one', text: 'paint paint' }]).correct, 1);
  assert.throws(() => evaluate(m, [{ label: 'new', text: 'paper' }]), /absent/);
});

test('supports bigram features, confusion matrices, macro-F1, and top discriminative features', () => {
  const bm = train(
    [
      { label: 'refund', text: 'not working request refund' },
      { label: 'refund', text: 'duplicate charge refund please' },
      { label: 'praise', text: 'working great love it' },
      { label: 'praise', text: 'fast delivery great product' },
    ],
    1,
    2,
  );
  assert.equal(bm.ngrams, 2);
  assert.ok(bm.vocabulary.has('not_working'));
  const c = classify(bm, 'not working refund');
  assert.equal(c.label, 'refund');
  assert.ok(c.contributions.some((x) => x.term === 'not_working'));
  const ev = evaluate(bm, [
    { label: 'refund', text: 'duplicate charge' },
    { label: 'praise', text: 'working great' },
  ]);
  assert.equal(ev.accuracy, 1);
  assert.equal(ev.macroF1, 1);
  assert.deepEqual(ev.confusion.labels, ['praise', 'refund']);
  assert.deepEqual(ev.confusion.matrix, [
    [1, 0],
    [0, 1],
  ]);
  const top = topFeatures(bm, 3);
  assert.equal(top.length, 2);
  assert.ok(top[0].features.length > 0);
});
