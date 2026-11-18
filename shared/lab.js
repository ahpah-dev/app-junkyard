import { el } from './ui.js';

export const jsonLines = (rows) => rows.map((row) => JSON.stringify(row)).join('\n');
export const words = (text) =>
  text
    .normalize('NFKC')
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) ?? [];

export function check(condition, message) {
  if (!condition) throw new Error(message);
}

export function number(value, label, min, max, integer = false) {
  const parsed = Number(value);
  check(
    String(value).trim() &&
      Number.isFinite(parsed) &&
      parsed >= min &&
      parsed <= max &&
      (!integer || Number.isInteger(parsed)),
    label + ' must be ' + (integer ? 'a whole number' : 'a number') + ' between ' + min + ' and ' + max + '.',
  );
  return parsed;
}

export function rowsOf(text, maximum = 5000) {
  check(typeof text === 'string' && text.length <= 1500000, 'Input must fit within 1.5 million characters.');
  const rows = [];
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (!line.trim()) continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      throw new Error('Line ' + (index + 1) + ' must be a complete JSON object.');
    }
    check(
      row && typeof row === 'object' && !Array.isArray(row),
      'Expected an object on line ' + (index + 1) + '.',
    );
    rows.push(row);
    check(rows.length <= maximum, 'Use at most ' + maximum + ' records.');
  }
  check(rows.length, 'Add at least one record.');
  return rows;
}

export function requiredText(row, key, index) {
  check(
    typeof row[key] === 'string' && row[key].trim(),
    'Record ' + (index + 1) + ' needs a nonempty ' + key + ' string.',
  );
  return row[key].trim();
}

// Quantities cross the UI boundary as strings to preserve token precision.
export function units(value, decimals, name = 'Amount') {
  check(
    typeof value === 'string' && value.length <= 80 && /^\d+(\.\d+)?$/.test(value),
    name + ' must be a nonnegative decimal string, for example "12.5".',
  );
  const [whole, fraction = ''] = value.split('.');
  check(fraction.length <= decimals, name + ' supports up to ' + decimals + ' decimal places.');
  return BigInt(whole + fraction.padEnd(decimals, '0'));
}

export function decimal(value, places) {
  const sign = value < 0n ? '-' : '';
  const absolute = (value < 0n ? -value : value).toString().padStart(places + 1, '0');
  if (!places) return sign + absolute;
  const fraction = absolute.slice(-places).replace(/0+$/, '');
  return sign + absolute.slice(0, -places) + (fraction ? '.' + fraction : '');
}

export function utcDay(value, name) {
  check(
    typeof value === 'string' && /^[1-9]\d{3}-\d{2}-\d{2}$/.test(value),
    name + ' must be an ISO date such as 2026-08-01.',
  );
  const time = Date.parse(value + 'T00:00:00Z');
  check(
    Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value,
    name + ' is an invalid calendar date.',
  );
  return time / 86400000;
}

export function gridTable(headings, rows) {
  const wrap = el('div', { style: { overflowX: 'auto', maxWidth: '100%' } });
  wrap.append(
    el(
      'table',
      {},
      el('thead', {}, el('tr', {}, ...headings.map((item) => el('th', { scope: 'col' }, item)))),
      el('tbody', {}, ...rows.map((row) => el('tr', {}, ...row.map((cell) => el('td', {}, String(cell)))))),
    ),
  );
  return wrap;
}

export function metrics(items) {
  return el(
    'div',
    {
      className: 'grid',
      style: {
        gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,105px),1fr))',
        gap: '8px',
      },
    },
    ...items.map(([title, value]) =>
      el(
        'div',
        { className: 'panel', style: { padding: '11px', overflowWrap: 'anywhere' } },
        el('small', { className: 'muted' }, title),
        el('div', { className: 'metric' }, String(value)),
      ),
    ),
  );
}

export function bars(title, entries) {
  const figure = el(
    'figure',
    { style: { margin: 0, padding: '16px', background: '#eff2e9', borderRadius: '6px' } },
    el('figcaption', { style: { fontWeight: 650, marginBottom: '10px' } }, title),
  );
  for (const { label, fraction, value, color = '#38765b' } of entries) {
    figure.append(
      el(
        'div',
        { style: { marginTop: '8px' } },
        el(
          'div',
          { style: { display: 'flex', justifyContent: 'space-between', fontSize: '13px', gap: '8px' } },
          el('span', {}, label),
          el('strong', { style: { whiteSpace: 'nowrap' } }, value),
        ),
        el(
          'div',
          {
            'aria-hidden': 'true',
            style: { height: '7px', background: '#d5ddce', borderRadius: '2px', overflow: 'hidden' },
          },
          el('div', {
            style: {
              width: Math.max(0, Math.min(1, fraction)) * 100 + '%',
              height: '100%',
              background: color,
            },
          }),
        ),
      ),
    );
  }
  return figure;
}

