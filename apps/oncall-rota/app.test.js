import test from 'node:test';
import assert from 'node:assert/strict';
import { responderLoad, rotaICS, validateShift } from './app.js';

const base = {
  id: 's1',
  service: 'API',
  primary: 'Alex',
  secondary: 'Mara',
  startDate: '2026-06-01',
  endDate: '2026-06-07',
  handoff: '09:00 UTC',
};

test('rejects identical responders and overlapping double-bookings', () => {
  assert.throws(() => validateShift({ ...base, id: 's2', secondary: ' alex ' }, []), /distinct/);
  assert.throws(
    () =>
      validateShift(
        { ...base, id: 's2', service: 'DB', primary: 'Mara', secondary: 'Reed', startDate: '2026-06-05', endDate: '2026-06-10' },
        [base],
      ),
    /Double-booking/,
  );
  assert.doesNotThrow(() =>
    validateShift(
      { ...base, id: 's3', primary: 'Mara', secondary: 'Alex', startDate: '2026-06-08', endDate: '2026-06-14' },
      [base],
    ),
  );
});

test('computes responder load balance and RFC 5545 iCalendar output', () => {
  const load = responderLoad([base]);
  assert.equal(load.length, 2);
  assert.equal(load[0].totalDays, 7);
  const ics = rotaICS([base]);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART;VALUE=DATE:20260601/);
  assert.match(ics, /DTEND;VALUE=DATE:20260608/);
});
