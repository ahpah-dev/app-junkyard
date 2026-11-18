import test from 'node:test';
import assert from 'node:assert/strict';
import { generate, initial, route, walk } from './generator.js';
test('seed reproduces geometry and every floor is reachable', () => {
  for (let seed = 0; seed < 20; seed++) {
    const m = generate({ ...initial, seed });
    assert.equal(
      walk(m.tiles, m.width, m.start).visited.length,
      m.tiles.reduce((a, b) => a + b, 0),
    );
    const path = route(m.parent, m.start, m.end);
    assert.equal(path.at(-1), m.end);
    assert.equal(path[0], m.start);
    assert.deepEqual(m.tiles, generate({ ...initial, seed }).tiles);
  }
});
test('walk cannot cross row boundaries and generator retains wall border', () => {
  assert.deepEqual(walk([0, 0, 1, 1, 0, 0], 3, 2).visited, [2]);
  const m = generate(initial);
  assert.ok(m.tiles.slice(0, m.width).every((n) => !n));
});
