import test from 'node:test';
import assert from 'node:assert/strict';
import { forecastRunway } from './app.js';

test('projects runway exhaustion when monthly burn exceeds reserves', () => {
  const fc = forecastRunway([
    { id: 'c', name: 'Cash', kind: 'Cash Reserve', monthlyCents: 100000, growthPct: 0, startMonth: 1, endMonth: 0 },
    { id: 'r', name: 'Rev', kind: 'Revenue', monthlyCents: 10000, growthPct: 0, startMonth: 1, endMonth: 0 },
    { id: 'e', name: 'Burn', kind: 'Expense', monthlyCents: 30000, growthPct: 0, startMonth: 1, endMonth: 0 },
  ]);
  assert.equal(fc.startingCashCents, 100000);
  assert.equal(fc.month1NetBurnCents, 20000);
  assert.equal(fc.runwayMonths, 5);
  assert.equal(fc.defaultAlive, false);
});

test('identifies break-even month and default-alive growth trajectories', () => {
  const fc = forecastRunway([
    { id: 'c', name: 'Cash', kind: 'Cash Reserve', monthlyCents: 500000, growthPct: 0, startMonth: 1, endMonth: 0 },
    { id: 'r', name: 'MRR', kind: 'Revenue', monthlyCents: 20000, growthPct: 15, startMonth: 1, endMonth: 0 },
    { id: 'e', name: 'Burn', kind: 'Expense', monthlyCents: 35000, growthPct: 0, startMonth: 1, endMonth: 0 },
  ]);
  assert.ok(fc.breakEvenMonth !== null && fc.breakEvenMonth <= 6);
  assert.equal(fc.defaultAlive, true);
});
