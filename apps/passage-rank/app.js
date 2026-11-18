import { el } from '../../shared/ui.js';
import {
  bars,
  button,
  csvExport,
  gridTable,
  jsonExport,
  jsonLines,
  lab,
  metrics,
  rowsOf,
} from '../../shared/lab.js';
import { expandQuery, rank } from './model.js';

const corpus = jsonLines([
  {
    id: 'docs-101',
    title: 'Offline sync',
    text: 'Offline edits queue on the device. Sync resumes when a connection returns.',
  },
  {
    id: 'docs-204',
    title: 'Conflict handling',
    text: 'When two users edit the same note offline, a conflict copy preserves both versions.',
  },
  {
    id: 'docs-315',
    title: 'Exporting notes',
    text: 'Export a notebook as Markdown to keep a copy of every note and attachment.',
  },
  {
    id: 'docs-408',
    title: 'Sync diagnostics',
    text: 'Check the pending edit count and last successful sync time in settings.',
  },
  {
    id: 'docs-512',
    title: 'Background queue retries',
    text: 'Device sync retries failed batches with exponential backoff after connection drops.',
  },
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Search configuration',
    action: 'Rank passages',
    output: 'Ranked passages',
    fields: [
      { key: 'query', label: 'Search query', value: 'offline sync' },
      {
        key: 'corpus',
        label: 'Documents · JSONL',
        value: corpus,
        rows: 7,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use one object with id, title and text per line.',
      },
      {
        key: 'k1',
        label: 'Term saturation (k1)',
        value: '1.2',
        type: 'number',
        attrs: { min: 0, max: 3, step: 'any' },
      },
      {
        key: 'b',
        label: 'Length normalization (b)',
        value: '0.75',
        type: 'number',
        attrs: { min: 0, max: 1, step: 'any' },
      },
    ],
    calculate: (s) => {
      const rows = rowsOf(s.corpus);
      const report = rank(rows, s.query, s.k1, s.b);
      return { ...report, expansions: expandQuery(rows, report.hits, s.query, 5) };
    },
    render: (report, context) => [
      metrics([
        ['Documents', report.documents],
        ['Matches', report.hits.length],
        ['Avg doc length', report.averageLength.toFixed(1) + ' words'],
      ]),
      el('h4', {}, 'Query term IDF weights'),
      gridTable(
        ['Term', 'Document frequency', 'BM25 IDF'],
        report.termWeights.map((t) => [t.term, t.df + ' / ' + report.documents, t.idf.toFixed(3)]),
      ),
      ...(report.expansions.length
        ? [
            el(
              'div',
              { className: 'stack' },
              el('h4', {}, 'Pseudo-relevance query expansion (click to append)'),
              el(
                'div',
                { className: 'actions' },
                ...report.expansions.map((item) =>
                  button('+ ' + item.term + ' (' + item.score.toFixed(2) + ')', () => {
                    const input = document.getElementById('lab-query');
                    if (input) {
                      input.value = (input.value + ' ' + item.term).trim();
                      input.dispatchEvent(new Event('input', { bubbles: true }));
                      input.form?.requestSubmit();
                    }
                  }),
                ),
              ),
            ),
          ]
        : []),
      ...(report.hits.length
        ? [
            bars(
              'Highest relevance scores',
              report.hits.slice(0, 5).map((h) => ({
                label: h.title,
                value: h.score.toFixed(3),
                fraction: h.score / report.hits[0].score,
              })),
            ),
          ]
        : []),
      ...report.hits.slice(0, 30).map((hit) =>
        el(
          'details',
          { className: 'panel' },
          el(
            'summary',
            {},
            hit.title + ' · ' + hit.score.toFixed(3) + ' (' + Math.round(hit.coverage * 100) + '% query coverage)',
          ),
          el('p', {}, hit.snippet),
          gridTable(
            ['Term', 'Frequency', 'Score'],
            hit.contributions.map((c) => [c.term, c.frequency, c.score.toFixed(3)]),
          ),
        ),
      ),
      ...(report.hits.length ? [] : [el('p', {}, 'No passages contained these terms.')]),
      ...(report.hits.length > 30
        ? [el('p', {}, 'Showing the first 30 hits. The report includes every match.')]
        : []),
      el(
        'div',
        { className: 'actions' },
        ...(report.hits.length
          ? [
              csvExport(
                context,
                'passage-rank.csv',
                ['ID', 'Title', 'Score', 'Coverage', 'Snippet'],
                report.hits.map((h) => [h.id, h.title, h.score.toFixed(4), h.coverage.toFixed(2), h.snippet]),
                'Download hits CSV',
              ),
            ]
          : []),
        jsonExport(context, 'passage-rank.json', report),
      ),
    ],
  });
}
