import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateService, recordOutage } from './app.js';

const svc = {
  id: 's',
  service: 'Auth',
  tier: 'Tier 0 (Critical)',
  targetPct: 99.9, // 43.2 min allowed per 30d
  latencyP99BudgetMs: 200,
  p99ActualMs: 120,
  outages: [],
};

test('calculates 30-day error budgets, burn rates, and release-freeze triggers', () => {
  const healthy = evaluateService(svc);
  assert.equal(healthy.allowedMinutes, 43.2);
  assert.equal(healthy.status, 'Healthy');

  const risky = recordOutage(svc, { date: '2026-06-01', minutes: 35, cause: 'Spike' });
  const eRisky = evaluateService(risky);
  assert.equal(eRisky.status, 'At risk');
  assert.ok(eRisky.remainingBudgetPct < 25);

  const exhausted = recordOutage(risky, { date: '2026-06-02', minutes: 10, cause: 'Outage' });
  assert.equal(evaluateService(exhausted).status, 'Budget exhausted');
});

test('flags latency budget breaches and validates outage entries', () => {
  assert.equal(evaluateService({ ...svc, p99ActualMs: 250 }).status, 'Budget exhausted');
  assert.throws(() => recordOutage(svc, { date: '2026-06-31', minutes: 5, cause: 'Bad date' }));
  assert.throws(() => recordOutage(svc, { date: '2026-06-01', minutes: 0, cause: 'Zero' }));
});
