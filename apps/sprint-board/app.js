import { el } from '../../shared/ui.js';
import {
  mountWorkbench,
  day,
  uid,
  demand,
  requiredText,
  textField,
  decimalField,
  selectField,
} from '../../shared/business.js';

const lanes = ['Backlog', 'Ready', 'Doing', 'Review', 'Done'];
const limits = { Doing: 3, Review: 2 };
export function putTask(v, old, rows, today = day()) {
  requiredText(v.name, 'a task name');
  requiredText(v.owner, 'an owner');
  demand(
    lanes.includes(v.stage) && Number.isInteger(v.points) && v.points >= 0 && v.points <= 100,
    'Use a valid stage and 0–100 whole points.',
  );
  demand(v.stage !== 'Done' || !v.blocker, 'Clear the blocker before completing this task.');
  if (old?.stage !== v.stage && limits[v.stage])
    demand(
      rows.filter((r) => r.stage === v.stage && r.id !== old?.id).length < limits[v.stage],
      v.stage + ' is at its limit of ' + limits[v.stage] + '. Move an existing task first.',
    );
  const history = [...(old?.history ?? [])];
  if (v.stage !== old?.stage)
    history.push({ date: today, note: old ? old.stage + ' → ' + v.stage : 'Created in ' + v.stage });
  if ((old?.blocker ?? '') !== v.blocker)
    history.push({ date: today, note: v.blocker ? 'Blocked · ' + v.blocker : 'Blocker cleared' });
  return { ...v, id: old?.id ?? uid(), history };
}
export function completion(rows) {
  const planned = rows.filter((r) => r.stage !== 'Backlog');
  return {
    planned: planned.reduce((n, r) => n + r.points, 0),
    done: planned.filter((r) => r.stage === 'Done').reduce((n, r) => n + r.points, 0),
  };
}
const blank = () => ({
  name: '',
  owner: '',
  stage: 'Backlog',
  points: 1,
  blocker: '',
  description: '',
});
const seed = () =>
  [
    ['t1', 'Document onboarding', 'Mara', 'Backlog', 3, ''],
    ['t2', 'Audit empty states', 'Reed', 'Ready', 2, ''],
    ['t3', 'Import customer list', 'Alex', 'Doing', 5, 'Waiting for sample headers'],
    ['t4', 'Review export flow', 'June', 'Review', 3, ''],
    ['t5', 'Write setup checklist', 'Mara', 'Done', 2, ''],
  ].map(([id, name, owner, stage, points, blocker]) => ({
    id,
    name,
    owner,
    stage,
    points,
    blocker,
    description: '',
    history: [{ date: day(-1), note: 'Created in ' + stage }],
  }));
const fields = [
  textField('name', 'Task'),
  textField('owner', 'Owner'),
  selectField('stage', 'Stage', lanes),
  decimalField('points', 'Story points', { step: 1, max: 100 }),
  textField('description', 'Acceptance notes', { type: 'textarea', optional: true }),
  textField('blocker', 'Blocker · leave empty if clear', { optional: true }),
];
function overview(rows, open) {
  const board = el('div', { className: 'sb-lanes', 'aria-label': 'Sprint board' });
  for (const lane of lanes) {
    const tasks = rows.filter((r) => r.stage === lane);
    const count = tasks.length + (limits[lane] ? ' / ' + limits[lane] : '');
    const column = el('section', { className: 'sb-lane' }, el('h3', {}, lane + ' · ' + count));
    for (const task of tasks) {
      column.append(
        el(
          'button',
          { type: 'button', onClick: () => open(task) },
          el('strong', {}, task.name),
          el('small', {}, task.owner + ' · ' + task.points + ' pt' + (task.blocker ? ' · Blocked' : '')),
        ),
      );
    }
    if (!tasks.length) column.append(el('small', {}, 'No tasks'));
    board.append(column);
  }
  const style = `
    .sb-lanes{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,125px),1fr));gap:.45rem}
    .sb-lane{background:#eff1eb;color:#17211b;border-radius:8px;padding:.6rem;min-width:0}
    .sb-lane h3{font-size:.84rem;margin:.15rem 0 .6rem}
    .sb-lane button{display:grid;gap:.4rem;padding:.5rem;background:#fff;color:#19291f;width:100%;text-align:left;height:auto;white-space:normal;overflow-wrap:anywhere;margin:.4rem 0}
  `;
  return el('div', {}, el('style', {}, style), board);
}
const config = {
  id: 'sprint-board',
  singular: 'task',
  plural: 'tasks',
  heading: 'Task register',
  blank,
  seed,
  overview,
  groups: [...lanes, 'Blocked'],
  group: (r) => r.stage,
  matchesGroup: (r, f) => (f === 'Blocked' ? Boolean(r.blocker) : r.stage === f),
  title: (r) => r.name,
  fields,
  form: (r) => r,
  record: putTask,
  metrics: (rows) => {
    const p = completion(rows);
    return [
      ['Committed points', p.planned],
      ['Completed points', p.done],
      ['Completion', p.planned ? Math.round((p.done * 100) / p.planned) + '%' : '—'],
      ['Blocked tasks', rows.filter((r) => r.blocker).length],
    ];
  },
  columns: ['Task', 'Owner', 'Stage', 'Points', 'Blocker'],
  values: (r) => [r.name, r.owner, r.stage, r.points, r.blocker || 'Clear'],
  detail: (r) => [r.description || 'No acceptance notes.', ...r.history.map((h) => h.date + ' · ' + h.note)],
  actions: (r, api, rows) => [
    {
      label: 'Move task',
      run: () =>
        api.form(
          'Move task',
          [selectField('stage', 'Destination', lanes)],
          { stage: lanes[Math.min(lanes.length - 1, lanes.indexOf(r.stage) + 1)] },
          (row, v) => putTask({ ...row, ...v }, row, rows),
          'Move',
        ),
    },
    {
      label: r.blocker ? 'Update blocker' : 'Flag blocker',
      run: () =>
        api.form(
          'Update blocker',
          [textField('blocker', 'Blocker · leave empty to clear', { optional: true })],
          { blocker: r.blocker },
          (row, v) => putTask({ ...row, ...v }, row, rows),
        ),
    },
  ],
  export: (rows) => [
    ['Task', 'Owner', 'Stage', 'Points', 'Blocker', 'Acceptance notes', 'History'],
    ...rows.map((r) => [
      r.name,
      r.owner,
      r.stage,
      r.points,
      r.blocker,
      r.description,
      r.history.map((h) => h.date + ' ' + h.note).join('\n'),
    ]),
  ],
};
export const mount = (root, context) => mountWorkbench(root, context, config);
