import { hexColor } from '../../shared/creative.js';
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgb = (s) => [1, 3, 5].map((i) => linear(parseInt(s.slice(i, i + 2), 16) / 255));
const toHex = (channels) =>
  '#' +
  channels
    .map((c) =>
      Math.round(255 * gamma(Math.min(1, Math.max(0, c))))
        .toString(16)
        .padStart(2, '0'),
    )
    .join('');

export function luminance(s) {
  const [r, g, b] = rgb(s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(first, second) {
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
export function wcagGrade(ratio) {
  if (ratio >= 7) return 'AAA';
  if (ratio >= 4.5) return 'AA';
  if (ratio >= 3) return 'AA Large';
  return 'Fail';
}

const cvdMatrices = {
  protanopia: [
    [0.152286, 1.052583, -0.204868],
    [0.114503, 0.786281, 0.099216],
    [-0.003882, -0.048116, 1.051998],
  ],
  deuteranopia: [
    [0.367322, 0.860646, -0.227968],
    [0.280085, 0.672501, 0.047413],
    [-0.01182, 0.04294, 0.968881],
  ],
  tritanopia: [
    [1.255528, -0.076749, -0.178779],
    [-0.078411, 0.930809, 0.147602],
    [0.004733, 0.691367, 0.3039],
  ],
};

export function simulateCVD(hex, mode = 'none') {
  if (!hexColor(hex)) throw Error('Invalid hex color');
  if (mode === 'none') return hex.toLowerCase();
  const matrix = cvdMatrices[mode];
  if (!matrix) throw Error('Unknown color vision mode: ' + mode);
  const [r, g, b] = rgb(hex);
  return toHex(matrix.map(([m0, m1, m2]) => m0 * r + m1 * g + m2 * b));
}

export function harmonyPairings(colors) {
  const pairs = [];
  for (let i = 0; i < colors.length; i++) {
    for (let j = i + 1; j < colors.length; j++) {
      const ratio = contrast(colors[i], colors[j]);
      if (ratio >= 4.5) {
        pairs.push({
          firstIndex: i,
          secondIndex: j,
          first: colors[i],
          second: colors[j],
          ratio: Number(ratio.toFixed(2)),
          grade: wcagGrade(ratio),
        });
      }
    }
  }
  return pairs.sort((a, b) => b.ratio - a.ratio);
}

function lab(hex) {
  const [r, g, b] = rgb(hex);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}
function encode([L, a, b]) {
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return toHex([
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ]);
}
export function ramp(start, end, steps) {
  if (!hexColor(start) || !hexColor(end) || !Number.isInteger(steps) || steps < 2 || steps > 20)
    throw Error('Invalid color ramp');
  const a = lab(start),
    b = lab(end);
  return Array.from({ length: steps }, (_, i) => encode(a.map((v, j) => v + ((b[j] - v) * i) / (steps - 1))));
}
