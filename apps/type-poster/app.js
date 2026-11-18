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
import { contrastCheck, faces, formats, initial, posterSVG, presets, valid } from './layout.js';
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  let s = draft(ctx, initial, valid);
  const c = document.createElement('canvas').getContext('2d');
  const measure = (text, font, bold) => {
    c.font = (bold ? 'bold ' : '') + '100px ' + font;
    return c.measureText(text).width / 100;
  };
  const preview = el('div', { className: 'cr-preview' }),
    contrastNote = el('p', { className: 'cr-caption' });
  let svg = '';
  function render() {
    svg = posterSVG(s, measure);
    preview.innerHTML = svg;
    const chk = contrastCheck(s);
    contrastNote.textContent =
      'Text/paper contrast: ' +
      chk.textRatio +
      ':1 (' +
      chk.textGrade +
      ') · Accent/paper: ' +
      chk.accentRatio +
      ':1 (' +
      chk.accentGrade +
      ')';
    persist(ctx, s, status);
  }
  const update = (k) => (v) => {
    s[k] = v;
    render();
  };
  const list = (a) => Object.keys(a).map((x) => [x, x[0].toUpperCase() + x.slice(1)]);
  function buildTools() {
    const title = el('textarea', {
      rows: 3,
      maxlength: 100,
      oninput: (e) => update('title')(e.target.value),
    });
    title.value = s.title;
    tools.replaceChildren(
      field(
        'Load preset',
        select(
          [['', 'Choose preset…'], ...presets.map((p, i) => [String(i), p.name])],
          '',
          (v) => {
            if (!v) return;
            s = structuredClone(presets[Number(v)].values);
            buildTools();
            render();
          },
        ),
      ),
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
            ['swiss', 'Swiss Grid'],
            ['radial', 'Radial Burst'],
            ['construct', 'Constructivist'],
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
      button('Export vector poster (SVG)', () => saveFile('poster.svg', svg, 'image/svg+xml')),
      button('Export PNG (2×)', () => {
        const [w, h] = formats[s.format];
        downloadSVGAsPNG(svg, w * 2, h * 2, 'poster.png');
      }),
      button('Save project JSON', () => saveFile('poster-project.json', JSON.stringify(s, null, 2))),
      importFile(
        'Open project JSON',
        (d) => {
          if (!valid(d)) throw Error('Choose a Type Poster v1 JSON file.');
          s = d;
          buildTools();
          render();
        },
        status,
      ),
    );
  }
  stage.append(preview, contrastNote, status);
  buildTools();
  render();
}
