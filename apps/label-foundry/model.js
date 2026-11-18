import { check, number, requiredText, words } from '../../shared/lab.js';

function extractFeatures(text, ngrams = 1) {
  const unigrams = words(text);
  if (ngrams === 1) return unigrams;
  const bigrams = [];
  for (let i = 0; i < unigrams.length - 1; i++) bigrams.push(unigrams[i] + '_' + unigrams[i + 1]);
  return [...unigrams, ...bigrams];
}

export function train(rows, smoothing = 1, ngrams = 1) {
  const alpha = number(smoothing, 'Smoothing', 0.01, 10);
  const ngramOrder = number(ngrams, 'N-gram order', 1, 2, true);
  const labels = new Map();
  const vocabulary = new Set();
  rows.forEach((row, i) => {
    const label = requiredText(row, 'label', i);
    const tokens = extractFeatures(requiredText(row, 'text', i), ngramOrder);
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
  return { labels, vocabulary, alpha, documents: rows.length, ngrams: ngramOrder };
}

export function classify(model, text) {
  const tokens = extractFeatures(text, model.ngrams ?? 1);
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
  const probs = scores.map((s) => ({ label: s.label, probability: Math.exp(s.logScore - peak) / total }));
  let entropy = 0;
  for (const s of probs) if (s.probability > 0) entropy -= s.probability * Math.log2(s.probability);
  const topBucket = model.labels.get(scores[0].label);
  const runnerBucket = model.labels.get(scores[1]?.label ?? scores[0].label);
  const topDenom = topBucket.total + model.alpha * model.vocabulary.size;
  const runDenom = runnerBucket.total + model.alpha * model.vocabulary.size;
  const termFreqs = new Map();
  for (const t of known) termFreqs.set(t, (termFreqs.get(t) ?? 0) + 1);
  const contributions = [...termFreqs.entries()]
    .map(([term, count]) => {
      const logTop = Math.log(((topBucket.counts.get(term) ?? 0) + model.alpha) / topDenom);
      const logRun = Math.log(((runnerBucket.counts.get(term) ?? 0) + model.alpha) / runDenom);
      return { term, count, logOdds: (logTop - logRun) * count };
    })
    .sort((a, b) => Math.abs(b.logOdds) - Math.abs(a.logOdds) || a.term.localeCompare(b.term));
  return {
    label: scores[0].label,
    known: known.length,
    tokens: tokens.length,
    entropy,
    contributions,
    scores: probs,
  };
}

export function topFeatures(model, perLabel = 5) {
  const limit = number(perLabel, 'Features per label', 1, 20, true);
  const totalCounts = new Map();
  let corpusTotal = 0;
  for (const bucket of model.labels.values()) {
    corpusTotal += bucket.total;
    for (const [term, count] of bucket.counts) {
      totalCounts.set(term, (totalCounts.get(term) ?? 0) + count);
    }
  }
  const vocabSize = model.vocabulary.size;
  return [...model.labels.keys()]
    .sort()
    .map((label) => {
      const bucket = model.labels.get(label);
      const restTotal = corpusTotal - bucket.total;
      const denomIn = bucket.total + model.alpha * vocabSize;
      const denomOut = restTotal + model.alpha * vocabSize;
      const features = [...model.vocabulary]
        .map((term) => {
          const inCount = bucket.counts.get(term) ?? 0;
          const outCount = (totalCounts.get(term) ?? 0) - inCount;
          const lift = Math.log((inCount + model.alpha) / denomIn) - Math.log((outCount + model.alpha) / denomOut);
          return { term, count: inCount, lift };
        })
        .filter((f) => f.count > 0)
        .sort((a, b) => b.lift - a.lift || a.term.localeCompare(b.term))
        .slice(0, limit);
      return { label, features };
    });
}

export function evaluate(model, rows) {
  const labelList = [...model.labels.keys()].sort();
  const labelIndex = new Map(labelList.map((label, i) => [label, i]));
  const matrix = Array.from({ length: labelList.length }, () => Array(labelList.length).fill(0));
  const predictions = rows.map((r, i) => {
    const expected = requiredText(r, 'label', i);
    check(model.labels.has(expected), 'Evaluation label absent from training: ' + expected);
    const text = requiredText(r, 'text', i);
    const result = classify(model, text);
    matrix[labelIndex.get(expected)][labelIndex.get(result.label)]++;
    return {
      text,
      expected,
      predicted: result.label,
      confidence: result.scores[0]?.probability ?? 0,
    };
  });
  const correct = predictions.filter((p) => p.expected === p.predicted).length;
  const perClass = labelList.map((label, idx) => {
    const tp = matrix[idx][idx];
    const fn = matrix[idx].reduce((s, v) => s + v, 0) - tp;
    const fp = matrix.reduce((s, row) => s + row[idx], 0) - tp;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
    return { label, precision, recall, f1, support: tp + fn };
  });
  const evaluatedClasses = perClass.filter((c) => c.support > 0);
  const macroF1 = evaluatedClasses.length
    ? evaluatedClasses.reduce((s, c) => s + c.f1, 0) / evaluatedClasses.length
    : 0;
  return {
    correct,
    total: rows.length,
    accuracy: rows.length ? correct / rows.length : 0,
    macroF1,
    perClass,
    confusion: { labels: labelList, matrix },
    predictions,
  };
}
