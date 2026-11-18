import {
  mountWorkbench,
  comparison,
  money,
  cents,
  whole,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  selectField,
} from '../../shared/business.js';

const kinds = ['Cash Reserve', 'Revenue', 'Expense'];
const categories = ['Bank Cash', 'Subscriptions', 'Services', 'Payroll', 'Infrastructure', 'Operations'];

export function forecastRunway(rows, defaultCashCents = 50000000, months = 18) {
  const reserveRows = rows.filter((r) => r.kind === 'Cash Reserve');
  const startingCashCents = reserveRows.length
    ? reserveRows.reduce((n, r) => n + r.monthlyCents, 0)
    : defaultCashCents;
  const streams = rows.filter((r) => r.kind !== 'Cash Reserve');

  let cash = startingCashCents;
  let runwayMonths = null;
  let breakEvenMonth = null;
  const timeline = [];

  for (let m = 1; m <= months; m++) {
    let revCents = 0;
    let expCents = 0;
    for (const s of streams) {
      if (m < s.startMonth || (s.endMonth > 0 && m > s.endMonth)) continue;
      const age = m - s.startMonth;
      const val = Math.round(s.monthlyCents * (1 + s.growthPct / 100) ** age);
      if (s.kind === 'Revenue') revCents += val;
      else expCents += val;
    }
    const netCents = revCents - expCents;
    const prevCash = cash;
    cash += netCents;
    if (runwayMonths === null && cash < 0) {
      const burn = prevCash - cash;
      runwayMonths = burn > 0 ? Number(((m - 1) + prevCash / burn).toFixed(1)) : m - 1;
    }
    if (breakEvenMonth === null && netCents >= 0 && revCents > 0) {
      breakEvenMonth = m;
    }
    timeline.push({ month: m, revCents, expCents, netCents, cashCents: cash });
  }

  const defaultAlive = runwayMonths === null && (timeline.at(-1)?.netCents >= 0 || cash > 0);
  const month1NetBurnCents = timeline[0] ? Math.max(0, timeline[0].expCents - timeline[0].revCents) : 0;

  return {
    startingCashCents,
    endingCashCents: cash,
    month1NetBurnCents,
    runwayMonths: runwayMonths === null ? '18+ (Default Alive)' : runwayMonths,
    breakEvenMonth,
    defaultAlive,
    timeline,
  };
}

const blank = () => ({
  name: '',
  kind: 'Expense',
  category: 'Operations',
  monthlyUsd: 1000,
  growthPct: 0,
  startMonth: 1,
  endMonth: 0,
});

const seed = () => [
  {
    id: 'rw0',
    name: 'Operating Bank Account',
    kind: 'Cash Reserve',
    category: 'Bank Cash',
    monthlyCents: 42000000,
    growthPct: 0,
    startMonth: 1,
    endMonth: 0,
  },
  {
    id: 'rw1',
    name: 'SaaS MRR',
    kind: 'Revenue',
    category: 'Subscriptions',
    monthlyCents: 1800000,
    growthPct: 8,
    startMonth: 1,
    endMonth: 0,
  },
  {
    id: 'rw2',
    name: 'Core Engineering Payroll',
    kind: 'Expense',
    category: 'Payroll',
    monthlyCents: 3400000,
    growthPct: 1,
    startMonth: 1,
    endMonth: 0,
  },
  {
    id: 'rw3',
    name: 'Cloud & Inference',
    kind: 'Expense',
    category: 'Infrastructure',
    monthlyCents: 450000,
    growthPct: 4,
    startMonth: 1,
    endMonth: 0,
  },
];

