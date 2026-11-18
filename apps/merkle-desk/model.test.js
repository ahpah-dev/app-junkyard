import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { auditTree, build, decodeLeavesFile, diffSnapshots, verify } from './model.js';
test('matches domain-separated SHA-256 for a single leaf', async () => {
  const r = await build(['oak'], 1);
  assert.equal(
    r.root,
    createHash('sha256')
      .update(Buffer.from([0]))
      .update('oak')
      .digest('hex'),
  );
  assert.equal(await verify(r, r.root), true);
});
test('all positions verify in an odd tree, tampering fails', async () => {
  const leaves = ['a', 'b', 'c', 'd', 'e'];
  for (let i = 1; i <= leaves.length; i++) {
    const r = await build(leaves, i);
    assert.equal(await verify(r, r.root), true);
    assert.equal(await verify({ ...r, leaf: 'wrong' }, r.root), false);
    await assert.rejects(() => verify({ ...r, proof: [...r.proof, ...r.proof] }, r.root), /extra/);
  }
});

test('rejects malformed Unicode and malformed UTF-8 without conflating them with the replacement character', async () => {
  const receipt = await build(['\ufffd', '\u{1f33f}'], 1);
  assert.equal(await verify(receipt, receipt.root), true);
  for (const text of ['\ud800', '\udc00']) {
    await assert.rejects(() => build([text], 1), /surrogate/);
    await assert.rejects(() => verify({ ...receipt, leaf: text }, receipt.root), /surrogate/);
  }
  assert.throws(() => decodeLeavesFile(new Uint8Array([0xed, 0xa0, 0x80])), /UTF-8/);
  assert.equal(decodeLeavesFile(new TextEncoder().encode('🌿')), '🌿');
});
test('checks the receipt root and uses an independent count to authenticate the index', async () => {
  const receipt = await build(['a', 'b', 'c'], 3);
  assert.equal(await verify(receipt, receipt.root, 3), true);
  assert.equal(await verify({ ...receipt, root: '0'.repeat(64) }, receipt.root, 3), false);
  await assert.rejects(() => verify({ ...receipt, root: 'bad' }, receipt.root, 3), /Receipt root/);
  // The same one-sibling path represents index 1 in a 2-leaf tree and index 2 in a 3-leaf tree.
  const altered = { ...receipt, index: 1, leafCount: 2 };
  assert.equal(await verify(altered, receipt.root), true);
  assert.equal(await verify(altered, receipt.root, 3), false);
  await assert.rejects(() => verify({ ...receipt, index: 0 }, receipt.root, 3), /direction/);
});

test('audits full leaf directory and diffs append-only vs mutated snapshots', async () => {
  const audit = await auditTree(['x', 'y', 'z']);
  assert.equal(audit.leafCount, 3);
  assert.equal(audit.depth, 2);
  assert.equal(audit.leaves.length, 3);
  assert.equal(audit.leaves[0].position, 1);

  const append = diffSnapshots(['a', 'b'], ['a', 'b', 'c']);
  assert.equal(append.isAppendOnly, true);
  assert.deepEqual(append.added, ['c']);
  assert.deepEqual(append.removed, []);

  const mutated = diffSnapshots(['a', 'b'], ['a', 'd']);
  assert.equal(mutated.isAppendOnly, false);
  assert.deepEqual(mutated.added, ['d']);
  assert.deepEqual(mutated.removed, ['b']);
});
