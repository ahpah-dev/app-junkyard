import { el } from '../../shared/ui.js';
import { bars, button, csvExport, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
import { curate } from './model.js';

const sample = jsonLines(
  [
    ['requests', 'Add weekly digest'],
    ['requests', 'Add a weekly digest email'],
    ['requests', 'Pin a collection'],
    ['requests', 'Rename a notebook'],
    ['bugs', 'Search drops accents'],
    ['bugs', 'Sync icon stays active'],
    ['bugs', 'Empty export file'],
    ['requests', '  add weekly digest '],
    ['bugs', 'Tablet layout'],
    ['requests', 'Tablet layout'],
  ].map(([label, text]) => ({ text, label })),
);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Source dataset',
    output: 'Dataset review',
    action: 'Prepare split',
    fields: [
      {
        key: 'data',
        label: 'Labeled records · JSONL',
        rows: 8,
        value: sample,
        import: '.jsonl,.ndjson,.txt',
      },
      {
        key: 'pct',
        label: 'Holdout target (%)',
        type: 'number',
        attrs: { min: 1, max: 50, step: 'any' },
        value: '25',
      },
      { key: 'seed', label: 'Split seed', value: 'collection-v1' },
    ],
    calculate: (s) => curate(rowsOf(s.data), s.pct, s.seed),
    render: (r, context) => [
      metrics([
        ['Training records', r.train.length],
        ['Holdout records', r.test.length],
        ['Excluded', r.input - r.train.length - r.test.length],
        ['Balance entropy', (r.balance.entropy * 100).toFixed(1) + '%'],
        ['Fuzzy pairs', r.fuzzyPairs.length],
      ]),
      el(
        'p',
        { className: 'muted' },
        'Target ' +
          r.percentage +
          '% of ' +
          r.retained +
          ' retained records (' +
          r.requestedHoldout +
          ' after rounding). Actual holdout ' +
          r.test.length +
          ' records (' +
          r.effectivePercentage.toFixed(1) +
          '%). ' +
          (r.balance.warning || 'Min/max class ratio ' + r.balance.minMaxRatio.toFixed(2) + '.'),
      ),
      bars(
        'Disposition of source records',
        [
          ['Training', r.train.length, '#35765d'],
          ['Holdout', r.test.length, '#518090'],
          ...['Duplicate', 'Conflicting labels'].map((reason) => [
            reason,
            r.excluded.filter((g) => g.reason === reason).reduce((sum, g) => sum + g.records.length, 0),
            '#ba6e3b',
          ]),
        ].map(([label, count, color]) => ({
          label,
          value: count + ' / ' + r.input,
          fraction: count / r.input,
          color,
        })),
      ),
      gridTable(
        ['Label', 'Training', 'Holdout', 'Total', 'Share'],
        r.breakdown.map((b) => {
          const total = b.train + b.test;
          const share = r.retained ? ((100 * total) / r.retained).toFixed(1) + '%' : '0%';
          return [b.label, b.train, b.test, total, share];
        }),
      ),
      ...(r.fuzzyPairs.length
        ? [
            el('h4', {}, 'Fuzzy near-duplicate candidates'),
            gridTable(
              ['Records', 'Jaccard', 'Labels', 'Texts'],
              r.fuzzyPairs.slice(0, 25).map((p) => [
                '#' + p.a + ' vs #' + p.b,
                (p.similarity * 100).toFixed(1) + '%',
                p.sameLabel ? p.labelA + ' (match)' : p.labelA + ' ≠ ' + p.labelB,
                p.textA + ' | ' + p.textB,
              ]),
            ),
          ]
        : []),
      el(
        'details',
        {},
        el('summary', {}, 'Review excluded groups (' + r.excluded.length + ')'),
        gridTable(
          ['Reason', 'Normalized text', 'Source records'],
          r.excluded.slice(0, 40).map((e) => [e.reason, e.key, e.records.map((i) => i.record).join(', ')]),
        ),
      ),
      el(
        'div',
        { className: 'actions' },
        ...['train', 'test'].map((part) =>
          button('Download ' + part + '.jsonl', () =>
            context.download(
              part + '.jsonl',
              jsonLines(r[part]) + (r[part].length ? '\n' : ''),
              'application/x-ndjson',
            ),
          ),
        ),
        csvExport(
          context,
          'corpus-breakdown.csv',
          ['Label', 'Training', 'Holdout', 'Total'],
          r.breakdown.map((b) => [b.label, b.train, b.test, b.train + b.test]),
          'Download breakdown CSV',
        ),
        jsonExport(context, 'corpus-audit.json', r),
      ),
    ],
  });
}
