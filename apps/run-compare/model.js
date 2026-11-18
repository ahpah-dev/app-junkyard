import { check, number, requiredText, words } from '../../shared/lab.js';
const normalize = (text) => text.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');

function binomialTwoSided(k, n) {
  if (n <= 0) return 1;
  const tail = Math.min(k, n - k);
  let sum = 0;
  let logFactN = 0;
  for (let i = 2; i <= n; i++) logFactN += Math.log(i);
  const logHalfN = n * Math.log(0.5);
  for (let i = 0; i <= tail; i++) {
    let logC = logFactN;
    for (let j = 2; j <= i; j++) logC -= Math.log(j);
    for (let j = 2; j <= n - i; j++) logC -= Math.log(j);
    sum += Math.exp(logC + logHalfN);
  }
  return Math.min(1, 2 * sum);
}

export function score(rule, expected, answer) {
  const truth = normalize(expected);
  const actual = normalize(answer);
  if (rule === 'exact') return Number(truth === actual);
  if (rule === 'contains') return Number(actual.includes(truth));
  if (rule === 'jaccard') {
    const a = new Set(words(truth));
    check(a.size, 'A Jaccard reference needs at least one word.');
    const b = new Set(words(actual));
    let shared = 0;
    for (const token of a) if (b.has(token)) shared++;
    const union = a.size + b.size - shared;
    return union ? shared / union : 0;
  }
  if (rule === 'bleu') {
    const ref = words(truth);
    check(ref.length, 'A BLEU reference needs at least one word.');
    const hyp = words(actual);
    if (!hyp.length) return 0;
    const refCounts = new Map();
    for (const t of ref) refCounts.set(t, (refCounts.get(t) ?? 0) + 1);
    let m1 = 0;
    for (const t of hyp) {
      const c = refCounts.get(t) ?? 0;
      if (c > 0) {
        m1++;
        refCounts.set(t, c - 1);
      }
    }
    const refBi = new Map();
    for (let i = 0; i < ref.length - 1; i++) {
      const bg = ref[i] + '\u0000' + ref[i + 1];
      refBi.set(bg, (refBi.get(bg) ?? 0) + 1);
    }
    let m2 = 0;
    for (let i = 0; i < hyp.length - 1; i++) {
      const bg = hyp[i] + '\u0000' + hyp[i + 1];
      const c = refBi.get(bg) ?? 0;
      if (c > 0) {
        m2++;
        refBi.set(bg, c - 1);
      }
    }
    const p1 = (m1 + 1) / (hyp.length + 1);
    const p2 = (m2 + 1) / (Math.max(1, hyp.length - 1) + 1);
    const bp = hyp.length >= ref.length ? 1 : Math.exp(1 - ref.length / hyp.length);
    return Math.min(1, Math.sqrt(p1 * p2) * bp);
  }
  check(rule === 'f1', 'Unknown scoring rule: ' + rule);
  const target = words(truth);
  check(target.length, 'A token F1 reference needs at least one word.');
  const tokens = words(actual);
  const counts = new Map();
  for (const t of target) counts.set(t, (counts.get(t) ?? 0) + 1);
  let matched = 0;
  for (const t of tokens) {
    const count = counts.get(t) ?? 0;
    if (count > 0) {
      matched++;
      counts.set(t, count - 1);
    }
  }
  return (2 * matched) / (target.length + tokens.length);
}

export function significance(cases) {
  if (!cases.length) {
    return { meanDelta: 0, wins: 0, losses: 0, ties: 0, passFlipsUp: 0, passFlipsDown: 0, pValue: 1, mcnemarPValue: 1 };
  }
  let deltaSum = 0,
    wins = 0,
    losses = 0,
    ties = 0,
    passFlipsUp = 0,
    passFlipsDown = 0;
  for (const c of cases) {
    const diff = c.candidateScore - c.baselineScore;
    deltaSum += diff;
    if (diff > 1e-9) wins++;
    else if (diff < -1e-9) losses++;
    else ties++;
    if (!c.before && c.after) passFlipsUp++;
    else if (c.before && !c.after) passFlipsDown++;
  }
  return {
    meanDelta: deltaSum / cases.length,
    wins,
    losses,
    ties,
    passFlipsUp,
    passFlipsDown,
    pValue: binomialTwoSided(wins, wins + losses),
    mcnemarPValue: binomialTwoSided(passFlipsUp, passFlipsUp + passFlipsDown),
  };
}

export function compare(rows, threshold) {
  const cutoff = number(threshold, 'Token F1 threshold', 0.01, 1);
  const ids = new Set();
  const cases = rows.map((row, i) => {
    const id = requiredText(row, 'id', i);
    check(!ids.has(id), 'Duplicate case ID: ' + id);
    ids.add(id);
    const expected = requiredText(row, 'expected', i);
    const rule = row.rule ?? 'exact';
    const group = String(row.group ?? 'General');
    check(
      typeof row.baseline === 'string' && typeof row.candidate === 'string',
      'Case ' + id + ' needs two string answers.',
    );
    const baseline = score(rule, expected, row.baseline);
    const candidate = score(rule, expected, row.candidate);
    const pass = ['f1', 'jaccard', 'bleu'].includes(rule) ? cutoff : 1;
    const before = baseline >= pass;
    const after = candidate >= pass;
    const change = before
      ? after
        ? 'Still passing'
        : 'Regression'
      : after
        ? 'Improvement'
        : 'Still failing';
    return {
      id,
      expected,
      group,
      rule,
      baseline: row.baseline,
      candidate: row.candidate,
      baselineScore: baseline,
      candidateScore: candidate,
      before,
      after,
      change,
    };
  });
  const groups = new Map();
  for (const c of cases) {
    const g = groups.get(c.group) ?? { group: c.group, cases: 0, before: 0, after: 0 };
    g.cases++;
    g.before += Number(c.before);
    g.after += Number(c.after);
    groups.set(c.group, g);
  }
  return {
    threshold: cutoff,
    cases,
    groups: [...groups.values()],
    baselinePass: cases.filter((c) => c.before).length,
    candidatePass: cases.filter((c) => c.after).length,
    stats: significance(cases),
  };
}
