import test from 'node:test';
import assert from 'node:assert/strict';
import { createAccounts } from '../server/accounts.js';
import { createAppServer } from '../server/http.js';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('private snapshots are versioned, isolated by account and app, and require a valid session', async (t) => {
  const site = await mkdtemp(join(tmpdir(), 'junkyard-test-'));
  const accounts = createAccounts({ database: ':memory:', ids: new Set(['one', 'two']) });
  const server = createAppServer({ site, accounts });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = 'http://127.0.0.1:' + server.address().port;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    accounts.close();
    await rm(site, { force: true, recursive: true });
  });
  const post = (path, data, cookie = '', origin = base) =>
    fetch(base + path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: origin, Cookie: cookie },
      body: JSON.stringify(data),
    });
  const get = (path, cookie = '') => fetch(base + path, { headers: { Cookie: cookie } });
  const credentials = { handle: 'bluejay', password: 'a long sample phrase' };
  assert.equal((await get('/api/backups/one')).status, 401);
  assert.equal((await post('/api/register', credentials, '', 'https://example.invalid')).status, 403);
  const registered = await post('/api/register', credentials);
  assert.equal(registered.status, 201);
  const cookie = registered.headers.get('set-cookie').split(';')[0];
  assert.equal((await post('/api/register', credentials)).status, 409);
  assert.equal((await post('/api/login', { ...credentials, password: 'a different password' })).status, 401);
  assert.equal((await post('/api/login', credentials)).status, 200);
  assert.equal((await get('/api/session', cookie).then((r) => r.json())).handle, 'bluejay');
  let first, latest;
  for (let i = 0; i < 6; i++) {
    const r = await post('/api/backups/one', { data: { revision: i } }, cookie);
    assert.equal(r.status, 201);
    latest = (await r.json()).id;
    first ??= latest;
  }
  assert.equal((await get('/api/backups/one', cookie).then((r) => r.json())).items.length, 5);
  assert.equal((await get('/api/backups/one/' + first, cookie)).status, 404);
  assert.deepEqual(await get('/api/backups/one/' + latest, cookie).then((r) => r.json()), {
    data: { revision: 5 },
  });
  const other = (await post('/api/register', { ...credentials, handle: 'heron' })).headers
    .get('set-cookie')
    .split(';')[0];
  assert.equal((await get('/api/backups/one/' + latest, other)).status, 404);
  assert.equal((await get('/api/backups/two/' + latest, cookie)).status, 404);
  assert.equal((await post('/api/backups/unknown', { data: 1 }, cookie)).status, 404);
  assert.equal((await post('/api/logout', {}, cookie)).status, 200);
  assert.equal((await get('/api/backups/one', cookie)).status, 401);
  await writeFile(join(site, 'index.html'), '<h1>App catalog</h1>');
  assert.match(await get('/').then((r) => r.text()), /App catalog/);
  assert.equal((await get('/.git/config')).status, 404);
  assert.equal((await get('/runtime.json').then((r) => r.json())).accounts, true);
});
