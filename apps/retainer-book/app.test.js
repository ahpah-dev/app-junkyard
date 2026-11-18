import test from 'node:test';
import assert from 'node:assert/strict';
import { logTime, paceForecast, retainerStatement, usage } from './app.js';
const retainer = { month: '2026-06', allowance: 90, fee: 50000, rate: 6500, entries: [] };
test('overage is billed per minute and rounded once', () => {
  const r = logTime(retainer, { date: '2026-06-03', task: 'Review', minutes: 107 });
  assert.deepEqual(usage(r), { used: 107, excess: 17, extraFee: 1842, estimate: 51842 });
});
test('service entries must match the month and a real calendar date', () => {
  for (const date of ['2026-06-31', '2026-07-01'])
    assert.throws(() => logTime(retainer, { date, task: 'Review', minutes: 60 }));
});
test('projects month-end pace and formats itemized time statements', () => {
  const r = logTime(retainer, { date: '2026-06-03', task: 'Sprint audit', minutes: 60 });
  const pace = paceForecast(r, 10, 30);
  assert.equal(pace.projectedMinutes, 180);
  assert.equal(pace.projectedExcess, 90);
  assert.equal(pace.projectedExtraFee, 9750);
  assert.equal(pace.projectedTotal, 59750);
  const text = retainerStatement({ ...r, client: 'Mica Studio' });
  assert.match(text, /Mica Studio/);
  assert.match(text, /Effective hourly yield/);
});
