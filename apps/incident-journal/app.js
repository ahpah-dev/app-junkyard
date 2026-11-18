import {
  mountWorkbench,
  agenda,
  uid,
  demand,
  requiredText,
  textField,
  selectField,
} from '../../shared/business.js';

const stages = ['Investigating', 'Identified', 'Monitoring', 'Resolved'];
const timestamp = (offset = 0) => new Date(Date.now() + offset * 60000).toISOString().slice(0, 16);
const ms = (stamp) => Date.parse(stamp + ':00Z');
const validStamp = (stamp) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(stamp) &&
  Number.isFinite(ms(stamp)) &&
  new Date(ms(stamp)).toISOString().slice(0, 16) === stamp;
const state = (r) => r.events.at(-1)?.stage ?? 'Investigating';
const elapsed = (a, b) => Math.round((ms(b) - ms(a)) / 60000);
const duration = (minutes) =>
  minutes === null
    ? 'Pending'
    : minutes < 60
      ? minutes + ' min'
      : Math.floor(minutes / 60) + 'h ' + (minutes % 60) + 'm';
const pretty = (time) => time.replace('T', ' ') + ' UTC';
export function milestones(r) {
  return {
    acknowledgment: r.events.length ? elapsed(r.opened, r.events[0].time) : null,
    resolution: state(r) === 'Resolved' ? elapsed(r.opened, r.events.at(-1).time) : null,
  };
}
export function appendUpdate(r, event, now = timestamp()) {
  demand(
    validStamp(event.time) && event.time >= (r.events.at(-1)?.time ?? r.opened) && event.time <= now,
    'Update time must follow the last event and be no later than now (UTC).',
  );
  requiredText(event.message, 'an update');
  demand(stages.includes(event.stage), 'Choose an incident stage.');
  if (state(r) === 'Resolved')
    demand(event.stage === 'Investigating', 'Reopen a resolved incident by choosing Investigating.');
  return { ...r, events: [...r.events, event] };
}
const fields = [
  textField('name', 'Incident title'),
  textField('service', 'Affected service'),
  selectField('severity', 'Severity', ['SEV 1', 'SEV 2', 'SEV 3', 'SEV 4']),
  textField('owner', 'Response lead'),
  textField('opened', 'Detection time (UTC)', { type: 'datetime-local' }),
  textField('impact', 'Impact summary', { type: 'textarea' }),
];
const blank = () => ({
  name: '',
  service: '',
  severity: 'SEV 3',
  owner: '',
  opened: timestamp(),
  impact: '',
});
const seed = () => [
  {
    id: 'j1',
    name: 'Delayed image processing',
    service: 'Media workers',
    severity: 'SEV 2',
    owner: 'Alex',
    opened: timestamp(-85),
    impact: 'Uploaded previews arrive about five minutes late.',
    events: [
      { time: timestamp(-79), stage: 'Investigating', message: 'Response lead acknowledged.' },
      { time: timestamp(-54), stage: 'Identified', message: 'Backlog isolated to one queue.' },
    ],
  },
  {
    id: 'j2',
    name: 'Search indexing delay',
    service: 'Catalog',
    severity: 'SEV 3',
    owner: 'Mara',
    opened: timestamp(-1500),
    impact: 'New entries were missing from search.',
    events: [
      { time: timestamp(-1490), stage: 'Investigating', message: 'Indexing team engaged.' },
      { time: timestamp(-1450), stage: 'Resolved', message: 'Index caught up and results verified.' },
    ],
  },
];
const report = (r) => [
  r.name,
  r.severity + ' · ' + r.service + ' · ' + state(r),
  'Lead · ' + r.owner,
  'Detected · ' + pretty(r.opened),
  'Impact · ' + r.impact,
  'Time to first response · ' + duration(milestones(r).acknowledgment),
  'Time to resolution · ' + duration(milestones(r).resolution),
  '',
  ...r.events.map((e) => pretty(e.time) + ' · ' + e.stage + ' · ' + e.message),
];
const config = {
  overview(rows, open) {
    const active = rows
      .filter((r) => state(r) !== 'Resolved')
      .sort((a, b) => a.severity.localeCompare(b.severity) || a.opened.localeCompare(b.opened));
    return agenda(
      'Active response queue',
      active.map((r) => {
        const latest = r.events.at(-1);
        const age = elapsed(latest?.time ?? r.opened, timestamp());
        return {
          when: r.severity,
          tone: r.severity === 'SEV 1' ? '#f4c7bd' : r.severity === 'SEV 2' ? '#f3d8ae' : '#e0e7d6',
          label: r.name,
          note: r.owner + ' · ' + state(r) + ' · ' + (latest?.message ?? 'Awaiting first update'),
          value: duration(age) + ' since ' + (latest ? 'update' : 'detection'),
          run: () => open(r),
        };
      }),
      'All incidents are resolved.',
    );
  },
  id: 'incident-journal',
  singular: 'incident',
  plural: 'incidents',
  heading: 'Incident register',
  seed,
  blank,
  groups: stages,
  group: state,
  title: (r) => r.name,
  fields,
  form: (r) => r,
  record(v, old) {
    for (const [key, label] of [
      ['name', 'an incident title'],
      ['service', 'a service'],
      ['owner', 'a response lead'],
      ['impact', 'an impact summary'],
    ])
      requiredText(v[key], label);
    demand(
      validStamp(v.opened) && v.opened <= timestamp(),
      'Detection must be a valid time up to now (UTC).',
    );
    demand(
      !old?.events.length || v.opened <= old.events[0].time,
      'Detection cannot follow the first update.',
    );
    return { ...v, id: old?.id ?? uid(), events: old?.events ?? [] };
  },
  metrics: (rows) => {
    const resolved = rows.map((r) => milestones(r).resolution).filter((n) => n !== null);
    return [
      ['Active incidents', rows.filter((r) => state(r) !== 'Resolved').length],
      ['Awaiting first update', rows.filter((r) => !r.events.length).length],
      [
        'Mean time to resolution',
        resolved.length ? duration(Math.round(resolved.reduce((a, b) => a + b, 0) / resolved.length)) : '—',
      ],
    ];
  },
  columns: ['Incident', 'Service', 'Severity', 'Stage', 'Lead'],
  values: (r) => [r.name, r.service, r.severity, state(r), r.owner],
  sort: (a, b) =>
    Number(state(a) === 'Resolved') - Number(state(b) === 'Resolved') ||
    a.severity.localeCompare(b.severity) ||
    b.opened.localeCompare(a.opened),
  detail: (r) => report(r).slice(3).filter(Boolean),
  actions: (r, api) => [
    {
      label: state(r) === 'Resolved' ? 'Reopen incident' : 'Add timeline update',
      run: () =>
        api.form(
          'Add timeline update',
          [
            textField('time', 'Time (UTC)', { type: 'datetime-local' }),
            selectField('stage', 'Stage', state(r) === 'Resolved' ? ['Investigating'] : stages),
            textField('message', 'Update', { type: 'textarea' }),
          ],
          { time: timestamp(), stage: state(r) === 'Resolved' ? 'Investigating' : state(r) },
          appendUpdate,
        ),
    },
    {
      label: 'Download report',
      run: () => api.download('incident-' + r.id + '.txt', report(r).join('\n'), 'text/plain;charset=utf-8'),
    },
  ],
  export: (rows) => [
    ['Incident', 'Service', 'Severity', 'Lead', 'Time (UTC)', 'Stage', 'Message'],
    ...rows.flatMap((r) => [
      [r.name, r.service, r.severity, r.owner, r.opened, 'Detected', r.impact],
      ...r.events.map((e) => [r.name, r.service, r.severity, r.owner, e.time, e.stage, e.message]),
    ]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
