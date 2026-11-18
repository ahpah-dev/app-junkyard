import { check, decimal, number, requiredText, units } from '../../shared/lab.js';

const places = 6;
const SCALE = 1_000_000n;

export function simulateBook(rows, feeBpsInput = 10) {
  const feeBps = BigInt(number(feeBpsInput, 'Taker fee (bps)', 0, 1000, true));
  const seen = new Set();
  const bids = []; // resting buy orders
  const asks = []; // resting sell orders
  const fills = [];
  let seq = 0;

  rows.forEach((row, i) => {
    const id = requiredText(row, 'id', i);
    check(!seen.has(id), 'Duplicate order ID: ' + id);
    seen.add(id);

    const type = row.type ?? 'limit';
    if (type === 'cancel') {
      const targetId = String(row.targetId ?? '').trim();
      check(targetId.length > 0, 'Cancel order ' + id + ' needs targetId.');
      const bIdx = bids.findIndex((o) => o.id === targetId);
      if (bIdx >= 0) bids.splice(bIdx, 1);
      const aIdx = asks.findIndex((o) => o.id === targetId);
      if (aIdx >= 0) asks.splice(aIdx, 1);
      return;
    }

    check(type === 'limit' || type === 'market', 'Order ' + id + ' needs type limit, market, or cancel.');
    check(row.side === 'buy' || row.side === 'sell', 'Order ' + id + ' needs side buy or sell.');
    let remaining = units(String(row.amount), places, id + ' amount');
    check(remaining > 0n, id + ' amount must be positive.');

    let limitPrice = 0n;
    if (type === 'limit') {
      limitPrice = units(String(row.price), places, id + ' price');
      check(limitPrice > 0n, id + ' price must be positive.');
    }

    if (row.side === 'buy') {
      asks.sort((a, b) => (a.price < b.price ? -1 : a.price > b.price ? 1 : a.seq - b.seq));
      while (remaining > 0n && asks.length > 0) {
        const best = asks[0];
        if (type === 'limit' && best.price > limitPrice) break;
        const fillAmt = remaining < best.remaining ? remaining : best.remaining;
        const quote = (fillAmt * best.price) / SCALE;
        const fee = (quote * feeBps) / 10000n;
        fills.push({
          trade: fills.length + 1,
          makerId: best.id,
          takerId: id,
          takerSide: 'buy',
          price: decimal(best.price, places),
          amount: decimal(fillAmt, places),
          quoteValue: decimal(quote, places),
          takerFee: decimal(fee, places),
        });
        remaining -= fillAmt;
        best.remaining -= fillAmt;
        if (best.remaining === 0n) asks.shift();
      }
      if (remaining > 0n && type === 'limit') {
        bids.push({ id, price: limitPrice, remaining, seq: seq++ });
      }
    } else {
      bids.sort((a, b) => (a.price > b.price ? -1 : a.price < b.price ? 1 : a.seq - b.seq));
      while (remaining > 0n && bids.length > 0) {
        const best = bids[0];
        if (type === 'limit' && best.price < limitPrice) break;
        const fillAmt = remaining < best.remaining ? remaining : best.remaining;
        const quote = (fillAmt * best.price) / SCALE;
        const fee = (quote * feeBps) / 10000n;
        fills.push({
          trade: fills.length + 1,
          makerId: best.id,
          takerId: id,
          takerSide: 'sell',
          price: decimal(best.price, places),
          amount: decimal(fillAmt, places),
          quoteValue: decimal(quote, places),
          takerFee: decimal(fee, places),
        });
        remaining -= fillAmt;
        best.remaining -= fillAmt;
        if (best.remaining === 0n) bids.shift();
      }
      if (remaining > 0n && type === 'limit') {
        asks.push({ id, price: limitPrice, remaining, seq: seq++ });
      }
    }
  });

  const aggregate = (list, desc) => {
    const levels = new Map();
    for (const o of list) levels.set(o.price, (levels.get(o.price) ?? 0n) + o.remaining);
    const sorted = [...levels.entries()].sort((a, b) =>
      desc ? (a[0] > b[0] ? -1 : a[0] < b[0] ? 1 : 0) : a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0,
    );
    let cumulative = 0n;
    return sorted.map(([price, size]) => {
      cumulative += size;
      return {
        price: decimal(price, places),
        size: decimal(size, places),
        cumulative: decimal(cumulative, places),
        rawPrice: price,
      };
    });
  };

  const bidLadder = aggregate(bids, true);
  const askLadder = aggregate(asks, false);
  const bestBid = bidLadder[0]?.rawPrice ?? null;
  const bestAsk = askLadder[0]?.rawPrice ?? null;
  const spread = bestBid !== null && bestAsk !== null ? decimal(bestAsk - bestBid, places) : '—';
  const midPrice = bestBid !== null && bestAsk !== null ? decimal((bestBid + bestAsk) / 2n, places) : '—';

  let totalBase = 0n;
  let totalQuoteScaled = 0n;
  let totalFees = 0n;
  for (const f of fills) {
    const amt = units(f.amount, places);
    const px = units(f.price, places);
    totalBase += amt;
    totalQuoteScaled += amt * px;
    totalFees += units(f.takerFee, places);
  }
  const vwap = totalBase > 0n ? decimal(totalQuoteScaled / totalBase, places) : '—';

  return {
    feeBps: Number(feeBps),
    fills,
    bids: bidLadder.map(({ rawPrice: _, ...rest }) => rest),
    asks: askLadder.map(({ rawPrice: _, ...rest }) => rest),
    bestBid: bestBid !== null ? decimal(bestBid, places) : '—',
    bestAsk: bestAsk !== null ? decimal(bestAsk, places) : '—',
    spread,
    midPrice,
    vwap,
    totalVolume: decimal(totalBase, places),
    totalFees: decimal(totalFees, places),
  };
}
