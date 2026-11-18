import { randomSource } from '../../shared/creative.js';
export const initial = {
  width: 48,
  height: 32,
  rooms: 14,
  seed: 2817,
  loops: 2,
};
export function valid(s) {
  return (
    s &&
    Object.entries({
      width: [24, 96],
      height: [20, 72],
      rooms: [2, 60],
      seed: [0, 999999],
      loops: [0, 10],
    }).every(([k, [lo, hi]]) => Number.isInteger(s[k]) && s[k] >= lo && s[k] <= hi)
  );
}
export function walk(tiles, width, start) {
  const parent = new Int32Array(tiles.length).fill(-1);
  if (tiles[start] !== 1) return { parent, visited: [] };
  const visited = [start];
  parent[start] = start;
  for (let n = 0; n < visited.length; n++) {
    const i = visited[n],
      x = i % width;
    for (const next of [x ? i - 1 : -1, x < width - 1 ? i + 1 : -1, i - width, i + width]) {
      if (tiles[next] === 1 && parent[next] === -1) {
        parent[next] = i;
        visited.push(next);
      }
    }
  }
  return { parent, visited };
}
export function route(parent, start, end) {
  if (parent[end] === undefined || parent[end] < 0) return [];
  const path = [];
  for (let i = end; i !== start; i = parent[i]) {
    if (parent[i] === i || parent[i] === undefined || path.length > parent.length) return [];
    path.push(i);
  }
  return [start, ...path.reverse()];
}
export function generate(s) {
  if (!valid(s)) throw Error('Invalid map settings');
  const rng = randomSource(s.seed),
    int = (lo, hi) => lo + Math.floor(rng() * (hi - lo + 1)),
    { width, height } = s,
    tiles = Array(width * height).fill(0),
    rooms = [];
  for (let attempt = 0; attempt < s.rooms * 24 && rooms.length < s.rooms; attempt++) {
    const w = int(3, 9),
      h = int(3, 7),
      x = int(1, width - w - 1),
      y = int(1, height - h - 1);
    if (rooms.some((r) => x <= r.x + r.w && x + w >= r.x && y <= r.y + r.h && y + h >= r.y)) continue;
    const room = {
      x,
      y,
      w,
      h,
      cx: x + Math.floor(w / 2),
      cy: y + Math.floor(h / 2),
    };
    rooms.push(room);
    for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) tiles[j * width + i] = 1;
  }
  function connect(a, b) {
    let x = a.cx,
      y = a.cy;
    const horizontal = () => {
      while (x !== b.cx) {
        x += Math.sign(b.cx - x);
        tiles[y * width + x] = 1;
      }
    };
    const vertical = () => {
      while (y !== b.cy) {
        y += Math.sign(b.cy - y);
        tiles[y * width + x] = 1;
      }
    };
    if (rng() < 0.5) {
      horizontal();
      vertical();
    } else {
      vertical();
      horizontal();
    }
  }
  for (let i = 1; i < rooms.length; i++) {
    const r = rooms[i],
      dist = (o) => Math.abs(r.cx - o.cx) + Math.abs(r.cy - o.cy);
    const closest = rooms.slice(0, i).reduce((a, b) => (dist(a) <= dist(b) ? a : b));
    connect(r, closest);
  }
  for (let i = 0; i < s.loops && rooms.length > 1; i++) {
    const a = int(0, rooms.length - 1),
      b = (a + int(1, rooms.length - 1)) % rooms.length;
    connect(rooms[a], rooms[b]);
  }
  const start = rooms[0].cy * width + rooms[0].cx,
    { parent, visited } = walk(tiles, width, start);
  return { width, height, rooms, tiles, start, end: visited.at(-1), parent };
}
