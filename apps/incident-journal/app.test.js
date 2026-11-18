import test from 'node:test';
import assert from 'node:assert/strict';
import { milestones, appendUpdate, postmortemMarkdown, slaStatus } from './app.js';
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
test('evaluates severity SLAs and generates Markdown postmortem reports', () => {
  const sev1 = {
    id: 'i9',
    name: 'API Outage',
    service: 'Gateway',
    severity: 'SEV 1',
    owner: 'Sam',
    opened: '2026-06-01T10:00',
    impact: '502 errors',
    events: [
      { time: '2026-06-01T10:20', stage: 'Investigating', message: 'Ack' },
      { time: '2026-06-01T11:00', stage: 'Resolved', message: 'Fixed' },
    ],
  };
  const sla = slaStatus(sev1, '2026-06-01T12:00');
  assert.equal(sla.ackBreached, true); // 20 > 15
  assert.equal(sla.resolveBreached, false); // 60 <= 120
  assert.equal(sla.compliant, false);
  const md = postmortemMarkdown(sev1);
  assert.match(md, /# Post-Incident Review: API Outage/);
  assert.match(md, /Breached/);
});
