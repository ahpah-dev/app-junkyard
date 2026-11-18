import {
  button,
  draft,
  el,
  escapeXML,
  field,
  hexColor,
  input,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { contrast, harmonyPairings, ramp, simulateCVD, wcagGrade } from './color.js';

const initial = {
  light: '#f8e8c3',
  dark: '#233e49',
  ink: '#131f26',
  steps: 7,
  name: 'tidal',
  cvd: 'none',
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
    table = el('table'),
    pairingsHeading = el('h3', {}, 'Accessible ramp pairings (AA+)'),
    pairingsTable = el('table');
  if (!['none', 'protanopia', 'deuteranopia', 'tritanopia'].includes(s.cvd)) s.cvd = 'none';
  let tokens = {};
  let slug = 'palette';
  function swatchCardSVG() {
    const entries = Object.entries(tokens);
    const w = 720,
      rowH = 54,
      h = 56 + entries.length * rowH;
    const rows = entries
      .map(
        ([k, hex], i) =>
          '<rect x="24" y="' +
          (40 + i * rowH) +
          '" width="672" height="' +
          (rowH - 8) +
          '" rx="6" fill="' +
          hex +
          '"/><text x="42" y="' +
          (68 + i * rowH) +
          '" font-family="sans-serif" font-weight="bold" font-size="16" fill="' +
          (contrast(hex, '#ffffff') >= 4.5 ? '#ffffff' : '#131f26') +
          '">' +
          escapeXML(k) +
          '  ' +
          hex +
          '</text>',
      )
      .join('');
    return (
      '<svg xmlns="http://www.w3.org/2000/svg" width="' +
      w +
      '" height="' +
      h +
      '" viewBox="0 0 ' +
      w +
      ' ' +
      h +
      '"><rect width="100%" height="100%" fill="#f7f6f0"/><text x="24" y="26" font-family="sans-serif" font-weight="bold" font-size="16" fill="#232822">' +
      escapeXML(slug) +
      ' · Oklab Ramp</text>' +
      rows +
      '</svg>'
    );
  }
  function draw() {
    slug =
      s.name
        .toLowerCase()
        .replace(/[^a-z0-9-]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'palette';
    tokens = {};
    swatches.replaceChildren();
    const head = el(
      'tr',
      {},
      ...['Token', 'Color', 'Ink contrast', 'WCAG grade'].map((h) => el('th', { scope: 'col' }, h)),
    );
    table.replaceChildren(head);
    const colors = ramp(s.light, s.dark, s.steps);
    const simInk = simulateCVD(s.ink, s.cvd);
    for (const [i, value] of colors.entries()) {
      const key = slug + '-' + String((i + 1) * 50),
        ratio = contrast(value, s.ink),
        simVal = simulateCVD(value, s.cvd);
      tokens[key] = value;
      const block = el('div', {}, 'Aa · ' + key + ' (' + value + ')');
      block.style.cssText =
        'background:' + simVal + ';color:' + simInk + ';padding:9px 16px;font: bold 20px Georgia,serif';
      swatches.append(block);
      table.append(
        el(
          'tr',
          {},
          el('td', {}, key),
          el('td', {}, value + (s.cvd !== 'none' ? ' → ' + simVal : '')),
          el('td', {}, ratio.toFixed(2) + ' : 1'),
          el('td', {}, wcagGrade(ratio)),
        ),
      );
    }
    const pairs = harmonyPairings(colors);
    pairingsTable.replaceChildren(
      el('tr', {}, ...['Background', 'Foreground', 'Ratio', 'Grade'].map((h) => el('th', { scope: 'col' }, h))),
      ...pairs.slice(0, 12).map((p) => {
        const bgKey = slug + '-' + String((p.firstIndex + 1) * 50);
        const fgKey = slug + '-' + String((p.secondIndex + 1) * 50);
        return el(
          'tr',
          {},
          el('td', {}, bgKey + ' (' + p.first + ')'),
          el('td', {}, fgKey + ' (' + p.second + ')'),
          el('td', {}, p.ratio.toFixed(2) + ' : 1'),
          el('td', {}, p.grade),
        );
      }),
    );
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
    field(
      'Vision simulation',
      select(
        [
          ['none', 'Normal vision'],
          ['protanopia', 'Protanopia (red-weak)'],
          ['deuteranopia', 'Deuteranopia (green-weak)'],
          ['tritanopia', 'Tritanopia (blue-weak)'],
        ],
        s.cvd,
        change('cvd'),
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
    button('Export W3C DTCG tokens', () => {
      const dtcg = {
        [slug]: Object.fromEntries(
          Object.entries(tokens).map(([k, v]) => [k.replace(slug + '-', ''), { $type: 'color', $value: v }]),
        ),
      };
      saveFile('colors.tokens.json', JSON.stringify(dtcg, null, 2));
    }),
    button('Export SVG swatch card', () => saveFile('palette-card.svg', swatchCardSVG(), 'image/svg+xml')),
  );
  stage.append(swatches, table, pairingsHeading, pairingsTable, status);
  draw();
}
