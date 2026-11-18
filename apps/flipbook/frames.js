import { hexColor } from '../../shared/creative.js';
export const size = 16;
export function initialProject() {
  const frames = Array.from({ length: 4 }, (_, n) => {
    const p = Array(size * size).fill(null);
    const heights = [0, -2, -3, -1],
      height = heights[n];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dist = (x - 7.5) ** 2 + (y - 9 - height) ** 2;
        if (dist < 17) p[y * size + x] = dist < 10 ? '#e9aa58' : '#915639';
      }
    p[(7 + height) * size + 6] = '#ffdf90';
    p[(7 + height) * size + 7] = '#ffdf90';
    return p;
  });
  return { version: 1, fps: 6, frames };
}
export function valid(p) {
  return (
    p?.version === 1 &&
    Number.isInteger(p.fps) &&
    p.fps >= 1 &&
    p.fps <= 24 &&
    Array.isArray(p.frames) &&
    p.frames.length > 0 &&
    p.frames.length <= 32 &&
    p.frames.every(
      (f) => Array.isArray(f) && f.length === size * size && f.every((v) => v === null || hexColor(v)),
    )
  );
}
export function atlas(p) {
  const cols = Math.ceil(Math.sqrt(p.frames.length)),
    rows = Math.ceil(p.frames.length / cols);
  return {
    image: 'animation.png',
    width: cols * size,
    height: rows * size,
    fps: p.fps,
    frames: p.frames.map((_, i) => ({
      x: (i % cols) * size,
      y: Math.floor(i / cols) * size,
      width: size,
      height: size,
    })),
  };
}
export function transformFrame(frame, kind) {
  if (!Array.isArray(frame) || frame.length !== size * size) throw Error('Invalid frame.');
  const out = Array(size * size).fill(null);
  const delta = { shiftL: [-1, 0], shiftR: [1, 0], shiftU: [0, -1], shiftD: [0, 1] }[kind];
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const val = frame[y * size + x];
      if (!val) continue;
      if (kind === 'flipH') out[y * size + (size - 1 - x)] = val;
      else if (kind === 'flipV') out[(size - 1 - y) * size + x] = val;
      else if (kind === 'rotateCW') out[x * size + (size - 1 - y)] = val;
      else if (delta) {
        const nx = (x + delta[0] + size) % size;
        const ny = (y + delta[1] + size) % size;
        out[ny * size + nx] = val;
      } else throw Error('Unknown frame transform: ' + kind);
    }
  }
  return out;
}
export function animatedSVG(p, pixelScale = 8) {
  if (!valid(p)) throw Error('Invalid Flipbook project.');
  const dim = size * pixelScale;
  const n = p.frames.length;
  const dur = (n / p.fps).toFixed(4) + 's';
  const rules =
    n === 1
      ? ''
      : '<style>' +
        p.frames
          .map((_, i) => {
            const start = ((i / n) * 100).toFixed(3);
            const end = (((i + 1) / n) * 100).toFixed(3);
            const kf =
              i === 0
                ? `0%{opacity:1}${end}%{opacity:0}100%{opacity:0}`
                : i === n - 1
                  ? `0%{opacity:0}${start}%{opacity:1}100%{opacity:1}`
                  : `0%{opacity:0}${start}%{opacity:1}${end}%{opacity:0}100%{opacity:0}`;
            return `.f${i}{animation:k${i} ${dur} steps(1,end) infinite}@keyframes k${i}{${kf}}`;
          })
          .join('') +
        '</style>';
  const groups = p.frames
    .map((pixels, idx) => {
      const rects = pixels
        .map((c, i) =>
          c
            ? `<rect x="${(i % size) * pixelScale}" y="${Math.floor(i / size) * pixelScale}" width="${pixelScale}" height="${pixelScale}" fill="${c}"/>`
            : '',
        )
        .filter(Boolean)
        .join('');
      return `<g class="f${idx}">${rects}</g>`;
    })
    .join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dim}" height="${dim}" viewBox="0 0 ${dim} ${dim}" shape-rendering="crispEdges">${rules}${groups}</svg>`;
}
