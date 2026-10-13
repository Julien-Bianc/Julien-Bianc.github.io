// ============================================================
//  boss.js — BOSS (v0.10) : Mewtwo et futurs boss.
//   • Pokémon `bossOnly` : hors du roster joueur, toujours en mode boss (grande taille, PV x boss).
//   • Cerveau de boss (`ai` dans les données) : choix pondéré des attaques, réaction aux projectiles,
//     téléportation si tu es trop près, phase de rage.
//   • 4 attaques de boss (kind) :
//       'prison'   sphère qui ENFERME la cible (dégâts continus) puis l'éjecte      time, tick, dot, final, knockback, speed, radius, home
//       'stasis'   arrête les projectiles en l'air puis les renvoie                 time, radius, mult
//       'grab'     télékinésie : cercle d'alerte → soulève, écrase, projette        radius, warn, lift, knockback
//       'megabeam' charge puis rayon géant qui suit la cible                         charge, time, width, length, sweep, chargeSweep, lock
//   • Capacité `pressure` (Pression) : tes temps de recharge x1,25.
//   • Mode « Défi : Mewtwo » (menu principal) et boss des derniers niveaux solo (STAGE_BOSS).
// ============================================================
const BOSSES = [];
const isBossOnly = id => !!(POKEMON[id] && POKEMON[id].bossOnly);
const bossAI = e => e && POKEMON[e.t] && POKEMON[e.t].ai;
const PSY = '#c070ff';

// ---------- enregistrement : les boss ne vont pas dans le roster du joueur ----------
const _regBoss = registerPokemon;
registerPokemon = function(id){
  if(!isBossOnly(id)) return _regBoss(id);
  const n = ORDER.length; _regBoss(id); if(ORDER.length > n) ORDER.pop();
  if(!BOSSES.includes(id)) BOSSES.push(id);
};
// un Pokémon boss est toujours un boss (même seul, même en entraînement)
const _spawnBoss = spawn;
spawn = function(){
  _spawnBoss();
  const e = G.e;
  if(isBossOnly(e.t) && !e.boss){ e.boss = true; e.r = 36; e.hp = e.max = Math.round(e.max*(G.stage.boss || 1)); }
  e.bcd = {}; e.rage = 0;
};
// solo : remplace le dernier adversaire par le boss du niveau
let PENDING_BOSS = null;
const _enemyTeamB = enemyTeam;
enemyTeam = function(size){ const out = _enemyTeamB(size); if(PENDING_BOSS && BOSSES.includes(PENDING_BOSS)) out[out.length - 1] = PENDING_BOSS; return out; };
const _startSoloB = startSolo;
startSolo = function(team, stageIndex){ PENDING_BOSS = STAGE_BOSS[stageIndex] || null; _startSoloB(team, stageIndex); PENDING_BOSS = null; };

// ============================================================ lancement des attaques de boss
function castBoss(s, d, m, c, own, sc, a){
  const O = m.opt || {}, tg = foeOf(own);
  switch(m.k){
    case 'prison': {
      const sp = (O.speed || 250)*(own ? 1 : G.stage.pspeed);
      s.ann = { an:O.anim || 'Shoot', t0:G.time };
      bullets.push({ x:s.x + Math.cos(a)*26, y:s.y + Math.sin(a)*26, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp, r:O.radius || 13, d:m.d*sc, t:m.tp, k:'prison', own,
        life:O.life || 2.2, hit:0, age:0, home:O.home ?? .7, col:'#6a30b0', look:'dark',
        prison:{ dur:O.time || 1.6, tick:O.tick || .3, dot:(O.dot || .8)*sc, fin:(O.final || 10)*sc, kb:O.knockback || 160, own } });
      return;
    }
    case 'stasis':
      s.stz = { t0:G.time, dur:O.time || 1.4, R:O.radius || 150, mult:O.mult || 1.2, held:[] };
      s.ann = { an:O.anim || 'Hover', t0:G.time }; groundRing(s.x, s.y + 10, 10, (O.radius || 150), PSY, .5, 3); playSfx('cast:psy');
      return;
    case 'grab':
      s.grb = { t0:G.time, x:tg.x, y:tg.y, R:O.radius || 46, warn:O.warn || .6, lift:O.lift || .5, hold:.18, slam:.1, thr:.35, dmg:m.d*sc, kb:O.knockback || 210, tp:m.tp, own, tgt:null };
      s.ann = { an:O.anim || 'Hover', t0:G.time };
      return;
    case 'megabeam':
      s.mb = { t0:G.time, charge:O.charge || 1.1, dur:O.time || 1.2, a, w:O.width || 44, len:O.length || 700, tick:.1, nt:0, sweep:O.sweep || .45,
        csweep:O.chargeSweep || 1.6, lock:O.lock || .35, dmg:m.d*sc*.1/(O.time || 1.2), tp:m.tp, own, col:lcol(m.tp) };
      s.ann = { an:O.anim || 'Charge', t0:G.time };
      return;
  }
  return false;
}
const bossBusy = o => !!(o && (o.stz || o.grb || o.mb));
const heldBy = o => !!(o && (o.jail || o.lifted));

