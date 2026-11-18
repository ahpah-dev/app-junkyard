import { el } from './ui.js';

export const money = (cents) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100);
export const cents = (value) => Math.round((Number(value) + Number.EPSILON) * 100);
export const whole = (value) => Number.isSafeInteger(value) && value >= 0;
export const uid = () => globalThis.crypto.randomUUID();
export const day = (offset = 0, origin = new Date()) => {
  const date = new Date(origin);
  date.setDate(date.getDate() + offset);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-');
};
export function validDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T12:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().startsWith(value);
}
export const daysBetween = (from, to) =>
  Math.round((Date.parse(to + 'T12:00:00Z') - Date.parse(from + 'T12:00:00Z')) / 86400000);
export function demand(condition, message) {
  if (!condition) throw new Error(message);
}
export const requiredText = (value, label) =>
  demand(typeof value === 'string' && value.trim().length > 0, 'Enter ' + label + '.');
export const decimalField = (key, label, options = {}) => ({
  key,
  label,
  type: 'number',
  step: '0.01',
  min: '0',
  max: '99999999',
  ...options,
});
export const textField = (key, label, options = {}) => ({ key, label, type: 'text', ...options });
export const selectField = (key, label, choices) => ({ key, label, type: 'select', choices });
export const dateField = (key, label, options = {}) => ({ key, label, type: 'date', ...options });

