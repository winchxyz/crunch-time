import { V } from './scene.js';
const pick = a => a[Math.random() * a.length | 0];
const cut = (s, n) => { s = String(s || '').replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1) + '…' : s; };
const fmt = (s, o) => s.replace(/\{(\w+)\}/g, (_, k) => o[k] ?? '');
const ICON = { search: '🔍', fetch: '🌐', read: '📄', grep: '🔎', write: '✏️', bash: '💻', other: '⚙️' };
export const toolKind = t => ({ WebSearch: 'search', WebFetch: 'fetch', Read: 'read', Grep: 'grep', Glob: 'grep', Write: 'write', Edit: 'write', MultiEdit: 'write', NotebookEdit: 'write', Bash: 'bash' })[t] || 'other';
export const toolIcon = t => ICON[toolKind(t)];
const BOSS_YELL = ['LISTEN UP! NEW TASK: {d}! ON MY DESK, NOW!', 'I NEED THIS DONE: {d}! YESTERDAY!', '{d}. BY LUNCH!', '{d}. NO EXCUSES!', 'THE CLIENT WANTS THIS: {d}. THE CLIENT IS ANGRY. I AM ANGRY!', 'EVERYONE STOP! TOP PRIORITY: {d}! GO GO GO!', 'I PAY YOU PEOPLE FOR THIS: {d}, NOT FOR COFFEE!', 'DEADLINE WAS AN HOUR AGO! THE TASK: {d}!', '{d}. HOW HARD CAN IT BE?!', 'THIS IS NOT A DRILL! {d}! GO!', 'WHO IS ON THIS?! {d}! I SEE NOBODY!', "I DON'T CARE HOW. JUST GET THIS DONE: {d}!"];
const SPAWN = ['On it, boss!', 'Yes sir! Right away!', 'Reporting for crunch!', 'I\'ll skip lunch. Again.', 'Sure thing... boss.', 'Coffee first? No? OK.', 'Gulp. Starting now!', 'Did he say YESTERDAY?', 'Hi! I\'m new. Please clap.', 'Working on it. Very hard.', 'My weekend plans: gone.', 'Another day, another panic.'];
const CHAT = ['Found anything on {d}?', 'Boss is gonna kill us.', '{t}? Again?! I hate {t}.', 'Is it lunch yet?', 'Did you see his face?', '{d}?? Never heard of it.', 'Don\'t tell him I\'m on {d}.', 'Send help.', 'My {t} is on fire.', 'Coffee later?', 'I\'ve been on {d} for HOURS.', 'How is your {t} going?', 'He said "yesterday". Again.', 'I need a vacation.', 'Psst. Is {d} even real?', 'Shhh, he\'s looking!', 'I just work here.', 'This cannot be legal.', 'Ctrl+Z my life.', 'Is this what "synergy" means?', 'We should unionize.'];
const REPLY = ['Nope. You?', 'Working on it!', 'lol same.', 'Shhh!', 'Not paid enough.', 'Tell me about it.', 'Almost done. Lies.', 'Ha. Ha. Ha.', 'Ugh, yes.', 'Please stop talking.'];
const OK_LINES = ['FINE.', 'ADEQUATE.', 'I\'VE SEEN WORSE.', 'DON\'T LET IT GO TO YOUR HEAD.', 'FINE. NEXT!'];
const BAD_LINES = ['WHAT IS THIS?!', 'THIS IS GARBAGE!', 'DO IT AGAIN!', 'ARE YOU KIDDING ME?!', 'MY CAT COULD DO BETTER!'];
const SHIRTS = [0xd84a4a, 0x3a8ad8, 0x4ab86a, 0xe0a030, 0x9a5ad0, 0x30b8b8, 0xe07aa8, 0x7a8a3a, 0xe0e0e0, 0xd86a2a, 0x4a4ad8, 0x2a8a6a];
const HAIRS = [0x2a1a10, 0x6a3a1a, 0xc8a040, 0x181818, 0xa03020, 0x8a8a90];
const SKINS = [0xe8b48a, 0xc98a5a, 0x8a5a3a, 0xf2c8a0];

class Actor {
  constructor() { this.q = []; this.cur = null; this.busy = false; this.idleSince = 0; }
  push(j) {
    if (j.kind === 'tool') {
      const c = this.cur;
      if (c && c.kind === 'tool' && c.tool === j.tool && !c.dying) { c.count++; c.until += .5; c.upd && c.upd(); return; }
      const l = this.q[this.q.length - 1]; if (l && l.kind === 'tool' && l.tool === j.tool) { l.count++; l.detail = j.detail; return; }
      if (this.q.filter(x => x.kind === 'tool').length >= 4) { const i = this.q.findIndex(x => x.kind === 'tool'); this.q.splice(i, 1); }
    }
    this.q.push(j); if (!this.busy) this.loop();
  }
  async loop() {
    this.busy = true;
    while (this.q.length) { const j = this.q.shift(); this.cur = j; try { await j.run(j); } catch (e) { console.warn(e); } this.cur = null; }
    this.busy = false;
  }
}

