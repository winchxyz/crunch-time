import * as THREE from 'three';
export const V = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const wrap = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
const SNAP = { value: 130 };

/* ---------------- Style definitions ---------------- */
const PAL_PS1 = { floor: 0xffffff, parq: 0xffffff, rug: 0x8a2a2a, wall: 0xc8b592, wall2: 0xb59c78, base: 0x4a3424, wood: 0xffffff, dwood: 0xffffff, chair: 0x2a3a55, pot: 0xb0562e, green: 0x2f9a3f, dgreen: 0x1f6a2c, red: 0xc23030, blue: 0x3a5ad0, cab: 0xaeb4bf, dark: 0x23252e, grey: 0x8a8f99, bosswood: 0xffffff };
const PAL_RS = { floor: 0x4a7a3c, parq: 0xa06a30, rug: 0x1f4fa8, wall: 0xc9a45c, wall2: 0xa8823f, base: 0x5a3a18, wood: 0xc07830, dwood: 0x7a4a1c, chair: 0xa82828, pot: 0xc0602a, green: 0x38a838, dgreen: 0x257a2a, red: 0xc82828, blue: 0x2a52d0, cab: 0x8a9aa0, dark: 0x2a2c36, grey: 0x8a8f99, bosswood: 0x6a3410 };
const PAL_CL = { floor: 0x78a050, parq: 0xb88848, rug: 0x3060c8, wall: 0xe4d4a0, wall2: 0xc8b078, base: 0x704820, wood: 0xc88a3c, dwood: 0x8a5a2a, chair: 0xc03030, pot: 0xc86030, green: 0x40b040, dgreen: 0x2c8c34, red: 0xd03030, blue: 0x3468e0, cab: 0xa0a8b0, dark: 0x30323c, grey: 0x9098a0, bosswood: 0x70401c };
const N = THREE.NearestFilter, LN = THREE.LinearFilter;
export const STYLES = {
  ps1: { id: 'ps1', flat: true, snap: true, filter: N, tex: 'color', chars: 'box', dither: 1, quant: 15, vig: .9, contrast: 1, fog: [0x0a0c1c, 34, 80], bg: 0x0a0c1c, shadows: false, glow: false, shake: true, aa: false, res: (w, h) => (w >= h ? [Math.round(252 * w / h), 252] : [240, Math.round(240 * h / w)]), ambI: 1.1, sunI: 1.4, lampI: 60, pal: PAL_PS1 },
  rs2: { id: 'rs2', flat: false, snap: false, filter: LN, tex: 'soft', chars: 'rs', dither: 0, quant: 0, vig: .3, contrast: 1.04, fog: [0x0a1638, 30, 72], bg: 0x0a1638, shadows: false, glow: false, shake: false, aa: true, res: (w, h, d) => [Math.round(w * d * .85), Math.round(h * d * .85)], ambI: 1.05, sunI: 1.7, lampI: 45, pal: PAL_RS },
  classic: { id: 'classic', flat: true, snap: false, filter: N, tex: 'none', chars: 'sprite', dither: 0, quant: 0, vig: 0, contrast: 1.02, fog: null, bg: 0x101a40, shadows: false, glow: false, shake: false, aa: false, res: (w, h) => (w >= h ? [Math.round(340 * w / h), 340] : [300, Math.round(300 * h / w)]), ambI: .8, sunI: 2.3, lampI: 0, pal: PAL_CL },
  hd: { id: 'hd', flat: false, snap: false, filter: LN, tex: 'soft', chars: 'rs', dither: 0, quant: 0, vig: 1.25, contrast: 1.16, fog: [0x081030, 32, 78], bg: 0x081030, shadows: true, glow: true, shake: false, aa: true, res: (w, h, d) => [Math.round(w * d), Math.round(h * d)], ambI: .62, sunI: .8, lampI: 40, pal: PAL_RS },
};
let CUR = STYLES.rs2;

function ps1(m) {
  if (!CUR.snap) return m;
  m.onBeforeCompile = s => {
    s.uniforms.uSnap = SNAP;
    s.vertexShader = 'uniform float uSnap;\n' + s.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\nif(gl_Position.w>0.1){vec2 p=gl_Position.xy/gl_Position.w;p=floor(p*uSnap+0.5)/uSnap;gl_Position.xy=p*gl_Position.w;}');
  };
  return m;
}
const L = (c, map, o = {}) => ps1(new THREE.MeshLambertMaterial({ color: c, map: map || null, flatShading: CUR.flat, ...o }));
const B = (c, map, o = {}) => ps1(new THREE.MeshBasicMaterial({ color: c, map: map || null, ...o }));

function mkTex(w, h, fn, rep) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); fn(x, w, h);
  const t = new THREE.CanvasTexture(c); t.magFilter = CUR.filter; t.minFilter = CUR.filter === N ? N : THREE.LinearMipmapLinearFilter; t.colorSpace = THREE.SRGBColorSpace;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const noisy = (x, w, h, b, amp) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const n = (rnd() - .5) * amp; x.fillStyle = `rgb(${b[0] + n | 0},${b[1] + n | 0},${b[2] + n | 0})`; x.fillRect(i, j, 1, 1); } };
const poster = (t1, t2, bg, fg) => mkTex(48, 64, (x, w, h) => {
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.strokeStyle = fg; x.lineWidth = 2; x.strokeRect(2, 2, w - 4, h - 4);
  x.fillStyle = fg; x.textAlign = 'center'; x.font = 'bold 10px monospace'; x.fillText(t1, w / 2, 22); x.fillText(t2, w / 2, 34);
  x.fillRect(10, 42, w - 20, 3); x.fillRect(16, 49, w - 32, 3); x.fillRect(20, 56, w - 40, 2);
});

/* ---------------- Routing ---------------- */
const GAPS = [-4.6, -1.4, 1.8, 5.0];
const ENT = { W: 0.5, A: 5.7, E: 10.6 };
const reg = p => p.x < -5 && p.z < -2 ? 'O' : p.z < -7.7 ? 'L' : p.x < 1.5 ? 'W' : p.x < 7.8 ? 'A' : 'E';
const ORD = ['O', 'W', 'A', 'E'];
export function route(a, b) {
  const out = [], P = (x, z) => out.push(V(x, 0, z));
  const ra = reg(a), rb = reg(b); let cur = ra, z = a.z;
  const gz = zz => GAPS.reduce((m, g) => Math.abs(g - zz) < Math.abs(m - zz) ? g : m, GAPS[0]);
  const go = t => {
    while (cur !== t) {
      const i = ORD.indexOf(cur), n = ORD[i + Math.sign(ORD.indexOf(t) - i)], pr = cur + n;
      if (pr === 'OW') { P(-7.5, -2.9); P(-7.5, -1.3); z = -1.3; } else if (pr === 'WO') { P(-7.5, -1.3); P(-7.5, -2.9); z = -2.9; }
      else { const g = gz(z); if (pr === 'WA') { P(1, g); P(3.5, g); } else if (pr === 'AW') { P(3.5, g); P(1, g); } else if (pr === 'AE') { P(7.6, g); P(9.6, g); } else { P(9.6, g); P(7.6, g); } z = g; }
      cur = n;
    }
  };
  if (a.z < -9.6) P(a.x, -8.4);
  if (ra === 'O' && a.z < -6.9) P(-6.4, -7.0);
  if (ra === 'L' && rb !== 'L') { const t = rb === 'O' ? 'W' : rb; P(ENT[t], -7.6); cur = t; z = -7.6; }
  if (rb === 'L') { if (ra !== 'L') { const x = ra === 'O' ? 'W' : ra; go(x); P(ENT[x], -7.6); } } else go(rb);
  if (rb === 'O' && b.z < -6.9) P(-6.4, -7.0);
  if (b.z < -9.6) P(b.x, -8.4);
  out.push(V(b.x, 0, b.z)); return out;
}

