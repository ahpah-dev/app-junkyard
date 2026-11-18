import test from 'node:test';
import assert from 'node:assert/strict';
import { daysOfSupply, eoq, position, purchaseOrderSummary, transact } from './app.js';
const sku = { daily: 2.5, lead: 3, review: 7, safety: 1, pack: 8, events: [] };
test('inventory position includes incoming units and rounds to supplier packs', () => {
  assert.deepEqual(position(sku), { onHand: 0, onOrder: 0, point: 9, target: 27, suggested: 32 });
  const ordered = transact(sku, 'Place order', 32, '');
  const partial = transact(ordered, 'Receive order', 10, '');
  assert.equal(position(partial).onHand, 10);
  assert.equal(position(partial).onOrder, 22);
  assert.equal(position(partial).suggested, 0);
});
test('counts set an absolute total and invalid issues are refused', () => {
  const counted = transact(transact(sku, 'Count stock', 5, ''), 'Count stock', 2, '');
  assert.equal(position(counted).onHand, 2);
  assert.throws(() => transact(counted, 'Issue stock', 3, ''));
  assert.throws(() => transact(counted, 'Receive order', 1, ''));
});
test('computes days of supply, Wilson EOQ pack sizing, and consolidated POs', () => {
  const stocked = transact({ ...sku, id: '1', sku: 'A-1', name: 'Bolt' }, 'Count stock', 5, '');
  const sup = daysOfSupply(stocked);
  assert.equal(sup.runwayDays, 2);
  assert.equal(sup.status, 'Reorder');
  assert.equal(eoq(0), 0);
  assert.ok(eoq(5, 40, 2, 10) % 10 === 0);
  const po = purchaseOrderSummary([stocked], '2026-06-01');
  assert.match(po, /A-1 · Bolt/);
  assert.match(po, /Total units to order: 24/);
});
