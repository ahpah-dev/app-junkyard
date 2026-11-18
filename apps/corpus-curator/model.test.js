import test from 'node:test';
import assert from 'node:assert/strict';
import { curate } from './model.js';
const rows = [
  { text: 'One', label: 'a' },
  { text: 'ONE ', label: 'a' },
  { text: 'Two', label: 'a' },
  { text: 'Three', label: 'b' },
  { text: 'Bad', label: 'a' },
  { text: 'bad', label: 'b' },
];
test('excludes conflict groups and keeps one representative per duplicate group', () => {
  const r = curate(rows, 20, 'x');
  assert.equal(r.test.length, 1);
  assert.equal(r.train.length, 2);
  assert.equal(r.excluded.length, 2);
  assert.ok(![...r.train, ...r.test].some((x) => x.text.toLowerCase() === 'bad'));
});
test('splits stay stable after row order changes and singletons stay in training', () => {
  const a = curate(rows, 20, 'seed'),
    b = curate([...rows].reverse(), 20, 'seed');
  assert.deepEqual(a.test, b.test);
  assert.deepEqual(a.train, b.train);
  assert.ok(a.train.some((r) => r.label === 'b'));
});

test('rounds a global target before apportioning it across small classes', () => {
  const pairs = ['a', 'b', 'c'].flatMap((label) => [0, 1].map((i) => ({ label, text: label + i })));
  assert.equal(curate(pairs, 1, 's').test.length, 0);
  const report = curate(pairs, 25, 's');
  assert.equal(report.requestedHoldout, 2);
  assert.equal(report.test.length, 2);
  assert.equal(report.effectivePercentage, (100 * 2) / 6);
  assert.deepEqual(
    report.breakdown.map((g) => g.test),
    [1, 1, 0],
  );
});
test('redistributes around singletons, caps capacity, and handles no retained rows', () => {
  const rows = ['a1', 'a2', 'a3', 'a4', 'b', 'c', 'd', 'e', 'f', 'g'].map((text) => ({
    label: text[0],
    text,
  }));
  const report = curate(rows, 50, 's');
  assert.equal(report.requestedHoldout, 5);
  assert.equal(report.test.length, 3);
  assert.ok(report.breakdown.every((g) => g.train >= 1));
  const empty = curate(
    [
      { text: 'conflict', label: 'a' },
      { text: 'conflict', label: 'b' },
    ],
    50,
    's',
  );
  assert.equal(empty.effectivePercentage, 0);
  assert.equal(empty.retained, 0);
});
