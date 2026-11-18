import { check, number, requiredText, words } from '../../shared/lab.js';
const normalize = (text) => text.normalize('NFKC').toLowerCase().trim().replace(/\s+/g, ' ');

export function score(rule, expected, answer) {
  const truth = normalize(expected);
  const actual = normalize(answer);
  if (rule === 'exact') return Number(truth === actual);
  if (rule === 'contains') return Number(actual.includes(truth));
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
    const pass = rule === 'f1' ? cutoff : 1;
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
  };
}
