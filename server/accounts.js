import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { isIP } from 'node:net';

const derive = promisify(scrypt);
const week = 7 * 24 * 60 * 60 * 1000;
const maxBody = 2 * 1024 * 1024;
const digest = (value) => createHash('sha256').update(value).digest('hex');
const fail = (status, message) => Object.assign(new Error(message), { status });
const json = (res, status, data) => {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
};

async function readBody(req) {
  if ((req.headers['content-type'] || '').split(';')[0] !== 'application/json')
    throw fail(415, 'Send a JSON body.');
  let bytes = 0;
  const parts = [];
  for await (const part of req) {
    bytes += part.length;
    if (bytes > maxBody) throw fail(413, 'A backup must fit within 2 MiB.');
    parts.push(part);
  }
  try {
    const data = JSON.parse(Buffer.concat(parts).toString());
    if (data && typeof data === 'object' && !Array.isArray(data)) return data;
  } catch {
    /* Return a consistent validation error. */
  }
  throw fail(400, 'Expected a JSON object.');
}

export function createAccounts({ database, ids, publicOrigin, trustedProxyIP }) {
  if (database !== ':memory:') mkdirSync(dirname(database), { recursive: true });
  const db = new DatabaseSync(database);
  db.exec(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY, handle TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, password_hash BLOB NOT NULL
    );
    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY, account INTEGER NOT NULL REFERENCES accounts(id), expires INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS backups (
      id INTEGER PRIMARY KEY, account INTEGER NOT NULL REFERENCES accounts(id), app TEXT NOT NULL,
      created INTEGER NOT NULL, payload TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS backup_owner ON backups(account, app, id);
  `);
  const rate = new Map();
  let inFlight = 0;
  const secure = publicOrigin?.startsWith('https://') ? '; Secure' : '';
  const cookie = (value, seconds) =>
    'junkyard_session=' + value + '; Path=/api/; HttpOnly; SameSite=Strict; Max-Age=' + seconds + secure;

  function limit(ip) {
    const now = Date.now();
    for (const [key, window] of rate) if (window.end <= now) rate.delete(key);
    const attempt = rate.get(ip) || { count: 0, end: now + 10 * 60 * 1000 };
    if (++attempt.count > 30 || inFlight >= 4) throw fail(429, 'Too many sign-in attempts. Try again later.');
    rate.set(ip, attempt);
  }

  async function handle(req, res, path) {
    const token = /(?:^|;\s*)junkyard_session=([a-f0-9]{64})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    const user =
      token &&
      db
        .prepare(
          'SELECT a.id, a.handle FROM sessions s JOIN accounts a ON a.id=s.account WHERE s.token=? AND s.expires>?',
        )
        .get(digest(token), Date.now());
    if (req.method === 'GET' && path === '/api/session')
      return json(res, 200, { handle: user?.handle ?? null });
    if (!['GET', 'POST'].includes(req.method)) throw fail(405, 'Method unavailable.');
    if (req.method === 'POST') {
      const expected = publicOrigin || 'http://' + req.headers.host;
      if (req.headers.origin !== expected) throw fail(403, 'Use the application on its configured origin.');
    }
    if (req.method === 'POST' && ['/api/register', '/api/login'].includes(path)) {
      const peer = req.socket.remoteAddress;
      const client = req.headers['x-real-ip'];
      const behindTrustedProxy =
        trustedProxyIP && peer === trustedProxyIP && typeof client === 'string' && isIP(client);
      limit(behindTrustedProxy ? client : peer);
      const { handle: raw, password } = await readBody(req);
      const name = typeof raw === 'string' ? raw.toLowerCase().trim() : '';
      if (
        !/^[a-z0-9][a-z0-9_-]{2,39}$/.test(name) ||
        typeof password !== 'string' ||
        password.length < 12 ||
        password.length > 256
      ) {
        throw fail(
          400,
          'Use a 3–40 character handle (letters, numbers, dash or underscore) and a 12–256 character password.',
        );
      }
      if (inFlight >= 4) throw fail(429, 'Sign-in is busy. Try again shortly.');
      inFlight++;
      try {
        const registering = path === '/api/register';
        const account = db.prepare('SELECT * FROM accounts WHERE handle=?').get(name);
        const salt = registering || !account ? randomBytes(16).toString('hex') : account.salt;
        const hash = await derive(password, salt, 64);
        let id;
        if (registering) {
          const inserted = db
            .prepare('INSERT OR IGNORE INTO accounts(handle,salt,password_hash) VALUES(?,?,?)')
            .run(name, salt, hash);
          if (!inserted.changes) throw fail(409, 'That handle is taken.');
          id = inserted.lastInsertRowid;
        } else {
          if (!account || !timingSafeEqual(hash, account.password_hash))
            throw fail(401, 'Check your handle and password.');
          id = account.id;
        }
        const session = randomBytes(32).toString('hex');
        db.prepare('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(digest(session), id, Date.now() + week);
        res.setHeader('Set-Cookie', cookie(session, week / 1000));
        return json(res, registering ? 201 : 200, { handle: name });
      } finally {
        inFlight--;
      }
    }
    if (!user) throw fail(401, 'Sign in to access your backups.');
    if (req.method === 'POST' && path === '/api/logout') {
      await readBody(req);
      db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
      res.setHeader('Set-Cookie', cookie('', 0));
      return json(res, 200, { signedOut: true });
    }
    const match = /^\/api\/backups\/([a-z0-9-]+)(?:\/(\d+))?$/.exec(path);
    if (!match || !ids.has(match[1])) throw fail(404, 'Application unavailable.');
    const [, app, revision] = match;
    if (req.method === 'GET' && !revision) {
      const items = db
        .prepare('SELECT id, created FROM backups WHERE account=? AND app=? ORDER BY id DESC')
        .all(user.id, app);
      return json(res, 200, { items });
    }
    if (req.method === 'GET') {
      const item = db
        .prepare('SELECT payload FROM backups WHERE account=? AND app=? AND id=?')
        .get(user.id, app, revision);
      if (!item) throw fail(404, 'Backup unavailable.');
      return json(res, 200, { data: JSON.parse(item.payload) });
    }
    if (revision) throw fail(405, 'Backups are immutable.');
    const body = await readBody(req);
    if (!Object.hasOwn(body, 'data')) throw fail(400, 'The backup is missing its data.');
    db.exec('BEGIN IMMEDIATE');
    try {
      const result = db
        .prepare('INSERT INTO backups(account,app,created,payload) VALUES(?,?,?,?)')
        .run(user.id, app, Date.now(), JSON.stringify(body.data));
      db.prepare(
        'DELETE FROM backups WHERE account=? AND app=? AND id NOT IN (SELECT id FROM backups WHERE account=? AND app=? ORDER BY id DESC LIMIT 5)',
      ).run(user.id, app, user.id, app);
      db.exec('COMMIT');
      return json(res, 201, { id: Number(result.lastInsertRowid) });
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
  return { handle, close: () => db.close() };
}
