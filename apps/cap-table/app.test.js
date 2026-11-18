import test from 'node:test';
import assert from 'node:assert/strict';
import { computeOwnership, exitWaterfall } from './app.js';

const rows = [
  { id: 'f', holder: 'Founders', securityClass: 'Common', shares: 800000, investedCents: 0, valCapCents: 0, discountPct: 0, liqMultiple: 1 },
  { id: 'p', holder: 'Seed Pref', securityClass: 'Preferred', shares: 200000, investedCents: 100000000, valCapCents: 0, discountPct: 0, liqMultiple: 1 },
  { id: 's', holder: 'SAFE', securityClass: 'SAFE', shares: 0, investedCents: 20000000, valCapCents: 400000000, discountPct: 20, liqMultiple: 1 },
];

test('converts SAFEs using min of valuation cap and discounted round price', () => {
  const cap = computeOwnership(rows, 500); // cap price = 400M / 1M = 400 cents; discount = 400 cents -> 50,000 shares
  const safeHolder = cap.holders.find((h) => h.id === 's');
  assert.equal(safeHolder.conversionPriceCents, 400);
  assert.equal(safeHolder.effectiveShares, 50000);
  assert.equal(cap.totalShares, 1050000);
});

test('simulates preferred liquidation preference vs common conversion waterfall', () => {
  // At $2M exit, Seed Pref has 19.05% (~$381k) vs $1M preference -> claims $1M preference
  const lowExit = exitWaterfall(rows, 200000000, 500);
  assert.equal(lowExit.find((w) => w.id === 'p').payoutCents, 100000000);
  // At $20M exit, Seed Pref converts to ~19% (~$3.81M > $1M preference)
  const highExit = exitWaterfall(rows, 2000000000, 500);
  assert.ok(highExit.find((w) => w.id === 'p').payoutCents > 300000000);
});