export function createDirector(world, ui) {
  const agents = new Map(), boss = new Actor(); let bossCh = null, bossLoc = 'office', nAgents = 0, nextChat = 4, wbSlots = [];
  const now = () => world.now, sl = s => world.sleep(s);
  const mkBoss = () => {
    if (bossCh) return bossCh;
    bossCh = world.addChar({ name: 'BOSS', shirt: 0x2b2b3a, pants: 0x1e1e28, hair: 0x101010, scale: 1.02, boss: true });
    bossCh.sitAt(world.pts.bossDesk); bossCh.mode = 'type'; bossCh.eTag.textContent = 'THE BOSS'; return bossCh;
  };
  const roster = () => ui.roster && ui.roster([...agents.values()].map(a => ({ id: a.id, name: a.name, type: a.type, tool: a.tool, icon: a.tool ? toolIcon(a.tool) : '', n: a.n, st: a.st })));
  const deliver = () => bossCh && bossCh.g.position.x < -5 && bossCh.g.position.z < -2 ? world.pts.bossFront.clone() : world.pts.F.clone().add(V(2, 0, .3));
  const allocDesk = a => { const d = world.desks.find(d => !d.occ); if (d) { d.occ = a; a.desk = d; } else { a.desk = null; a.slot = wbSlots.findIndex(s => !s); if (a.slot < 0) a.slot = wbSlots.length; wbSlots[a.slot] = a; } };
  const freeDesk = a => { if (a.desk) { a.desk.occ = null; world.screen && 0; a.desk.mode = 'off'; } if (a.slot != null) wbSlots[a.slot] = null; a.desk = null; a.slot = null; const w = [...agents.values()].find(x => x.st !== 'done' && x.st !== 'failed' && !x.desk && x.slot != null); if (w) { wbSlots[w.slot] = null; w.slot = null; allocDesk(w); w.at = 'away'; } };

  function getAgent(e) {
    const id = e.agent || 'anon'; let a = agents.get(id);
    if (!a) { a = { id, name: e.name || ('Temp-' + (++nAgents)), type: e.type || 'worker', st: 'working', n: 0, act: new Actor(), at: 'none', ch: null, tool: '' }; agents.set(id, a); allocDesk(a); a.act.push({ kind: 'spawn', run: () => spawnJob(a) }); roster(); }
    return a;
  }
  async function spawnJob(a) {
    const o = { name: a.name, shirt: SHIRTS[a.ord = (nAgents++) % SHIRTS.length], hair: pick(HAIRS), skin: pick(SKINS), style: pick(['flat', 'spiky', 'long']), glasses: Math.random() < .35 };
    a.ch = world.addChar(o); a.ch.g.position.copy(world.pts.spawn); a.ch.mode = 'idle'; a.ch.eTag.textContent = cut(a.name, 14);
    a.ch.say(pick(SPAWN), { dur: 2.2 });
    if (a.desk) { await a.ch.goTo(a.desk.chair); a.ch.sitAt(a.desk); a.ch.mode = 'type'; a.desk.mode = 'idle'; a.at = 'desk'; }
    else { await a.ch.goTo(world.pts.wb[a.slot % 6]); a.ch.faceYaw(Math.PI); a.at = 'wb'; }
    a.act.idleSince = now();
  }
  async function toDesk(a) {
    const ch = a.ch; if (a.at === 'desk' || a.at === 'wb') return;
    if (!a.desk) { await ch.goTo(world.pts.wb[(a.slot || 0) % 6]); ch.faceYaw(Math.PI); a.at = 'wb'; return; }
    await ch.goTo(a.desk.chair); ch.sitAt(a.desk); a.at = 'desk';
  }
  async function unseat(a) { if (a.at === 'desk') { a.ch.standUp(); a.at = 'away'; } }
  async function waitUntil(j) { while (now() < j.until) await sl(.1); }

  async function toolJob(a, j) {
    const ch = a.ch; if (!ch) return; const k = toolKind(j.tool);
    a.tool = j.tool; roster(); ch.icon(ICON[k]); ch.fast = k === 'write' || k === 'search';
    j.until = now() + 1.25;
    j.upd = () => ch.say(cut(j.detail || j.tool, 34) + (j.count > 1 ? '  x' + j.count : ''), { dur: 1.8 });
    if (k === 'grep') {
      await unseat(a); await ch.goTo(world.pts.cab.clone().add(V((a.ord || 0) % 2 * 1.1, 0, 0))); ch.faceYaw(Math.PI); ch.mode = 'read'; a.at = 'away'; j.upd(); await waitUntil(j);
    } else {
      await toDesk(a); ch.mode = k === 'read' ? 'read' : 'type';
      if (a.desk) a.desk.mode = ({ search: 'browser', fetch: 'browser', write: 'code', bash: 'term', read: 'code' })[k] || 'code';
      j.upd();
      while (now() < j.until) { if (k === 'write' && a.desk) world.spark(a.desk.pos.clone().add(V(.3, -.5, 0)), 0xffe060, 2, 2); await sl(.15); }
    }
    ch.icon(''); a.act.idleSince = now();
  }
  function bossReact(ok, worker) {
    const b = mkBoss(); const wc = worker.ch;
    if (ok) { b.say(Math.random() < .15 ? 'GOOD WORK.' : pick(OK_LINES), { big: true, red: true, dur: 2.4, pri: 5 }); b.mode = 'idle'; }
    else { b.mode = 'yell'; b.angryT = 1; b.say(pick(BAD_LINES), { big: true, red: true, dur: 2.6, pri: 5 }); b.slam(() => { world.slamFx(b.g.position.clone()); }); }
  }
  async function doneJob(a, j) {
    const ch = a.ch; if (!ch) return; const ok = j.ok !== false; a.tool = ''; ch.icon('');
    if (a.desk) a.desk.mode = 'idle';
    await unseat(a); ch.mode = 'carry'; ch.say(cut(j.detail || 'Report ready, boss!', 40), { dur: 2 });
    await ch.goTo(deliver()); ch.faceYaw(bossCh && bossCh.g.position.x < -5 ? Math.PI : -Math.PI / 2 - .3); ch.mode = 'idle';
    world.focus(V(bossCh.g.position.x, 1.5, bossCh.g.position.z), .35);
    await sl(.4); bossReact(ok, a); await sl(1.2);
    if (ok) { ch.mode = 'cheer'; ch.icon('🎉'); a.st = 'done'; roster(); await sl(1.6); }
    else { ch.mode = 'panic'; ch.icon('💦'); a.st = 'failed'; roster(); ch.say('I can explain!!', { dur: 1.6 }); await sl(2); }
    world.focus(null); if (bossCh) { bossCh.mode = bossLoc === 'floor' ? 'idle' : 'type'; bossCh.angryT = bossLoc === 'floor' ? .25 : 0; }
    ch.icon(''); ch.mode = 'idle'; freeDesk(a);
    await ch.goTo(world.pts.spawn); ch.remove(); a.ch = null; a.at = 'gone';
  }
  async function gagJob(a, g) {
    const ch = a.ch; if (!ch || a.st !== 'working') return;
    if (g === 'coffee') { await unseat(a); await ch.goTo(world.pts.coffee); ch.faceYaw(Math.PI); ch.mode = 'coffee'; ch.icon('☕'); ch.say('Ahh, coffee.', { dur: 1.6 }); await sl(2.6); ch.mode = 'idle'; ch.icon(''); a.at = 'away'; await toDesk(a); ch.mode = 'type'; }
    else if (g === 'stretch') { ch.mode = 'stretch'; ch.say('*stretch*', { dur: 1.5 }); await sl(1.8); ch.mode = a.at === 'desk' ? 'type' : 'idle'; }
    else { ch.mode = 'sleep'; ch.icon('💤'); a.sleeping = true; const t0 = now(); while (!a.act.q.length && now() - t0 < 14) await sl(.2); a.sleeping = false; ch.icon(''); if (a.act.q.length) { ch.say('!! I\'m awake!', { dur: 1.2 }); world.spark(ch.g.position.clone().add(V(0, 2, 0)), 0xffffff, 3, 2); await sl(.4); } ch.mode = a.at === 'desk' ? 'type' : 'idle'; }
    a.act.idleSince = now();
  }
  async function promptJob(j) {
    const b = mkBoss(); world.setMood(1); bossLoc = 'floor'; b.icon('');
    if (b.sitT) b.standUp(); b.mode = 'idle';
    await b.goTo(world.pts.F); b.faceYaw(.7); b.angryT = 1; b.mode = 'yell';
    const d = cut(String(j.detail || 'SOMETHING').toUpperCase(), 46).replace(/[.!?…\s]+$/, '');
    world.focus(V(world.pts.F.x, 1.9, world.pts.F.z), .55);
    b.say(fmt(pick(BOSS_YELL), { d }), { big: true, red: true, dur: 4.2, pri: 9 });
    await sl(1.3); b.slam(() => { world.slamFx(V(world.pts.F.x, 0, world.pts.F.z)); agents.forEach(a => a.ch && a.ch.flinch(.9)); });
    await sl(2.4); world.focus(null); b.mode = 'idle'; b.angryT = .3;
  }
  async function bossToolJob(j) {
    const b = mkBoss(); if (bossLoc !== 'office') { await b.goTo(world.pts.bossDesk.chair); b.sitAt(world.pts.bossDesk); bossLoc = 'office'; }
    b.angryT = 0; const k = toolKind(j.tool); b.mode = k === 'read' || k === 'grep' ? 'read' : 'type'; b.icon(ICON[k]); b.say(cut(j.detail || j.tool, 30), { dur: 1.8 }); await sl(1.5); b.icon('');
  }
  async function idleJob() {
    const b = mkBoss(); for (let i = 0; i < 80 && [...agents.values()].some(a => a.doneQ && a.at !== 'gone'); i++) await sl(.25); world.setMood(.55); b.angryT = 0; b.mode = 'idle';
    if (bossLoc !== 'office') { await b.goTo(world.pts.bossDesk.chair); b.sitAt(world.pts.bossDesk); bossLoc = 'office'; }
    b.mode = 'sleep'; b.say('Finally. Quiet.', { dur: 2.5 }); await sl(2); b.mode = 'type';
  }

  world.onTick((dt, t) => {
    if (t < nextChat) return; nextChat = t + 4 + Math.random() * 3.5;
    const busy = [...agents.values()].filter(a => a.ch && a.st === 'working' && a.at !== 'gone' && !a.sleeping && t - a.act.idleSince < 9 && a.tool);
    if (busy.length >= 2) {
      const A = pick(busy); let B = busy.filter(x => x !== A && A.desk && x.desk && Math.abs(x.desk.idx - A.desk.idx) <= 2); B = pick(B.length ? B : busy.filter(x => x !== A));
      if (A.ch.bt < .5) A.ch.say(fmt(pick(CHAT), { d: cut(B.detail || B.name, 22), t: B.tool || 'this' }), { dur: 2.6 });
      setTimeout(() => { if (B.ch && B.ch.bt < .5) B.ch.say(pick(REPLY), { dur: 2 }); }, 1600 / Math.max(1, world.timeScale));
    }
    for (const a of agents.values()) if (a.ch && a.st === 'working' && !a.act.busy && a.at !== 'none' && t - a.act.idleSince > 6 && Math.random() < .5) { const g = pick(['coffee', 'stretch', 'sleep']); a.act.push({ kind: 'gag', run: () => gagJob(a, g) }); }
  });

  return {
    feed(e) {
      if (!e || !e.kind) return; if (e.kind !== 'boss_idle') world.setMood(1);
      if (e.kind === 'boss_prompt') boss.push({ kind: 'prompt', detail: e.detail, run: j => promptJob(j) });
      else if (e.kind === 'boss_tool') boss.push({ kind: 'btool', tool: e.tool, detail: e.detail, run: j => bossToolJob(j) });
      else if (e.kind === 'boss_idle') boss.push({ kind: 'idle', run: () => idleJob() });
      else if (e.kind === 'agent_spawn') { const a = agents.get(e.agent); if (!a) { getAgent(e); } else { a.name = e.name || a.name; if (a.st !== 'working' || a.doneQ) { a.st = 'working'; a.doneQ = 0; a.act.push({ kind: 'spawn', run: () => { a.st = 'working'; roster(); if (a.ch) return; allocDesk(a); return spawnJob(a); } }); roster(); } } }
      else if (e.kind === 'agent_tool') { const a = getAgent(e); a.n++; if (a.st !== 'working') return; a.act.push({ kind: 'tool', tool: e.tool || 'other', detail: e.detail, count: 1, run: j => toolJob(a, j) }); roster(); }
      else if (e.kind === 'agent_done') { const a = getAgent(e); a.doneQ = 1; a.act.push({ kind: 'done', ok: e.ok, detail: e.detail, run: j => doneJob(a, j) }); if (e.ok === false) a.st = 'failing'; }
    },
    clear() { for (const a of agents.values()) { a.ch && a.ch.remove(); if (a.desk) a.desk.occ = null; } agents.clear(); wbSlots = []; nAgents = 0; boss.q.length = 0; world.sleeps.length = 0; if (bossCh) { bossCh.remove(); bossCh = null; } bossLoc = 'office'; world.focus(null); world.setMood(1); roster(); },
    state() { return { boss: { loc: bossLoc, q: boss.q.length, mode: bossCh && bossCh.mode }, agents: [...agents.values()].map(a => ({ id: a.id, name: a.name, st: a.st, at: a.at, tool: a.tool, q: a.act.q.length, n: a.n, desk: a.desk ? a.desk.idx : null })) }; },
    boot() { mkBoss(); },
  };
}
