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
