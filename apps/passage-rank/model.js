import { check, number, requiredText, words } from '../../shared/lab.js';

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
  const weights = new Map(
    terms.map((term) => {
      const count = documents.filter((doc) => doc.frequencies.has(term)).length;
      return [term, Math.log1p((documents.length - count + 0.5) / (count + 0.5))];
    }),
  );
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
    if (contributions.length)
      hits.push({ ...doc, contributions, score: contributions.reduce((n, t) => n + t.score, 0) });
  }
  hits.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
  return { query, k1, b, documents: documents.length, averageLength, hits };
}
