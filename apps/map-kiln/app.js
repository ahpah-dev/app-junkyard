import {
  button,
  coords,
  draft,
  el,
  field,
  input,
  keyboardGrid,
  persist,
  saveFile,
  savePNG,
  select,
  studio,
} from '../../shared/creative.js';
import { exportDungeonGame, generate, initial, populateRooms, route, valid } from './generator.js';
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  const saved = draft(
    ctx,
    { settings: initial, end: null },
    (d) => d && valid(d.settings) && (d.end === null || Number.isInteger(d.end)),
  );
  const s = saved.settings;
  let map = generate(s),
    end = map.tiles[saved.end] === 1 ? saved.end : map.end,
    showPath = true,
    heatmap = false;
  const canvas = el('canvas', {
      'aria-label': 'Dungeon preview. Select a floor cell to move the exit.',
    }),
    caption = el('p', { className: 'cr-caption' }),
    manifest = el('table'),
    frame = el('div');
  function save() {
    persist(ctx, { settings: s, end }, status);
  }
  function draw(target = canvas) {
    const path = route(map.parent, map.start, end),
      pop = populateRooms(map, end, s.seed),
      c = target.getContext('2d'),
      unit = 12;
    target.width = map.width * unit;
    target.height = map.height * unit;
    c.fillStyle = '#21383d';
    c.fillRect(0, 0, target.width, target.height);
    map.tiles.forEach((v, i) => {
      if (v) {
        if (heatmap && pop.distGrid[i] >= 0) {
          const t = Math.min(1, pop.distGrid[i] / pop.maxDist);
          const r = Math.round(230 - t * 130),
            g = Math.round(220 - t * 90),
            b = Math.round(170 - t * 40);
          c.fillStyle = `rgb(${r},${g},${b})`;
        } else {
          c.fillStyle = '#cdc4a4';
        }
        c.fillRect((i % map.width) * unit, Math.floor(i / map.width) * unit, unit, unit);
      }
    });
    if (showPath) {
      c.strokeStyle = '#68957d';
      c.lineWidth = 3;
      c.beginPath();
      path.forEach((i, j) =>
        c[j ? 'lineTo' : 'moveTo'](((i % map.width) + 0.5) * unit, (Math.floor(i / map.width) + 0.5) * unit),
      );
      c.stroke();
    }
    const colors = { key: '#d99826', treasure: '#c56b32', guardian: '#9e3b38', shrine: '#3d8267' };
    for (const room of pop.rooms) {
      if (colors[room.role]) {
        c.fillStyle = colors[room.role];
        c.fillRect(room.cx * unit + 2, room.cy * unit + 2, unit - 4, unit - 4);
      }
    }
    function marker(i, color) {
      c.fillStyle = color;
      c.fillRect((i % map.width) * unit + 1, Math.floor(i / map.width) * unit + 1, unit - 2, unit - 2);
    }
    marker(map.start, '#337d8f');
    marker(end, '#b95835');
    caption.textContent =
      map.rooms.length +
      ' rooms placed · ' +
      (path.length - 1) +
      ' steps from blue entrance to orange exit · max BFS depth ' +
      pop.maxDist +
      '. Click a floor cell to move the exit.';
    manifest.replaceChildren(
      el('tr', {}, ...['Room', 'Encounter', 'Center (x, y)', 'Size', 'Steps from start'].map((h) => el('th', { scope: 'col' }, h))),
      ...pop.rooms.map((r) =>
        el(
          'tr',
          {},
          el('td', {}, String(r.index + 1)),
          el('td', {}, r.label),
          el('td', {}, `${r.cx}, ${r.cy}`),
          el('td', {}, `${r.w}×${r.h}`),
          el('td', {}, String(r.dist)),
        ),
      ),
    );
  }
  function rebuild() {
    frame.replaceChildren();
    map = generate(s);
    end = map.end;
    draw();
    save();
  }
  function numeric(label, key, min, max) {
    const node = input(
      'number',
      s[key],
      (v) => {
        const n = Number(v);
        if (v !== '' && Number.isInteger(n) && n >= min && n <= max) {
          s[key] = n;
          rebuild();
        }
      },
      { min, max, step: 1 },
    );
    node.addEventListener('change', () => (node.value = s[key]));
    return [field(label, node), node];
  }
  const [seedField, seed] = numeric('Seed', 'seed', 0, 999999);
  tools.append(
    seedField,
    button('Roll new seed', () => {
      s.seed = Math.floor(Math.random() * 1000000);
      seed.value = s.seed;
      rebuild();
    }),
    numeric('Width (tiles)', 'width', 24, 96)[0],
    numeric('Height (tiles)', 'height', 20, 72)[0],
    numeric('Room target', 'rooms', 2, 60)[0],
    numeric('Extra corridor attempts', 'loops', 0, 10)[0],
    field(
      'Shortest path',
      select(
        [
          ['on', 'Show'],
          ['off', 'Hide'],
        ],
        'on',
        (v) => {
          showPath = v === 'on';
          draw();
        },
      ),
    ),
    field(
      'Distance heatmap',
      select(
        [
          ['off', 'Standard floor'],
          ['on', 'BFS distance gradient'],
        ],
        'off',
        (v) => {
          heatmap = v === 'on';
          draw();
        },
      ),
    ),
    button('Play dungeon', () => {
      const game = el('iframe', {
        title: 'Dungeon expedition playtest',
        sandbox: 'allow-scripts',
        srcdoc: exportDungeonGame(map, end, s.seed),
      });
      frame.replaceChildren(game);
      game.focus();
      game.scrollIntoView({ block: 'nearest' });
    }),
    button('Export playable HTML', () =>
      saveFile('dungeon-' + s.seed + '.html', exportDungeonGame(map, end, s.seed), 'text/html'),
    ),
    button('Export level JSON', () => {
      const point = (i) => ({ x: i % map.width, y: Math.floor(i / map.width) });
      const pop = populateRooms(map, end, s.seed);
      saveFile(
        'level.json',
        JSON.stringify(
          {
            version: 1,
            settings: s,
            legend: { wall: 0, floor: 1 },
            width: map.width,
            height: map.height,
            tiles: map.tiles,
            rooms: pop.rooms,
            start: point(map.start),
            exit: point(end),
          },
          null,
          2,
        ),
      );
    }),
    button('Export tile CSV', () => {
      const rows = Array.from({ length: map.height }, (_, y) =>
        map.tiles.slice(y * map.width, (y + 1) * map.width).join(','),
      );
      saveFile('tiles.csv', rows.join('\n'), 'text/csv');
    }),
    button('Export preview PNG', () => savePNG(canvas, 'dungeon.png')),
  );
  function setExit(x, y) {
    if (x < 0 || y < 0 || x >= map.width || y >= map.height) return;
    const i = y * map.width + x;
    if (!map.tiles[i]) {
      status.textContent = 'Choose a walkable floor cell.';
      return;
    }
    end = i;
    status.textContent = '';
    save();
    draw();
  }
  canvas.onclick = (e) => setExit(...coords(canvas, e, map.width, map.height));
  stage.append(el('div', { className: 'cr-preview' }, canvas), caption, status, frame, manifest);
  keyboardGrid(
    canvas,
    () => [map.width, map.height],
    setExit,
    (x, y) => {
      const i = y * map.width + x;
      return i === end ? 'exit' : i === map.start ? 'entrance' : map.tiles[i] ? 'floor' : 'wall';
    },
  );
  draw();
}
