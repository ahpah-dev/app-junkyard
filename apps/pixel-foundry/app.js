import {
  button,
  draft,
  el,
  field,
  hexColor,
  input,
  keyboardGrid,
  paintEvents,
  persist,
  savePNG,
  select,
  studio,
} from '../../shared/creative.js';
import { flood, line } from './bitmap.js';

const side = 24,
  scale = 20;
function initial() {
  const sprite = Array(side * side).fill(null);
  const stamp = [
    '....ooo....',
    '...oaaao...',
    '..obbbbbo..',
    '.obccbccbo.',
    '.obccbccbo.',
    '.obbbbbbbo.',
    '..obbdbbo..',
    '...ooooo...',
    '..oa...ao..',
  ];
  const ink = {
    o: '#293d40',
    a: '#df6743',
    b: '#f7c985',
    c: '#fff5da',
    d: '#865339',
  };
  stamp.forEach((row, y) =>
    [...row].forEach((c, x) => {
      if (ink[c]) sprite[(y + 7) * side + x + 6] = ink[c];
    }),
  );
  return sprite;
}
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let pixels = draft(
    ctx,
    initial(),
    (d) => Array.isArray(d) && d.length === side * side && d.every((x) => x === null || hexColor(x)),
  );
  let color = '#df6743',
    mode = 'brush',
    mirror = false,
    outputScale = 8,
    last = null,
    before = '';
  const history = [],
    future = [];
  const canvas = el('canvas', {
    width: side * scale,
    height: side * scale,
    'aria-label': '24 by 24 sprite editor',
  });
  const undo = button('Undo', () => travel(history, future)),
    redo = button('Redo', () => travel(future, history));
  function refresh() {
    const c = canvas.getContext('2d');
    pixels.forEach((v, i) => {
      const x = i % side,
        y = Math.floor(i / side);
      c.fillStyle = v || ((x + y) % 2 ? '#e6e4dd' : '#f5f3ee');
      c.fillRect(x * scale, y * scale, scale, scale);
      c.strokeStyle = 'rgba(60,65,57,.10)';
      c.strokeRect(x * scale + 0.5, y * scale + 0.5, scale - 1, scale - 1);
    });
    undo.disabled = !history.length;
    redo.disabled = !future.length;
  }
  function commit() {
    if (before === JSON.stringify(pixels)) return;
    history.push(before);
    if (history.length > 50) history.shift();
    future.length = 0;
    persist(ctx, pixels, status);
    refresh();
  }
  function travel(from, to) {
    if (!from.length) return;
    to.push(JSON.stringify(pixels));
    pixels = JSON.parse(from.pop());
    persist(ctx, pixels, status);
    refresh();
  }
  function paint(x, y) {
    if (x < 0 || x >= side || y < 0 || y >= side) return;
    const apply = (px, py) => {
      const index = py * side + px;
      if (mode === 'fill') flood(pixels, side, index, color);
      else pixels[index] = mode === 'erase' ? null : color;
    };
    const plot = (px, py) => {
      apply(px, py);
      if (mirror) apply(side - px - 1, py);
    };
    if (last && mode !== 'fill') line(...last, x, y, plot);
    else plot(x, y);
    last = [x, y];
    refresh();
  }
  paintEvents(
    canvas,
    side,
    side,
    (x, y) => {
      before = JSON.stringify(pixels);
      last = null;
      paint(x, y);
    },
    (x, y) => {
      if (mode !== 'fill') paint(x, y);
    },
    commit,
  );
  const colorInput = input('color', color, (v) => (color = v));
  const swatches = el('div', { className: 'cr-row' });
  ['#293d40', '#df6743', '#f7c985', '#fff5da', '#749b8b', '#775d83'].forEach((v) => {
    const b = button('', () => {
      color = v;
      colorInput.value = v;
    });
    b.setAttribute('aria-label', 'Paint with ' + v);
    b.title = v;
    b.style.cssText = 'width:28px;height:28px;padding:0;background:' + v;
    swatches.append(b);
  });
  tools.append(
    field(
      'Tool',
      select(
        [
          ['brush', 'Pencil'],
          ['erase', 'Eraser'],
          ['fill', 'Flood fill'],
        ],
        mode,
        (v) => (mode = v),
      ),
    ),
    field('Ink', colorInput),
    swatches,
    field(
      'Mirror across center',
      select(
        [
          ['off', 'Off'],
          ['on', 'On'],
        ],
        'off',
        (v) => (mirror = v === 'on'),
      ),
    ),
    el('div', { className: 'cr-row' }, undo, redo),
    field(
      'PNG scale',
      select(
        [1, 2, 4, 8, 16].map((n) => [n, side * n + ' × ' + side * n]),
        outputScale,
        (v) => (outputScale = Number(v)),
      ),
    ),
    button('Export PNG', () => {
      const out = el('canvas', {
        width: side * outputScale,
        height: side * outputScale,
      });
      const c = out.getContext('2d');
      pixels.forEach((v, i) => {
        if (v) {
          c.fillStyle = v;
          c.fillRect((i % side) * outputScale, Math.floor(i / side) * outputScale, outputScale, outputScale);
        }
      });
      savePNG(out, 'sprite.png');
    }),
  );
  stage.append(
    el('div', { className: 'cr-preview' }, canvas),
    el('p', { className: 'cr-caption' }, 'Drag to paint. Checkerboard cells export as transparent pixels.'),
    status,
  );
  keyboardGrid(
    canvas,
    () => [side, side],
    (x, y) => {
      before = JSON.stringify(pixels);
      last = null;
      paint(x, y);
      commit();
    },
    (x, y) => pixels[y * side + x] || 'transparent',
  );
  refresh();
}