/* ---------------- Sprite atlas (Classic) ---------------- */
const hex = c => '#' + c.toString(16).padStart(6, '0');
const FR = (() => {
  const S = { legs: [[0, 15], [0, 15]], aL: 'down', aR: 'down' }, f = {};
  const add = (n, o) => f[n] = { ...S, ...o };
  add('stand', {}); add('walk0', { legs: [[-2, 15], [2, 12]], aL: 'fwd' }); add('walk1', {}); add('walk2', { legs: [[2, 12], [-2, 15]], aR: 'fwd' }); add('walk3', {});
  add('type0', { aL: 'fwd', aR: 'fwd', ah: [-1, 1] }); add('type1', { aL: 'fwd', aR: 'fwd', ah: [1, -1] });
  add('read', { aL: 'fwd', aR: 'fwd', prop: 'paper' }); add('carry', { aL: 'fwd', aR: 'fwd', prop: 'stack' });
  add('cheer0', { aL: 'up', aR: 'up', mouth: 1 }); add('cheer1', { aL: 'up', aR: 'up', mouth: 1, dx: 1, ah: [1, -1] });
  add('panic0', { aL: 'up', aR: 'up', mouth: 1, sweat: 1, dx: -1 }); add('panic1', { aL: 'up', aR: 'up', mouth: 1, sweat: 1, dx: 1 });
  add('yell0', { aL: 'down', aR: 'up', mouth: 1 }); add('yell1', { aL: 'down', aR: 'fwd', mouth: 1, dx: 1 });
  add('coffee', { aR: 'up', prop: 'cup' }); add('sleep', { hd: 3, eyes: 0 }); add('stretch', { aL: 'up', aR: 'up', mouth: 1 }); add('flinch', { aL: 'hunch', aR: 'hunch', dy: 2, eyes: 0 });
  return f;
})();
const FNAMES = Object.keys(FR);
function drawSprite(o, boss) {
  const variants = boss ? [[0, 0], [1, 0], [0, 1], [1, 1]] : [[0, 0], [1, 0]]; const keys = [];
  for (const n of FNAMES) for (const [s, r] of variants) keys.push(n + (s ? 'S' : '') + (r ? 'R' : ''));
  const cv = document.createElement('canvas'); cv.width = keys.length * 32; cv.height = 48; const x = cv.getContext('2d');
  const shirt = hex(boss ? 0x2b2b3a : o.shirt), pants = hex(boss ? 0x1e1e28 : (o.pants || 0x2c3350)), hair = hex(o.hair || 0x3a2a1a), skin = hex(o.skin || 0xe8b48a);
  keys.forEach((k, ki) => {
    const sit = /S/.test(k.replace(/^[a-z]+\d?/, '')) ? 1 : 0, red = /R$/.test(k) ? 1 : 0, name = k.replace(/[SR]+$/, ''), f = FR[name];
    const ox = ki * 32 + (f.dx || 0), dy = (sit ? 8 : 0) + (f.dy || 0), hd = f.hd || 0, parts = [];
    const P = (px, py, w, h, c) => parts.push([px, py, w, h, c]);
    for (let i = 0; i < 2; i++) { const len = sit ? 5 : f.legs[i][1], lx = 10 + i * 7 + (sit ? 0 : f.legs[i][0]); P(ox + lx, 30 + dy, 5, len, pants); P(ox + lx - (i ? 0 : 1), 30 + dy + len, 7, 3, '#1a1a20'); }
    P(ox + 9, 16 + dy, 14, 14, shirt);
    if (boss) { P(ox + 14, 16 + dy, 4, 5, '#eee'); P(ox + 15, 17 + dy, 2, 10, '#d01818'); }
    for (let i = 0; i < 2; i++) {
      const m = i ? f.aR : f.aL, ah = f.ah ? f.ah[i] : 0, sx = i ? 23 : 5;
      if (m === 'down') { P(ox + sx, 17 + dy, 4, 11, shirt); P(ox + sx, 28 + dy, 4, 3, skin); }
      else if (m === 'fwd') { const ax = i ? 20 : 8; P(ox + ax, 21 + dy + ah, 4, 8, shirt); P(ox + ax, 29 + dy + ah, 4, 3, skin); }
      else if (m === 'up') { P(ox + sx - (i ? 0 : 0), 4 + dy + ah, 4, 13, shirt); P(ox + sx, 2 + dy + ah, 4, 3, skin); }
      else if (m === 'hunch') { const ax = i ? 20 : 8; P(ox + ax, 8 + dy, 4, 10, shirt); P(ox + ax, 6 + dy, 4, 3, skin); }
    }
    if (f.prop === 'paper') P(ox + 9, 24 + dy, 14, 8, '#fff'); if (f.prop === 'stack') { P(ox + 8, 23 + dy, 16, 9, '#f4f0e0'); P(ox + 8, 27 + dy, 16, 1, '#b8b090'); }
    if (f.prop === 'cup') P(ox + 22, 9 + dy, 4, 5, '#fff');
    const hy = 6 + dy + hd; P(ox + 10, hy, 12, 10, red ? '#e02a1a' : skin);
    P(ox + 10, hy - 1, 12, 4, hair); P(ox + 9, hy, 2, 6, hair); P(ox + 21, hy, 2, 6, hair);
    if (f.eyes !== 0) { P(ox + 13, hy + 4, 2, 2, '#101018'); P(ox + 18, hy + 4, 2, 2, '#101018'); } else { P(ox + 13, hy + 5, 2, 1, '#101018'); P(ox + 18, hy + 5, 2, 1, '#101018'); }
    if (f.mouth) P(ox + 14, hy + 7, 4, 3, '#401010'); else P(ox + 14, hy + 8, 4, 1, '#a04030');
    if (f.sweat) { P(ox + 7, hy + 1, 2, 3, '#60c8ff'); P(ox + 24, hy + 3, 2, 3, '#60c8ff'); }
    x.fillStyle = '#000'; for (const [px, py, w, h] of parts) if (!(w === 2 && h === 3 && py < hy + 5 && f.sweat)) x.fillRect(px - 1, py - 1, w + 2, h + 2);
    for (const [px, py, w, h, c] of parts) { x.fillStyle = c; x.fillRect(px, py, w, h); }
  });
  const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = N; t.colorSpace = THREE.SRGBColorSpace; t.generateMipmaps = false;
  t.repeat.set(1 / keys.length, 1); return { t, keys };
}

