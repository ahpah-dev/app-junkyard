import { check, number, requiredText, words } from '../../shared/lab.js';

function makeSnippet(text, terms) {
  const lower = text.toLowerCase();
  let bestIdx = -1;
  for (const t of terms) {
    const idx = lower.indexOf(t);
    if (idx >= 0 && (bestIdx < 0 || idx < bestIdx)) bestIdx = idx;
  }
  if (bestIdx < 0 || text.length <= 160) return text;
  const start = Math.max(0, bestIdx - 40);
  const end = Math.min(text.length, start + 160);
  return (start > 0 ? '…' : '') + text.slice(start, end) + (end < text.length ? '…' : '');
}

export function rank(rows, query, saturation = 1.2, lengthWeight = 0.75) {
  const k1 = number(saturation, 'Saturation', 0, 3);
  const b = number(lengthWeight, 'Length weight', 0, 1);
  const terms = [...new Set(words(query))];
  check(terms.length && terms.length <= 100, 'Enter between 1 and 100 distinct search terms.');
  check(rows.length > 0, 'Add a document.');
  const seen = new Set();
  const documents = rows.map((row, i) => {
    const id = requiredText(row, 'id', i);
    check(!seen.has(id), 'Duplicate document ID: ' + id);
    seen.add(id);
    const title = requiredText(row, 'title', i);
    const text = requiredText(row, 'text', i);
    const tokens = words(title + ' ' + text);
    const frequencies = new Map();
    for (const token of tokens) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);
    return { id, title, text, length: tokens.length, frequencies };
  });
  const averageLength = documents.reduce((n, doc) => n + doc.length, 0) / documents.length || 1;
  const termWeights = terms.map((term) => {
    const df = documents.filter((doc) => doc.frequencies.has(term)).length;
    const idf = Math.log1p((documents.length - df + 0.5) / (df + 0.5));
    return { term, df, idf };
  });
  const weights = new Map(termWeights.map((w) => [w.term, w.idf]));
  const hits = [];
  for (const { frequencies, ...doc } of documents) {
    const contributions = [];
    for (const term of terms) {
      const frequency = frequencies.get(term);
      if (!frequency) continue;
      const norm = 1 - b + (b * doc.length) / averageLength;
      const score = (weights.get(term) * frequency * (k1 + 1)) / (frequency + k1 * norm);
      contributions.push({ term, frequency, score });
    }
    if (contributions.length) {
      hits.push({
        ...doc,
        contributions,
        coverage: contributions.length / terms.length,
        snippet: makeSnippet(doc.text, terms),
        score: contributions.reduce((n, t) => n + t.score, 0),
      });
    }
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { query, k1, b, documents: documents.length, averageLength, termWeights, hits };
}

export function expandQuery(rows, hits, query, limit = 5) {
  if (!hits?.length || !rows?.length) return [];
  const existing = new Set(words(query));
  const df = new Map();
  for (const row of rows) {
    const unique = new Set(words((row.title ?? '') + ' ' + (row.text ?? '')));
    for (const token of unique) df.set(token, (df.get(token) ?? 0) + 1);
  }
  const top = hits.slice(0, 3);
  const candidates = new Map();
  for (const hit of top) {
    const tokens = words(hit.title + ' ' + hit.text);
    const seenInHit = new Set();
    for (const token of tokens) {
      if (token.length < 2 || existing.has(token)) continue;
      const entry = candidates.get(token) ?? { term: token, tf: 0, docs: new Set() };
      entry.tf++;
      if (!seenInHit.has(token)) {
        entry.docs.add(hit.id);
        seenInHit.add(token);
      }
      candidates.set(token, entry);
    }
  }
  return [...candidates.values()]
    .map((entry) => {
      const docFreq = df.get(entry.term) ?? 1;
      const idf = Math.log1p((rows.length - docFreq + 0.5) / (docFreq + 0.5));
      return {
        term: entry.term,
        topDocs: entry.docs.size,
        score: Number((entry.tf * idf).toFixed(4)),
      };
    })
    .sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
    .slice(0, limit);
}
