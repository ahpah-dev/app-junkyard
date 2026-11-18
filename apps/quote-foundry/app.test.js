import test from 'node:test';
import assert from 'node:assert/strict';
import { convertCurrency, quoteHTML, quoteTotals } from './app.js';
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
test('renders escaped printable HTML proposals and converts currency', () => {
  const html = quoteHTML({
    id: 'q1',
    title: 'Web <Rebuild>',
    client: 'Acme & Co',
    validUntil: '2026-12-01',
    stage: 'Sent',
    discount: 0,
    tax: 10,
    terms: 'Net 30',
    lines: [{ description: 'Design', quantity: 2, unitCents: 50000 }],
  });
  assert.match(html, /Web &lt;Rebuild&gt;/);
  assert.match(html, /Acme &amp; Co/);
  assert.match(html, /\$1,100\.00/);
  assert.equal(convertCurrency(10000, 0.92), 9200);
});
