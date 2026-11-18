import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { root } from '../scripts/project.js';

const run = promisify(execFile);
test('an extracted app builds independently and existing destinations are preserved', async (t) => {
  const temp = await mkdtemp(join(tmpdir(), 'junkyard-fork-'));
  t.after(() => rm(temp, { recursive: true, force: true }));
  const dir = join(temp, 'pool');
  const args = ['scripts/fork.js', 'pool-bench', dir];
  await run(process.execPath, args, { cwd: root });
  await assert.rejects(run(process.execPath, args, { cwd: root }), /EEXIST/);
  await assert.rejects(
    run(process.execPath, ['scripts/fork.js', 'pool-bench', 'dist/child'], { cwd: root }),
    /outside dist/,
  );
  assert.deepEqual(await readdir(join(dir, 'apps')), ['pool-bench']);
  await run(process.execPath, ['scripts/build.js'], { cwd: dir });
  await run(process.execPath, ['scripts/build.js'], { cwd: dir });
  const html = await readFile(join(dir, 'dist', 'index.html'), 'utf8');
  assert.match(html, /data-default-app="pool-bench"/);
  assert.equal(JSON.parse(await readFile(join(dir, 'dist', 'catalog.json'), 'utf8')).length, 1);
  assert.equal(await readFile(join(dir, 'LICENSE'), 'utf8'), await readFile(join(root, 'LICENSE'), 'utf8'));
});
