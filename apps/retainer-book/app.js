import {
  mountWorkbench,
  comparison,
  money,
  cents,
  whole,
  day,
  validDate,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  dateField,
} from '../../shared/business.js';

const month = () => day().slice(0, 7);
const hours = (minutes) => (minutes / 60).toLocaleString('en-US', { maximumFractionDigits: 2 }) + ' h';
export function usage(r) {
  const used = r.entries.reduce((n, e) => n + e.minutes, 0);
  const excess = Math.max(0, used - r.allowance);
  const extraFee = Math.round((excess * r.rate) / 60);
  return { used, excess, extraFee, estimate: r.fee + extraFee };
}
export function logTime(r, e) {
  demand(validDate(e.date) && e.date.slice(0, 7) === r.month, 'Time must fall inside the service month.');
  demand(whole(e.minutes) && e.minutes > 0 && e.minutes <= 1440, 'Enter between 1 and 1,440 whole minutes.');
  requiredText(e.task, 'a work description');
  return { ...r, entries: [...r.entries, e] };
}
const status = (r) =>
  usage(r).excess ? 'Over allowance' : usage(r).used === r.allowance ? 'At allowance' : 'Within allowance';
const blank = () => ({ client: '', month: month(), hours: 10, feeUsd: 800, rateUsd: 100 });
const seed = () => [
  {
    id: 'r1',
    client: 'Mica Studio',
    month: month(),
    allowance: 600,
    fee: 80000,
    rate: 10000,
    entries: [
      { date: month() + '-01', task: 'Component audit', minutes: 270 },
      { date: month() + '-01', task: 'Review session', minutes: 90 },
    ],
  },
  {
    id: 'r2',
    client: 'Bell & Finch',
    month: month(),
    allowance: 300,
    fee: 55000,
    rate: 12000,
    entries: [{ date: month() + '-01', task: 'Launch preparation', minutes: 375 }],
  },
];
const config = {
  overview(rows, open) {
    const current = rows
      .filter((r) => r.month === month())
      .sort((a, b) => usage(b).used / b.allowance - usage(a).used / a.allowance);
    const scale = Math.max(1, ...current.map((r) => usage(r).used / r.allowance));
    return comparison(
      'Service-month utilization · ' + month(),
      current.map((r) => {
        const u = usage(r),
          ratio = u.used / r.allowance;
        return {
          label: r.client,
          note: hours(u.used) + ' of ' + hours(r.allowance) + ' included · marker at allowance',
          value: Math.round(ratio * 100) + '%',
          fraction: ratio / scale,
          marker: 1 / scale,
          color: u.excess ? '#bd623d' : '#587864',
          run: () => open(r),
        };
      }),
      'No retainers are scheduled for the current month.',
    );
  },
  id: 'retainer-book',
  singular: 'retainer',
  plural: 'retainers',
  heading: 'Client service months',
  seed,
  blank,
  groups: ['Within allowance', 'At allowance', 'Over allowance'],
  group: status,
  title: (r) => r.client + ' · ' + r.month,
  fields: [
    textField('client', 'Client'),
    textField('month', 'Service month', { type: 'month' }),
    decimalField('hours', 'Included hours', { min: 0.25, max: 10000, step: 0.25 }),
    decimalField('feeUsd', 'Monthly fee (USD)'),
    decimalField('rateUsd', 'Hourly overage rate (USD)'),
  ],
  form: (r) => ({
    client: r.client,
    month: r.month,
    hours: r.allowance / 60,
    feeUsd: r.fee / 100,
    rateUsd: r.rate / 100,
  }),
  record(v, old, rows) {
    requiredText(v.client, 'a client');
    demand(validDate(v.month + '-01'), 'Choose a valid service month.');
    demand(
      !rows.some(
        (r) => r.id !== old?.id && r.client.toLowerCase() === v.client.toLowerCase() && r.month === v.month,
      ),
      'This client already has a retainer for that month.',
    );
    demand(
      !old?.entries.length || v.month === old.month,
      'Remove time entries before moving the service month.',
    );
    const allowance = Math.round(v.hours * 60),
      fee = cents(v.feeUsd),
      rate = cents(v.rateUsd);
    demand(
      whole(allowance) && allowance > 0 && whole(fee) && whole(rate),
      'Enter a positive allowance and valid fees.',
    );
    return {
      id: old?.id ?? uid(),
      client: v.client,
      month: v.month,
      allowance,
      fee,
      rate,
      entries: old?.entries ?? [],
    };
  },
  metrics: (rows) => {
    const current = rows.filter((r) => r.month === month());
    return [
      ['This month · tracked', hours(current.reduce((n, r) => n + usage(r).used, 0))],
      ['This month · overage', money(current.reduce((n, r) => n + usage(r).extraFee, 0))],
      ['This month · estimated fees', money(current.reduce((n, r) => n + usage(r).estimate, 0))],
    ];
  },
  columns: ['Client', 'Month', 'Tracked / included', 'Status', 'Estimated fee'],
  values: (r) => [
    r.client,
    r.month,
    hours(usage(r).used) + ' / ' + hours(r.allowance),
    status(r),
    money(usage(r).estimate),
  ],
  sort: (a, b) => b.month.localeCompare(a.month) || a.client.localeCompare(b.client),
  detail: (r) => [
    'Base fee ' + money(r.fee) + ' · Overage rate ' + money(r.rate) + '/h',
    ...r.entries.map((e) => e.date + ' · ' + e.task + ' · ' + hours(e.minutes)),
  ],
  actions(r, api) {
    const actions = [
      {
        label: 'Log time',
        run: () =>
          api.form(
            'Log billable work',
            [
              dateField('date', 'Work date'),
              textField('task', 'Description'),
              decimalField('minutes', 'Minutes', { min: 1, max: 1440, step: 1 }),
            ],
            { date: r.month === month() ? day() : r.month + '-01', minutes: 60 },
            logTime,
          ),
      },
    ];
    if (r.entries.length)
      actions.push({
        label: 'Remove last time entry',
        run: () =>
          api.form(
            'Remove “' + r.entries.at(-1).task + '”?',
            [],
            {},
            (row) => ({ ...row, entries: row.entries.slice(0, -1) }),
            'Remove entry',
          ),
      });
    return actions;
  },
  export: (rows) => [
    ['Client', 'Service month', 'Entry type', 'Date', 'Description', 'Minutes', 'USD'],
    ...rows.flatMap((r) => [
      [r.client, r.month, 'Base fee', '', '', r.allowance, r.fee / 100],
      ...r.entries.map((e) => [r.client, r.month, 'Time', e.date, e.task, e.minutes, '']),
      [r.client, r.month, 'Overage', '', '', usage(r).excess, usage(r).extraFee / 100],
    ]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
