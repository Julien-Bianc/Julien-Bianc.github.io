// ============================================================
//  moves-plus.js — NOUVEAUX TYPES D'ATTAQUE (v0.09) + réglages des anciens kinds.
//  Tout se règle dans data/pokemon*.js (champ `kind` + paramètres). Voir README.md → « v0.09 ».
//
//   kind        effet                                              paramètres
//   'blink'     téléportation (Téléport, Ombre Portée)             range, behind, radius, delay, invuln, effect, after:{dmg,time}
//   'burrow'    creuse sous terre puis surgit (Tunnel)             time, speed, radius, anim (sortie)
//   'shield'    bulle qui bloque tout / renvoie les projectiles    time, radius, reflect
//   'trap'      pièges posés au sol (Pics Toxik)                   count, spacing, radius, duration, status
//   'buff'      bonus temporaire (Danse-Lames)                     time, dmg (x), speed (x), label
//   'boomerang' lame qui part puis revient (Plaie-Croix)           range, speed, radius
//   'pulse'     onde en anneau / en arc (Vibrobscur)               range, speed, width, arc (demi-angle), knockback, status
//   'stream'    jet continu qui se courbe (Hydrocanon)             time, length, width, tick, sweep (rotation/s)
//  Anciens kinds, maintenant réglables :
//   'strike'    zones retardées : count, pattern ('single'|'line'|'random'), radius, delay, gap, start, stagger, spread,
//               look ('implode' psy | 'pillar' roche | 'meteor' chute de météores | 'bolt' foudre), share, exhaust, status
//   'beam'      rayon : width, length, delay (rayon chargé), status           (+ nouveau rendu pour TOUS les rayons)
//   'wave'      projectile ondulant : count, amp, radius, life, speed
//   'meteor'    boule qui explose : radius, life, split (nb d'éclats), splitShare, splitSpeed, color, look ('moon')
//  Pour un `fan` : look:'ghost' (Ball'Ombre avec un visage) ou look:'moon'.
// ============================================================
const clX = x => Math.max(30, Math.min(W - 30, x)), clY = y => Math.max(44, Math.min(H - 34, y));
const foeOf = own => own ? G.e : G.p, selfOf = own => own ? G.p : G.e;
const hurtSide = (own, dm, b) => own ? hurtE(dm, b) : hurtP(dm, b);
const dmgOf = (m, c, sc) => m.d * (1 + c*.9) * sc;
const busy = o => !!(o && (o.bur || o.strm || o.bl));
const visible = o => o && o.hp > 0 && !o.hid && !o.fl;
const ease = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
function setInv(o, own, t){ if(own) o.inv = Math.max(o.inv || 0, t); else o.invT = Math.max(o.invT || 0, G.time + t); }

const TRAPS = [], BOOMS = [], PULSES = [], ZONES = [], BEAMS = [], AFTER = [];

// ============================================================ lancement
function castPlus(s, d, m, c, own, sc, ang){
  const O = m.opt || {}, k = m.k;
  if(PLUS_KINDS.includes(k) && busy(s)) return;
  const a = ang ?? Math.atan2(d.y - s.y, d.x - s.x);
  if(O.anim && k !== 'blink' && k !== 'burrow') s.ann = { an:O.anim, t0:G.time };
  switch(k){
    case 'blink':     return blink(s, d, m, c, own, sc, a);
    case 'burrow':    return burrow(s, d, m, c, own, sc, a);
    case 'shield':    s.shd = { t0:G.time, dur:(O.time || 1.2)*(1 + c*.3), R:O.radius || 34, reflect:!!O.reflect, col:lcol(m.tp) };
                      groundRing(s.x, s.y + 10, 10, 60, lcol(m.tp), .4, 3); return;
    case 'trap':      return trap(s, d, m, c, own, sc, a);
    case 'buff':      return buff(s, m, c, own);
    case 'boomerang': return boomer(s, m, c, own, sc, a);
    case 'pulse':     return pulse(s, m, c, own, sc, a);
    case 'stream':    return stream(s, m, c, own, sc, a);
    case 'strike':    if(O.look || O.pattern || O.count) return strike2(s, d, m, c, own, sc, a); return false;
    case 'beam':      return beam2(s, m, c, own, sc, a);
    case 'wave':      if(O.amp || O.count) return wave2(s, m, c, own, sc, a); return false;
    case 'meteor':    if(O.split) return meteor2(s, m, c, own, sc, a); return false;
  }
  if(m.k === 'fan' || O.look) return false;
  return false;
}
// Ball'Ombre / Pouvoir Lunaire en 'fan' : on marque les projectiles pour leur dessin
const _fanP = fan;
fan = function(s, d, m, c, own, sc, ang){ const n0 = bullets.length; _fanP(s, d, m, c, own, sc, ang); if(m.fan.look) for(let i = n0; i < bullets.length; i++) bullets[i].look = m.fan.look; };

// ============================================================ TÉLÉPORTATION
function blink(s, d, m, c, own, sc, a){
  const O = m.opt, tg = foeOf(own), rng = (O.range || 260)*(1 + c*.3);
  let ex, ey;
  if(!O.behind && (d === tg || !own)){                        // appui simple (ou ennemi) : téléportation d'esquive, de côté
    const away = Math.atan2(s.y - tg.y, s.x - tg.x) + (Math.random() < .5 ? -1 : 1)*R_(.6, 1.2);
    ex = s.x + Math.cos(away)*rng*.8; ey = s.y + Math.sin(away)*rng*.8;
  } else {
    const dist = Math.min(rng, Math.hypot(d.x - s.x, d.y - s.y) || rng);
    ex = s.x + Math.cos(a)*dist; ey = s.y + Math.sin(a)*dist;
    if(O.behind && tg.hp > 0){                                // la cible est sur la trajectoire : on réapparaît DERRIÈRE elle
      const ux = Math.cos(a), uy = Math.sin(a), al = (tg.x - s.x)*ux + (tg.y - s.y)*uy, pp = Math.abs(-(tg.x - s.x)*uy + (tg.y - s.y)*ux);
      if(al > 0 && al < rng + 70 && pp < tg.r + 46){ ex = tg.x + ux*(tg.r + 30); ey = tg.y + uy*(tg.r + 30); }
    }
  }
  ex = clX(ex); ey = clY(ey);
  const look = O.look || m.tp, col = lcol(m.tp);
  if(SPR[s.t]) AFTER.push({ img:mon(s, !own), x:s.x, y:s.y, k:s.boss ? 3 : 2, t0:G.time, dur:.45, col });
  s.bl = { t0:G.time, dur:O.delay ?? .15, sx:s.x, sy:s.y, ex, ey, m, c, sc, own, look, col, done:0 };
  s.hid = true; s.rs = null;
  departFx(s.x, s.y, look, col);
}
function departFx(x, y, look, col){
  if(look === 'shadow' || look === 'spectre'){
    groundDisc(x, y + 10, 6, 34, '#1a0830', .5);
    burst(14, (i, a) => vp({ x, y, vx:Math.cos(a)*R_(30, 120), vy:Math.sin(a)*R_(20, 60) - 30, life:R_(.4, .7), s:R_(8, 12), s1:R_(16, 24), kind:'smoke', col:'#2a1048', a:.7, fr:2 }));
  } else {
    for(let i = 0; i < 3; i++) vp({ x, y, life:.3 + i*.08, s:30 - i*6, s1:2, kind:'ring', col });
    burst(12, (i, a) => vp({ x:x + Math.cos(a)*30, y:y + Math.sin(a)*24, vx:-Math.cos(a)*90, vy:-Math.sin(a)*90, life:.35, s:3, s1:1, kind:'star', col:'#ffffff', rot:a }));
  }
  addLight(x, y, 80, col, .3, .55);
}
function updBlink(s, own){
  const B = s.bl, t = G.time - B.t0, u = Math.min(1, t/B.dur);
  s.x = B.sx + (B.ex - B.sx)*u; s.y = B.sy + (B.ey - B.sy)*u; setInv(s, own, .1);
  if(B.look === 'shadow' && Math.random() < .8) vp({ x:s.x + R_(-8, 8), y:s.y + 8, vx:R_(-20, 20), vy:R_(-30, -5), life:.4, s:10, s1:18, kind:'smoke', col:'#2a1048', a:.6 });
  if(t < B.dur) return;
  const O = B.m.opt; s.bl = null; s.hid = false; s.x = B.ex; s.y = B.ey;
  s.ann = { an:O.anim || 'Attack', t0:G.time }; setInv(s, own, O.invuln ?? .25);
  departFx(s.x, s.y, B.look, B.col);
  if(O.after) s.buf = { until:G.time + (O.after.time || 1.5), dmg:O.after.dmg || 1.3, once:true, col:B.col, t0:G.time };
  if(B.m.d > 0){
    const tg = foeOf(own);
    if(visible(tg) && Math.hypot(tg.x - s.x, tg.y - s.y) < (O.radius || 46) + tg.r){
      const a = Math.atan2(tg.y - s.y, tg.x - s.x);
      sfx.push({ x:tg.x, y:tg.y, k:O.effect || 'shadow', tp:B.m.tp, born:performance.now(), dur:320, a });
      hurtSide(own, dmgOf(B.m, B.c, B.sc), { t:B.m.tp, k:'melee', own, status:O.status });
    } else dmgTxt(s.x, s.y - 50, 'RATÉ', '#c8c8d0');
  }
}

