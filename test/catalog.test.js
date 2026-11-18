import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm, access } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { build, root, discover, categories } from '../scripts/project.js';

test('the catalog builds every declared app with its entry point, guide and license', async (t) => {
  const output = await mkdtemp(join(tmpdir(), 'junkyard-build-'));
  t.after(() => rm(output, { recursive: true, force: true }));
  const manifest = await build(output);
  assert.ok(manifest.length >= 36);
  assert.deepEqual([...new Set(manifest.map((a) => a.category))].sort(), [...categories].sort());
  assert.equal(new Set(manifest.map((a) => a.id)).size, manifest.length);
  assert.deepEqual(JSON.parse(await readFile(join(output, 'catalog.json'), 'utf8')), await discover());
  assert.match(await readFile(join(output, 'LICENSE'), 'utf8'), /public domain/i);
  for (const app of manifest) {
    assert.equal(
      typeof (await import(pathToFileURL(join(root, 'apps', app.id, 'app.js')))).mount,
      'function',
    );
    await access(join(output, 'apps', app.id, 'README.md'));
  }
});
