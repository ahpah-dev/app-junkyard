import test from 'node:test';
import assert from 'node:assert/strict';
import { expandQuery, rank } from './model.js';

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

test('computes IDF term weights, coverage, and pseudo-relevance feedback expansions', () => {
  const richDocs = [
    { id: '1', title: 'Trees', text: 'cedar pine forest canopy' },
    { id: '2', title: 'Trees', text: 'pine' },
    { id: '3', title: 'Shrubs', text: 'juniper desert bush' },
  ];
  const result = rank(richDocs, 'cedar pine');
  assert.equal(result.termWeights.length, 2);
  assert.equal(result.hits[0].coverage, 1);
  assert.equal(result.hits[1].coverage, 0.5);
  const expansions = expandQuery(richDocs, result.hits, 'cedar pine', 3);
  assert.ok(expansions.some((e) => e.term === 'forest' || e.term === 'canopy'));
  assert.ok(!expansions.some((e) => e.term === 'cedar' || e.term === 'pine'));
});