// ============================================================ TUNNEL
function burrow(s, d, m, c, own, sc, a){
  const O = m.opt;
  s.bur = { t0:G.time, dur:O.time || 1.1, tx:clX(d.x), ty:clY(d.y), sp:O.speed || 300, m, c, sc, own, R:(O.radius || 50)*(1 + c*.3), cx:s.x, cy:s.y };
  s.hid = true; s.rs = null;
  crater(s.x, s.y + 6, 14, '#5a4028'); G.shake = Math.max(G.shake, .15);
  dirt(s.x, s.y, 16, 160); groundDisc(s.x, s.y + 8, 6, 30, '#6a5038', .5);
}
function dirt(x, y, n, v){ burst(n, (i, a) => vp({ x, y:y + 6, vx:Math.cos(a)*R_(30, v), vy:R_(-v*1.2, -30), life:R_(.4, .8), s:R_(2, 4), s1:2, kind:'snow', col:i%3 ? '#7a5a38' : '#b08a58', g:520 })); }
function updBurrow(s, own, dt){
  const B = s.bur, t = G.time - B.t0;
  setInv(s, own, .1);
  const dx = B.tx - s.x, dy = B.ty - s.y, dd = Math.hypot(dx, dy), st = Math.min(dd, B.sp*dt);
  if(dd > 2){ s.x = clX(s.x + dx/dd*st); s.y = clY(s.y + dy/dd*st); }
  if(Math.random() < .7) dirt(s.x, s.y, 1, 70);
  if(Math.hypot(s.x - B.cx, s.y - B.cy) > 12){                // fissures laissées dans le sol (calque des traces)
    const tr = TR.getContext('2d'); tr.strokeStyle = 'rgba(40,24,10,.45)'; tr.lineWidth = 2; tr.beginPath(); tr.moveTo(B.cx, B.cy + 8);
    tr.lineTo((B.cx + s.x)/2 + R_(-4, 4), (B.cy + s.y)/2 + 8 + R_(-3, 3)); tr.lineTo(s.x, s.y + 8); tr.stroke(); B.cx = s.x; B.cy = s.y;
  }
  if(t < B.dur) return;
  const O = B.m.opt; s.bur = null; s.hid = false; s.ann = { an:O.anim || 'RearUp', t0:G.time }; setInv(s, own, .3);
  crater(s.x, s.y + 6, B.R*.45, '#5a4028'); G.shake = Math.max(G.shake, .45); HS = Math.max(HS, .05);
  dirt(s.x, s.y, 34, 260); groundRing(s.x, s.y + 8, 10, B.R*1.6, '#e8d0a0', .5, 4); groundDisc(s.x, s.y + 8, 10, B.R, '#8a6a48', .7);
  for(let i = 0; i < 6; i++){ const a = i*1.047 + R_(-.3, .3); ROCKFX.push({ x:s.x + Math.cos(a)*B.R*.5, y:s.y + Math.sin(a)*B.R*.35, t:0, dur:.5, h:R_(14, 26), w:R_(6, 10), seed:Math.random() }); }
  addLight(s.x, s.y, 110, '#ffcc80', .35, .6);
  const tg = foeOf(own);
  if(visible(tg) && Math.hypot(tg.x - s.x, tg.y - s.y) < B.R + tg.r){
    const ko = hurtSide(own, dmgOf(B.m, B.c, B.sc), { t:B.m.tp, k:'burrow', own });
    if(!ko){ const a = Math.atan2(tg.y - s.y, tg.x - s.x); tg.x = clX(tg.x + Math.cos(a)*40); tg.y = clY(tg.y + Math.sin(a)*40); }
  }
}
const ROCKFX = [];      // pointes de roche qui jaillissent (Tunnel, Lame de Roc)

// ============================================================ PIÈGES
function trap(s, d, m, c, own, sc, a){
  const O = m.opt, n = (O.count || 3) + (c > .5 ? 1 : 0), sp = O.spacing || 36, cx = clX(d.x), cy = clY(d.y), dm = dmgOf(m, c, sc);
  for(let i = 0; i < n; i++){
    const q = a + i*6.283/n, r = n > 1 ? sp : 0;
    TRAPS.push({ sx:s.x, sy:s.y, x:clX(cx + Math.cos(q)*r), y:clY(cy + Math.sin(q)*r*.7), arm:.45 + i*.05, a0:.45 + i*.05, t:O.duration || 8, R:O.radius || 16, dm, own, tp:m.tp, status:O.status, col:lcol(m.tp), ph:Math.random()*6 });
  }
  const mine = TRAPS.filter(q => q.own === own); while(mine.length > 9){ TRAPS.splice(TRAPS.indexOf(mine.shift()), 1); }
}
function updTraps(dt){
  for(let i = TRAPS.length - 1; i >= 0; i--){
    const q = TRAPS[i];
    if(q.arm > 0){ q.arm -= dt; if(q.arm <= 0){ groundRing(q.x, q.y, 4, 22, q.col, .3, 2); } continue; }
    q.t -= dt; if(q.t <= 0){ TRAPS.splice(i, 1); continue; }
    const tg = foeOf(q.own);
    if(visible(tg) && Math.hypot(tg.x - q.x, tg.y - q.y) < q.R + tg.r*.6){
      TRAPS.splice(i, 1);
      burst(12, (j, a) => vp({ x:q.x, y:q.y, vx:Math.cos(a)*R_(40, 140), vy:Math.sin(a)*R_(40, 140) - 40, life:R_(.4, .7), s:R_(3, 5), s1:R_(6, 9), kind:'bubble', col:q.col }));
      if(hurtSide(q.own, q.dm, { t:q.tp, k:'trap', own:q.own, status:q.status })) return;
    }
  }
}

