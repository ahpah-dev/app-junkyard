import {
  mountWorkbench,
  comparison,
  money,
  cents,
  whole,
  day,
  validDate,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  dateField,
  selectField,
} from '../../shared/business.js';

const stages = ['Discovery', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost'];
const active = (d) => !['Won', 'Lost'].includes(d.stage);
export function forecast(deal) {
  return deal.stage === 'Won'
    ? deal.value
    : deal.stage === 'Lost'
      ? 0
      : Math.round((deal.value * deal.confidence) / 100);
}
export const dueFollowup = (d, today = day()) => active(d) && d.next <= today;
const blank = () => ({
  name: '',
  account: '',
  owner: '',
  stage: 'Discovery',
  amount: 1000,
  confidence: 25,
  next: day(3),
  close: day(30),
  nextAction: '',
});
const seed = () => [
  {
    id: 'd1',
    name: 'Warehouse rollout',
    account: 'Northline',
    owner: 'River',
    stage: 'Proposal',
    value: 1250000,
    confidence: 60,
    next: day(),
    close: day(15),
    nextAction: 'Review scope with operations manager',
    history: [{ date: day(-5), text: 'Sent pilot proposal' }],
  },
  {
    id: 'd2',
    name: 'Design systems audit',
    account: 'Mica Studio',
    owner: 'Reed',
    stage: 'Qualified',
    value: 450000,
    confidence: 30,
    next: day(4),
    close: day(35),
    nextAction: 'Collect component inventory',
    history: [],
  },
  {
    id: 'd3',
    name: 'Annual support',
    account: 'Goodform',
    owner: 'River',
    stage: 'Won',
    value: 750000,
    confidence: 90,
    next: day(-2),
    close: day(-2),
    nextAction: 'Hand off to delivery',
    history: [{ date: day(-2), text: 'Qualified → Won' }],
  },
];
const group = (r) => r.stage;
const config = {
  overview(rows, open, filter) {
    const groups = stages.slice(0, 4).map((label) => {
      const deals = rows.filter((d) => d.stage === label);
      return {
        label,
        count: deals.length,
        weighted: deals.reduce((n, d) => n + forecast(d), 0),
        face: deals.reduce((n, d) => n + d.value, 0),
      };
    });
    const maximum = Math.max(1, ...groups.map((g) => g.weighted));
    return comparison(
      'Weighted pipeline by stage',
      groups.map((g) => ({
        label: g.label,
        note: g.count + (g.count === 1 ? ' deal' : ' deals') + ' · ' + money(g.face) + ' face value',
        fraction: g.weighted / maximum,
        value: money(g.weighted),
        run: () => filter(g.label),
      })),
      'No active opportunities.',
      '#776796',
    );
  },
  id: 'pipeline-ledger',
  singular: 'opportunity',
  plural: 'opportunities',
  heading: 'Sales opportunities',
  title: (r) => r.name,
  blank,
  seed,
  groups: [...stages, 'Follow-up due'],
  group,
  fields: [
    textField('name', 'Opportunity'),
    textField('account', 'Account'),
    textField('owner', 'Owner'),
    selectField('stage', 'Sales stage', stages),
    decimalField('amount', 'Deal value (USD)'),
    decimalField('confidence', 'Win probability (%)', { max: 100 }),
    dateField('next', 'Next follow-up'),
    dateField('close', 'Expected or actual close'),
    textField('nextAction', 'Next action', { type: 'textarea', optional: true }),
  ],
  form: (d) => ({ ...d, amount: d.value / 100 }),
  record(v, old) {
    for (const [key, label] of [
      ['name', 'an opportunity name'],
      ['account', 'an account'],
      ['owner', 'an owner'],
    ])
      requiredText(v[key], label);
    demand(validDate(v.next) && validDate(v.close), 'Choose valid follow-up and close dates.');
    demand(
      v.confidence >= 0 && v.confidence <= 100 && whole(cents(v.amount)),
      'Check the value and probability.',
    );
    const history = [...(old?.history ?? [])];
    if (old && old.stage !== v.stage) history.push({ date: day(), text: old.stage + ' → ' + v.stage });
    return {
      id: old?.id ?? uid(),
      name: v.name,
      account: v.account,
      owner: v.owner,
      stage: v.stage,
      value: cents(v.amount),
      confidence: v.confidence,
      next: v.next,
      close: v.close,
      nextAction: v.nextAction,
      history,
    };
  },
  metrics: (rows) => [
    ['Open value', money(rows.filter(active).reduce((n, r) => n + r.value, 0))],
    ['Weighted open value', money(rows.filter(active).reduce((n, r) => n + forecast(r), 0))],
    ['Follow-ups due', rows.filter((r) => dueFollowup(r)).length],
  ],
  matchesGroup: (r, f) => (f === 'Follow-up due' ? dueFollowup(r) : r.stage === f),
  columns: ['Opportunity', 'Account', 'Stage', 'Follow-up', 'Weighted value'],
  values: (r) => [r.name, r.account, r.stage, active(r) ? r.next : 'Closed', money(forecast(r))],
  search: (r) => [r.name, r.account, r.owner, r.stage, r.nextAction].join(' '),
  sort: (a, b) => Number(active(b)) - Number(active(a)) || a.next.localeCompare(b.next),
  detail: (r) => [
    'Owner ' + r.owner + ' · Deal value ' + money(r.value) + ' · Target close ' + r.close,
    'Next action · ' + (r.nextAction || 'Unspecified'),
    ...r.history.map((e) => e.date + ' · ' + e.text),
  ],
  actions: (r, api) => [
    {
      label: 'Log follow-up',
      run: () =>
        api.form(
          'Log customer follow-up',
          [
            textField('note', 'Contact note', { type: 'textarea' }),
            dateField('next', 'Next follow-up'),
            textField('nextAction', 'Next action'),
          ],
          { next: day(7), nextAction: r.nextAction },
          (row, v) => {
            requiredText(v.note, 'a contact note');
            requiredText(v.nextAction, 'a next action');
            demand(validDate(v.next), 'Choose a valid follow-up date.');
            return {
              ...row,
              next: v.next,
              nextAction: v.nextAction,
              history: [...row.history, { date: day(), text: v.note }],
            };
          },
        ),
    },
  ],
  export: (rows) => [
    [
      'Opportunity',
      'Account',
      'Owner',
      'Stage',
      'Value USD',
      'Win probability %',
      'Weighted USD',
      'Next follow-up',
      'Target close',
      'Next action',
      'History',
    ],
    ...rows.map((r) => [
      r.name,
      r.account,
      r.owner,
      r.stage,
      r.value / 100,
      r.confidence,
      forecast(r) / 100,
      r.next,
      r.close,
      r.nextAction,
      r.history.map((h) => h.date + ' ' + h.text).join('\n'),
    ]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