// Keep the exact numeric output in the adjacent report. Canvas only plots a trend.
export function lineChart(title, points) {
  const width = 560,
    height = 148;
  const canvas = el('canvas', {
    width: width * 2,
    height: height * 2,
    role: 'img',
    'aria-label': title,
    style: { width: '100%', height: 'auto', display: 'block', marginTop: '10px' },
  });
  const plot = canvas.getContext('2d');
  const high = Math.max(...points.map((p) => p.value));
  const low = Math.min(...points.map((p) => p.value));
  const span = high - low || 1;
  const x = (i) => 12 + (i * (width - 24)) / Math.max(1, points.length - 1);
  const y = (value) => (high === low ? height / 2 : 10 + ((high - value) / span) * (height - 20));
  plot.scale(2, 2);
  plot.strokeStyle = '#d6d9bd';
  for (const grid of [10, height / 2, height - 10]) {
    plot.beginPath();
    plot.moveTo(0, grid);
    plot.lineTo(width, grid);
    plot.stroke();
  }
  plot.beginPath();
  points.forEach((p, i) => (i ? plot.lineTo(x(i), y(p.value)) : plot.moveTo(x(i), y(p.value))));
  plot.strokeStyle = '#915b13';
  plot.lineWidth = 3;
  plot.lineJoin = 'round';
  plot.stroke();
  plot.lineTo(x(points.length - 1), height - 10);
  plot.lineTo(x(0), height - 10);
  plot.closePath();
  plot.fillStyle = 'rgba(204,150,44,0.18)';
  plot.fill();
  if (points.length <= 40)
    for (const [i, p] of points.entries()) {
      plot.beginPath();
      plot.arc(x(i), y(p.value), 3.6, 0, Math.PI * 2);
      plot.fillStyle = '#473e24';
      plot.fill();
    }
  const labels = el(
    'div',
    { style: { display: 'flex', justifyContent: 'space-between', gap: '10px', fontSize: '12px' } },
    el('span', {}, points[0].label),
    el('span', {}, points.at(-1).label),
  );
  return el(
    'figure',
    { style: { margin: 0, padding: '16px', background: '#f4efdc', borderRadius: '6px' } },
    el(
      'figcaption',
      {},
      el('strong', {}, title),
      el(
        'div',
        { className: 'muted', style: { fontSize: '12px' } },
        'Range ' +
          low.toLocaleString('en-US', { maximumSignificantDigits: 6 }) +
          ' to ' +
          high.toLocaleString('en-US', { maximumSignificantDigits: 6 }),
      ),
    ),
    canvas,
    labels,
  );
}

export function button(label, action) {
  return el('button', { type: 'button', onClick: action }, label);
}

export function jsonExport(ctx, filename, result) {
  return button('Download report', () =>
    ctx.download(filename, JSON.stringify(result, null, 2), 'application/json'),
  );
}

function recordEditor(field, source) {
  const sample = rowsOf(field.value);
  const keys = [...new Set(sample.flatMap((row) => Object.keys(row)))];
  const contents = el('div', { className: 'stack', style: { paddingTop: '10px' } });
  const editor = el('details', {}, el('summary', {}, 'Edit individual records'), contents);
  const selected = el('select', { 'aria-label': 'Choose a record' });
  const inputs = new Map();
  const status = el('small', { role: 'status' });
  const fieldBox = el('div', {
    className: 'grid',
    style: { gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,165px),1fr))' },
  });
  let records = [];
  for (const key of keys) {
    const input = ['text', 'baseline', 'candidate', 'expected'].includes(key)
      ? el('textarea', { rows: 2 })
      : el('input', { type: 'text' });
    inputs.set(key, input);
    fieldBox.append(el('label', {}, key, input));
  }
  function selectRow() {
    const row = records[Number(selected.value)] ?? {};
    for (const [key, input] of inputs) input.value = row[key] ?? '';
    remove.disabled = selected.value === '-1';
    status.textContent = '';
  }
  function refresh(index = 0) {
    try {
      records = source.value.trim() ? rowsOf(source.value) : [];
      const options = records.map((row, i) => {
        const preview = row.id ?? row.text ?? row.label ?? row.asset ?? row.side ?? '';
        return el('option', { value: String(i) }, i + 1 + ' · ' + String(preview).slice(0, 70));
      });
      selected.replaceChildren(...options, el('option', { value: '-1' }, 'Add a new record…'));
      selected.value = String(records.length ? index : -1);
      selectRow();
      contents.replaceChildren(selected, fieldBox, actions, status);
    } catch (error) {
      contents.replaceChildren(
        el('small', { role: 'alert' }, error.message + ' Correct the source above to use the editor.'),
      );
    }
  }
  function updateSource(nextIndex) {
    source.value = jsonLines(records);
    source.dispatchEvent(new Event('input', { bubbles: true }));
    refresh(nextIndex);
  }
  const apply = button('Apply record', () => {
    const index = Number(selected.value);
    const update = { ...records[index] };
    for (const [key, input] of inputs) {
      const optional = ['group', 'rule', 'from', 'to'].includes(key);
      if (!optional && !['baseline', 'candidate'].includes(key) && !input.value.trim()) {
        status.textContent = 'Enter a value for ' + key + '.';
        input.focus();
        return;
      }
      if (optional && !input.value) delete update[key];
      else update[key] = input.value;
    }
    if (index < 0) records.push(update);
    else records[index] = update;
    updateSource(index < 0 ? records.length - 1 : index);
    status.textContent = 'Record applied to source.';
  });
  const remove = button('Remove record', () => {
    if (!window.confirm('Remove the selected record from the source?')) return;
    const index = Number(selected.value);
    records.splice(index, 1);
    updateSource(Math.min(index, records.length - 1));
    status.textContent = 'Record removed.';
  });
  const actions = el('div', { className: 'actions' }, apply, remove);
  selected.addEventListener('change', selectRow);
  editor.addEventListener('toggle', () => {
    if (editor.open) refresh();
  });
  source.addEventListener('input', () => {
    if (editor.open) refresh();
  });
  return editor;
}