// ============================================================ BONUS (Danse-Lames)
function buff(s, m, c, own){
  const O = m.opt, t = (O.time || 6)*(1 + c*.3), col = lcol(m.tp === 'normal' ? 'combat' : m.tp);
  s.buf = { until:G.time + t, dmg:O.dmg || 1.5, col, t0:G.time };
  if(own && O.speed){ s.boost = G.time + t; s.boostK = O.speed; }
  dmgTxt(s.x, s.y - 60, O.label || 'ATTAQUE +' + Math.round(((O.dmg || 1.5) - 1)*100) + ' % !', '#ffb070');
  addLight(s.x, s.y, 120, col, .5, .6); groundRing(s.x, s.y + 10, 8, 70, col, .5, 3);
}

// ============================================================ BOOMERANG
function boomer(s, m, c, own, sc, a){
  const O = m.opt;
  BOOMS.push({ x:s.x + Math.cos(a)*16, y:s.y + Math.sin(a)*16, a, sp:O.speed || 440, R:(O.radius || 12)*(1 + c*.3), out:(O.range || 240)*(1 + c*.3), dist:0, back:0,
    own, dm:dmgOf(m, c, sc), tp:m.tp, h1:0, h2:0, t:0, spin:0, col:lcol(m.tp), tr:[] });
}
function updBooms(dt){
  for(let i = BOOMS.length - 1; i >= 0; i--){
    const b = BOOMS[i]; b.t += dt; b.spin += dt*26;
    b.tr.unshift([b.x, b.y]); if(b.tr.length > 7) b.tr.pop();
    if(!b.back){ const v = b.sp*(1 - .45*b.dist/b.out); b.x += Math.cos(b.a)*v*dt; b.y += Math.sin(b.a)*v*dt; b.dist += v*dt; if(b.dist >= b.out){ b.back = 1; } }
    else { const o = selfOf(b.own), a = Math.atan2(o.y - b.y, o.x - b.x), v = b.sp*Math.min(1.3, .4 + b.t*.7); b.x += Math.cos(a)*v*dt; b.y += Math.sin(a)*v*dt;
      if(Math.hypot(o.x - b.x, o.y - b.y) < 22 || b.t > 3.5){ BOOMS.splice(i, 1); vp({ x:b.x, y:b.y, life:.25, s:6, s1:26, kind:'ring', col:b.col }); continue; } }
    if(b.x < -40 || b.x > W + 40 || b.y < -40 || b.y > H + 40){ b.back = 1; }
    const tg = foeOf(b.own);
    if(visible(tg) && Math.hypot(tg.x - b.x, tg.y - b.y) < b.R + tg.r && !(b.back ? b.h2 : b.h1)){
      if(b.back) b.h2 = 1; else b.h1 = 1;
      sfx.push({ x:tg.x, y:tg.y, k:'xslash', tp:b.tp, born:performance.now(), dur:260, a:0 });
      if(hurtSide(b.own, b.dm*(b.back ? .7 : 1), { t:b.tp, k:'boomerang', own:b.own })) return;
    }
  }
}

// ============================================================ ONDE (Vibrobscur)
function pulse(s, m, c, own, sc, a){
  const O = m.opt;
  PULSES.push({ x:s.x, y:s.y, a, arc:O.arc ?? Math.PI, R:14, max:(O.range || 260)*(1 + c*.25), sp:O.speed || 440, w:(O.width || 24)*(1 + c*.3),
    dm:dmgOf(m, c, sc), own, tp:m.tp, hit:0, kb:O.knockback || 0, status:O.status, col:lcol(m.tp), t:0, faces:[0, 1, 2, 3, 4, 5].map(() => R_(-1, 1)) });
  G.shake = Math.max(G.shake, .15);
}
const angIn = (q, x, y, r) => { if(q.arc >= 3.1) return true; const d = Math.hypot(x - q.x, y - q.y); let da = Math.atan2(y - q.y, x - q.x) - q.a; da = Math.atan2(Math.sin(da), Math.cos(da)); return Math.abs(da) < q.arc + Math.atan2(r, Math.max(d, 1)); };
function updPulses(dt){
  for(let i = PULSES.length - 1; i >= 0; i--){
    const q = PULSES[i]; q.t += dt; q.R += q.sp*dt*(1 - .35*q.R/q.max);
    if(q.R >= q.max){ PULSES.splice(i, 1); continue; }
    const tg = foeOf(q.own);
    if(!q.hit && visible(tg)){
      const dd = Math.hypot(tg.x - q.x, tg.y - q.y);
      if(Math.abs(dd - q.R) < q.w/2 + tg.r*.8 && angIn(q, tg.x, tg.y, tg.r)){
        q.hit = 1; const ko = hurtSide(q.own, q.dm, { t:q.tp, k:'pulse', own:q.own, status:q.status });
        if(ko) return;
        if(q.kb){ const a = Math.atan2(tg.y - q.y, tg.x - q.x); tg.x = clX(tg.x + Math.cos(a)*q.kb); tg.y = clY(tg.y + Math.sin(a)*q.kb); }
      }
    }
  }
}

// ============================================================ JET CONTINU (Hydrocanon)
const JET_V = 1100;                      // vitesse de l'eau (px/s) : plus petit = jet plus « souple »
function stream(s, m, c, own, sc, a){
  const O = m.opt, dur = (O.time || .9)*(1 + c*.4), tick = O.tick || .1;
  s.strm = { t0:G.time, dur, L:(O.length || 300)*(1 + c*.2), w:(O.width || 18)*(1 + c*.4), tick, nt:0, a, sweep:(O.sweep ?? 1)*(own ? .7 : 1),
    hist:[], own, tp:m.tp, col:lcol(m.tp), dm:m.d*(1 + c*.6)*sc*tick/dur, end:0 };
  s.ann = { an:O.anim || 'Shoot', t0:G.time };
}
function jetPts(S, s){
  const now = G.time, pts = [];
  for(const h of S.hist){ const age = now - h.t, d = age*JET_V; if(d > S.L) break; pts.push([h.x + Math.cos(h.a)*d, h.y + Math.sin(h.a)*d, d]); }
  return pts;
}
function updStream(s, own, dt){
  const S = s.strm, t = G.time - S.t0, tg = foeOf(own);
  if(t < S.dur){
    if(tg.hp > 0 && !tg.hid){ let da = Math.atan2(tg.y - s.y, tg.x - s.x) - S.a; da = Math.atan2(Math.sin(da), Math.cos(da)); S.a += Math.max(-S.sweep*dt, Math.min(S.sweep*dt, da)); }
    S.hist.unshift({ t:G.time, a:S.a, x:s.x + Math.cos(S.a)*18, y:s.y + Math.sin(S.a)*18 - 6 });
    if(S.hist.length > 90) S.hist.pop();
    if(Math.random() < .5) s.ann = s.ann && G.time - s.ann.t0 < .25 ? s.ann : { an:'Shoot', t0:G.time - .1 };
  } else if(!S.hist.length || G.time - S.hist[0].t > S.L/JET_V){ s.strm = null; return; }
  const P = jetPts(S, s);
  S.P = P;
  if(P.length){ const hd = P[P.length - 1]; if(Math.random() < .6) vp({ x:hd[0], y:hd[1], vx:R_(-90, 90), vy:R_(-120, -20), life:.4, s:R_(2, 4), s1:2, kind:'drop', col:'#bfe6ff', g:400 }); }
  S.nt -= dt; if(S.nt > 0 || !visible(tg)) return;
  for(const q of P) if(Math.hypot(tg.x - q[0], tg.y - q[1]) < S.w/2 + tg.r*.8){
    S.nt = S.tick;
    const inv0 = tg.inv, ko = hurtSide(own, S.dm, { t:S.tp, k:'stream', own, n:8 });
    if(ko) return;
    if(!own) tg.inv = Math.min(tg.inv, inv0 > 0 ? inv0 : .05);          // le jet touche en continu (pas d'invulnérabilité entre deux gouttes)
    const a = Math.atan2(tg.y - s.y, tg.x - s.x); tg.x = clX(tg.x + Math.cos(a)*5); tg.y = clY(tg.y + Math.sin(a)*5);
    burst(5, (i, aa) => vp({ x:q[0], y:q[1], vx:Math.cos(aa)*R_(60, 160), vy:Math.sin(aa)*R_(60, 160) - 60, life:.45, s:R_(2.5, 4), s1:2, kind:'drop', col:'#9fd4ff', g:380 }));
    break;
  }
}