/* ---------------- Character ---------------- */
const UB = new THREE.BoxGeometry(1, 1, 1);
export class Char {
  constructor(w, o) {
    this.w = w; this.o = o; const s = this.s = o.scale || .78;
    this.g = new THREE.Group(); this.g.scale.setScalar(s); w.scene.add(this.g);
    this.skin0 = new THREE.Color(o.skin || 0xe8b48a);
    this.cur = { aL: 0, aR: 0, zL: 0, zR: 0, hx: 0 };
    this.mode = 'idle'; this.path = []; this.moving = false; this.yaw = 0; this.yawT = 0; this.phase = Math.random() * 6; this.sit = 0; this.sitT = 0;
    this.angry = 0; this.angryT = 0; this.flinchT = 0; this.slamT = 0; this.bt = 0; this.speed = (o.boss ? 3.9 : 3.5); this.seat = null; this.flip = 1;
    const el = this.el = document.createElement('div'); el.className = 'lab' + (o.boss ? ' boss' : '');
    el.innerHTML = '<div class="li"><div class="bub"></div><div class="ico"></div><div class="tag"></div></div>';
    this.eBub = el.querySelector('.bub'); this.eIco = el.querySelector('.ico'); this.eTag = el.querySelector('.tag');
    this.eBub.style.display = this.eIco.style.display = 'none'; this.eTag.textContent = (o.name || '').slice(0, 16);
    w.overlay.appendChild(el); w.chars.add(this); this.build();
  }
  build() {
    const g = this.g; while (g.children.length) g.remove(g.children[0]);
    this.spr = CUR.chars === 'sprite'; if (this.spr) this.buildSprite(); else this.buildRig(CUR.chars === 'rs');
  }
  buildSprite() {
    const { t, keys } = this.atlas || (this.atlas = drawSprite(this.o, this.o.boss)); this.keys = keys;
    const tex = t.clone(); tex.needsUpdate = true; this.stex = tex;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.733, 2.6), new THREE.MeshBasicMaterial({ map: tex, alphaTest: .5, side: THREE.DoubleSide }));
    m.position.y = 1.3; this.g.add(m); this.sm = m;
  }
  buildRig(rs) {
    const o = this.o, bd = this.bd = new THREE.Group(), sh = CUR.shadows; this.g.add(bd);
    this.mSkin = L(o.skin || 0xe8b48a); this.mShirt = L(o.shirt); this.mHair = L(o.hair || 0x3a2a1a); const mPants = L(o.pants || 0x2c3350), MSHOE = L(rs ? 0x4a2a12 : 0x1a1a20);
    const reg_ = q => { if (sh) q.castShadow = true; return q; };
    const part = (m, sx, sy, sz, x, y, z, p = bd) => { const q = reg_(new THREE.Mesh(UB, m)); q.scale.set(sx, sy, sz); q.position.set(x, y, z); p.add(q); return q; };
    const cyl = (m, r0, r1, h, x, y, z, p = bd, sx = 1, sz = 1) => { const q = reg_(new THREE.Mesh(new THREE.CylinderGeometry(r0, r1, h, 6), m)); q.position.set(x, y, z); q.scale.set(sx, 1, sz); p.add(q); return q; };
    const H = .85;
    this.legs = [-1, 1].map(k => { const p = new THREE.Group(); p.position.set(k * .21, H, 0); bd.add(p);
      if (rs) { cyl(mPants, .17, .13, .85, 0, -.425, 0, p); part(MSHOE, .34, .18, .54, 0, -.78, .1, p); } else { part(mPants, .34, .85, .38, 0, -.425, 0, p); part(MSHOE, .36, .14, .52, 0, -.8, .08, p); } return p; });
    if (rs) { cyl(this.mShirt, .5, .4, .95, 0, H + .475, 0, bd, 1, .6); cyl(L(0x3a2410), .42, .42, .12, 0, H + .05, 0, bd, 1, .62); } else part(this.mShirt, .92, .95, .52, 0, H + .475, 0);
    if (o.boss) { part(L(0xeeeeee), .3, .8, .04, 0, H + .55, .28); part(L(0xd01818), .14, .7, .05, 0, H + .5, .31); part(L(0xd01818), .2, .16, .06, 0, H + .9, .31); }
    this.arms = [-1, 1].map(k => { const p = new THREE.Group(); p.position.set(k * .63, H + .85, 0); bd.add(p);
      if (rs) { cyl(this.mShirt, .15, .11, .72, 0, -.36, 0, p); part(this.mSkin, .3, .28, .3, 0, -.86, 0, p); } else { part(this.mShirt, .28, .8, .3, 0, -.4, 0, p); part(this.mSkin, .26, .2, .28, 0, -.88, 0, p); } return p; });
    this.cup = part(L(0xffffff), .2, .26, .2, 0, -1.0, .2, this.arms[1]); this.cup.visible = false;
    const hd = this.head = new THREE.Group(); hd.position.set(0, H + .98, 0); bd.add(hd);
    if (rs) cyl(this.mSkin, .13, .15, .12, 0, -.02, 0, bd);
    part(this.mSkin, .74, .74, .74, 0, .37, 0, hd);
    const eye = L(0x101018);
    part(eye, .1, .13, .05, -.17, .42, .38, hd); part(eye, .1, .13, .05, .17, .42, .38, hd);
    if (rs) { part(this.mSkin, .12, .14, .1, 0, .3, .4, hd); part(this.mSkin, .08, .16, .18, -.4, .35, 0, hd); part(this.mSkin, .08, .16, .18, .4, .35, 0, hd); }
    this.mouth = part(L(0x401010), .22, .06, .05, 0, .2, .38, hd);
    part(this.mHair, .8, .26, .8, 0, .78, 0, hd); part(this.mHair, .8, .55, .22, 0, .5, -.31, hd);
    if (o.style === 'spiky') { for (let i = -1; i <= 1; i++) part(this.mHair, .22, .3, .22, i * .25, 1.02, 0, hd); }
    if (o.style === 'long') { part(this.mHair, .12, .7, .5, -.44, .3, -.05, hd); part(this.mHair, .12, .7, .5, .44, .3, -.05, hd); }
    if (o.glasses) { const gm = L(0x111111); part(gm, .24, .18, .04, -.17, .42, .4, hd); part(gm, .24, .18, .04, .17, .42, .4, hd); }
    if (o.boss) { const bm = L(0x201010); this.brows = [-1, 1].map(k => { const q = part(bm, .28, .07, .05, k * .17, .58, .4, hd); q.rotation.z = k * .35; return q; }); }
    this.stack = part(L(0xf4f0e0), .7, .38, .5, 0, H + .75, .6); this.stack.visible = false;
    this.sheet = part(L(0xffffff), .5, .05, .62, 0, H + .95, .55); this.sheet.visible = false;
    this.cur.sit = 0;
  }
  goTo(v) { return new Promise(res => { if (this.wres) this.wres(); this.path = route(this.g.position, v); this.wres = res; if (!this.path.length) { this.wres = null; res(); } }); }
  face(v) { this.yawT = Math.atan2(v.x - this.g.position.x, v.z - this.g.position.z); }
  faceYaw(y) { this.yawT = y; }
  sitAt(seat) { this.seat = seat; this.g.position.set(seat.chair.x, 0, seat.chair.z); this.yawT = this.yaw = seat.yaw; this.sitT = 1; }
  standUp() { if (this.sitT && this.seat) { this.g.position.add(this.seat.out); } this.sitT = 0; }
  icon(e) { this.eIco.style.display = e ? '' : 'none'; if (e) this.eIco.textContent = e; }
  say(t, o = {}) {
    const b = this.eBub; b.textContent = t; b.style.display = ''; b.className = 'bub' + (o.big ? ' big' : '') + (o.red ? ' red' : '');
    void b.offsetWidth; b.classList.add('pop'); this.bt = o.dur || 2.4; this.bpri = o.pri || 0;
  }
  flinch(d = 1) { this.flinchT = d; }
  slam(cb) { this.slamT = .5; this.slamHit = false; this.onSlam = cb; }
  remove() { this.w.scene.remove(this.g); this.el.remove(); this.w.chars.delete(this); }
  update(dt, t) {
    const g = this.g, c = this.cur, k = Math.min(1, dt * 14);
    if (this.path.length) {
      const p = this.path[0], dx = p.x - g.position.x, dz = p.z - g.position.z, d = Math.hypot(dx, dz);
      if (d < this.speed * dt + .02) { g.position.x = p.x; g.position.z = p.z; this.path.shift(); if (!this.path.length) { this.moving = false; const r = this.wres; this.wres = null; r && r(); } }
      else { g.position.x += dx / d * this.speed * dt; g.position.z += dz / d * this.speed * dt; this.yawT = Math.atan2(dx, dz); this.moving = true; this.yaw = this.yawT; }
    }
    this.yaw += wrap(this.yawT - this.yaw) * Math.min(1, dt * 12); g.rotation.y = this.yaw;
    this.sit += (this.sitT - this.sit) * Math.min(1, dt * 10);
    this.bt -= dt; if (this.bt <= 0 && this.eBub.style.display !== 'none') this.eBub.style.display = 'none';
    this.flinchT -= dt; this.angry += (this.angryT - this.angry) * Math.min(1, dt * 4);
    const walking = this.moving && this.path.length, m = this.mode;
    if (this.slamT > 0) { this.slamT -= dt; const ph = 1 - this.slamT / .5; if (!this.slamHit && ph >= .55) { this.slamHit = true; this.onSlam && this.onSlam(); } }
    if (walking) this.phase += dt * 9;
    if (this.spr) return this.animSprite(t, walking, m);
    this.mSkin.color.copy(this.skin0).lerp(new THREE.Color(0xe02a1a), this.angry);
    let aL = 0, aR = 0, zL = 0, zR = 0, hx = 0, hop = 0, sx = 0;
    if (walking) {
      const sw = Math.sin(this.phase);
      this.legs[0].rotation.x = sw * .8; this.legs[1].rotation.x = -sw * .8; aL = -sw * .6; aR = sw * .6; hop = Math.abs(sw) * .06;
      if (m === 'carry') { aL = aR = -1.15; } if (m === 'panic') { aL = aR = -2.6; }
    } else {
      const sl = -Math.PI / 2 * this.sit; this.legs[0].rotation.x += (sl - this.legs[0].rotation.x) * k; this.legs[1].rotation.x += (sl - this.legs[1].rotation.x) * k;
      if (m === 'type') { const f = this.fast ? 30 : 20; aL = -1.25 + Math.sin(t * f + this.phase) * .14; aR = -1.25 + Math.sin(t * (f - 3)) * .14; hx = .1; }
      else if (m === 'read') { aL = aR = -1.05; hx = .35; }
      else if (m === 'carry') { aL = aR = -1.15; }
      else if (m === 'coffee') { aR = -2.3 + Math.sin(t * 2.5) * .12; hx = -.1; }
      else if (m === 'sleep') { hx = .75; aL = aR = -.25; }
      else if (m === 'cheer') { aL = aR = -2.9 + Math.sin(t * 12) * .3; zL = .5; zR = -.5; hop = Math.abs(Math.sin(t * 8)) * .4; }
      else if (m === 'panic') { aL = aR = -2.7; sx = Math.sin(t * 45) * .05; hx = -.2; }
      else if (m === 'yell') { aR = -2.4 + Math.sin(t * 11) * .8; aL = -.6; zL = .5; hx = -.25; hop = Math.abs(Math.sin(t * 5)) * .12; }
      else if (m === 'stretch') { aL = aR = -3.05; hx = -.35; }
      else if (m === 'think') { aR = -2.0; hx = .15; }
      else aL = Math.sin(t * 1.6 + this.phase) * .05;
    }
    if (this.flinchT > 0) { aL = aR = -2.5; zL = .3; zR = -.3; hx = .5; sx += Math.sin(t * 50) * .03; }
    if (this.slamT > 0) { const ph = 1 - this.slamT / .5; aR = ph < .55 ? -3.1 : -.5; aL = -.6; }
    c.aL += (aL - c.aL) * k; c.aR += (aR - c.aR) * k; c.zL += (zL - c.zL) * k; c.zR += (zR - c.zR) * k; c.hx += (hx - c.hx) * k;
    this.arms[0].rotation.x = c.aL; this.arms[1].rotation.x = c.aR; this.arms[0].rotation.z = -c.zL; this.arms[1].rotation.z = -c.zR;
    this.head.rotation.x = c.hx;
    this.bd.position.y = -.3 * this.sit + hop - (this.flinchT > 0 ? .1 : 0); this.bd.position.x = sx;
    g.scale.y = this.s * (this.flinchT > 0 ? .92 : 1);
    this.stack.visible = m === 'carry'; this.sheet.visible = m === 'read'; this.cup.visible = m === 'coffee';
    const talk = this.bt > 0 || m === 'yell'; this.mouth.scale.y = talk ? .06 + (.5 + .5 * Math.sin(t * 20)) * (m === 'yell' ? .28 : .12) : .06;
    if (this.brows) this.brows.forEach((q, i) => { q.rotation.z = (i ? 1 : -1) * (.1 + .5 * this.angry); });
  }
  animSprite(t, walking, m) {
    const g = this.g, cam = this.w.cam; let n = 'stand', hop = 0;
    const f2 = (r, a, b) => Math.floor(t * r) % 2 ? a : b;
    if (this.flinchT > 0) n = 'flinch';
    else if (this.slamT > 0) n = 'yell' + (1 - this.slamT / .5 < .55 ? 0 : 1);
    else if (walking) n = m === 'carry' ? 'carry' : m === 'panic' ? 'panic' + Math.floor(t * 10) % 2 : 'walk' + (Math.floor(this.phase / 1.2) % 4), hop = Math.abs(Math.sin(this.phase)) * .05;
    else if (m === 'type') n = 'type' + (Math.floor(t * (this.fast ? 12 : 7)) % 2);
    else if (m === 'read') n = 'read'; else if (m === 'carry') n = 'carry'; else if (m === 'coffee') n = 'coffee'; else if (m === 'sleep') n = 'sleep';
    else if (m === 'cheer') { n = 'cheer' + Math.floor(t * 6) % 2; hop = Math.abs(Math.sin(t * 8)) * .35; }
    else if (m === 'panic') n = 'panic' + Math.floor(t * 10) % 2;
    else if (m === 'yell') { n = 'yell' + Math.floor(t * 6) % 2; hop = Math.abs(Math.sin(t * 5)) * .1; }
    else if (m === 'stretch') n = 'stretch';
    const key = n + (this.sit > .5 ? 'S' : '') + (this.o.boss && this.angry > .4 ? 'R' : '');
    let i = this.keys.indexOf(key); if (i < 0) i = this.keys.indexOf('stand'); this.stex.offset.x = i / this.keys.length;
    const cyaw = Math.atan2(cam.position.x - g.position.x, cam.position.z - g.position.z); this.sm.rotation.y = cyaw - this.yaw;
    const hx = Math.sin(this.yaw), hz = Math.cos(this.yaw), d = hx * Math.cos(cyaw) - hz * Math.sin(cyaw);
    if (Math.abs(d) > .25) this.flip = d < 0 ? -1 : 1; this.sm.scale.x = this.flip;
    this.sm.position.y = 1.3 + hop; this.sm.position.x = m === 'panic' && !walking ? Math.sin(t * 45) * .03 : 0;
  }
}

