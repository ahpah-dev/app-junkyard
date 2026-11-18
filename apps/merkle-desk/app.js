import { el } from '../../shared/ui.js';
import { button, check, csvExport, gridTable, jsonExport, lab, metrics } from '../../shared/lab.js';
import { auditTree, build, decodeLeavesFile, diffSnapshots, verify } from './model.js';

function treePreview(receipt) {
  const width = 500,
    height = 154;
  const canvas = el('canvas', {
    width: width * 2,
    height: height * 2,
    role: 'img',
    'aria-label': 'Tree levels with the selected path highlighted',
    style: { width: '100%', height: 'auto', display: 'block' },
  });
  const pen = canvas.getContext('2d');
  pen.scale(2, 2);
  let count = receipt.leafCount,
    cursor = receipt.index;
  const levels = [];
  while (true) {
    levels.unshift({ count, cursor });
    if (count === 1) break;
    count = Math.ceil(count / 2);
    cursor = Math.floor(cursor / 2);
  }
  const visible = levels.slice(0, 4);
  const x = (level, index) => ((index + 0.5) * width) / level.count;
  const y = (i) => (visible.length === 1 ? height / 2 : 16 + (i * (height - 32)) / (visible.length - 1));
  for (let i = 1; i < visible.length; i++) {
    const child = visible[i],
      parent = visible[i - 1];
    for (let n = 0; n < child.count; n++) {
      pen.beginPath();
      pen.moveTo(x(parent, Math.floor(n / 2)), y(i - 1));
      pen.lineTo(x(child, n), y(i));
      pen.lineWidth = n === child.cursor ? 3 : 1.5;
      pen.strokeStyle = n === child.cursor ? '#b26a20' : '#c3bcab';
      pen.stroke();
    }
  }
  for (const [i, layer] of visible.entries())
    for (let n = 0; n < layer.count; n++) {
      const active = n === layer.cursor;
      pen.beginPath();
      pen.arc(x(layer, n), y(i), active ? 7 : 5, 0, Math.PI * 2);
      pen.fillStyle = active ? '#92521b' : '#737865';
      pen.fill();
    }
  return el(
    'figure',
    { style: { margin: 0, padding: '16px', background: '#f4efdc', borderRadius: '6px' } },
    el(
      'figcaption',
      {},
      el('strong', {}, 'Path to the root'),
      el(
        'div',
        { className: 'muted', style: { fontSize: '12px' } },
        'Leaf ' +
          (receipt.index + 1) +
          ' highlighted · ' +
          visible.length +
          ' of ' +
          levels.length +
          ' levels shown',
      ),
    ),
    canvas,
  );
}

function verifier(receipt) {
  const trusted = el('input', { id: 'trusted-root', value: receipt.root, spellcheck: false });
  const count = el('input', {
    id: 'trusted-count',
    type: 'number',
    min: 1,
    max: 4096,
    step: 1,
    placeholder: 'Optional',
  });
  const proof = el('textarea', { id: 'proof-input', rows: 5, spellcheck: false });
  proof.value = JSON.stringify(receipt, null, 2);
  const message = el('p', { role: 'status' });
  let version = 0;
  for (const input of [trusted, count, proof])
    input.addEventListener('input', () => {
      version++;
      message.textContent = '';
    });
  const run = async () => {
    const current = ++version;
    try {
      check(proof.value.length <= 1500000, 'Proof is too large.');
      const data = JSON.parse(proof.value);
      const trustedCount = count.value || undefined;
      const result = await verify(data, trusted.value.trim(), trustedCount);
      if (current === version)
        message.textContent = result
          ? trustedCount
            ? 'Verified membership and position ' + (data.index + 1) + ' of ' + data.leafCount + '.'
            : 'Verified. This leaf belongs to the supplied root.'
          : 'Mismatch. Check the receipt, trusted root and any supplied leaf count.';
    } catch (error) {
      if (current === version) message.textContent = error.message;
    }
  };
  return el(
    'details',
    {},
    el('summary', {}, 'Verify a receipt'),
    el(
      'div',
      { className: 'stack' },
      el('label', { for: 'trusted-root' }, 'Trusted root'),
      trusted,
      el('label', { for: 'trusted-count' }, 'Trusted leaf count (optional)'),
      count,
      el(
        'small',
        { className: 'muted' },
        'Supply a count from the snapshot publisher to verify the position as well as membership.',
      ),
      el('label', { for: 'proof-input' }, 'Receipt JSON'),
      proof,
      button('Verify proof', run),
      message,
    ),
  );
}