// ============================================================ ZONES RETARDÉES (Psyko, Lame de Roc, Draco-Météore)
function strike2(s, d, m, c, own, sc, a){
  const O = m.opt, pat = O.pattern || 'single', R0 = O.radius || 34, dm = dmgOf(m, c, sc)*(O.share ?? 1);
  const n = (O.count || 1) + (c > .5 ? (O.chargeBonus ?? (pat === 'single' ? 0 : 2)) : 0), st = O.stagger ?? .08, gap = O.gap || 46;
  const look = O.look || ({ psy:'implode', roche:'pillar', dragon:'meteor', foudre:'bolt' })[m.tp] || 'implode';
  for(let i = 0; i < n; i++){
    let x = d.x, y = d.y, R = R0*(pat === 'single' && c > .5 ? 1.3 : 1);
    if(pat === 'line'){ const dist = (O.start || 50) + i*gap; x = s.x + Math.cos(a)*dist; y = s.y + Math.sin(a)*dist; }
    else if(pat === 'random' && i > 0){ const q = R_(0, 6.283), r = R_(.3, 1)*(O.spread || 70); x = d.x + Math.cos(q)*r; y = d.y + Math.sin(q)*r*.75; }
    ZONES.push({ x:clX(x), y:clY(y), R, t:-i*st - (pat === 'random' ? R_(0, .08) : 0), delay:O.delay ?? .8, dm, own, tp:m.tp, look, status:O.status, done:0, col:lcol(m.tp), seed:Math.random() });
  }
  if(O.exhaust) s.exh = G.time + O.exhaust;
}
function updZones(dt){
  for(let i = ZONES.length - 1; i >= 0; i--){
    const z = ZONES[i]; z.t += dt;
    if(z.t < 0) continue;
    if(!z.done && z.look === 'implode' && Math.random() < .7){ const q = R_(0, 6.283); vp({ x:z.x + Math.cos(q)*z.R*1.3, y:z.y + Math.sin(q)*z.R, vx:-Math.cos(q)*z.R*2.2, vy:-Math.sin(q)*z.R*1.7, life:.4, s:3, s1:1, kind:'star', col:'#ffb0e0', rot:q }); }
    if(!z.done && z.look === 'meteor' && z.t > z.delay - .45){ const u = (z.t - (z.delay - .45))/.45, mx = z.x - 150*(1 - u), my = z.y - 320*(1 - u); vp({ x:mx + R_(-4, 4), y:my + R_(-4, 4), vx:R_(-20, 20), vy:R_(-20, 20), life:R_(.25, .45), s:R_(8, 12), s1:R_(14, 20), pal:PURPLE }); if(Math.random() < .5) vp({ x:mx, y:my, life:.3, s:6, s1:12, pal:FIRE }); }
    if(!z.done && z.t >= z.delay){
      z.done = 1; detonate(z);
      const tg = foeOf(z.own);
      if(visible(tg) && Math.hypot(tg.x - z.x, tg.y - z.y) < z.R + tg.r*.6){ if(hurtSide(z.own, z.dm, { t:z.tp, k:'strike', own:z.own, status:z.status })) return; }
    }
    if(z.t > z.delay + .7) ZONES.splice(i, 1);
  }
}
function detonate(z){
  const c = z.col;
  addLight(z.x, z.y, z.R*3, c, .4, .7);
  if(z.look === 'pillar'){
    ROCKFX.push({ x:z.x, y:z.y, t:0, dur:.6, h:z.R*1.6, w:z.R*.55, seed:z.seed });
    for(let k = 0; k < 2; k++) ROCKFX.push({ x:z.x + R_(-z.R*.6, z.R*.6), y:z.y + R_(-4, 6), t:0, dur:.5, h:z.R*R_(.6, 1), w:z.R*.3, seed:Math.random() });
    dirt(z.x, z.y, 14, 200); groundRing(z.x, z.y + 6, 6, z.R*1.6, '#f0e0b0', .4, 3); crater(z.x, z.y + 4, z.R*.45, '#6a5a3a');
    G.shake = Math.max(G.shake, .2); HS = Math.max(HS, .03);
  } else if(z.look === 'meteor'){
    G.shake = Math.max(G.shake, .4); HS = Math.max(HS, .05); crater(z.x, z.y + 4, z.R*.7, '#4a2a68');
    groundRing(z.x, z.y + 6, 10, z.R*2.2, '#ffffff', .5, 4); groundRing(z.x, z.y + 6, 10, z.R*1.5, '#c0a0ff', .6, 3); groundDisc(z.x, z.y + 6, 10, z.R*1.2, '#3a1a58', .6);
    burst(22, (i, a) => { const v = R_(80, 260); vp({ x:z.x, y:z.y, vx:Math.cos(a)*v, vy:Math.sin(a)*v*.7 - 40, life:R_(.4, .8), s:R_(8, 12), s1:R_(14, 22), pal:i%3 ? PURPLE : FIRE, fr:2.5 }); });
    vp({ x:z.x, y:z.y, life:.25, s:z.R*.8, s1:z.R*1.8, col:'#e0c8ff', a:.5 });
  } else if(z.look === 'bolt'){
    bm.push({ x:z.x, y:z.y, col:1, t:.3, mx:.3, tp:z.tp }); G.shake = Math.max(G.shake, .2);
  } else {      // implode (psy) : se contracte puis éclate
    for(let k = 0; k < 3; k++) vp({ x:z.x, y:z.y, life:.35 + k*.1, s:6, s1:z.R*(1.4 + k*.4), kind:'ring', col:k%2 ? '#ffffff' : c });
    burst(18, (i, a) => vp({ x:z.x, y:z.y, vx:Math.cos(a)*R_(80, 220), vy:Math.sin(a)*R_(60, 160), life:R_(.4, .7), s:R_(5, 9), s1:2, kind:'star', col:i%2 ? '#ffffff' : c, rot:a, vr:8, fr:1.5 }));
    groundRing(z.x, z.y + 6, 6, z.R*1.8, c, .5, 3); flashScreen(.08); G.shake = Math.max(G.shake, .25);
  }
}

