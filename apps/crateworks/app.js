import {
  button,
  draft,
  el,
  field,
  importFile,
  input,
  keyboardGrid,
  paintEvents,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { begin, drawTiles, exportGame, initial, problem, solveLevel, step, validProject } from './engine.js';
const brushes = [
  ['#', 'Wall'],
  [' ', 'Floor'],
  ['.', 'Goal'],
  ['$', 'Crate'],
  ['@', 'Player'],
  ['*', 'Crate on goal'],
  ['+', 'Player on goal'],
];
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let p = draft(ctx, initial, validProject),
    index = 0,
    brush = '#',
    animTimer = null;
  const canvas = el('canvas', {
      width: 576,
      height: 432,
      'aria-label': 'Level tile editor',
    }),
    preview = el('div');
  stage.append(
    el('div', { className: 'cr-preview' }, canvas),
    el('p', { className: 'cr-caption' }, 'Paint cells with the selected tile. Each crate needs a goal.'),
    status,
    preview,
  );
  const level = () => p.levels[index];
  const save = () => persist(ctx, p, status);
  function stopAnim() {
    if (animTimer) {
      clearInterval(animTimer);
      animTimer = null;
    }
  }
  function stateRows(s) {
    return Array.from({ length: 9 }, (_, y) =>
      Array.from({ length: 12 }, (_, x) => {
        const i = y * 12 + x,
          g = s.goals.includes(i);
        if (i === s.player) return g ? '+' : '@';
        if (s.boxes.includes(i)) return g ? '*' : '$';
        return s.tiles[i] === '#' ? '#' : g ? '.' : ' ';
      }).join(''),
    );
  }
  function validate() {
    const i = p.levels.findIndex((l) => problem(l.rows));
    if (i < 0) return true;
    status.textContent = 'Level ' + (i + 1) + '. ' + problem(p.levels[i].rows);
    return false;
  }
  function paint(x, y) {
    stopAnim();
    if (x < 0 || x >= 12 || y < 0 || y >= 9) return;
    const rows = level().rows;
    if ('@+'.includes(brush)) {
      for (let j = 0; j < rows.length; j++) rows[j] = rows[j].replace('@', ' ').replace('+', '.');
    }
    rows[y] = rows[y].slice(0, x) + brush + rows[y].slice(x + 1);
    drawTiles(canvas, rows);
  }
  function commitTile() {
    preview.replaceChildren();
    status.textContent = problem(level().rows);
    save();
  }
  paintEvents(
    canvas,
    12,
    9,
    paint,
    (x, y) => {
      if (!'@+'.includes(brush)) paint(x, y);
    },
    commitTile,
  );
  keyboardGrid(
    canvas,
    () => [12, 9],
    (x, y) => {
      paint(x, y);
      commitTile();
    },
    (x, y) => brushes.find((b) => b[0] === level().rows[y][x])[1],
  );
  function rebuild() {
    stopAnim();
    preview.replaceChildren();
    status.textContent = problem(level().rows);
    drawTiles(canvas, level().rows);
    tools.replaceChildren(
      field(
        'Game title',
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
        'Active level',
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
        'Level name',
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
      field(
        'Tile brush',
        select(brushes, brush, (v) => (brush = v)),
      ),
      button('Add level', () => {
        if (p.levels.length >= 32) {
          status.textContent = 'Maximum 32 levels.';
          return;
        }
        p.levels.push({
          name: 'New level',
          rows: initial.levels[0].rows.slice(),
        });
        index = p.levels.length - 1;
        save();
        rebuild();
      }),
      button('Remove level', () => {
        if (p.levels.length <= 1) {
          status.textContent = 'Keep at least one level.';
          return;
        }
        p.levels.splice(index, 1);
        index = Math.min(index, p.levels.length - 1);
        save();
        rebuild();
      }),
      button('Verify & solve level', () => {
        stopAnim();
        drawTiles(canvas, level().rows);
        const res = solveLevel(level().rows);
        status.textContent = res.solvable
          ? 'Solvable in ' + res.steps + ' move(s): ' + (res.moves || 'already solved') + ' · ' + res.explored + ' states explored.'
          : 'Unsolved: ' + res.reason + ' (' + res.explored + ' states explored).';
      }),
      button('Animate solution', () => {
        stopAnim();
        const res = solveLevel(level().rows);
        if (!res.solvable || !res.moves) {
          status.textContent = res.solvable ? 'Already solved.' : 'Cannot animate: ' + res.reason;
          return;
        }
        let s = begin(level().rows);
        let pos = 0;
        const deltas = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0] };
        status.textContent = 'Animating ' + res.steps + ' move solution…';
        animTimer = setInterval(() => {
          if (!canvas.isConnected || pos >= res.moves.length) {
            stopAnim();
            if (canvas.isConnected) {
              setTimeout(() => {
                if (!animTimer) drawTiles(canvas, level().rows);
              }, 900);
            }
            return;
          }
          s = step(s, ...deltas[res.moves[pos++]]);
          drawTiles(canvas, stateRows(s));
        }, 220);
      }),
      button('Play game', () => {
        if (!validate()) return;
        const frame = el('iframe', {
          title: p.title || 'Playtest',
          sandbox: 'allow-scripts',
          srcdoc: exportGame(p),
        });
        preview.replaceChildren(frame);
        frame.focus();
        frame.scrollIntoView({ block: 'nearest' });
      }),
      button('Export playable HTML', () => {
        if (validate()) saveFile('crateworks-game.html', exportGame(p), 'text/html');
      }),
      button('Save project JSON', () => saveFile('crateworks.json', JSON.stringify(p, null, 2))),
      importFile(
        'Open project JSON',
        (d) => {
          if (!validProject(d)) throw Error('Choose a Crateworks v1 project.');
          p = d;
          index = 0;
          save();
          rebuild();
        },
        status,
      ),
    );
  }
  rebuild();
}
