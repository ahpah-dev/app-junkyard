import { gamePage } from '../../shared/creative.js';

export const size = 10;

const parsePattern = (rows) => rows.join('').split('').map((ch) => (ch === '#' ? 1 : 0));

export const initial = {
  version: 1,
  title: 'Harbor Picross',
  levels: [
    {
      name: 'Anchor',
      cells: parsePattern([
        '...####...',
        '..##..##..',
        '...####...',
        '.########.',
        '....##....',
        '.#..##..#.',
        '.##.##.##.',
        '###.##.###',
        '.########.',
        '...####...',
      ]),
    },
    {
      name: 'Hourglass',
      cells: parsePattern([
        '##########',
        '.########.',
        '..######..',
        '...####...',
        '....##....',
        '....##....',
        '...####...',
        '..######..',
        '.########.',
        '##########',
      ]),
    },
  ],
};

export function validProject(p) {
  return (
    p?.version === 1 &&
    typeof p.title === 'string' &&
    p.title.length <= 80 &&
    Array.isArray(p.levels) &&
    p.levels.length > 0 &&
    p.levels.length <= 24 &&
    p.levels.every(
      (l) =>
        l &&
        typeof l.name === 'string' &&
        l.name.length <= 80 &&
        Array.isArray(l.cells) &&
        l.cells.length === size * size &&
        l.cells.every((v) => v === 0 || v === 1),
    )
  );
}

export function cluesForLine(bits) {
  const runs = [];
  let run = 0;
  for (const b of bits) {
    if (b === 1) run++;
    else if (run > 0) {
      runs.push(run);
      run = 0;
    }
  }
  if (run > 0) runs.push(run);
  return runs.length ? runs : [0];
}

export function boardClues(cells, n = size) {
  const rows = [];
  const cols = [];
  for (let y = 0; y < n; y++) rows.push(cluesForLine(cells.slice(y * n, (y + 1) * n)));
  for (let x = 0; x < n; x++) {
    const col = [];
    for (let y = 0; y < n; y++) col.push(cells[y * n + x]);
    cols.push(cluesForLine(col));
  }
  return { rows, cols };
}

function solveLine(known, clue) {
  const n = known.length;
  if (clue.length === 1 && clue[0] === 0) {
    return known.every((v) => v !== 1) ? Array(n).fill(0) : null;
  }
  const common = Array(n).fill(null);
  let found = 0;
  const line = Array(n).fill(0);

  function place(blockIdx, pos) {
    if (blockIdx === clue.length) {
      for (let i = pos; i < n; i++) {
        if (known[i] === 1) return;
        line[i] = 0;
      }
      found++;
      if (found === 1) {
        for (let i = 0; i < n; i++) common[i] = line[i];
      } else {
        for (let i = 0; i < n; i++) if (common[i] !== line[i]) common[i] = -1;
      }
      return;
    }
    const len = clue[blockIdx];
    const minRem = clue.slice(blockIdx + 1).reduce((s, v) => s + v + 1, 0);
    const maxStart = n - minRem - len;
    for (let start = pos; start <= maxStart; start++) {
      let ok = true;
      for (let i = pos; i < start; i++) {
        if (known[i] === 1) {
          ok = false;
          break;
        }
        line[i] = 0;
      }
      if (!ok) break; // a 1 cannot be skipped
      for (let i = start; i < start + len; i++) {
        if (known[i] === 0) {
          ok = false;
          break;
        }
        line[i] = 1;
      }
      if (!ok) continue;
      if (blockIdx + 1 < clue.length) {
        if (known[start + len] === 1) continue;
        line[start + len] = 0;
        place(blockIdx + 1, start + len + 1);
      } else {
        place(blockIdx + 1, start + len);
      }
    }
  }
  place(0, 0);
  return found > 0 ? common : null;
}

