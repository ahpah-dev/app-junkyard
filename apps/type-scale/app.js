import {
  button,
  draft,
  el,
  field,
  input,
  persist,
  saveFile,
  select,
  studio,
} from '../../shared/creative.js';
import { buildScale, initial, ratios, valid } from './scale.js';

export function mount(root, ctx) {
  const { tools, stage, status } = studio(root);
  const s = draft(ctx, initial, valid);
  const specimenBox = el('div', { className: 'cr-preview stack' });
  const table = el('table');
  const caption = el('p', { className: 'cr-caption' });
  let ramp = [];

  function draw() {
    ramp = buildScale(s);
    caption.textContent =
      'Previewing at ' +
      s.previewViewport +
      ' px viewport · fluid range ' +
      s.minViewport +
      ' px → ' +
      s.maxViewport +
      ' px';
    specimenBox.replaceChildren(
      ...[...ramp].reverse().map((step) =>
        el(
          'div',
          { style: 'border-bottom:1px solid #8883;padding-bottom:8px' },
          el(
            'small',
            { className: 'cr-caption' },
            `${step.token} · ${step.currentPx}px (lh ${step.lineHeight})`,
          ),
          el(
            'div',
            {
              style: `font-size:${step.currentPx}px;line-height:${step.lineHeight};font-weight:${step.exponent >= 2 ? 700 : 400};overflow-wrap:anywhere`,
            },
            s.specimen || 'The quick brown fox jumps over the lazy dog.',
          ),
        ),
      ),
    );
    table.replaceChildren(
      el(
        'tr',
        {},
        ...['Token', 'Min (px)', 'At preview', 'Max (px)', 'CSS clamp()'].map((h) => el('th', { scope: 'col' }, h)),
      ),
      ...ramp.map((step) =>
        el(
          'tr',
          {},
          el('td', {}, '--' + step.token),
          el('td', {}, String(step.minPx)),
          el('td', {}, step.currentPx + ' px'),
          el('td', {}, String(step.maxPx)),
          el('td', {}, el('code', {}, step.clampCss)),
        ),
      ),
    );
    persist(ctx, s, status);
  }

  const update = (k, cast = (v) => v) => (v) => {
    const next = { ...s, [k]: cast(v) };
    if (valid(next)) {
      s[k] = next[k];
      draw();
    }
  };

  tools.append(
    field('Token prefix', input('text', s.prefix, update('prefix'), { maxlength: 24 })),
    field('Specimen text', input('text', s.specimen, update('specimen'), { maxlength: 140 })),
    field('Preview viewport (px)', input('range', s.previewViewport, update('previewViewport', Number), { min: 320, max: 1600, step: 10 })),
    field('Min base size (px)', input('number', s.minBasePx, update('minBasePx', Number), { min: 10, max: 32, step: 0.5 })),
    field('Max base size (px)', input('number', s.maxBasePx, update('maxBasePx', Number), { min: 10, max: 32, step: 0.5 })),
    field('Mobile scale ratio', select(ratios, String(s.minRatio), update('minRatio', Number))),
    field('Desktop scale ratio', select(ratios, String(s.maxRatio), update('maxRatio', Number))),
    field('Min viewport (px)', input('number', s.minViewport, update('minViewport', Number), { min: 240, max: 1200, step: 10 })),
    field('Max viewport (px)', input('number', s.maxViewport, update('maxViewport', Number), { min: 640, max: 2560, step: 10 })),
    button('Export CSS tokens', () => {
      const css =
        ':root {\n' +
        ramp.map((step) => `  --${step.token}: ${step.clampCss};`).join('\n') +
        '\n}\n';
      saveFile('type-scale.css', css, 'text/css');
    }),
    button('Export JSON tokens', () => {
      const json = Object.fromEntries(
        ramp.map((step) => [
          step.token,
          { clamp: step.clampCss, minPx: step.minPx, maxPx: step.maxPx, lineHeight: step.lineHeight },
        ]),
      );
      saveFile('type-scale.json', JSON.stringify(json, null, 2));
    }),
  );

  stage.append(caption, specimenBox, table, status);
  draw();
}
