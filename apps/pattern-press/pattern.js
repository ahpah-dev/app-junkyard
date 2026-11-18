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
const motifs = ['arc', 'diamond', 'cross', 'truchet', 'hex', 'bauhaus'];
const symmetries = ['random', 'mirror', 'rotational'];

export function valid(s) {
  return (
    s &&
    motifs.includes(s.motif) &&
    [2, 4, 6, 8].includes(s.cells) &&
    Number.isInteger(s.seed) &&
    s.seed >= 0 &&
    s.seed <= 999999 &&
    [s.ink, s.paper, s.accent].every(hexColor) &&
    Number.isInteger(s.density) &&
    s.density >= 0 &&
    s.density <= 100 &&
    (s.symmetry === undefined || symmetries.includes(s.symmetry))
  );
}

function buildGrid(s) {
  const rng = randomSource(s.seed);
  const sym = s.symmetry ?? 'random';
  const n = s.cells;
  const grid = Array.from({ length: n }, () => Array(n).fill(null));
  if (sym === 'random') {
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        grid[y][x] = {
          angle: 90 * Math.floor(rng() * 4),
          primary: rng() * 100 < s.density,
        };
      }
    }
    return grid;
  }
  const half = n / 2;
  for (let y = 0; y < half; y++) {
    for (let x = 0; x < half; x++) {
      const a = 90 * Math.floor(rng() * 4);
      const primary = rng() * 100 < s.density;
      if (sym === 'mirror') {
        grid[y][x] = { angle: a, primary };
        grid[y][n - 1 - x] = { angle: (a + 90) % 360, primary };
        grid[n - 1 - y][x] = { angle: (a + 270) % 360, primary };
        grid[n - 1 - y][n - 1 - x] = { angle: (a + 180) % 360, primary };
      } else {
        grid[y][x] = { angle: a, primary };
        grid[x][n - 1 - y] = { angle: (a + 90) % 360, primary };
        grid[n - 1 - y][n - 1 - x] = { angle: (a + 180) % 360, primary };
        grid[n - 1 - x][y] = { angle: (a + 270) % 360, primary };
      }
    }
  }
  return grid;
}

export function patternMetrics(s) {
  if (!valid(s)) throw Error('Invalid pattern settings');
  const grid = buildGrid(s);
  const flat = grid.flat();
  const primaryCount = flat.filter((c) => c.primary).length;
  return {
    motif: s.motif,
    symmetry: s.symmetry ?? 'random',
    cells: s.cells,
    tilePx: s.cells * 48,
    cellCount: flat.length,
    primaryCount,
    accentCount: flat.length - primaryCount,
  };
}

export function patternSVG(s, repeats = 1) {
  if (!valid(s)) throw Error('Invalid pattern settings');
  const unit = 48,
    tile = s.cells * unit;
  const paths = {
    arc: '<path d="M0 24A24 24 0 0 0 24 0M24 48A24 24 0 0 1 48 24" fill="none" stroke="currentColor" stroke-width="7"/>',
    diamond:
      '<path d="M24 2 46 24 24 46 2 24Z M24 15 15 24 24 33 33 24Z" fill="currentColor" fill-rule="evenodd"/>',
    cross: '<path d="M7 8H19V19H30V31H19V42H7V31H0V19H7Z" fill="currentColor"/>',
    truchet:
      '<path d="M0 16A16 16 0 0 0 16 0M32 48A16 16 0 0 1 48 32M0 32A32 32 0 0 0 32 0" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>',
    hex: '<path d="M24 3L42 13.5V34.5L24 45L6 34.5V13.5Z M24 13L33 18.5V29.5L24 35L15 29.5V18.5Z" fill="currentColor" fill-rule="evenodd"/>',
    bauhaus:
      '<path d="M0 0H24V24H0Z M24 24A24 24 0 0 1 48 48H24Z" fill="currentColor"/>',
  };
  const grid = buildGrid(s);
  const marks = [];
  for (let y = 0; y < s.cells; y++)
    for (let x = 0; x < s.cells; x++) {
      const cell = grid[y][x];
      marks.push(
        '<g transform="translate(' +
          x * unit +
          ' ' +
          y * unit +
          ') rotate(' +
          cell.angle +
          ' 24 24)" color="' +
          (cell.primary ? s.ink : s.accent) +
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
