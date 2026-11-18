import { gamePage } from '../../shared/creative.js';
export const initial = {
  version: 1,
  title: 'Freight at Dawn',
  levels: [
    {
      name: 'Loading bay',
      rows: [
        '############',
        '#          #',
        '#          #',
        '#  @ $.    #',
        '#          #',
        '#          #',
        '#          #',
        '#          #',
        '############',
      ],
    },
    {
      name: 'Twin berths',
      rows: [
        '############',
        '#          #',
        '#    . .   #',
        '#    $ $   #',
        '#          #',
        '#    @     #',
        '#          #',
        '#          #',
        '############',
      ],
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
    p.levels.length <= 32 &&
    p.levels.every(
      (l) =>
        l &&
        typeof l.name === 'string' &&
        l.name.length <= 80 &&
        Array.isArray(l.rows) &&
        l.rows.length === 9 &&
        l.rows.every((r) => typeof r === 'string' && /^[ #@+.$*]{12}$/.test(r)),
    )
  );
}
export function problem(rows) {
  const chars = rows.join('');
  if ((chars.match(/[@+]/g) || []).length !== 1) return 'Place exactly one player.';
  const crates = (chars.match(/[$*]/g) || []).length,
    goals = (chars.match(/[.*+]/g) || []).length;
  if (!crates || crates !== goals) return 'Place the same positive number of crates and goals.';
  return '';
}
export function begin(rows) {
  const flat = rows.join(''),
    boxes = [],
    goals = [];
  for (let i = 0; i < flat.length; i++) {
    if ('$*'.includes(flat[i])) boxes.push(i);
    if ('.*+'.includes(flat[i])) goals.push(i);
  }
  return {
    width: rows[0].length,
    tiles: flat,
    player: flat.search(/[@+]/),
    boxes,
    goals,
    moves: 0,
  };
}
export function step(s, dx, dy) {
  if (Math.abs(dx) + Math.abs(dy) !== 1) return s;
  function neighbor(index) {
    const x = (index % s.width) + dx,
      y = Math.floor(index / s.width) + dy,
      j = y * s.width + x;
    return x >= 0 && x < s.width && y >= 0 && j < s.tiles.length && s.tiles[j] !== '#' ? j : -1;
  }
  const next = neighbor(s.player);
  if (next < 0) return s;
  const i = s.boxes.indexOf(next),
    boxes = s.boxes.slice();
  if (i >= 0) {
    const beyond = neighbor(next);
    if (beyond < 0 || boxes.includes(beyond)) return s;
    boxes[i] = beyond;
  }
  return { ...s, player: next, boxes, moves: s.moves + 1 };
}
export function solved(s) {
  return s.boxes.length > 0 && s.boxes.every((box) => s.goals.includes(box));
}
export function drawTiles(canvas, rows) {
  const c = canvas.getContext('2d'),
    w = rows[0].length,
    h = rows.length;
  const cell = canvas.width / w;
  c.clearRect(0, 0, canvas.width, canvas.height);
  rows.forEach((row, y) =>
    [...row].forEach((tile, x) => {
      const px = x * cell,
        py = y * cell;
      c.fillStyle = tile === '#' ? '#284348' : (x + y) % 2 ? '#e6d6ab' : '#efdfbb';
      c.fillRect(px, py, cell, cell);
      if (tile === '#') {
        c.fillStyle = '#39595c';
        c.fillRect(px + 2, py + 2, cell - 4, cell * 0.18);
      }
      if ('.*+'.includes(tile)) {
        c.strokeStyle = '#688276';
        c.lineWidth = 3;
        c.beginPath();
        c.arc(px + cell / 2, py + cell / 2, cell * 0.28, 0, Math.PI * 2);
        c.stroke();
      }
      if ('$*'.includes(tile)) {
        c.fillStyle = tile === '*' ? '#558575' : '#b56839';
        c.fillRect(px + cell * 0.12, py + cell * 0.12, cell * 0.76, cell * 0.76);
        c.lineWidth = 3;
        c.strokeStyle = '#ffe5b4';
        c.strokeRect(px + cell * 0.2, py + cell * 0.2, cell * 0.6, cell * 0.6);
        c.beginPath();
        c.moveTo(px + cell * 0.22, py + cell * 0.77);
        c.lineTo(px + cell * 0.78, py + cell * 0.23);
        c.stroke();
      }
      if ('@+'.includes(tile)) {
        c.fillStyle = '#346d80';
        c.beginPath();
        c.arc(px + cell * 0.5, py + cell * 0.52, cell * 0.32, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = '#f2c36e';
        c.fillRect(px + cell * 0.32, py + cell * 0.42, cell * 0.36, cell * 0.13);
      }
    }),
  );
}
export function gameRunner(project) {
  const host = document.getElementById('game');
  const tag = (name, text) => {
    const e = document.createElement(name);
    if (text) e.textContent = text;
    return e;
  };
  let level = 0,
    s,
    history = [];
  const title = tag('h1', project.title),
    heading = tag('h2'),
    caption = tag('div'),
    canvas = tag('canvas'),
    controls = tag('div');
  caption.setAttribute('role', 'status');
  canvas.width = 360;
  canvas.height = 270;
  canvas.setAttribute('aria-label', 'Crate puzzle playfield');
  const action = (label, fn) => {
    const b = tag('button', label);
    b.onclick = fn;
    controls.append(b);
    return b;
  };
  function render() {
    const rows = Array.from({ length: 9 }, (_, y) =>
      Array.from({ length: 12 }, (_, x) => {
        const i = y * 12 + x,
          g = s.goals.includes(i);
        if (i === s.player) return g ? '+' : '@';
        if (s.boxes.includes(i)) return g ? '*' : '$';
        return s.tiles[i] === '#' ? '#' : g ? '.' : ' ';
      }).join(''),
    );
    drawTiles(canvas, rows);
    heading.textContent = level + 1 + ' / ' + project.levels.length + ' · ' + project.levels[level].name;
    caption.textContent = solved(s)
      ? level === project.levels.length - 1
        ? 'All levels complete.'
        : 'Level complete.'
      : 'Moves: ' + s.moves;
    next.hidden = !solved(s) || level === project.levels.length - 1;
    undo.disabled = !history.length;
  }
  function reset() {
    s = begin(project.levels[level].rows);
    history = [];
    render();
  }
  function move(x, y) {
    if (solved(s)) return;
    const nextState = step(s, x, y);
    if (nextState === s) return;
    history.push(s);
    if (history.length > 256) history.shift();
    s = nextState;
    render();
  }
  function back() {
    if (history.length) {
      s = history.pop();
      render();
    }
  }
  for (const [key, delta] of Object.entries({
    Left: [-1, 0],
    Up: [0, -1],
    Down: [0, 1],
    Right: [1, 0],
  }))
    action(key, () => move(...delta));
  const undo = action('Undo', back);
  action('Restart level', reset);
  const next = action('Next level', () => {
    level++;
    reset();
  });
  host.append(title, heading, caption, canvas, controls);
  document.addEventListener('keydown', (e) => {
    const keys = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (keys[e.key]) {
      e.preventDefault();
      move(...keys[e.key]);
    } else if (e.key === 'z') back();
  });
  reset();
}
export const exportGame = (p) => gamePage(p.title, p, [begin, step, solved, drawTiles], gameRunner);
