import {
  button,
  draft,
  el,
  field,
  hexColor,
  importFile,
  input,
  keyboardGrid,
  paintEvents,
  persist,
  saveFile,
  savePNG,
  select,
  studio,
} from '../../shared/creative.js';
import { ellipse, flip, flood, line, paletteCounts, rect, rotateCW, shift } from './bitmap.js';

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
const validSprite = (d) =>
  Array.isArray(d) && d.length === side * side && d.every((x) => x === null || hexColor(x));

export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let pixels = draft(ctx, initial(), validSprite);
  let color = '#df6743',
    mode = 'brush',
    symmetry = 'off',
    outputScale = 8,
    last = null,
    anchor = null,
    snapshotBeforeDrag = null,
    before = '';
  const history = [],
    future = [];
  const canvas = el('canvas', {
    width: side * scale,
    height: side * scale,
    'aria-label': '24 by 24 sprite editor',
  });
  const undo = button('Undo', () => travel(history, future)),
    redo = button('Redo', () => travel(future, history)),
    paletteSummary = el('p', { className: 'cr-caption' });
  const colorInput = input('color', color, (v) => (color = v));
  const toolSelect = select(
    [
      ['brush', 'Pencil'],
      ['erase', 'Eraser'],
      ['fill', 'Flood fill'],
      ['line', 'Line'],
      ['rect', 'Rectangle'],
      ['rectFill', 'Filled rectangle'],
      ['circle', 'Ellipse'],
      ['pick', 'Eyedropper'],
    ],
    mode,
    (v) => (mode = v),
  );

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
    const used = paletteCounts(pixels);
    const filled = used.reduce((s, u) => s + u.count, 0);
    paletteSummary.textContent =
      filled +
      ' / ' +
      side * side +
      ' painted pixels · ' +
      used.length +
      ' active color' +
      (used.length === 1 ? '' : 's');
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
  function applySymmetry(px, py, fn) {
    fn(px, py);
    if (symmetry === 'horiz' || symmetry === 'quad') fn(side - px - 1, py);
    if (symmetry === 'quad') {
      fn(px, side - py - 1);
      fn(side - px - 1, side - py - 1);
    }
  }
  function setPixel(px, py) {
    if (px < 0 || px >= side || py < 0 || py >= side) return;
    pixels[py * side + px] = mode === 'erase' ? null : color;
  }
  function paint(x, y, isDrag = false) {
    if (x < 0 || x >= side || y < 0 || y >= side) return;
    if (mode === 'pick') {
      const picked = pixels[y * side + x];
      if (picked) {
        color = picked;
        colorInput.value = picked;
        mode = 'brush';
        toolSelect.value = 'brush';
      }
      return;
    }
    if (mode === 'fill') {
      applySymmetry(x, y, (px, py) => flood(pixels, side, py * side + px, color));
      refresh();
      return;
    }
    if (['line', 'rect', 'rectFill', 'circle'].includes(mode)) {
      if (!isDrag || !anchor) {
        anchor = [x, y];
        snapshotBeforeDrag = pixels.slice();
      } else {
        pixels = snapshotBeforeDrag.slice();
      }
      const plot = (px, py) => applySymmetry(px, py, setPixel);
      if (mode === 'line') line(anchor[0], anchor[1], x, y, plot);
      else if (mode === 'rect') rect(anchor[0], anchor[1], x, y, false, plot);
      else if (mode === 'rectFill') rect(anchor[0], anchor[1], x, y, true, plot);
      else ellipse(anchor[0], anchor[1], x, y, false, plot);
      refresh();
      return;
    }
    const plot = (px, py) => applySymmetry(px, py, setPixel);
    if (last) line(...last, x, y, plot);
    else plot(x, y);
    last = [x, y];
    refresh();
  }
  function transform(fn) {
    before = JSON.stringify(pixels);
    pixels = fn(pixels);
    commit();
  }

  paintEvents(
    canvas,
    side,
    side,
    (x, y) => {
      before = JSON.stringify(pixels);
      last = null;
      anchor = null;
      snapshotBeforeDrag = null;
      paint(x, y, false);
    },
    (x, y) => {
      if (mode !== 'fill' && mode !== 'pick') paint(x, y, true);
    },
    () => {
      anchor = null;
      snapshotBeforeDrag = null;
      commit();
    },
  );
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
    field('Tool', toolSelect),
    field('Ink', colorInput),
    swatches,
    field(
      'Symmetry',
      select(
        [
          ['off', 'Off'],
          ['horiz', 'Horizontal mirror'],
          ['quad', '4-way mirror'],
        ],
        symmetry,
        (v) => (symmetry = v),
      ),
    ),
    el('div', { className: 'cr-row' }, undo, redo),
    el(
      'div',
      { className: 'cr-row' },
      button('←', () => transform((p) => shift(p, side, -1, 0))),
      button('→', () => transform((p) => shift(p, side, 1, 0))),
      button('↑', () => transform((p) => shift(p, side, 0, -1))),
      button('↓', () => transform((p) => shift(p, side, 0, 1))),
    ),
    el(
      'div',
      { className: 'cr-row' },
      button('Flip H', () => transform((p) => flip(p, side, false))),
      button('Flip V', () => transform((p) => flip(p, side, true))),
      button('Rotate 90°', () => transform((p) => rotateCW(p, side))),
      button('Clear', () => transform(() => Array(side * side).fill(null))),
    ),
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
    button('Export SVG', () => {
      const rects = pixels
        .map((v, i) =>
          v ? '<rect x="' + (i % side) + '" y="' + Math.floor(i / side) + '" width="1" height="1" fill="' + v + '"/>' : '',
        )
        .filter(Boolean)
        .join('');
      const svg =
        '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' +
        side +
        ' ' +
        side +
        '" shape-rendering="crispEdges">' +
        rects +
        '</svg>';
      saveFile('sprite.svg', svg, 'image/svg+xml');
    }),
    button('Save project JSON', () => saveFile('sprite-project.json', JSON.stringify(pixels))),
    importFile(
      'Open project JSON',
      (d) => {
        if (!validSprite(d)) throw Error('Choose a 24×24 Pixel Foundry JSON array.');
        before = JSON.stringify(pixels);
        pixels = d;
        commit();
      },
      status,
    ),
  );
  stage.append(
    el('div', { className: 'cr-preview' }, canvas),
    paletteSummary,
    el('p', { className: 'cr-caption' }, 'Drag to paint shapes or pixels. Checkerboard cells export as transparent.'),
    status,
  );
  keyboardGrid(
    canvas,
    () => [side, side],
    (x, y) => {
      before = JSON.stringify(pixels);
      last = null;
      anchor = null;
      paint(x, y, false);
      commit();
    },
    (x, y) => pixels[y * side + x] || 'transparent',
  );
  refresh();
}
