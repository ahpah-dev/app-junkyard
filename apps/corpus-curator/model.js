import { check, number, requiredText, words } from '../../shared/lab.js';

function hash(text) {
  let value = 2166136261;
  for (let i = 0; i < text.length; i++) value = Math.imul(value ^ text.charCodeAt(i), 16777619);
  return value >>> 0;
}
const compareText = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const normKey = (text) => text.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

export function nearDuplicates(rows, threshold = 0.65) {
  const cutoff = number(threshold, 'Similarity threshold', 0.1, 1);
  const unique = [];
  const seenKeys = new Set();
  rows.forEach((row, i) => {
    const text = requiredText(row, 'text', i);
    const label = requiredText(row, 'label', i);
    const key = normKey(text);
    if (seenKeys.has(key)) return;
    seenKeys.add(key);
    unique.push({ record: i + 1, text, label, tokens: new Set(words(text)) });
  });
  const pairs = [];
  for (let i = 0; i < unique.length; i++) {
    for (let j = i + 1; j < unique.length; j++) {
      const A = unique[i],
        B = unique[j];
      if (!A.tokens.size || !B.tokens.size) continue;
      let shared = 0;
      for (const token of A.tokens) if (B.tokens.has(token)) shared++;
      const union = A.tokens.size + B.tokens.size - shared;
      const similarity = union ? shared / union : 0;
      if (similarity >= cutoff) {
        pairs.push({
          a: A.record,
          b: B.record,
          textA: A.text,
          textB: B.text,
          labelA: A.label,
          labelB: B.label,
          sameLabel: A.label === B.label,
          similarity: Number(similarity.toFixed(4)),
        });
      }
    }
  }
  return pairs.sort((x, y) => y.similarity - x.similarity || x.a - y.a || x.b - y.b);
}

export function classBalance(breakdown) {
  const counts = breakdown.map((b) => ({ label: b.label, total: b.train + b.test })).filter((b) => b.total > 0);
  const sum = counts.reduce((n, b) => n + b.total, 0);
  if (!sum || !counts.length) {
    return { entropy: 0, minMaxRatio: 0, minorityLabel: '', majorityLabel: '', warning: 'No retained classes.' };
  }
  const sorted = [...counts].sort((a, b) => a.total - b.total || compareText(a.label, b.label));
  let h = 0;
  for (const c of counts) {
    const p = c.total / sum;
    if (p > 0) h -= p * Math.log2(p);
  }
  const entropy = counts.length > 1 ? h / Math.log2(counts.length) : 1;
  const minMaxRatio = sorted[0].total / sorted.at(-1).total;
  return {
    entropy: Number(entropy.toFixed(4)),
    minMaxRatio: Number(minMaxRatio.toFixed(4)),
    minorityLabel: sorted[0].label,
    majorityLabel: sorted.at(-1).label,
    warning:
      counts.length > 1 && minMaxRatio < 0.5
        ? 'Imbalance: ' + sorted[0].label + ' (' + sorted[0].total + ') vs ' + sorted.at(-1).label + ' (' + sorted.at(-1).total + ').'
        : '',
  };
}

function apportion(classes, pct) {
  const groups = [...classes.keys()]
    .sort(compareText)
    .map((label) => ({ label, size: classes.get(label).length, take: 0 }));
  const retained = groups.reduce((sum, g) => sum + g.size, 0);
  const requested = Math.round((retained * pct) / 100);
  const target = Math.min(requested, retained - groups.length);
  let remaining = target;
  for (const g of groups) {
    g.take = Math.min(g.size - 1, Math.floor((target * g.size) / retained));
    remaining -= g.take;
  }
  // Award residual slots to the eligible group furthest below its proportional quota.
  // Integer numerators make equal remainders deterministic in label order.
  while (remaining > 0) {
    let best;
    let highestDeficit = -Infinity;
    for (const group of groups) {
      if (group.take >= group.size - 1) continue;
      const deficit = target * group.size - group.take * retained;
      if (deficit > highestDeficit) {
        highestDeficit = deficit;
        best = group;
      }
    }
    best.take++;
    remaining--;
  }
  return { groups, retained, requested, effectivePercentage: retained ? (100 * target) / retained : 0 };
}

export function curate(rows, percentage, seed) {
  const pct = number(percentage, 'Holdout percentage', 1, 50);
  check(String(seed).trim(), 'Enter a split seed.');
  const seen = new Map();
  rows.forEach((row, i) => {
    const text = requiredText(row, 'text', i);
    const label = requiredText(row, 'label', i);
    const key = normKey(text);
    const entries = seen.get(key) ?? [];
    entries.push({ text, label, record: i + 1 });
    seen.set(key, entries);
  });
  const excluded = [];
  const classes = new Map();
  for (const [key, records] of seen) {
    const labels = new Set(records.map((r) => r.label));
    if (labels.size > 1) {
      excluded.push({ reason: 'Conflicting labels', key, records });
      continue;
    }
    records.sort((a, b) => compareText(a.text, b.text) || a.record - b.record);
    const [chosen, ...duplicates] = records;
    if (duplicates.length) excluded.push({ reason: 'Duplicate', key, records: duplicates });
    const group = classes.get(chosen.label) ?? [];
    group.push({ text: chosen.text, label: chosen.label, key, order: hash(seed + '\u0000' + key) });
    classes.set(chosen.label, group);
  }
  const train = [],
    test = [],
    breakdown = [];
  const split = apportion(classes, pct);
  for (const { label, take: count } of split.groups) {
    const group = classes.get(label);
    group.sort((a, b) => a.order - b.order || compareText(a.key, b.key));
    const clean = (r) => ({ text: r.text, label: r.label });
    test.push(...group.slice(0, count).map(clean));
    train.push(...group.slice(count).map(clean));
    breakdown.push({ label, train: group.length - count, test: count });
  }
  return {
    seed,
    percentage: pct,
    input: rows.length,
    retained: split.retained,
    requestedHoldout: split.requested,
    effectivePercentage: split.effectivePercentage,
    train,
    test,
    breakdown,
    excluded,
    balance: classBalance(breakdown),
    fuzzyPairs: nearDuplicates(rows),
  };
}