export function csv(rows) {
  const escape = (value) => {
    let text = String(value ?? '');
    if (/^[\s]*[=+@-]/.test(text) && !/^-?\d+(\.\d+)?$/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  };
  return '\uFEFF' + rows.map((row) => row.map(escape).join(',')).join('\r\n');
}
const styleText = `
.biz-workbench { display:grid; gap:1.35rem; min-width:0 }
.biz-stats { display:grid; grid-template-columns:repeat(auto-fit,minmax(min(100%,150px),1fr)); gap:.7rem }
.biz-stat, .biz-sheet { border:1px solid var(--line,#c6c9c1); border-radius:12px; padding:1rem; background:var(--paper,#fff) }
.biz-stat { display:grid; align-content:start; gap:.35rem }
.biz-stat strong { font-size:clamp(1.2rem,3vw,1.9rem); font-variant-numeric:tabular-nums; overflow-wrap:anywhere }
.biz-stat small, .biz-detail small { font-size:.79rem; color:#45534c }
.biz-toolbar, .biz-actions, .biz-heading { display:flex; flex-wrap:wrap; align-items:center; gap:.55rem }
.biz-heading { justify-content:space-between }
.biz-heading h2, .biz-dialog h2, .biz-detail h3 { margin:0 }
.biz-toolbar input[type=search] { flex:1; min-width:min(100%,180px) }
.biz-toolbar select { width:auto }
.biz-scroll { overflow-x:auto; max-width:100% }
.biz-grid { width:100%; border-collapse:collapse; text-align:left; font-size:.91rem }
.biz-grid th,.biz-grid td { padding:.7rem .5rem; vertical-align:top; border-bottom:1px solid #d8dcd7; overflow-wrap:anywhere }
.biz-grid th { font-size:.77rem; font-weight:650 }
.biz-grid tr:last-child td { border-bottom:none }
.biz-grid button,.biz-detail button { padding:.35rem .65rem; min-height:2.1rem; font-size:.84rem }
.biz-detail { padding:1rem; background:#f3f5ef; border-radius:8px; display:grid; gap:.65rem; color:#17211b }
.biz-detail ul { margin:.2rem 0; padding-left:1.2rem }
.biz-dialog { box-sizing:border-box; border:1px solid #738076; border-radius:15px; width:min(42rem,93vw); max-height:85dvh; background:#fff; color:#17211b; padding:1.35rem; overflow:auto }
.biz-dialog::backdrop { background:rgb(18 27 22 / .46) }
.biz-form { display:grid; gap:1rem; margin-top:1rem }
.biz-form label { display:grid; gap:.35rem; font-size:.9rem; font-weight:600 }
.biz-form input, .biz-form select, .biz-form textarea { box-sizing:border-box; width:100%; color:#17211b; background:#fff }
.biz-form fieldset { display:grid; gap:.6rem; min-width:0 }
.biz-lines { display:grid; gap:.65rem }
.biz-line { display:flex; flex-wrap:wrap; align-items:end; gap:.45rem; border-bottom:1px solid #d8dcd7; padding-bottom:.5rem }
.biz-line label { flex:1 1 5rem; min-width:0 }
.biz-line label:first-child { flex:2 1 9rem }
.biz-alert { color:#952d20; margin:0 }
.biz-empty { padding:1rem 0; color:#45534c }
.biz-overview { display:grid; gap:.4rem; background:var(--panel,#fffef9) }
.biz-overview h2 { margin:0 0 .3rem }
.biz-overview .biz-comparison,.biz-overview .biz-agenda { box-sizing:border-box; display:grid; width:100%; align-items:center; gap:1rem; padding:.45rem .55rem; text-align:left; border:0; border-bottom:1px solid #dfe2d7; border-radius:0; background:transparent }
.biz-overview .biz-comparison { grid-template-columns:minmax(120px,1fr) minmax(100px,2.5fr) minmax(80px,auto) }
.biz-overview .biz-agenda { grid-template-columns:minmax(80px,110px) minmax(100px,1fr) auto }
.biz-overview small { display:block; color:#596250; font-weight:450 }
.biz-overview .biz-comparison>b,.biz-overview .biz-agenda>b { text-align:right; font-variant-numeric:tabular-nums }
.biz-track { display:block; height:.68rem; border-radius:8px; background:#e9ecdf; position:relative }
.biz-track i { height:100%; display:block; border-radius:8px }
.biz-track b { position:absolute; top:-3px; bottom:-3px; width:2px; background:#1e2821; transform:translateX(-50%) }
.biz-timing { display:inline-block; justify-self:start; padding:.24rem .45rem; border-radius:4px; font-size:.78rem; color:#243023 }
@media(max-width:600px) { .biz-overview .biz-comparison{grid-template-columns:minmax(80px,1fr) minmax(60px,1fr) auto;gap:.45rem} .biz-overview .biz-agenda{grid-template-columns:auto minmax(80px,1fr);gap:.5rem}.biz-overview .biz-agenda>b{grid-column:2;text-align:left} }
@media(max-width:700px) { .biz-sheet{padding:.7rem} .biz-grid{font-size:.86rem} }
`;
function inputFor(field, value) {
  let input;
  if (field.type === 'select')
    input = el('select', {}, ...field.choices.map((v) => el('option', { value: v }, v)));
  else if (field.type === 'textarea') input = el('textarea', { rows: 3 });
  else input = el('input', { type: field.type || 'text' });
  for (const key of ['min', 'max', 'step', 'placeholder', 'maxLength']) {
    if (field[key] !== undefined) input.setAttribute(key, String(field[key]));
  }
  if (['text', 'textarea'].includes(field.type) && !input.hasAttribute('maxlength')) input.maxLength = 2000;
  input.required = !field.optional;
  input.setAttribute('aria-label', field.label);
  if (value !== undefined && value !== null) input.value = String(value);
  return {
    node: el('label', {}, field.label, input),
    read: () => (field.type === 'number' && input.value !== '' ? Number(input.value) : input.value.trim()),
  };
}
function inputGroup(field, rows) {
  const container = el('div', { className: 'biz-lines' });
  const readers = new Map();
  function add(values = {}) {
    const controls = field.columns.map((col) => [col.key, inputFor(col, values[col.key] ?? col.initial)]);
    const line = el('div', { className: 'biz-line' }, ...controls.map(([, c]) => c.node));
    const remove = el(
      'button',
      {
        type: 'button',
        onClick: () => {
          readers.delete(line);
          line.remove();
        },
      },
      'Remove line',
    );
    line.append(remove);
    readers.set(line, () => Object.fromEntries(controls.map(([key, c]) => [key, c.read()])));
    container.append(line);
  }
  for (const row of rows?.length ? rows : [{}]) add(row);
  return {
    node: el(
      'fieldset',
      {},
      el('legend', {}, field.label),
      container,
      el('button', { type: 'button', onClick: () => add() }, 'Add line'),
    ),
    read: () => [...readers.values()].map((read) => read()),
  };
}
function openForm(root, title, fields, initial, submit, label = 'Save', detail = '') {
  const dialog = el('dialog', { className: 'biz-dialog', 'aria-label': title });
  const controls = fields.map((f) => [
    f.key,
    f.type === 'lines' ? inputGroup(f, initial[f.key]) : inputFor(f, initial[f.key] ?? f.initial),
  ]);
  const error = el('p', { className: 'biz-alert', role: 'alert' });
  const form = el(
    'form',
    { className: 'biz-form' },
    ...controls.map(([, c]) => c.node),
    error,
    el(
      'div',
      { className: 'biz-actions' },
      el('button', { type: 'submit', className: 'primary' }, label),
      el('button', { type: 'button', onClick: () => dialog.close() }, 'Cancel'),
    ),
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    try {
      submit(Object.fromEntries(controls.map(([k, c]) => [k, c.read()])));
      dialog.close();
    } catch (e) {
      error.textContent = e.message || 'Could not save this change.';
    }
  });
  dialog.append(el('h2', {}, title));
  if (detail) dialog.append(el('p', {}, detail));
  dialog.append(form);
  root.append(dialog);
  dialog.addEventListener('close', () => dialog.remove(), { once: true });
  dialog.showModal();
}

