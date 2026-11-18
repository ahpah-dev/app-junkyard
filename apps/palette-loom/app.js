import {
  button,
  draft,
  el,
  field,
  hexColor,
  input,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { contrast, ramp } from './color.js';
const initial = {
  light: '#f8e8c3',
  dark: '#233e49',
  ink: '#131f26',
  steps: 7,
  name: 'tidal',
};
function valid(s) {
  return (
    s &&
    [s.light, s.dark, s.ink].every(hexColor) &&
    [5, 7, 9, 11].includes(s.steps) &&
    typeof s.name === 'string' &&
    s.name.length <= 32
  );
}
export function mount(root, ctx) {
  const { tools, stage, status } = studio(root),
    s = draft(ctx, initial, valid),
    swatches = el('div'),
    table = el('table');
  let tokens = {};
  function draw() {
    const slug =
      s.name
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'palette';
    tokens = {};
    swatches.replaceChildren();
    const head = el(
      'tr',
      {},
      ...['Token', 'Color', 'Ink contrast', 'Normal text AA'].map((h) => el('th', { scope: 'col' }, h)),
    );
    table.replaceChildren(head);
    for (const [i, value] of ramp(s.light, s.dark, s.steps).entries()) {
      const key = slug + '-' + String((i + 1) * 50),
        ratio = contrast(value, s.ink);
      tokens[key] = value;
      const block = el('div', {}, 'Aa');
      block.style.cssText =
        'background:' + value + ';color:' + s.ink + ';padding:8px 16px;font: bold 24px Georgia,serif';
      swatches.append(block);
      table.append(
        el(
          'tr',
          {},
          el('td', {}, key),
          el('td', {}, value),
          el('td', {}, ratio.toFixed(2) + ' : 1'),
          el('td', {}, ratio >= 4.5 ? 'Pass' : 'Below 4.5'),
        ),
      );
    }
    persist(ctx, s, status);
  }
  const change = (k) => (v) => {
    s[k] = v;
    draw();
  };
  tools.append(
    field('Token prefix', input('text', s.name, change('name'), { maxlength: 32 })),
    field('Start color', input('color', s.light, change('light'))),
    field('End color', input('color', s.dark, change('dark'))),
    field('Preview text', input('color', s.ink, change('ink'))),
    field(
      'Steps',
      select(
        [5, 7, 9, 11].map((n) => [n, String(n)]),
        s.steps,
        (v) => change('steps')(Number(v)),
      ),
    ),
    button('Export CSS tokens', () =>
      saveFile(
        'colors.css',
        ':root {\n' +
          Object.entries(tokens)
            .map(([k, v]) => '  --' + k + ': ' + v + ';')
            .join('\n') +
          '\n}\n',
        'text/css',
      ),
    ),
    button('Export JSON', () => saveFile('colors.json', JSON.stringify(tokens, null, 2))),
  );
  stage.append(swatches, table, status);
  draw();
}
