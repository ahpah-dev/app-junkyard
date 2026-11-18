import test from 'node:test';
import assert from 'node:assert/strict';
import { milestones, appendUpdate } from './app.js';
const incident = { opened: '2026-06-01T10:00', events: [] };
const now = '2026-06-02T15:00';
test('resolution time follows the latest resolution after a reopen', () => {
  let r = appendUpdate(
    incident,
    { time: '2026-06-01T10:04', stage: 'Investigating', message: 'Triage' },
    now,
  );
  r = appendUpdate(r, { time: '2026-06-01T10:20', stage: 'Resolved', message: 'Recovered' }, now);
  assert.deepEqual(milestones(r), { acknowledgment: 4, resolution: 20 });
  r = appendUpdate(r, { time: '2026-06-01T10:30', stage: 'Investigating', message: 'Recurring' }, now);
  assert.deepEqual(milestones(r), { acknowledgment: 4, resolution: null });
});
test('timeline rejects out-of-order, future and invalid calendar entries', () => {
  for (const time of ['2026-06-01T08:00', '2026-06-03T09:00', '2026-06-31T10:00'])
    assert.throws(() => appendUpdate(incident, { time, stage: 'Monitoring', message: 'Check' }, now));
});
