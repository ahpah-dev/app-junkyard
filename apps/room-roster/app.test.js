import test from 'node:test';
import assert from 'node:assert/strict';
import { bookingICS, nextSlot, roomUtilization, validateBooking } from './app.js';
const booking = {
  id: 'a',
  name: 'Planning',
  resource: 'Room A',
  owner: 'Reed',
  date: '2026-06-02',
  start: '09:00',
  end: '10:00',
  state: 'Reserved',
};
test('adjacent and cancelled reservations do not clash', () => {
  assert.doesNotThrow(() =>
    validateBooking({ ...booking, id: 'b', start: '10:00', end: '11:00' }, [booking]),
  );
  assert.doesNotThrow(() => validateBooking({ ...booking, id: 'b' }, [{ ...booking, state: 'Cancelled' }]));
  assert.throws(() => validateBooking({ ...booking, id: 'b', resource: ' room  a ' }, [booking]));
});
test('slot finder fits around reservations and respects closing time', () => {
  assert.deepEqual(nextSlot({ ...booking, id: 'b' }, [booking], '2026-06-02', 550), {
    date: '2026-06-02',
    start: '10:00',
    end: '11:00',
  });
  assert.deepEqual(nextSlot({ ...booking, id: 'b' }, [], '2026-06-02', 1050), {
    date: '2026-06-03',
    start: '09:00',
    end: '10:00',
  });
});
test('calculates room utilization percentage and exports valid RFC 5545 .ics invites', () => {
  const util = roomUtilization(
    [
      { ...booking, start: '09:00', end: '13:30' }, // 270 min = 50% of 540
      { ...booking, id: 'c', state: 'Cancelled' },
    ],
    '2026-06-02',
  );
  assert.equal(util.length, 1);
  assert.equal(util[0].bookedMinutes, 270);
  assert.equal(util[0].utilizationPct, 50);
  const ics = bookingICS(booking);
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.match(ics, /DTSTART:20260602T090000/);
  assert.match(ics, /SUMMARY:Planning/);
});
