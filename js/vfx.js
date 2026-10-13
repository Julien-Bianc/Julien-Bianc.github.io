// ============================================================
//  vfx.js — Effets visuels : vrai feu, vent glacial, éclairs, éclaboussures…, impacts, K.O., secousses,
//  recul/zoom de caméra, flash d'écran et ralenti.
//  Chaque TYPE d'attaque a son style (voir trailFx / hitFx2 / muzzleFx). Pour changer l'apparence d'un type :
//  modifie sa case dans ces fonctions. Réglage de l'intensité des secousses : Options.
// ============================================================
const VP = [];                                  // particules
const FIRE = ['#ffe9a0', '#ffc040', '#ff8a20', '#e8501c', '#a83214', '#5a2418'];
const PURPLE = ['#f0e0ff', '#c8a0ff', '#9a60e8', '#6a38b8', '#3a2070'];
const FROST = ['#d8f2ff', '#b4e4ff', '#8fd0f4', '#6aaee0'];
const GL = {};
function hexA(c, a){ const n = parseInt(c.slice(1), 16); return `rgba(${n >> 16},${n >> 8 & 255},${n & 255},${a})`; }
function glow(c){
  if(GL[c]) return GL[c];
  const k = document.createElement('canvas'); k.width = k.height = 32; const x = k.getContext('2d'), g = x.createRadialGradient(16, 16, 0, 16, 16, 16);
  g.addColorStop(0, hexA(c, 1)); g.addColorStop(.4, hexA(c, .7)); g.addColorStop(1, hexA(c, 0)); x.fillStyle = g; x.fillRect(0, 0, 32, 32); return GL[c] = k;
}
let VFX_LOW = false;
function vp(o){ if(VP.length < (VFX_LOW ? 350 : 900) && !(VFX_LOW && Math.random() < .5)) VP.push(Object.assign({ x:0, y:0, vx:0, vy:0, life:.5, max:0, s:6, s1:6, col:'#fff', pal:null, g:0, fr:0, kind:'glow', rot:0, vr:0, a:1 }, o, { max:o.life })); }
const R_ = (a, b) => a + Math.random()*(b - a);
const ang2 = a => [Math.cos(a), Math.sin(a)];