/** A comparison item can open a record or apply the corresponding register filter. */
export function comparison(title, items, emptyText, accent = '#4a695c') {
  const box = el('section', { className: 'biz-sheet biz-overview' }, el('h2', {}, title));
  if (!items.length) {
    box.append(el('p', { className: 'muted' }, emptyText));
    return box;
  }
  for (const item of items) {
    const fraction = Math.max(0, Math.min(1, item.fraction || 0));
    const track = el(
      'span',
      { className: 'biz-track', 'aria-hidden': 'true' },
      el('i', { style: { width: 100 * fraction + '%', background: item.color || accent } }),
    );
    if (Number.isFinite(item.marker))
      track.append(el('b', { style: { left: Math.min(100, Math.max(0, item.marker * 100)) + '%' } }));
    box.append(
      el(
        'button',
        { type: 'button', className: 'biz-comparison', onClick: item.run },
        el('span', {}, el('strong', {}, item.label), el('small', {}, item.note)),
        track,
        el('b', {}, item.value),
      ),
    );
  }
  return box;
}

export function agenda(title, items, emptyText) {
  const panel = el('section', { className: 'biz-sheet biz-overview' }, el('h2', {}, title));
  if (!items.length) panel.append(el('p', { className: 'muted' }, emptyText));
  for (const item of items)
    panel.append(
      el(
        'button',
        { type: 'button', className: 'biz-agenda', onClick: item.run },
        el('span', { className: 'biz-timing', style: { background: item.tone || '#e4e8d9' } }, item.when),
        el('span', {}, el('strong', {}, item.label), el('small', {}, item.note)),
        el('b', {}, item.value),
      ),
    );
  return panel;
}

