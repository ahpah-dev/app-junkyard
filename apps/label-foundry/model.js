import { check, number, requiredText, words } from '../../shared/lab.js';

export function train(rows, smoothing = 1) {
  const alpha = number(smoothing, 'Smoothing', 0.01, 10);
  const labels = new Map();
  const vocabulary = new Set();
  rows.forEach((row, i) => {
    const label = requiredText(row, 'label', i);
    const tokens = words(requiredText(row, 'text', i));
    check(tokens.length, 'Training record ' + (i + 1) + ' needs at least one word.');
    const bucket = labels.get(label) ?? { docs: 0, total: 0, counts: new Map() };
    bucket.docs++;
    bucket.total += tokens.length;
    for (const term of tokens) {
      vocabulary.add(term);
      bucket.counts.set(term, (bucket.counts.get(term) ?? 0) + 1);
    }
    labels.set(label, bucket);
  });
  check(labels.size >= 2 && labels.size <= 100, 'Train with between 2 and 100 different labels.');
  return { labels, vocabulary, alpha, documents: rows.length };
}

export function classify(model, text) {
  const tokens = words(text);
  check(tokens.length, 'Enter text containing at least one word.');
  const known = tokens.filter((t) => model.vocabulary.has(t));
  const scores = [...model.labels]
    .map(([label, bucket]) => {
      let logScore = Math.log(bucket.docs / model.documents);
      const denominator = bucket.total + model.alpha * model.vocabulary.size;
      for (const term of known)
        logScore += Math.log(((bucket.counts.get(term) ?? 0) + model.alpha) / denominator);
      return { label, logScore };
    })
    .sort((a, b) => b.logScore - a.logScore || a.label.localeCompare(b.label));
  const peak = scores[0].logScore;
  const total = scores.reduce((sum, s) => sum + Math.exp(s.logScore - peak), 0);
  return {
    label: scores[0].label,
    known: known.length,
    tokens: tokens.length,
    scores: scores.map((s) => ({ label: s.label, probability: Math.exp(s.logScore - peak) / total })),
  };
}

export function evaluate(model, rows) {
  const predictions = rows.map((r, i) => {
    const expected = requiredText(r, 'label', i);
    check(model.labels.has(expected), 'Evaluation label absent from training: ' + expected);
    const text = requiredText(r, 'text', i);
    return { text, expected, predicted: classify(model, text).label };
  });
  const correct = predictions.filter((p) => p.expected === p.predicted).length;
  return { correct, total: rows.length, predictions };
}
