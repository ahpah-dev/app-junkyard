import { check, decimal, requiredText, units, utcDay } from '../../shared/lab.js';

export function audit(rows, snapshot, asOf) {
  const day = utcDay(asOf, 'Report date');
  const seen = new Set();
  const events = rows
    .map((r, i) => {
      const id = requiredText(r, 'id', i);
      check(!seen.has(id), 'Duplicate entry ID: ' + id);
      seen.add(id);
      const date = utcDay(r.date, id + ' date');
      const asset = requiredText(r, 'asset', i);
      const amount = units(r.amount, 18, id + ' amount');
      check(amount > 0n, id + ' must have a positive amount.');
      for (const endpoint of [r.from, r.to])
        check(endpoint == null || typeof endpoint === 'string', id + ' wallet must be a string.');
      const from = r.from?.trim() || '';
      const to = r.to?.trim() || '';
      check(
        (from || to) && from !== to,
        id + ' needs a source or destination, and transfers must change wallets.',
      );
      return { id, date, asset, amount, from, to, index: i };
    })
    .sort((a, b) => a.date - b.date || a.index - b.index);
  const balances = new Map();
  const keyOf = (wallet, asset) => JSON.stringify([wallet, asset]);
  function adjust(wallet, asset, delta, id) {
    const key = keyOf(wallet, asset);
    const current = balances.get(key) ?? { wallet, asset, amount: 0n };
    check(current.amount + delta >= 0n, 'Insufficient ' + asset + ' in ' + wallet + ' at entry ' + id + '.');
    current.amount += delta;
    balances.set(key, current);
  }
  let posted = 0;
  for (const event of events) {
    if (event.date > day) continue;
    if (event.from) adjust(event.from, event.asset, -event.amount, event.id);
    if (event.to) adjust(event.to, event.asset, event.amount, event.id);
    posted++;
  }
  const checks = new Set();
  const reconciliation = snapshot.map((row, i) => {
    const wallet = requiredText(row, 'wallet', i);
    const asset = requiredText(row, 'asset', i);
    const expected = units(row.amount, 18, 'Snapshot amount');
    const key = keyOf(wallet, asset);
    check(!checks.has(key), 'Duplicate snapshot pair: ' + wallet + ' / ' + asset);
    checks.add(key);
    const actual = balances.get(key)?.amount ?? 0n;
    return {
      wallet,
      asset,
      expected: decimal(expected, 18),
      actual: decimal(actual, 18),
      difference: decimal(actual - expected, 18),
    };
  });
  const accounts = [...balances.values()]
    .sort((a, b) => a.wallet.localeCompare(b.wallet) || a.asset.localeCompare(b.asset))
    .map((b) => ({ ...b, amount: decimal(b.amount, 18) }));
  return {
    asOf,
    posted,
    future: events.length - posted,
    balances: accounts,
    reconciliation,
    matched: reconciliation.filter((r) => r.difference === '0').length,
  };
}
