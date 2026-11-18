import { hexColor, randomSource } from '../../shared/creative.js';
export const initial = {
  motif: 'arc',
  cells: 4,
  seed: 3107,
  ink: '#f8cb84',
  paper: '#234342',
  accent: '#d37657',
  density: 75,
};
export function valid(s) {
  return (
    s &&
    ['arc', 'diamond', 'cross'].includes(s.motif) &&
    [2, 4, 6, 8].includes(s.cells) &&
    Number.isInteger(s.seed) &&
    s.seed >= 0 &&
    s.seed <= 999999 &&
    [s.ink, s.paper, s.accent].every(hexColor) &&
    Number.isInteger(s.density) &&
    s.density >= 0 &&
    s.density <= 100
  );
}
export function patternSVG(s, repeats = 1) {
  if (!valid(s)) throw Error('Invalid pattern settings');
  const rng = randomSource(s.seed),
    unit = 48,
    tile = s.cells * unit;
  const paths = {
    arc: '<path d="M0 24A24 24 0 0 0 24 0M24 48A24 24 0 0 1 48 24" fill="none" stroke="currentColor" stroke-width="7"/>',
    diamond:
      '<path d="M24 2 46 24 24 46 2 24Z M24 15 15 24 24 33 33 24Z" fill="currentColor" fill-rule="evenodd"/>',
    cross: '<path d="M7 8H19V19H30V31H19V42H7V31H0V19H7Z" fill="currentColor"/>',
  };
  const marks = [];
  for (let y = 0; y < s.cells; y++)
    for (let x = 0; x < s.cells; x++) {
      const angle = 90 * Math.floor(rng() * 4),
        accent = rng() * 100 < s.density;
      marks.push(
        '<g transform="translate(' +
          x * unit +
          ' ' +
          y * unit +
          ') rotate(' +
          angle +
          ' 24 24)" color="' +
          (accent ? s.ink : s.accent) +
          '">' +
          paths[s.motif] +
          '</g>',
      );
    }
  return (
    '<svg xmlns="http://www.w3.org/2000/svg" width="' +
    tile * repeats +
    '" height="' +
    tile * repeats +
    '" viewBox="0 0 ' +
    tile * repeats +
    ' ' +
    tile * repeats +
    '"><defs><pattern id="weave" width="' +
    tile +
    '" height="' +
    tile +
    '" patternUnits="userSpaceOnUse"><rect width="' +
    tile +
    '" height="' +
    tile +
    '" fill="' +
    s.paper +
    '"/>' +
    marks.join('') +
    '</pattern></defs><rect width="100%" height="100%" fill="url(#weave)"/></svg>'
  );
}
