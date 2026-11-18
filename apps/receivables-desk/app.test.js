import test from 'node:test';
import assert from 'node:assert/strict';
import { aging, balance, postPayment } from './app.js';
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