function snapshotDiffPanel(currentLeaves) {
  const prior = el('textarea', {
    id: 'prior-leaves',
    rows: 4,
    spellcheck: false,
    value: currentLeaves.slice(0, Math.max(1, currentLeaves.length - 1)).join('\n'),
  });
  const out = el('div', { className: 'stack' });
  const run = () => {
    try {
      const before = prior.value.split(/\r?\n/).filter((line) => line.length);
      const d = diffSnapshots(before, currentLeaves);
      out.replaceChildren(
        metrics([
          ['Append-only', d.isAppendOnly ? 'Yes' : 'No'],
          ['Unchanged', d.unchanged],
          ['Added', d.added.length],
          ['Removed', d.removed.length],
        ]),
        ...(d.added.length || d.removed.length
          ? [
              gridTable(
                ['Change', 'Leaf'],
                [
                  ...d.added.slice(0, 20).map((l) => ['+ Added', l]),
                  ...d.removed.slice(0, 20).map((l) => ['− Removed', l]),
                ],
              ),
            ]
          : [el('p', { className: 'muted' }, 'Snapshots are identical.')]),
      );
    } catch (error) {
      out.replaceChildren(el('p', { role: 'alert' }, error.message));
    }
  };
  return el(
    'details',
    {},
    el('summary', {}, 'Append-only snapshot diff'),
    el(
      'div',
      { className: 'stack' },
      el('label', { for: 'prior-leaves' }, 'Prior snapshot leaves · one per line'),
      prior,
      button('Compare against current tree', run),
      out,
    ),
  );
}

function leafDirectory(leaves, activeIndex) {
  const wrap = el('div', { style: { overflowX: 'auto', maxWidth: '100%' } });
  const body = el(
    'tbody',
    {},
    ...leaves.slice(0, 50).map((entry) =>
      el(
        'tr',
        {},
        el('td', {}, String(entry.position)),
        el('td', {}, entry.leaf),
        el('td', {}, el('code', {}, entry.leafHash.slice(0, 16) + '…')),
        el(
          'td',
          {},
          button(entry.index === activeIndex ? 'Selected' : 'Prove', () => {
            const pos = document.getElementById('lab-position');
            if (pos) {
              pos.value = String(entry.position);
              pos.dispatchEvent(new Event('input', { bubbles: true }));
              pos.form?.requestSubmit();
            }
          }),
        ),
      ),
    ),
  );
  wrap.append(
    el(
      'table',
      {},
      el(
        'thead',
        {},
        el('tr', {}, ...['#', 'Leaf', 'Leaf SHA-256', 'Action'].map((h) => el('th', { scope: 'col' }, h))),
      ),
      body,
    ),
  );
  return el('details', {}, el('summary', {}, 'Leaf directory (' + leaves.length + ' leaves)'), wrap);
}

export function mount(root, ctx) {
  lab(root, ctx, {
    input: 'Snapshot leaves',
    action: 'Build inclusion proof',
    output: 'Merkle receipt',
    fields: [
      {
        key: 'leaves',
        label: 'Leaf values · one per line',
        rows: 7,
        value: 'grant-001|50\ngrant-002|125\ngrant-003|72\ngrant-004|230\ngrant-005|16',
        hint: 'Empty lines are skipped. Every other character is hashed as entered.',
      },
      {
        key: 'position',
        label: 'Leaf position (starts at 1)',
        type: 'number',
        attrs: { min: 1, max: 4096, step: 1 },
        value: '2',
      },
    ],
    inputTools: ({ replace }) => {
      const picker = el('input', {
        type: 'file',
        accept: '.txt,text/plain',
        'aria-label': 'Import UTF-8 leaves',
      });
      const message = el('small', { role: 'status' });
      picker.addEventListener('change', async () => {
        const file = picker.files[0];
        if (!file) return;
        try {
          check(file.size <= 1500000, 'Choose a file smaller than 1.5 MB.');
          replace('leaves', decodeLeavesFile(await file.arrayBuffer()));
          message.textContent = 'Imported ' + file.name + '.';
        } catch (error) {
          message.textContent = error.message;
        }
        picker.value = '';
      });
      return el('div', { className: 'stack' }, el('label', {}, 'Import UTF-8 leaves', picker), message);
    },
    calculate: async (s) => {
      check(s.leaves.length <= 1500000, 'Use fewer than 1.5 million characters.');
      const lines = s.leaves.split(/\r?\n/).filter((line) => line.length);
      const [receipt, directory] = await Promise.all([build(lines, s.position), auditTree(lines)]);
      return { ...receipt, depth: directory.depth, directory: directory.leaves, rawLeaves: lines };
    },
    render: (r, context) => [
      metrics([
        ['Leaves', r.leafCount],
        ['Tree depth', r.depth],
        ['Proof steps', r.proof.length],
      ]),
      treePreview(r),
      el('h4', {}, 'Root commitment'),
      el('code', { style: { overflowWrap: 'anywhere' } }, r.root),
      el('p', {}, 'Leaf ' + (r.index + 1) + ' · ' + r.leaf),
      el(
        'details',
        {},
        el('summary', {}, 'Sibling hashes'),
        gridTable(
          ['Side', 'SHA-256'],
          r.proof.map((p) => [p.side, p.hash]),
        ),
      ),
      leafDirectory(r.directory, r.index),
      snapshotDiffPanel(r.rawLeaves),
      el(
        'div',
        { className: 'actions' },
        csvExport(
          context,
          'merkle-leaves.csv',
          ['Position', 'Leaf', 'LeafHash'],
          r.directory.map((d) => [d.position, d.leaf, d.leafHash]),
          'Download leaf hashes CSV',
        ),
        jsonExport(context, 'merkle-receipt.json', {
          scheme: r.scheme,
          root: r.root,
          leaf: r.leaf,
          index: r.index,
          leafCount: r.leafCount,
          proof: r.proof,
        }),
      ),
      verifier(r),
    ],
  });
}
