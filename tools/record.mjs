// Records README media from a running CRUNCH TIME build.
// usage: node tools/record.mjs [--styles a,b,c] [--style name] [--out media] [--port 7790]
// Starts its own server on a spare port so live Claude Code events never end up in the footage.
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const OUT = path.resolve(ROOT, arg('out', 'media'));
const STYLES = (arg('styles', '') || '').split(',').filter(Boolean);
const STYLE = arg('style', '');
const PORT = Number(arg('port', 7790)); // own port + own server: a live server on 7777 would leak real session events into the footage
const require = createRequire(import.meta.url);

let pw;
for (const p of ['C:/Users/oxman/GAMES/ENDLESS FISHING/node_modules/playwright-core', 'playwright-core']) {
  try { pw = require(p); break; } catch {}
}
if (!pw) { console.error('playwright-core not found. Run `npm i --no-save playwright-core` and install Chromium (npx playwright-core install chromium).'); process.exit(1); }
if (spawnSync('ffmpeg', ['-version']).error) { console.error('ffmpeg not found on PATH.'); process.exit(1); }

const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = () => fetch(`http://localhost:${PORT}/api/sessions`).then(r => r.ok, () => false);
const ff = (...a) => { const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', ...a], { stdio: 'inherit' }); if (r.status) throw new Error('ffmpeg failed'); };

fs.mkdirSync(OUT, { recursive: true });
const tmp = path.join(OUT, '.tmp'); fs.rmSync(tmp, { recursive: true, force: true }); fs.mkdirSync(tmp, { recursive: true });

let server;
if (await alive()) { console.error(`port ${PORT} is busy; pass --port <free port>`); process.exit(1); }
{
  server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
  for (let i = 0; i < 50 && !(await alive()); i++) await sleep(100);
  if (!(await alive())) { console.error('server did not start'); process.exit(1); }
}
const url = s => `http://localhost:${PORT}/${s ? '?style=' + encodeURIComponent(s) : ''}`;
const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
try {
  // main run: video + 3 key-moment screenshots
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, recordVideo: { dir: tmp, size: { width: 1280, height: 720 } } });
  const page = await ctx.newPage();
  const t0 = Date.now();
  await page.goto(url(STYLE));
  await page.waitForFunction(() => window.CT, null, { timeout: 30000 });
  const t1 = Date.now();
  await page.evaluate(() => window.CT.demo());
  const at = async (sec, file) => { const w = sec * 1000 - (Date.now() - t1); if (w > 0) await sleep(w); if (file) await page.screenshot({ path: path.join(OUT, file) }); };
  await at(5, 'shot-1.png'); await at(15, 'shot-2.png'); await at(20);
  const vid = page.video();
  await ctx.close();
  const raw = await vid.path();
  const lead = ((t1 - t0) / 1000).toFixed(2); // skip page load so the clip starts at the demo
  ff('-ss', lead, '-i', raw, '-t', '20', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '26', '-movflags', '+faststart', '-an', path.join(OUT, 'hero.mp4'));
  const pal = path.join(tmp, 'pal.png');
  const vf = 'fps=12,scale=640:-1:flags=lanczos';
  ff('-t', '12', '-i', path.join(OUT, 'hero.mp4'), '-vf', `${vf},palettegen=max_colors=128`, pal);
  ff('-t', '12', '-i', path.join(OUT, 'hero.mp4'), '-i', pal, '-lavfi', `${vf}[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=4`, path.join(OUT, 'hero.gif'));
  const mb = fs.statSync(path.join(OUT, 'hero.gif')).size / 1e6;
  if (mb > 8) console.warn(`hero.gif is ${mb.toFixed(1)} MB (target < 8 MB) - lower fps/width`);

  // screenshot 3: report to the boss (~45 s), plus optional per-style shots
  const shotAt = async (s, sec, file) => {
    const c = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const p = await c.newPage(); await p.goto(url(s));
    await p.waitForFunction(() => window.CT, null, { timeout: 30000 });
    await p.evaluate(() => window.CT.demo()); await sleep(sec * 1000);
    await p.screenshot({ path: path.join(OUT, file) }); await c.close();
  };
  await Promise.all([shotAt(STYLE, 45, 'shot-3.png'), ...STYLES.map(s => shotAt(s, 15, `style-${s}.png`))]);
  console.log('wrote', fs.readdirSync(OUT).filter(f => !f.startsWith('.')).join(', '), `(gif ${mb.toFixed(1)} MB)`);
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
  if (server) server.kill();
}
