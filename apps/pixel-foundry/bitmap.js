export function flood(pixels, width, start, replacement) {
  const target = pixels[start];
  if (target === undefined || target === replacement) return;
  const pending = [start];
  pixels[start] = replacement;
  while (pending.length) {
    const i = pending.pop(),
      x = i % width;
    for (const n of [x > 0 ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (n >= 0 && n < pixels.length && pixels[n] === target) {
        pixels[n] = replacement;
        pending.push(n);
      }
    }
  }
}
export function line(x, y, tx, ty, plot) {
  const dx = Math.abs(tx - x),
    dy = -Math.abs(ty - y);
  const sx = x < tx ? 1 : -1,
    sy = y < ty ? 1 : -1;
  let error = dx + dy;
  while (true) {
    plot(x, y);
    if (x === tx && y === ty) return;
    const doubled = error * 2;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }
}
export function rect(x0, y0, x1, y1, filled, plot) {
  const minX = Math.min(x0, x1),
    maxX = Math.max(x0, x1),
    minY = Math.min(y0, y1),
    maxY = Math.max(y0, y1);
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (filled || x === minX || x === maxX || y === minY || y === maxY) plot(x, y);
    }
  }
}
export function ellipse(x0, y0, x1, y1, filled, plot) {
  const minX = Math.min(x0, x1),
    maxX = Math.max(x0, x1),
    minY = Math.min(y0, y1),
    maxY = Math.max(y0, y1);
  const cx = (minX + maxX) / 2,
    cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2 + 0.35,
    ry = (maxY - minY) / 2 + 0.35;
  const inside = (x, y) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (!inside(x, y)) continue;
      if (filled || !inside(x - 1, y) || !inside(x + 1, y) || !inside(x, y - 1) || !inside(x, y + 1)) {
        plot(x, y);
      }
    }
  }
}
export function shift(pixels, width, dx, dy) {
  const height = Math.floor(pixels.length / width);
  const out = Array(pixels.length).fill(null);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sx = x - dx,
        sy = y - dy;
      if (sx >= 0 && sx < width && sy >= 0 && sy < height) out[y * width + x] = pixels[sy * width + sx];
    }
  }
  return out;
}
export function flip(pixels, width, vertical = false) {
  const height = Math.floor(pixels.length / width);
  const out = Array(pixels.length).fill(null);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const tx = vertical ? x : width - 1 - x;
      const ty = vertical ? height - 1 - y : y;
      out[ty * width + tx] = pixels[y * width + x];
    }
  }
  return out;
}
export function rotateCW(pixels, width) {
  const height = Math.floor(pixels.length / width);
  const out = Array(pixels.length).fill(null);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      out[x * height + (height - 1 - y)] = pixels[y * width + x];
    }
  }
  return out;
}
export function paletteCounts(pixels) {
  const counts = new Map();
  for (const v of pixels) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()]
    .map(([color, count]) => ({ color, count }))
    .sort((a, b) => b.count - a.count || a.color.localeCompare(b.color));
}
