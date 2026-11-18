import { el } from '../../shared/ui.js';
import { gridTable, jsonExport, jsonLines, lab, lineChart, metrics, rowsOf } from '../../shared/lab.js';
import { schedule } from './model.js';

const example = jsonLines([
  {
    id: 'G-101',
    beneficiary: 'Studio reserve',
    amount: '250000',
    start: '2026-01-01',
    cliff: '2026-04-01',
    end: '2027-01-01',
  },
  {
    id: 'G-102',
    beneficiary: 'Design cohort',
    amount: '80000',
    start: '2026-05-01',
    cliff: '2026-08-01',
    end: '2027-05-01',
  },
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Grant register',
    action: 'Forecast vesting',
    output: 'Vesting statement',
    fields: [
      { key: 'date', label: 'As-of date (UTC)', type: 'date', value: '2026-07-01' },
      {
        key: 'places',
        label: 'Token decimal places',
        type: 'number',
        attrs: { min: 0, max: 18, step: 1 },
        value: '6',
      },
      {
        key: 'register',
        label: 'Grant records · JSONL',
        rows: 6,
        value: example,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use id, beneficiary, amount, start, cliff and end. The grant accrues daily from start and unlocks at cliff.',
      },
    ],
    calculate: (s) => schedule(rowsOf(s.register), s.date, s.places),
    render: (r, context) => [
      metrics([
        ['Granted', r.total],
        ['Vested', r.vested],
        ['Still locked', r.locked],
      ]),
      lineChart('Cumulative vested tokens at month end', [
        { label: r.asOf, value: Number(r.vested) },
        ...r.forecast.map((m) => ({ label: m.date, value: Number(m.cumulative) })),
      ]),
      el('h4', {}, 'Grants at ' + r.asOf),
      gridTable(
        ['Grant', 'Beneficiary', 'Vested', 'Locked'],
        r.grants.slice(0, 40).map((g) => [g.id, g.beneficiary, g.vested, g.locked]),
      ),
      el('h4', {}, 'Upcoming releases'),
      gridTable(
        ['Month end', 'Newly vested', 'Cumulative'],
        r.forecast.map((m) => [m.date, m.released, m.cumulative]),
      ),
      jsonExport(context, 'vest-calendar.json', r),
    ],
  });
}
