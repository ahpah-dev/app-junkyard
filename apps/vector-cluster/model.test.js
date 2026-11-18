import test from 'node:test';
import assert from 'node:assert/strict';
import { clusterDocuments, similarDocuments } from './model.js';

const docs = [
  { id: '1', text: 'apple banana fruit orchard' },
  { id: '2', text: 'apple pear fruit harvest' },
  { id: '3', text: 'quantum photon laser optics' },
  { id: '4', text: 'laser physics photon mirror' },
];

test('clusters separable topics via TF-IDF k-means++ with positive silhouette', () => {
  const r = clusterDocuments(docs, 2, 'seed-1');
  assert.equal(r.clusters.length, 2);
  assert.equal(r.documents[0].cluster, r.documents[1].cluster);
  assert.equal(r.documents[2].cluster, r.documents[3].cluster);
  assert.notEqual(r.documents[0].cluster, r.documents[2].cluster);
  assert.ok(r.meanSilhouette > 0.3);
});

test('ranks nearest neighbors using cosine similarity', () => {
  const neighbors = similarDocuments(docs, '1', 2);
  assert.equal(neighbors[0].id, '2');
  assert.ok(neighbors[0].similarity > neighbors[1].similarity);
});
