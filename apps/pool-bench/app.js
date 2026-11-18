import { el } from '../../shared/ui.js';
import { gridTable, jsonExport, jsonLines, lab, lineChart, metrics, rowsOf } from '../../shared/lab.js';
import { replay } from './model.js';

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Pool and order flow',
    output: 'Execution report',
    action: 'Replay swaps',
    fields: [
      { key: 'a', label: 'Opening reserve · asset A', value: '1000' },
      { key: 'b', label: 'Opening reserve · asset B', value: '250000' },
      {
        key: 'fee',
        label: 'Swap fee (basis points)',
        type: 'number',
        value: '30',
        attrs: { min: 0, max: 9999, step: 1 },
      },
      {
        key: 'trades',
        label: 'Ordered swaps · JSONL',
        rows: 5,
        import: '.jsonl,.ndjson,.txt',
        value: jsonLines([
          { side: 'A', amount: '12' },
          { side: 'A', amount: '60' },
          { side: 'B', amount: '7200' },
        ]),
        hint: 'Side identifies the input asset. Enter amounts as decimal strings, with up to six places.',
      },
    ],
    calculate: (s) => replay(s.a, s.b, s.fee, rowsOf(s.trades, 1000)),
    render: (r, context) => [
      metrics([
        ['Closing A reserve', r.closeA],
        ['Closing B reserve', r.closeB],
      ]),
      lineChart('A reserve after each swap', [
        { label: 'Opening', value: Number(r.openA) },
        ...r.trades.map((t) => ({ label: 'Swap ' + t.trade, value: Number(t.reserveA) })),
      ]),
      gridTable(
        ['Trade', 'Input', 'Output', 'Shortfall¹'],
        r.trades
          .slice(0, 40)
          .map((t) => [
            t.trade,
            t.input + ' ' + t.side,
            t.output + ' ' + (t.side === 'A' ? 'B' : 'A'),
            t.shortfallPct + '%',
          ]),
      ),
      el(
        'p',
        { className: 'muted' },
        '¹ Against the spot price immediately before each swap, including the fee. Showing up to 40 swaps.',
      ),
      el(
        'details',
        {},
        el('summary', {}, 'Execution price and pool history'),
        gridTable(
          ['Trade', 'Spot (out/in)', 'Fill (out/in)', 'Reserve A', 'Reserve B'],
          r.trades
            .slice(0, 40)
            .map((t) => [t.trade, t.pretradePrice, t.averagePrice, t.reserveA, t.reserveB]),
        ),
      ),
      jsonExport(context, 'pool-bench.json', r),
    ],
  });
}
