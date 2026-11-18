import {
  mountWorkbench,
  comparison,
  money,
  cents,
  whole,
  day,
  validDate,
  daysBetween,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  dateField,
} from '../../shared/business.js';

export const balance = (r) => r.amount - r.payments.reduce((n, p) => n + p.cents, 0);
export function aging(r, today = day()) {
  if (!balance(r)) return 'Paid';
  const age = daysBetween(r.due, today);
  if (age <= 0) return 'Current';
  if (age <= 30) return '1–30 days late';
  if (age <= 60) return '31–60 days late';
  return '61+ days late';
}
export function postPayment(invoice, payment, today = day()) {
  demand(
    validDate(payment.date) && payment.date >= invoice.issued && payment.date <= today,
    'Choose a payment date from issue through today.',
  );
  demand(
    whole(payment.cents) && payment.cents > 0 && payment.cents <= balance(invoice),
    'Enter a positive amount within the outstanding balance.',
  );
  return { ...invoice, payments: [...invoice.payments, payment] };
}
export function lateFee(invoice, annualRatePct = 18, today = day()) {
  demand(Number.isFinite(annualRatePct) && annualRatePct >= 0 && annualRatePct <= 100, 'Enter a rate between 0 and 100%.');
  const open = balance(invoice);
  if (open <= 0) return 0;
  const daysLate = Math.max(0, daysBetween(invoice.due, today));
  return Math.round((open * (annualRatePct / 100) * daysLate) / 365);
}
export function portfolioHealth(rows, today = day()) {
  const billed = rows.reduce((n, r) => n + r.amount, 0);
  const outstanding = rows.reduce((n, r) => n + balance(r), 0);
  const collected = billed - outstanding;
  const overdue = rows.filter((r) => r.due < today).reduce((n, r) => n + balance(r), 0);
  const collectionRatePct = billed > 0 ? Math.round((collected * 100) / billed) : 0;
  let weightedSum = 0;
  for (const r of rows) {
    const open = balance(r);
    if (open > 0) weightedSum += open * Math.max(0, daysBetween(r.due, today));
  }
  const weightedPastDueDays = outstanding > 0 ? Math.round(weightedSum / outstanding) : 0;
  return { billed, outstanding, overdue, collected, collectionRatePct, weightedPastDueDays };
}
export function customerStatement(invoice, today = day()) {
  const open = balance(invoice);
  const fee = lateFee(invoice, 18, today);
  return [
    'ACCOUNT STATEMENT',
    'Invoice: ' + invoice.reference,
    'Customer: ' + invoice.client,
    'Statement date: ' + today,
    'Issued: ' + invoice.issued + ' · Due: ' + invoice.due,
    'Status: ' + aging(invoice, today),
    '',
    'Original amount: ' + money(invoice.amount),
    ...invoice.payments.map(
      (p) => 'Payment (' + p.date + '): -' + money(p.cents) + (p.note ? ' [' + p.note + ']' : ''),
    ),
    '',
    'Open balance: ' + money(open),
    'Est. late interest (18% APR): ' + money(fee),
    'Total with late fee: ' + money(open + fee),
  ].join('\n');
}

