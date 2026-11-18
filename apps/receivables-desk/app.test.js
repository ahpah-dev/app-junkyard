import test from 'node:test';
import assert from 'node:assert/strict';
import { aging, balance, customerStatement, lateFee, portfolioHealth, postPayment } from './app.js';
const invoice = { amount: 10000, issued: '2025-01-01', due: '2025-02-01', payments: [] };
test('partial payment ages only the open amount', () => {
  const result = postPayment(invoice, { cents: 3500, date: '2025-02-01' }, '2025-03-15');
  assert.equal(balance(result), 6500);
  assert.equal(aging(result, '2025-03-15'), '31–60 days late');
  assert.equal(aging({ ...invoice, payments: [{ cents: 10000 }] }, '2025-03-15'), 'Paid');
});
test('rejects overpayment and payments before issue', () => {
  assert.throws(() => postPayment(invoice, { cents: 10001, date: '2025-02-01' }, '2025-03-15'));
  assert.throws(() => postPayment(invoice, { cents: 1, date: '2024-12-31' }, '2025-03-15'));
});
test('calculates portfolio health metrics, late fees, and account statements', () => {
  const rows = [
    { ...invoice, id: '1', reference: 'INV-1', client: 'A', payments: [{ cents: 5000 }] },
    { ...invoice, id: '2', reference: 'INV-2', client: 'B', due: '2025-04-01', payments: [] },
  ];
  const h = portfolioHealth(rows, '2025-03-03');
  assert.equal(h.billed, 20000);
  assert.equal(h.collected, 5000);
  assert.equal(h.collectionRatePct, 25);
  assert.equal(h.overdue, 5000);
  assert.equal(h.weightedPastDueDays, 10); // (5000 * 30 + 10000 * 0) / 15000 = 10
  assert.ok(lateFee(rows[0], 18, '2025-03-03') > 0);
  assert.match(customerStatement(rows[0], '2025-03-03'), /INV-1/);
});
