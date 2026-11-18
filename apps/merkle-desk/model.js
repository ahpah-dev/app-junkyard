import { check, number } from '../../shared/lab.js';

const scheme = 'sha256-utf8-promote-v1';
const hex = (bytes) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
const bytes = (text) => Uint8Array.from(text.match(/../g), (pair) => parseInt(pair, 16));
const isHash = (value) => typeof value === 'string' && /^[a-f\d]{64}$/i.test(value);

function encodeLeaf(text) {
  check(typeof text === 'string' && text.length > 0, 'Every leaf must contain text.');
  // In Unicode mode, a valid surrogate pair is a single code point outside this range.
  check(!/[\uD800-\uDFFF]/u.test(text), 'Leaf text contains an unpaired UTF-16 surrogate.');
  return new TextEncoder().encode(text);
}

export function decodeLeavesFile(buffer) {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new Error('Leaf files must contain valid UTF-8 text.');
  }
}
async function hash(prefix, ...parts) {
  check(globalThis.crypto?.subtle, 'SHA-256 requires HTTPS or localhost.');
  const input = new Uint8Array(1 + parts.reduce((size, p) => size + p.length, 0));
  input[0] = prefix;
  let offset = 1;
  for (const part of parts) {
    input.set(part, offset);
    offset += part.length;
  }
  return new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', input));
}

export async function build(leaves, position) {
  check(
    Array.isArray(leaves) && leaves.length >= 1 && leaves.length <= 4096,
    'Use between 1 and 4,096 leaves.',
  );
  const index = number(position, 'Leaf position', 1, leaves.length, true) - 1;
  const encoded = leaves.map(encodeLeaf);
  let level = await Promise.all(encoded.map((leaf) => hash(0, leaf)));
  let cursor = index;
  const proof = [];
  while (level.length > 1) {
    const neighbor = cursor % 2 ? cursor - 1 : cursor + 1;
    if (neighbor < level.length)
      proof.push({ side: neighbor < cursor ? 'left' : 'right', hash: hex(level[neighbor]) });
    const parents = [];
    for (let i = 0; i < level.length; i += 2)
      parents.push(i + 1 < level.length ? hash(1, level[i], level[i + 1]) : level[i]);
    level = await Promise.all(parents);
    cursor = Math.floor(cursor / 2);
  }
  return { scheme, root: hex(level[0]), leaf: leaves[index], index, leafCount: leaves.length, proof };
}

export async function verify(receipt, trustedRoot, trustedCount) {
  check(isHash(trustedRoot), 'Trusted root must contain 64 hexadecimal characters.');
  check(receipt && receipt.scheme === scheme, 'Unsupported proof scheme.');
  check(isHash(receipt.root), 'Receipt root must contain 64 hexadecimal characters.');
  check(
    Number.isInteger(receipt.leafCount) && receipt.leafCount >= 1 && receipt.leafCount <= 4096,
    'Invalid leaf count.',
  );
  check(
    Number.isInteger(receipt.index) && receipt.index >= 0 && receipt.index < receipt.leafCount,
    'Invalid leaf index.',
  );
  check(Array.isArray(receipt.proof), 'Invalid proof.');
  const leaf = encodeLeaf(receipt.leaf);
  if (trustedCount !== undefined) {
    const count = number(trustedCount, 'Trusted leaf count', 1, 4096, true);
    if (count !== receipt.leafCount) return false;
  }
  if (receipt.root.toLowerCase() !== trustedRoot.toLowerCase()) return false;
  let digest = await hash(0, leaf);
  let cursor = receipt.index,
    width = receipt.leafCount,
    step = 0;
  while (width > 1) {
    const side = cursor % 2 ? 'left' : cursor + 1 < width ? 'right' : null;
    if (side) {
      const node = receipt.proof[step++];
      check(node?.side === side && isHash(node.hash), 'The proof path has an invalid sibling or direction.');
      const neighbor = bytes(node.hash);
      digest = side === 'left' ? await hash(1, neighbor, digest) : await hash(1, digest, neighbor);
    }
    width = Math.ceil(width / 2);
    cursor = Math.floor(cursor / 2);
  }
  check(step === receipt.proof.length, 'Unexpected extra proof steps.');
  return hex(digest) === trustedRoot.toLowerCase();
}
