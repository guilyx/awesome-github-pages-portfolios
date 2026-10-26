#!/usr/bin/env node
// Minimal static server for dist/, mirroring GitHub Pages:
// the site is reachable at / and at its real base path (e.g. /awesome-github-pages-portfolios/).
//   npm run serve            http://localhost:4173
//   PORT=8080 npm run serve
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { ROOT, project } from './lib/project.mjs';

const DIST = join(ROOT, 'dist');
const PORT = Number(process.env.PORT) || 4173;
const BASE = new URL(project.siteUrl).pathname;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.xml': 'application/xml',
  '.txt': 'text/plain; charset=utf-8',
};

async function resolve(urlPath) {
  let path = decodeURIComponent(urlPath);
  if (BASE !== '/' && path.startsWith(BASE)) path = `/${path.slice(BASE.length)}`;
  const file = normalize(join(DIST, path));
  if (!file.startsWith(DIST)) return null;
  const info = await stat(file).catch(() => null);
  if (info?.isDirectory()) return resolve(`${path.replace(/\/?$/, '/')}index.html`);
  return info ? file : null;
}

createServer(async (req, res) => {
  const { pathname } = new URL(req.url, 'http://localhost');
  const file = await resolve(pathname);
  const served = file ?? join(DIST, '404.html');
  res.writeHead(file ? 200 : 404, { 'content-type': TYPES[extname(served)] ?? 'application/octet-stream' });
  res.end(await readFile(served));
}).listen(PORT, () => console.log(`Serving dist/ at http://localhost:${PORT}/`));
