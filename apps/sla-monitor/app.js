import {
  mountWorkbench,
  comparison,
  day,
  whole,
  validDate,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  dateField,
  selectField,
} from '../../shared/business.js';

const WINDOW_MINUTES = 43200; // 30 days
const tiers = ['Tier 0 (Critical)', 'Tier 1 (Core)', 'Tier 2 (Standard)'];

export function evaluateService(r) {
  const allowedMinutes = Number((WINDOW_MINUTES * (1 - r.targetPct / 100)).toFixed(2));
  const consumedMinutes = r.outages.reduce((n, o) => n + o.minutes, 0);
  const remainingMinutes = Number(Math.max(0, allowedMinutes - consumedMinutes).toFixed(2));
  const remainingBudgetPct =
    allowedMinutes > 0 ? Number(Math.max(0, ((allowedMinutes - consumedMinutes) * 100) / allowedMinutes).toFixed(1)) : 0;
  const burnRate = allowedMinutes > 0 ? Number((consumedMinutes / allowedMinutes).toFixed(2)) : 0;
  const actualAvailabilityPct = Number((100 - (consumedMinutes / WINDOW_MINUTES) * 100).toFixed(4));
  const latencyBreached = r.p99ActualMs > r.latencyP99BudgetMs;
  const status =
    consumedMinutes > allowedMinutes || latencyBreached
      ? 'Budget exhausted'
      : remainingBudgetPct <= 25
        ? 'At risk'
        : 'Healthy';
  return {
    allowedMinutes,
    consumedMinutes,
    remainingMinutes,
    remainingBudgetPct,
    burnRate,
    actualAvailabilityPct,
    latencyBreached,
    status,
  };
}

export function recordOutage(r, event) {
  demand(validDate(event.date), 'Choose a valid outage date.');
  demand(whole(event.minutes) && event.minutes > 0 && event.minutes <= WINDOW_MINUTES, 'Outage minutes must be 1–43,200.');
  requiredText(event.cause, 'an outage root cause');
  return { ...r, outages: [...r.outages, { id: uid(), date: event.date, minutes: event.minutes, cause: event.cause }] };
}

const blank = () => ({
  service: '',
  tier: 'Tier 1 (Core)',
  targetPct: 99.9,
  latencyP99BudgetMs: 250,
  p99ActualMs: 120,
});

const seed = () => [
  {
    id: 'sl1',
    service: 'Checkout & Payments',
    tier: 'Tier 0 (Critical)',
    targetPct: 99.95,
    latencyP99BudgetMs: 180,
    p99ActualMs: 142,
    outages: [{ id: 'o1', date: day(-6), minutes: 8, cause: 'Database failover spike' }],
  },
  {
    id: 'sl2',
    service: 'Public Search API',
    tier: 'Tier 1 (Core)',
    targetPct: 99.9,
    latencyP99BudgetMs: 300,
    p99ActualMs: 285,
    outages: [
      { id: 'o2', date: day(-14), minutes: 20, cause: 'Index shard rebalance' },
      { id: 'o3', date: day(-2), minutes: 15, cause: 'Cache eviction storm' },
    ],
  },
  {
    id: 'sl3',
    service: 'Webhook Dispatcher',
    tier: 'Tier 2 (Standard)',
    targetPct: 99.5,
    latencyP99BudgetMs: 1000,
    p99ActualMs: 410,
    outages: [{ id: 'o4', date: day(-9), minutes: 35, cause: 'Upstream DNS timeout' }],
  },
];