// ============================================================ Ball'Ombre : la prison
function prisonCheck(tgt, b, hp0){
  if(!b || !b.prison || !tgt || tgt.hp <= 0 || tgt.jail || tgt.hp >= hp0) return;       // pas touché (esquive, invulnérable…)
  if(typeMult(b.t, tgt.t) === 0) return;                                                // « aucun effet » (type Normal contre Spectre)
  tgt.jail = { t0:G.time, ...b.prison, x:tgt.x, y:tgt.y, nt:b.prison.tick, tp:b.t };
  tgt.ch = [0, 0, 0]; tgt.rs = null; tgt.bur = null;
  dmgTxt(tgt.x, tgt.y - 70, 'EMPRISONNÉ !', '#c8a0ff'); flashScreen(.1);
}
const _hPboss = hurtP; hurtP = function(d, b){ const p = G && G.p, h = p && p.hp, r = _hPboss(d, b); if(p) prisonCheck(p, b, h); return r; };
const _hEboss = hurtE; hurtE = function(d, b){ const e = G && G.e, h = e && e.hp, r = _hEboss(d, b); if(e) prisonCheck(e, b, h); return r; };

function updJail(o){
  const J = o.jail, t = G.time - J.t0;
  o.x = J.x + Math.sin(G.time*40)*1.2; o.y = J.y; if(o === G.p){ o.ch = [0, 0, 0]; down[0] = down[1] = down[2] = 0; } else { o.tele = 0; o.next = Math.max(o.next || 0, .3); }
  J.nt -= DT;
  if(J.nt <= 0){
    J.nt = J.tick; const dm = J.dot*typeMult(J.tp, o.t);
    o.hp -= dm; o.hitT = .15; dmgTxt(o.x + R_(-12, 12), o.y - 30, String(Math.max(1, Math.round(dm*10))), '#d8b0ff');
    burst(6, (i, a) => vp({ x:o.x + Math.cos(a)*24, y:o.y - 8 + Math.sin(a)*24, vx:-Math.cos(a)*60, vy:-Math.sin(a)*60, life:.3, kind:'spark', col:'#c8a0ff' }));
  }
  if(t < J.dur) return;
  o.jail = null;
  const src = J.own ? G.p : G.e, a = Math.atan2(o.y - src.y, o.x - src.x);
  if(o === G.p) o.inv = 0;
  G.shake = Math.max(G.shake, .5); HS = Math.max(HS, .07); flashScreen(.15);
  for(let k = 0; k < 3; k++) vp({ x:o.x, y:o.y - 8, life:.35 + k*.12, s:20, s1:70 + k*30, kind:'ring', col:k%2 ? '#ffffff' : PSY });
  burst(20, (i, q) => vp({ x:o.x, y:o.y - 8, vx:Math.cos(q)*R_(120, 300), vy:Math.sin(q)*R_(120, 300), life:R_(.4, .7), s:R_(10, 16), s1:R_(20, 30), kind:'smoke', col:'#2a1048', a:.7, fr:2 }));
  groundRing(o.x, o.y + 10, 10, 90, PSY, .5, 4);
  const ko = o === G.p ? hurtP(J.fin, { t:J.tp, k:'prison', own:J.own }) : hurtE(J.fin, { t:J.tp, k:'prison', own:J.own });
  if(!ko && o.hp > 0) throwBack(o, a, J.kb, .35);
}

// ============================================================ Barrière : arrête puis renvoie les projectiles
function stasisPass(){
  for(const o of [G.p, G.e]){
    if(!o || !o.stz) continue;
    const S = o.stz, mine = o === G.p;
    for(const b of bullets){
      if(b.own === mine || b.held) continue;
      if(Math.hypot(b.x - o.x, b.y - o.y) < S.R){
        b.held = 1; b.hv = Math.hypot(b.vx, b.vy); b.vx = b.vy = 0; b.life = 99; b.home = 0; b.wave = 0; b.hx = b.x; b.hy = b.y;
        S.held.push(b); vp({ x:b.x, y:b.y, life:.3, s:4, s1:18, kind:'ring', col:PSY });
      }
    }
  }
}
function updStasis(o){
  const S = o.stz, t = G.time - S.t0;
  if(Math.random() < .3) o.ann = { an:'Hover', t0:G.time - .3 };
  for(const b of S.held){ b.x = b.hx + Math.sin(G.time*30 + b.hy)*1.5; b.y = b.hy + Math.cos(G.time*26 + b.hx)*1.5; }
  if(t < S.dur && o.hp > 0) return;
  const mine = o === G.p, tg = foeOf(mine);
  for(const b of S.held){
    if(!bullets.includes(b)) continue;
    if(o.hp <= 0){ b.life = 0; continue; }
    const a = Math.atan2(tg.y - b.y, tg.x - b.x) + R_(-.06, .06), v = Math.max(380, b.hv*1.3);
    b.own = mine; b.vx = Math.cos(a)*v; b.vy = Math.sin(a)*v; b.life = 1.8; b.d *= S.mult; b.hit = 0; b.held = 0; b.col = b.col || PSY;
    vp({ x:b.x, y:b.y, life:.3, s:6, s1:24, kind:'ring', col:'#ffffff' });
  }
  if(S.held.length){ dmgTxt(o.x, o.y - 80, 'RENVOI !', '#e0c0ff'); G.shake = Math.max(G.shake, .2); addLight(o.x, o.y, 160, PSY, .3, .7); }
  o.stz = null;
}

