import test from 'node:test';
import assert from 'node:assert/strict';
import { boardClues, cluesForLine, exportGame, initial, validProject, verifyLogical } from './engine.js';

test('computes row and column nonogram clues and verifies logical solvability', () => {
  assert.deepEqual(cluesForLine([0, 1, 1, 0, 1, 0, 0, 1, 1, 1]), [2, 1, 3]);
  assert.deepEqual(cluesForLine([0, 0, 0]), [0]);
  assert.equal(validProject(initial), true);

  const clues = boardClues(initial.levels[0].cells);
  assert.equal(clues.rows.length, 10);
  assert.equal(clues.cols.length, 10);

  const check1 = verifyLogical(initial.levels[0].cells);
  assert.equal(check1.solvable, true);
  assert.equal(check1.deducedCount, 100);
});

test('detects ambiguous checkerboards and safely exports playable HTML', () => {
  const ambiguous = Array.from({ length: 100 }, (_, i) => {
    const x = i % 10,
      y = Math.floor(i / 10);
    return (x === 0 && y === 0) || (x === 1 && y === 1) ? 1 : 0;
  });
  const res = verifyLogical(ambiguous);
  assert.equal(res.solvable, false);

  const html = exportGame({ ...initial, title: '</script><b>' });
  assert.equal(html.match(/<\/script>/g).length, 1);
  assert.match(html, /function nonogramRunner/);
});
