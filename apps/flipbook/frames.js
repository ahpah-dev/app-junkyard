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