// ============================================================ Télékinésie
function updGrab(s){
  const g = s.grb, t = G.time - g.t0;
  if(!g.tgt){
    if(t < g.warn) return;
    const tg = foeOf(g.own);
    if(visible(tg) && !(tg === G.p && tg.dT > 0) && Math.hypot(tg.x - g.x, tg.y - g.y) < g.R + tg.r*.5){
      g.tgt = tg; g.t1 = G.time; g.sx = tg.x; g.sy = tg.y; tg.lifted = 1; tg.ch = [0, 0, 0]; tg.rs = null;
      dmgTxt(tg.x, tg.y - 80, 'TÉLÉKINÉSIE !', '#e0c0ff'); playSfx('cast:psy');
    } else { s.grb = null; dmgTxt(g.x, g.y - 40, 'ESQUIVÉ !', '#ffffff'); }
    return;
  }
  const tg = g.tgt, u = G.time - g.t1, L = 70;
  if(tg.hp <= 0 || (tg !== G.p && tg !== G.e)){ release(tg); s.grb = null; return; }
  if(g.done){ if(u > g.lift + g.hold + g.slam + g.thr) s.grb = null; return; }       // projeté : on ne le tient plus
  if(Math.random() < .3) s.ann = { an:'Hover', t0:G.time - .3 };
  tg.x = g.sx + (u > g.lift + g.hold ? 0 : Math.sin(G.time*25)*2); tg.y = g.sy;
  if(tg === G.p){ down[0] = down[1] = down[2] = 0; } else { tg.tele = 0; tg.next = Math.max(tg.next || 0, .3); }
  if(u < g.lift) tg.lift = L*ease(u/g.lift);
  else if(u < g.lift + g.hold) tg.lift = L + Math.sin(G.time*30)*3;
  else if(u < g.lift + g.hold + g.slam) tg.lift = L*(1 - (u - g.lift - g.hold)/g.slam);
  else {
    g.done = 1; tg.lift = 0;
    crater(tg.x, tg.y + 6, 20, '#4a2a68'); G.shake = Math.max(G.shake, .6); HS = Math.max(HS, .09); flashScreen(.12);
    groundRing(tg.x, tg.y + 10, 10, 110, '#ffffff', .5, 4); groundRing(tg.x, tg.y + 10, 10, 75, PSY, .6, 3); groundDisc(tg.x, tg.y + 10, 10, 50, '#5a4a6a', .6);
    burst(26, (i, a) => vp({ x:tg.x, y:tg.y + 6, vx:Math.cos(a)*R_(60, 220), vy:R_(-260, -60), life:R_(.4, .8), s:R_(2, 4), s1:2, kind:'snow', col:i%3 ? '#8a7a68' : '#d0c0b0', g:600 }));
    if(tg === G.p) tg.inv = 0; else tg.invT = 0;
    const ko = tg === G.p ? hurtP(g.dmg, { t:g.tp, k:'grab', own:g.own }) : hurtE(g.dmg, { t:g.tp, k:'grab', own:g.own });
    if(ko || tg.hp <= 0){ release(tg); s.grb = null; return; }
    throwBack(tg, Math.atan2(tg.y - s.y, tg.x - s.x), g.kb, g.thr);
    release(tg);
  }
}
// projection en arrière : distance exacte, ralentit à la fin
function throwBack(o, a, dist, dur){ o.kb = { sx:o.x, sy:o.y, dx:Math.cos(a)*dist, dy:Math.sin(a)*dist, t0:G.time, dur }; }
function release(o){ if(o){ o.lifted = 0; o.lift = 0; } }

