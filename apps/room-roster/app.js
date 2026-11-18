import { el } from '../../shared/ui.js';
import {
  mountWorkbench,
  day,
  validDate,
  uid,
  demand,
  requiredText,
  textField,
  dateField,
  selectField,
} from '../../shared/business.js';

const minutes = (clock) => {
  const parts = /^(\d{2}):(\d{2})$/.exec(clock);
  return parts && +parts[1] < 24 && +parts[2] < 60 ? +parts[1] * 60 + +parts[2] : NaN;
};
const clock = (n) => String(Math.floor(n / 60)).padStart(2, '0') + ':' + String(n % 60).padStart(2, '0');
const roomKey = (name) => name.trim().toLowerCase().replace(/\s+/g, ' ');
export function validateBooking(r, rows) {
  requiredText(r.resource, 'a resource');
  requiredText(r.name, 'a booking title');
  requiredText(r.owner, 'an organizer');
  const start = minutes(r.start),
    end = minutes(r.end);
  demand(
    validDate(r.date) && Number.isFinite(start) && Number.isFinite(end) && end > start,
    'Choose a valid date and an end time later than start.',
  );
  if (r.state === 'Cancelled') return r;
  const conflict = rows.find(
    (other) =>
      other.id !== r.id &&
      other.state !== 'Cancelled' &&
      other.date === r.date &&
      roomKey(other.resource) === roomKey(r.resource) &&
      start < minutes(other.end) &&
      end > minutes(other.start),
  );
  demand(
    !conflict,
    conflict ? 'This overlaps “' + conflict.name + '” (' + conflict.start + '–' + conflict.end + ').' : '',
  );
  return r;
}
export function nextSlot(r, rows, startDate = day(), earliest = 540) {
  const duration = minutes(r.end) - minutes(r.start);
  if (duration <= 0 || duration > 540) return null;
  for (let offset = 0; offset < 31; offset++) {
    const date = day(offset, new Date(startDate + 'T12:00:00'));
    const busy = rows
      .filter(
        (other) =>
          other.id !== r.id &&
          other.state !== 'Cancelled' &&
          other.date === date &&
          roomKey(other.resource) === roomKey(r.resource),
      )
      .sort((a, b) => a.start.localeCompare(b.start));
    let cursor = offset === 0 ? Math.max(540, earliest) : 540;
    for (const slot of busy) {
      if (cursor + duration <= minutes(slot.start)) break;
      cursor = Math.max(cursor, minutes(slot.end));
    }
    if (cursor + duration <= 1080) return { date, start: clock(cursor), end: clock(cursor + duration) };
  }
  return null;
}
export function roomUtilization(rows, targetDate = day()) {
  const active = rows.filter((r) => r.state === 'Reserved' && r.date === targetDate);
  const byRoom = new Map();
  for (const r of active) {
    const key = roomKey(r.resource);
    const entry = byRoom.get(key) ?? { resource: r.resource, bookings: 0, bookedMinutes: 0 };
    const start = Math.max(540, minutes(r.start));
    const end = Math.min(1080, minutes(r.end));
    entry.bookings++;
    entry.bookedMinutes += Math.max(0, end - start);
    byRoom.set(key, entry);
  }
  return [...byRoom.values()]
    .map((entry) => ({
      ...entry,
      utilizationPct: Math.min(100, Math.round((entry.bookedMinutes * 100) / 540)),
    }))
    .sort((a, b) => b.utilizationPct - a.utilizationPct || a.resource.localeCompare(b.resource));
}
export function bookingICS(r) {
  const esc = (s) => String(s ?? '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
  const d = r.date.replace(/-/g, '');
  const sTime = r.start.replace(':', '') + '00';
  const eTime = r.end.replace(':', '') + '00';
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//App Junkyard//Room Roster//EN',
    'BEGIN:VEVENT',
    'UID:' + esc(r.id || uid()) + '@room-roster.local',
    'DTSTART:' + d + 'T' + sTime,
    'DTEND:' + d + 'T' + eTime,
    'SUMMARY:' + esc(r.name),
    'LOCATION:' + esc(r.resource),
    'DESCRIPTION:' + esc('Organizer: ' + r.owner + ' (' + r.state + ')'),
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}

const blank = () => ({
  name: '',
  resource: '',
  owner: '',
  date: day(),
  start: '09:00',
  end: '10:00',
  state: 'Reserved',
});
const seed = () => [
  {
    id: 'b1',
    name: 'Product critique',
    resource: 'Studio A',
    owner: 'June',
    date: day(),
    start: '09:30',
    end: '11:00',
    state: 'Reserved',
  },
  {
    id: 'b2',
    name: 'Board workshop',
    resource: 'Map Room',
    owner: 'Sam',
    date: day(1),
    start: '13:00',
    end: '15:00',
    state: 'Reserved',
  },
  {
    id: 'b3',
    name: 'Shoot setup',
    resource: 'Studio A',
    owner: 'River',
    date: day(1),
    start: '10:00',
    end: '11:00',
    state: 'Reserved',
  },
];
const group = (r) =>
  r.state === 'Cancelled' ? r.state : r.date < day() ? 'Past' : r.date === day() ? 'Today' : 'Upcoming';
const timing = [
  dateField('date', 'Date'),
  textField('start', 'Start time', { type: 'time' }),
  textField('end', 'End time', { type: 'time' }),
];
const config = {
  overview(rows, open) {
    const reserved = rows
      .filter((r) => r.state === 'Reserved' && r.date >= day())
      .sort((a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start));
    const date = reserved[0]?.date ?? day();
    const items = reserved.filter((r) => r.date === date);
    const start = Math.min(540, ...items.map((r) => Math.floor(minutes(r.start) / 60) * 60));
    const end = Math.max(1080, ...items.map((r) => Math.ceil(minutes(r.end) / 60) * 60));
    const utilMap = new Map(roomUtilization(rows, date).map((u) => [roomKey(u.resource), u.utilizationPct]));
    const panel = el(
      'section',
      { className: 'biz-sheet biz-overview' },
      el('h2', {}, 'Resource timeline · ' + date),
    );
    if (!items.length) {
      panel.append(el('p', { className: 'muted' }, 'No upcoming reservations.'));
      return panel;
    }
    const rooms = new Map(items.map((r) => [roomKey(r.resource), r.resource]));
    const tick = el('div', { className: 'rr-ticks' });
    for (let time = start; time <= end; time += 60) tick.append(el('small', {}, clock(time).slice(0, 2)));
    panel.append(
      el(
        'style',
        {},
        '.rr-line{display:grid;grid-template-columns:minmax(70px,1fr) 5fr;align-items:center;gap:.8rem}.rr-ticks{display:flex;justify-content:space-between}.rr-track{position:relative;height:2.7rem;background:#e5eee5;border-radius:5px;overflow:hidden}.rr-track button{position:absolute;top:.25rem;bottom:.25rem;min-width:3px;min-height:0;padding:0 .23rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;background:#bfdbc4;color:#234432;border-color:#92b49a;font-size:.8rem}.rr-summary{font-size:.85rem;color:#455642}',
      ),
    );
    panel.append(el('div', { className: 'rr-line' }, el('small', {}, 'Local hour'), tick));
    for (const [key, name] of rooms) {
      const track = el('div', { className: 'rr-track' });
      const booked = items.filter((r) => roomKey(r.resource) === key);
      for (const r of booked) {
        const caption = r.start + '–' + r.end + ' · ' + r.name;
        track.append(
          el(
            'button',
            {
              type: 'button',
              title: caption,
              'aria-label': caption,
              onClick: () => open(r),
              style: {
                left: (100 * (minutes(r.start) - start)) / (end - start) + '%',
                width: (100 * (minutes(r.end) - minutes(r.start))) / (end - start) + '%',
              },
            },
            r.name,
          ),
        );
      }
      const util = utilMap.get(key) ?? 0;
      panel.append(el('div', { className: 'rr-line' }, el('strong', {}, name + ' (' + util + '%)'), track));
      panel.append(
        el(
          'div',
          { className: 'rr-line' },
          el('span', {}),
          el(
            'small',
            { className: 'rr-summary' },
            booked.map((r) => r.start + '–' + r.end + ' ' + r.name).join(' · '),
          ),
        ),
      );
    }
    return panel;
  },
  id: 'room-roster',
  singular: 'booking',
  plural: 'bookings',
  heading: 'Resource schedule',
  blank,
  seed,
  groups: ['Today', 'Upcoming', 'Past', 'Cancelled'],
  group,
  title: (r) => r.name,
  fields: [
    textField('name', 'Booking title'),
    textField('resource', 'Room or resource'),
    textField('owner', 'Organizer'),
    ...timing,
    selectField('state', 'Reservation', ['Reserved', 'Cancelled']),
  ],
  form: (r) => r,
  record: (v, old, rows) => validateBooking({ ...v, id: old?.id ?? uid() }, rows),
  metrics: (rows) => {
    const today = rows.filter((r) => group(r) === 'Today');
    return [
      ['Today’s bookings', today.length],
      [
        'Today’s booked hours',
        (today.reduce((n, r) => n + minutes(r.end) - minutes(r.start), 0) / 60).toLocaleString('en-US', {
          maximumFractionDigits: 2,
        }),
      ],
      ['Upcoming reservations', rows.filter((r) => group(r) === 'Upcoming').length],
    ];
  },
  columns: ['Booking', 'Resource', 'Date', 'Time', 'Status'],
  values: (r) => [r.name, r.resource, r.date, r.start + '–' + r.end, group(r)],
  sort: (a, b) => a.date.localeCompare(b.date) || a.start.localeCompare(b.start),
  search: (r) => [r.name, r.owner, r.resource, r.date, r.state].join(' '),
  detail: (r) => ['Organizer · ' + r.owner, 'Duration · ' + (minutes(r.end) - minutes(r.start)) + ' minutes'],
  actions: (r, api, rows) => [
    {
      label: 'Find open slot',
      run: () => {
        const now = new Date();
        const slot = nextSlot(r, rows, day(), now.getHours() * 60 + now.getMinutes() + 1);
        if (!slot)
          return api.notify(
            'No slot of this length is available between 09:00 and 18:00 in the next 31 days.',
          );
        api.form(
          'Move to an open slot',
          timing,
          slot,
          (row, v) => validateBooking({ ...row, ...v, state: 'Reserved' }, rows),
          'Reserve slot',
        );
      },
    },
    {
      label: 'Download .ics invite',
      run: () =>
        api.download(
          'booking-' + r.id + '.ics',
          bookingICS(r),
          'text/calendar;charset=utf-8',
        ),
    },
  ],
  export: (rows) => [
    ['Booking', 'Resource', 'Organizer', 'Date', 'Start', 'End', 'State'],
    ...rows.map((r) => [r.name, r.resource, r.owner, r.date, r.start, r.end, r.state]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