// ============================================================ RAYONS (nouveau rendu pour tous les 'beam')
function beam2(s, m, c, own, sc, a){
  const O = m.opt || {};
  BEAMS.push({ s, x:s.x, y:s.y, a, w:(O.width ?? 10) + c*12, len:O.length || 520, t:0, delay:O.delay || 0, life:.4, dm:dmgOf(m, c, sc), own, tp:m.tp, col:lcol(m.tp), done:0, status:O.status });
}
function updBeams(dt){
  for(let i = BEAMS.length - 1; i >= 0; i--){
    const q = BEAMS[i]; q.t += dt;
    if(!q.done){ q.x = q.s.x; q.y = q.s.y; if(Math.random() < .8 && q.delay){ const r = R_(20, 40), an = R_(0, 6.283); vp({ x:q.x + Math.cos(q.a)*16 + Math.cos(an)*r, y:q.y + Math.sin(q.a)*16 + Math.sin(an)*r, vx:-Math.cos(an)*r*3, vy:-Math.sin(an)*r*3, life:.3, s:3, s1:1, col:q.col }); } }
    if(!q.done && q.t >= q.delay){
      q.done = 1; G.shake = Math.max(G.shake, .2); addLight(q.x, q.y, 70, q.col, .3, .7);
      const tg = foeOf(q.own), dx = tg.x - q.x, dy = tg.y - q.y, al = dx*Math.cos(q.a) + dy*Math.sin(q.a), pd = Math.abs(-dx*Math.sin(q.a) + dy*Math.cos(q.a));
      if(visible(tg) && al > 0 && al < q.len && pd < tg.r + q.w/2){ if(hurtSide(q.own, q.dm, { t:q.tp, k:'beam', own:q.own, status:q.status })) return; }
    }
    if(q.t > q.delay + q.life) BEAMS.splice(i, 1);
  }
}

// ============================================================ ONDULANT / BOULE QUI EXPLOSE (réglables)
function wave2(s, m, c, own, sc, a){
  const O = m.opt, n = O.count || 1, sp = (O.speed || m.s || 360)*(own ? 1 : G.stage.pspeed), dm = dmgOf(m, c, sc), ox = s.x + Math.cos(a)*16, oy = s.y + Math.sin(a)*16;
  s.ann = { an:O.anim || 'Shoot', t0:G.time };
  for(let i = 0; i < n; i++) bullets.push({ x:ox, y:oy, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:(O.radius || 6)*(1 + c*.4), d:dm, t:m.tp, k:'wave', own, life:O.life || 1, hit:0, age:0,
    wave:1, amp:O.amp || 14, ph:i*Math.PI, bx:ox, by:oy, col:O.color });
}
function meteor2(s, m, c, own, sc, a){
  const O = m.opt, sp = (O.speed || m.s || 240)*(own ? 1 : G.stage.pspeed);
  s.ann = { an:O.anim || 'Shoot', t0:G.time };
  bullets.push({ x:s.x + Math.cos(a)*16, y:s.y + Math.sin(a)*16, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:(O.radius || 10)*(1 + c*.4), d:dmgOf(m, c, sc), t:m.tp, k:'meteor', own,
    life:O.life || 1.1, hit:0, age:0, split:1, split2:{ n:O.split, share:O.splitShare ?? .3, sp:O.splitSpeed || 230 }, col:O.color, look:O.look });
}
const _explodeP = explode;
explode = function(b){
  if(!b.split2) return _explodeP(b);
  const S = b.split2, col = b.col || lcol(b.t), tg = foeOf(b.own), near = Math.hypot(tg.x - b.x, tg.y - b.y) < tg.r + b.r + 4;
  addLight(b.x, b.y, 110, col, .4, .65); groundRing(b.x, b.y + 8, 8, 60, col, .45, 3); G.shake = Math.max(G.shake, .2);
  for(let k = 0; k < 2; k++) vp({ x:b.x, y:b.y, life:.35 + k*.12, s:8, s1:48 + k*20, kind:'ring', col:k ? col : '#ffffff' });
  for(let i = 0; i < S.n; i++){
    const a = i*6.283/S.n + R_(-.1, .1), o = near ? tg.r + 10 : 4;      // touché direct : les éclats partent AUTOUR de la cible (pas de double dégât)
    bullets.push({ x:b.x + Math.cos(a)*o, y:b.y + Math.sin(a)*o, vx:Math.cos(a)*S.sp, vy:Math.sin(a)*S.sp, r:4, d:b.d*S.share, t:b.t, k:'shot', own:b.own, life:.5, hit:0, age:0, col:b.col, look:'star' });
  }
};

// ============================================================ BOUCLIER : blocage + renvoi des projectiles
const shieldUp = o => o && o.shd && G.time - o.shd.t0 < o.shd.dur;
function reflectPass(){
  for(const o of [G.p, G.e]){
    if(!shieldUp(o)) continue;
    const mineIsP = o === G.p, foe = mineIsP ? G.e : G.p;
    for(const b of bullets){
      if(b.own === mineIsP) continue;
      if(Math.hypot(b.x - o.x, b.y - o.y) < o.shd.R + b.r){
        vp({ x:b.x, y:b.y, life:.25, s:4, s1:20, kind:'ring', col:o.shd.col });
        if(o.shd.reflect){ const v = Math.hypot(b.vx, b.vy), a = Math.atan2(foe.y - b.y, foe.x - b.x); b.own = mineIsP; b.vx = Math.cos(a)*v; b.vy = Math.sin(a)*v; b.life = Math.max(b.life, 1.4); b.hit = 0; b.home = 0; b.wave = 0; b.x += Math.cos(a)*8; b.y += Math.sin(a)*8; }
        else b.life = 0;
      }
    }
  }
}
let BLOCK_T = 0;
function blocked(o, b){
  if(G.time - BLOCK_T > .3){ BLOCK_T = G.time; dmgTxt(o.x, o.y - 56, 'PROTÉGÉ !', '#ffd6f0'); }
  vp({ x:o.x, y:o.y - 6, life:.25, s:o.shd.R*.8, s1:o.shd.R*1.3, kind:'ring', col:o.shd.col });
  if(b && b.k === 'melee'){ const at = o === G.p ? G.e : G.p, a = Math.atan2(at.y - o.y, at.x - o.x); at.x = clX(at.x + Math.cos(a)*50); at.y = clY(at.y + Math.sin(a)*50); at.rs = null; }
}
const _hEplus = hurtE; hurtE = function(d, b){ const e = G && G.e; if(shieldUp(e)){ blocked(e, b); return; } return _hEplus(d, b); };
const _hPplus = hurtP; hurtP = function(d, b){ const p = G && G.p; if(shieldUp(p) && p.hp > 0){ blocked(p, b); return; } return _hPplus(d, b); };

