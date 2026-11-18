import test from 'node:test';
import assert from 'node:assert/strict';
import { exportGame, follow, initial, links, options, validProject } from './engine.js';
test('sample requires the lens and can be completed', () => {
  let s = follow(initial.scenes[0], [], 0);
  assert.deepEqual(s, { id: 'lamp', flags: [] });
  assert.equal(options(initial.scenes[0], []).length, 1);
  s = follow(initial.scenes[1], [], 0);
  assert.deepEqual(follow(initial.scenes[0], s.flags, 1), {
    id: 'boat',
    flags: ['lens'],
  });
});
test('dangling links, unreachable scenes and hostile text', () => {
  const p = structuredClone(initial);
  p.scenes.push({ ...p.scenes[2], id: 'extra' });
  assert.deepEqual(links(p), ['The reply']);
  p.scenes[0].choices[0].to = 'missing';
  assert.equal(validProject(p), false);
  p.title = '</script><b>';
  assert.equal(exportGame(p).match(/<\/script>/g).length, 1);
});
