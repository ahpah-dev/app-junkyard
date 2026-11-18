export const ratios = [
  ['1.067', '1.067 · Minor Second'],
  ['1.125', '1.125 · Major Second'],
  ['1.2', '1.200 · Minor Third'],
  ['1.25', '1.250 · Major Third'],
  ['1.333', '1.333 · Perfect Fourth'],
  ['1.414', '1.414 · Augmented Fourth'],
  ['1.5', '1.500 · Perfect Fifth'],
  ['1.618', '1.618 · Golden Ratio'],
];

export const initial = {
  prefix: 'type',
  minBasePx: 15,
  maxBasePx: 18,
  minRatio: 1.125,
  maxRatio: 1.25,
  minViewport: 360,
  maxViewport: 1280,
  previewViewport: 960,
  specimen: 'Editorial typography scales smoothly across screens.',
};

const steps = [
  ['xs', -2],
  ['sm', -1],
  ['base', 0],
  ['md', 1],
  ['lg', 2],
  ['xl', 3],
  ['2xl', 4],
  ['3xl', 5],
];

export function valid(s) {
  return (
    s &&
    typeof s.prefix === 'string' &&
    s.prefix.length <= 24 &&
    typeof s.specimen === 'string' &&
    s.specimen.length <= 140 &&
    Number.isFinite(s.minBasePx) &&
    Number.isFinite(s.maxBasePx) &&
    s.minBasePx >= 10 &&
    s.maxBasePx >= s.minBasePx &&
    s.maxBasePx <= 32 &&
    Number.isFinite(s.minRatio) &&
    Number.isFinite(s.maxRatio) &&
    s.minRatio >= 1.01 &&
    s.maxRatio >= s.minRatio &&
    s.maxRatio <= 2 &&
    Number.isInteger(s.minViewport) &&
    Number.isInteger(s.maxViewport) &&
    s.minViewport >= 240 &&
    s.maxViewport > s.minViewport &&
    s.maxViewport <= 2560
  );
}

export function sizeAtViewport(minPx, maxPx, minVw, maxVw, vw) {
  if (vw <= minVw) return minPx;
  if (vw >= maxVw) return maxPx;
  return minPx + ((maxPx - minPx) * (vw - minVw)) / (maxVw - minVw);
}

export function buildScale(s) {
  if (!valid(s)) throw Error('Invalid type scale settings.');
  const vw = Number.isFinite(s.previewViewport) ? s.previewViewport : s.maxViewport;
  const slug =
    s.prefix
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'type';
  return steps.map(([name, exp]) => {
    const minPx = s.minBasePx * s.minRatio ** exp;
    const maxPx = s.maxBasePx * s.maxRatio ** exp;
    const currentPx = sizeAtViewport(minPx, maxPx, s.minViewport, s.maxViewport, vw);
    const slopeVw = ((maxPx - minPx) / (s.maxViewport - s.minViewport)) * 100;
    const interceptRem = (minPx - (slopeVw / 100) * s.minViewport) / 16;
    const clampCss = `clamp(${(minPx / 16).toFixed(4)}rem, ${interceptRem.toFixed(4)}rem + ${slopeVw.toFixed(4)}vw, ${(maxPx / 16).toFixed(4)}rem)`;
    const lineHeight = Number((exp >= 3 ? 1.08 : exp >= 1 ? 1.24 : 1.52).toFixed(2));
    return {
      token: `${slug}-${name}`,
      name,
      exponent: exp,
      minPx: Number(minPx.toFixed(2)),
      maxPx: Number(maxPx.toFixed(2)),
      currentPx: Number(currentPx.toFixed(2)),
      lineHeight,
      clampCss,
    };
  });
}
