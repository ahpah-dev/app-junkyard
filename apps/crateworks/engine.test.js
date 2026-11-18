import test from 'node:test';
import assert from 'node:assert/strict';
import { begin, exportGame, initial, problem, solveLevel, solved, step } from './engine.js';
test('first sample can be solved with two right moves', () => {
  let s = begin(initial.levels[0].rows);
  s = step(step(s, 1, 0), 1, 0);
  assert.ok(solved(s));
  assert.equal(s.moves, 2);
});
test('boxes cannot pass through walls, other boxes, or wrap rows', () => {
  for (const rows of [['@$#'], ['@$$ '], [' @$', '   ']]) {
    const s = begin(rows);
    assert.equal(step(s, 1, 0), s);
  }
});
test('validator catches unequal crates and goals; export escapes user content', () => {
  assert.match(problem(['@$ ']), /same/);
  const html = exportGame({ ...initial, title: '</script>' });
  assert.equal(html.match(/<\/script>/g).length, 1);
  assert.match(html, /function gameRunner/);
});
test('BFS solver finds optimal solutions and detects deadlocked levels', () => {
  const s1 = solveLevel(initial.levels[0].rows);
  assert.equal(s1.solvable, true);
  assert.equal(s1.moves, 'RR');
  assert.equal(s1.steps, 2);

  const s2 = solveLevel(initial.levels[1].rows);
  assert.equal(s2.solvable, true);
  assert.ok(s2.steps > 0);

  const dead = solveLevel([
    '############',
    '#$@  .     #',
    '#          #',
    '#          #',
    '#          #',
    '#          #',
    '#          #',
    '#          #',
    '############',
  ]);
  assert.equal(dead.solvable, false);
});
