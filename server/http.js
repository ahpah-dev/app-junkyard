import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, sep, extname } from 'node:path';

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.md': 'text/plain; charset=utf-8',
  '.ico': 'image/x-icon',
};

export function createAppServer({ site, accounts = null }) {
  return createServer(async (req, res) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'same-origin');
    let path;
    try {
      path = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    } catch {
      res.writeHead(400).end('Invalid URL.');
      return;
    }
    try {
      if (path.startsWith('/api/')) {
        if (!accounts) throw Object.assign(new Error('Accounts are disabled.'), { status: 404 });
        return await accounts.handle(req, res, path);
      }
      if (!['GET', 'HEAD'].includes(req.method))
        throw Object.assign(new Error('Method unavailable.'), { status: 405 });
      if (path === '/runtime.json') {
        res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ accounts: Boolean(accounts) }));
      }
      if (path === '/') path = '/index.html';
      const file = resolve(site, '.' + path);
      if (
        !file.startsWith(resolve(site) + sep) ||
        path.includes('\\') ||
        path.includes(':') ||
        path.includes('\0') ||
        path.split('/').some((p) => p.startsWith('.'))
      ) {
        throw Object.assign(new Error('File unavailable.'), { status: 404 });
      }
      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': mime[extname(file)] || 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
      });
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (error) {
      const status = error.status || (['ENOENT', 'EISDIR', 'ENOTDIR'].includes(error.code) ? 404 : 500);
      if (status === 500) console.error('Request failed:', error.message);
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      res.end(
        JSON.stringify({
          error: error.status ? error.message : status === 404 ? 'File unavailable.' : 'Request failed.',
        }),
      );
    }
  });
}
