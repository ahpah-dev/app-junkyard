import {
  button,
  downloadSVGAsPNG,
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
import { badges, fillModes, gridSize, iconSVG, initial, measurePath, pathData, presets, valid } from './vector.js';

export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let p = draft(ctx, initial, valid),
    activePoint = p.points.length - 1,
    showGrid = true;
  const preview = el('div', { className: 'cr-preview', style: 'cursor:crosshair' }),
    caption = el('p', { className: 'cr-caption' }),
    pathBox = el('pre', { className: 'cr-caption' });

  function draw() {
    preview.innerHTML = iconSVG(p, showGrid, activePoint);
    const m = measurePath(p);
    caption.textContent =
      p.points.length +
      ' control points (' +
      m.vertices +
      ' rendered) · perimeter ' +
      m.perimeter +
      ' grid units · click canvas to append point';
    pathBox.textContent = 'path d="' + pathData(p, 10) + '"';
    persist(ctx, p, status);
  }

  preview.addEventListener('click', (e) => {
    const svg = preview.querySelector('svg');
    if (!svg) return;
    const box = svg.getBoundingClientRect();
    const gx = Math.max(0, Math.min(gridSize, Math.round(((e.clientX - box.left) * gridSize) / box.width)));
    const gy = Math.max(0, Math.min(gridSize, Math.round(((e.clientY - box.top) * gridSize) / box.height)));
    const hit = p.points.findIndex((pt) => Math.abs(pt.x - gx) <= 1 && Math.abs(pt.y - gy) <= 1);
    if (hit >= 0) {
      activePoint = hit;
      draw();
      return;
    }
    if (p.points.length >= 32) {
      status.textContent = 'Maximum 32 control points.';
      return;
    }
    p.points.push({ x: gx, y: gy });
    activePoint = p.points.length - 1;
    status.textContent = '';
    draw();
  });

  function rebuildTools() {
    const update = (k) => (v) => {
      p[k] = v;
      draw();
    };
    tools.replaceChildren(
      field(
        'Load preset',
        select(
          [['', 'Choose preset…'], ...presets.map((pr, i) => [String(i), pr.name])],
          '',
          (v) => {
            if (!v) return;
            p = structuredClone(presets[Number(v)].values);
            activePoint = p.points.length - 1;
            rebuildTools();
            draw();
          },
        ),
      ),
      field('Icon slug', input('text', p.name, update('name'), { maxlength: 40 })),
      field(
        'Badge frame',
        select(
          badges.map((b) => [b, b[0].toUpperCase() + b.slice(1)]),
          p.badge,
          update('badge'),
        ),
      ),
      field(
        'Render style',
        select(
          fillModes.map((m) => [m, m[0].toUpperCase() + m.slice(1)]),
          p.fillMode,
          update('fillMode'),
        ),
      ),
      field(
        'Symmetry',
        select(
          [
            ['on', 'Horizontal mirror'],
            ['off', 'Freeform'],
          ],
          p.mirror ? 'on' : 'off',
          (v) => update('mirror')(v === 'on'),
        ),
      ),
      field(
        'Path closure',
        select(
          [
            ['closed', 'Closed shape'],
            ['open', 'Open stroke'],
          ],
          p.closed ? 'closed' : 'open',
          (v) => update('closed')(v === 'closed'),
        ),
      ),
      field(
        'Corner smoothing',
        input('range', p.curve, (v) => update('curve')(Number(v)), { min: 0, max: 1, step: 0.05 }),
      ),
      field(
        'Stroke weight',
        select(
          [1, 2, 3, 4, 5, 6].map((n) => [n, String(n)]),
          p.strokeWidth,
          (v) => update('strokeWidth')(Number(v)),
        ),
      ),
      field('Badge background', input('color', p.bg, update('bg'))),
      field('Stroke color', input('color', p.stroke, update('stroke'))),
      field('Fill color', input('color', p.fill, update('fill'))),
      el(
        'div',
        { className: 'cr-row' },
        button('Pop last point', () => {
          if (p.points.length <= 2) {
            status.textContent = 'Keep at least 2 points.';
            return;
          }
          p.points.pop();
          activePoint = p.points.length - 1;
          draw();
        }),
        button(showGrid ? 'Hide grid' : 'Show grid', () => {
          showGrid = !showGrid;
          rebuildTools();
          draw();
        }),
      ),
      button('Export clean SVG', () => saveFile((p.name || 'icon') + '.svg', iconSVG(p, false), 'image/svg+xml')),
      button('Export PNG (512px)', () =>
        downloadSVGAsPNG(iconSVG(p, false), 512, 512, (p.name || 'icon') + '.png'),
      ),
      button('Save project JSON', () => saveFile((p.name || 'icon') + '.json', JSON.stringify(p, null, 2))),
      importFile(
        'Open project JSON',
        (d) => {
          if (!valid(d)) throw Error('Choose a Bezier Forge v1 project JSON.');
          p = d;
          activePoint = p.points.length - 1;
          rebuildTools();
          draw();
        },
        status,
      ),
    );
  }

  stage.append(preview, caption, pathBox, status);
  rebuildTools();
  draw();
}
