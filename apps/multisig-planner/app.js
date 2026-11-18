import { el } from '../../shared/ui.js';
import { bars, csvExport, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
import { auditGovernance } from './model.js';

const sampleSigners = jsonLines([
  { id: 'alice', org: 'Core Eng', weight: 2 },
  { id: 'bob', org: 'Core Eng', weight: 1 },
  { id: 'carol', org: 'Security', weight: 2 },
  { id: 'dave', org: 'Finance', weight: 1 },
  { id: 'eve', org: 'Board', weight: 1 },
]);

const sampleProposals = jsonLines([
  {
    id: 'TX-101',
    title: 'Rotate fee collector',
    target: '0x71C...9A2',
    value: '0',
    data: '0xa9059cbb',
    createdAt: '2026-06-14T08:00:00Z',
    approvals: ['alice', 'carol', 'dave'],
  },
  {
    id: 'TX-102',
    title: 'Fund Q3 liquidity pool',
    target: '0x38F...4E1',
    value: '250000',
    data: '0x2e1a7d4d',
    createdAt: '2026-06-15T06:00:00Z',
    approvals: ['alice', 'carol', 'eve'],
  },
  {
    id: 'TX-103',
    title: 'Upgrade timelock delay',
    target: '0x90A...1B8',
    value: '0',
    data: '0x64d98f6e',
    createdAt: '2026-06-15T10:00:00Z',
    approvals: ['bob', 'dave'],
  },
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Governance roster & queue',
    output: 'Quorum & timelock audit',
    action: 'Audit governance',
    fields: [
      {
        key: 'signers',
        label: 'Signers · JSONL',
        rows: 5,
        value: sampleSigners,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Each signer needs id, org, and integer weight.',
      },
      {
        key: 'proposals',
        label: 'Queued proposals · JSONL',
        rows: 5,
        value: sampleProposals,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Use id, title, target, value, data, createdAt (ISO UTC), and approvals array.',
      },
      {
        key: 'threshold',
        label: 'Quorum threshold (weight)',
        type: 'number',
        value: '4',
        attrs: { min: 1, max: 10000, step: 1 },
      },
      {
        key: 'timelock',
        label: 'Timelock delay (hours)',
        type: 'number',
        value: '24',
        attrs: { min: 0, max: 8760, step: 1 },
      },
      { key: 'asOf', label: 'Evaluation timestamp (UTC ISO)', value: '2026-06-15T14:00:00Z' },
    ],
    calculate: (s) =>
      auditGovernance(rowsOf(s.signers), rowsOf(s.proposals), s.threshold, s.timelock, s.asOf),
    render: (r, context) => [
      metrics([
        ['Quorum threshold', r.threshold + ' / ' + r.totalWeight],
        ['Key-loss fault tolerance', r.faultTolerance + ' weight'],
        ['Ready to execute', r.readyCount + ' / ' + r.proposals.length],
      ]),
      bars(
        'Organization weight concentration',
        r.orgShares.map((o) => ({
          label:
            o.org +
            (o.canSoloPass ? ' (Solo pass)' : o.canVeto ? ' (Veto power)' : ''),
          value: o.weight + ' (' + o.sharePct + '%)',
          fraction: o.weight / r.totalWeight,
          color: o.canSoloPass ? '#bb572c' : o.canVeto ? '#c78c3a' : '#38765b',
        })),
      ),
      el('h4', {}, 'Proposal queue & SHA-256 commitments'),
      gridTable(
        ['ID', 'Title', 'Weight', 'Status', 'Timelock', 'Payload SHA-256'],
        r.proposals.map((p) => [
          p.id,
          p.title,
          p.approvedWeight + ' / ' + p.threshold,
          p.status,
          p.timelockElapsed ? 'Unlocked' : p.hoursRemaining + 'h left',
          p.payloadHash.slice(0, 18) + '…',
        ]),
      ),
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'multisig-audit.csv',
          ['ID', 'Title', 'Target', 'Value', 'Weight', 'Threshold', 'Status', 'PayloadSHA256'],
          r.proposals.map((p) => [
            p.id,
            p.title,
            p.target,
            p.value,
            p.approvedWeight,
            p.threshold,
            p.status,
            p.payloadHash,
          ]),
          'Download audit CSV',
        ),
        jsonExport(context, 'multisig-audit.json', r),
      ),
    ],
  });
}