export function verifyLogical(cells, n = size) {
  const { rows, cols } = boardClues(cells, n);
  const grid = Array(n * n).fill(-1);
  let steps = 0;
  let progress = true;
  while (progress) {
    progress = false;
    steps++;
    for (let y = 0; y < n; y++) {
      const slice = grid.slice(y * n, (y + 1) * n);
      if (!slice.includes(-1)) continue;
      const deduced = solveLine(slice, rows[y]);
      if (!deduced) return { solvable: false, deducedCount: grid.filter((v) => v !== -1).length, totalCells: n * n, steps };
      for (let x = 0; x < n; x++) {
        if (grid[y * n + x] === -1 && deduced[x] !== -1) {
          grid[y * n + x] = deduced[x];
          progress = true;
        }
      }
    }
    for (let x = 0; x < n; x++) {
      const slice = Array.from({ length: n }, (_, y) => grid[y * n + x]);
      if (!slice.includes(-1)) continue;
      const deduced = solveLine(slice, cols[x]);
      if (!deduced) return { solvable: false, deducedCount: grid.filter((v) => v !== -1).length, totalCells: n * n, steps };
      for (let y = 0; y < n; y++) {
        if (grid[y * n + x] === -1 && deduced[y] !== -1) {
          grid[y * n + x] = deduced[y];
          progress = true;
        }
      }
    }
  }
  const deducedCount = grid.filter((v) => v !== -1).length;
  return { solvable: deducedCount === n * n, deducedCount, totalCells: n * n, steps };
}

export function nonogramRunner(project) {
  const host = document.getElementById('game');
  const tag = (n, txt) => {
    const e = document.createElement(n);
    if (txt !== undefined) e.textContent = txt;
    return e;
  };
  let idx = 0,
    mode = 1,
    board = [],
    history = [];
  const title = tag('h1', project.title),
    heading = tag('h2'),
    status = tag('div'),
    gridWrap = tag('div'),
    controls = tag('div');
  status.setAttribute('role', 'status');
  const N = 10;

  function isSolved(clues) {
    const current = boardClues(board.map((v) => (v === 1 ? 1 : 0)), N);
    return JSON.stringify(current) === JSON.stringify(clues);
  }
  function loadLevel() {
    board = Array(N * N).fill(0);
    history = [];
    render();
  }
  function render() {
    const lvl = project.levels[idx];
    const clues = boardClues(lvl.cells, N);
    const won = isSolved(clues);
    heading.textContent = `${idx + 1} / ${project.levels.length} · ${lvl.name}`;
    status.textContent = won
      ? idx === project.levels.length - 1
        ? 'All puzzles solved!'
        : 'Puzzle solved!'
      : `Mode: ${mode === 1 ? 'Fill cell' : 'Mark empty (×)'} · Filled: ${board.filter((v) => v === 1).length}`;

    const tbl = tag('table');
    tbl.style.cssText = 'border-collapse:collapse;margin:12px auto;user-select:none';
    const headerRow = tag('tr');
    headerRow.append(tag('th'));
    for (let x = 0; x < N; x++) {
      const th = tag('th');
      th.style.cssText = 'vertical-align:bottom;text-align:center;font-size:12px;padding:4px 2px;line-height:1.1';
      th.textContent = clues.cols[x].join('\n');
      th.style.whiteSpace = 'pre';
      headerRow.append(th);
    }
    tbl.append(headerRow);
    for (let y = 0; y < N; y++) {
      const tr = tag('tr');
      const rth = tag('th', clues.rows[y].join(' '));
      rth.style.cssText = 'text-align:right;padding:2px 8px;font-size:12px;white-space:nowrap';
      tr.append(rth);
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const val = board[i];
        const td = tag('td');
        td.style.cssText =
          'width:30px;height:30px;border:1px solid #486468;text-align:center;cursor:pointer;font-weight:bold;padding:0;' +
          `background:${val === 1 ? '#f4c76c' : '#213a3f'};color:#adc0b5;`;
        td.textContent = val === 2 ? '×' : '';
        td.onclick = () => {
          if (won) return;
          history.push(board.slice());
          board[i] = board[i] === mode ? 0 : mode;
          render();
        };
        tr.append(td);
      }
      tbl.append(tr);
    }
    gridWrap.replaceChildren(tbl);
    nextBtn.hidden = !won || idx === project.levels.length - 1;
    undoBtn.disabled = !history.length;
  }
  const addBtn = (label, fn) => {
    const b = tag('button', label);
    b.onclick = fn;
    controls.append(b);
    return b;
  };
  addBtn('Fill / × Mode', () => {
    mode = mode === 1 ? 2 : 1;
    render();
  });
  const undoBtn = addBtn('Undo', () => {
    if (history.length) {
      board = history.pop();
      render();
    }
  });
  addBtn('Restart', loadLevel);
  const nextBtn = addBtn('Next puzzle', () => {
    idx++;
    loadLevel();
  });
  host.append(title, heading, status, gridWrap, controls);
  loadLevel();
}

export const exportGame = (p) => gamePage(p.title, p, [cluesForLine, boardClues], nonogramRunner);
