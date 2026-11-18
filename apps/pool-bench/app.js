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
import { maxSwapForSlippage, replay } from './model.js';

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
          { side: 'A', amount: '45' },
        ]),
        hint: 'Side identifies the input asset. Enter amounts as decimal strings, with up to six places.',
      },
    ],
    calculate: (s) => {
      const report = replay(s.a, s.b, s.fee, rowsOf(s.trades, 1000));
      const depth = [0.5, 1, 2, 5].map((pct) => {
        const capA = maxSwapForSlippage(report.closeA, report.closeB, report.feeBps, pct);
        const capB = maxSwapForSlippage(report.closeB, report.closeA, report.feeBps, pct);
        return { pct, maxA: capA.maxInput, outB: capA.expectedOutput, maxB: capB.maxInput, outA: capB.expectedOutput };
      });
      return { ...report, depth };
    },
    render: (r, context) => [
      metrics([
        ['Closing A reserve', r.closeA],
        ['Closing B reserve', r.closeB],
        ['Impermanent loss', r.lpReport.ilPct.toFixed(2) + '%'],
        ['LP vs HODL net', (r.lpReport.netVsHodlPct >= 0 ? '+' : '') + r.lpReport.netVsHodlPct.toFixed(2) + '%'],
        ['Fees (A / B)', r.feesCollectedA + ' / ' + r.feesCollectedB],
      ]),
      lineChart('A reserve after each swap', [
        { label: 'Opening', value: Number(r.openA) },
        ...r.trades.map((t) => ({ label: 'Swap ' + t.trade, value: Number(t.reserveA) })),
      ]),
      lineChart('Spot price (B per A) after each swap', [
        { label: 'Opening', value: Number(r.openB) / Number(r.openA) },
        ...r.trades.map((t) => ({ label: 'Swap ' + t.trade, value: Number(t.spotBPerA) })),
      ]),
      gridTable(
        ['Trade', 'Input', 'Output', 'Fee', 'Shortfall¹'],
        r.trades
          .slice(0, 40)
          .map((t) => [
            t.trade,
            t.input + ' ' + t.side,
            t.output + ' ' + (t.side === 'A' ? 'B' : 'A'),
            t.feePaid + ' ' + t.side,
            t.shortfallPct + '%',
          ]),
      ),
      el(
        'p',
        { className: 'muted' },
        '¹ Against the spot price immediately before each swap, including the fee. Showing up to 40 swaps.',
      ),
      el('h4', {}, 'Closing slippage depth sizing'),
      gridTable(
        ['Max shortfall', 'Max A input → B out', 'Max B input → A out'],
        r.depth.map((d) => [d.pct + '%', d.maxA + ' A → ' + d.outB + ' B', d.maxB + ' B → ' + d.outA + ' A']),
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
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'pool-bench-swaps.csv',
          ['Trade', 'Side', 'Input', 'Output', 'Fee', 'Shortfall %', 'Reserve A', 'Reserve B'],
          r.trades.map((t) => [
            t.trade,
            t.side,
            t.input,
            t.output,
            t.feePaid,
            t.shortfallPct,
            t.reserveA,
            t.reserveB,
          ]),
          'Download swaps CSV',
        ),
        jsonExport(context, 'pool-bench.json', r),
      ),
    ],
  });
}
