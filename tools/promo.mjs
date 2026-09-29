// Renders media/promo.mp4 (1920x1080) and media/promo-square.mp4 (1080x1080): ~33 s promo cut.
// usage: node tools/promo.mjs [--only land|square] [--port 7790] [--crf 20]
// Deterministic capture: Playwright fake clock, one screenshot per output frame, piped straight into ffmpeg.
// Captions and cards are DOM overlays (ffmpeg drawtext is not used).
import { createRequire } from 'node:module';
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : d; };
const PORT = Number(arg('port', 7790)), CRF = arg('crf', '20'), ONLY = arg('only', ''), TEST = process.argv.includes('--test'); // --test: 960x540, key frames only, no video
const OUT = path.join(ROOT, 'media');
const SESSION = 'C:/Users/oxman/.claude/projects/C--Users-oxman-game-test/987752ee-8f39-4caf-9fef-1eee786fb0a0.jsonl';
const require = createRequire(import.meta.url);
let pw;
for (const p of ['C:/Users/oxman/GAMES/ENDLESS FISHING/node_modules/playwright-core', 'playwright-core']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.error('playwright-core not found'); process.exit(1); }
if (spawnSync('ffmpeg', ['-version']).error) { console.error('ffmpeg not on PATH'); process.exit(1); }

const FPS = 30, TOTAL = 33;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const alive = () => fetch(`http://localhost:${PORT}/api/sessions`).then(r => r.ok, () => false);
if (await alive()) { console.error(`port ${PORT} busy`); process.exit(1); }
const server = spawn(process.execPath, ['server.mjs'], { cwd: ROOT, stdio: 'ignore', env: { ...process.env, PORT: String(PORT) } });
for (let i = 0; i < 50 && !(await alive()); i++) await sleep(100);
if (!(await alive())) { console.error('server did not start'); process.exit(1); }

// Real replay of the build session, sanitized: the Russian user prompts are dropped and any detail with a local path is blanked.
const real = (await (await fetch(`http://localhost:${PORT}/api/replay?path=${encodeURIComponent(SESSION)}`)).json()).events;
const bad = s => /[^\x00-\x7F]/.test(s) || /oxman|Users[\\/]|[A-Za-z]:[\\/]|\/tmp\//i.test(s);
const REPLAY = real.filter(e => e.kind !== 'boss_prompt').slice(0, 48).map(e => {
  const o = { ...e };
  if (o.detail && bad(String(o.detail))) o.detail = '';
  if (o.name && bad(o.name)) o.name = 'agent';
  if (o.kind === 'agent_spawn') o.detail = '';
  return o;
});
const SESSIONS = [{ path: 'C:/replay/build.jsonl', project: 'x', mtime: Date.now(), agents: 2, title: 'session' }];

const CARD = `<!doctype html><meta charset=utf-8><link href="https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap" rel=stylesheet>
<style>html,body{margin:0;height:100%;background:#000;overflow:hidden}body{font-family:'Press Start 2P',monospace;display:flex;align-items:center;justify-content:center;flex-direction:column;text-align:center}
#w{width:100%}.c{opacity:0}.c.on{opacity:1}
body::after{content:"";position:fixed;inset:0;background:repeating-linear-gradient(#0000 0 3px,#0003 3px 4px);pointer-events:none}
#hook{color:#ffe9a8;text-shadow:4px 4px 0 #a01818;line-height:1.7;max-width:88%}
#e1{color:#ffd23a;text-shadow:6px 6px 0 #a01818,0 0 24px #ff8a2a88;line-height:1.3}#e1 span{color:#ff4a3a}
#e2{color:#5cff7a;margin-top:2.2em;line-height:1.7;max-width:92%}#e3{color:#7ac8ff;margin-top:1.6em}</style>
<div id=w><div id=hook></div><div id=e1 class=c></div><div id=e2 class=c>live via hooks &middot; zero tokens &middot; open source</div><div id=e3 class=c>github.com/winchxyz/crunch-time</div></div>
<script>
const land = innerWidth > innerHeight, k = innerWidth / (land ? 1920 : 1080), fs = (land ? [56, 132, 28, 30] : [46, 104, 19, 24]).map(x => x * k);
const hook = document.getElementById('hook'), TXT = 'I made my Claude Code agents work in a PS1 office', K = TXT.indexOf('Claude Code');
hook.style.fontSize = fs[0] + 'px'; hook.style.whiteSpace = 'pre-wrap';
hook.innerHTML = [...TXT].map((c, i) => '<span style="opacity:0' + (i >= K && i < K + 11 ? ';color:#ff8a2a' : '') + '">' + (c === ' ' ? ' ' : c) + '</span>').join('');
const sp = hook.children;
const e1 = document.getElementById('e1'), e2 = document.getElementById('e2'), e3 = document.getElementById('e3');
e1.style.fontSize = fs[1] + 'px'; e2.style.fontSize = fs[2] + 'px'; e3.style.fontSize = fs[3] + 'px';
e1.innerHTML = land ? 'CRUNCH <span>TIME</span>' : 'CRUNCH<br><span>TIME</span>';
window.set = (kind, t) => {
  const w = document.getElementById('w');
  if (kind === 'hook') {
    hook.style.display = ''; [e1, e2, e3].forEach(x => x.classList.remove('on'));
    const n = Math.min(sp.length, Math.floor(Math.max(0, t - .15) / 1.9 * sp.length));
    for (let i = 0; i < sp.length; i++) sp[i].style.opacity = i < n ? 1 : 0;
    w.style.opacity = t > 2.9 ? Math.max(0, 1 - (t - 2.9) / .1) : 1;
  } else {
    hook.style.display = 'none';
    e1.classList.toggle('on', t > .2); e2.classList.toggle('on', t > 1.2); e3.classList.toggle('on', t > 2.1);
    w.style.opacity = Math.min(1, t / .2);
  }
};
</script>`;