function vpUpdate(dt){
  for(let i = VP.length - 1; i >= 0; i--){
    const p = VP[i]; p.life -= dt; if(p.life <= 0){ VP.splice(i, 1); continue; }
    p.vy += p.g*dt; const f = Math.max(0, 1 - p.fr*dt); p.vx *= f; p.vy *= f; p.x += p.vx*dt; p.y += p.vy*dt; p.rot += p.vr*dt;
  }
}
function drawVfx(){
  ctx.save();
  for(const p of VP){
    const u = 1 - p.life/p.max, a = p.a*Math.min(1, p.life/(p.max*.45)), s = p.s + (p.s1 - p.s)*u;
    if(p.kind === 'glow' || p.kind === 'smoke'){
      ctx.globalCompositeOperation = p.kind === 'glow' ? 'lighter' : 'source-over';
      const c = p.pal ? p.pal[Math.min(p.pal.length - 1, Math.floor(u*p.pal.length))] : p.col; ctx.globalAlpha = a; ctx.drawImage(glow(c), p.x - s, p.y - s, s*2, s*2);
    } else {
      ctx.globalCompositeOperation = (p.kind === 'spark' || p.kind === 'ring' || p.kind === 'arc' || p.kind === 'star') ? 'lighter' : 'source-over'; ctx.globalAlpha = a;
      if(p.kind === 'shard'){ ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); ctx.moveTo(0, -s); ctx.lineTo(s*.45, 0); ctx.lineTo(0, s); ctx.lineTo(-s*.45, 0); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-1, -s*.5, 2, s*.6); ctx.restore(); }
      else if(p.kind === 'leaf'){ ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(0, 0, s, s*.45, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
      else if(p.kind === 'drop'){ ctx.fillStyle = p.col; ctx.beginPath(); ctx.ellipse(p.x, p.y, s*.6, s, Math.atan2(p.vx, -p.vy) + 0, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffffffaa'; ctx.fillRect(p.x - 1, p.y - s*.6, 1.5, 1.5); }
      else if(p.kind === 'snow'){ ctx.fillStyle = p.col; ctx.fillRect(Math.round(p.x), Math.round(p.y), Math.max(2, s | 0), Math.max(2, s | 0)); }
      else if(p.kind === 'spark'){ ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx*.05, p.y - p.vy*.05); ctx.stroke(); }
      else if(p.kind === 'ring'){ ctx.strokeStyle = p.col; ctx.lineWidth = Math.max(1, 5*(1 - u)); ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.stroke(); }
      else if(p.kind === 'bubble'){ ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(p.x, p.y, s, 0, 6.283); ctx.stroke(); ctx.fillStyle = '#ffffff88'; ctx.fillRect(p.x - s*.4, p.y - s*.4, 2, 2); }
      else if(p.kind === 'star'){ ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = p.col; ctx.beginPath(); for(let i = 0; i < 8; i++){ const r = i%2 ? s*.35 : s, t = i*Math.PI/4; ctx.lineTo(Math.cos(t)*r, Math.sin(t)*r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
      else if(p.kind === 'arc'){ ctx.strokeStyle = p.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); let x = p.x, y = p.y; for(let i = 0; i < 4; i++){ x += Math.cos(p.rot)*s/4 + R_(-5, 5); y += Math.sin(p.rot)*s/4 + R_(-5, 5); ctx.lineTo(x, y); } ctx.stroke(); }
    }
  }
  // lueur des projectiles
  ctx.globalCompositeOperation = 'lighter';
  for(const b of bullets){
    const t = b.t, fl = .85 + Math.random()*.3, r = b.r*(t === 'feu' || t === 'dragon' ? 3.2 : 2.6)*fl;
    ctx.globalAlpha = .38; ctx.drawImage(glow(t === 'feu' ? '#ff8a2c' : t === 'dragon' ? '#9a60e8' : (b.col || COL[t] || '#ffffff')), b.x - r, b.y - r, r*2, r*2);
    if(t === 'feu' || t === 'dragon'){ ctx.globalAlpha = .45; const c = glow(t === 'feu' ? '#fff0a0' : '#e8d8ff'); ctx.drawImage(c, b.x - r*.5, b.y - r*.5, r, r); }
  }
  // lueur des rayons et colonnes d'éclairs
  for(const q of bm){
    const k = q.t/q.mx, c = glow(COL[q.tp] || '#ffffff'); ctx.globalAlpha = .6*k;
    if(q.col){ for(let y = q.y - 330; y < q.y; y += 20) ctx.drawImage(c, q.x - 26, y - 14, 52, 52); }
    else { for(let i = 0; i < 520; i += 22) ctx.drawImage(c, q.x + Math.cos(q.a)*i - q.w*1.6, q.y + Math.sin(q.a)*i - q.w*1.6, q.w*3.2, q.w*3.2); }
  }
  ctx.restore();
}

// ---------- traînées des projectiles (remplace gfx.js:trail) ----------
trail = function(b){
  const t = b.t, big = b.r > 7 ? 1.4 : 1, x = b.x + R_(-3, 3), y = b.y + R_(-3, 3);
  switch(t){
    case 'feu':
      vp({ x, y, vx:R_(-25, 25), vy:R_(-70, -20), life:R_(.3, .55), s:R_(5, 8)*big, s1:R_(9, 14)*big, pal:FIRE, g:-60, a:.5 });
      if(Math.random() < .5) vp({ x, y, vx:R_(-25, 25), vy:R_(-70, -20), life:R_(.3, .5), s:R_(4, 6)*big, s1:R_(7, 10)*big, pal:FIRE, a:.5 });
      if(Math.random() < .3) vp({ x, y, vx:R_(-20, 20), vy:R_(-50, -20), life:.8, s:6, s1:16, kind:'smoke', col:'#3a2a28', a:.35 });
      if(Math.random() < .25) vp({ x, y, vx:R_(-70, 70), vy:R_(-90, 10), life:.5, kind:'spark', col:'#ffd070', g:120 }); break;
    case 'dragon':
      vp({ x, y, vx:R_(-25, 25), vy:R_(-60, -10), life:R_(.3, .5), s:R_(6, 10)*big, s1:R_(11, 16), pal:PURPLE }); break;
    case 'glace':
      vp({ x, y, vx:R_(-30, 30) - b.vx*.1, vy:R_(-30, 30) - b.vy*.1, life:R_(.45, .7), s:R_(6, 9), s1:R_(14, 21), pal:FROST, a:.28 });
      if(Math.random() < .55) vp({ x, y, vx:R_(-60, 60), vy:R_(-60, 60), life:R_(.5, .8), s:R_(3, 5), s1:2, kind:'shard', col:'#bfe8ff', rot:R_(0, 6), vr:R_(-6, 6), fr:1 });
      if(Math.random() < .6) vp({ x, y, vx:R_(-50, 50) - b.vx*.15, vy:R_(-50, 50), life:R_(.4, .7), s:2, s1:2, kind:'snow', col:'#ffffff', g:30 }); break;
    case 'eau':
      vp({ x, y, vx:R_(-30, 30), vy:R_(-30, 30), life:R_(.3, .5), s:R_(4, 7)*big, s1:R_(8, 12), col:'#bfe6ff', a:.5 });
      if(Math.random() < .6) vp({ x, y, vx:R_(-60, 60), vy:R_(-90, -20), life:.5, s:R_(2.5, 4), s1:2, kind:'drop', col:'#7ec4ff', g:300 }); break;
    case 'foudre':
      vp({ x, y, vx:R_(-60, 60), vy:R_(-60, 60), life:R_(.15, .3), kind:'spark', col:'#fff6a0' });
      if(Math.random() < .4) vp({ x, y, life:.15, s:R_(14, 26), kind:'arc', col:'#ffffff', rot:R_(0, 6.28) }); break;
    case 'plante':
      if(Math.random() < .6) vp({ x, y, vx:R_(-40, 40), vy:R_(-40, 40), life:R_(.4, .7), s:R_(3, 5), s1:2, kind:'leaf', col:Math.random() < .5 ? '#7ccf58' : '#b4f088', rot:R_(0, 6), vr:R_(-8, 8), fr:1 }); break;
    case 'poison':
      if(Math.random() < .5) vp({ x, y, vx:R_(-25, 25), vy:R_(-50, -10), life:R_(.5, .9), s:R_(2, 4), s1:R_(5, 8), kind:'bubble', col:'#c070e0' }); break;
    case 'tenebres':
      vp({ x, y, vx:R_(-20, 20), vy:R_(-20, 20), life:R_(.4, .6), s:R_(6, 9), s1:R_(14, 20), kind:'smoke', col:'#4a2a78', a:.5 }); break;
    case 'acier':
      vp({ x, y, life:.2, s:R_(5, 8), s1:2, col:'#e8eefc' }); if(Math.random() < .5) vp({ x, y, vx:R_(-90, 90), vy:R_(-90, 90), life:.3, kind:'spark', col:'#ffffff' }); break;
    case 'vol':
      vp({ x, y, vx:-b.vx*.2, vy:-b.vy*.2, life:.25, kind:'spark', col:'#e8f0ff' }); break;
    default:
      vp({ x, y, vx:R_(-30, 30), vy:R_(-30, 30), life:R_(.2, .4), s:R_(4, 7), s1:2, col:b.col || COL[t] || '#fff', a:.7 });
  }
};

// ---------- impacts (appelé à chaque coup reçu) ----------
function burst(n, fn){ for(let i = 0; i < n; i++) fn(i, Math.random()*6.283); }
function hitFx2(x, y, tp, d, en, ov){
  const k = Math.min(2.2, .7 + d/22), N = n => Math.round(n*k), col = ov || COL[tp] || '#fff';
  if(ov){ burst(N(12), (i, a) => vp({ x, y, vx:Math.cos(a)*R_(60, 200), vy:Math.sin(a)*R_(60, 200), life:.5, s:R_(7, 11), s1:2, kind:'star', col:ov, rot:a, vr:6 })); vp({ x, y, life:.4, s:6, s1:52*k, kind:'ring', col:ov }); vp({ x, y, life:.2, s:14*k, s1:34*k, col:ov, a:.9 }); kick(Math.min(4, 1 + d/14), en); return; }
  const ring = (c, s) => vp({ x, y, life:.4, s:6, s1:s*k, kind:'ring', col:c });
  switch(tp){
    case 'feu':
      burst(N(14), (i, a) => { const [cx, cy] = ang2(a), v = R_(50, 190); vp({ x, y, vx:cx*v, vy:cy*v - 40, life:R_(.4, .8), s:R_(7, 11), s1:R_(12, 19), pal:FIRE, g:-80, fr:2, a:.7 }); });
      burst(N(6), () => vp({ x, y, vx:R_(-40, 40), vy:R_(-90, -30), life:1, s:8, s1:22, kind:'smoke', col:'#3a2a28', a:.4 }));
      burst(N(10), (i, a) => { const [cx, cy] = ang2(a); vp({ x, y, vx:cx*R_(90, 240), vy:cy*R_(90, 240), life:.6, kind:'spark', col:'#ffd070', g:200 }); }); ring('#ff9a3c', 46); break;
    case 'dragon':
      burst(N(12), (i, a) => { const [cx, cy] = ang2(a), v = R_(50, 170); vp({ x, y, vx:cx*v, vy:cy*v, life:R_(.4, .7), s:R_(8, 12), s1:R_(14, 20), pal:PURPLE, fr:2 }); }); ring('#9a60e8', 46); break;
    case 'glace':
      burst(N(16), (i, a) => { const [cx, cy] = ang2(a), v = R_(60, 220); vp({ x, y, vx:cx*v, vy:cy*v, life:R_(.5, .9), s:R_(5, 9), s1:2, kind:'shard', col:Math.random() < .5 ? '#e8f9ff' : '#8fd4f6', rot:a, vr:R_(-8, 8), fr:1.5 }); });
      burst(N(5), () => vp({ x, y, vx:R_(-70, 70), vy:R_(-70, 70), life:.9, s:12, s1:28, pal:FROST, a:.32, fr:2 }));
      burst(N(12), () => vp({ x, y, vx:R_(-90, 90), vy:R_(-90, 90), life:.8, s:2, s1:2, kind:'snow', col:'#fff', g:40 })); ring('#bfe8ff', 50); break;
    case 'eau':
      burst(N(18), (i, a) => { const [cx, cy] = ang2(a), v = R_(70, 210); vp({ x, y, vx:cx*v, vy:cy*v - 60, life:R_(.5, .8), s:R_(3, 5), s1:2, kind:'drop', col:Math.random() < .5 ? '#7ec4ff' : '#bfe6ff', g:380 }); });
      vp({ x, y, life:.35, s:8, s1:34, kind:'ring', col:'#bfe6ff' }); ring('#7ec4ff', 52); break;
    case 'foudre':
      burst(N(10), (i, a) => { const [cx, cy] = ang2(a); vp({ x, y, vx:cx*R_(120, 300), vy:cy*R_(120, 300), life:R_(.2, .4), kind:'spark', col:'#fff6a0' }); });
      burst(N(4), (i, a) => vp({ x, y, life:.25, s:R_(30, 56), kind:'arc', col:'#ffffff', rot:a })); vp({ x, y, life:.2, s:26*k, s1:40*k, col:'#fff6a0' }); ring('#ffe24a', 44); break;
    case 'plante':
      burst(N(14), (i, a) => { const [cx, cy] = ang2(a), v = R_(50, 170); vp({ x, y, vx:cx*v, vy:cy*v, life:R_(.5, .9), s:R_(4, 6), s1:3, kind:'leaf', col:Math.random() < .5 ? '#7ccf58' : '#b4f088', rot:a, vr:R_(-10, 10), fr:1.5 }); }); ring('#9ad070', 40); break;
    case 'poison':
      burst(N(10), (i, a) => { const [cx, cy] = ang2(a), v = R_(30, 110); vp({ x, y, vx:cx*v, vy:cy*v - 30, life:R_(.6, 1), s:R_(3, 6), s1:R_(8, 12), kind:'bubble', col:'#c070e0', fr:1.5 }); }); ring('#a050c0', 40); break;
    case 'tenebres':
      burst(N(9), (i, a) => { const [cx, cy] = ang2(a), v = R_(40, 130); vp({ x, y, vx:cx*v, vy:cy*v, life:R_(.5, .9), s:R_(10, 16), s1:R_(20, 30), kind:'smoke', col:'#4a2a78', a:.6, fr:2 }); }); ring('#c8a0ff', 48); break;
    case 'acier':
      burst(N(14), (i, a) => { const [cx, cy] = ang2(a); vp({ x, y, vx:cx*R_(100, 280), vy:cy*R_(100, 280), life:.4, kind:'spark', col:'#ffffff', g:100 }); }); vp({ x, y, life:.18, s:18*k, s1:34*k, col:'#e8eefc' }); ring('#b8b8d0', 46); break;
    case 'vol':
      for(let i = 0; i < 3; i++) vp({ x, y, life:.4 + i*.08, s:10 + i*4, s1:50 + i*16, kind:'ring', col:'#e8f0ff' }); break;
    case 'combat':
      vp({ x, y, life:.4, s:10, s1:60*k, kind:'ring', col:'#ffb090' });
      burst(N(8), (i, a) => vp({ x, y, life:.45, s:R_(10, 16), s1:2, kind:'star', col:'#ffe0c0', rot:a, vr:6, vx:Math.cos(a)*R_(60, 160), vy:Math.sin(a)*R_(60, 160) })); break;
    default:
      burst(N(8), (i, a) => vp({ x, y, life:.45, s:R_(7, 12), s1:2, kind:'star', col:col, rot:a, vr:6, vx:Math.cos(a)*R_(60, 170), vy:Math.sin(a)*R_(60, 170) })); ring('#ffffff', 44);
  }
  vp({ x, y, life:.14, s:14*k, s1:30*k, col:'#ffffff', a:.9 });
  kick(Math.min(4, 1 + d/14), en);
}
const _hitFxV = hitFx;
hitFx = function(x, y, d, m, en, tp, col){ _hitFxV(x, y, d, m, en, tp, col); hitFx2(x, y, tp || (en ? G.p.t : G.e.t), d, en, col); playSfx('hit:' + (tp || 'normal'), Math.min(1.6, .7 + d/25)); };

// ---------- départ d'une attaque (flamme, givre… devant le lanceur) ----------
const _castV = cast;
cast = function(s, d, m, c, own, sc, ang){
  const r = _castV(s, d, m, c, own, sc, ang), tp = m.tp || s.t, a = ang ?? Math.atan2(d.y - s.y, d.x - s.x), mx = s.x + Math.cos(a)*22, my = s.y + Math.sin(a)*22;
  if(tp === 'feu') burst(8, () => vp({ x:mx, y:my, vx:Math.cos(a)*R_(40, 140) + R_(-30, 30), vy:Math.sin(a)*R_(40, 140) + R_(-30, 30), life:R_(.25, .45), s:R_(7, 11), s1:R_(12, 18), pal:FIRE }));
  else if(tp === 'glace') burst(8, () => vp({ x:mx, y:my, vx:Math.cos(a)*R_(60, 190) + R_(-40, 40), vy:Math.sin(a)*R_(60, 190) + R_(-40, 40), life:R_(.4, .7), s:R_(8, 12), s1:R_(16, 22), pal:FROST, a:.35 }));
  else if(tp === 'eau') burst(5, () => vp({ x:mx, y:my, vx:Math.cos(a)*R_(60, 150), vy:Math.sin(a)*R_(60, 150) - 30, life:.4, s:3, s1:2, kind:'drop', col:'#7ec4ff', g:300 }));
  else if(tp === 'foudre') burst(4, (i, q) => vp({ x:mx, y:my, life:.2, s:R_(20, 34), kind:'arc', col:'#fff', rot:q }));
  else vp({ x:mx, y:my, life:.2, s:12, s1:26, col:COL[tp] || '#fff', a:.8 });
  playSfx('cast:' + tp, m.d > 15 ? 1.3 : 1);
  return r;
};

// ---------- K.O. ----------
const KOFX = [];
function onKO(o, en){
  slowmo(.45, .7); HS = Math.max(HS, .12); G.shake = Math.max(G.shake, .5); ZOOM.k = .05; flashScreen(.4); kick(5, en);
  const col = COL[o.t] || '#fff';
  burst(26, (i, a) => vp({ x:o.x, y:o.y, vx:Math.cos(a)*R_(80, 300), vy:Math.sin(a)*R_(80, 300), life:R_(.6, 1.1), s:R_(8, 14), s1:2, kind:'star', col:i%2 ? '#ffe070' : col, rot:a, vr:R_(-8, 8), fr:1.5 }));
  for(let i = 0; i < 3; i++) vp({ x:o.x, y:o.y, life:.5 + i*.15, s:10, s1:90 + i*30, kind:'ring', col:i ? col : '#fff' });
  burst(12, () => vp({ x:o.x + R_(-14, 14), y:o.y, vx:R_(-20, 20), vy:R_(-120, -50), life:1.3, s:7, s1:3, col:'#ffffff', a:.8 }));    // petites âmes qui montent
  KOFX.push({ t0:performance.now(), name:NAME[o.t] || '?', en });
  playSfx('ko');
}
const _hEK = hurtE; hurtE = function(d, b){ const e = G.e, r = _hEK(d, b); if(r && e.hp <= 0) onKO(e, true); return r; };
const _hPK = hurtP; hurtP = function(d, b){ const p = G.p, r = _hPK(d, b); if(r && p.hp <= 0) onKO(p, false); return r; };

// ---------- caméra : recul, zoom, flash, ralenti ----------
const KICK = { x:0, y:0 }, ZOOM = { k:0 }, FLASH = { a:0 }, SLOW = { k:1, t0:0, dur:0 };
function kick(s, en){ const a = Math.random()*6.283, f = Settings.get().shake; KICK.x += Math.cos(a)*s*f; KICK.y += Math.sin(a)*s*f; }
function slowmo(k, dur){ SLOW.k = k; SLOW.t0 = performance.now(); SLOW.dur = dur*1000; }
function flashScreen(a){ FLASH.a = Math.max(FLASH.a, a); }
function timeScale(){ const u = (performance.now() - SLOW.t0)/SLOW.dur; return u >= 1 ? 1 : SLOW.k + (1 - SLOW.k)*u*u; }
function applyZoom(){
  const f = Settings.get().shake, z = 1 + ZOOM.k*f;
  ctx.translate(Math.round(KICK.x), Math.round(KICK.y));
  if(z !== 1){ ctx.translate(VW/2, VH/2); ctx.scale(z, z); ctx.translate(-VW/2, -VH/2); }
}
function drawScreenFx(){
  const n = performance.now();
  if(FLASH.a > .01){ ctx.fillStyle = `rgba(255,255,255,${FLASH.a})`; ctx.fillRect(-20, -20, VW + 40, VH + 40); }
  for(let i = KOFX.length - 1; i >= 0; i--){
    const f = KOFX[i], t = (n - f.t0)/1000; if(t > 1.8){ KOFX.splice(i, 1); continue; }
    const al = t > 1.4 ? 1 - (t - 1.4)/.4 : 1, slam = t < .14 ? 4.2 - 3.2*(t/.14) : 1 + Math.max(0, .1*Math.sin((t - .14)*18)*(1 - t/1.2));
    const jx = t < .5 ? (Math.random() - .5)*10*(1 - t*2) : 0, jy = t < .5 ? (Math.random() - .5)*8*(1 - t*2) : 0;
    ctx.save(); ctx.globalAlpha = Math.max(0, al);
    // voile rouge sang qui pulse sur les bords
    const g = ctx.createRadialGradient(VW/2, VH/2, VH*.25, VW/2, VH/2, VW*.65); g.addColorStop(0, 'rgba(120,0,0,0)'); g.addColorStop(1, `rgba(150,0,0,${.55*al})`); ctx.fillStyle = g; ctx.fillRect(-20, -20, VW + 40, VH + 40);
    // bande noire en diagonale + traits d'impact
    ctx.translate(VW/2 + jx, VH*.42 + jy); ctx.rotate(-.1); ctx.fillStyle = 'rgba(8,4,10,.82)'; ctx.fillRect(-VW, -34, VW*2, 78);
    ctx.strokeStyle = '#d4141c'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-VW, -34); ctx.lineTo(VW, -34); ctx.moveTo(-VW, 44); ctx.lineTo(VW, 44); ctx.stroke();
    for(let k = 0; k < 14; k++){ const a = k*.4 + .2, r0 = 70 + (k%3)*14, r1 = r0 + 40*Math.min(1, t*6); ctx.strokeStyle = k%2 ? '#ffffff' : '#d4141c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*r0*2.2, Math.sin(a)*r0*.7); ctx.lineTo(Math.cos(a)*r1*2.2, Math.sin(a)*r1*.7); ctx.stroke(); }
    ctx.scale(slam, slam); ctx.transform(1, 0, -.18, 1, 0, 0);                                    // lettres penchées, écrasantes
    ctx.font = '900 84px Impact, Haettenschweiler, "Arial Black", "Franklin Gothic Heavy", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'miter'; ctx.miterLimit = 3;
    ctx.strokeStyle = '#000'; ctx.lineWidth = 16; ctx.strokeText('K.O.', 4, 7);
    ctx.strokeStyle = '#d4141c'; ctx.lineWidth = 9; ctx.strokeText('K.O.', 0, 0);
    const gr = ctx.createLinearGradient(0, -36, 0, 36); gr.addColorStop(0, '#ffffff'); gr.addColorStop(.55, '#ffe9a0'); gr.addColorStop(1, '#ff9a3c'); ctx.fillStyle = gr; ctx.fillText('K.O.', 0, 0);
    ctx.restore();
    ctx.save(); ctx.globalAlpha = Math.max(0, al)*Math.min(1, t*6); ctx.translate(VW/2, VH*.42 + 62); ctx.rotate(-.1);
    ctx.font = '900 14px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#d4141c'; ctx.fillText((f.name + ' — HORS COMBAT').toUpperCase(), 0, 0); ctx.restore();
  }
}
// décroissance (appelée à chaque image de jeu)
const _stepV = step;
step = function(dt){
  _stepV(dt); vpUpdate(dt);
  const f = Math.pow(.0009, dt); KICK.x *= f; KICK.y *= f; ZOOM.k *= Math.pow(.02, dt); FLASH.a *= Math.pow(.004, dt);
};
const _dbV = drawBullets; drawBullets = function(){ _dbV(); drawVfx(); };
// on vide les effets quand un combat commence
const _startV = start; start = function(cfg){ VP.length = 0; KOFX.length = 0; KICK.x = KICK.y = 0; ZOOM.k = 0; FLASH.a = 0; _startV(cfg); };
