import test from 'node:test';
import assert from 'node:assert/strict';
import { usage, logTime } from './app.js';
const retainer = { month: '2026-06', allowance: 90, fee: 50000, rate: 6500, entries: [] };
test('overage is billed per minute and rounded once', () => {
  const r = logTime(retainer, { date: '2026-06-03', task: 'Review', minutes: 107 });
  assert.deepEqual(usage(r), { used: 107, excess: 17, extraFee: 1842, estimate: 51842 });
});
test('service entries must match the month and a real calendar date', () => {
  for (const date of ['2026-06-31', '2026-07-01'])
    assert.throws(() => logTime(retainer, { date, task: 'Review', minutes: 60 }));
});
