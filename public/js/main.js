import { createWorld } from './scene.js';
import { createDirector, toolIcon } from './director.js';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const saved = (() => { try { return localStorage.getItem('ct-style'); } catch { return null; } })();
const qs = new URLSearchParams(location.search).get('style');
const ST = ['ps1', 'rs2', 'classic', 'hd'], startStyle = ST.includes(qs) ? qs : ST.includes(saved) ? saved : 'ps1';
const world = createWorld($('c'), $('ov'), startStyle);
const hostedLoop = { on: false };
function setStyle(s) { if (!ST.includes(s)) return; world.setStyle(s); document.querySelectorAll('#sty button').forEach(b => b.classList.toggle('on', b.dataset.st === s)); try { localStorage.setItem('ct-style', s); } catch { } }
document.querySelectorAll('#sty button').forEach(b => b.onclick = () => setStyle(b.dataset.st));
setStyle(startStyle);
let mode = 'idle', connected = false, speed = 1, token = 0, t0 = 0, gotAny = false;
const ui = {
  roster(list) {
    $('roster').innerHTML = list.slice(-9).map(a => `<div class="card ${a.st}"><span class="i">${a.icon || '🧑'}</span><b>${esc(a.name)}</b><span class="n">${a.n}</span><em>${esc(a.type)}</em><span class="s ${a.st}">${a.st.toUpperCase()}</span></div>`).join('');
  },
};
const dir = createDirector(world, ui); dir.boot();
function pill() {
  const p = $('pill');
  if (mode === 'demo') { p.className = 'demo'; p.textContent = 'DEMO x' + speed; }
  else if (mode === 'replay') { p.className = 'rep'; p.textContent = 'REPLAY x' + speed; }
  else if (connected) { p.className = 'live'; p.textContent = 'LIVE'; }
  else { p.className = 'off'; p.textContent = 'OFFLINE'; }
}
function log(e) {
  let s, c = '';
  if (e.kind === 'boss_prompt') { s = 'BOSS: ' + (e.detail || ''); c = 'b'; }
  else if (e.kind === 'boss_tool') { s = 'boss > ' + (e.tool || '?') + ' ' + (e.detail || ''); c = 'b'; }
  else if (e.kind === 'boss_idle') { s = 'boss goes idle'; c = 'b'; }
  else if (e.kind === 'agent_spawn') { s = '+ ' + (e.name || e.agent) + ' [' + (e.type || '') + ']'; c = 'd'; }
  else if (e.kind === 'agent_done') { s = (e.ok === false ? 'x ' : 'v ') + (e.name || String(e.agent || '').slice(0, 8)) + ' ' + (e.detail || ''); c = 'd'; }
  else s = (e.name || String(e.agent || '').slice(0, 8)) + ' ' + toolIcon(e.tool) + ' ' + (e.tool || '') + ' ' + (e.detail || '');
  const L = $('log'), d = document.createElement('div'); if (c) d.className = c; d.textContent = s; L.appendChild(d);
  while (L.children.length > 40) L.firstChild.remove();
}
function feed(e) { if (!gotAny) { gotAny = true; $('start').style.display = 'none'; } if (!t0) t0 = performance.now(); log(e); dir.feed(e); }
function clear() { token++; dir.clear(); dir.boot(); $('log').innerHTML = ''; t0 = 0; }
function setSpeed(s) { speed = s; world.timeScale = Math.min(s, 4); document.querySelectorAll('#spd button').forEach(b => b.classList.toggle('on', +b.dataset.s === s)); pill(); }
function gapFix(events) { // compress idle gaps > 4 s to 1 s
  const ev = events.filter(e => e && e.kind).sort((a, b) => (a.t || 0) - (b.t || 0)); let shift = 0, prev = ev.length ? ev[0].t || 0 : 0;
  return ev.map(e => { const g = (e.t || 0) - prev; prev = e.t || 0; if (g > 4000) shift += g - 1000; return { ...e, t: (e.t || 0) - shift }; });
}
function play(events, m) {
  clear(); mode = m; pill(); const tk = token, ev = gapFix(events); if (!ev.length) return;
  let i = 0;
  const step = () => {
    if (tk !== token) return; feed(ev[i]); i++;
    if (i < ev.length) setTimeout(step, Math.max(0, (ev[i].t - ev[i - 1].t) / speed));
    else setTimeout(() => { if (tk === token) { if (hostedLoop.on) demo(); else { mode = 'idle'; pill(); } } }, 9000);
  };
  step();
}
async function demo() { try { const r = await fetch('demo.json'); play(await r.json(), 'demo'); } catch (e) { console.error('demo failed', e); } }
$('bDemo').onclick = demo;
document.querySelectorAll('#spd button').forEach(b => b.onclick = () => setSpeed(+b.dataset.s));
$('sel').onchange = async e => {
  const p = e.target.value; if (!p) return;
  try { const r = await fetch('/api/replay?path=' + encodeURIComponent(p)); play((await r.json()).events || [], 'replay'); } catch (x) { console.error(x); }
  e.target.value = '';
};
fetch('/api/sessions').then(r => r.json()).then(l => {
  if (!Array.isArray(l) || !l.length) throw 0;
  for (const s of l) { const o = document.createElement('option'); o.value = s.path; const m = s.mtime < 1e12 ? s.mtime * 1000 : s.mtime; o.textContent = `${(s.title || 'session').slice(0, 34)} | ${s.agents} agents | ${new Date(m).toLocaleDateString()}`; $('sel').appendChild(o); }
}).catch(() => {
  $('sel').style.display = 'none';
  if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
    hostedLoop.on = true; const h = $('host'); h.style.display = 'inline'; h.textContent = 'LIVE + REPLAY: run locally for live mode'; setTimeout(demo, 600);
  }
});
function connect() {
  const es = new EventSource('/stream');
  es.onopen = () => { connected = true; pill(); };
  es.onmessage = m => { let e; try { e = JSON.parse(m.data); } catch { return; } if (mode !== 'idle') { clear(); mode = 'idle'; pill(); } feed(e); };
  es.onerror = () => { connected = false; pill(); if (hostedLoop.on) { es.close(); return; } if (es.readyState === 2) { es.close(); setTimeout(connect, 2000); } };
}
connect(); pill();
setTimeout(() => { if (!gotAny) $('start').style.display = 'block'; }, 2000);
setInterval(() => {
  if (t0) { const s = (performance.now() - t0) / 1000 | 0; $('timer').textContent = String(s / 60 | 0).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); } else $('timer').textContent = '00:00';
}, 500);
window.CT = { style: setStyle, feed, demo, clear, state: () => ({ mode, speed, ...dir.state() }), world, dir };
