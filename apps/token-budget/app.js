import { el } from '../../shared/ui.js';
import { bars, csvExport, gridTable, jsonExport, jsonLines, lab, metrics, rowsOf } from '../../shared/lab.js';
import { packPrompt } from './model.js';

const sampleSections = jsonLines([
  {
    id: 'sys-core',
    role: 'system',
    priority: 1,
    text: 'You are a precise billing assistant. Answer only from verified policy snippets and quote section numbers.',
  },
  {
    id: 'tool-defs',
    role: 'tools',
    priority: 1,
    text: 'lookup_invoice(account_id, invoice_id); issue_credit_memo(invoice_id, cents, reason); list_refund_policies(region).',
  },
  {
    id: 'rag-chunk-1',
    role: 'context',
    priority: 2,
    text: 'Policy 4.2: Annual plans refunded within 14 days receive a full pro-rata reversal to the original payment method.',
  },
  {
    id: 'rag-chunk-2',
    role: 'context',
    priority: 3,
    text: 'Policy 4.8: Duplicate charges confirmed in the payment gateway ledger are automatically credited within 2 business days.',
  },
  {
    id: 'chat-history',
    role: 'history',
    priority: 4,
    text: 'User asked about invoice INV-4821 earlier and attached a PDF receipt from bank statement reconciliation.',
  },
  {
    id: 'user-query',
    role: 'user',
    priority: 1,
    text: 'Why was my subscription charged twice on November 12 and how do I get a refund?',
  },
]);

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Context & pricing configuration',
    output: 'Token budget & cost report',
    action: 'Pack context & forecast',
    presets: [
      {
        label: 'Compact 512',
        values: { maxContext: '512', reservedOutput: '128', inRate: '0.15', outRate: '0.60', calls: '5000' },
      },
      {
        label: 'Standard 8K',
        values: { maxContext: '8192', reservedOutput: '1024', inRate: '2.50', outRate: '10.00', calls: '1000' },
      },
      {
        label: 'Long 128K',
        values: { maxContext: '128000', reservedOutput: '4096', inRate: '5.00', outRate: '15.00', calls: '500' },
      },
    ],
    fields: [
      {
        key: 'sections',
        label: 'Prompt sections · JSONL',
        rows: 7,
        value: sampleSections,
        import: '.jsonl,.ndjson,.txt',
        hint: 'Each section needs id, role, priority (1 = highest, 5 = lowest), and text.',
      },
      {
        key: 'maxContext',
        label: 'Max context window (tokens)',
        type: 'number',
        value: '512',
        attrs: { min: 128, max: 2000000, step: 1 },
      },
      {
        key: 'reservedOutput',
        label: 'Reserved output tokens',
        type: 'number',
        value: '128',
        attrs: { min: 0, max: 500000, step: 1 },
      },
      {
        key: 'inRate',
        label: 'Input cost ($ per 1M tokens)',
        type: 'number',
        value: '2.50',
        attrs: { min: 0, max: 1000, step: 'any' },
      },
      {
        key: 'outRate',
        label: 'Output cost ($ per 1M tokens)',
        type: 'number',
        value: '10.00',
        attrs: { min: 0, max: 1000, step: 'any' },
      },
      {
        key: 'calls',
        label: 'Estimated calls per day',
        type: 'number',
        value: '1000',
        attrs: { min: 1, max: 100000000, step: 1 },
      },
    ],
    calculate: (s) => packPrompt(rowsOf(s.sections), s.maxContext, s.reservedOutput, s.inRate, s.outRate, s.calls),
    render: (r, context) => [
      metrics([
        ['Packed input', r.usedInputTokens + ' / ' + r.availableInput],
        ['Budget utilization', r.utilizationPct.toFixed(1) + '%'],
        ['Cost per call', '$' + r.callCostUsd.toFixed(5)],
        ['Monthly cost (30d)', '$' + r.monthlyCostUsd.toFixed(2)],
      ]),
      bars(
        'Token footprint by section',
        r.sections.map((s) => ({
          label: s.id + ' (P' + s.priority + ' · ' + s.status + ')',
          value: s.keptTokens + ' / ' + s.tokens + ' tok',
          fraction: r.availableInput ? s.keptTokens / r.availableInput : 0,
          color: s.status === 'Kept' ? '#38765b' : s.status === 'Truncated' ? '#c28334' : '#b24b3a',
        })),
      ),
      el('h4', {}, 'Section packing table'),
      gridTable(
        ['ID', 'Role', 'Priority', 'Est. tokens', 'Kept tokens', 'Chars/token', 'Disposition'],
        r.sections.map((s) => [s.id, s.role, 'P' + s.priority, s.tokens, s.keptTokens, s.charsPerToken, s.status]),
      ),
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'token-budget.csv',
          ['ID', 'Role', 'Priority', 'Tokens', 'KeptTokens', 'Status'],
          r.sections.map((s) => [s.id, s.role, s.priority, s.tokens, s.keptTokens, s.status]),
          'Download packing CSV',
        ),
        jsonExport(context, 'token-budget.json', r),
      ),
    ],
  });
}
