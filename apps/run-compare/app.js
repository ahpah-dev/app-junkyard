import { el } from '../../shared/ui.js';
import { bars, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
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
]);

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
        hint: 'Use id, expected, baseline and candidate. Optional rules are exact, contains and f1.',
      },
      {
        key: 'cutoff',
        label: 'Minimum token F1 to pass',
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
              el('summary', {}, c.id + ' · ' + c.change),
              gridTable(
                ['Field', 'Value'],
                [
                  ['Rule', c.rule],
                  ['Reference', c.expected],
                  ['Baseline', c.baseline],
                  ['Candidate', c.candidate],
                  ['Scores', c.baselineScore.toFixed(3) + ' → ' + c.candidateScore.toFixed(3)],
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
        jsonExport(context, 'run-compare.json', r),
      ];
    },
  });
}
