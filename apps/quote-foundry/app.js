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
const esc = (s) =>
  String(s).replace(/[<>&"']/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]);

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
export function convertCurrency(centsAmount, rate) {
  demand(whole(centsAmount) && Number.isFinite(rate) && rate > 0, 'Provide nonnegative cents and a positive exchange rate.');
  return Math.round(centsAmount * rate);
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
export function quoteHTML(r) {
  const t = totals(r);
  const rows = r.lines
    .map(
      (l) =>
        `<tr><td>${esc(l.description)}</td><td>${l.quantity}</td><td>${money(l.unitCents)}</td><td>${money(l.unitCents * l.quantity)}</td></tr>`,
    )
    .join('');
  return `<!doctype html><html lang="en"><meta charset="utf-8"><title>${esc(r.title)} · Quotation</title><style>body{font:15px/1.5 system-ui,sans-serif;color:#1e2620;max-width:740px;margin:40px auto;padding:0 20px}header{display:flex;justify-content:space-between;border-bottom:2px solid #253c32;padding-bottom:16px;margin-bottom:24px}h1{margin:0;font-size:24px}table{width:100%;border-collapse:collapse;margin:20px 0}th,td{padding:9px;border-bottom:1px solid #d4d8cf;text-align:left}th:last-child,td:last-child{text-align:right}.totals{margin-left:auto;width:280px}.totals div{display:flex;justify-content:space-between;padding:4px 0}.grand{font-weight:700;font-size:18px;border-top:2px solid #253c32;margin-top:6px;padding-top:8px}.sig{margin-top:42px;display:grid;grid-template-columns:1fr 1fr;gap:32px}.sig div{border-top:1px solid #8a9488;padding-top:6px;font-size:13px;color:#556058}@media print{body{margin:16px}}</style><header><div><small>QUOTATION · ${esc(r.stage.toUpperCase())}</small><h1>${esc(r.title)}</h1><p>Prepared for <strong>${esc(r.client)}</strong></p></div><div><p>Valid through<br><strong>${esc(r.validUntil)}</strong></p></div></header><table><thead><tr><th>Item</th><th>Qty</th><th>Unit price</th><th>Line total</th></tr></thead><tbody>${rows}</tbody></table><div class="totals"><div><span>Subtotal</span><span>${money(t.subtotal)}</span></div><div><span>Discount (${r.discount}%)</span><span>−${money(t.savings)}</span></div><div><span>Tax (${r.tax}%)</span><span>${money(t.taxDue)}</span></div><div class="grand"><span>Total (USD)</span><span>${money(t.total)}</span></div></div><p><strong>Terms:</strong> ${esc(r.terms || 'Net 30 days.')}</p><div class="sig"><div>Client acceptance signature</div><div>Date</div></div></html>`;
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
      label: 'Download quote (.txt)',
      run: () => api.download('quotation-' + r.id + '.txt', quoteText(r), 'text/plain;charset=utf-8'),
    },
    {
      label: 'Download HTML proposal',
      run: () => api.download('proposal-' + r.id + '.html', quoteHTML(r), 'text/html;charset=utf-8'),
    },
    ...(r.stage !== 'Accepted'
      ? [
          {
            label: 'Mark Accepted',
            run: () => {
              api.update({ ...r, stage: 'Accepted' });
              api.notify('Quote marked Accepted.');
            },
          },
        ]
      : []),
    {
      label: 'Clone quote',
      run: () => {
        api.insert({
          ...structuredClone(r),
          id: uid(),
          title: r.title + ' (Copy)',
          stage: 'Draft',
          validUntil: day(30),
        });
        api.notify('Cloned quote as Draft.');
      },
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
