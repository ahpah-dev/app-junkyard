import {
  button,
  draft,
  el,
  field,
  importFile,
  input,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { boardClues, exportGame, initial, size, validProject, verifyLogical } from './engine.js';

export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let p = draft(ctx, initial, validProject),
    index = 0,
    drawVal = 1;
  const pad = 76;
  const cellPx = 34;
  const canvas = el('canvas', {
      width: pad + size * cellPx,
      height: pad + size * cellPx,
      'aria-label': '10 by 10 nonogram puzzle grid',
    }),
    logicCaption = el('p', { className: 'cr-caption' }),
    preview = el('div');

  const level = () => p.levels[index];
  const save = () => persist(ctx, p, status);

  function draw() {
    const c = canvas.getContext('2d');
    const cells = level().cells;
    const clues = boardClues(cells, size);
    const check = verifyLogical(cells, size);
    c.clearRect(0, 0, canvas.width, canvas.height);
    c.fillStyle = '#f2ede0';
    c.fillRect(0, 0, canvas.width, canvas.height);

    c.fillStyle = '#232822';
    c.font = 'bold 12px monospace';
    c.textAlign = 'right';
    c.textBaseline = 'middle';
    for (let y = 0; y < size; y++) {
      c.fillText(clues.rows[y].join(' '), pad - 8, pad + (y + 0.5) * cellPx);
    }
    c.textAlign = 'center';
    c.textBaseline = 'bottom';
    for (let x = 0; x < size; x++) {
      const list = clues.cols[x];
      list.forEach((num, k) => {
        c.fillText(String(num), pad + (x + 0.5) * cellPx, pad - 6 - (list.length - 1 - k) * 14);
      });
    }
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const px = pad + x * cellPx,
          py = pad + y * cellPx;
        c.fillStyle = cells[y * size + x] ? '#274548' : '#fffef9';
        c.fillRect(px, py, cellPx, cellPx);
        c.strokeStyle = x === 4 || y === 4 ? '#6e766b' : '#c6c9be';
        c.lineWidth = x === 4 || y === 4 ? 1.5 : 1;
        c.strokeRect(px + 0.5, py + 0.5, cellPx - 1, cellPx - 1);
      }
    }
    logicCaption.textContent = check.solvable
      ? `Logically solvable without guessing (${check.steps} propagation pass${check.steps === 1 ? '' : 'es'})`
      : `Ambiguous by line logic alone (${check.deducedCount} / ${check.totalCells} cells forced) — paint more clues`;
  }

  function paintAt(cx, cy) {
    const box = canvas.getBoundingClientRect();
    const px = ((cx - box.left) * canvas.width) / box.width;
    const py = ((cy - box.top) * canvas.height) / box.height;
    const x = Math.floor((px - pad) / cellPx);
    const y = Math.floor((py - pad) / cellPx);
    if (x < 0 || x >= size || y < 0 || y >= size) return;
    level().cells[y * size + x] = drawVal;
    draw();
  }

  let dragging = false;
  canvas.style.touchAction = 'none';
  canvas.onpointerdown = (e) => {
    if (e.button !== 0) return;
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    const box = canvas.getBoundingClientRect();
    const x = Math.floor((((e.clientX - box.left) * canvas.width) / box.width - pad) / cellPx);
    const y = Math.floor((((e.clientY - box.top) * canvas.height) / box.height - pad) / cellPx);
    if (x >= 0 && x < size && y >= 0 && y < size) {
      drawVal = level().cells[y * size + x] ? 0 : 1;
      paintAt(e.clientX, e.clientY);
    }
  };
  canvas.onpointermove = (e) => {
    if (dragging) paintAt(e.clientX, e.clientY);
  };
  canvas.onlostpointercapture = () => {
    if (dragging) {
      dragging = false;
      preview.replaceChildren();
      save();
    }
  };

  function rebuild() {
    preview.replaceChildren();
    draw();
    tools.replaceChildren(
      field(
        'Collection title',
        input(
          'text',
          p.title,
          (v) => {
            p.title = v;
            save();
          },
          { maxlength: 80 },
        ),
      ),
      field(
        'Active puzzle',
        select(
          p.levels.map((l, i) => [i, i + 1 + '. ' + l.name]),
          index,
          (v) => {
            index = Number(v);
            rebuild();
          },
        ),
      ),
      field(
        'Puzzle name',
        input(
          'text',
          level().name,
          (v) => {
            level().name = v;
            tools.querySelector('select').selectedOptions[0].textContent = index + 1 + '. ' + v;
            save();
          },
          { maxlength: 80 },
        ),
      ),
      el(
        'div',
        { className: 'cr-row' },
        button('Add puzzle', () => {
          if (p.levels.length >= 24) {
            status.textContent = 'Maximum 24 puzzles.';
            return;
          }
          p.levels.push({ name: 'New puzzle', cells: Array(size * size).fill(0) });
          index = p.levels.length - 1;
          save();
          rebuild();
        }),
        button('Remove puzzle', () => {
          if (p.levels.length <= 1) {
            status.textContent = 'Keep at least one puzzle.';
            return;
          }
          p.levels.splice(index, 1);
          index = Math.min(index, p.levels.length - 1);
          save();
          rebuild();
        }),
      ),
      button('Clear puzzle', () => {
        level().cells.fill(0);
        save();
        draw();
      }),
      button('Play puzzle', () => {
        const frame = el('iframe', {
          title: p.title || 'Nonogram playtest',
          sandbox: 'allow-scripts',
          srcdoc: exportGame(p),
        });
        preview.replaceChildren(frame);
        frame.scrollIntoView({ block: 'nearest' });
      }),
      button('Export playable HTML', () => saveFile('logic-grid.html', exportGame(p), 'text/html')),
      button('Save project JSON', () => saveFile('logic-grid.json', JSON.stringify(p, null, 2))),
      importFile(
        'Open project JSON',
        (d) => {
          if (!validProject(d)) throw Error('Choose a Logic Grid v1 project.');
          p = d;
          index = 0;
          save();
          rebuild();
        },
        status,
      ),
    );
  }

  stage.append(el('div', { className: 'cr-preview' }, canvas), logicCaption, status, preview);
  rebuild();
}
