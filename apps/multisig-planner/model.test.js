import test from 'node:test';
import assert from 'node:assert/strict';
import { auditGovernance } from './model.js';

const signers = [
  { id: 'a', org: 'Ops', weight: 2 },
  { id: 'b', org: 'Sec', weight: 2 },
  { id: 'c', org: 'Legal', weight: 1 },
];

test('evaluates quorum threshold, timelock maturity, and SHA-256 commitment hashes', async () => {
  const proposals = [
    {
      id: 'P1',
      title: 'Treasury transfer',
      target: '0x111',
      value: '100',
      data: '0x00',
      createdAt: '2026-06-01T00:00:00Z',
      approvals: ['a', 'b'],
    },
    {
      id: 'P2',
      title: 'Pending timelock',
      target: '0x222',
      value: '50',
      data: '0x00',
      createdAt: '2026-06-02T00:00:00Z',
      approvals: ['a', 'c'],
    },
    {
      id: 'P3',
      title: 'Missing quorum',
      target: '0x333',
      value: '10',
      data: '0x00',
      createdAt: '2026-06-01T00:00:00Z',
      approvals: ['a'],
    },
  ];
  const r = await auditGovernance(signers, proposals, 3, 24, '2026-06-02T12:00:00Z');
  assert.equal(r.faultTolerance, 2);
  assert.equal(r.proposals[0].status, 'Ready to execute');
  assert.equal(r.proposals[1].status, 'Timelock active');
  assert.equal(r.proposals[2].status, 'Awaiting quorum');
  assert.match(r.proposals[0].payloadHash, /^[a-f0-9]{64}$/);
  assert.equal(r.orgShares.find((o) => o.org === 'Ops').canVeto, false); // 5 - 2 = 3 >= 3
});

test('rejects unknown signers and invalid thresholds', async () => {
  await assert.rejects(
    () =>
      auditGovernance(
        signers,
        [{ id: 'P1', title: 'Bad', target: '0x1', createdAt: '2026-06-01T00:00:00Z', approvals: ['ghost'] }],
        3,
        12,
        '2026-06-02T00:00:00Z',
      ),
    /unknown signer/,
  );
  await assert.rejects(() => auditGovernance(signers, [], 99, 12, '2026-06-02T00:00:00Z'));
});
