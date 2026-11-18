import test from 'node:test';
import assert from 'node:assert/strict';
import { quoteTotals } from './app.js';
test('discount reduces the taxable base with cent rounding', () => {
  assert.deepEqual(quoteTotals([{ description: 'Review', quantity: 3, unitCents: 999 }], 10, 8.25), {
    subtotal: 2997,
    savings: 300,
    taxDue: 223,
    total: 2920,
  });
});
test('invalid quotes cannot become a zero-line or negative estimate', () => {
  assert.throws(() => quoteTotals([], 0, 0));
  assert.throws(() => quoteTotals([{ description: 'x', quantity: -1, unitCents: 100 }], 0, 0));
});