/* ---------------- World ---------------- */
export function createWorld(canvas, overlay, initial = 'ps1') {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(1); renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(36, 16 / 9, .5, 160);
  const w = { renderer, scene, cam, overlay, chars: new Set(), desks: [], now: 0, timeScale: 1, ticks: [], sleeps: [], style: 'ps1' };
  let rt, room, lamps = [], amb, sun, pool = [], cw = 1280, ch = 720, mood = 1, moodT = 1, sprites = [];
  const boxes = []; let sparkMat;

  // desk records (persistent)
  {
    const cols = [2.6, 8.6], rows = [-6.2, -3.0, .2, 3.4];
    for (const zr of rows) for (const dx of cols) w.desks.push({ dx, dz: zr, chair: V(dx + 1.1, 0, zr), out: V(.8, 0, 0), yaw: -Math.PI / 2, mode: 'idle', occ: null, pos: V(dx, 1.5, zr) });
    w.desks.sort((p, q) => p.chair.distanceTo(V(14, 0, 18)) - q.chair.distanceTo(V(14, 0, 18))).forEach((d, i) => d.idx = i);
  }
  w.pts = { F: V(-1.5, 0, -1), cab: V(8, 0, -8.5), coffee: V(11.3, 0, -8.5), spawn: V(-2, 0, -10.4), bossDesk: { chair: V(-9, 0, -7.9), out: V(1.9, 0, 0), yaw: 0 }, bossFront: V(-9, 0, -4.9), wb: [1.4, 2.4, 3.4, 4.4, 5.4, 0.5].map(x => V(x, 0, -9.0)) };
  w.route = route;

  const glowTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.35, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); })();

  function build() {
    if (room) scene.remove(room);
    room = new THREE.Group(); scene.add(room); sprites = []; const P = CUR.pal, sh = CUR.shadows;
    const tex = CUR.tex, sm = (rep, lines) => mkTex(16, 16, (x, a, b) => { noisy(x, a, b, [225, 225, 225], 34); if (lines) { x.fillStyle = 'rgba(0,0,0,.14)'; for (let i = 2; i < 16; i += 4) x.fillRect(0, i, 16, 1); } }, rep);
    const T = {};
    if (tex === 'color') {
      Object.assign(T, {
        carpet: mkTex(16, 16, (x, a, b) => { noisy(x, a, b, [62, 72, 104], 22); }, [13, 8.5]),
        parq: mkTex(16, 16, (x, a, b) => { noisy(x, a, b, [150, 102, 60], 26); x.fillStyle = 'rgba(40,20,5,.5)'; x.fillRect(0, 0, 16, 1); x.fillRect(0, 8, 16, 1); x.fillRect(0, 0, 1, 8); x.fillRect(8, 8, 1, 8); }, [8, 4]),
        wood: mkTex(16, 16, (x, a, b) => { noisy(x, a, b, [170, 118, 70], 18); x.fillStyle = 'rgba(70,35,10,.35)'; for (let i = 2; i < 16; i += 4) x.fillRect(0, i, 16, 1); }),
        dwood: mkTex(16, 16, (x, a, b) => { noisy(x, a, b, [86, 48, 30], 14); x.fillStyle = 'rgba(20,5,0,.4)'; for (let i = 3; i < 16; i += 5) x.fillRect(0, i, 16, 1); }),
      });
    } else if (tex === 'soft') Object.assign(T, { carpet: sm([13, 8.5]), parq: sm([8, 4], 1), wood: sm(null, 1), dwood: sm(null, 1) });
    if (tex !== 'none') {
      Object.assign(T, {
        kb: mkTex(8, 16, (x, a, b) => { x.fillStyle = '#25262e'; x.fillRect(0, 0, a, b); x.fillStyle = '#7d8090'; for (let j = 1; j < 15; j += 2) for (let i = 1; i < 8; i += 2) x.fillRect(i - 1, j, 1, 1); }),
        city: mkTex(256, 48, (x, a, b) => {
          const gr = x.createLinearGradient(0, 0, 0, b); gr.addColorStop(0, '#0b1030'); gr.addColorStop(1, '#3a2a5c'); x.fillStyle = gr; x.fillRect(0, 0, a, b); x.fillStyle = '#f6f0c0'; x.fillRect(200, 6, 6, 6);
          for (let i = 0; i < 40; i++) { const bw = 8 + rnd() * 14 | 0, bh = 10 + rnd() * 30 | 0, bx = i * 6.4 | 0; x.fillStyle = `rgb(${18 + rnd() * 14 | 0},${16 + rnd() * 12 | 0},${40 + rnd() * 20 | 0})`; x.fillRect(bx, b - bh, bw, bh); for (let j = 0; j < bh * bw / 14; j++) if (rnd() < .5) { x.fillStyle = rnd() < .8 ? '#ffd870' : '#8fe0ff'; x.fillRect(bx + 1 + (rnd() * (bw - 2) | 0), b - bh + 1 + (rnd() * (bh - 2) | 0), 1, 1); } }
        }),
        wb: mkTex(64, 40, (x, a, b) => { x.fillStyle = '#f2f4f2'; x.fillRect(0, 0, a, b); x.strokeStyle = '#2a5ad0'; x.lineWidth = 1; x.strokeRect(6, 6, 20, 12); x.beginPath(); x.moveTo(26, 12); x.lineTo(40, 12); x.lineTo(40, 26); x.stroke(); x.strokeStyle = '#d02a2a'; x.strokeRect(34, 26, 24, 10); x.fillStyle = '#d02a2a'; x.font = 'bold 8px monospace'; x.fillText('ASAP!!', 8, 32); x.fillStyle = '#222'; x.fillText('TODO', 8, 15); x.fillRect(44, 6, 14, 1); x.fillRect(44, 9, 10, 1); }),
        clock: mkTex(16, 16, (x) => { x.fillStyle = '#eee'; x.beginPath(); x.arc(8, 8, 7, 0, 7); x.fill(); x.fillStyle = '#222'; x.fillRect(8, 3, 1, 5); x.fillRect(8, 8, 4, 1); x.fillStyle = '#d02020'; x.fillRect(4, 11, 1, 1); }),
        chart: mkTex(64, 36, (x, a, b) => { x.fillStyle = '#10141c'; x.fillRect(0, 0, a, b); x.strokeStyle = '#ff3030'; x.lineWidth = 2; x.beginPath(); x.moveTo(3, 6); x.lineTo(16, 12); x.lineTo(26, 9); x.lineTo(40, 22); x.lineTo(50, 20); x.lineTo(61, 32); x.stroke(); x.fillStyle = '#ff3030'; x.font = 'bold 7px monospace'; x.fillText('-99%', 4, 32); }),
        p1: poster('SHIP', 'IT!', '#e8c020', '#2a1a10'), p2: poster('NO', 'BUGS', '#2060c0', '#f0f0ff'), p3: poster('CRUNCH', 'TIME', '#c02020', '#ffe8a0'), p4: poster('SLEEP?', 'LOL', '#20a060', '#fff'),
      });
    }
    const TL = (t, col) => tex === 'none' ? L(col) : L(0xffffff, t), TB = (t, col) => tex === 'none' ? B(col) : B(0xffffff, t);
    const M = {
      carpet: L(P.floor, T.carpet), parq: L(P.parq, T.parq), wood: L(P.wood, T.wood), dwood: L(P.dwood, T.dwood), bwood: L(P.bosswood, T.dwood), wall: L(P.wall), wall2: L(P.wall2), base: L(P.base), dark: L(P.dark), grey: L(P.grey), lgrey: L(P.cab),
      white: L(0xf0f0f0), green: L(P.green), dgreen: L(P.dgreen), pot: L(P.pot), red: L(P.red), blue: L(P.blue), chairs: L(P.chair), rug: L(P.rug),
      glass: L(0x9ad0ff, null, { transparent: true, opacity: .16, depthWrite: false, fog: false }), kb: tex === 'none' ? L(0x33343c) : L(0xffffff, T.kb),
      city: tex === 'none' ? B(0x1c2454, null, { fog: false }) : B(0xffffff, T.city, { fog: false }), night: B(0x0b0e22, null, { fog: false }), lamp: B(0xffe6a0), jug: L(0x6ab8ff, null, { transparent: true, opacity: .7 }),
    };
    const box = (sx, sy, sz, m, x, y, z, p = room) => { const o = new THREE.Mesh(UB, m); o.scale.set(sx, sy, sz); o.position.set(x, y, z); if (sh) { o.castShadow = true; o.receiveShadow = true; } p.add(o); return o; };
    const plane = (pw, ph, m, x, y, z, ry = 0, rx = 0) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(pw, ph), m); o.position.set(x, y, z); o.rotation.set(rx, ry, 0); if (sh) o.receiveShadow = true; room.add(o); return o; };
    const glow = (x, y, z, col, s, op = .8) => { if (!CUR.glow) return; const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: col, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op, fog: false })); sp.position.set(x, y, z); sp.scale.set(s, s, 1); room.add(sp); return sp; };
    scene.background = new THREE.Color(CUR.bg); scene.fog = CUR.fog ? new THREE.Fog(CUR.fog[0], CUR.fog[1], CUR.fog[2]) : null;

    // floor & walls
    plane(30, 20, M.carpet, 0, 0, -2, 0, -Math.PI / 2);
    plane(8, 8, M.parq, -9, .02, -6, 0, -Math.PI / 2);
    plane(4.4, 3, M.rug, -9, .04, -4.2, 0, -Math.PI / 2);
    const wall = (x0, x1, y0, y1, m = M.wall) => box(x1 - x0, y1 - y0, .4, m, (x0 + x1) / 2, (y0 + y1) / 2, -10);
    wall(-13, -2.8, 0, 6.5); wall(-1.2, 5.9, 0, 6.5); wall(8.5, 9.3, 0, 6.5); wall(11.9, 13, 0, 6.5);
    wall(-2.8, -1.2, 3.2, 6.5); wall(5.9, 8.5, 0, 2); wall(5.9, 8.5, 4.6, 6.5); wall(9.3, 11.9, 0, 2); wall(9.3, 11.9, 4.6, 6.5);
    plane(30, 9, M.city, 0, 3.5, -10.9); plane(30, 9, M.night, 0, 3.5, -12); plane(3, 4, M.night, -2, 1.6, -10.8);
    box(26, .5, .5, M.base, 0, .25, -9.78);
    box(.4, 6.5, 17, M.wall2, -13, 3.25, -1.5); box(.5, .5, 17, M.base, -12.75, .25, -1.5);
    box(.2, 3.2, .5, M.dwood, -2.9, 1.6, -9.9); box(.2, 3.2, .5, M.dwood, -1.1, 1.6, -9.9); box(1.9, .2, .5, M.dwood, -2, 3.2, -9.9);
    box(1.2, .4, .2, B(0x30d060), -2, 3.6, -9.75); glow(-2, 3.6, -9.6, 0x30ff70, 2.4, .6);
    [7.2, 10.6].forEach(x => { box(2.7, .12, .5, M.white, x, 2, -9.85); box(2.7, .12, .5, M.white, x, 4.6, -9.85); box(.1, 2.6, .3, M.white, x, 3.3, -9.85); });
    plane(1.1, 1.5, TL(T.p1, 0xe8c020), -.05, 2.9, -9.78); plane(1.1, 1.5, TL(T.p2, 0x2060c0), 5.55, 4.1, -9.78);
    plane(4, 2.5, TL(T.wb, 0xf2f4f2), 3, 2.6, -9.78); box(4.2, .1, .3, M.grey, 3, 1.3, -9.7);
    plane(.9, .9, TB(T.clock, 0xeeeeee), 12.5, 4.3, -9.78);
    plane(1.1, 1.5, TL(T.p3, 0xc02020), -12.75, 3.2, -8.6, Math.PI / 2); plane(1.1, 1.5, TL(T.p4, 0x20a060), -12.75, 3.2, -3.4, Math.PI / 2);
    plane(3.2, 1.8, tex === 'none' ? B(0x1a1c26) : B(0xffffff, T.chart), -12.75, 3.3, -6, Math.PI / 2);
    // sconces
    [[-9, 4.9, -9.6, 0], [3, 5.0, -9.6, 0], [-12.6, 4.9, -3, 1]].forEach(([x, y, z, side]) => { box(side ? .3 : .5, .5, side ? .5 : .3, M.dark, x, y, z); box(side ? .18 : .4, .2, side ? .4 : .18, M.lamp, x + (side ? .1 : 0), y + .05, z + (side ? 0 : .1)); glow(x + (side ? .5 : 0), y, z + (side ? 0 : .5), 0xffc070, 3.2, .7); });
    // partition
    const gl = (sx, sz, x, z) => { box(sx, 1.4, sz, M.base, x, .7, z); box(sx, 2.2, sz * .5, M.glass, x, 2.5, z); };
    gl(4.1, .2, -10.95, -2); gl(1.9, .2, -6.05, -2); gl(.2, 8, -5, -6);
    // desks
    w.desks.forEach(d => {
      const g = new THREE.Group(); g.position.set(d.dx, 0, d.dz); room.add(g);
      box(1.2, .1, 2.2, M.wood, 0, .85, 0, g); [[-.5, -1], [-.5, 1], [.5, -1], [.5, 1]].forEach(([a, b]) => box(.1, .85, .1, M.dwood, a, .42, b, g)); box(1.0, .6, .6, M.dwood, 0, .5, .75, g);
      box(.4, .06, .5, M.dark, -.2, .93, 0, g); box(.1, .3, .1, M.dark, -.2, 1.08, 0, g); box(.16, .85, 1.15, M.dark, -.2, 1.55, 0, g);
      const cv = document.createElement('canvas'); cv.width = 48; cv.height = 30; const t = new THREE.CanvasTexture(cv); t.magFilter = t.minFilter = N; t.colorSpace = THREE.SRGBColorSpace;
      const sg = new THREE.PlaneGeometry(1.0, .7); sg.rotateY(Math.PI / 2); const sc = new THREE.Mesh(sg, B(0xffffff, t)); sc.position.set(-.2 + .09, 1.55, 0); g.add(sc);
      d.cv = cv; d.ctx = cv.getContext('2d'); d.tex = t; d.glow = glow(d.dx - .1, 1.55, d.dz, 0x6ab0ff, 2.6, .55);
      const kb = new THREE.Mesh(new THREE.PlaneGeometry(.45, .9), M.kb); kb.rotation.x = -Math.PI / 2; kb.position.set(.2, .91, 0); g.add(kb);
      box(.3, .3, .3, M.white, .3, 1.05, -.95, g); box(.4, .03, .55, L(0xf4f4e8), .2, .91, .82, g);
      const cx = d.dx + 1.1, zr = d.dz; box(.9, .12, .9, M.chairs, cx, .5, zr); box(.12, .9, .85, M.chairs, cx + .5, .95, zr); box(.1, .5, .1, M.dark, cx, .25, zr); box(.7, .06, .7, M.dark, cx, .05, zr);
    });
    // boss desk
    box(3.6, .14, 1.3, M.bwood, -9, .9, -6.4); box(3.4, .8, 1.1, M.bwood, -9, .45, -6.4); box(.5, .03, .3, L(0xe8c030), -9.6, .99, -5.95); box(.7, .05, .5, M.dark, -8.4, .98, -6.6); box(.7, .5, .05, M.dark, -8.4, 1.25, -6.85); box(.5, .03, .4, M.white, -10, .99, -6.5);
    box(1.1, .12, 1.1, M.dark, -9, .65, -7.9); box(1.1, 1.3, .15, M.dark, -9, 1.3, -8.4); box(.12, .6, .12, M.dark, -9, .3, -7.9); glow(-8.4, 1.3, -6.6, 0x8fc0ff, 2.4, .5);
    // decor
    const plant = (x, z, s = 1) => { box(.6 * s, .6 * s, .6 * s, M.pot, x, .3 * s, z); box(.8 * s, .8 * s, .8 * s, M.green, x, 1.0 * s, z); box(.5 * s, .6 * s, .5 * s, M.dgreen, x + .1, 1.6 * s, z); };
    plant(-12, -9, 1.3); plant(-5.6, -1.2); plant(12, 5, 1.3); plant(-12, 3); plant(5.3, -9.2);
    [7.4, 8.5].forEach(x => { box(1, 1.8, .8, M.lgrey, x, .9, -9.5); [.4, .9, 1.4].forEach(y => box(.8, .04, .05, M.dark, x, y, -9.08)); });
    box(1.2, .9, .8, M.dwood, 11.3, .45, -9.4); box(.6, .6, .5, M.dark, 11.3, 1.2, -9.4); box(.12, .12, .05, B(0xff2020), 11.5, 1.35, -9.1); box(.15, .2, .15, M.white, 11.1, 1.0, -9.1); glow(11.5, 1.35, -9.0, 0xff3030, 1.2, .8);
    box(.7, 1.0, .7, M.white, 12.5, .5, -9.4); box(.6, .7, .6, M.jug, 12.5, 1.35, -9.4);
    box(1.6, 1.5, .5, M.dwood, -12.6, .75, -2.8); [.3, .75, 1.2].forEach((y, i) => [0, 1, 2, 3].forEach(k => box(.3, .35, .4, [M.red, M.blue, M.green, M.white][(i + k) % 4], -12.9, y + .2, -3.3 + k * .3)));
    box(1, .8, 1, M.dark, 12.4, .4, 1.5);

    // lights
    lamps = [];
    if (CUR.id === 'classic') {
      amb = new THREE.AmbientLight(0xffffff, CUR.ambI); sun = new THREE.DirectionalLight(0xffffff, CUR.sunI); sun.position.set(6, 12, 8); room.add(amb, sun);
    } else {
      amb = new THREE.AmbientLight(0x7a86b8, CUR.ambI); const hemi = new THREE.HemisphereLight(0xb8c4ff, 0x40304a, .8);
      sun = new THREE.DirectionalLight(0xfff0d0, CUR.sunI); sun.position.set(6, 12, 8); room.add(amb, hemi, sun);
      [[2.6, 3.2, -4.5], [8.6, 3.2, 0], [-9, 3, -6]].forEach(p => { const l = new THREE.PointLight(0xffc880, CUR.lampI, 16, 1.6); l.position.set(...p); room.add(l); lamps.push(l); });
      const gl2 = new THREE.PointLight(0x66aaff, 20, 10, 1.6); gl2.position.set(5.6, 1.8, -1.5); room.add(gl2);
      if (sh) {
        [[[8, 14, 3], [5, 0, -1], 1.0, 2.6], [[-8, 12, -2], [-9, 0, -6], .8, 2.0]].forEach(([p, tg, ang, I]) => {
          const s = new THREE.SpotLight(0xffe2b0, I, 0, ang, 1, 0); s.position.set(...p); s.target.position.set(...tg); s.castShadow = true;
          s.shadow.mapSize.set(1024, 1024); s.shadow.bias = -.0004; s.shadow.radius = 5; room.add(s, s.target);
          const c = s.shadow.camera; c.near = 4; c.far = 40;
        });
      }
    }
    // particles
    pool = []; for (let i = 0; i < 60; i++) { const m = new THREE.Mesh(UB, ps1(new THREE.MeshBasicMaterial({ color: 0xffffff }))); m.scale.setScalar(.12); m.visible = false; room.add(m); pool.push({ m, v: V(), life: 0 }); }
  }
  w.spark = (p, col = 0xffe040, n = 6, sp = 3) => { for (let i = 0; i < n; i++) { const q = pool.find(a => a.life <= 0); if (!q) return; q.life = .5 + Math.random() * .4; q.m.material.color.set(col); q.m.position.copy(p); q.m.visible = true; q.v.set((Math.random() - .5) * sp, 1.5 + Math.random() * sp, (Math.random() - .5) * sp); } };
  w.slamFx = p => {
    if (CUR.shake) { shakeA = Math.max(shakeA, .9); w.spark(p.clone().add(V(0, 1, 1)), 0xffffff, 10, 5); }
    else for (let i = 0; i < 12; i++) w.spark(p.clone().add(V((Math.random() - .5) * 2.4, .1, .6 + Math.random())), i % 2 ? 0xc8b890 : 0x9a8c70, 1, 1.4);
  };

  // screens
  const words = ['#6f6', '#8cf', '#fc6', '#f88', '#ccc'], flat = { off: '#05060a', idle: '#1a2a58', browser: '#e8ecf4', code: '#2a3050', term: '#062a10' };
  function drawScreen(d, t) {
    const x = d.ctx, W_ = 48, H_ = 30, m = d.mode, ti = Math.floor(t * 8);
    if (CUR.tex === 'none') { x.fillStyle = flat[m] || flat.code; x.fillRect(0, 0, W_, H_); x.fillStyle = m === 'term' ? '#40ff60' : m === 'browser' ? '#3a6ad8' : '#8cf'; x.fillRect(4, 6 + (ti % 6) * 3, 22, 2); }
    else if (m === 'off') { x.fillStyle = '#05060a'; x.fillRect(0, 0, W_, H_); }
    else if (m === 'idle') { x.fillStyle = '#1a2a58'; x.fillRect(0, 0, W_, H_); x.fillStyle = '#4a6ac0'; x.fillRect(2, 2, 10, 3); x.fillStyle = '#7a9ae8'; for (let i = 0; i < 4; i++) x.fillRect(3, 9 + i * 4, 18 + (i * 7) % 15, 1); if (ti % 8 < 4) x.fillRect(3, 26, 2, 2); }
    else if (m === 'browser') { x.fillStyle = '#f0f2f6'; x.fillRect(0, 0, W_, H_); x.fillStyle = '#3a6ad8'; x.fillRect(0, 0, W_, 4); x.fillStyle = '#fff'; x.fillRect(4, 1, 30, 2); x.fillStyle = '#d0a040'; x.fillRect(3, 7, 12, 9); x.fillStyle = '#404858'; for (let i = 0; i < 5; i++) { const off = ti + i; x.fillRect(18, 7 + i * 4, 10 + (off * 7) % 20, 1); x.fillRect(3, 19 + (i % 3) * 3, 8 + (off * 5) % 34, 1); } }
    else { const term = m === 'term'; x.fillStyle = term ? '#020a04' : '#141826'; x.fillRect(0, 0, W_, H_); for (let i = 0; i < 9; i++) { const n = ti + i, ww = 6 + (n * 13) % 30; x.fillStyle = term ? '#40ff60' : words[(n * 3) % 5]; x.fillRect(2 + (m === 'code' ? (n % 3) * 3 : 0), 2 + i * 3, ww, 1); } if (ti % 6 < 3) { x.fillStyle = term ? '#40ff60' : '#fff'; x.fillRect(2, 28, 3, 1); } }
    d.tex.needsUpdate = true; if (d.glow) d.glow.material.color.set(m === 'term' ? 0x50ff70 : m === 'off' ? 0x101020 : 0x6ab0ff);
  }
  let scrT = 0;

  // camera rig (orbit)
  const baseL = V(2.6, .2, -.4), Y0 = .6757, P0 = .5637, D0 = 30.66;
  const orb = { yaw: Y0, pitch: P0, zoom: 1 }; let focus = null, focK = 0, focG = 0, shakeA = 0, zoomMul = 1;
  w.orbit = orb;
  w.focus = (v, k = .5) => { focus = v ? v.clone() : focus; focG = v ? k : 0; };
  w.shake = a => { if (CUR.shake) shakeA = Math.max(shakeA, a); };
  w.setMood = m => { moodT = m; };
  w.sleep = s => new Promise(res => w.sleeps.push({ t: s, res }));
  w.onTick = f => w.ticks.push(f);
  w.addChar = o => new Char(w, o);
  { // input
    canvas.style.touchAction = 'none'; const ptrs = new Map(); let pd = 0;
    canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, [e.clientX, e.clientY]); pd = 0; });
    const up = e => ptrs.delete(e.pointerId); canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
    canvas.addEventListener('pointermove', e => {
      const p = ptrs.get(e.pointerId); if (!p) return;
      if (ptrs.size === 2) { const o = [...ptrs.entries()].find(([k]) => k !== e.pointerId)[1], d0 = Math.hypot(p[0] - o[0], p[1] - o[1]); p[0] = e.clientX; p[1] = e.clientY; const d1 = Math.hypot(p[0] - o[0], p[1] - o[1]); orb.zoom = clamp(orb.zoom * d0 / Math.max(1, d1), .4, 1.35); return; }
      orb.yaw = clamp(orb.yaw - (e.clientX - p[0]) * .006, Y0 - 1.25, Y0 + 1.25); orb.pitch = clamp(orb.pitch + (e.clientY - p[1]) * .005, .22, 1.25); p[0] = e.clientX; p[1] = e.clientY;
    });
    canvas.addEventListener('wheel', e => { e.preventDefault(); orb.zoom = clamp(orb.zoom * Math.exp(e.deltaY * .001), .4, 1.35); }, { passive: false });
  }

  const post = new THREE.ShaderMaterial({
    uniforms: { tex: { value: null }, res: { value: new THREE.Vector2(448, 252) }, dith: { value: 1 }, quant: { value: 15 }, vig: { value: .9 }, con: { value: 1 } }, depthTest: false,
    vertexShader: 'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
    fragmentShader: `varying vec2 vUv;uniform sampler2D tex;uniform vec2 res;uniform float dith,quant,vig,con;
    void main(){vec3 c=texture2D(tex,vUv).rgb;c=pow(clamp(c,0.,1.),vec3(1./2.2));vec2 p=floor(vUv*res);
    if(quant>0.){float d=fract(52.9829189*fract(dot(p,vec2(.06711056,.00583715))))-.5;c=floor(c*quant+.5+d*.75*dith)/quant;}
    c=(c-.5)*con+.5;vec2 q=vUv-.5;c*=1.-dot(q,q)*vig;c.b+=.01*dith;gl_FragColor=vec4(clamp(c,0.,1.),1.);}`,
  });
  const pscene = new THREE.Scene(), pcam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  pscene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), post));

  w.resize = () => {
    cw = Math.max(200, canvas.clientWidth || innerWidth); ch = Math.max(200, canvas.clientHeight || innerHeight);
    renderer.setSize(cw, ch, false); const a = cw / ch, dpr = Math.min(devicePixelRatio || 1, 1920 / cw);
    let [W, H] = CUR.res(cw, ch, dpr); W = Math.max(64, W); H = Math.max(64, H);
    rt && rt.dispose(); rt = new THREE.WebGLRenderTarget(W, H, { minFilter: CUR.filter, magFilter: CUR.filter, depthBuffer: true, samples: CUR.aa ? 4 : 0 });
    post.uniforms.tex.value = rt.texture; post.uniforms.res.value.set(W, H); SNAP.value = W * .3;
    const u = post.uniforms; u.dith.value = CUR.dither; u.quant.value = CUR.quant; u.vig.value = CUR.vig; u.con.value = CUR.contrast;
    cam.aspect = a; const pk = clamp((1.2 - a) / .7, 0, 1); zoomMul = 1 - pk * .5; cam.fov = 36 + pk * 22; cam.updateProjectionMatrix();
  };
  w.setStyle = id => {
    if (!STYLES[id]) return; CUR = STYLES[id]; w.style = id; renderer.shadowMap.enabled = CUR.shadows; seed = 7;
    build(); w.chars.forEach(c => c.build()); w.resize();
  };
  w.setStyle(initial); addEventListener('resize', w.resize);

  const tmp = V(); let last = performance.now(), clock = 0;
  function frame(nowMs) {
    const rdt = Math.min(.1, (nowMs - last) / 1000); last = nowMs; clock += rdt;
    const dt = rdt * w.timeScale; w.now += dt;
    for (let i = w.sleeps.length - 1; i >= 0; i--) { const s = w.sleeps[i]; s.t -= dt; if (s.t <= 0) { w.sleeps.splice(i, 1); s.res(); } }
    for (const f of w.ticks) f(dt, w.now);
    for (const c of w.chars) c.update(dt, w.now);
    for (const q of pool) if (q.life > 0) { q.life -= rdt; q.v.y -= 9 * rdt; q.m.position.addScaledVector(q.v, rdt); if (q.life <= 0) q.m.visible = false; }
    scrT -= rdt; if (scrT <= 0) { scrT = .12; for (const d of w.desks) drawScreen(d, clock); }
    mood += (moodT - mood) * Math.min(1, rdt * 2); amb.intensity = CUR.ambI * (.5 + .5 * mood); sun.intensity = CUR.sunI * (.43 + .57 * mood); lamps.forEach(l => l.intensity = CUR.lampI * (.33 + .67 * mood));
    focK += (focG - focK) * Math.min(1, rdt * 2.5); if (!focG && focK < .01) focus = null;
    const dist = D0 * zoomMul * orb.zoom, cp = Math.cos(orb.pitch);
    const look = baseL.clone(), pos = V(baseL.x + dist * Math.sin(orb.yaw) * cp, baseL.y + dist * Math.sin(orb.pitch), baseL.z + dist * Math.cos(orb.yaw) * cp);
    if (focus) { look.lerp(focus, focK); pos.lerp(V(focus.x + (pos.x - focus.x) * .5, pos.y * .75, focus.z + (pos.z - focus.z) * .5), focK); }
    shakeA *= Math.pow(.02, rdt); if (shakeA < .01) shakeA = 0;
    pos.x += (Math.random() - .5) * shakeA; pos.y += (Math.random() - .5) * shakeA;
    cam.position.copy(pos); cam.lookAt(look); cam.updateMatrixWorld();
    renderer.setRenderTarget(rt); renderer.render(scene, cam); renderer.setRenderTarget(null); renderer.render(pscene, pcam);
    for (const c of w.chars) {
      tmp.copy(c.g.position); tmp.y = 2.7 * c.s + (c.sit ? -.2 : 0) + .2; tmp.project(cam);
      const vis = tmp.z < 1; c.el.style.display = vis ? '' : 'none';
      c.el.style.transform = `translate(${(tmp.x * .5 + .5) * cw | 0}px,${(-tmp.y * .5 + .5) * ch | 0}px)`; c.el.style.zIndex = 1000 - (tmp.z * 500 | 0);
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return w;
}
