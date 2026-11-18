import { el } from '../../shared/ui.js';
import {
  bars,
  csvExport,
  gridTable,
  jsonExport,
  jsonLines,
  lab,
  lineChart,
  metrics,
  rowsOf,
} from '../../shared/lab.js';
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
    periodDays: 30,
  },
  {
    id: 'G-103',
    beneficiary: 'Engineering pool',
    amount: '120000',
    start: '2026-03-01',
    cliff: '2026-06-01',
    end: '2027-09-01',
    periodDays: 30,
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
        rows: 7,
        value: example,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use id, beneficiary, amount, start, cliff, end, and optional periodDays (default 1 = daily).',
      },
    ],
    calculate: (s) => schedule(rowsOf(s.register), s.date, s.places),
    render: (r, context) => [
      metrics([
        ['Granted', r.total],
        ['Vested', r.vested],
        ['Still locked', r.locked],
        ['Beneficiaries', r.beneficiaries.length],
      ]),
      lineChart('Cumulative vested tokens at month end', [
        { label: r.asOf, value: Number(r.vested) },
        ...r.forecast.map((m) => ({ label: m.date, value: Number(m.cumulative) })),
      ]),
      bars(
        'Allocation share by beneficiary',
        r.beneficiaries.slice(0, 8).map((b) => ({
          label: b.beneficiary + ' (' + b.grantsCount + (b.grantsCount === 1 ? ' grant)' : ' grants)'),
          value: b.sharePct.toFixed(1) + '%',
          fraction: b.sharePct / 100,
          color: '#9e7136',
        })),
      ),
      el('h4', {}, 'Beneficiary cap table at ' + r.asOf),
      gridTable(
        ['Beneficiary', 'Grants', 'Granted', 'Vested', 'Locked', 'Share'],
        r.beneficiaries.map((b) => [
          b.beneficiary,
          b.grantsCount,
          b.granted,
          b.vested,
          b.locked,
          b.sharePct.toFixed(2) + '%',
        ]),
      ),
      el('h4', {}, 'Grants at ' + r.asOf),
      gridTable(
        ['Grant', 'Beneficiary', 'Cadence', 'Vested', 'Locked', 'Progress'],
        r.grants
          .slice(0, 40)
          .map((g) => [
            g.id,
            g.beneficiary,
            g.periodDays === 1 ? 'Daily' : g.periodDays + 'd step',
            g.vested,
            g.locked,
            g.progressPct.toFixed(1) + '%',
          ]),
      ),
      el('h4', {}, 'Upcoming releases'),
      gridTable(
        ['Month end', 'Newly vested', 'Cumulative'],
        r.forecast.map((m) => [m.date, m.released, m.cumulative]),
      ),
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'vest-grants.csv',
          ['Grant', 'Beneficiary', 'CadenceDays', 'Granted', 'Vested', 'Locked', 'ProgressPct'],
          r.grants.map((g) => [g.id, g.beneficiary, g.periodDays, g.granted, g.vested, g.locked, g.progressPct]),
          'Download grants CSV',
        ),
        csvExport(
          context,
          'vest-forecast.csv',
          ['MonthEnd', 'NewlyVested', 'CumulativeVested'],
          r.forecast.map((m) => [m.date, m.released, m.cumulative]),
          'Download forecast CSV',
        ),
        jsonExport(context, 'vest-calendar.json', r),
      ),
    ],
  });
}
