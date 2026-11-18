import test from 'node:test';
import assert from 'node:assert/strict';
import { forecast, dueFollowup } from './app.js';
test('closed stages override the user forecast probability', () => {
  const deal = { value: 9999, confidence: 25, next: '2026-03-01', stage: 'Proposal' };
  assert.equal(forecast(deal), 2500);
  assert.equal(forecast({ ...deal, stage: 'Won' }), 9999);
  assert.equal(forecast({ ...deal, stage: 'Lost' }), 0);
  assert.equal(dueFollowup(deal, '2026-03-01'), true);
  assert.equal(dueFollowup({ ...deal, stage: 'Won' }, '2026-03-01'), false);
});
