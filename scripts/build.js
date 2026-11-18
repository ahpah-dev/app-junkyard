import { join } from 'node:path';
import { access, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { build, root } from './project.js';
const target = join(root, 'dist');
const managed = 'App Junkyard generated site\n';
const state = join(root, '.junkyard');
await mkdir(state, { recursive: true });
const stage = await mkdtemp(join(state, 'build-'));
try {
  const next = join(stage, 'site'),
    previous = join(stage, 'previous');
  const apps = await build(next);
  await writeFile(join(next, '.junkyard-generated'), managed);
  const exists = await access(target).then(
    () => true,
    () => false,
  );
  if (exists) {
    const marker = await readFile(join(target, '.junkyard-generated'), 'utf8').catch(() => '');
    if (marker !== managed)
      throw new Error(
        'The dist directory already exists and is not a generated App Junkyard site. Move it before building.',
      );
    await rename(target, previous);
  }
  try {
    await rename(next, target);
  } catch (error) {
    if (exists) await rename(previous, target);
    throw error;
  }
  console.log('Built ' + apps.length + ' applications into ' + target);
} finally {
  await rm(stage, { recursive: true, force: true });
}
