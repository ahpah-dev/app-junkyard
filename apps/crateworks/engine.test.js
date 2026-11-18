import test from 'node:test';
import assert from 'node:assert/strict';
import { begin, exportGame, initial, problem, solved, step } from './engine.js';
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
