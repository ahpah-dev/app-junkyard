import {
  mountWorkbench,
  agenda,
  daysBetween,
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
  selectField,
} from '../../shared/business.js';

const stages = ['Draft', 'Sent', 'Accepted', 'Declined'];
export function quoteTotals(lines, discount, tax) {
  demand(Array.isArray(lines) && lines.length > 0, 'Add at least one line item.');
  demand(
    [discount, tax].every((v) => Number.isFinite(v) && v >= 0 && v <= 100),
    'Rates must be between 0 and 100%.',
  );
  let subtotal = 0;
  for (const line of lines) {
    requiredText(line.description, 'a line description');
    demand(
      Number.isInteger(line.quantity) && line.quantity > 0 && whole(line.unitCents),
      'Each item needs a positive whole quantity and a nonnegative price.',
    );
    subtotal += line.quantity * line.unitCents;
  }
  demand(Number.isSafeInteger(subtotal) && subtotal <= 1e14, 'Quote total exceeds the supported range.');
  const savings = Math.round((subtotal * discount) / 100);
  const taxable = subtotal - savings;
  const taxDue = Math.round((taxable * tax) / 100);
  return { subtotal, savings, taxDue, total: taxable + taxDue };
}
const totals = (r) => quoteTotals(r.lines, r.discount, r.tax);
const itemString = (l) =>
  l.description + ' · ' + l.quantity + ' × ' + money(l.unitCents) + ' = ' + money(l.unitCents * l.quantity);
function quoteText(r) {
  const t = totals(r);
  return [
    'QUOTATION',
    r.title,
    'Prepared for ' + r.client,
    'Valid through ' + r.validUntil,
    '',
    ...r.lines.map(itemString),
    '',
    'Subtotal    ' + money(t.subtotal),
    'Discount    ' + money(t.savings),
    'Tax         ' + money(t.taxDue),
    'Total (USD) ' + money(t.total),
    '',
    r.terms,
  ].join('\n');
}
const blank = () => ({
  title: '',
  client: '',
  validUntil: day(30),
  stage: 'Draft',
  lines: [{ description: '', quantity: 1, rate: 0 }],
  discount: 0,
  tax: 0,
  terms: 'Payment due within 30 days of invoice.',
});
const seed = () => [
  {
    id: 'q1',
    title: 'Identity system',
    client: 'Mica Studio',
    validUntil: day(21),
    stage: 'Sent',
    discount: 5,
    tax: 0,
    terms: 'Includes two revision rounds.',
    lines: [
      { description: 'Design day', quantity: 4, unitCents: 65000 },
      { description: 'Brand guide', quantity: 1, unitCents: 42000 },
    ],
  },
  {
    id: 'q2',
    title: 'Spring storefront',
    client: 'Linden Supply',
    validUntil: day(10),
    stage: 'Draft',
    discount: 0,
    tax: 8.5,
    terms: 'Delivery in two phases.',
    lines: [{ description: 'Implementation day', quantity: 6, unitCents: 70000 }],
  },
];
const config = {
  overview(rows, open) {
    const pending = rows
      .filter((r) => ['Draft', 'Sent'].includes(r.stage))
      .sort((a, b) => a.validUntil.localeCompare(b.validUntil));
    return agenda(
      'Decision deadlines',
      pending.map((r) => {
        const days = daysBetween(day(), r.validUntil);
        return {
          label: r.title,
          note: r.client + ' · ' + r.stage + ' · Valid through ' + r.validUntil,
          when: days < 0 ? 'Expired' : days === 0 ? 'Today' : 'In ' + days + ' days',
          tone: days < 0 ? '#f5d7c5' : '#ede1bc',
          value: money(totals(r).total),
          run: () => open(r),
        };
      }),
      'There are no draft or sent quotes awaiting a decision.',
    );
  },
  id: 'quote-foundry',
  singular: 'quote',
  plural: 'quotes',
  heading: 'Quote register',
  groups: stages,
  group: (r) => r.stage,
  title: (r) => r.title,
  blank,
  seed,
  fields: [
    textField('title', 'Project'),
    textField('client', 'Client'),
    dateField('validUntil', 'Valid through'),
    selectField('stage', 'Status', stages),
    {
      key: 'lines',
      label: 'Quote lines',
      type: 'lines',
      columns: [
        textField('description', 'Service or item'),
        decimalField('quantity', 'Quantity', { step: 1, min: 1, max: 100000, initial: 1 }),
        decimalField('rate', 'Unit price (USD)', { initial: 0 }),
      ],
    },
    decimalField('discount', 'Discount (%)', { max: 100 }),
    decimalField('tax', 'Tax after discount (%)', { max: 100 }),
    textField('terms', 'Terms', { type: 'textarea', optional: true }),
  ],
  form: (r) => ({ ...r, lines: r.lines.map((l) => ({ ...l, rate: l.unitCents / 100 })) }),
  record(v, old) {
    requiredText(v.client, 'a client name');
    requiredText(v.title, 'a project name');
    demand(validDate(v.validUntil), 'Choose a valid expiry date.');
    const lines = v.lines.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitCents: cents(l.rate),
    }));
    quoteTotals(lines, v.discount, v.tax);
    return { ...v, id: old?.id ?? uid(), lines };
  },
  metrics: (rows) => [
    [
      'Open pipeline',
      money(
        rows
          .filter((r) => ['Draft', 'Sent'].includes(r.stage) && r.validUntil >= day())
          .reduce((n, r) => n + totals(r).total, 0),
      ),
    ],
    [
      'Accepted value',
      money(rows.filter((r) => r.stage === 'Accepted').reduce((n, r) => n + totals(r).total, 0)),
    ],
    ['Quotes', rows.length],
  ],
  columns: ['Project', 'Client', 'Status', 'Valid through', 'Total'],
  values: (r) => [r.title, r.client, r.stage, r.validUntil, money(totals(r).total)],
  detail: (r) =>
    [...r.lines.map(itemString), 'Discount ' + r.discount + '% · Tax ' + r.tax + '%', r.terms].filter(
      Boolean,
    ),
  actions: (r, api) => [
    {
      label: 'Download quote',
      run: () => api.download('quotation-' + r.id + '.txt', quoteText(r), 'text/plain;charset=utf-8'),
    },
  ],
  export: (rows) => [
    [
      'Project',
      'Client',
      'Status',
      'Valid through',
      'Line item',
      'Quantity',
      'Unit price USD',
      'Discount percent',
      'Tax percent',
      'Quote total USD',
    ],
    ...rows.flatMap((r) =>
      r.lines.map((l) => [
        r.title,
        r.client,
        r.stage,
        r.validUntil,
        l.description,
        l.quantity,
        l.unitCents / 100,
        r.discount,
        r.tax,
        totals(r).total / 100,
      ]),
    ),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
