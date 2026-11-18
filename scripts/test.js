import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { discover, root } from './project.js';

const folders = [join(root, 'test'), ...(await discover()).map((app) => join(root, 'apps', app.id))];
const tests = (
  await Promise.all(
    folders.map(async (dir) =>
      (await readdir(dir)).filter((name) => name.endsWith('.test.js')).map((name) => join(dir, name)),
    ),
  )
)
  .flat()
  .sort();
const result = spawnSync(process.execPath, ['--test', ...tests], { stdio: 'inherit' });
process.exitCode = result.status ?? 1;
