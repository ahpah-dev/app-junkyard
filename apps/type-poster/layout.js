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
export const layouts = ['orbit', 'steps', 'band', 'swiss', 'radial', 'construct'];

export const presets = [
  { name: 'Field Recordings (Orbit)', values: initial },
  {
    name: 'Bauhaus Exhibition (Swiss)',
    values: {
      title: 'Form &\nFunction',
      kicker: 'ARCHIVE EXHIBITION  /  ROOM 2B',
      footer: 'Kunsthalle Press · Zurich · Nov 12–28',
      layout: 'swiss',
      format: 'portrait',
      face: 'sans',
      paper: '#f3f1ea',
      ink: '#15181a',
      accent: '#d83a24',
    },
  },
  {
    name: 'Midnight Jazz (Radial)',
    values: {
      title: 'Late Set\nat Pier 9',
      kicker: 'QUARTET LIVE  ·  DOORS 21:00',
      footer: 'Harbor Pavilion · Acoustic Series',
      layout: 'radial',
      format: 'square',
      face: 'serif',
      paper: '#172329',
      ink: '#f5e7cb',
      accent: '#e89543',
    },
  },
  {
    name: 'Type Symposium (Construct)',
    values: {
      title: 'Grid &\nSpecimen',
      kicker: 'MONOGRAPH SERIES  /  ISSUE 14',
      footer: 'Department of Graphic Systems',
      layout: 'construct',
      format: 'landscape',
      face: 'mono',
      paper: '#ebe3cf',
      ink: '#202624',
      accent: '#2c6b64',
    },
  },
];

const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const luminance = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => linear(parseInt(hex.slice(i, i + 2), 16) / 255));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const l1 = luminance(a),
    l2 = luminance(b);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
};
const grade = (r) => (r >= 7 ? 'AAA' : r >= 4.5 ? 'AA' : r >= 3 ? 'AA Large' : 'Low');

export function contrastCheck(s) {
  if (!valid(s)) throw Error('Invalid poster settings');
  const textRatio = Number(ratio(s.ink, s.paper).toFixed(2));
  const accentRatio = Number(ratio(s.accent, s.paper).toFixed(2));
  return {
    textRatio,
    textGrade: grade(textRatio),
    accentRatio,
    accentGrade: grade(accentRatio),
  };
}

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
    layouts.includes(s.layout) &&
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
  else if (s.layout === 'swiss')
    graphic =
      '<rect x="' +
      pad +
      '" y="' +
      h * 0.14 +
      '" width="' +
      safe * 0.48 +
      '" height="' +
      h * 0.28 +
      '"/><rect x="' +
      (pad + safe * 0.52) +
      '" y="' +
      h * 0.14 +
      '" width="' +
      safe * 0.48 +
      '" height="' +
      h * 0.12 +
      '" opacity="0.5"/><circle cx="' +
      (pad + safe * 0.76) +
      '" cy="' +
      h * 0.35 +
      '" r="' +
      Math.min(w, h) * 0.075 +
      '"/>';
  else if (s.layout === 'radial')
    graphic = Array.from({ length: 12 }, (_, i) => {
      const angle = (i * 30 * Math.PI) / 180;
      const cx = w * 0.72,
        cy = h * 0.28,
        r1 = Math.min(w, h) * 0.04,
        r2 = Math.min(w, h) * 0.2;
      return (
        '<line x1="' +
        (cx + Math.cos(angle) * r1).toFixed(1) +
        '" y1="' +
        (cy + Math.sin(angle) * r1).toFixed(1) +
        '" x2="' +
        (cx + Math.cos(angle) * r2).toFixed(1) +
        '" y2="' +
        (cy + Math.sin(angle) * r2).toFixed(1) +
        '" stroke="' +
        s.accent +
        '" stroke-width="' +
        (i % 3 === 0 ? 12 : 5) +
        '"/>'
      );
    }).join('');
  else if (s.layout === 'construct')
    graphic =
      '<polygon points="' +
      pad +
      ',' +
      h * 0.42 +
      ' ' +
      (pad + safe * 0.55) +
      ',' +
      h * 0.14 +
      ' ' +
      (w - pad) +
      ',' +
      h * 0.42 +
      '"/><rect x="' +
      pad +
      '" y="' +
      h * 0.16 +
      '" width="' +
      safe * 0.22 +
      '" height="' +
      h * 0.04 +
      '"/>';
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
