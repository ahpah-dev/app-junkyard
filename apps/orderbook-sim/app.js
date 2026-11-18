import { el } from '../../shared/ui.js';
import {
  csvExport,
  gridTable,
  jsonExport,
  jsonLines,
  lab,
  lineChart,
  metrics,
  rowsOf,
} from '../../shared/lab.js';
import { simulateBook } from './model.js';

const sampleOrders = jsonLines([
  { id: 'O1', side: 'sell', type: 'limit', price: '101.50', amount: '12' },
  { id: 'O2', side: 'sell', type: 'limit', price: '102.00', amount: '20' },
  { id: 'O3', side: 'sell', type: 'limit', price: '103.25', amount: '15' },
  { id: 'O4', side: 'buy', type: 'limit', price: '100.50', amount: '18' },
  { id: 'O5', side: 'buy', type: 'limit', price: '99.75', amount: '25' },
  { id: 'O6', side: 'buy', type: 'limit', price: '101.75', amount: '16' },
  { id: 'O7', side: 'sell', type: 'market', amount: '10' },
  { id: 'O8', type: 'cancel', targetId: 'O3' },
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Order stream & fee model',
    output: 'Matching engine & book depth',
    action: 'Simulate order book',
    fields: [
      {
        key: 'orders',
        label: 'Ordered events · JSONL',
        rows: 8,
        value: sampleOrders,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use id, side (buy|sell), type (limit|market|cancel), price, amount (or targetId for cancel).',
      },
      {
        key: 'feeBps',
        label: 'Taker fee (basis points)',
        type: 'number',
        value: '10',
        attrs: { min: 0, max: 1000, step: 1 },
      },
    ],
    calculate: (s) => simulateBook(rowsOf(s.orders), s.feeBps),
    render: (r, context) => [
      metrics([
        ['Executed fills', r.fills.length],
        ['Best bid / ask', r.bestBid + ' / ' + r.bestAsk],
        ['Spread', r.spread],
        ['VWAP', r.vwap],
        ['Total fees', r.totalFees],
      ]),
      ...(r.fills.length
        ? [
            lineChart(
              'Trade execution price history',
              r.fills.map((f) => ({ label: 'Trade ' + f.trade, value: Number(f.price) })),
            ),
            el('h4', {}, 'Executed trades'),
            gridTable(
              ['Trade', 'Maker', 'Taker', 'Side', 'Price', 'Amount', 'Fee'],
              r.fills.map((f) => [f.trade, f.makerId, f.takerId, f.takerSide, f.price, f.amount, f.takerFee]),
            ),
          ]
        : [el('p', { className: 'muted' }, 'No crossing orders executed.')]),
      el('h4', {}, 'Resting asks (lowest first)'),
      r.asks.length
        ? gridTable(
            ['Price', 'Size', 'Cumulative'],
            r.asks.map((l) => [l.price, l.size, l.cumulative]),
          )
        : el('p', { className: 'muted' }, 'Ask side is empty.'),
      el('h4', {}, 'Resting bids (highest first)'),
      r.bids.length
        ? gridTable(
            ['Price', 'Size', 'Cumulative'],
            r.bids.map((l) => [l.price, l.size, l.cumulative]),
          )
        : el('p', { className: 'muted' }, 'Bid side is empty.'),
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'orderbook-fills.csv',
          ['Trade', 'Maker', 'Taker', 'Side', 'Price', 'Amount', 'QuoteValue', 'TakerFee'],
          r.fills.map((f) => [f.trade, f.makerId, f.takerId, f.takerSide, f.price, f.amount, f.quoteValue, f.takerFee]),
          'Download fills CSV',
        ),
        jsonExport(context, 'orderbook-sim.json', r),
      ),
    ],
  });
}
