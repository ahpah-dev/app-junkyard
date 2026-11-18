import { escapeXML, gamePage } from '../../shared/creative.js';
const choice = (label, to, set = '', need = '') => ({ label, to, set, need });
export const initial = {
  version: 1,
  title: 'Signal on Pier Nine',
  start: 'deck',
  scenes: [
    {
      id: 'deck',
      name: 'The pier',
      body: 'A single lantern blinks across the water. The lamp room stands open.',
      choices: [choice('Search the lamp room', 'lamp'), choice('Signal the boat', 'boat', '', 'lens')],
    },
    {
      id: 'lamp',
      name: 'Lamp room',
      body: 'A polished signal lens rests on a wooden crate.',
      choices: [choice('Pocket the lens and return', 'deck', 'lens'), choice('Return empty-handed', 'deck')],
    },
    {
      id: 'boat',
      name: 'The reply',
      body: 'Light catches your lens. The boat turns toward shore.',
      choices: [],
    },
  ],
};
export function validProject(p) {
  const str = (s, max) => typeof s === 'string' && s.length <= max;
  const id = (s) => typeof s === 'string' && /^[a-z][a-z0-9_-]{0,39}$/.test(s);
  if (
    p?.version !== 1 ||
    !str(p.title, 80) ||
    !Array.isArray(p.scenes) ||
    !p.scenes.length ||
    p.scenes.length > 100
  )
    return false;
  const ok = p.scenes.every(
    (s) =>
      s &&
      id(s.id) &&
      str(s.name, 80) &&
      str(s.body, 4000) &&
      Array.isArray(s.choices) &&
      s.choices.length <= 12 &&
      s.choices.every((c) => c && str(c.label, 140) && id(c.to) && str(c.need, 40) && str(c.set, 40)),
  );
  if (!ok) return false;
  const ids = new Set(p.scenes.map((s) => s.id));
  return (
    ids.size === p.scenes.length &&
    ids.has(p.start) &&
    p.scenes.every((s) => s.choices.every((c) => ids.has(c.to)))
  );
}
export function options(scene, flags) {
  return scene.choices.filter((c) => !c.need || flags.includes(c.need));
}
export function follow(scene, flags, choiceIndex) {
  const target = options(scene, flags)[choiceIndex];
  if (!target) return null;
  return {
    id: target.to,
    flags: target.set && !flags.includes(target.set) ? [...flags, target.set] : flags.slice(),
  };
}
export function links(p) {
  const visited = new Set([p.start]),
    pending = [p.start],
    index = new Map(p.scenes.map((s) => [s.id, s]));
  while (pending.length) {
    for (const c of index.get(pending.pop()).choices)
      if (!visited.has(c.to)) {
        visited.add(c.to);
        pending.push(c.to);
      }
  }
  return p.scenes.filter((s) => !visited.has(s.id)).map((s) => s.name || s.id);
}
export function auditStory(p) {
  const required = new Set();
  const granted = new Set();
  let choiceCount = 0;
  const endings = [];
  for (const s of p.scenes) {
    choiceCount += s.choices.length;
    if (!s.choices.length) endings.push(s.name || s.id);
    for (const c of s.choices) {
      if (c.need) required.add(c.need);
      if (c.set) granted.add(c.set);
    }
  }
  const requiredFlags = [...required].sort();
  const grantedFlags = [...granted].sort();
  return {
    sceneCount: p.scenes.length,
    choiceCount,
    endings,
    unreachable: links(p),
    requiredFlags,
    grantedFlags,
    unobtainableFlags: requiredFlags.filter((f) => !granted.has(f)),
  };
}
export function storyMapSVG(p, activeId) {
  const depth = new Map([[p.start, 0]]);
  const queue = [p.start];
  const byId = new Map(p.scenes.map((s) => [s.id, s]));
  while (queue.length) {
    const id = queue.shift();
    const d = depth.get(id);
    for (const c of byId.get(id)?.choices ?? []) {
      if (!depth.has(c.to)) {
        depth.set(c.to, d + 1);
        queue.push(c.to);
      }
    }
  }
  const maxReach = Math.max(0, ...depth.values());
  const layers = new Map();
  for (const s of p.scenes) {
    const col = depth.has(s.id) ? depth.get(s.id) : maxReach + 1;
    const list = layers.get(col) ?? [];
    list.push(s);
    layers.set(col, list);
  }
  const colW = 190,
    rowH = 74,
    boxW = 148,
    boxH = 48,
    pad = 24;
  const maxRows = Math.max(1, ...[...layers.values()].map((l) => l.length));
  const totalCols = Math.max(1, layers.size);
  const w = Math.max(360, pad * 2 + (totalCols - 1) * colW + boxW);
  const h = Math.max(140, pad * 2 + (maxRows - 1) * rowH + boxH);
  const pos = new Map();
  const sortedCols = [...layers.keys()].sort((a, b) => a - b);
  sortedCols.forEach((col, ci) => {
    const list = layers.get(col);
    const startY = (h - (list.length - 1) * rowH - boxH) / 2;
    list.forEach((s, ri) => pos.set(s.id, { x: pad + ci * colW, y: startY + ri * rowH }));
  });
  const edges = [];
  for (const s of p.scenes) {
    const a = pos.get(s.id);
    for (const c of s.choices) {
      const b = pos.get(c.to);
      if (!a || !b) continue;
      const x1 = a.x + boxW,
        y1 = a.y + boxH / 2,
        x2 = b.x,
        y2 = b.y + boxH / 2;
      const back = x2 <= x1;
      const dPath = back
        ? `M${a.x + boxW / 2} ${a.y} C${a.x + boxW / 2} ${a.y - 34} ${b.x + boxW / 2} ${b.y - 34} ${b.x + boxW / 2} ${b.y}`
        : `M${x1} ${y1} C${(x1 + x2) / 2} ${y1} ${(x1 + x2) / 2} ${y2} ${x2} ${y2}`;
      const color = c.need ? '#b85c2e' : c.set ? '#2f725c' : '#6f7c73';
      edges.push(`<path d="${dPath}" fill="none" stroke="${color}" stroke-width="2" marker-end="url(#arrow)"/>`);
    }
  }
  const nodes = p.scenes.map((s) => {
    const { x, y } = pos.get(s.id);
    const isActive = s.id === activeId;
    const isStart = s.id === p.start;
    const isEnd = !s.choices.length;
    const fill = isActive ? '#253c32' : isEnd ? '#f6e7d4' : '#fffef9';
    const textFill = isActive ? '#ffffff' : '#232822';
    const stroke = isActive ? '#e35525' : isStart ? '#2c7662' : '#96a094';
    const sub = (isStart ? 'Start · ' : isEnd ? 'Ending · ' : '') + s.choices.length + ' choices';
    const label = (s.name || s.id).slice(0, 18);
    return `<g data-scene="${escapeXML(s.id)}" style="cursor:pointer"><rect x="${x}" y="${y}" width="${boxW}" height="${boxH}" rx="7" fill="${fill}" stroke="${stroke}" stroke-width="${isActive ? 3 : 1.5}"/><text x="${x + 10}" y="${y + 20}" font-family="sans-serif" font-size="12" font-weight="bold" fill="${textFill}">${escapeXML(label)}</text><text x="${x + 10}" y="${y + 36}" font-family="sans-serif" font-size="10" fill="${isActive ? '#d5e4dc' : '#5e655c'}">${escapeXML(sub)}</text></g>`;
  });
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" style="background:#f3f1e8"><defs><marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0 1L9 5L0 9z" fill="#6f7c73"/></marker></defs>${edges.join('')}${nodes.join('')}</svg>`;
}
export function gameRunner(project) {
  const host = document.getElementById('game'),
    tag = (name, txt) => {
      const node = document.createElement(name);
      node.textContent = txt;
      return node;
    };
  const history = [];
  let state = { id: project.start, flags: [] };
  function render() {
    const scene = project.scenes.find((x) => x.id === state.id),
      body = tag('p', scene.body),
      buttons = tag('div', '');
    body.className = 'story';
    buttons.className = 'choices';
    host.replaceChildren(tag('h1', project.title), tag('h2', scene.name), body, buttons);
    const available = options(scene, state.flags);
    for (const [i, c] of available.entries()) {
      const b = tag('button', c.label || 'Continue');
      b.onclick = () => {
        history.push(state);
        state = follow(scene, state.flags, i);
        render();
      };
      buttons.append(b);
    }
    if (!available.length)
      host.append(
        tag('p', scene.choices.length ? 'No choices available with your current flags.' : 'End of story.'),
      );
    const back = tag('button', 'Back');
    back.disabled = !history.length;
    back.onclick = () => {
      state = history.pop();
      render();
    };
    host.append(back);
    const restart = tag('button', 'Restart');
    restart.onclick = () => {
      history.length = 0;
      state = { id: project.start, flags: [] };
      render();
    };
    host.append(restart);
  }
  render();
}
export const exportGame = (p) => gamePage(p.title, p, [options, follow], gameRunner);