// Apps provide their own input schema, domain logic, and result panels.
// The host owns storage and downloads so each fork can replace those adapters.
export function lab(root, ctx, spec) {
  const saved = ctx.load({});
  const controls = new Map();
  let revision = 0;
  const form = el('form', { className: 'stack panel' });
  const output = el('section', { className: 'stack panel', 'aria-label': spec.output });
  const status = el('div', { role: 'status', className: 'muted' });
  const read = () => Object.fromEntries([...controls].map(([key, control]) => [key, control.value]));
  const save = () => {
    try {
      ctx.save(read());
    } catch {
      status.textContent = 'This browser could not save the draft.';
    }
  };
  const changed = () => {
    revision++;
    output.replaceChildren(el('p', { className: 'muted' }, 'Run again to update these results.'));
    status.textContent = '';
    save();
  };

  const run = async () => {
    const current = ++revision;
    if (!form.reportValidity()) return;
    const data = read();
    status.textContent = 'Working…';
    try {
      const result = await spec.calculate(data);
      if (revision !== current) return;
      const content = spec.render(result, ctx, data);
      output.replaceChildren(el('h3', {}, spec.output), ...content);
      status.textContent = 'Results updated.';
    } catch (error) {
      if (revision !== current) return;
      output.replaceChildren(el('p', { role: 'alert' }, error.message));
      status.textContent = '';
    }
  };

  form.append(el('h3', {}, spec.input));
  for (const field of spec.fields) {
    const attrs = { name: field.key, id: 'lab-' + field.key, required: field.required !== false };
    let control;
    if (field.options) {
      control = el('select', attrs, ...field.options.map(([value, name]) => el('option', { value }, name)));
    } else if (field.rows) {
      control = el('textarea', { ...attrs, rows: field.rows, spellcheck: false, wrap: 'soft' });
    } else {
      control = el('input', { ...attrs, type: field.type ?? 'text', ...(field.attrs ?? {}) });
    }
    const stored = saved?.[field.key];
    control.value = typeof stored === 'string' ? stored : String(field.value);
    if (field.options && control.selectedIndex < 0) control.value = String(field.value);
    controls.set(field.key, control);
    const group = el('div', { className: 'stack' }, el('label', { for: attrs.id }, field.label), control);
    if (field.hint) group.append(el('small', { className: 'muted' }, field.hint));
    if (field.rows && field.label.includes('JSONL')) group.append(recordEditor(field, control));
    if (field.import) {
      const picker = el('input', {
        type: 'file',
        accept: field.import,
        'aria-label': 'Import ' + field.label,
      });
      picker.addEventListener('change', async () => {
        const file = picker.files[0];
        if (!file) return;
        try {
          check(file.size <= 1500000, 'Choose a file smaller than 1.5 MB.');
          control.value = await file.text();
          control.dispatchEvent(new Event('input', { bubbles: true }));
          status.textContent = 'Imported ' + file.name + '.';
        } catch (error) {
          status.textContent = error.message;
        }
        picker.value = '';
      });
      group.append(picker);
    }
    control.addEventListener('input', changed);
    form.append(group);
  }
  if (spec.inputTools) {
    form.append(
      spec.inputTools({
        read,
        replace(key, value) {
          const control = controls.get(key);
          control.value = value;
          control.dispatchEvent(new Event('input', { bubbles: true }));
        },
      }),
    );
  }
  form.append(
    el(
      'div',
      { className: 'actions' },
      el('button', { className: 'primary', type: 'submit' }, spec.action),
      button('Load example', () => {
        if (
          [...controls].some(
            ([key, c]) => c.value !== String(spec.fields.find((f) => f.key === key).value),
          ) &&
          !window.confirm('Replace the current inputs with the example?')
        )
          return;
        for (const field of spec.fields) {
          const control = controls.get(field.key);
          control.value = String(field.value);
          control.dispatchEvent(new Event('input', { bubbles: true }));
        }
        save();
        run();
      }),
    ),
    status,
  );
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    run();
  });
  root.replaceChildren(el('div', { className: 'grid', style: { alignItems: 'start' } }, form, output));
  if (spec.fields.some((field) => typeof saved?.[field.key] !== 'string')) save();
  run();
}
