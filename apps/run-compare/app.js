import { el } from '../../shared/ui.js';
import {
  bars,
  csvExport,
  gridTable,
  jsonExport,
  jsonLines,
  lab,
  metrics,
  rowsOf,
  words,
} from '../../shared/lab.js';
import { compare } from './model.js';

const suite = jsonLines([
  { id: 'route-01', group: 'Routing', expected: 'refund', baseline: 'billing', candidate: 'refund' },
  { id: 'route-02', group: 'Routing', expected: 'support', baseline: 'support', candidate: 'Support' },
  {
    id: 'policy-01',
    group: 'Policy',
    rule: 'contains',
    expected: '30 days',
    baseline: 'Return within 30 days.',
    candidate: 'Return within a month.',
  },
  {
    id: 'faq-01',
    group: 'FAQ',
    rule: 'f1',
    expected: 'cancel from account settings',
    baseline: 'account settings',
    candidate: 'cancel from account settings',
  },
  {
    id: 'sum-01',
    group: 'Summary',
    rule: 'bleu',
    expected: 'export your ledger as csv anytime',
    baseline: 'download csv ledger',
    candidate: 'export your ledger as csv anytime from billing',
  },
  {
    id: 'tag-01',
    group: 'Tags',
    rule: 'jaccard',
    expected: 'invoice receipt tax',
    baseline: 'invoice tax',
    candidate: 'invoice receipt tax',
  },
]);

function tokenDiff(expected, candidate) {
  const ref = new Set(words(expected));
  const hyp = new Set(words(candidate));
  const missing = [...ref].filter((w) => !hyp.has(w));
  const extra = [...hyp].filter((w) => !ref.has(w));
  if (!missing.length && !extra.length) return 'Exact token match';
  const parts = [];
  if (missing.length) parts.push('Missing: ' + missing.join(', '));
  if (extra.length) parts.push('Extra: ' + extra.join(', '));
  return parts.join(' · ');
}

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Evaluation suite',
    output: 'Paired results',
    action: 'Compare runs',
    fields: [
      {
        key: 'suite',
        label: 'Paired cases · JSONL',
        rows: 10,
        value: suite,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use id, expected, baseline and candidate. Optional rules: exact, contains, f1, jaccard, bleu.',
      },
      {
        key: 'cutoff',
        label: 'Minimum F1 / Jaccard / BLEU to pass',
        type: 'number',
        value: '0.8',
        attrs: { min: 0.01, max: 1, step: 'any' },
      },
    ],
    calculate: (s) => compare(rowsOf(s.suite), s.cutoff),
    render: (r, context) => {
      const list = el('div', { className: 'stack' });
      const filters = ['All cases', 'Regression', 'Improvement', 'Still passing', 'Still failing'];
      const filter = el(
        'select',
        { id: 'case-filter' },
        ...filters.map((f) => el('option', { value: f }, f)),
      );
      const update = () => {
        const shown = r.cases.filter((c) => filter.value === 'All cases' || c.change === filter.value);
        list.replaceChildren(
          el(
            'p',
            { className: 'muted' },
            shown.length +
              (shown.length === 1 ? ' case' : ' cases') +
              (shown.length > 40 ? ' · showing the first 40' : ''),
          ),
          ...shown.slice(0, 40).map((c) =>
            el(
              'details',
              { className: 'panel' },
              el('summary', {}, c.id + ' · ' + c.change + ' (' + c.baselineScore.toFixed(2) + ' → ' + c.candidateScore.toFixed(2) + ')'),
              gridTable(
                ['Field', 'Value'],
                [
                  ['Rule', c.rule],
                  ['Reference', c.expected],
                  ['Baseline', c.baseline],
                  ['Candidate', c.candidate],
                  ['Scores', c.baselineScore.toFixed(3) + ' → ' + c.candidateScore.toFixed(3)],
                  ['Candidate token diff', tokenDiff(c.expected, c.candidate)],
                ],
              ),
            ),
          ),
        );
      };
      filter.addEventListener('change', update);
      update();
      return [
        metrics([
          ['Baseline passes', r.baselinePass + ' / ' + r.cases.length],
          ['Candidate passes', r.candidatePass + ' / ' + r.cases.length],
          ['Mean score Δ', (r.stats.meanDelta >= 0 ? '+' : '') + r.stats.meanDelta.toFixed(3)],
          ['Sign-test p-value', r.stats.pValue.toFixed(4)],
          ['Win / Loss / Tie', r.stats.wins + ' / ' + r.stats.losses + ' / ' + r.stats.ties],
        ]),
        bars(
          'Outcome changes',
          ['Improvement', 'Regression', 'Still passing', 'Still failing'].map((label, i) => {
            const count = r.cases.filter((c) => c.change === label).length;
            return {
              label,
              fraction: count / r.cases.length,
              value: count + ' / ' + r.cases.length,
              color: ['#367954', '#bb572c', '#66826c', '#777773'][i],
            };
          }),
        ),
        gridTable(
          ['Group', 'Cases', 'Baseline passed', 'Candidate passed'],
          r.groups.map((g) => [g.group, g.cases, g.before, g.after]),
        ),
        el('label', { for: 'case-filter' }, 'Show cases'),
        filter,
        list,
        el(
          'div',
          { className: 'actions' },
          csvExport(
            context,
            'run-compare.csv',
            ['ID', 'Group', 'Rule', 'Outcome', 'Baseline Score', 'Candidate Score', 'Baseline', 'Candidate'],
            r.cases.map((c) => [
              c.id,
              c.group,
              c.rule,
              c.change,
              c.baselineScore.toFixed(4),
              c.candidateScore.toFixed(4),
              c.baseline,
              c.candidate,
            ]),
            'Download cases CSV',
          ),
          jsonExport(context, 'run-compare.json', r),
        ),
      ];
    },
  });
}
