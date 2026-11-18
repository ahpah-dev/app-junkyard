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
  savePNG,
  select,
  studio,
} from '../../shared/creative.js';
import { animatedSVG, atlas, initialProject, size, transformFrame, valid } from './frames.js';

function drawFrame(c, pixels, scale, x0 = 0, y0 = 0) {
  pixels.forEach((v, i) => {
    if (v) {
      c.fillStyle = v;
      c.fillRect(x0 + (i % size) * scale, y0 + Math.floor(i / size) * scale, scale, scale);
    }
  });
}
function floodFrame(pixels, start, replacement) {
  const target = pixels[start];
  if (target === undefined || target === replacement) return;
  const pending = [start];
  pixels[start] = replacement;
  while (pending.length) {
    const i = pending.pop(),
      x = i % size;
    for (const n of [x > 0 ? i - 1 : -1, x < size - 1 ? i + 1 : -1, i - size, i + size]) {
      if (n >= 0 && n < pixels.length && pixels[n] === target) {
        pixels[n] = replacement;
        pending.push(n);
      }
    }
  }
}

export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let p = draft(ctx, initialProject(), valid),
    active = 0,
    playing = false,
    timer,
    ink = '#e9aa58',
    mode = 'ink',
    onion = true;
  const canvas = el('canvas', {
      width: 320,
      height: 320,
      'aria-label': '16 by 16 frame editor',
    }),
    timeline = el('div', { className: 'cr-row', 'aria-label': 'Timeline' }),
    label = el('p', { className: 'cr-caption' }),
    c = canvas.getContext('2d');
  stage.append(el('div', { className: 'cr-preview' }, canvas), label, timeline, status);
  const inkInput = input('color', ink, (v) => (ink = v));
  const toolSelect = select(
    [
      ['ink', 'Pencil'],
      ['erase', 'Eraser'],
      ['fill', 'Flood fill'],
      ['pick', 'Eyedropper'],
    ],
    mode,
    (v) => (mode = v),
  );
  function save() {
    persist(ctx, p, status);
  }
  function draw() {
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        c.fillStyle = (x + y) % 2 ? '#e8e4d7' : '#f5f1e6';
        c.fillRect(x * 20, y * 20, 20, 20);
      }
    if (onion && !playing && active > 0) {
      c.globalAlpha = 0.24;
      drawFrame(c, p.frames[active - 1], 20);
      c.globalAlpha = 1;
    }
    drawFrame(c, p.frames[active], 20);
    label.textContent =
      (playing ? 'Playing' : 'Editing') +
      ' frame ' +
      (active + 1) +
      ' of ' +
      p.frames.length +
      ' · ' +
      p.fps +
      ' fps';
    [...timeline.children].forEach((b, i) => b.setAttribute('aria-pressed', String(active === i)));
  }
  function stop() {
    clearInterval(timer);
    playing = false;
    play.textContent = 'Play loop';
  }
  function loop() {
    stop();
    playing = true;
    play.textContent = 'Pause';
    draw();
    timer = setInterval(() => {
      if (!canvas.isConnected) {
        stop();
        return;
      }
      active = (active + 1) % p.frames.length;
      draw();
    }, 1000 / p.fps);
  }
  function paint(x, y) {
    if (playing || x < 0 || x >= size || y < 0 || y >= size) return;
    const idx = y * size + x;
    if (mode === 'pick') {
      const col = p.frames[active][idx];
      if (col) {
        ink = col;
        inkInput.value = col;
        mode = 'ink';
        toolSelect.value = 'ink';
      }
      return;
    }
    if (mode === 'fill') floodFrame(p.frames[active], idx, ink);
    else p.frames[active][idx] = mode === 'erase' ? null : ink;
    draw();
  }
  let last = null;
  paintEvents(
    canvas,
    size,
    size,
    (x, y) => {
      last = [x, y];
      paint(x, y);
    },
    (x, y) => {
      if (mode === 'fill' || mode === 'pick') return;
      if (x < 0 || x >= size || y < 0 || y >= size) {
        last = null;
        return;
      }
      const [a, b] = last || [x, y],
        count = Math.max(1, Math.abs(x - a), Math.abs(y - b));
      for (let n = 1; n <= count; n++)
        paint(Math.round(a + ((x - a) * n) / count), Math.round(b + ((y - b) * n) / count));
      last = [x, y];
    },
    save,
  );
  const play = button('Play loop', () => {
    if (playing) {
      stop();
      draw();
    } else loop();
  });
  function refresh() {
    timeline.replaceChildren(
      ...p.frames.map((_, i) => {
        const b = button(String(i + 1), () => {
          stop();
          active = i;
          draw();
        });
        b.setAttribute('aria-label', 'Frame ' + (i + 1));
        return b;
      }),
    );
    draw();
  }
  function insert(copy) {
    stop();
    if (p.frames.length >= 32) {
      status.textContent = 'Maximum 32 frames.';
      draw();
      return;
    }
    p.frames.splice(active + 1, 0, copy ? p.frames[active].slice() : Array(256).fill(null));
    active++;
    save();
    refresh();
  }
  function shift(by) {
    stop();
    const dest = active + by;
    if (dest >= 0 && dest < p.frames.length) {
      [p.frames[active], p.frames[dest]] = [p.frames[dest], p.frames[active]];
      active = dest;
      save();
    }
    refresh();
  }
  function applyTransform(kind) {
    stop();
    p.frames[active] = transformFrame(p.frames[active], kind);
    save();
    draw();
  }
  const fps = input(
    'number',
    p.fps,
    (v) => {
      const n = Number(v);
      if (v && Number.isInteger(n) && n >= 1 && n <= 24) {
        p.fps = n;
        save();
        if (playing) loop();
        draw();
      }
    },
    { min: 1, max: 24, step: 1 },
  );
  fps.addEventListener('change', () => (fps.value = p.fps));
  tools.append(
    field('Ink', inkInput),
    field('Tool', toolSelect),
    field(
      'Previous frame overlay',
      select(
        [
          ['on', 'On'],
          ['off', 'Off'],
        ],
        'on',
        (v) => {
          onion = v === 'on';
          draw();
        },
      ),
    ),
    field('Frames per second', fps),
    play,
    el(
      'div',
      { className: 'cr-row' },
      button('←', () => applyTransform('shiftL')),
      button('→', () => applyTransform('shiftR')),
      button('↑', () => applyTransform('shiftU')),
      button('↓', () => applyTransform('shiftD')),
    ),
    el(
      'div',
      { className: 'cr-row' },
      button('Flip H', () => applyTransform('flipH')),
      button('Flip V', () => applyTransform('flipV')),
      button('Rotate 90°', () => applyTransform('rotateCW')),
    ),
    el(
      'div',
      { className: 'cr-row' },
      button('Blank frame', () => insert(false)),
      button('Duplicate', () => insert(true)),
    ),
    el(
      'div',
      { className: 'cr-row' },
      button('Move earlier', () => shift(-1)),
      button('Move later', () => shift(1)),
    ),
    button('Delete frame', () => {
      stop();
      if (p.frames.length === 1) {
        status.textContent = 'Keep at least one frame.';
        draw();
        return;
      }
      p.frames.splice(active, 1);
      active = Math.min(active, p.frames.length - 1);
      save();
      refresh();
    }),
    button('Export sprite sheet', () => {
      const a = atlas(p),
        out = el('canvas', { width: a.width, height: a.height }),
        ctx2 = out.getContext('2d');
      a.frames.forEach((r, i) => drawFrame(ctx2, p.frames[i], 1, r.x, r.y));
      savePNG(out, 'animation.png');
    }),
    button('Export animated SVG', () => saveFile('animation.svg', animatedSVG(p, 8), 'image/svg+xml')),
    button('Export atlas metadata', () => saveFile('animation.json', JSON.stringify(atlas(p), null, 2))),
    button('Save editable project', () => saveFile('animation-project.json', JSON.stringify(p))),
    importFile(
      'Open editable project',
      (data) => {
        if (!valid(data)) throw Error('Choose a Flipbook v1 project.');
        stop();
        p = data;
        active = 0;
        fps.value = p.fps;
        save();
        refresh();
      },
      status,
    ),
  );
  keyboardGrid(
    canvas,
    () => [size, size],
    (x, y) => {
      stop();
      paint(x, y);
      save();
    },
    (x, y) => p.frames[active][y * size + x] || 'transparent',
  );
  refresh();
}
