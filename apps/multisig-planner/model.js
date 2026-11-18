import { check, number, requiredText } from '../../shared/lab.js';

const hex = (bytes) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');

async function sha256Text(text) {
  check(globalThis.crypto?.subtle, 'SHA-256 requires HTTPS or localhost.');
  const buf = new TextEncoder().encode(text);
  return hex(new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', buf)));
}

function parseTimestamp(value, label) {
  check(typeof value === 'string' && value.trim().length > 0, label + ' needs an ISO timestamp.');
  const ms = Date.parse(value.trim());
  check(Number.isFinite(ms), label + ' is not a valid ISO timestamp.');
  return ms;
}

export async function auditGovernance(
  signersInput,
  proposalsInput,
  thresholdInput,
  timelockHoursInput = 24,
  asOfInput = '2026-06-15T12:00:00Z',
) {
  const asOfMs = parseTimestamp(asOfInput, 'Evaluation time');
  const timelockHours = number(timelockHoursInput, 'Timelock hours', 0, 8760, true);
  const timelockMs = timelockHours * 3600000;

  const signerMap = new Map();
  let totalWeight = 0;
  signersInput.forEach((row, i) => {
    const id = requiredText(row, 'id', i);
    check(!signerMap.has(id), 'Duplicate signer ID: ' + id);
    const org = requiredText(row, 'org', i);
    const weight = number(row.weight ?? 1, id + ' weight', 1, 1000, true);
    totalWeight += weight;
    signerMap.set(id, { id, org, weight });
  });
  check(signerMap.size >= 1, 'Add at least one signer.');
  const threshold = number(thresholdInput, 'Quorum threshold', 1, totalWeight, true);

  const orgWeights = new Map();
  for (const s of signerMap.values()) {
    orgWeights.set(s.org, (orgWeights.get(s.org) ?? 0) + s.weight);
  }
  const orgShares = [...orgWeights.entries()]
    .map(([org, weight]) => ({
      org,
      weight,
      sharePct: Number(((weight * 100) / totalWeight).toFixed(2)),
      canSoloPass: weight >= threshold,
      canVeto: totalWeight - weight < threshold,
    }))
    .sort((a, b) => b.weight - a.weight || a.org.localeCompare(b.org));

  const seenProps = new Set();
  const proposals = [];
  for (let i = 0; i < proposalsInput.length; i++) {
    const row = proposalsInput[i];
    const id = requiredText(row, 'id', i);
    check(!seenProps.has(id), 'Duplicate proposal ID: ' + id);
    seenProps.add(id);
    const title = requiredText(row, 'title', i);
    const target = requiredText(row, 'target', i);
    const value = String(row.value ?? '0').trim() || '0';
    const data = String(row.data ?? '0x').trim() || '0x';
    const createdMs = parseTimestamp(row.createdAt, id + ' createdAt');

    const rawApprovals = Array.isArray(row.approvals)
      ? row.approvals
      : typeof row.approvals === 'string'
        ? row.approvals
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : [];
    const uniqueSigners = [...new Set(rawApprovals)];
    let approvedWeight = 0;
    for (const sid of uniqueSigners) {
      check(signerMap.has(sid), 'Proposal ' + id + ' references unknown signer: ' + sid);
      approvedWeight += signerMap.get(sid).weight;
    }
    const quorumMet = approvedWeight >= threshold;
    const unlockMs = createdMs + timelockMs;
    const timelockElapsed = asOfMs >= unlockMs;
    const hoursRemaining = Math.max(0, Number(((unlockMs - asOfMs) / 3600000).toFixed(2)));
    const status = quorumMet && timelockElapsed ? 'Ready to execute' : quorumMet ? 'Timelock active' : 'Awaiting quorum';
    const payloadHash = await sha256Text([id, target, value, data].join('|'));

    proposals.push({
      id,
      title,
      target,
      value,
      data,
      createdAt: new Date(createdMs).toISOString(),
      unlockAt: new Date(unlockMs).toISOString(),
      approvals: uniqueSigners,
      approvedWeight,
      threshold,
      quorumMet,
      timelockElapsed,
      hoursRemaining,
      status,
      payloadHash,
    });
  }

  return {
    asOf: new Date(asOfMs).toISOString(),
    threshold,
    totalWeight,
    faultTolerance: totalWeight - threshold,
    timelockHours,
    signerCount: signerMap.size,
    readyCount: proposals.filter((p) => p.status === 'Ready to execute').length,
    orgShares,
    proposals,
  };
}
