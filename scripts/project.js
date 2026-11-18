import { readdir, readFile, access, mkdir, writeFile, cp } from 'node:fs/promises';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
export const categories = ['AI', 'Crypto', 'Design', 'Games', 'Business', 'Operations'];
export const slug = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/;

export async function discover(base = root) {
  const directories = (await readdir(join(base, 'apps'), { withFileTypes: true })).filter((x) =>
    x.isDirectory(),
  );
  const manifest = await Promise.all(
    directories.map(async ({ name }) => {
      const folder = join(base, 'apps', name);
      const item = JSON.parse(await readFile(join(folder, 'app.json'), 'utf8'));
      if (
        !slug.test(name) ||
        item.id !== name ||
        !categories.includes(item.category) ||
        !item.name ||
        !item.description ||
        !Array.isArray(item.features) ||
        !item.features.length
      ) {
        throw new Error('Invalid application manifest in ' + name);
      }
      await Promise.all(['app.js', 'README.md'].map((file) => access(join(folder, file))));
      return item;
    }),
  );
  if (!manifest.length) throw new Error('No apps found.');
  return manifest.sort(
    (a, b) =>
      categories.indexOf(a.category) - categories.indexOf(b.category) || a.name.localeCompare(b.name, 'en'),
  );
}

export async function build(target, base = root) {
  const apps = await discover(base);
  await mkdir(target, { recursive: true });
  await cp(join(base, 'web'), target, { recursive: true });
  await cp(join(base, 'shared'), join(target, 'shared'), { recursive: true });
  for (const app of apps) {
    await cp(join(base, 'apps', app.id), join(target, 'apps', app.id), {
      recursive: true,
      filter: (path) => !path.endsWith('.test.js'),
    });
  }
  await Promise.all([
    cp(join(base, 'LICENSE'), join(target, 'LICENSE')),
    writeFile(join(target, 'catalog.json'), JSON.stringify(apps, null, 2) + '\n'),
    writeFile(join(target, '.nojekyll'), ''),
  ]);
  if (apps.length === 1) {
    const [app] = apps;
    const page = (await readFile(join(target, 'app.html'), 'utf8')).replace(
      'id="workspace"',
      'id="workspace" data-default-app="' + app.id + '"',
    );
    await Promise.all(['index.html', 'app.html'].map((f) => writeFile(join(target, f), page)));
  }
  return apps;
}
