import { button, draft, el, field, input, persist, saveFile, select, studio } from '../../shared/creative.js';
import { initial, patternSVG, valid } from './pattern.js';
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root),
    s = draft(ctx, initial, valid);
  const preview = el('div', {
      className: 'cr-preview',
      'aria-label': 'Repeating tile preview',
    }),
    caption = el('p', { className: 'cr-caption' });
  function draw() {
    preview.innerHTML = patternSVG(s, 3);
    caption.textContent = '3 × 3 repeats · ' + s.cells * 48 + ' px master tile';
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
        ],
        s.motif,
        change('motif'),
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
