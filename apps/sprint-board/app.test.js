import test from 'node:test';
import assert from 'node:assert/strict';
import { putTask, completion } from './app.js';
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
