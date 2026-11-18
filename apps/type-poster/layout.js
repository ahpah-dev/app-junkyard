import { escapeXML, hexColor } from '../../shared/creative.js';
export const initial = {
  title: 'Sound in\nMotion',
  kicker: 'FIELD RECORDINGS   /   VOL. 04',
  footer: 'North Pier Studio · Autumn session',
  layout: 'orbit',
  format: 'portrait',
  face: 'serif',
  paper: '#e7dfc9',
  ink: '#183e3d',
  accent: '#df5b42',
};
export const formats = {
  portrait: [720, 900],
  square: [800, 800],
  landscape: [960, 600],
};
export const faces = {
  serif: 'Georgia,serif',
  sans: 'Arial,sans-serif',
  mono: 'monospace',
};
export function valid(s) {
  return (
    s &&
    typeof s.title === 'string' &&
    s.title.length <= 100 &&
    typeof s.kicker === 'string' &&
    s.kicker.length <= 80 &&
    typeof s.footer === 'string' &&
    s.footer.length <= 100 &&
    Object.hasOwn(formats, s.format) &&
    ['orbit', 'steps', 'band'].includes(s.layout) &&
    Object.hasOwn(faces, s.face) &&
    [s.paper, s.ink, s.accent].every(hexColor)
  );
}
export function posterSVG(s, measure) {
  if (!valid(s)) throw Error('Invalid poster settings');
  const [w, h] = formats[s.format],
    pad = Math.round(w * 0.07),
    safe = w - 2 * pad;
  const font = faces[s.face],
    lines = (s.title || ' ').split('\n');
  const maxWidth = Math.max(1, ...lines.map((t) => measure(t, font, true)));
  const size = Math.min(150, safe / maxWidth, (h * 0.42) / (lines.length * 1.05));
  const titleY = h * 0.77 - (lines.length - 1) * size * 1.05;
  const small = (t, y, nominal) =>
    '<text x="' +
    pad +
    '" y="' +
    y +
    '" font-family="Arial,sans-serif" font-size="' +
    Math.min(nominal, safe / Math.max(1, measure(t, 'Arial,sans-serif', false))) +
    '">' +
    escapeXML(t) +
    '</text>';
  let graphic;
  if (s.layout === 'orbit')
    graphic =
      '<circle cx="' +
      w * 0.74 +
      '" cy="' +
      h * 0.27 +
      '" r="' +
      Math.min(w, h) * 0.18 +
      '" fill="none" stroke="' +
      s.accent +
      '" stroke-width="' +
      h * 0.08 +
      '"/>';
  else if (s.layout === 'steps')
    graphic = Array.from(
      { length: 5 },
      (_, i) =>
        '<rect x="' +
        (pad + i * safe * 0.15) +
        '" y="' +
        (h * 0.17 + i * h * 0.032) +
        '" width="' +
        safe * 0.35 +
        '" height="' +
        h * 0.045 +
        '"/>',
    ).join('');
  else
    graphic =
      '<path d="M0 ' + h * 0.36 + 'L' + w + ' ' + h * 0.12 + 'V' + h * 0.24 + 'L0 ' + h * 0.48 + 'Z"/>';
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    w +
    '" height="' +
    h +
    '" viewBox="0 0 ' +
    w +
    ' ' +
    h +
    '"><rect width="100%" height="100%" fill="' +
    s.paper +
    '"/><g fill="' +
    s.accent +
    '">' +
    graphic +
    '</g><g fill="' +
    s.ink +
    '">' +
    small(s.kicker, h * 0.095, 18) +
    lines
      .map(
        (t, i) =>
          '<text x="' +
          pad +
          '" y="' +
          (titleY + i * size * 1.05) +
          '" font-family="' +
          font +
          '" font-weight="bold" font-size="' +
          size +
          '">' +
          escapeXML(t) +
          '</text>',
      )
      .join('') +
    '<path d="M' +
    pad +
    ' ' +
    h * 0.865 +
    'H' +
    (w - pad) +
    '" stroke="' +
    s.ink +
    '" stroke-width="2"/>' +
    small(s.footer, h * 0.93, 17) +
    '</g></svg>'
  );
}