export function mountWorkbench(root, context, config) {
  const loaded = context.load(null);
  let rows = Array.isArray(loaded?.rows) ? loaded.rows : config.seed();
  if (!Array.isArray(loaded?.rows)) context.save({ version: 1, rows });
  if (loaded === null) context.save({ version: 1, rows });
  let filter = 'All',
    search = '',
    expanded = null;
  const sheet = el('div', { className: 'biz-sheet' });
  const stats = el('div', { className: 'biz-stats' });
  const overview = el('div', {});
  const list = el('div', { className: 'biz-scroll' });
  function save(next) {
    context.save({ version: 1, rows: next });
    rows = next;
    draw();
  }
  function edit(row) {
    openForm(
      root,
      row ? 'Edit ' + config.singular : 'New ' + config.singular,
      config.fields,
      row ? config.form(row) : config.blank(),
      (values) => {
        const record = config.record(values, row, rows);
        save(row ? rows.map((r) => (r.id === row.id ? record : r)) : [...rows, record]);
      },
    );
  }
  function controls(row) {
    const bar = el('div', { className: 'biz-actions' });
    bar.append(el('button', { type: 'button', onClick: () => edit(row) }, 'Edit'));
    const api = {
      form: (title, fields, initial, update, label) =>
        openForm(
          root,
          title,
          fields,
          initial,
          (data) => save(rows.map((r) => (r.id === row.id ? update(r, data) : r))),
          label,
        ),
      download: context.download,
      notify: context.notify,
    };
    for (const action of config.actions?.(row, api, rows) ?? []) {
      bar.append(el('button', { type: 'button', onClick: action.run }, action.label));
    }
    bar.append(
      el(
        'button',
        {
          type: 'button',
          onClick: () =>
            openForm(
              root,
              'Delete ' + config.singular + '?',
              [],
              {},
              () => {
                save(rows.filter((r) => r.id !== row.id));
                expanded = null;
              },
              'Delete',
              'This removes “' + config.title(row) + '” and its associated entries from this workspace.',
            ),
        },
        'Delete',
      ),
    );
    return bar;
  }
  function draw() {
    stats.replaceChildren(
      ...config
        .metrics(rows)
        .map(([label, val]) =>
          el('div', { className: 'biz-stat' }, el('small', {}, label), el('strong', {}, String(val))),
        ),
    );
    if (config.overview)
      overview.replaceChildren(
        config.overview(
          rows,
          (row) => {
            expanded = row.id;
            filter = 'All';
            search = '';
            chooser.value = filter;
            searchBox.value = search;
            draw();
            list.querySelector('.biz-detail')?.scrollIntoView({ block: 'nearest' });
          },
          (group) => {
            expanded = null;
            filter = group;
            search = '';
            chooser.value = group;
            searchBox.value = '';
            draw();
            list.scrollIntoView({ block: 'nearest' });
          },
        ),
      );
    let visible = rows.filter(
      (r) =>
        (filter === 'All' ||
          (config.matchesGroup ? config.matchesGroup(r, filter) : config.group(r) === filter)) &&
        (config.search?.(r) ?? config.values(r).join(' ')).toLowerCase().includes(search.toLowerCase()),
    );
    if (config.sort) visible = visible.sort(config.sort);
    if (!visible.length) {
      list.replaceChildren(
        el(
          'p',
          { className: 'biz-empty' },
          rows.length
            ? 'No records match these filters.'
            : 'Your workspace is empty. Add the first ' + config.singular + '.',
        ),
      );
      return;
    }
    const head = el(
      'tr',
      {},
      ...[...config.columns, 'Details'].map((col) => el('th', { scope: 'col' }, col)),
    );
    const body = el('tbody', {});
    for (const row of visible) {
      const show = expanded === row.id;
      const record = el('tr', {}, ...config.values(row).map((v) => el('td', {}, String(v))));
      const button = el(
        'button',
        {
          type: 'button',
          'aria-expanded': String(show),
          'aria-label': (show ? 'Close ' : 'Open ') + config.title(row),
          onClick: () => {
            expanded = show ? null : row.id;
            draw();
            [...list.querySelectorAll('button[data-row]')].find((b) => b.dataset.row === row.id)?.focus();
          },
        },
        show ? 'Close' : 'Open',
      );
      button.dataset.row = row.id;
      record.append(el('td', {}, button));
      body.append(record);
      if (show) {
        const details = el(
          'div',
          { className: 'biz-detail' },
          el('h3', {}, config.title(row)),
          ...config.detail(row).map((s) => el('div', {}, s)),
          controls(row),
        );
        const cell = el('td', {}, details);
        cell.colSpan = config.columns.length + 1;
        body.append(el('tr', {}, cell));
      }
    }
    list.replaceChildren(el('table', { className: 'biz-grid' }, el('thead', {}, head), body));
  }
  const searchBox = el('input', {
    type: 'search',
    'aria-label': 'Search records',
    placeholder: 'Search records…',
    onInput: (e) => {
      search = e.target.value;
      draw();
    },
  });
  const chooser = el(
    'select',
    {
      'aria-label': 'Filter records',
      onChange: (e) => {
        filter = e.target.value;
        draw();
      },
    },
    ...['All', ...config.groups].map((v) =>
      el('option', { value: v }, v === 'All' ? 'All ' + config.plural : v),
    ),
  );
  const exportButton = el(
    'button',
    {
      type: 'button',
      onClick: () => {
        context.download(config.id + '.csv', csv(config.export(rows)), 'text/csv;charset=utf-8');
      },
    },
    'Export CSV',
  );
  sheet.append(
    el(
      'div',
      { className: 'biz-heading' },
      el('h2', {}, config.heading),
      el(
        'button',
        { type: 'button', className: 'primary', onClick: () => edit(null) },
        'New ' + config.singular,
      ),
    ),
    el('div', { className: 'biz-toolbar', style: { margin: '1rem 0' } }, searchBox, chooser, exportButton),
    list,
  );
  root.replaceChildren(
    el('style', {}, styleText),
    el('section', { className: 'biz-workbench' }, stats, ...(config.overview ? [overview] : []), sheet),
  );
  draw();
}