const config = {
  overview(rows, open, filter) {
    const fc = forecastRunway(rows);
    const maxCash = Math.max(1, fc.startingCashCents, ...fc.timeline.map((t) => Math.max(0, t.cashCents)));
    return comparison(
      '18-month projected cash trajectory',
      fc.timeline.filter((t) => t.month % 3 === 0 || t.month === 1).map((t) => ({
        label: 'Month ' + t.month,
        note:
          'Rev ' +
          money(t.revCents) +
          ' − Exp ' +
          money(t.expCents) +
          ' (Net ' +
          (t.netCents >= 0 ? '+' : '') +
          money(t.netCents) +
          ')',
        value: money(t.cashCents),
        fraction: Math.max(0, t.cashCents) / maxCash,
        color: t.cashCents <= 0 ? '#9c4941' : t.netCents >= 0 ? '#38765b' : '#bc934b',
        run: () => filter('All'),
      })),
      'Add cash reserves and revenue/expense streams.',
    );
  },
  id: 'runway-planner',
  singular: 'line item',
  plural: 'line items',
  heading: 'Cash, revenue & burn drivers',
  blank,
  seed,
  groups: kinds,
  group: (r) => r.kind,
  title: (r) => r.name,
  fields: [
    textField('name', 'Driver or account name'),
    selectField('kind', 'Type', kinds),
    selectField('category', 'Category', categories),
    decimalField('monthlyUsd', 'Monthly amount or cash balance (USD)', { min: 0.01 }),
    decimalField('growthPct', 'Monthly growth rate (%)', { min: -50, max: 200, step: 0.5 }),
    decimalField('startMonth', 'Starts in month (1–18)', { min: 1, max: 18, step: 1 }),
    decimalField('endMonth', 'Ends in month (0 = ongoing)', { min: 0, max: 18, step: 1 }),
  ],
  form: (r) => ({ ...r, monthlyUsd: r.monthlyCents / 100 }),
  record(v, old) {
    requiredText(v.name, 'a driver name');
    demand(kinds.includes(v.kind) && categories.includes(v.category), 'Choose valid type and category.');
    const monthlyCents = cents(v.monthlyUsd);
    const startMonth = Math.round(v.startMonth);
    const endMonth = Math.round(v.endMonth);
    demand(whole(monthlyCents) && monthlyCents > 0, 'Amount must be positive.');
    demand(
      startMonth >= 1 && startMonth <= 18 && (endMonth === 0 || (endMonth >= startMonth && endMonth <= 18)),
      'Check start and end months (1–18, or 0 for ongoing).',
    );
    return {
      id: old?.id ?? uid(),
      name: v.name,
      kind: v.kind,
      category: v.category,
      monthlyCents,
      growthPct: Number(v.growthPct) || 0,
      startMonth,
      endMonth,
    };
  },
  metrics: (rows) => {
    const fc = forecastRunway(rows);
    return [
      ['Starting cash', money(fc.startingCashCents)],
      ['Month 1 net burn', money(fc.month1NetBurnCents)],
      ['Runway', typeof fc.runwayMonths === 'number' ? fc.runwayMonths + ' months' : fc.runwayMonths],
      ['Break-even month', fc.breakEvenMonth ? 'Month ' + fc.breakEvenMonth : 'Beyond 18m'],
    ];
  },
  columns: ['Driver', 'Type', 'Category', 'Amount (USD)', 'MoM Growth'],
  values: (r) => [
    r.name,
    r.kind,
    r.category,
    money(r.monthlyCents),
    r.kind === 'Cash Reserve' ? '—' : (r.growthPct >= 0 ? '+' : '') + r.growthPct + '%',
  ],
  detail: (r) => [
    r.kind === 'Cash Reserve'
      ? 'Opening cash balance ' + money(r.monthlyCents)
      : 'Active months: M' + r.startMonth + (r.endMonth ? ' → M' + r.endMonth : '+ (ongoing)'),
  ],
  export: (rows) => {
    const fc = forecastRunway(rows);
    return [
      ['Month', 'RevenueUSD', 'ExpensesUSD', 'NetCashFlowUSD', 'EndingCashUSD'],
      ...fc.timeline.map((t) => [
        t.month,
        t.revCents / 100,
        t.expCents / 100,
        t.netCents / 100,
        t.cashCents / 100,
      ]),
    ];
  },
};
export const mount = (root, context) => mountWorkbench(root, context, config);
