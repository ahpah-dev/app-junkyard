import {
  mountWorkbench,
  comparison,
  day,
  daysBetween,
  validDate,
  uid,
  demand,
  requiredText,
  textField,
  dateField,
  selectField,
} from '../../shared/business.js';

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');
const shiftDays = (s) => daysBetween(s.startDate, s.endDate) + 1;

export function validateShift(shift, rows) {
  requiredText(shift.service, 'a service name');
  requiredText(shift.primary, 'a primary responder');
  requiredText(shift.secondary, 'a secondary responder');
  demand(
    validDate(shift.startDate) && validDate(shift.endDate) && shift.startDate <= shift.endDate,
    'End date must be on or after start date.',
  );
  demand(
    shiftDays(shift) <= 31,
    'A single rotation shift can cover up to 31 days.',
  );
  demand(
    norm(shift.primary) !== norm(shift.secondary),
    'Primary and secondary responders must be distinct.',
  );
  const pKey = norm(shift.primary);
  const sKey = norm(shift.secondary);
  const clash = rows.find((other) => {
    if (other.id === shift.id) return false;
    const overlaps = shift.startDate <= other.endDate && other.startDate <= shift.endDate;
    if (!overlaps) return false;
    const op = norm(other.primary);
    const os = norm(other.secondary);
    return pKey === op || pKey === os || sKey === op || sKey === os;
  });
  demand(
    !clash,
    clash
      ? `Double-booking with ${clash.service} (${clash.startDate}–${clash.endDate}: ${clash.primary} / ${clash.secondary}).`
      : '',
  );
  return shift;
}

export function responderLoad(rows) {
  const map = new Map();
  const touch = (name) => {
    const key = norm(name);
    const existing = map.get(key) ?? {
      responder: name.trim(),
      primaryShifts: 0,
      secondaryShifts: 0,
      totalDays: 0,
    };
    map.set(key, existing);
    return existing;
  };
  for (const r of rows) {
    const d = shiftDays(r);
    const p = touch(r.primary);
    p.primaryShifts++;
    p.totalDays += d;
    const s = touch(r.secondary);
    s.secondaryShifts++;
    s.totalDays += d;
  }
  return [...map.values()].sort((a, b) => b.totalDays - a.totalDays || a.responder.localeCompare(b.responder));
}

export function rotaICS(rows) {
  const esc = (s) => String(s ?? '').replace(/([,;\\])/g, '\\$1').replace(/\r?\n/g, '\\n');
  const nextDayCompact = (iso) => day(1, new Date(iso + 'T12:00:00Z')).replace(/-/g, '');
  const events = rows.flatMap((r) => [
    'BEGIN:VEVENT',
    'UID:' + esc(r.id || uid()) + '@oncall-rota.local',
    'DTSTART;VALUE=DATE:' + r.startDate.replace(/-/g, ''),
    'DTEND;VALUE=DATE:' + nextDayCompact(r.endDate),
    'SUMMARY:' + esc(r.service + ' On-Call: ' + r.primary + ' (Backup: ' + r.secondary + ')'),
    'DESCRIPTION:' + esc('Primary: ' + r.primary + '\\nSecondary: ' + r.secondary + '\\nHandoff: ' + r.handoff),
    'END:VEVENT',
  ]);
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//App Junkyard//Oncall Rota//EN',
    ...events,
    'END:VCALENDAR',
  ].join('\r\n');
}

const shiftStatus = (r, today = day()) =>
  r.endDate < today ? 'Completed' : r.startDate <= today ? 'Active' : 'Upcoming';

const blank = () => ({
  service: '',
  primary: '',
  secondary: '',
  startDate: day(),
  endDate: day(6),
  handoff: 'Monday 09:00 UTC',
});

const seed = () => [
  {
    id: 'oc1',
    service: 'Core Platform',
    primary: 'Alex',
    secondary: 'Mara',
    startDate: day(-2),
    endDate: day(4),
    handoff: 'Monday 09:00 UTC',
  },
  {
    id: 'oc2',
    service: 'Core Platform',
    primary: 'Reed',
    secondary: 'June',
    startDate: day(5),
    endDate: day(11),
    handoff: 'Monday 09:00 UTC',
  },
  {
    id: 'oc3',
    service: 'Billing API',
    primary: 'Sam',
    secondary: 'River',
    startDate: day(),
    endDate: day(6),
    handoff: 'Wednesday 14:00 UTC',
  },
];

const config = {
  overview(rows, open, filter) {
    const load = responderLoad(rows);
    const maxDays = Math.max(1, ...load.map((l) => l.totalDays));
    return comparison(
      'Responder coverage load (scheduled days)',
      load.map((l) => ({
        label: l.responder,
        note: `${l.primaryShifts} primary · ${l.secondaryShifts} secondary shifts`,
        value: l.totalDays + ' days',
        fraction: l.totalDays / maxDays,
        color: '#3b7373',
        run: () => {
          const match = rows.find(
            (r) => norm(r.primary) === norm(l.responder) || norm(r.secondary) === norm(l.responder),
          );
          if (match) open(match);
          else filter('All');
        },
      })),
      'No shifts scheduled.',
    );
  },
  id: 'oncall-rota',
  singular: 'shift',
  plural: 'shifts',
  heading: 'On-call schedule',
  blank,
  seed,
  groups: ['Active', 'Upcoming', 'Completed'],
  group: (r) => shiftStatus(r),
  title: (r) => r.service + ' · ' + r.startDate,
  fields: [
    textField('service', 'Service or team'),
    textField('primary', 'Primary responder'),
    textField('secondary', 'Secondary responder'),
    dateField('startDate', 'Start date'),
    dateField('endDate', 'End date'),
    textField('handoff', 'Handoff window', { optional: true }),
  ],
  form: (r) => r,
  record: (v, old, rows) => validateShift({ ...v, id: old?.id ?? uid() }, rows),
  metrics: (rows) => {
    const active = rows.filter((r) => shiftStatus(r) === 'Active');
    const responders = responderLoad(rows).length;
    return [
      ['Active shifts', active.length],
      ['Upcoming shifts', rows.filter((r) => shiftStatus(r) === 'Upcoming').length],
      ['Total responders', responders],
    ];
  },
  columns: ['Service', 'Primary', 'Secondary', 'Window', 'Status'],
  values: (r) => [r.service, r.primary, r.secondary, `${r.startDate} → ${r.endDate}`, shiftStatus(r)],
  sort: (a, b) => a.startDate.localeCompare(b.startDate) || a.service.localeCompare(b.service),
  detail: (r) => [
    'Duration · ' + shiftDays(r) + ' days · Handoff ' + (r.handoff || 'Standard'),
    'Escalation · ' + r.primary + ' → ' + r.secondary,
  ],
  toolbarActions: (getRows, _save, api) => [
    (() => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.textContent = 'Download rota .ics';
      btn.onclick = () => api.download('oncall-rota.ics', rotaICS(getRows()), 'text/calendar;charset=utf-8');
      return btn;
    })(),
  ],
  actions: (r, api) => [
    {
      label: 'Swap primary / secondary',
      run: () => {
        api.update({ ...r, primary: r.secondary, secondary: r.primary });
        api.notify('Swapped primary and secondary responders.');
      },
    },
  ],
  export: (rows) => [
    ['Service', 'Primary', 'Secondary', 'Start', 'End', 'Days', 'Handoff', 'Status'],
    ...rows.map((r) => [r.service, r.primary, r.secondary, r.startDate, r.endDate, shiftDays(r), r.handoff, shiftStatus(r)]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
