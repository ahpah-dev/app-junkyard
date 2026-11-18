import test from 'node:test';
import assert from 'node:assert/strict';
import { classify, evaluate, train } from './model.js';
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
