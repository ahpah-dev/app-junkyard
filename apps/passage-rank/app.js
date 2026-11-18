import { el } from '../../shared/ui.js';
import { bars, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
import { rank } from './model.js';

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
    calculate: (s) => rank(rowsOf(s.corpus), s.query, s.k1, s.b),
    render: (report, context) => [
      metrics([
        ['Documents', report.documents],
        ['Matches', report.hits.length],
      ]),
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
          el('summary', {}, hit.title + ' · ' + hit.score.toFixed(3)),
          el('p', {}, hit.text),
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
      jsonExport(context, 'passage-rank.json', report),
    ],
  });
}
