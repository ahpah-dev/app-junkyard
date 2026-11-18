import test from 'node:test';
import assert from 'node:assert/strict';
import { audit, flowSummary } from './model.js';
const rows = [
  { id: '1', date: '2024-02-01', asset: 'T', amount: '1.000000000000000001', to: 'a' },
  { id: '2', date: '2024-02-01', asset: 'T', amount: '1', from: 'a', to: 'b' },
  { id: '3', date: '2024-03-01', asset: 'T', amount: '1', from: 'b' },
];
test('transfers conserve precise balances and cutoff excludes later withdrawals', () => {
  const r = audit(rows, [{ wallet: 'a', asset: 'T', amount: '0.000000000000000002' }], '2024-02-29');
  assert.equal(r.posted, 2);
  assert.equal(r.balances[0].amount, '0.000000000000000001');
  assert.equal(r.balances[1].amount, '1');
  assert.equal(r.reconciliation[0].difference, '-0.000000000000000001');
});
test('rejects overdrafts, duplicate IDs and duplicate snapshot pairs', () => {
  assert.throws(() => audit([rows[1], rows[0]], [], '2024-06-01'), /Insufficient/);
  assert.throws(() => audit([rows[0], rows[0]], [], '2024-06-01'), /Duplicate entry/);
  const s = { wallet: 'a', asset: 'T', amount: '0' };
  assert.throws(() => audit(rows, [s, s], '2024-06-01'), /Duplicate snapshot/);
});

test('computes asset supply, concentration share, and monthly flow summaries', () => {
  const flows = flowSummary(rows, '2024-03-15');
  assert.equal(flows.assets.length, 1);
  assert.equal(flows.assets[0].asset, 'T');
  assert.equal(flows.assets[0].minted, '1.000000000000000001');
  assert.equal(flows.assets[0].burned, '1');
  assert.equal(flows.assets[0].transferred, '1');
  assert.equal(flows.assets[0].endingSupply, '0.000000000000000001');
  assert.equal(flows.assets[0].topWallet, 'a');
  assert.equal(flows.assets[0].topWalletSharePct, 100);
  assert.equal(flows.monthlyFlows.length, 2);
  assert.equal(flows.monthlyFlows[0].month, '2024-02');
  assert.equal(flows.monthlyFlows[1].net, '-1');
});
