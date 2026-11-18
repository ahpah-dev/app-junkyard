import { gamePage, randomSource } from '../../shared/creative.js';
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

export function populateRooms(map, end, seed = 0) {
  const distGrid = new Int32Array(map.tiles.length).fill(-1);
  const queue = [map.start];
  distGrid[map.start] = 0;
  for (let n = 0; n < queue.length; n++) {
    const i = queue[n],
      x = i % map.width,
      d = distGrid[i];
    for (const next of [x ? i - 1 : -1, x < map.width - 1 ? i + 1 : -1, i - map.width, i + map.width]) {
      if (map.tiles[next] === 1 && distGrid[next] === -1) {
        distGrid[next] = d + 1;
        queue.push(next);
      }
    }
  }
  const ex = end % map.width,
    ey = Math.floor(end / map.width);
  let exitRoomIdx = 0,
    bestDist = Infinity;
  map.rooms.forEach((r, idx) => {
    const d = Math.abs(r.cx - ex) + Math.abs(r.cy - ey);
    if (idx > 0 && d < bestDist) {
      bestDist = d;
      exitRoomIdx = idx;
    }
  });
  const rng = randomSource((seed ^ 0x9e3779b9) >>> 0);
  const roles = ['key', 'treasure', 'guardian', 'shrine'];
  const labels = {
    entrance: 'Entrance',
    exit: 'Exit Portal',
    key: 'Brass Key',
    treasure: 'Treasure Chest',
    guardian: 'Vault Guardian',
    shrine: 'Healing Shrine',
    camp: 'Empty Chamber',
  };
  let midIndex = 0;
  const rooms = map.rooms.map((r, index) => {
    const centerIdx = r.cy * map.width + r.cx;
    let role;
    if (index === 0) role = 'entrance';
    else if (index === exitRoomIdx) role = 'exit';
    else {
      role = midIndex < roles.length ? roles[midIndex] : rng() < 0.45 ? 'treasure' : rng() < 0.7 ? 'guardian' : 'camp';
      midIndex++;
    }
    return {
      index,
      x: r.x,
      y: r.y,
      w: r.w,
      h: r.h,
      cx: r.cx,
      cy: r.cy,
      dist: distGrid[centerIdx],
      role,
      label: labels[role],
    };
  });
  return { rooms, distGrid, maxDist: Math.max(1, ...distGrid) };
}

function dungeonRunner(data) {
  const host = document.getElementById('game');
  const tag = (n, txt) => {
    const e = document.createElement(n);
    if (txt !== undefined) e.textContent = txt;
    return e;
  };
  let pos = data.start,
    steps = 0,
    keys = 0,
    treasures = 0,
    blessed = false,
    won = false;
  const seen = new Uint8Array(data.tiles.length);
  const pickups = new Map();
  for (const r of data.rooms) {
    if (['key', 'treasure', 'guardian', 'shrine'].includes(r.role)) {
      pickups.set(r.cy * data.width + r.cx, r.role);
    }
  }
  const title = tag('h1', 'Dungeon Expedition'),
    status = tag('div'),
    canvas = tag('canvas'),
    controls = tag('div');
  status.setAttribute('role', 'status');
  const unit = Math.max(6, Math.min(14, Math.floor(600 / data.width)));
  canvas.width = data.width * unit;
  canvas.height = data.height * unit;
  const reveal = () => {
    const px = pos % data.width,
      py = Math.floor(pos / data.width);
    for (let dy = -3; dy <= 3; dy++) {
      for (let dx = -3; dx <= 3; dx++) {
        const x = px + dx,
          y = py + dy;
        if (x >= 0 && x < data.width && y >= 0 && y < data.height && dx * dx + dy * dy <= 11) {
          seen[y * data.width + x] = 1;
        }
      }
    }
  };
  let note = 'Explore the dungeon. Find the Exit Portal.';
  function render() {
    reveal();
    const c = canvas.getContext('2d');
    c.fillStyle = '#0e191c';
    c.fillRect(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < data.tiles.length; i++) {
      if (!seen[i]) continue;
      const x = (i % data.width) * unit,
        y = Math.floor(i / data.width) * unit;
      c.fillStyle = data.tiles[i] ? '#cfc5a4' : '#243c41';
      c.fillRect(x, y, unit, unit);
    }
    for (const [idx, role] of pickups) {
      if (!seen[idx]) continue;
      const x = (idx % data.width) * unit,
        y = Math.floor(idx / data.width) * unit;
      c.fillStyle =
        role === 'key' ? '#e5aa32' : role === 'treasure' ? '#d87a42' : role === 'shrine' ? '#499878' : '#a93a3a';
      c.fillRect(x + 1, y + 1, unit - 2, unit - 2);
    }
    if (seen[data.exit]) {
      const ex = (data.exit % data.width) * unit,
        ey = Math.floor(data.exit / data.width) * unit;
      c.fillStyle = '#c8502c';
      c.fillRect(ex + 1, ey + 1, unit - 2, unit - 2);
    }
    const px = (pos % data.width) * unit,
      py = Math.floor(pos / data.width) * unit;
    c.fillStyle = '#2d7d96';
    c.beginPath();
    c.arc(px + unit / 2, py + unit / 2, unit * 0.42, 0, Math.PI * 2);
    c.fill();
    status.textContent = `${note} · Steps: ${steps} · Keys: ${keys} · Treasures: ${treasures}`;
  }
  function move(dx, dy) {
    if (won) return;
    const x = (pos % data.width) + dx,
      y = Math.floor(pos / data.width) + dy,
      next = y * data.width + x;
    if (x < 0 || x >= data.width || y < 0 || y >= data.height || !data.tiles[next]) return;
    if (pickups.get(next) === 'guardian' && !blessed && keys === 0) {
      note = 'A Vault Guardian blocks the chamber! Find a Brass Key or Shrine first.';
      render();
      return;
    }
    pos = next;
    steps++;
    const item = pickups.get(pos);
    if (item === 'key') {
      keys++;
      pickups.delete(pos);
      note = 'Picked up a Brass Key!';
    } else if (item === 'treasure') {
      treasures++;
      pickups.delete(pos);
      note = 'Claimed a Treasure Chest!';
    } else if (item === 'shrine') {
      blessed = true;
      pickups.delete(pos);
      note = 'Shrine blessing active!';
    } else if (item === 'guardian') {
      if (blessed) blessed = false;
      else keys--;
      pickups.delete(pos);
      note = 'Defeated the Vault Guardian!';
    } else if (pos === data.exit) {
      won = true;
      note = `Escaped in ${steps} steps with ${treasures} treasure(s)!`;
    } else {
      note = 'Exploring…';
    }
    render();
  }
  for (const [label, delta] of [
    ['Left', [-1, 0]],
    ['Up', [0, -1]],
    ['Down', [0, 1]],
    ['Right', [1, 0]],
  ]) {
    const b = tag('button', label);
    b.onclick = () => move(...delta);
    controls.append(b);
  }
  document.addEventListener('keydown', (e) => {
    const mapKeys = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
      a: [-1, 0],
      d: [1, 0],
      w: [0, -1],
      s: [0, 1],
    };
    if (mapKeys[e.key]) {
      e.preventDefault();
      move(...mapKeys[e.key]);
    }
  });
  host.append(title, status, canvas, controls);
  render();
}

export function exportDungeonGame(map, end, seed = 0) {
  const populated = populateRooms(map, end, seed);
  return gamePage(
    'Dungeon Seed ' + seed,
    { width: map.width, height: map.height, tiles: map.tiles, start: map.start, exit: end, rooms: populated.rooms },
    [],
    dungeonRunner,
  );
}