// ============================================================ Psykoud'Boul : rayon géant
function turn(a, to, max){ let da = to - a; da = Math.atan2(Math.sin(da), Math.cos(da)); return a + Math.max(-max, Math.min(max, da)); }
function updMega(s){
  const B = s.mb, t = G.time - B.t0, tg = foeOf(B.own), to = Math.atan2(tg.y - s.y, tg.x - s.x);
  if(t < B.charge){
    if(t < B.charge - B.lock) B.a = turn(B.a, to, B.csweep*DT);
    DIM.a = Math.max(DIM.a, .4*t/B.charge);
    const hx = s.x + Math.cos(B.a)*26, hy = s.y + Math.sin(B.a)*26 - 10;
    if(Math.random() < .9){ const q = R_(0, 6.283), r = R_(40, 70); vp({ x:hx + Math.cos(q)*r, y:hy + Math.sin(q)*r, vx:-Math.cos(q)*r*2.6, vy:-Math.sin(q)*r*2.6, life:.35, s:3, s1:1, kind:'star', col:i_(q) }); }
    if(Math.random() < .3) s.ann = { an:'Charge', t0:G.time - .2 };
    return;
  }
  if(t < B.charge + B.dur){
    if(!B.fired){ B.fired = 1; G.shake = Math.max(G.shake, .5); flashScreen(.25); HS = Math.max(HS, .06); s.ann = { an:'Shoot', t0:G.time }; }
    B.a = turn(B.a, to, B.sweep*DT); G.shake = Math.max(G.shake, .14); DIM.a = Math.max(DIM.a, .3);
    if(Math.random() < .4) s.ann = { an:'Shoot', t0:G.time - .25 };
    const ox = s.x + Math.cos(B.a)*26, oy = s.y + Math.sin(B.a)*26 - 10;
    for(let i = 0; i < 2; i++){ const dd = R_(30, B.len), w = R_(-1, 1)*B.w*.5; vp({ x:ox + Math.cos(B.a)*dd - Math.sin(B.a)*w, y:oy + Math.sin(B.a)*dd + Math.cos(B.a)*w, life:.2, s:R_(14, 26), kind:'arc', col:'#f0d8ff', rot:R_(0, 6.28) }); }
    B.nt -= DT; if(B.nt > 0 || !visible(tg)) return;
    const dx = tg.x - ox, dy = tg.y - oy, al = dx*Math.cos(B.a) + dy*Math.sin(B.a), pd = -dx*Math.sin(B.a) + dy*Math.cos(B.a);
    if(al > 0 && al < B.len && Math.abs(pd) < B.w/2 + tg.r*.7){
      B.nt = B.tick; const inv0 = tg.inv;
      if(typeMult(B.tp, tg.t) === 0){ if(!B.noEff){ B.noEff = 1; dmgTxt(tg.x, tg.y - 52, 'AUCUN EFFET', '#e8e0f0'); } return; }
      const ko = B.own ? hurtE(B.dmg, { t:B.tp, k:'megabeam', own:B.own, n:12 }) : hurtP(B.dmg, { t:B.tp, k:'megabeam', own:B.own, n:12 });
      if(ko) return;
      if(tg === G.p) tg.inv = Math.min(tg.inv, inv0 > 0 ? inv0 : .05);
      tg.x = clX(tg.x + Math.cos(B.a)*4); tg.y = clY(tg.y + Math.sin(B.a)*4);
    }
    return;
  }
  if(t > B.charge + B.dur + .3) s.mb = null;
}
const i_ = q => (Math.sin(q*7) > 0 ? '#ffffff' : PSY);

