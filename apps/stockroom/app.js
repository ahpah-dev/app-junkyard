import {
  mountWorkbench,
  comparison,
  day,
  uid,
  whole,
  demand,
  requiredText,
  textField,
  decimalField,
  selectField,
} from '../../shared/business.js';

const kinds = ['Issue stock', 'Place order', 'Receive order', 'Count stock'];
const integer = (key, label, extra = {}) => decimalField(key, label, { step: 1, max: 99999999, ...extra });
export function position(r) {
  const onHand = r.events.reduce((n, e) => n + e.stock, 0);
  const onOrder = r.events.reduce((n, e) => n + e.order, 0);
  const point = Math.ceil(r.daily * r.lead + r.safety);
  const target = point + Math.ceil(r.daily * r.review);
  const need = onHand + onOrder <= point ? Math.max(0, target - onHand - onOrder) : 0;
  return { onHand, onOrder, point, target, suggested: Math.ceil(need / r.pack) * r.pack };
}
export function transact(r, kind, quantity, note, today = day()) {
  const p = position(r);
  demand(
    kinds.includes(kind) && whole(quantity) && (kind === 'Count stock' || quantity > 0),
    'Enter a valid whole-unit quantity.',
  );
  if (kind === 'Issue stock') demand(quantity <= p.onHand, 'Issue cannot exceed stock on hand.');
  if (kind === 'Receive order') demand(quantity <= p.onOrder, 'Receipt exceeds the open purchase quantity.');
  const effects = {
    'Issue stock': [-quantity, 0],
    'Place order': [0, quantity],
    'Receive order': [quantity, -quantity],
    'Count stock': [quantity - p.onHand, 0],
  };
  const [stock, order] = effects[kind];
  return { ...r, events: [...r.events, { date: today, kind, stock, order, note }] };
}
const status = (r) => {
  const p = position(r);
  return p.suggested > 0 ? 'Reorder' : p.onOrder > 0 ? 'On order' : 'Covered';
};
const blank = () => ({ sku: '', name: '', daily: 2, lead: 5, review: 7, safety: 3, pack: 1 });
const seed = () => [
  {
    id: 's1',
    sku: 'BX-032',
    name: 'Mailing sleeve',
    daily: 8,
    lead: 4,
    review: 7,
    safety: 12,
    pack: 25,
    events: [
      { date: day(-5), kind: 'Count stock', stock: 64, order: 0, note: 'Opening count' },
      { date: day(-1), kind: 'Issue stock', stock: -30, order: 0, note: 'Dispatch' },
    ],
  },
  {
    id: 's2',
    sku: 'LB-011',
    name: 'Label roll',
    daily: 1,
    lead: 6,
    review: 14,
    safety: 2,
    pack: 6,
    events: [
      { date: day(-4), kind: 'Count stock', stock: 8, order: 0, note: 'Opening count' },
      { date: day(-2), kind: 'Place order', stock: 0, order: 18, note: 'Order 101' },
    ],
  },
];
const config = {
  overview(rows, open) {
    const sorted = [...rows].sort(
      (a, b) => position(b).suggested - position(a).suggested || a.sku.localeCompare(b.sku),
    );
    return comparison(
      'Stock position against reorder point',
      sorted.map((r) => {
        const p = position(r),
          available = p.onHand + p.onOrder,
          maximum = Math.max(1, p.target, available);
        return {
          label: r.name,
          note: p.onHand + ' on hand + ' + p.onOrder + ' ordered · marker at ' + p.point,
          value: p.suggested ? 'Order ' + p.suggested : 'Covered',
          fraction: available / maximum,
          marker: p.point / maximum,
          color: p.suggested ? '#c0803e' : '#55755f',
          run: () => open(r),
        };
      }),
      'Add a stock item to see its replenishment position.',
    );
  },
  id: 'stockroom',
  singular: 'item',
  plural: 'items',
  heading: 'Supply register',
  blank,
  seed,
  groups: ['Reorder', 'On order', 'Covered'],
  group: status,
  title: (r) => r.sku + ' · ' + r.name,
  fields: [
    textField('sku', 'SKU'),
    textField('name', 'Item'),
    decimalField('daily', 'Average units used per day', { max: 100000 }),
    integer('lead', 'Supplier lead time (days)', { max: 365 }),
    integer('review', 'Replenishment coverage (days)', { min: 1, max: 730 }),
    integer('safety', 'Safety stock (units)'),
    integer('pack', 'Supplier pack size', { min: 1 }),
  ],
  form: (r) => r,
  record(v, old, rows) {
    requiredText(v.sku, 'a SKU');
    requiredText(v.name, 'an item name');
    demand(
      !rows.some((r) => r.id !== old?.id && r.sku.toLowerCase() === v.sku.toLowerCase()),
      'SKU already exists.',
    );
    demand(
      Number.isFinite(v.daily) &&
        v.daily >= 0 &&
        [v.lead, v.review, v.safety, v.pack].every(whole) &&
        v.pack > 0 &&
        v.review > 0,
      'Check demand, lead time, coverage and pack size.',
    );
    return { ...v, id: old?.id ?? uid(), events: old?.events ?? [] };
  },
  metrics: (rows) => [
    ['SKUs', rows.length],
    ['Need replenishment', rows.filter((r) => status(r) === 'Reorder').length],
    ['Units on order', rows.reduce((n, r) => n + position(r).onOrder, 0)],
  ],
  columns: ['SKU', 'Item', 'On hand', 'On order', 'Reorder point', 'Suggested order'],
  values: (r) => {
    const p = position(r);
    return [r.sku, r.name, p.onHand, p.onOrder, p.point, p.suggested];
  },
  sort: (a, b) => position(b).suggested - position(a).suggested || a.sku.localeCompare(b.sku),
  detail: (r) => [
    'Order-up-to target · ' + position(r).target + ' units. Supplier pack · ' + r.pack + ' units.',
    ...r.events.map(
      (e) =>
        e.date +
        ' · ' +
        e.kind +
        ' · Stock Δ ' +
        e.stock +
        ' · Open order Δ ' +
        e.order +
        (e.note ? ' · ' + e.note : ''),
    ),
  ],
  actions: (r, api) => [
    {
      label: 'Record movement',
      run: () => {
        const p = position(r);
        api.form(
          'Record inventory movement',
          [
            selectField('kind', 'Movement', kinds),
            integer('quantity', 'Units (physical total for counts)'),
            textField('note', 'Reference', { optional: true }),
          ],
          {
            kind: p.suggested ? 'Place order' : p.onOrder ? 'Receive order' : 'Count stock',
            quantity: p.suggested || p.onOrder || p.onHand,
          },
          (row, v) => transact(row, v.kind, v.quantity, v.note),
        );
      },
    },
  ],
  export: (rows) => [
    [
      'SKU',
      'Item',
      'Date',
      'Movement',
      'Stock change',
      'Open order change',
      'Note',
      'Reorder point',
      'Suggested units',
    ],
    ...rows.flatMap((r) => {
      const p = position(r);
      return [
        [r.sku, r.name, '', 'Planning', '', '', '', p.point, p.suggested],
        ...r.events.map((e) => [r.sku, r.name, e.date, e.kind, e.stock, e.order, e.note, '', '']),
      ];
    }),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