const PAGE_JS = `(() => {
  const st = document.createElement('style');
  st.textContent = '#log{display:none!important}#cap{position:fixed;left:50%;transform:translateX(-50%);z-index:50;font-family:"Press Start 2P",monospace;color:#fff;background:#000c;border:4px solid #ffd23a;box-shadow:6px 6px 0 #a01818;text-align:center;padding:.6em .8em;line-height:1.5;opacity:0;pointer-events:none} #cap b{color:#ffd23a;font-weight:400} #dark{position:fixed;inset:0;background:#000;z-index:60;opacity:0;pointer-events:none}';
  document.head.appendChild(st);
  const c = document.createElement('div'); c.id = 'cap'; document.body.appendChild(c);
  const d = document.createElement('div'); d.id = 'dark'; document.body.appendChild(d);
  const land = innerWidth > innerHeight;
  const k = innerWidth / (land ? 1920 : 1080);
  c.style.fontSize = (land ? 34 : 30) * k + 'px'; c.style.bottom = 66 * k + 'px'; c.style.maxWidth = (land ? 1250 : 900) * k + 'px'; c.style.borderWidth = 4 * k + 'px';
  window.__cap = (html, a) => { if (html != null) c.innerHTML = html; c.style.opacity = a; };
  window.__dark = a => { d.style.opacity = a; };
})()`;