const groups = ['Current', '1–30 days late', '31–60 days late', '61+ days late', 'Paid'];
const blank = () => ({ reference: '', client: '', issued: day(), due: day(30), value: 0 });
const seed = () => [
  {
    id: 'i1',
    reference: 'INV-1001',
    client: 'June Works',
    issued: day(-45),
    due: day(-15),
    amount: 180000,
    payments: [{ id: 'p1', date: day(-22), cents: 60000, note: 'Bank transfer' }],
  },
  {
    id: 'i2',
    reference: 'INV-1002',
    client: 'Field Notes Co.',
    issued: day(-6),
    due: day(24),
    amount: 95000,
    payments: [],
  },
  {
    id: 'i3',
    reference: 'INV-1003',
    client: 'Mica Studio',
    issued: day(-36),
    due: day(-6),
    amount: 40000,
    payments: [{ id: 'p2', date: day(-8), cents: 40000, note: 'ACH' }],
  },
];
const config = {
  overview(rows, open, filter) {
    const amounts = groups
      .filter((s) => s !== 'Paid')
      .map((label) => {
        const group = rows.filter((r) => aging(r) === label);
        return { label, count: group.length, total: group.reduce((n, r) => n + balance(r), 0) };
      });
    const maximum = Math.max(1, ...amounts.map((g) => g.total));
    return comparison(
      'Outstanding balance by age',
      amounts.map((g, i) => ({
        label: g.label,
        note: g.count + (g.count === 1 ? ' invoice' : ' invoices'),
        value: money(g.total),
        fraction: g.total / maximum,
        color: ['#567863', '#bc934b', '#ba693d', '#9c4941'][i],
        run: () => filter(g.label),
      })),
      'No open invoices.',
    );
  },
  id: 'receivables-desk',
  singular: 'invoice',
  plural: 'invoices',
  heading: 'Receivables ledger',
  blank,
  seed,
  groups,
  group: (r) => aging(r),
  title: (r) => r.reference,
  fields: [
    textField('reference', 'Invoice number'),
    textField('client', 'Customer'),
    dateField('issued', 'Issued'),
    dateField('due', 'Due'),
    decimalField('value', 'Invoice total (USD)', { min: 0.01 }),
  ],
  form: (r) => ({ ...r, value: r.amount / 100 }),
  record(v, old, rows) {
    requiredText(v.reference, 'an invoice number');
    requiredText(v.client, 'a customer');
    demand(
      !rows.some((r) => r.id !== old?.id && r.reference.toLowerCase() === v.reference.toLowerCase()),
      'That invoice number already exists.',
    );
    demand(
      validDate(v.issued) && validDate(v.due) && v.issued <= v.due,
      'Due date must be on or after issue.',
    );
    demand(
      (old?.payments ?? []).every((p) => p.date >= v.issued),
      'Issue date cannot follow a recorded payment.',
    );
    const updated = {
      id: old?.id ?? uid(),
      reference: v.reference,
      client: v.client,
      issued: v.issued,
      due: v.due,
      amount: cents(v.value),
      payments: old?.payments ?? [],
    };
    demand(
      whole(updated.amount) && updated.amount > 0 && balance(updated) >= 0,
      'Total must be positive and cover any payments.',
    );
    return updated;
  },
  metrics: (rows) => {
    const h = portfolioHealth(rows);
    return [
      ['Outstanding', money(h.outstanding)],
      ['Overdue', money(h.overdue)],
      ['Collected', money(h.collected) + ' (' + h.collectionRatePct + '%)'],
      ['Weighted past due', h.weightedPastDueDays + ' days'],
    ];
  },
  columns: ['Invoice', 'Customer', 'Due', 'Aging', 'Open balance'],
  values: (r) => [r.reference, r.client, r.due, aging(r), money(balance(r))],
  sort: (a, b) => a.due.localeCompare(b.due),
  detail: (r) => [
    'Issued ' + r.issued + ' · Billed ' + money(r.amount) + ' · Est. late fee (18% APR) ' + money(lateFee(r)),
    ...r.payments.map((p) => p.date + ' · Payment ' + money(p.cents) + (p.note ? ' · ' + p.note : '')),
  ],
  actions(r, api) {
    const actions = [];
    if (balance(r) > 0)
      actions.push({
        label: 'Record payment',
        run: () =>
          api.form(
            'Record payment',
            [
              dateField('date', 'Payment date'),
              decimalField('value', 'Paid (USD)', { min: 0.01, max: balance(r) / 100 }),
              textField('note', 'Reference', { optional: true }),
            ],
            { date: day(), value: balance(r) / 100 },
            (row, v) => postPayment(row, { id: uid(), date: v.date, cents: cents(v.value), note: v.note }),
          ),
      });
    if (r.payments.length)
      actions.push({
        label: 'Reverse last entry',
        run: () => {
          const p = r.payments.at(-1);
          api.form(
            'Reverse ' + money(p.cents) + ' recorded for ' + p.date + '?',
            [],
            {},
            (row) => ({ ...row, payments: row.payments.slice(0, -1) }),
            'Reverse payment',
          );
        },
      });
    actions.push({
      label: 'Download statement',
      run: () =>
        api.download(
          'statement-' + r.reference.toLowerCase().replace(/[^a-z0-9-]+/g, '-') + '.txt',
          customerStatement(r),
          'text/plain;charset=utf-8',
        ),
    });
    return actions;
  },
  export: (rows) => [
    ['Invoice', 'Customer', 'Entry', 'Date', 'Due', 'Amount USD', 'Reference'],
    ...rows.flatMap((r) => [
      [r.reference, r.client, 'Invoice', r.issued, r.due, r.amount / 100, ''],
      ...r.payments.map((p) => [r.reference, r.client, 'Payment', p.date, r.due, p.cents / 100, p.note]),
    ]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