// ============================================================ cerveau du boss
function pickMove(e, A){
  const W_ = (e.rage && A.rageWeights) || A.weights || [1, 1, 1], ok = [];
  let tot = 0;
  MV[e.t].forEach((m, i) => { if(i === A.react) return; if((e.bcd[i] || 0) > G.time) return; const w = W_[i] ?? 1; if(w > 0){ ok.push([i, w]); tot += w; } });
  if(!ok.length) return 0;
  let x = Math.random()*tot; for(const [i, w] of ok){ x -= w; if(x <= 0) return i; } return ok[0][0];
}
function incoming(e){
  for(const b of bullets){
    if(!b.own || b.held) continue;
    const dx = e.x - b.x, dy = e.y - b.y, d = Math.hypot(dx, dy);
    if(d < 230 && (b.vx*dx + b.vy*dy) > 0) return true;
  }
  return false;
}
const DODGE_MV = { n:'Téléport', k:'blink', tp:'psy', d:0, cd:3, opt:{ kind:'blink', range:240, delay:.1, look:'psy', anim:'Hover', invuln:.2 } };
function bossThink(e, A){
  const fighting = !(G.training && G.training.mode !== 'fight');
  if(A.rage && !e.rage && e.hp < e.max*A.rage.below){
    e.rage = 1; dmgTxt(e.x, e.y - 90, A.rage.label || 'RAGE !', '#ff6ad8'); flashScreen(.3); G.shake = Math.max(G.shake, .5);
    for(let k = 0; k < 3; k++) groundRing(e.x, e.y + 10, 10, 120 + k*40, k ? PSY : '#ffffff', .6 + k*.15, 4);
  }
  if(!fighting || bossBusy(e) || busy(e) || heldBy(e) || e.st === 'frz' || e.st === 'slp') return;
  // réaction : Barrière contre les projectiles
  if(A.react != null && (e.bcd[A.react] || 0) <= G.time && incoming(e)){
    const m = MV[e.t][A.react]; lbl(1, m.n, e.t);
    cast(e, G.p, m, 0, 0, G.stage.dmg, undefined); e.bcd[A.react] = G.time + m.cd*(e.rage ? .7 : 1); e.tele = 0; e.next = Math.max(e.next, .5); return;
  }
  // esquive : téléportation si tu es collé à lui
  if(A.dodge && (e.dodgeT || 0) <= G.time && G.p.hp > 0 && Math.hypot(G.p.x - e.x, G.p.y - e.y) < A.dodge.range + G.p.r){
    e.dodgeT = G.time + A.dodge.cd; castPlus(e, G.p, DODGE_MV, 0, 0, 1, undefined); return;
  }
  // nouvelle attaque choisie par le moteur : on la remplace par un choix pondéré (+ temps de recharge par attaque)
  if(e.tele > 0 && e.tele === e.tm){ e.pat = pickMove(e, A); const tl = A.tele && A.tele[e.pat]; if(tl != null){ e.tele = e.tm = tl*G.stage.tele; } }
}
// l'attaque part : temps de recharge propre à chaque attaque du boss + cadence de rage
const _eFireBoss = eFire;
eFire = function(){
  const e = G.e, A = bossAI(e); _eFireBoss();
  if(!A || !G || G.e !== e) return;
  const m = MV[e.t][e.pat]; e.bcd[e.pat] = G.time + m.cd*(e.rage ? .7 : 1);
  if(e.rage && A.rage) e.next *= A.rage.rate;
};

// ============================================================ boucle
const _stepBoss = step;
step = function(dt){
  if(!G || G.over || G.paused) return _stepBoss(dt);
  const hs = HS > 0, p0 = G.p, e0 = G.e, px = p0.x, py = p0.y, ex = e0.x, ey = e0.y;
  if(!hs) stasisPass();
  _stepBoss(dt);
  if(!G || G.over || G.paused || hs) return;
  if(G.e === e0 && (bossBusy(e0) || heldBy(e0))){ e0.x = ex; e0.y = ey; e0.tele = 0; e0.next = Math.max(e0.next || 0, .35); }
  if(G.p === p0 && heldBy(p0)){ p0.x = px; p0.y = py; }
  for(const o of [G.p, G.e]){
    if(!o) continue;
    if(o.hp <= 0){ if(o.stz) updStasis(o); o.jail = null; o.grb = null; o.mb = null; release(o); continue; }
    if(o.jail) updJail(o); if(!G || G.over) return;
    if(o.stz) updStasis(o);
    if(o.grb) updGrab(o); if(!G || G.over) return;
    if(o.mb) updMega(o); if(!G || G.over) return;
    if(o.kb){ const K = o.kb, u = Math.min(1, (G.time - K.t0)/K.dur), e2 = ease(u); o.x = clX(K.sx + K.dx*e2); o.y = clY(K.sy + K.dy*e2); if(u >= 1) o.kb = null;
      if(Math.random() < .6) vp({ x:o.x + R_(-6, 6), y:o.y + 12, vx:R_(-20, 20), vy:R_(-30, -10), life:.4, s:5, s1:10, kind:'smoke', col:'#c8bca8', a:.5 }); }
  }
  const A = bossAI(G.e); if(A && G.e === e0 && G.e.hp > 0 && G.intro <= 0 && !G.wait) bossThink(G.e, A);
};
// pendant la prison / la télékinésie : impossible d'attaquer ou d'esquiver
const _pressBoss = press; press = function(i){ if(G && heldBy(G.p)) return; _pressBoss(i); };
const _dashBoss = dash; dash = function(){ if(G && heldBy(G.p)) return; _dashBoss(); };
const _swapBoss = doSwap;
doSwap = function(n){ const o = G && G.p; if(o){ o.jail = null; o.kb = null; release(o); if(G.e && G.e.grb && G.e.grb.tgt === o) G.e.grb = null; } _swapBoss(n); };
// Pression : temps de recharge x1,25
const _relBoss = rel;
rel = function(i){
  const was = G && down[i]; _relBoss(i);
  const ab = G && G.e && G.e.hp > 0 && abilityOf(G.e);
  if(was && ab && ab.pressure){ G.p.cd[i] *= ab.pressure; G.p.cm[i] *= ab.pressure; }
};
// le Pokémon soulevé est dessiné en l'air
const _animOfBoss = animOf;
animOf = function(o, tx, ty, en){ const r = _animOfBoss(o, tx, ty, en); if(o.lift) r.oy -= o.lift; return r; };