// ============================================================ boucle de jeu
function clearPlus(o){ if(!o) return; if(o.bl || o.bur) o.hid = false; o.bl = o.bur = o.strm = o.shd = null; }
function updPlus(dt){
  for(const o of [G.p, G.e]){
    if(!o) continue;
    if(o.hp <= 0){ clearPlus(o); continue; }
    const own = o === G.p;
    if(o.bl) updBlink(o, own); if(!G || G.over) return;
    if(o.bur) updBurrow(o, own, dt); if(!G || G.over) return;
    if(o.strm) updStream(o, own, dt); if(!G || G.over) return;
    if(o.shd && !shieldUp(o)) o.shd = null;
    if(o.buf && G.time > o.buf.until) o.buf = null;
  }
  updTraps(dt); if(!G || G.over) return;
  updBooms(dt); if(!G || G.over) return;
  updPulses(dt); if(!G || G.over) return;
  updZones(dt); if(!G || G.over) return;
  updBeams(dt);
  for(let i = ROCKFX.length - 1; i >= 0; i--) if((ROCKFX[i].t += dt) > ROCKFX[i].dur) ROCKFX.splice(i, 1);
  for(let i = AFTER.length - 1; i >= 0; i--) if(G.time - AFTER[i].t0 > AFTER[i].dur) AFTER.splice(i, 1);
}
const _stepPlus = step;
step = function(dt){
  if(!G || G.over || G.paused) return _stepPlus(dt);
  const hs = HS > 0, p0 = G.p, e0 = G.e, px = p0.x, py = p0.y, ex = e0.x, ey = e0.y;
  if(!hs) reflectPass();
  _stepPlus(dt);
  if(!G || G.over || G.paused || hs) return;
  if(G.e === e0 && busy(e0)){ e0.x = ex; e0.y = ey; e0.tele = 0; e0.next = Math.max(e0.next || 0, .35); }   // l'IA ne bouge pas pendant un jet / tunnel / téléport
  if(G.p === p0 && p0.strm){ p0.x = px + (p0.x - px)*.25; p0.y = py + (p0.y - py)*.25; }                    // presque immobile pendant le jet
  if(G.p === p0 && p0.bl){ p0.x = px; p0.y = py; }
  updPlus(dt);
};
const _pressPlus = press; press = function(i){ if(G && busy(G.p)) return; _pressPlus(i); };
const _dashPlus = dash; dash = function(){ if(G && busy(G.p)) return; _dashPlus(); };
const _swapPlus = doSwap; doSwap = function(n){ if(G) clearPlus(G.p); _swapPlus(n); };
const _spawnPlus = spawn; spawn = function(){ [TRAPS, BOOMS, PULSES, ZONES, BEAMS, AFTER, ROCKFX].forEach(l => l.length = 0); if(G && G.p){ clearPlus(G.p); G.p.buf = null; } _spawnPlus(); };

