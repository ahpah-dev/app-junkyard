import { gamePage } from '../../shared/creative.js';
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
