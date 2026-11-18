import { check, decimal, requiredText, units, utcDay } from '../../shared/lab.js';

function parseEvents(rows) {
  const seen = new Set();
  return rows
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
      return { id, date, month: r.date.slice(0, 7), asset, amount, from, to, index: i };
    })
    .sort((a, b) => a.date - b.date || a.index - b.index);
}

export function flowSummary(rows, asOf) {
  const day = utcDay(asOf, 'Report date');
  const events = parseEvents(rows);
  const balances = new Map();
  const assets = new Map();
  const monthly = new Map();
  const keyOf = (wallet, asset) => JSON.stringify([wallet, asset]);

  function adjust(wallet, asset, delta, id) {
    const key = keyOf(wallet, asset);
    const current = balances.get(key) ?? { wallet, asset, amount: 0n };
    check(current.amount + delta >= 0n, 'Insufficient ' + asset + ' in ' + wallet + ' at entry ' + id + '.');
    current.amount += delta;
    balances.set(key, current);
  }

  for (const event of events) {
    if (event.date > day) continue;
    if (event.from) adjust(event.from, event.asset, -event.amount, event.id);
    if (event.to) adjust(event.to, event.asset, event.amount, event.id);

    const aStat = assets.get(event.asset) ?? { asset: event.asset, minted: 0n, burned: 0n, transferred: 0n };
    const mKey = JSON.stringify([event.month, event.asset]);
    const mStat = monthly.get(mKey) ?? {
      month: event.month,
      asset: event.asset,
      minted: 0n,
      burned: 0n,
      transferred: 0n,
    };
    if (!event.from && event.to) {
      aStat.minted += event.amount;
      mStat.minted += event.amount;
    } else if (event.from && !event.to) {
      aStat.burned += event.amount;
      mStat.burned += event.amount;
    } else {
      aStat.transferred += event.amount;
      mStat.transferred += event.amount;
    }
    assets.set(event.asset, aStat);
    monthly.set(mKey, mStat);
  }

  const assetSummaries = [...assets.values()]
    .sort((a, b) => a.asset.localeCompare(b.asset))
    .map((stat) => {
      const holders = [...balances.values()].filter((b) => b.asset === stat.asset && b.amount > 0n);
      holders.sort((a, b) => (a.amount > b.amount ? -1 : a.amount < b.amount ? 1 : a.wallet.localeCompare(b.wallet)));
      const endingSupply = holders.reduce((sum, b) => sum + b.amount, 0n);
      const top = holders[0];
      const topWalletSharePct =
        endingSupply > 0n && top ? Number((10000n * top.amount) / endingSupply) / 100 : 0;
      return {
        asset: stat.asset,
        minted: decimal(stat.minted, 18),
        burned: decimal(stat.burned, 18),
        transferred: decimal(stat.transferred, 18),
        endingSupply: decimal(endingSupply, 18),
        activeWallets: holders.length,
        topWallet: top?.wallet ?? '—',
        topWalletSharePct,
      };
    });

  const monthlyFlows = [...monthly.values()]
    .sort((a, b) => a.month.localeCompare(b.month) || a.asset.localeCompare(b.asset))
    .map((m) => ({
      month: m.month,
      asset: m.asset,
      inflow: decimal(m.minted, 18),
      outflow: decimal(m.burned, 18),
      internal: decimal(m.transferred, 18),
      net: decimal(m.minted - m.burned, 18),
    }));

  return { assets: assetSummaries, monthlyFlows };
}

export function audit(rows, snapshot, asOf) {
  const day = utcDay(asOf, 'Report date');
  const events = parseEvents(rows);
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
    flows: flowSummary(rows, asOf),
  };
}