// ============================================================ dessin
function drawDarkOrb(b){
  const r = b.r, x = b.x, y = b.y, t = G.time;
  E(ctx, x, y, r*1.6, r*1.6, '#1a0630'); E(ctx, x, y, r*1.25, r*1.25, '#3a1468'); E(ctx, x, y, r*.8, r*.8, '#0c0418');
  ctx.save(); ctx.strokeStyle = '#b080ff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, r*1.3, t*8, t*8 + 2); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, r*1.3, t*8 + 3.1, t*8 + 5.1); ctx.stroke(); ctx.restore();
  if(Math.random() < .6) vp({ x:x + R_(-r, r), y:y + R_(-r, r), vx:-b.vx*.2 + R_(-20, 20), vy:-b.vy*.2 + R_(-20, 20), life:.45, s:R_(6, 9), s1:R_(12, 18), kind:'smoke', col:'#2a1048', a:.6 });
}
function drawJail(o){
  const J = o.jail, u = (G.time - J.t0)/J.dur, R = 34 + Math.sin(G.time*14)*2 - (u > .85 ? (u - .85)/.15*10 : 0), y = o.y - 10;
  ctx.save();
  const g = ctx.createRadialGradient(o.x, y, 4, o.x, y, R); g.addColorStop(0, 'rgba(20,4,40,.15)'); g.addColorStop(.7, 'rgba(40,10,80,.45)'); g.addColorStop(1, 'rgba(120,60,220,.75)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(o.x, y, R, 0, 6.283); ctx.fill();
  ctx.strokeStyle = '#c8a0ff'; ctx.lineWidth = 2.5; ctx.stroke();
  ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(o.x, y, R*.86, 3.6, 4.6); ctx.stroke();
  ctx.strokeStyle = '#e0c8ff'; ctx.lineWidth = 1.5;
  for(let k = 0; k < 3; k++){ const a0 = G.time*(4 + k) + k*2.1; ctx.beginPath(); for(let j = 0; j <= 6; j++){ const a = a0 + j*.25, rr = R*(.9 - j*.05); j ? ctx.lineTo(o.x + Math.cos(a)*rr + R_(-2, 2), y + Math.sin(a)*rr + R_(-2, 2)) : ctx.moveTo(o.x + Math.cos(a)*rr, y + Math.sin(a)*rr); } ctx.stroke(); }
  ctx.restore();
}
function drawStasis(o){
  const S = o.stz, u = Math.min(1, (G.time - S.t0)/.2), R = S.R*ease(u), fl = .7 + .3*Math.sin(G.time*16);
  ctx.save(); ctx.globalAlpha = .12*fl; ctx.fillStyle = PSY; ctx.beginPath(); ctx.ellipse(o.x, o.y, R, R*.75, 0, 0, 6.283); ctx.fill();
  ctx.globalAlpha = .7*fl; ctx.strokeStyle = PSY; ctx.lineWidth = 3; ctx.stroke();
  ctx.globalAlpha = .5; ctx.setLineDash([10, 8]); ctx.lineDashOffset = -G.time*60; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(o.x, o.y, R*.94, R*.7, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  ctx.globalAlpha = 1;
  for(const b of S.held){ ctx.strokeStyle = PSY; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(b.x, b.y, b.r + 5 + Math.sin(G.time*20)*1.5, 0, 6.283); ctx.stroke(); ctx.strokeStyle = 'rgba(192,112,255,.35)'; ctx.beginPath(); ctx.moveTo(o.x, o.y - 30); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.restore();
}
function drawGrab(s){
  const g = s.grb;
  if(!g.tgt){
    const k = Math.min(1, (G.time - g.t0)/g.warn), R = g.R*(1.8 - .8*k);
    ctx.save(); ctx.globalAlpha = .2 + .3*k; ctx.fillStyle = PSY; ctx.beginPath(); ctx.ellipse(g.x, g.y, R, R*.62, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = .9; ctx.strokeStyle = PSY; ctx.lineWidth = 3; ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(g.x, g.y, g.R, g.R*.62, 0, 0, 6.283); ctx.stroke();
    for(let j = 0; j < 4; j++){ const a = j*1.571 + G.time*3; ctx.fillStyle = '#ffffff'; ctx.fillRect(g.x + Math.cos(a)*R - 2, g.y + Math.sin(a)*R*.62 - 2, 4, 4); }
    ctx.restore(); return;
  }
  const tg = g.tgt, y = tg.y - (tg.lift || 0) - 8;
  ctx.save(); ctx.strokeStyle = 'rgba(200,140,255,.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(s.x + 10, s.y - 30);
  ctx.quadraticCurveTo((s.x + tg.x)/2 + Math.sin(G.time*20)*8, Math.min(s.y, y) - 50, tg.x, y); ctx.stroke();
  ctx.globalAlpha = .5 + .3*Math.sin(G.time*30); ctx.strokeStyle = PSY; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(tg.x, y, 26, 30, 0, 0, 6.283); ctx.stroke();
  ctx.restore();
}
function drawMega(s){
  const B = s.mb, t = G.time - B.t0, ox = s.x + Math.cos(B.a)*26, oy = s.y + Math.sin(B.a)*26 - 10;
  ctx.save(); ctx.lineCap = 'round';
  if(t < B.charge){
    const k = t/B.charge, lock = t > B.charge - B.lock;
    ctx.translate(ox, oy); ctx.rotate(B.a);
    ctx.globalAlpha = .1 + .18*k; ctx.fillStyle = lock ? '#ff3b6a' : PSY; ctx.fillRect(0, -B.w/2, B.len, B.w);
    ctx.globalAlpha = .7; ctx.strokeStyle = lock ? '#ff6a8a' : PSY; ctx.lineWidth = 2; ctx.setLineDash([12, 8]); ctx.lineDashOffset = -G.time*80;
    ctx.beginPath(); ctx.moveTo(0, -B.w/2); ctx.lineTo(B.len, -B.w/2); ctx.moveTo(0, B.w/2); ctx.lineTo(B.len, B.w/2); ctx.stroke(); ctx.setLineDash([]);
    ctx.globalAlpha = 1; const r = 5 + 16*k + Math.sin(G.time*40)*1.5;
    E(ctx, 0, 0, r*1.4, r*1.4, '#5a20a0'); E(ctx, 0, 0, r, r, PSY); E(ctx, 0, 0, r*.55, r*.55, '#ffffff');
  } else {
    const u = (t - B.charge)/B.dur, f = u > 1 ? Math.max(0, 1 - (u - 1)/.23) : Math.min(1, u*8), w = B.w*f*(1 + .06*Math.sin(G.time*70));
    ctx.translate(ox, oy); ctx.rotate(B.a);
    ctx.globalAlpha = .28*f; ctx.strokeStyle = PSY; ctx.lineWidth = w*1.9; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(B.len, 0); ctx.stroke();
    ctx.globalAlpha = f; ctx.strokeStyle = '#8a3ae0'; ctx.lineWidth = w; ctx.stroke();
    ctx.strokeStyle = '#d8a8ff'; ctx.lineWidth = w*.62; ctx.stroke();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = w*.3; ctx.stroke();
    ctx.globalAlpha = .8*f; ctx.lineWidth = Math.max(1, w*.08); ctx.strokeStyle = '#ffffff'; ctx.setLineDash([28, 18]);
    for(const [k, sp] of [[-.36, 1500], [.36, 1250], [0, 1800]]){ ctx.lineDashOffset = -G.time*sp; ctx.beginPath(); for(let x = 0; x <= B.len; x += 20) { const yy = k*w + Math.sin(x*.04 - G.time*30)*w*.08; x ? ctx.lineTo(x, yy) : ctx.moveTo(x, yy); } ctx.stroke(); }
    ctx.setLineDash([]);
    ctx.globalAlpha = f; E(ctx, 0, 0, w*.9, w*.9, PSY); E(ctx, 0, 0, w*.6, w*.6, '#ffffff');
  }
  ctx.restore(); ctx.globalAlpha = 1;
}
function drawBossAura(e){
  if(!e || e.hid || e.hp <= 0 || !bossAI(e)) return;
  const strong = e.rage ? 1 : .45;
  if(Math.random() < .5*strong) vp({ x:e.x + R_(-22, 22), y:e.y + R_(-10, 14), vx:R_(-10, 10), vy:R_(-90, -40), life:R_(.4, .7), s:R_(5, 8), s1:2, col:e.rage ? '#ff70e0' : PSY, a:.6 });
}
const _dbBoss = drawBullets;
drawBullets = function(){
  _dbBoss(); if(!G) return;
  for(const b of bullets) if(b.look === 'dark') drawDarkOrb(b);
  for(const o of [G.p, G.e]) if(o){ if(o.stz) drawStasis(o); if(o.grb) drawGrab(o); if(o.mb) drawMega(o); }
  drawBossAura(G.e);
};
const _dfBoss = drawFx;
drawFx = function(){ _dfBoss(); if(G) for(const o of [G.p, G.e]) if(o && o.jail && !o.hid) drawJail(o); };
const _cplBoss = collectPlusLights;
collectPlusLights = function(L){
  _cplBoss(L);
  for(const o of [G.p, G.e]){
    if(!o) continue;
    if(o.jail) L(o.x, o.y - 10, 80, PSY, .45);
    if(o.stz) L(o.x, o.y, o.stz.R*1.3, PSY, .25);
    if(o.grb && o.grb.tgt) L(o.grb.tgt.x, o.grb.tgt.y - (o.grb.tgt.lift || 0), 70, PSY, .5);
    if(o.mb){ const B = o.mb, t = G.time - B.t0, ox = o.x + Math.cos(B.a)*26, oy = o.y + Math.sin(B.a)*26 - 10;
      if(t < B.charge) L(ox, oy, 40 + 80*t/B.charge, PSY, .7);
      else if(t < B.charge + B.dur) for(let i = 0; i < B.len; i += 40) L(ox + Math.cos(B.a)*i, oy + Math.sin(B.a)*i, B.w*3, PSY, .6); }
  }
  for(const b of bullets) if(b.look === 'dark') L(b.x, b.y, 50, PSY, .35);
};

// ============================================================ menu : « Défi : Mewtwo » + mannequin boss en entraînement
MAIN_MENU.splice(1, 0, { id:'boss', label:'Défi : Mewtwo', desc:'Affronte le Pokémon le plus puissant', screen:'boss' });
function showBoss(sel){
  if(!BOSSES.includes('mewtwo')){ menu(`<h1>Défi : Mewtwo</h1><p>Sprites de Mewtwo introuvables : décompresse-les dans assets/pokemon/mewtwo/ (n° 0150 sur sprites.pmdcollab.org).</p><div class='row'><button class='btn2' id='back'>Retour</button></div>`); document.getElementById('back').onclick = showMain; return; }
  const teams = Save.teams().filter(teamOk);
  if(!teams.length){ menu(`<h1>Défi : Mewtwo</h1><p>Crée d'abord une équipe.</p><div class='row'><button class='btn' id='mk'>Mes équipes</button><button class='btn2' id='back'>Retour</button></div>`); document.getElementById('mk').onclick = showTeams; document.getElementById('back').onclick = showMain; return; }
  const t = (sel && sel.team) || teams.find(x => x.id === Save.lastTeam) || teams[0], D = POKEMON.mewtwo;
  menu(`<h1>Défi : Mewtwo</h1>
    <div class='dh'><img src='${spr('mewtwo').toDataURL()}'><div><b>${D.name}</b> — <i>${esc(D.ability.name)}</i> : ${esc(D.ability.desc)}</div></div>
    <div class='scroll'>${D.moves.map(m => `<p class='abl'><b>${esc(m.name)}</b> — ${esc(m.desc)}</p>`).join('')}</div>
    <div class='row'>${teams.map(x => `<button class='btn2 ${x.id === t.id ? 'on' : ''}' data-team='${x.id}'>${esc(x.name)} (${x.members.length})</button>`).join('')}</div>
    <div class='row'><button class='btn' id='go'>Combattre avec ${esc(t.name)}</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-team]', el => showBoss({ team:Save.team(el.dataset.team) }));
  document.getElementById('go').onclick = () => startBoss(t);
  document.getElementById('back').onclick = showMain;
}
SCREENS.boss = showBoss;
function startBoss(team){
  Save.lastTeam = team.id;
  start({ mode:'boss', team:team.members.slice(), size:team.size, teamId:team.id, stage:BOSS_STAGE, arena:BOSS_STAGE.arena, enemies:['mewtwo'] });
}
const _battleEndBoss = battleEnd;
battleEnd = function(win){
  const c = G.cfg; if(c.mode !== 'boss') return _battleEndBoss(win);
  const t = Save.team(c.teamId), s = Math.floor(G.time);
  menu(`<h1>${win ? '🏆 Mewtwo est vaincu !' : 'Défaite'}</h1><p>${win ? 'Temps : ' + Math.floor(s/60) + ':' + String(s%60).padStart(2, '0') : 'PV restants de Mewtwo : ' + Math.round(Math.max(0, G.e.hp)/G.e.max*100) + ' %'}</p>
    <div class='row'><button class='btn' id='rp'>${win ? 'Rejouer' : 'Réessayer'}</button><button class='btn2' id='mn'>Menu</button></div>`);
  document.getElementById('rp').onclick = () => startBoss(t); document.getElementById('mn').onclick = showMain;
};
// Entraînement : on peut choisir un boss comme mannequin
const _pickerBoss = pokemonPicker;
pokemonPicker = function(title, current, onPick, back){
  const dummy = /mannequin/i.test(title);
  if(dummy) ORDER.push(...BOSSES);
  try{ _pickerBoss(title, current, onPick, back); } finally { if(dummy) ORDER.splice(ORDER.length - BOSSES.length, BOSSES.length); }
};
