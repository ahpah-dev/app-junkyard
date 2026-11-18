import test from 'node:test';
import assert from 'node:assert/strict';
import { rank } from './model.js';

const docs = [
  { id: '1', title: 'Trees', text: 'cedar pine' },
  { id: '2', title: 'Trees', text: 'pine' },
];
test('rare matching terms contribute more and scores add up', () => {
  const result = rank(docs, 'CEDAR pine pine');
  assert.equal(result.hits[0].id, '1');
  const [cedar, pine] = result.hits[0].contributions;
  assert.ok(cedar.score > pine.score);
  assert.equal(result.hits[0].score, cedar.score + pine.score);
  assert.equal(rank(docs, 'unmatched').hits.length, 0);
});
test('rejects duplicate identifiers and query without terms', () => {
  assert.throws(() => rank([docs[0], docs[0]], 'pine'), /Duplicate/);
  assert.throws(() => rank(docs, '!?'), /search terms/);
});
