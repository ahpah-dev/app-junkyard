export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (k === 'className') node.className = v;
    else if (k === 'value') node.value = v;
    else node.setAttribute(k, String(v));
  }
  node.append(...children);
  return node;
}
export function button(label, action) {
  return el('button', { type: 'button', onclick: action }, label);
}
export function field(label, control) {
  return el('label', { className: 'cr-field' }, el('span', {}, label), control);
}
export function select(items, current, fn) {
  const node = el('select', { onchange: (e) => fn(e.target.value) });
  for (const [value, label] of items) node.append(el('option', { value }, label));
  node.value = current;
  return node;
}
export function input(type, value, onInput, attrs = {}) {
  return el('input', {
    type,
    value,
    ...attrs,
    oninput: (e) => onInput(e.target.value),
  });
}
export function saveFile(name, content, type = 'application/json') {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = el('a', { href: url, download: name });
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function savePNG(canvas, name) {
  canvas.toBlob((blob) => {
    if (blob) saveFile(name, blob);
  }, 'image/png');
}
export function downloadSVGAsPNG(svgText, width, height, filename) {
  const blob = new Blob([svgText], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const img = new Image();
  img.onload = () => {
    const canvas = el('canvas', { width, height });
    canvas.getContext('2d').drawImage(img, 0, 0, width, height);
    savePNG(canvas, filename);
    URL.revokeObjectURL(url);
  };
  img.onerror = () => URL.revokeObjectURL(url);
  img.src = url;
}
export function draft(context, defaults, validate) {
  try {
    const data = context.load(null);
    if (validate(data)) return data;
  } catch {}
  const initial = structuredClone(defaults);
  context.save(initial);
  return initial;
}
export function persist(context, data, status) {
  try {
    context.save(data);
  } catch {
    if (status) status.textContent = 'Browser storage is full or unavailable. Export to keep your work.';
  }
}
export function coords(canvas, event, cols, rows) {
  const box = canvas.getBoundingClientRect();
  return [
    Math.floor(((event.clientX - box.left) * cols) / box.width),
    Math.floor(((event.clientY - box.top) * rows) / box.height),
  ];
}
export function paintEvents(canvas, cols, rows, down, move, finish) {
  let active = false;
  canvas.style.touchAction = 'none';
  canvas.onpointerdown = (e) => {
    if (active || e.button !== 0) return;
    active = true;
    canvas.setPointerCapture(e.pointerId);
    down(...coords(canvas, e, cols, rows));
  };
  canvas.onpointermove = (e) => {
    if (active) move(...coords(canvas, e, cols, rows));
  };
  canvas.onlostpointercapture = () => {
    if (active) {
      active = false;
      finish();
    }
  };
}
export function keyboardGrid(canvas, dimensions, apply, describe) {
  let x = 0,
    y = 0;
  const holder = el('div'),
    cursor = el('span', { 'aria-hidden': 'true' });
  holder.style.position = 'relative';
  cursor.style.cssText =
    'position:absolute;pointer-events:none;box-sizing:border-box;border:2px solid white;outline:1px solid black;box-shadow:inset 0 0 0 1px black';
  cursor.hidden = true;
  const hint = el(
    'p',
    { className: 'cr-caption' },
    'Keyboard: use the arrow keys to select a cell, then Space or Enter to apply the tool.',
  );
  hint.id = 'creative-grid-instructions';
  const current = el('span', { 'aria-live': 'polite', 'aria-atomic': 'true' });
  current.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip-path:inset(50%)';
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'application');
  canvas.setAttribute('aria-describedby', hint.id);
  canvas.replaceWith(holder);
  holder.append(canvas, cursor, current);
  holder.parentElement.after(hint);
  function position() {
    const [cols, rows] = dimensions();
    x = Math.max(0, Math.min(cols - 1, x));
    y = Math.max(0, Math.min(rows - 1, y));
    Object.assign(cursor.style, {
      left: (100 * x) / cols + '%',
      top: (100 * y) / rows + '%',
      width: 100 / cols + '%',
      height: 100 / rows + '%',
    });
    current.textContent = 'Column ' + (x + 1) + ', row ' + (y + 1) + ', ' + describe(x, y) + '.';
  }
  canvas.addEventListener('focus', () => {
    position();
    cursor.hidden = !canvas.matches(':focus-visible');
  });
  canvas.addEventListener('blur', () => {
    cursor.hidden = true;
  });
  canvas.addEventListener('pointerdown', (e) => {
    [x, y] = coords(canvas, e, ...dimensions());
    cursor.hidden = true;
  });
  canvas.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const movement = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1],
    };
    if (movement[e.key]) {
      const [dx, dy] = movement[e.key];
      x += dx;
      y += dy;
    } else if (e.key === ' ' || e.key === 'Enter') {
      position();
      apply(x, y);
    } else return;
    e.preventDefault();
    cursor.hidden = false;
    position();
  });
}
export function studio(root) {
  if (!document.getElementById('creative-studio-css')) {
    document.head.append(
      el(
        'style',
        { id: 'creative-studio-css' },
        [
          '.cr-studio{display:grid;grid-template-columns:minmax(190px,.72fr) minmax(0,1.8fr);gap:22px;align-items:start;color:inherit}',
          '.cr-tools,.cr-stage{display:grid;gap:14px;min-width:0;align-content:start}',
          '.cr-field{display:grid;gap:5px;font:inherit}.cr-field>span,.cr-caption{font-size:.83rem;color:inherit;opacity:.86}',
          '.cr-tools input,.cr-tools select,.cr-tools textarea,.cr-stage input,.cr-stage select,.cr-stage textarea{width:100%;box-sizing:border-box}',
          '.cr-field input[type=color]{height:38px;cursor:pointer;padding:3px}.cr-row{display:flex;gap:7px;align-items:center;flex-wrap:wrap}.cr-row>*{min-width:0}',
          '.cr-studio button{cursor:pointer}.cr-studio button[aria-pressed=true]{outline:2px solid currentColor;outline-offset:-3px}',
          '.cr-stage canvas,.cr-stage svg{display:block;width:100%;height:auto;border-radius:7px}.cr-stage canvas:focus-visible{outline:3px solid #a35b22}',
          '.cr-preview{background:#e4dfd6;padding:14px;border-radius:9px;overflow:hidden}.cr-status{margin:0;font-size:.88rem;min-height:1.2em}',
          '.cr-stage pre{white-space:pre-wrap;overflow-wrap:anywhere}.cr-stage iframe{width:100%;height:440px;border:0;border-radius:8px;background:#101c20}',
          '.cr-stage table{width:100%;border-collapse:collapse}.cr-stage th,.cr-stage td{text-align:left;padding:7px;border-bottom:1px solid #8885}',
          '@media(max-width:700px){.cr-studio{grid-template-columns:1fr}.cr-tools{grid-template-columns:repeat(auto-fit,minmax(145px,1fr))}.cr-tools>p,.cr-tools>.cr-row{grid-column:1/-1}}',
        ].join('\n'),
      ),
    );
  }
  const tools = el('div', { className: 'cr-tools' }),
    stage = el('div', { className: 'cr-stage' });
  const status = el('p', {
    className: 'cr-status',
    role: 'status',
    'aria-live': 'polite',
  });
  root.replaceChildren(el('div', { className: 'cr-studio' }, tools, stage));
  return { tools, stage, status };
}
export function randomSource(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const hexColor = (s) => typeof s === 'string' && /^#[a-f\d]{6}$/i.test(s);
export function gamePage(title, data, functions, runner) {
  const payload = JSON.stringify(data).replace(/</g, '\\u003c');
  const style =
    '*{box-sizing:border-box}body{background:#162b30;color:#f8e8c8;font:17px/1.5 system-ui,sans-serif;margin:0;padding:clamp(14px,4vw,36px)}main{max-width:640px;margin:auto}h1,h2,p{margin:.5em 0}h1{font: bold 30px Georgia,serif}button{border:1px solid #adc0b5;color:#f8e8c8;background:#29454a;padding:7px 14px;border-radius:6px;margin:3px;font:inherit;cursor:pointer}button:focus-visible{outline:3px solid #ef985a}canvas{display:block;max-width:100%;height:auto;margin:10px auto;image-rendering:pixelated}.story{white-space:pre-wrap;line-height:1.65}.choices{display:grid}.choices button{text-align:left}.status{min-height:1.5em}';
  return (
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>' +
    escapeXML(title) +
    '</title><style>' +
    style +
    '</style><main id="game"></main><script>' +
    functions.map((fn) => fn.toString()).join('\n') +
    '\n(' +
    runner.toString() +
    ')(' +
    payload +
    ');<\/script></html>'
  );
}
export function importFile(label, parse, status) {
  const picker = el('input', {
    type: 'file',
    accept: '.json,application/json',
  });
  picker.addEventListener('change', async () => {
    try {
      const file = picker.files[0];
      if (!file) return;
      if (file.size > 1000000) throw Error('Project exceeds 1 MB.');
      await parse(JSON.parse(await file.text()));
      status.textContent = 'Project imported.';
    } catch (error) {
      status.textContent = 'Import failed. ' + error.message;
    } finally {
      picker.value = '';
    }
  });
  return field(label, picker);
}
export function escapeXML(s) {
  return String(s).replace(
    /[<>&"']/g,
    (c) =>
      ({
        '<': '&lt;',
        '>': '&gt;',
        '&': '&amp;',
        '"': '&quot;',
        "'": '&apos;',
      })[c],
  );
}
