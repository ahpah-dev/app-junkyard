import { mkdir, cp, writeFile, readFile, rm } from 'node:fs/promises';
import { resolve, join, relative, isAbsolute, sep } from 'node:path';
import { discover, root } from './project.js';

const [id, out] = process.argv.slice(2);
const apps = await discover();
const app = apps.find((item) => item.id === id);
if (!app) {
  console.error(
    'Usage: npm run fork -- <app-id> [new-directory]\n\n' +
      apps.map((a) => a.id.padEnd(23) + a.name).join('\n'),
  );
  process.exitCode = 1;
} else {
  const target = resolve(out || join(root, 'forks', app.id));
  // The target must be new. Never copy recursively inside a source directory.
  for (const source of ['apps', 'shared', 'server', 'web', 'scripts', '.git', 'test', 'dist', '.junkyard']) {
    const rel = relative(join(root, source), target);
    if (!rel || (rel !== '..' && !rel.startsWith('..' + sep) && !isAbsolute(rel)))
      throw new Error('Choose a directory outside ' + source);
  }
  await mkdir(resolve(target, '..'), { recursive: true });
  await mkdir(target);
  try {
    for (const entry of [
      'shared',
      'server',
      'web',
      'scripts',
      'LICENSE',
      '.gitignore',
      '.gitattributes',
      'HOSTING.md',
    ]) {
      const previewDir = join(root, 'web', 'previews');
      await cp(join(root, entry), join(target, entry), {
        recursive: true,
        filter: (source) => !source.startsWith(previewDir + sep) || source === join(previewDir, id + '.webp'),
      });
    }
    await cp(join(root, 'apps', id), join(target, 'apps', id), { recursive: true });
    await mkdir(join(target, 'test'), { recursive: true });
    await cp(join(root, 'test', 'accounts.test.js'), join(target, 'test', 'accounts.test.js'));
    const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
    Object.assign(pkg, { name: id, description: app.description });
    await writeFile(join(target, 'package.json'), JSON.stringify(pkg, null, 2) + '\n');
    const guide = (await readFile(join(root, 'apps', id, 'README.md'), 'utf8')).replace(
      'See the [collection guide](../../README.md) for running the gallery or exporting this app.',
      'See the running instructions below to launch this copy.',
    );
    await writeFile(
      join(target, 'README.md'),
      guide +
        '\n## Run this fork\n\nWith Node.js 24.13 or newer, run `npm start` and open the printed local address. Run `npm test` for the domain tests or `npm run build` for a static build in `dist/`. See [HOSTING.md](HOSTING.md) for account-backed storage and deployment.\n\nReleased under [the Unlicense](LICENSE).\n',
    );
    console.log('Created ' + app.name + ' in ' + target);
  } catch (error) {
    // mkdir(target) reserved a new directory exclusively for this export.
    await rm(target, { recursive: true, force: true });
    throw error;
  }
}
