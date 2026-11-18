import { button, draft, el, field, input, persist, saveFile, select, studio } from '../../shared/creative.js';
import { faces, formats, initial, posterSVG, valid } from './layout.js';
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root),
    s = draft(ctx, initial, valid),
    c = document.createElement('canvas').getContext('2d');
  const measure = (text, font, bold) => {
    c.font = (bold ? 'bold ' : '') + '100px ' + font;
    return c.measureText(text).width / 100;
  };
  const preview = el('div', { className: 'cr-preview' });
  let svg = '';
  function render() {
    svg = posterSVG(s, measure);
    preview.innerHTML = svg;
    persist(ctx, s, status);
  }
  const update = (k) => (v) => {
    s[k] = v;
    render();
  };
  const list = (a) => Object.keys(a).map((x) => [x, x[0].toUpperCase() + x.slice(1)]);
  const title = el('textarea', {
    rows: 3,
    maxlength: 100,
    oninput: (e) => update('title')(e.target.value),
  });
  title.value = s.title;
  tools.append(
    field('Headline · line breaks supported', title),
    field('Top line', input('text', s.kicker, update('kicker'), { maxlength: 80 })),
    field('Footer', input('text', s.footer, update('footer'), { maxlength: 100 })),
    field(
      'Composition',
      select(
        [
          ['orbit', 'Orbit'],
          ['steps', 'Steps'],
          ['band', 'Band'],
        ],
        s.layout,
        update('layout'),
      ),
    ),
    field('Artboard', select(list(formats), s.format, update('format'))),
    field('Type family', select(list(faces), s.face, update('face'))),
    field('Paper', input('color', s.paper, update('paper'))),
    field('Text', input('color', s.ink, update('ink'))),
    field('Accent', input('color', s.accent, update('accent'))),
    button('Export vector poster', () => saveFile('poster.svg', svg, 'image/svg+xml')),
  );
  stage.append(preview, status);
  render();
}
