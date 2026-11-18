import { el } from '../../shared/ui.js';
import {
  bars,
  button,
  gridTable,
  jsonExport,
  jsonLines,
  lab,
  metrics,
  rowsOf,
  units,
} from '../../shared/lab.js';
import { audit } from './model.js';

const journal = jsonLines([
  { id: 'E1', date: '2026-06-01', asset: 'DEMO', amount: '5000', to: 'Reserve' },
  { id: 'E2', date: '2026-06-07', asset: 'DEMO', amount: '1250', from: 'Reserve', to: 'Operations' },
  { id: 'E3', date: '2026-06-12', asset: 'DEMO', amount: '100', from: 'Operations' },
]);
const balances = jsonLines([
  { wallet: 'Reserve', asset: 'DEMO', amount: '3750' },
  { wallet: 'Operations', asset: 'DEMO', amount: '1151' },
]);

function allocations(balances) {
  const assets = [...new Set(balances.map((row) => row.asset))];
  const selector = el(
    'select',
    { id: 'allocation-asset' },
    ...assets.map((asset) => el('option', { value: asset }, asset)),
  );
  const view = el('div', {});
  const update = () => {
    const selected = balances
      .filter((row) => row.asset === selector.value)
      .map((row) => ({ ...row, units: units(row.amount, 18) }));
    const total = selected.reduce((sum, row) => sum + row.units, 0n);
    selected.sort((a, b) =>
      a.units > b.units ? -1 : a.units < b.units ? 1 : a.wallet.localeCompare(b.wallet),
    );
    view.replaceChildren(
      bars(
        'Wallet allocation · ' + selector.value,
        selected.slice(0, 8).map((row) => {
          const share = total ? Number((10000n * row.units) / total) / 100 : 0;
          return {
            label: row.wallet,
            value: share.toFixed(2) + '%',
            fraction: share / 100,
            color: '#9e7136',
          };
        }),
      ),
    );
  };
  selector.addEventListener('change', update);
  update();
  return el(
    'section',
    { className: 'stack' },
    ...(assets.length > 1 ? [el('label', { for: 'allocation-asset' }, 'Allocation by asset'), selector] : []),
    view,
  );
}

function entryTools({ read, replace }) {
  const box = el('div', { className: 'stack' });
  const controls = {};
  const message = el('p', { role: 'status' });
  for (const [key, label] of [
    ['id', 'Entry ID'],
    ['date', 'Entry date'],
    ['asset', 'Asset'],
    ['amount', 'Amount'],
    ['from', 'From wallet (optional)'],
    ['to', 'To wallet (optional)'],
  ]) {
    const input = el('input', { id: 'entry-' + key, type: key === 'date' ? 'date' : 'text' });
    controls[key] = input;
    box.append(el('label', { for: 'entry-' + key }, label), input);
  }
  box.append(
    button('Append to journal', () => {
      try {
        const record = Object.fromEntries(Object.entries(controls).map(([k, v]) => [k, v.value.trim()]));
        const draft = read();
        const combined = [draft.journal.trim(), JSON.stringify(record)].filter(Boolean).join('\n');
        const rows = rowsOf(combined);
        audit(rows, [], '9999-12-31');
        replace('journal', combined);
        message.textContent = 'Added ' + record.id + '. Reconcile to update balances.';
        for (const key of ['id', 'amount']) controls[key].value = '';
      } catch (error) {
        message.textContent = error.message;
      }
    }),
    message,
  );
  return el('details', {}, el('summary', {}, 'Add an entry'), box);
}

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Journal and snapshot',
    action: 'Reconcile balances',
    output: 'Treasury statement',
    inputTools: entryTools,
    fields: [
      { key: 'date', label: 'Statement date (UTC)', type: 'date', value: '2026-06-30' },
      {
        key: 'journal',
        label: 'Transaction journal · JSONL',
        rows: 6,
        value: journal,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use to for deposits, from for withdrawals, or both for transfers.',
      },
      {
        key: 'snapshot',
        label: 'Expected balances · JSONL',
        rows: 3,
        value: balances,
        required: false,
        import: '.jsonl,.ndjson,.txt',
      },
    ],
    calculate: (s) => audit(rowsOf(s.journal), s.snapshot.trim() ? rowsOf(s.snapshot) : [], s.date),
    render: (r, context, data) => [
      metrics([
        ['Entries posted', r.posted],
        ['Future entries', r.future],
        ['Snapshot matches', r.matched + ' / ' + r.reconciliation.length],
      ]),
      ...(r.balances.length ? [allocations(r.balances)] : []),
      el('h4', {}, 'Wallet balances'),
      gridTable(
        ['Wallet', 'Asset', 'Recorded'],
        r.balances.slice(0, 50).map((b) => [b.wallet, b.asset, b.amount]),
      ),
      ...(r.reconciliation.length
        ? [
            el('h4', {}, 'Snapshot comparison'),
            gridTable(
              ['Wallet', 'Asset', 'Expected', 'Recorded − expected'],
              r.reconciliation.slice(0, 50).map((b) => [b.wallet, b.asset, b.expected, b.difference]),
            ),
          ]
        : []),
      el(
        'div',
        { className: 'actions' },
        jsonExport(context, 'treasury-statement.json', r),
        button('Download journal', () =>
          context.download('treasury-journal.jsonl', data.journal.trim() + '\n', 'application/x-ndjson'),
        ),
      ),
    ],
  });
}
