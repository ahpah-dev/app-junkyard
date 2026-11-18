import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { build, root } from '../scripts/project.js';
import { createAppServer } from './http.js';

const dir = join(root, '.junkyard');
await mkdir(dir, { recursive: true });
const site = await mkdtemp(join(dir, 'site-'));
const apps = await build(site);
let accounts;
const host = process.env.HOST || '127.0.0.1';
const origin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : undefined;
if (process.env.WORKSPACE_ACCOUNTS === '1') {
  if (!['localhost', '::1', '127.0.0.1'].includes(host) && !origin?.startsWith('https://')) {
    throw new Error('Set PUBLIC_ORIGIN to your HTTPS site when serving accounts beyond localhost.');
  }
  const { createAccounts } = await import('./accounts.js');
  accounts = createAccounts({
    ids: new Set(apps.map((a) => a.id)),
    database: process.env.WORKSPACE_DB || join(dir, 'workspaces.sqlite'),
    publicOrigin: origin,
    trustedProxyIP: process.env.TRUSTED_PROXY_IP,
  });
}
const server = createAppServer({ site, accounts });
server.listen(Number(process.env.PORT || 4173), host, () => {
  console.log(
    'App Junkyard · ' +
      apps.length +
      ' app(s) · http://' +
      (host.includes(':') ? '[' + host + ']' : host) +
      ':' +
      server.address().port,
  );
});
let closing = false;
function stop() {
  if (closing) return;
  closing = true;
  server.close(async () => {
    accounts?.close();
    await rm(site, { recursive: true, force: true });
  });
}
process.on('SIGTERM', stop);
process.on('SIGINT', stop);
