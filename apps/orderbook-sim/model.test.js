import test from 'node:test';
import assert from 'node:assert/strict';
import { simulateBook } from './model.js';

test('matches limit and market orders with FIFO price-time priority and computes spread/VWAP', () => {
  const r = simulateBook(
    [
      { id: 'a1', side: 'sell', type: 'limit', price: '100', amount: '5' },
      { id: 'a2', side: 'sell', type: 'limit', price: '100', amount: '5' },
      { id: 'a3', side: 'sell', type: 'limit', price: '102', amount: '10' },
      { id: 'b1', side: 'buy', type: 'limit', price: '98', amount: '8' },
      { id: 'b2', side: 'buy', type: 'limit', price: '101', amount: '7' },
    ],
    10,
  );
  assert.equal(r.fills.length, 2);
  assert.equal(r.fills[0].makerId, 'a1');
  assert.equal(r.fills[0].amount, '5');
  assert.equal(r.fills[1].makerId, 'a2');
  assert.equal(r.fills[1].amount, '2');
  assert.equal(r.bestAsk, '100');
  assert.equal(r.bestBid, '98');
  assert.equal(r.spread, '2');
  assert.equal(r.vwap, '100');
});

test('supports order cancellations and market sweeps', () => {
  const r = simulateBook([
    { id: 's1', side: 'sell', type: 'limit', price: '50', amount: '4' },
    { id: 's2', side: 'sell', type: 'limit', price: '52', amount: '4' },
    { id: 'c1', type: 'cancel', targetId: 's1' },
    { id: 'm1', side: 'buy', type: 'market', amount: '2' },
  ]);
  assert.equal(r.fills.length, 1);
  assert.equal(r.fills[0].makerId, 's2');
  assert.equal(r.fills[0].price, '52');
  assert.equal(r.asks[0].size, '2');
});