const config = {
  overview(rows, open) {
    const sorted = [...rows].sort((a, b) => evaluateService(a).remainingBudgetPct - evaluateService(b).remainingBudgetPct);
    return comparison(
      '30-day error budget remaining',
      sorted.map((r) => {
        const e = evaluateService(r);
        return {
          label: r.service,
          note: `${e.consumedMinutes} / ${e.allowedMinutes} min used · ${e.actualAvailabilityPct}% uptime · P99 ${r.p99ActualMs}/${r.latencyP99BudgetMs}ms`,
          value: e.remainingBudgetPct + '%',
          fraction: e.remainingBudgetPct / 100,
          color: e.status === 'Budget exhausted' ? '#9c4941' : e.status === 'At risk' ? '#c0803e' : '#38765b',
          run: () => open(r),
        };
      }),
      'Add a service to track SLO error budgets.',
    );
  },
  id: 'sla-monitor',
  singular: 'service',
  plural: 'services',
  heading: 'Service SLO registry',
  blank,
  seed,
  groups: ['Healthy', 'At risk', 'Budget exhausted'],
  group: (r) => evaluateService(r).status,
  title: (r) => r.service,
  fields: [
    textField('service', 'Service name'),
    selectField('tier', 'Reliability tier', tiers),
    decimalField('targetPct', '30-day availability SLO (%)', { min: 90, max: 99.999, step: '0.001' }),
    decimalField('latencyP99BudgetMs', 'P99 latency budget (ms)', { min: 1, max: 60000, step: 1 }),
    decimalField('p99ActualMs', 'Observed P99 latency (ms)', { min: 1, max: 60000, step: 1 }),
  ],
  form: (r) => r,
  record(v, old) {
    requiredText(v.service, 'a service name');
    demand(tiers.includes(v.tier), 'Select a tier.');
    demand(Number.isFinite(v.targetPct) && v.targetPct >= 90 && v.targetPct <= 99.999, 'SLO target must be 90–99.999%.');
    demand(whole(v.latencyP99BudgetMs) && v.latencyP99BudgetMs > 0 && whole(v.p99ActualMs) && v.p99ActualMs > 0, 'Latency must be positive ms.');
    return { ...v, id: old?.id ?? uid(), outages: old?.outages ?? [] };
  },
  metrics: (rows) => {
    const evals = rows.map(evaluateService);
    const frozen = evals.filter((e) => e.status === 'Budget exhausted').length;
    const atRisk = evals.filter((e) => e.status === 'At risk').length;
    return [
      ['Tracked services', rows.length],
      ['Healthy', evals.filter((e) => e.status === 'Healthy').length],
      ['At risk (≤25% budget)', atRisk],
      ['Release freeze', frozen],
    ];
  },
  columns: ['Service', 'SLO target', 'Actual uptime', 'Budget left', 'Status'],
  values: (r) => {
    const e = evaluateService(r);
    return [r.service, r.targetPct + '%', e.actualAvailabilityPct + '%', e.remainingMinutes + ' min', e.status];
  },
  detail: (r) => {
    const e = evaluateService(r);
    return [
      `${r.tier} · Error budget ${e.consumedMinutes} / ${e.allowedMinutes} min (${e.burnRate}× burn) · P99 ${r.p99ActualMs}ms / ${r.latencyP99BudgetMs}ms`,
      ...r.outages.map((o) => `${o.date} · ${o.minutes} min downtime · ${o.cause}`),
    ];
  },
  actions: (r, api) => {
    const list = [
      {
        label: 'Log downtime event',
        run: () =>
          api.form(
            'Log downtime event',
            [
              dateField('date', 'Outage date'),
              decimalField('minutes', 'Downtime (minutes)', { min: 1, max: 43200, step: 1 }),
              textField('cause', 'Root cause summary'),
            ],
            { date: day(), minutes: 5, cause: '' },
            recordOutage,
          ),
      },
    ];
    if (r.outages.length) {
      list.push({
        label: 'Remove last outage',
        run: () => {
          api.update({ ...r, outages: r.outages.slice(0, -1) });
          api.notify('Removed latest downtime event.');
        },
      });
    }
    return list;
  },
  export: (rows) => [
    ['Service', 'Tier', 'TargetPct', 'ActualPct', 'AllowedMin', 'ConsumedMin', 'RemainingBudgetPct', 'P99ActualMs', 'P99BudgetMs', 'Status'],
    ...rows.map((r) => {
      const e = evaluateService(r);
      return [
        r.service,
        r.tier,
        r.targetPct,
        e.actualAvailabilityPct,
        e.allowedMinutes,
        e.consumedMinutes,
        e.remainingBudgetPct,
        r.p99ActualMs,
        r.latencyP99BudgetMs,
        e.status,
      ];
    }),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
