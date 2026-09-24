import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { readSheet, parseVotes } from './sheets.mjs';

const files = {
  '/config.public.json': ['config.public.json', 'application/json'],
  '/FjallaOne-Regular.ttf': ['FjallaOne-Regular.ttf', 'font/ttf'],
  '/connection-test.html': ['connection-test.html', 'text/html'],
  '/': ['index.html', 'text/html'],
  '/index.html': ['index.html', 'text/html'],
  '/overlay.js': ['overlay.js', 'text/javascript'],
  '/overlay.css': ['overlay.css', 'text/css'],
  '/7.css': ['7.css', 'text/css']
};
let cached, cachedAt = 0, pending;
async function votes() {
  if (cached && Date.now() - cachedAt < 5000) return cached;
  if (!pending) pending = (async () => {
    const result = await readSheet();
    if (!result.ok) {
      let message;
      try { message = JSON.parse(result.body).error?.message; } catch {}
      throw new Error(`Sheets HTTP ${result.status}: ${message || 'Request failed'}`);
    }
    cached = { teams: parseVotes(JSON.parse(result.body), result.config), updatedAt: new Date().toISOString() };
    cachedAt = Date.now();
    return cached;
  })().finally(() => { pending = undefined; });
  return pending;
}
createServer(async (request, response) => {
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  try {
    const path = new URL(request.url, 'http://localhost').pathname;
    if (request.method !== 'GET') { response.writeHead(405).end(); return; }
    if (path === '/api/votes') {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(await votes()));
      return;
    }
    const file = files[path];
    if (!file) { response.writeHead(404).end('Not found'); return; }
    response.setHeader('Content-Type', `${file[1]}; charset=utf-8`);
    response.end(await readFile(new URL(file[0], import.meta.url)));
  } catch (error) {
    response.writeHead(502, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify({ error: error.message }));
  }
}).listen(8080, '127.0.0.1', () => console.log('vMix overlay: http://127.0.0.1:8080'));
