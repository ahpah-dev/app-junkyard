import test from 'node:test';
import assert from 'node:assert/strict';
import { putTask, completion, wipHealth, workloadByOwner } from './app.js';
const task = {
  id: 't',
  name: 'Build',
  owner: 'Reed',
  stage: 'Doing',
  points: 3,
  blocker: '',
  history: [],
};
test('enforces WIP on entry without blocking edits to occupied lanes', () => {
  const rows = [task, { ...task, id: 'x' }, { ...task, id: 'y' }];
  assert.throws(() => putTask({ ...task, name: 'New' }, null, rows));
  assert.equal(putTask(task, task, rows).id, 't');
});
test('blocked tasks cannot complete and backlog points stay outside commitment', () => {
  assert.throws(() => putTask({ ...task, stage: 'Done', blocker: 'Waiting' }, task, [task]));
  assert.deepEqual(
    completion([task, { ...task, stage: 'Done', points: 2 }, { ...task, stage: 'Backlog', points: 8 }]),
    { planned: 5, done: 2 },
  );
});
test('aggregates workload by owner and reports WIP saturation health', () => {
  const rows = [
    task,
    { ...task, id: 'x', stage: 'Doing', owner: 'Reed', points: 5, blocker: 'API' },
    { ...task, id: 'y', stage: 'Doing', owner: 'Mara', points: 2 },
    { ...task, id: 'z', stage: 'Done', owner: 'Mara', points: 4 },
  ];
  const load = workloadByOwner(rows);
  assert.equal(load[0].owner, 'Reed');
  assert.equal(load[0].activePoints, 8);
  assert.equal(load[0].blockedTasks, 1);
  assert.equal(load[1].donePoints, 4);
  const wip = wipHealth(rows);
  assert.equal(wip.find((w) => w.lane === 'Doing').saturated, true);
  assert.equal(wip.find((w) => w.lane === 'Review').saturated, false);
});
