import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalize } from './lib/normalize.mjs';
import { replay, listSessions, PROJECTS } from './lib/replay.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const PUB = path.join(ROOT, 'public');
const DATA = path.join(ROOT, 'data');
fs.mkdirSync(DATA, { recursive: true });
const PORT = Number(process.env.PORT) || 7777;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.png': 'image/png', '.woff2': 'font/woff2', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.jpg': 'image/jpeg', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg' };
const clients = new Set();
const recent = [];

function broadcast(evts) {
  for (const e of evts) {
    recent.push(e); if (recent.length > 300) recent.shift();
    const msg = `data: ${JSON.stringify(e)}\n\n`;
    for (const c of clients) c.write(msg);
  }
}
const json = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }); res.end(JSON.stringify(obj)); };

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'POST' && url.pathname === '/event') {
      let body = '';
      req.setEncoding('utf8');
      req.on('data', c => { body += c; if (body.length > 5e6) req.destroy(); });
      req.on('end', () => {
        try {
          const p = JSON.parse(body);
          fs.appendFile(path.join(DATA, 'raw.jsonl'), JSON.stringify(p) + '\n', () => {});
          broadcast(normalize(p));
        } catch {}
        res.writeHead(204); res.end();
      });
      return;
    }
    if (url.pathname === '/stream') {
      res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache', connection: 'keep-alive', 'access-control-allow-origin': '*' });
      res.write(': hi\n\n');
      const cutoff = Date.now() - 600000;
      for (const e of recent) if (e.t >= cutoff) res.write(`data: ${JSON.stringify(e)}\n\n`);
      clients.add(res);
      req.on('close', () => clients.delete(res));
      return;
    }
    if (url.pathname === '/api/sessions') return json(res, 200, await listSessions(40));
    if (url.pathname === '/api/replay') {
      const p = path.resolve(url.searchParams.get('path') || '');
      const rel = path.relative(PROJECTS, p);
      if (!p.endsWith('.jsonl') || rel.startsWith('..') || path.isAbsolute(rel) || !fs.existsSync(p)) return json(res, 400, { error: 'bad path' });
      return json(res, 200, { events: await replay(p) });
    }
    // static
    let rel = decodeURIComponent(url.pathname);
    if (rel.endsWith('/')) rel += 'index.html';
    const f = path.normalize(path.join(PUB, rel));
    if (!f.startsWith(PUB + path.sep) && f !== PUB) { res.writeHead(403); return res.end(); }
    fs.readFile(f, (err, buf) => {
      if (err) { res.writeHead(404, { 'content-type': 'text/plain' }); return res.end('not found'); }
      res.writeHead(200, { 'content-type': TYPES[path.extname(f).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-cache' });
      res.end(buf);
    });
  } catch (e) {
    try { json(res, 500, { error: String(e?.message || e) }); } catch {}
  }
});
setInterval(() => { for (const c of clients) c.write(': hb\n\n'); }, 15000).unref();
server.listen(PORT, '127.0.0.1', () => console.log(`CRUNCH TIME on http://localhost:${PORT}`));
