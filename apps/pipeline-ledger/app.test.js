import test from 'node:test';
import assert from 'node:assert/strict';
import { forecast, dueFollowup, pipelineStats } from './app.js';
test('closed stages override the user forecast probability', () => {
  const deal = { value: 9999, confidence: 25, next: '2026-03-01', stage: 'Proposal' };
  assert.equal(forecast(deal), 2500);
  assert.equal(forecast({ ...deal, stage: 'Won' }), 9999);
  assert.equal(forecast({ ...deal, stage: 'Lost' }), 0);
  assert.equal(dueFollowup(deal, '2026-03-01'), true);
  assert.equal(dueFollowup({ ...deal, stage: 'Won' }, '2026-03-01'), false);
});
test('computes win rate, won/lost value, and monthly closing forecast', () => {
  const stats = pipelineStats(
    [
      { value: 10000, confidence: 50, stage: 'Proposal', close: '2026-07-15' },
      { value: 20000, confidence: 50, stage: 'Won', close: '2026-06-01' },
      { value: 10000, confidence: 50, stage: 'Lost', close: '2026-06-10' },
    ],
    '2026-06-20',
  );
  assert.equal(stats.winRatePct, 50);
  assert.equal(stats.wonValue, 20000);
  assert.equal(stats.lostValue, 10000);
  assert.equal(stats.openCount, 1);
  assert.deepEqual(stats.closingByMonth, [{ month: '2026-07', face: 10000, weighted: 5000, count: 1 }]);
});
