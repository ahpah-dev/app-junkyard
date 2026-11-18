import {
  button,
  downloadSVGAsPNG,
  draft,
  el,
  field,
  input,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { initial, patternMetrics, patternSVG, valid } from './pattern.js';
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root),
    s = draft(ctx, initial, valid);
  if (!s.symmetry) s.symmetry = 'random';
  let repeats = 3;
  const preview = el('div', {
      className: 'cr-preview',
      'aria-label': 'Repeating tile preview',
    }),
    caption = el('p', { className: 'cr-caption' });
  function draw() {
    preview.innerHTML = patternSVG(s, repeats);
    const m = patternMetrics(s);
    caption.textContent =
      repeats +
      ' × ' +
      repeats +
      ' repeats · ' +
      m.tilePx +
      ' px master tile · ' +
      m.primaryCount +
      ' primary / ' +
      m.accentCount +
      ' accent cells (' +
      m.symmetry +
      ')';
    persist(ctx, s, status);
  }
  const change = (k) => (v) => {
    s[k] = v;
    draw();
  };
  const seedInput = input(
    'number',
    s.seed,
    (v) => {
      const n = Number(v);
      if (v !== '' && Number.isInteger(n) && n >= 0 && n <= 999999) change('seed')(n);
    },
    { min: 0, max: 999999, step: 1 },
  );
  seedInput.addEventListener('change', () => {
    seedInput.value = s.seed;
  });
  tools.append(
    field(
      'Motif',
      select(
        [
          ['arc', 'Quarter circles'],
          ['diamond', 'Cut diamonds'],
          ['cross', 'Cross weave'],
          ['truchet', 'Truchet double-arc'],
          ['hex', 'Hex lattice'],
          ['bauhaus', 'Bauhaus blocks'],
        ],
        s.motif,
        change('motif'),
      ),
    ),
    field(
      'Symmetry',
      select(
        [
          ['random', 'Seeded stochastic'],
          ['mirror', '4-quadrant mirror'],
          ['rotational', '4-fold rotational'],
        ],
        s.symmetry,
        change('symmetry'),
      ),
    ),
    field(
      'Cells per tile',
      select(
        [2, 4, 6, 8].map((n) => [n, n + ' × ' + n]),
        s.cells,
        (v) => change('cells')(Number(v)),
      ),
    ),
    field(
      'Preview grid',
      select(
        [2, 3, 4].map((n) => [n, n + ' × ' + n]),
        repeats,
        (v) => {
          repeats = Number(v);
          draw();
        },
      ),
    ),
    field('Paper', input('color', s.paper, change('paper'))),
    field('Primary ink', input('color', s.ink, change('ink'))),
    field('Accent', input('color', s.accent, change('accent'))),
    field(
      'Primary ink share',
      input('range', s.density, (v) => change('density')(Number(v)), {
        min: 0,
        max: 100,
      }),
    ),
    field('Layout seed', seedInput),
    button('Shuffle layout', () => {
      s.seed = Math.floor(Math.random() * 1000000);
      seedInput.value = s.seed;
      draw();
    }),
    button('Export tile SVG', () => saveFile('pattern.svg', patternSVG(s), 'image/svg+xml')),
    button('Export PNG (1024px)', () => downloadSVGAsPNG(patternSVG(s, 2), 1024, 1024, 'pattern.png')),
    button('Export CSS', () =>
      saveFile(
        'pattern.css',
        '.pattern {\n  background-image: url("data:image/svg+xml,' +
          encodeURIComponent(patternSVG(s)) +
          '");\n  background-repeat: repeat;\n}\n',
        'text/css',
      ),
    ),
  );
  stage.append(preview, caption, status);
  draw();
}
