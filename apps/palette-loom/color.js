import { hexColor } from '../../shared/creative.js';
const linear = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const gamma = (c) => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);
const rgb = (s) => [1, 3, 5].map((i) => linear(parseInt(s.slice(i, i + 2), 16) / 255));
export function luminance(s) {
  const [r, g, b] = rgb(s);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(first, second) {
  const a = luminance(first),
    b = luminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
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
  const channels = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    channels
      .map((c) =>
        Math.round(255 * gamma(Math.min(1, Math.max(0, c))))
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
  );
}
export function ramp(start, end, steps) {
  if (!hexColor(start) || !hexColor(end) || !Number.isInteger(steps) || steps < 2 || steps > 20)
    throw Error('Invalid color ramp');
  const a = lab(start),
    b = lab(end);
  return Array.from({ length: steps }, (_, i) => encode(a.map((v, j) => v + ((b[j] - v) * i) / (steps - 1))));
}
