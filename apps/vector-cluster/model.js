import { check, number, requiredText, words } from '../../shared/lab.js';

function seededRng(seedText) {
  let h = 2166136261;
  for (let i = 0; i < seedText.length; i++) h = Math.imul(h ^ seedText.charCodeAt(i), 16777619);
  let s = h >>> 0 || 1;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function vectorize(rows) {
  check(rows.length >= 2, 'Supply at least 2 documents.');
  const seen = new Set();
  const docs = rows.map((row, i) => {
    const id = requiredText(row, 'id', i);
    check(!seen.has(id), 'Duplicate document ID: ' + id);
    seen.add(id);
    const text = requiredText(row, 'text', i);
    const tokens = words(text);
    check(tokens.length > 0, 'Document ' + id + ' needs at least one word.');
    const tf = new Map();
    for (const t of tokens) tf.set(t, (tf.get(t) ?? 0) + 1);
    return { id, text, tf };
  });
  const df = new Map();
  for (const d of docs) {
    for (const term of d.tf.keys()) df.set(term, (df.get(term) ?? 0) + 1);
  }
  const N = docs.length;
  const vectors = docs.map((d) => {
    const weights = new Map();
    let normSq = 0;
    for (const [term, count] of d.tf) {
      const w = (1 + Math.log(count)) * (1 + Math.log(N / (df.get(term) ?? 1)));
      weights.set(term, w);
      normSq += w * w;
    }
    const norm = Math.sqrt(normSq) || 1;
    for (const [term, w] of weights) weights.set(term, w / norm);
    return { id: d.id, text: d.text, vec: weights };
  });
  return vectors;
}

function dot(a, b) {
  let sum = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const [k, v] of small) {
    const other = large.get(k);
    if (other) sum += v * other;
  }
  return sum;
}

function normalizeVec(map) {
  let normSq = 0;
  for (const v of map.values()) normSq += v * v;
  const norm = Math.sqrt(normSq) || 1;
  const out = new Map();
  for (const [k, v] of map) out.set(k, v / norm);
  return out;
}

export function similarDocuments(rows, targetId, limit = 5) {
  const vectors = vectorize(rows);
  const target = vectors.find((d) => d.id === targetId);
  check(Boolean(target), 'Target document ID not found: ' + targetId);
  return vectors
    .filter((d) => d.id !== targetId)
    .map((d) => ({
      id: d.id,
      text: d.text,
      similarity: Number(dot(target.vec, d.vec).toFixed(4)),
    }))
    .sort((a, b) => b.similarity - a.similarity || a.id.localeCompare(b.id))
    .slice(0, limit);
}

export function clusterDocuments(rows, kInput = 3, seed = 'cluster-v1') {
  const docs = vectorize(rows);
  const k = number(kInput, 'Cluster count (k)', 2, Math.min(10, docs.length), true);
  check(String(seed).trim().length > 0, 'Enter a clustering seed.');
  const rng = seededRng(String(seed));

  // k-means++ initialization using cosine distance (1 - similarity)
  const centroids = [new Map(docs[Math.floor(rng() * docs.length)].vec)];
  while (centroids.length < k) {
    const dists = docs.map((d) => {
      const bestSim = Math.max(...centroids.map((c) => dot(d.vec, c)));
      const dist = Math.max(0, 1 - bestSim);
      return dist * dist;
    });
    const total = dists.reduce((s, v) => s + v, 0);
    if (total <= 0) {
      centroids.push(new Map(docs[centroids.length % docs.length].vec));
      continue;
    }
    let pick = rng() * total;
    let chosen = docs[docs.length - 1];
    for (let i = 0; i < docs.length; i++) {
      pick -= dists[i];
      if (pick <= 0) {
        chosen = docs[i];
        break;
      }
    }
    centroids.push(new Map(chosen.vec));
  }

  let assignments = Array(docs.length).fill(0);
  for (let iter = 0; iter < 25; iter++) {
    let changed = false;
    const next = docs.map((d, idx) => {
      let bestCluster = 0;
      let bestSim = -Infinity;
      for (let c = 0; c < k; c++) {
        const sim = dot(d.vec, centroids[c]);
        if (sim > bestSim) {
          bestSim = sim;
          bestCluster = c;
        }
      }
      if (bestCluster !== assignments[idx]) changed = true;
      return bestCluster;
    });
    assignments = next;
    if (!changed && iter > 0) break;

    const sums = Array.from({ length: k }, () => new Map());
    const counts = Array(k).fill(0);
    docs.forEach((d, idx) => {
      const cid = assignments[idx];
      counts[cid]++;
      for (const [term, w] of d.vec) sums[cid].set(term, (sums[cid].get(term) ?? 0) + w);
    });
    for (let c = 0; c < k; c++) {
      if (counts[c] > 0) centroids[c] = normalizeVec(sums[c]);
    }
  }

  // Cosine distance matrix for silhouette calculation
  const sil = docs.map((d, i) => {
    const myCluster = assignments[i];
    const sameDists = [];
    const otherSums = new Map();
    const otherCounts = new Map();
    for (let j = 0; j < docs.length; j++) {
      if (i === j) continue;
      const dist = Math.max(0, 1 - dot(d.vec, docs[j].vec));
      const c = assignments[j];
      if (c === myCluster) sameDists.push(dist);
      else {
        otherSums.set(c, (otherSums.get(c) ?? 0) + dist);
        otherCounts.set(c, (otherCounts.get(c) ?? 0) + 1);
      }
    }
    if (!sameDists.length || !otherSums.size) return 0;
    const a = sameDists.reduce((s, v) => s + v, 0) / sameDists.length;
    let b = Infinity;
    for (const [c, sum] of otherSums) {
      b = Math.min(b, sum / otherCounts.get(c));
    }
    const denom = Math.max(a, b);
    return denom > 0 ? (b - a) / denom : 0;
  });

  const clusters = Array.from({ length: k }, (_, c) => {
    const memberIdxs = assignments.map((a, i) => (a === c ? i : -1)).filter((i) => i >= 0);
    const keywords = [...centroids[c].entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5)
      .map(([term]) => term);
    const avgSim = memberIdxs.length
      ? memberIdxs.reduce((s, idx) => s + dot(docs[idx].vec, centroids[c]), 0) / memberIdxs.length
      : 0;
    return {
      cluster: c + 1,
      size: memberIdxs.length,
      keywords,
      cohesion: Number(avgSim.toFixed(4)),
    };
  });

  const documents = docs.map((d, i) => ({
    id: d.id,
    text: d.text,
    cluster: assignments[i] + 1,
    centroidSimilarity: Number(dot(d.vec, centroids[assignments[i]]).toFixed(4)),
    silhouette: Number(sil[i].toFixed(4)),
  }));

  const meanSilhouette = documents.reduce((s, d) => s + d.silhouette, 0) / documents.length;
  return {
    k,
    seed: String(seed),
    documentCount: docs.length,
    meanSilhouette: Number(meanSilhouette.toFixed(4)),
    clusters,
    documents,
  };
}
