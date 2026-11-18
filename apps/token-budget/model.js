import { check, number, requiredText } from '../../shared/lab.js';

export function estimateTokens(text) {
  check(typeof text === 'string', 'Text must be a string.');
  const pieces = text.match(/[\p{L}\p{N}]+|[^\s\p{L}\p{N}]/gu) ?? [];
  let tokens = 0;
  for (const piece of pieces) {
    tokens += piece.length <= 6 ? 1 : Math.ceil(piece.length / 4);
  }
  return {
    tokens,
    chars: text.length,
    charsPerToken: tokens > 0 ? Number((text.length / tokens).toFixed(2)) : 0,
  };
}

export function packPrompt(
  rows,
  maxContext = 8192,
  reservedOutput = 1024,
  inputRatePerM = 2.5,
  outputRatePerM = 10,
  dailyCalls = 1000,
) {
  const maxCtx = number(maxContext, 'Max context window', 128, 2000000, true);
  const resOut = number(reservedOutput, 'Reserved output tokens', 0, maxCtx - 1, true);
  const inRate = number(inputRatePerM, 'Input rate ($ / 1M tokens)', 0, 1000);
  const outRate = number(outputRatePerM, 'Output rate ($ / 1M tokens)', 0, 1000);
  const calls = number(dailyCalls, 'Daily calls', 1, 100000000, true);

  const seen = new Set();
  const parsed = rows.map((row, i) => {
    const id = requiredText(row, 'id', i);
    check(!seen.has(id), 'Duplicate section ID: ' + id);
    seen.add(id);
    const role = requiredText(row, 'role', i);
    const priority = number(row.priority ?? 3, id + ' priority', 1, 5, true);
    const text = typeof row.text === 'string' ? row.text : '';
    check(text.trim().length > 0, id + ' needs nonempty text.');
    const est = estimateTokens(text);
    const overhead = 4;
    return {
      index: i,
      id,
      role,
      priority,
      chars: est.chars,
      tokens: est.tokens + overhead,
      charsPerToken: est.charsPerToken,
    };
  });

  const available = maxCtx - resOut;
  const order = [...parsed].sort((a, b) => a.priority - b.priority || a.index - b.index);
  let used = 0;
  const dispositions = new Map();
  for (const sec of order) {
    const remaining = available - used;
    if (sec.tokens <= remaining) {
      used += sec.tokens;
      dispositions.set(sec.id, { status: 'Kept', keptTokens: sec.tokens });
    } else if (remaining >= 16) {
      used += remaining;
      dispositions.set(sec.id, { status: 'Truncated', keptTokens: remaining });
    } else {
      dispositions.set(sec.id, { status: 'Dropped', keptTokens: 0 });
    }
  }

  const sections = parsed.map((sec) => {
    const d = dispositions.get(sec.id);
    return { ...sec, status: d.status, keptTokens: d.keptTokens };
  });

  const totalInputRequested = sections.reduce((n, s) => n + s.tokens, 0);
  const callCostUsd = (used * inRate + resOut * outRate) / 1_000_000;
  const dailyCostUsd = callCostUsd * calls;
  const monthlyCostUsd = dailyCostUsd * 30;

  return {
    maxContext: maxCtx,
    reservedOutput: resOut,
    availableInput: available,
    totalInputRequested,
    usedInputTokens: used,
    droppedTokens: Math.max(0, totalInputRequested - used),
    utilizationPct: Number(((used * 100) / available).toFixed(2)),
    callCostUsd,
    dailyCostUsd,
    monthlyCostUsd,
    sections,
  };
}