// ============================================================ dessin
function drawGroundPlus(){
  // zones qui vont exploser (signal au sol)
  for(const z of ZONES){
    if(z.t < 0 || z.done) continue;
    const k = Math.min(1, z.t/z.delay), c = z.col, pulse = .8 + .2*Math.sin(G.time*20);
    if(z.look === 'meteor'){ ctx.globalAlpha = .25 + .4*k; ctx.fillStyle = '#100418'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.R*(.3 + .7*k), z.R*.6*(.3 + .7*k), 0, 0, 6.283); ctx.fill(); }
    ctx.globalAlpha = (.12 + .25*k)*pulse; ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.R, z.R*.65, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = .9; ctx.strokeStyle = c; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.R*(1 - k), z.R*.65*(1 - k), 0, 0, 6.283); ctx.stroke();
    if(z.look === 'pillar'){ ctx.strokeStyle = '#3a2a18'; ctx.lineWidth = 2; for(let j = 0; j < 5; j++){ const a = j*1.26 + z.seed*6, r = z.R*k; ctx.beginPath(); ctx.moveTo(z.x, z.y); ctx.lineTo(z.x + Math.cos(a)*r*.6, z.y + Math.sin(a)*r*.35 + 3); ctx.lineTo(z.x + Math.cos(a + .3)*r, z.y + Math.sin(a + .3)*r*.6); ctx.stroke(); } }
    ctx.globalAlpha = 1;
  }
  // pièges
  for(const q of TRAPS){
    if(q.arm > 0) continue;
    const bl = .75 + .25*Math.sin(G.time*5 + q.ph), fade = Math.min(1, q.t/.5);
    ctx.globalAlpha = .35*fade; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(q.x, q.y + 3, 11, 5, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = fade;
    for(let j = 0; j < 3; j++){ const ox = (j - 1)*6, h = j === 1 ? 14 : 9; ctx.fillStyle = '#4a1868'; ctx.beginPath(); ctx.moveTo(q.x + ox - 4, q.y + 3); ctx.lineTo(q.x + ox, q.y + 3 - h); ctx.lineTo(q.x + ox + 4, q.y + 3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = hexA(q.col, bl); ctx.beginPath(); ctx.moveTo(q.x + ox - 2, q.y + 2); ctx.lineTo(q.x + ox, q.y + 3 - h); ctx.lineTo(q.x + ox + 1, q.y + 2); ctx.closePath(); ctx.fill(); }
    ctx.globalAlpha = 1;
  }
  // monticule du Tunnel
  for(const o of [G.p, G.e]) if(o && o.bur){
    const w = 16 + Math.sin(G.time*30)*2; ctx.fillStyle = '#5a4028'; ctx.beginPath(); ctx.ellipse(o.x, o.y + 6, w, 7, 0, Math.PI, 6.283); ctx.fill();
    ctx.fillStyle = '#8a6a48'; ctx.beginPath(); ctx.ellipse(o.x - 2, o.y + 4, w*.7, 4, 0, Math.PI, 6.283); ctx.fill();
    ctx.fillStyle = '#b8946a'; for(let j = 0; j < 4; j++) ctx.fillRect(o.x - 10 + j*6 + Math.sin(G.time*20 + j)*2, o.y - 1 - (j%2)*2, 3, 3);
  }
  // reflet lumineux des jets / rayons
  if(!Settings.get().light) return;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for(const q of BEAMS) if(q.done){ const k = 1 - (q.t - q.delay)/q.life, c = glow(q.col); ctx.globalAlpha = .3*k; for(let i = 0; i < q.len; i += 24) ctx.drawImage(c, q.x + Math.cos(q.a)*i - q.w*2, q.y + Math.sin(q.a)*i + 14 - q.w*.8, q.w*4, q.w*1.6); }
  for(const o of [G.p, G.e]) if(o && o.strm && o.strm.P){ const c = glow(o.strm.col); ctx.globalAlpha = .3; for(const q of o.strm.P) ctx.drawImage(c, q[0] - o.strm.w*1.5, q[1] + 14 - o.strm.w*.6, o.strm.w*3, o.strm.w*1.2); }
  ctx.restore();
}

function strokeLayer(P, w, col, alpha, off){
  ctx.globalAlpha = alpha; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.beginPath();
  for(let i = 0; i < P.length; i++){ const q = P[i], o = off ? off(i, q) : [0, 0]; i ? ctx.lineTo(q[0] + o[0], q[1] + o[1]) : ctx.moveTo(q[0] + o[0], q[1] + o[1]); }
  ctx.stroke();
}
function drawStream(S){
  const P = S.P; if(!P || P.length < 2) return;
  ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  const perp = i => { const a = P[Math.min(i + 1, P.length - 1)], b = P[Math.max(0, i - 1)], an = Math.atan2(a[1] - b[1], a[0] - b[0]); return [-Math.sin(an), Math.cos(an)]; };
  const dark = S.tp === 'eau' ? '#1f5fb8' : shade(COL[S.tp] || '#3b8fd9', -.3), mid = S.tp === 'eau' ? '#4aa0f0' : S.col;
  strokeLayer(P, S.w*1.9, S.col, .25);
  strokeLayer(P, S.w, dark, .95);
  for(const ph of [0, Math.PI]){                                     // deux rubans qui s'enroulent (comme dans le trailer)
    const off = (i, q) => { const n = perp(i), o = Math.sin(q[2]*.045 - G.time*24 + ph)*S.w*.32; return [n[0]*o, n[1]*o]; };
    strokeLayer(P, S.w*.45, mid, 1, off);
    strokeLayer(P, S.w*.18, '#e8f6ff', .95, off);
  }
  strokeLayer(P, S.w*.14, '#ffffff', .8);
  ctx.fillStyle = '#ffffff';
  for(let i = 0; i < P.length; i += 2){ if(Math.random() < .5) continue; const q = P[i], n = perp(i), o = R_(-.5, .5)*S.w; ctx.globalAlpha = .8; ctx.fillRect(q[0] + n[0]*o, q[1] + n[1]*o, 2, 2); }
  const hd = P[P.length - 1]; ctx.globalAlpha = .9; E(ctx, hd[0], hd[1], S.w*.7, S.w*.7, '#e8f6ff'); E(ctx, P[0][0], P[0][1], S.w*.55, S.w*.55, '#ffffff');
  ctx.restore();
}
function drawBeam(q){
  const x0 = q.x + Math.cos(q.a)*14, y0 = q.y + Math.sin(q.a)*14;
  ctx.save(); ctx.translate(x0, y0); ctx.rotate(q.a); ctx.lineCap = 'round';
  if(!q.done){                                                       // rayon en charge : fine ligne + boule d'énergie
    const k = Math.min(1, q.t/Math.max(.01, q.delay));
    ctx.globalAlpha = .5 + .3*Math.sin(G.time*40); ctx.strokeStyle = q.col; ctx.lineWidth = 1 + k*2; ctx.setLineDash([10, 8]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(q.len, 0); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1; E(ctx, 0, 0, 4 + k*q.w*.6, 4 + k*q.w*.6, q.col); E(ctx, 0, 0, 2 + k*q.w*.3, 2 + k*q.w*.3, '#ffffff');
  } else {
    const u = (q.t - q.delay)/q.life, k = u < .15 ? .6 + u/.15*.4 : 1 - (u - .15)/.85, w = q.w*Math.max(.05, k)*(1 + .08*Math.sin(G.time*60));
    const core = q.tp === 'plante' ? '#fffbd0' : '#ffffff';
    ctx.globalAlpha = .3; ctx.strokeStyle = q.col; ctx.lineWidth = w*2.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(q.len, 0); ctx.stroke();
    ctx.globalAlpha = 1; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = core; ctx.lineWidth = w*.42; ctx.stroke();
    ctx.globalAlpha = .7; ctx.lineWidth = Math.max(1, w*.18); ctx.setLineDash([22, 16]); ctx.lineDashOffset = -G.time*1400; ctx.beginPath(); ctx.moveTo(0, -w*.3); ctx.lineTo(q.len, -w*.3); ctx.stroke(); ctx.lineDashOffset = -G.time*1100 + 9; ctx.beginPath(); ctx.moveTo(0, w*.28); ctx.lineTo(q.len, w*.28); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = Math.min(1, k*1.4); E(ctx, 0, 0, w*1.1, w*1.1, q.col); E(ctx, 0, 0, w*.7, w*.7, core);
    for(let i = 0; i < 3; i++){ const x = R_(0, q.len); ctx.fillStyle = core; ctx.fillRect(x, R_(-w, w), 3, 2); }
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawPulse(q){
  const fade = Math.min(1, (1 - q.R/q.max)*3), dark = q.tp === 'tenebres' || q.tp === 'spectre';
  ctx.save(); ctx.translate(q.x, q.y); ctx.lineCap = 'round';
  const a0 = q.a - q.arc, a1 = q.a + q.arc;
  const ring = (r, w, c, al) => { ctx.globalAlpha = al*fade; ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.ellipse(0, 0, r, r*.8, 0, a0, a1); ctx.stroke(); };
  ring(q.R, q.w, dark ? '#140620' : q.col, dark ? .55 : .3);
  ring(q.R + q.w/2, 4, q.col, 1); ring(q.R - q.w/2, 3, q.col, .8);
  ring(q.R + q.w/2, 1.5, '#ffffff', .8);
  if(dark) for(let j = 0; j < q.faces.length; j++){                // petits fantômes / âmes sur l'onde (comme Vibrobscur dans le reel)
    const an = q.a + q.faces[j]*q.arc*.9, x = Math.cos(an)*q.R, y = Math.sin(an)*q.R*.8 + Math.sin(G.time*8 + j)*3;
    ctx.globalAlpha = fade; E(ctx, x, y, 7, 7, '#7a50c8'); E(ctx, x, y - 1, 6, 6, '#a888e8');
    ctx.fillStyle = '#1a0828'; ctx.fillRect(x - 3, y - 2, 2, 2); ctx.fillRect(x + 1, y - 2, 2, 2); ctx.fillRect(x - 2, y + 2, 4, 1);
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBoom(b){
  ctx.save();
  for(let i = b.tr.length - 1; i >= 1; i--){ const [x, y] = b.tr[i]; ctx.globalAlpha = .25*(1 - i/b.tr.length); xBlade(x, y, b.R, b.spin - i*.5, b.col); }
  ctx.globalAlpha = 1; xBlade(b.x, b.y, b.R, b.spin, b.col); ctx.restore();
}
function xBlade(x, y, R, sp, col){
  ctx.save(); ctx.translate(x, y); ctx.rotate(sp); ctx.lineCap = 'round';
  for(const r of [0, Math.PI/2]){ ctx.save(); ctx.rotate(r); ctx.strokeStyle = col; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-R*1.3, 0); ctx.quadraticCurveTo(0, -R*.5, R*1.3, 0); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
  E(ctx, 0, 0, 4, 4, '#ffffff'); ctx.restore();
}
function drawRockFx(r){
  const u = r.t/r.dur, up = u < .25 ? ease(u/.25) : u > .75 ? 1 - (u - .75)/.25 : 1, h = r.h*up, w = r.w;
  if(h < 1) return;
  const x = Math.round(r.x), y = Math.round(r.y);
  ctx.fillStyle = '#3a2a18'; ctx.beginPath(); ctx.moveTo(x - w - 1, y + 2); ctx.lineTo(x - w*.2, y - h - 1); ctx.lineTo(x + w*.35, y - h*.82); ctx.lineTo(x + w + 1, y + 2); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#9a8460'; ctx.beginPath(); ctx.moveTo(x - w, y + 1); ctx.lineTo(x - w*.2, y - h); ctx.lineTo(x + w*.35, y - h*.8); ctx.lineTo(x + w, y + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#d2bc8e'; ctx.beginPath(); ctx.moveTo(x - w, y + 1); ctx.lineTo(x - w*.2, y - h); ctx.lineTo(x - w*.05, y + 1); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#6a5838'; ctx.fillRect(x + w*.2, y - h*.4, 2, h*.3);
}
function drawGhostOrb(b){
  const r = b.r, x = Math.round(b.x), y = Math.round(b.y);
  E(ctx, x, y, r*1.5, r*1.5, '#2a1048'); E(ctx, x, y, r*1.2, r*1.2, '#6a3ab8'); E(ctx, x - r*.2, y - r*.25, r*.7, r*.7, '#9a70e8');
  ctx.fillStyle = '#ffe0ff'; ctx.fillRect(x - r*.55, y - r*.35, 3, 3); ctx.fillRect(x + r*.15, y - r*.35, 3, 3);
  ctx.fillStyle = '#1a0828'; ctx.fillRect(x - r*.5, y + r*.2, r, 2);
}
function drawMoon(b){
  const r = b.r, x = b.x, y = b.y; E(ctx, x, y, r*1.25, r*1.25, '#fff4fc'); E(ctx, x + r*.35, y - r*.25, r*.9, r*.9, '#ffc8ec');
  ctx.fillStyle = '#ffffff'; ctx.fillRect(x - r*.6, y - r*.5, 2, 2); ctx.fillRect(x - r*.2, y + r*.4, 2, 2);
}
function drawAuras(){
  for(const o of [G.p, G.e]){
    if(!o || o.hid || o.hp <= 0) continue;
    if(shieldUp(o)){
      const S = o.shd, u = (G.time - S.t0)/S.dur, R = S.R*(u < .1 ? ease(u/.1) : 1), fl = u > .75 && Math.floor(G.time*20)%2 ? .4 : 1;
      ctx.save(); ctx.globalAlpha = .25*fl; ctx.fillStyle = S.col; ctx.beginPath(); ctx.ellipse(o.x, o.y - 8, R, R*1.05, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = .9*fl; ctx.strokeStyle = S.col; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(o.x, o.y - 8, R*.92, R*.97, 0, 3.6, 5.2); ctx.stroke();
      for(let j = 0; j < 6; j++){ const a = j*1.047 + G.time*2; ctx.fillStyle = '#ffffff'; ctx.fillRect(o.x + Math.cos(a)*R*.8, o.y - 8 + Math.sin(a)*R*.8, 2, 2); }
      ctx.restore();
    }
    if(o.buf){
      const u = G.time - o.buf.t0;
      if(u < .8 && !o.buf.once){ for(let j = 0; j < 6; j++){ const a = j*1.047 + u*14, r = 30 - u*10; ctx.save(); ctx.translate(o.x + Math.cos(a)*r, o.y - 10 + Math.sin(a)*r*.6); ctx.rotate(a + 1.57); ctx.fillStyle = '#e8eefc'; ctx.fillRect(-1, -9, 3, 18); ctx.fillStyle = '#ff6a4a'; ctx.fillRect(-2, 6, 5, 3); ctx.restore(); } }
      if(Math.random() < .5) vp({ x:o.x + R_(-14, 14), y:o.y + R_(-4, 10), vx:0, vy:R_(-90, -50), life:.35, kind:'spark', col:o.buf.col });
    }
  }
}
function drawPlus(){
  for(const f of AFTER){ const u = (G.time - f.t0)/f.dur, w = f.img.width*f.k, h = f.img.height*f.k; ctx.save(); ctx.globalAlpha = .5*(1 - u); ctx.drawImage(f.img, f.x - w/2, f.y - h/2, w, h); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4*(1 - u); ctx.drawImage(flash(f.img), f.x - w/2, f.y - h/2, w, h); ctx.restore(); }
  for(const b of bullets){ if(b.look === 'ghost') drawGhostOrb(b); else if(b.look === 'moon') drawMoon(b); }
  for(const r of ROCKFX) drawRockFx(r);
  for(const q of PULSES) drawPulse(q);
  for(const o of [G.p, G.e]) if(o && o.strm) drawStream(o.strm);
  for(const q of BEAMS) drawBeam(q);
  for(const b of BOOMS) drawBoom(b);
  for(const q of TRAPS) if(q.arm > 0){ const u = 1 - q.arm/q.a0, x = q.sx + (q.x - q.sx)*u, y = q.sy + (q.y - q.sy)*u - Math.sin(u*Math.PI)*50; E(ctx, x, y, 4, 4, q.col); }
}
const _dbPlus = drawBullets; drawBullets = function(){ _dbPlus(); if(G) drawPlus(); };
const _dfPlus = drawFx; drawFx = function(){ _dfPlus(); if(G) drawAuras(); };

// lumières des nouvelles attaques (calque de js/light.js)
function collectPlusLights(L){
  for(const q of BEAMS){ if(!q.done){ L(q.x, q.y, 30 + q.w*2*Math.min(1, q.t/Math.max(.01, q.delay)), q.col, .6); continue; } const k = 1 - (q.t - q.delay)/q.life; for(let i = 0; i < q.len; i += 30) L(q.x + Math.cos(q.a)*i, q.y + Math.sin(q.a)*i, q.w*4.5, q.col, .55*k); }
  for(const o of [G.p, G.e]) if(o && o.strm && o.strm.P) for(let i = 0; i < o.strm.P.length; i += 3){ const q = o.strm.P[i]; L(q[0], q[1], o.strm.w*4, o.strm.col, .45); }
  for(const b of BOOMS) L(b.x, b.y, 50, b.col, .55);
  for(const q of PULSES){ const fade = 1 - q.R/q.max; for(let j = -4; j <= 4; j++){ const an = q.a + j/4*Math.min(q.arc, 3.1); L(q.x + Math.cos(an)*q.R, q.y + Math.sin(an)*q.R*.8, q.w*2.4, q.col, .45*fade); } }
  for(const z of ZONES) if(z.t >= 0 && !z.done) L(z.x, z.y, z.R*1.6, z.col, .3*Math.min(1, z.t/z.delay));
  for(const q of TRAPS) L(q.x, q.y, 24, q.col, .25);
  for(const o of [G.p, G.e]) if(o && !o.hid && o.hp > 0){ if(shieldUp(o)) L(o.x, o.y - 8, o.shd.R*2.4, o.shd.col, .5); if(o.buf) L(o.x, o.y, 60, o.buf.col, .35 + .1*Math.sin(G.time*12)); }
}

// ============================================================ aperçu de visée des nouveaux kinds (js/aim.js)
const _aimShapeP = aimShape;
aimShape = function(p, m, c){
  const O = m.opt || {};
  switch(m.k){
    case 'blink':     return { k:'circle', r:O.radius || 24 };
    case 'burrow':    return { k:'circle', r:(O.radius || 50)*(1 + c*.3) };
    case 'trap':      return { k:'circle', r:(O.spacing || 36) + 14 };
    case 'shield':    return { k:'self', r:O.radius || 34 };
    case 'buff':      return { k:'self', r:30 };
    case 'boomerang': return { k:'line', w:(O.radius || 12)*2, rng:(O.range || 240)*(1 + c*.3), end:true };
    case 'pulse':     return { k:'cone', half:Math.min(O.arc ?? Math.PI, Math.PI), rng:(O.range || 260)*(1 + c*.25) };
    case 'stream':    return { k:'line', w:(O.width || 18)*(1 + c*.4), rng:(O.length || 300)*(1 + c*.2) };
    case 'beam':      return { k:'line', w:(O.width ?? 10) + c*12, rng:O.length || 520 };
    case 'strike':
      if(O.pattern === 'line'){ const n = (O.count || 1) + (c > .5 ? (O.chargeBonus ?? 2) : 0); return { k:'line', w:(O.radius || 30)*2, rng:(O.start || 50) + (n - 1)*(O.gap || 46) + (O.radius || 30) }; }
      if(O.look || O.pattern) return { k:'circle', r:O.pattern === 'random' ? (O.spread || 70) + (O.radius || 34)*.6 : (O.radius || 34)*(c > .5 ? 1.3 : 1) };
      break;
    case 'wave':      if(O.amp) return { k:'line', w:O.amp*2 + 8, rng:(O.speed || 360)*(O.life || 1) }; break;
  }
  return _aimShapeP(p, m, c);
};
const _dasPlus = drawAimShape;
drawAimShape = function(p, i){
  const m = p.mv[i], sh = aimShape(p, m, p.ch[i] || 0);
  if(sh.k !== 'self') return _dasPlus(p, i);
  const col = COL[m.tp] || '#fff', A = Settings.get().aimOpacity*1.2;
  ctx.save(); ctx.globalAlpha = A; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.setLineDash([6, 5]); ctx.lineDashOffset = -G.time*30;
  ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, sh.r, sh.r, 0, 0, 6.283); ctx.stroke(); ctx.restore();
};