async function render(name, W, H, outFile) {
  const t0 = Date.now();
  const KEYS = [1.5, 2.8, 4.5, 6, 8, 10.5, 14, 17.5, 19, 21, 23, 24.6, 25.8, 27, 28.3, 30, 32].map(k => Math.round(k * FPS));
  const TDIR = process.env.PROMO_TEST_DIR || OUT;
  const ff = TEST ? null : spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-',
    '-vf', 'scale=in_range=pc:out_range=tv,format=yuv420p', '-c:v', 'libx264', '-preset', 'medium', '-crf', CRF, '-maxrate', '3400k', '-bufsize', '7000k', '-pix_fmt', 'yuv420p', '-r', String(FPS), '-movflags', '+faststart', '-an', outFile], { stdio: ['pipe', 'inherit', 'inherit'] });
  const ffDone = ff ? new Promise(r => ff.on('close', r)) : null;
  let cur = 0;
  const push = async buf => { if (!ff) { if (KEYS.includes(cur)) fs.writeFileSync(path.join(TDIR, `${name}_${(cur / FPS).toFixed(1)}.jpg`), buf); return; } if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r)); };
  const browser = await pw.chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  try {
    const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    await ctx.route(`http://localhost:${PORT}/__card`, r => r.fulfill({ contentType: 'text/html', body: CARD }));
    await ctx.route('**/api/sessions', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify(SESSIONS) }));
    await ctx.route('**/api/replay**', r => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ events: REPLAY }) }));
    const card = await ctx.newPage(); await card.goto(`http://localhost:${PORT}/__card`);
    await card.evaluate(() => document.fonts.load("20px 'Press Start 2P'")); await card.evaluate(() => document.fonts.ready);
    const page = await ctx.newPage();
    await page.clock.install({ time: 0 });
    await page.goto(`http://localhost:${PORT}/?style=ps1`);
    await page.clock.pauseAt(1000); // stop natural time flow: only runFor() advances the page
    await page.waitForFunction(() => window.CT, null, { timeout: 60000 });
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(PAGE_JS);
    await page.evaluate(() => { window.__hide = document.createElement('style'); document.head.appendChild(window.__hide); });
    // warm up: ~2 s of fake time so the empty office is settled before anything is captured
    for (let i = 0; i < 60; i++) await page.clock.runFor(34);
    await sleep(500);
    let acc = 0; const step = async () => { acc += 1000 / FPS; const ms = Math.floor(acc); acc -= ms; await page.clock.runFor(ms); };
    const shot = p => p.screenshot({ type: 'jpeg', quality: 93 });
    const N = TOTAL * FPS;
    const capAt = [[3.3, 10, 'Boss = main session'], [10.3, 18, 'Workers = subagents.<br><b>Every bubble is a real tool call</b>'], [18.3, 24, 'This is a <b>replay</b> of the agents that built it'], [24.2, 29, '<b>4</b> retro styles']];
    const B = [3, 18, 24, 29]; // cut points (dip to black)
    const styleAt = [[24, 'ps1'], [25.2, 'rs2'], [26.4, 'classic'], [27.6, 'hd']];
    let styleI = 0; const did = {};
    for (let f = 0; f < N; f++) {
      const t = f / FPS; cur = f;
      if (t < 3) { await card.evaluate(([k, tt]) => window.set(k, tt), ['hook', t]); await push(await shot(card)); continue; }
      if (t >= 29) { await card.evaluate(([k, tt]) => window.set(k, tt), ['end', t - 29]); await push(await shot(card)); continue; }
      if (!did.demo) { did.demo = 1; await page.evaluate(() => { window.CT.clear(); return window.CT.demo(); }); await sleep(150); }
      if (t >= 18 && !did.rep) {
        did.rep = 1;
        await page.evaluate(async () => {
          window.__hide.textContent = '#log{display:none!important}#sel{display:none!important}';
          window.CT.clear(); document.querySelector('#spd [data-s="8"]').click();
          const s = document.getElementById('sel'); s.value = s.options[1].value; s.dispatchEvent(new Event('change'));
        });
        await sleep(300);
      }
      if (t >= 24 && !did.mont) {
        did.mont = 1;
        await page.evaluate(() => { window.CT.clear(); document.querySelector('#spd [data-s="4"]').click(); return window.CT.demo(); });
        await sleep(150);
      }
      while (styleI < styleAt.length && t >= styleAt[styleI][0]) { const s = styleAt[styleI++][1]; await page.evaluate(x => window.CT.style(x), s); }
      const cap = capAt.find(c => t >= c[0] && t < c[1]);
      const ca = cap ? Math.max(0, Math.min(1, (t - cap[0]) / .12, (cap[1] - t) / .12)) : 0;
      const dk = Math.max(0, ...B.map(b => 1 - Math.abs(t - b) / .1));
      const yaw = t >= 24 ? 0.30 + (t - 24) * 0.16 : null;
      await page.evaluate(([c, a, d, y]) => { window.__cap(c, a); window.__dark(d); if (y != null) window.CT.world.orbit.yaw = y; }, [cap ? cap[2] : null, ca, dk, yaw]);
      await step();
      await push(await shot(page));
      if (f % 90 === 0) console.log(name, 'frame', f, '/', N, ((Date.now() - t0) / 1000).toFixed(0) + 's');
    }
    if (ff) { ff.stdin.end(); await ffDone; }
  } finally { await browser.close(); }
  console.log(name, 'done in', ((Date.now() - t0) / 1000).toFixed(0) + 's', TEST ? '' : (fs.statSync(outFile).size / 1e6).toFixed(1) + ' MB');
}

fs.mkdirSync(OUT, { recursive: true });
try {
  if (TEST) await render('test', 960, 540, null);
  else if (ONLY !== 'square') await render('land', 1920, 1080, path.join(OUT, 'promo.mp4'));
  if (!TEST && ONLY !== 'land') await render('square', 1080, 1080, path.join(OUT, 'promo-square.mp4'));
} finally { server.kill(); }
