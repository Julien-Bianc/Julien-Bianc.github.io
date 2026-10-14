// ============================================================
//  raid.js — MODE « COMBAT RAID » (v0.16) — réglages : data/raid.js ; multijoueur : js/raid-net.js
//    • Stade du Raid (nouvelle arène de nuit) avec un cercle de runes rouges au centre
//    • Boss géant au centre : aura rouge, yeux rouges, plusieurs barres de vie ; à chaque barre perdue il rugit
//      (onde qui repousse) et passe en RAGE : attaques plus rapides et plus fortes
//    • Attaque ULTIME « Colère du Titan » : 3 ondes de choc rouges partent du boss → esquive au bon moment
//    • ATH de raid : grande barre segmentée, compte à rebours, liste des alliés
//    • Récompenses : Pokédollars + Caisse de raid (Magasin → Caisses)
// ============================================================

// ============================================================ ARÈNE : STADE DU RAID
const RAID_TH = STH.length;
STH.push({ back:'#05060a', wall:{ o:'#090a12', l:'#5a6078', m:'#343a50', d:'#1c2030' }, seat:{ l:'#2c3654', m:'#1e2840', d:'#121a2c', g:'#0a1020' }, trim:'#ff3b3b', gate:'#22283a',
  torch:['#ff3b3b', '#ffd0a0'], alpha:.85,
  crowd:['#e8503c', '#f0c030', '#3b8fd9', '#f4f0e8', '#ff8a6a', '#8a5ad0', '#58b848'],
  deco(a){ for(let x = 6; x < PW; x += 16){ rc(a, x, 0, 6, 4, '#7a1418'); polyPx(a, [[x, 4], [x + 6, 4], [x + 3, 7]], '#a8202a'); px(a, x + 3, 1, '#ffd23f'); } } });
const RAID_ARENA = ARENAS.length;
ARENAS.push({ name:'Stade du Raid', th:RAID_TH, fx:{ k:'ember', c:'#ff5a3a', n:44, s:2 },
  obst: sym([['pillar', 'ruin', .17, .28], ['rock', 'stone', .3, .8]]),
  paint(a, R){
    const cx = PW/2, cy = (FY0 + FY1)/2, L = [[FX0 + 30, FY0 + 20], [FX1 - 30, FY0 + 20], [FX0 + 30, FY1 - 18], [FX1 - 30, FY1 - 18]];
    paintField(a, ['#0f2616', '#14301b', '#193a20', '#204627', '#2a5632', '#3a1012', '#7a1418', '#ff4a3a', '#ffb08a'], (x, y) => {
      const dx = x - cx, dy = (y - cy)*1.3, d = Math.hypot(dx, dy), an = Math.atan2(dy, dx);
      if(Math.abs(d - 74) < 1.6) return 7; if(Math.abs(d - 70) < .9) return 8; if(Math.abs(d - 58) < 1) return 6;
      if(d < 57 && d > 40 && Math.abs(((an*8/Math.PI) % 1 + 1) % 1 - .5) < .06) return 6;                  // rayons du sceau
      if(d > 58 && d < 70 && Math.sin(an*24) > .6 && hash(x, y, 3) > .35) return 5;                       // runes
      let light = 0; for(const [lx, ly] of L){ const q = Math.hypot(x - lx, (y - ly)*1.2); if(q < 70) light = Math.max(light, 1 - q/70); }
      let i = ((x/26) | 0) & 1 ? 1 : 2; const t = vn(x, y, 30, 7) + (bay(x, y) - .5)*.12; if(t > .66) i++; else if(t < .3) i--;
      if(light > .45) i += 2; else if(light > .15) i += 1; if(d < 40) i = Math.max(0, i - 1);
      return Math.max(0, Math.min(4, i)); });
    cracks(a, R, 10, 46, ['#0a1a0e', '#05100a']);
    for(let k = 0; k < 16; k++){ const an = k*.3927, x = Math.round(cx + Math.cos(an)*64), y = Math.round(cy + Math.sin(an)*64/1.3);
      rc(a, x - 1, y - 2, 3, 1, '#ff6a4a'); rc(a, x, y - 1, 1, 3, '#ff6a4a'); px(a, x - 1, y + 1, '#ffb08a'); }
    pitchLines(a, 'rgba(230,240,230,.35)', .2, { inset:8, r:0, r2:0, box:[54, 44] });
  } });

// ============================================================ LANCEMENT
let RAID_PENDING = null;                                          // réglages du raid en cours de lancement (lus dans spawn)
function startRaid(team, o){
  o = o || {};
  const members = team.members.filter(id => ORDER.includes(id) && (typeof Owned === 'undefined' || Owned.has(id))).slice(0, RAID.teamMax);
  if(!members.length) return;
  Save.lastTeam = team.id;
  RAID_PENDING = { n:o.players ? o.players.length : 1, net:!!o.net, host:!o.net || !!o.host, slot:o.slot || 0 };
  start({ mode:'raid', net:!!o.net, team:members, size:RAID.teamMax, teamId:team.id, stage:{ ...RAID.stage, arena:RAID_ARENA }, arena:RAID_ARENA, enemies:[RAID.boss] });
  RAID_PENDING = null;
}
const isRaid = () => !!(G && G.raid);
const raidAuth = () => isRaid() && (!G.raid.net || G.raid.host);   // c'est cette machine qui fait agir le boss
const RaidHook = {};                                               // branchements du multijoueur (js/raid-net.js)

const _spawnRaid = spawn;
spawn = function(){
  _spawnRaid();
  if(!(G && G.cfg && G.cfg.mode === 'raid')) return;
  const P = RAID_PENDING || { n:1, net:false, host:true, slot:0 }, e = G.e;
  G.raid = { n:P.n, net:P.net, host:P.host, rage:0, ultT:RAID.ult.first, ult:null, out:false, won:false, failed:false, base:{ ...G.stage }, t0:G.time + (G.intro || 0) };
  e.boss = true; e.raid = 1; e.r = 44; e.sc = 4;
  e.hp = e.max = Math.round(HERO[e.t].hp*RAID.hp*(1 + RAID.hpPerPlayer*(P.n - 1)));
  e.x = W/2; e.y = H/2 - 20; e.next = 2;
  const a = Math.PI/2 + (P.slot - (P.n - 1)/2)*.7;                  // les joueurs se répartissent devant le boss
  G.p.x = W/2 + Math.cos(a)*230; G.p.y = clY(H/2 + Math.sin(a)*170);
  G.introTxt = 'RAID !';
};

// ============================================================ LE BOSS : ATTAQUES, POSITION
// cible : un joueur encore debout (le plus proche le plus souvent)
function raidTargets(){
  const L = []; if(!G.raid.out && G.p.hp > 0 && !G.p.hid) L.push(G.p);
  if(RaidHook.allies) RaidHook.allies().forEach(a => { if(a.hp > 0 && !a.out) L.push(a); });
  return L;
}
function raidTarget(){
  const L = raidTargets(), e = G.e; if(!L.length) return null;
  if(L.length > 1 && Math.random() < .4) return G.raid.tgt = L[Math.floor(Math.random()*L.length)];
  return G.raid.tgt = L.reduce((b, o) => Math.hypot(o.x - e.x, o.y - e.y) < Math.hypot(b.x - e.x, b.y - e.y) ? o : b);
}
function raidFire(){
  const e = G.e, R = G.raid; if(!raidAuth() || R.ult) return;
  const m = MV[e.t][e.pat], S = G.stage, T = raidTarget(); if(!T) return;
  lbl(1, m.n, e.t); e.atk = e.atkD = .35;
  const sc = S.dmg*Math.pow(RAID.rage.dmg, R.rage)*(isBig(m) ? .85 : 1);
  const sp = (m.fan && m.fan.speed) || m.s || 300, dist = Math.hypot(T.x - e.x, T.y - e.y), k = dist/Math.max(120, sp*.9)*S.aim;
  const d = { x:clX(T.x + (T.vx || 0)*k), y:clY(T.y + (T.vy || 0)*k), r:T.r || 14 };
  cast(e, d, m, .5, 0, sc, undefined);
  if(RaidHook.cast) RaidHook.cast({ i:e.pat, x:r2(d.x), y:r2(d.y), r:d.r, sc:r2(sc) });
}
const _eFireRaid = eFire;
eFire = function(){ if(isRaid()) return raidFire(); return _eFireRaid(); };

// ============================================================ RAGE (une par barre perdue)
function raidRage(level, fromNet){
  const R = G.raid, e = G.e, B = R.base;
  R.rage = level;
  G.stage.rate = B.rate*Math.pow(RAID.rage.rate, level); G.stage.tele = B.tele*Math.pow(RAID.rage.tele, level);
  e.invT = G.time + RAID.rage.invuln; e.tele = 0; e.next = Math.max(e.next || 0, RAID.rage.invuln);
  if(SPR[e.t]) e.ann = { an:resolveAnim(SPR[e.t], 'Charge') || 'Idle', t0:G.time };
  dmgTxt(e.x, e.y - 110, level >= RAID.bars - 1 ? 'DERNIÈRE BARRE : FURIE !' : 'RAGE ' + level + ' !', '#ff5a4a');
  G.shake = Math.max(G.shake, .7); HS = Math.max(HS, .1); flashScreen(.3); if(typeof playSfx === 'function') playSfx('ko');
  for(let k = 0; k < 4; k++) groundRing(e.x, e.y + 20, 20, RAID.rage.roarRadius*(1 + k*.35), k % 2 ? '#ffffff' : '#ff3b3b', .55 + k*.12, 5);
  burst(30, (i, q) => vp({ x:e.x, y:e.y, vx:Math.cos(q)*R_(120, 320), vy:Math.sin(q)*R_(80, 220), life:R_(.5, .9), s:R_(10, 16), s1:R_(20, 30), kind:'smoke', col:'#3a0a0c', a:.7, fr:2 }));
  const p = G.p, d = Math.hypot(p.x - e.x, p.y - e.y);                   // le rugissement repousse ton Pokémon
  if(!R.out && p.hp > 0 && d < RAID.rage.roarRadius + p.r && typeof throwBack === 'function') throwBack(p, Math.atan2(p.y - e.y, p.x - e.x), RAID.rage.roarPush, .35);
}

// ============================================================ ATTAQUE ULTIME : COLÈRE DU TITAN
function raidUlt(fromNet){
  const R = G.raid, e = G.e, U = RAID.ult;
  R.ult = { t0:G.time, hit:[], x:e.x, y:e.y }; R.ultT = Math.max(8, U.cd - U.cdRage*R.rage);
  e.tele = 0; e.next = U.charge + U.rings*U.gap + 1.2; e.rs = null;
  if(SPR[e.t]) e.ann = { an:resolveAnim(SPR[e.t], 'Charge') || 'Idle', t0:G.time };
  lbl(1, 'Colère du Titan', 'tenebres');
  if(!fromNet && RaidHook.ult) RaidHook.ult();
}
function updUlt(dt){
  const R = G.raid, U = RAID.ult, Q = R.ult, e = G.e, p = G.p; if(!Q) return;
  const t = G.time - Q.t0; Q.x = e.x; Q.y = e.y;
  if(typeof DIM !== 'undefined') DIM.a = Math.max(DIM.a, t < U.charge ? .55*t/U.charge : .45);
  if(t < U.charge){
    G.shake = Math.max(G.shake, .12*t/U.charge);
    if(Math.random() < .9){ const q = R_(0, 6.283), r = R_(120, 220); vp({ x:e.x + Math.cos(q)*r, y:e.y + Math.sin(q)*r*.7, vx:-Math.cos(q)*r*2, vy:-Math.sin(q)*r*1.4, life:.45, s:4, s1:1, kind:'star', col:'#ff5a4a', rot:q }); }
    return;
  }
  for(let k = 0; k < U.rings; k++){
    const tk = U.charge + k*U.gap; if(t < tk) continue;
    const r = 40 + (t - tk)*U.speed;
    if(!Q['b' + k]){ Q['b' + k] = 1; G.shake = Math.max(G.shake, .6); flashScreen(.18); HS = Math.max(HS, .06); if(typeof playSfx === 'function') playSfx('rock'); crater(e.x, e.y + 20, 30, '#ff3b3b'); }
    if(Q.hit[k] || R.out || p.hp <= 0 || p.hid) continue;
    const d = Math.hypot(p.x - Q.x, (p.y - Q.y)*1.15);
    if(Math.abs(d - r) < U.width/2 + p.r*.7){
      Q.hit[k] = 1;
      if(p.dT > 0 || p.inv > 0){ dmgTxt(p.x, p.y - 50, 'ESQUIVÉ !', '#9fe3ff'); continue; }
      hurtP(p.max*U.dmg, { t:'normal', k:'ult' });
      if(p.hp > 0 && typeof throwBack === 'function') throwBack(p, Math.atan2(p.y - Q.y, p.x - Q.x), U.push, .3);
    }
  }
  if(t > U.charge + (U.rings - 1)*U.gap + 2.6) R.ult = null;
}
function drawUlt(){
  const R = G.raid, Q = R && R.ult, U = RAID.ult; if(!Q) return;
  const t = G.time - Q.t0, e = G.e;
  ctx.save();
  if(t < U.charge){                                                 // aperçu : les ondes qui vont partir
    const k = t/U.charge;
    for(let i = 0; i < U.rings; i++){ const r = 60 + ((G.time*120 + i*90) % 320); ctx.globalAlpha = .25*k*(1 - r/400); ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
      ctx.beginPath(); ctx.ellipse(e.x, e.y + 20, r, r/1.15, 0, 0, 6.283); ctx.stroke(); }
    ctx.setLineDash([]); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5*k + .2*Math.sin(G.time*30);
    ctx.drawImage(glow('#ff3b3b'), e.x - 140*k, e.y - 140*k - 40, 280*k, 280*k);
  }
  for(let i = 0; i < U.rings; i++){
    const tk = U.charge + i*U.gap; if(t < tk) continue; const r = 40 + (t - tk)*U.speed; if(r > 900) continue;
    const a = Math.max(0, 1 - r/900);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .55*a; ctx.strokeStyle = '#3a0608'; ctx.lineWidth = U.width + 8;
    ctx.beginPath(); ctx.ellipse(Q.x, Q.y + 20, r, r/1.15, 0, 0, 6.283); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9*a; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = U.width; ctx.stroke();
    ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 4; ctx.stroke();
    if(Math.random() < .6){ const q = R_(0, 6.283); vp({ x:Q.x + Math.cos(q)*r, y:Q.y + 20 + Math.sin(q)*r/1.15, vx:Math.cos(q)*60, vy:-R_(60, 160), life:.5, s:R_(2, 4), s1:2, kind:'snow', col:i % 2 ? '#7a5038' : '#ff7a4a', g:500 }); }
  }
  ctx.restore();
  if(t < U.charge + .4){ const a = Math.min(1, t*4)*(t > U.charge ? 1 - (t - U.charge)/.4 : 1);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; htext('⚠ ATTAQUE ULTIME — ESQUIVE LES ONDES ! ⚠', VW/2, VH/2 + 70, 13, '#ff6a5a', 'center'); ctx.restore(); }
}

// caméra : on regarde un peu plus haut pour voir tout le boss (il est géant)
const _camRaid = updCam;
updCam = function(p, e){ if(isRaid() && e) return _camRaid(p, { x:e.x, y:e.y - 150 }); return _camRaid(p, e); };

// ============================================================ BOUCLE
const _stepRaid = step;
step = function(dt){
  if(!isRaid() || G.over || G.paused) return _stepRaid(dt);
  const R = G.raid, e = G.e, ex = e.x, ey = e.y;
  if(R.net && !R.host) e.next = 1e9;                                // invité : le boss n'agit que sur ordre de l'hôte
  else if(R.ult){ e.next = Math.max(e.next || 0, .4); e.tele = 0; }
  _stepRaid(dt);
  if(!G || G.over || !G.raid) return;
  // le boss reste au centre, tourné vers sa cible
  const busyB = e.rs || e.fl || e.bl || e.bur || e.kb || e.jail;
  if(raidAuth() && e.hp > 0 && !busyB){
    const T = R.tgt || G.p, cx = W/2, cy = H/2 - 20, an = Math.atan2(T.y - cy, T.x - cx), sw = Math.sin(G.time*.5)*40;
    const tx = cx + Math.cos(an)*80 + sw, ty = cy + Math.sin(an)*50, k = Math.min(1, dt*.9*(R.ult ? 0 : 1));
    e.x = ex + (tx - ex)*k; e.y = ey + (ty - ey)*k;
  }
  // barres de vie → rage
  if(raidAuth() && e.hp > 0){ const lvl = RAID.bars - Math.max(1, Math.ceil(e.hp/(e.max/RAID.bars))); if(lvl > R.rage) raidRage(lvl); }
  // attaque ultime
  if(raidAuth() && e.hp > 0 && G.intro <= 0 && !R.ult && !busyB && !e.tele){ R.ultT -= dt; if(R.ultT <= 0) raidUlt(); }
  updUlt(dt);
  // aura : braises rouges qui montent
  if(e.hp > 0 && !e.hid && Math.random() < .7 + R.rage*.1) vp({ x:e.x + R_(-50, 50), y:e.y + R_(-10, 40), vx:R_(-15, 15), vy:R_(-140, -60), life:R_(.5, .9), s:R_(3, 6), s1:1, col:Math.random() < .5 ? '#ff3b3b' : '#ff8a4a', a:.8 });
  // temps écoulé
  if(raidAuth() && !R.won && e.hp > 0 && G.intro <= 0 && raidLeft() <= 0){ R.failed = 'time'; if(RaidHook.fail) RaidHook.fail('time'); G.over = 1; battleEnd(false); }
};
const raidLeft = () => RAID.time - Math.max(0, G.time - G.raid.t0);

// ============================================================ YEUX ROUGES + AURA
//  On repère la TÊTE du sprite (le haut de sa silhouette) et on y allume deux yeux rouges, placés selon la
//  direction où regarde le Pokémon (de face : 2 yeux ; de profil : 1 ; de dos : aucun). Réglage : RAID.eyes.
const RAID_EYE = new WeakMap();
function raidEyes(f, row){
  const key = row | 0; let C = RAID_EYE.get(f); if(C && C[key]) return C[key];
  if(!C){ C = {}; RAID_EYE.set(f, C); }
  const w = f.width, h = f.height, r = { c:f, pts:[] }; C[key] = r; if(!w || !h) return r;
  const d = f.getContext('2d', { willReadFrequently:true }).getImageData(0, 0, w, h).data, A = (i, j) => d[(j*w + i)*4 + 3] > 150;
  let y0 = -1, y1 = -1; for(let j = 0; j < h && y0 < 0; j++) for(let i = 0; i < w; i++) if(A(i, j)){ y0 = j; break; }
  for(let j = h - 1; j >= 0 && y1 < 0; j--) for(let i = 0; i < w; i++) if(A(i, j)){ y1 = j; break; }
  if(y0 < 0) return r;
  const E = RAID.eyes || {}, hy = y0 + (y1 - y0)*(E.head ?? .32);                      // bas de la tête
  let x0 = w, x1 = -1; for(let j = y0; j <= hy; j++) for(let i = 0; i < w; i++) if(A(i, j)){ if(i < x0) x0 = i; if(i > x1) x1 = i; }
  const cx = (x0 + x1)/2, hw = Math.max(4, x1 - x0), ey = Math.round(y0 + (hy - y0)*(E.y ?? .78));
  const dir = [0, 1, 1, null, null, null, -1, -1][key], side = key === 2 || key === 6;
  if(dir === null) return r;                                                            // de dos : pas d'yeux
  if(side) r.pts = [[Math.round(cx + dir*hw*(E.side ?? .28)), ey]];
  else { const o = cx + dir*hw*(E.turn ?? .14), sp = hw*(E.gap ?? .17)*(dir ? .75 : 1); r.pts = [[Math.round(o - sp), ey], [Math.round(o + sp), ey]]; }
  return r;
}
const raidRow = o => rowOf(Math.atan2((o.ty ?? o.y) - o.y, (o.tx ?? o.x) - o.x));
// sol : cercle de lumière rouge sous le boss
const _dgRaid = typeof drawGround === 'function' ? drawGround : null;
drawGround = function(){
  if(_dgRaid) _dgRaid();
  const e = isRaid() && G.e; if(!e || e.hid || e.hp <= 0) return;
  const k = 1 + G.raid.rage*.15, pul = .8 + .2*Math.sin(G.time*4);
  ctx.save(); const g = ctx.createRadialGradient(e.x, e.y + 30, 10, e.x, e.y + 30, 150*k);
  g.addColorStop(0, `rgba(255,40,40,${.45*pul})`); g.addColorStop(.6, `rgba(160,0,10,${.22*pul})`); g.addColorStop(1, 'rgba(120,0,0,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(e.x, e.y + 30, 150*k, 70*k, 0, 0, 6.283); ctx.fill(); ctx.restore();
};
// par-dessus le boss : halo rouge qui pulse + yeux qui brillent
function drawRaidAura(){
  const e = G.e; if(!e || e.hid || e.hp <= 0) return;
  const f = mon(e, 1), k = e.sc || 4, pul = .5 + .5*Math.sin(G.time*5), x0 = e.x - f.width*k/2, y0 = e.y - f.height*k/2 - (e.lift || 0);
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = .1 + .08*pul + G.raid.rage*.03; ctx.drawImage(tint(f, '#ff2020'), x0, y0, f.width*k, f.height*k);
  const E = raidEyes(f, raidRow(e));
  ctx.globalAlpha = .55 + .45*pul;
  for(const [i, j] of E.pts) ctx.drawImage(glow('#ff2020'), x0 + i*k - 14, y0 + j*k - 14, 28 + k, 28 + k);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
  for(const [i, j] of E.pts){ ctx.fillStyle = '#ff2a2a'; ctx.fillRect(x0 + i*k - k/2, y0 + j*k - k/2, k*1.5, k); ctx.fillStyle = '#ffd0c0'; ctx.fillRect(x0 + i*k, y0 + j*k - k/2, k/2, k/2); }
  ctx.restore();
}
const _dbRaid = drawBullets;
drawBullets = function(){ _dbRaid(); if(isRaid()){ drawRaidAura(); drawUlt(); if(RaidHook.draw) RaidHook.draw(); } };

// ============================================================ ATH DE RAID
const RAID_COLS = ['#e8503c', '#f08a30', '#f0c030', '#58c848', '#3ac8e8', '#a05ae8', '#e85aa8'];
const _hudRaid = hud;
hud = function(){
  if(!isRaid()) return _hudRaid();
  const p = G.p, e = G.e, R = G.raid, HW = VW/UIK.hud, BW = Math.max(80, Math.min(150, Math.floor((HW - 2*58 - 80)/2)));
  hudSide(p, 0, HW, BW, NAME[p.t], G.team.map(c => c.hp <= 0 ? 2 : c === p ? 1 : 0), R.net && RaidHook.me ? RaidHook.me() : '');
  // grande barre du boss
  const W2 = Math.min(300, HW - 2*(BW + 70)), x = HW/2 - W2/2, y = 5, B = RAID.bars, seg = e.max/B, hp = Math.max(0, e.hp);
  const cur = Math.max(1, Math.ceil(hp/seg - 1e-6)), within = hp <= 0 ? 0 : (hp - (cur - 1)*seg)/seg;
  glassPanel(x - 6, y, W2 + 12, 44, 'rgba(255,80,70,.75)');
  htext('RAID · ' + (NAME[e.t] || '').toUpperCase(), x, y + 13, 10, '#ffb0a0', 'left');
  const left = Math.max(0, Math.ceil(raidLeft())), tm = Math.floor(left/60) + ':' + String(left % 60).padStart(2, '0');
  htext(tm, x + W2, y + 13, 10, left <= 30 && Math.sin(G.time*8) > 0 ? '#ff5a4a' : '#ffe9a0', 'right');
  ctx.save(); rrect(x - 1, y + 17, W2 + 2, 12, 4); ctx.fillStyle = '#0a0614'; ctx.fill(); ctx.clip();
  if(cur > 1){ ctx.fillStyle = RAID_COLS[(cur - 2) % RAID_COLS.length]; ctx.fillRect(x, y + 18, W2, 10); }
  e.rhg = e.rhg == null ? within : (e.rhg > within ? Math.max(within, e.rhg - DT*.6) : within);
  ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(x, y + 18, W2*e.rhg, 10);
  const col = RAID_COLS[(cur - 1) % RAID_COLS.length], g = ctx.createLinearGradient(0, y + 18, 0, y + 28); g.addColorStop(0, col); g.addColorStop(1, shade(col, -.35));
  ctx.fillStyle = g; ctx.fillRect(x, y + 18, W2*within, 10); ctx.fillStyle = 'rgba(255,255,255,.3)'; ctx.fillRect(x, y + 18, W2*within, 2);
  if(e.invT > G.time){ ctx.fillStyle = `rgba(255,255,255,${.25 + .2*Math.sin(G.time*20)})`; ctx.fillRect(x, y + 18, W2, 10); }
  ctx.restore();
  htext('×' + cur, x + W2 + 4, y + 28, 10, col, 'left');
  for(let i = 0; i < B; i++){ const cx = x + 6 + i*12; ctx.fillStyle = i < cur ? RAID_COLS[i % RAID_COLS.length] : '#2a2238'; ctx.beginPath(); ctx.arc(cx, y + 37, 3.5, 0, 6.283); ctx.fill(); ctx.strokeStyle = '#0c0818'; ctx.lineWidth = 1; ctx.stroke(); }
  if(R.rage) htext('RAGE ' + '▲'.repeat(R.rage), x + W2, y + 40, 8, '#ff6a5a', 'right');
  // alliés
  if(RaidHook.allies){ let yy = 66; RaidHook.allies().forEach(a => {
    glassPanel(6, yy, 140, 18); if(SPR[a.t]){ ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(spr(a.t, 1), 8, yy + 1, 16, 16); ctx.restore(); }
    htext(a.pseudo || '?', 28, yy + 11, 8, a.out ? '#8a8496' : '#bff0c0', 'left');
    const f = a.out ? 0 : Math.max(0, a.hp/(a.max || 1)); ctx.fillStyle = '#0a0614'; ctx.fillRect(92, yy + 6, 48, 6); ctx.fillStyle = a.out ? '#5a5466' : f < .3 ? '#e8503c' : '#46d468'; ctx.fillRect(92, yy + 6, 48*f, 6);
    if(a.out) htext('K.O.', 116, yy + 12, 7, '#ff8a7a', 'center');
    yy += 21; }); }
  if(R.out){ ctx.save(); ctx.globalAlpha = .9; glassPanel(HW/2 - 120, VH/UIK.hud - 64, 240, 22); htext('Ton équipe est K.O. — tes alliés continuent !', HW/2, VH/UIK.hud - 49, 9, '#ffb0a0', 'center'); ctx.restore(); }
  [0, 1].forEach(i => {
    const l = lb[i]; if(!l || l.ttl <= 0) return;
    ctx.font = HUDF(700, 11); const txt = l.s, w = ctx.measureText(txt).width + 22, a = Math.min(1, l.ttl*3);
    const bx = i ? HW/2 - w/2 : 6, by = i ? 54 : 80 + (RaidHook.allies ? RaidHook.allies().length*21 : 0);
    ctx.save(); ctx.globalAlpha = a; glassPanel(bx, by, w, 18, COL[l.t] || null); htext(txt, bx + w/2, by + 13, 11, '#fff', 'center'); ctx.restore();
  });
};

// ============================================================ FIN DU RAID
const _beRaid = battleEnd;
battleEnd = function(win){
  if(!(G && G.cfg && G.cfg.mode === 'raid')) return _beRaid(win);
  const R = G.raid || {};
  if(!win && !R.failed){
    if(R.net && !R.allOut){ if(!R.out){ R.out = true; G.over = 0; G.p.hid = true; if(RaidHook.out) RaidHook.out(); } G.over = 0; return; }   // multi : tu regardes tes alliés
    if(!G.raidEndAt){ G.raidEndAt = G.time + 2.4; G.over = 0; G.p.koDone = 1; menu(''); return; }    // on laisse jouer le K.O.
    if(G.time < G.raidEndAt){ G.over = 0; return; }
  }
  G.over = 1; if(R.ended) return; R.ended = true;
  if(RaidHook.end) RaidHook.end(win);
  raidEndScreen(!!win, R);
};
const _stepRaidEnd = step;
step = function(dt){
  _stepRaidEnd(dt);
  if(G && G.raid && G.raidEndAt && !G.over){ const p = G.p; down[0] = down[1] = down[2] = 0; if(G.time >= G.raidEndAt){ G.raid.failed = G.raid.failed || 'ko'; G.over = 1; battleEnd(false); } }
};
const _pressRaid = press; press = function(i){ if(isRaid() && (G.raid.out || G.raidEndAt)) return; _pressRaid(i); };
const _dashRaid = dash; dash = function(){ if(isRaid() && (G.raid.out || G.raidEndAt)) return; _dashRaid(); };
const _swapRaid = swap; swap = function(){ if(isRaid() && G.raid.out) return; _swapRaid(); };

function raidEndScreen(win, R){
  const c = G.cfg, t = Save.team(c.teamId), s = Math.floor(G.time - (R.t0 || 0)), before = Save.coins(), b = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
  let rew = '';
  if(win){
    const gain = R.net ? RAID.reward.multi : RAID.reward.solo, d = Save.load();
    Save.addCoins(gain); d.raidCrates = (d.raidCrates || 0) + RAID.reward.crates; d.raidWins = (d.raidWins || 0) + 1; Save.save();
    rew = `<div class='gain'><b>+${money(gain)}</b><small>Raid réussi en ${Math.floor(s/60)}:${String(s%60).padStart(2, '0')}</small></div>
      <div class='rcrate'><img src='${crateImg()}'><p><b>+${RAID.reward.crates} Caisse de raid</b><br><small>à ouvrir maintenant ou plus tard (Magasin → Caisses)</small></p></div>
      <p>Solde : <span id='gsol'>${money(before)}</span></p>`;
  }
  const why = R.failed === 'time' ? 'Le temps est écoulé…' : R.failed === 'host' ? 'L\'hôte a quitté le raid.' : 'Toute l\'équipe est K.O.…';
  menu(`<h1>${win ? '🏆 Raid réussi !' : 'Raid échoué'}</h1>${win ? rew : `<p>${why}</p><p class='hint'>${esc(NAME[G.e.t] || '')} : ${Math.round(Math.max(0, G.e.hp)/G.e.max*100)} % de PV restants</p>`}
    <div class='row'>${win ? `<button class='btn' id='rc'>Ouvrir la caisse</button>` : ''}${R.net ? '' : `<button class='${win ? 'btn2' : 'btn'}' id='rp'>${win ? 'Rejouer' : 'Réessayer'}</button>`}
    <button class='btn2' id='rr'>Raids</button><button class='btn2' id='mn'>Menu</button></div>`);
  if(win){ countUp(document.getElementById('gsol'), before, Save.coins()); if(typeof playSfx === 'function') playSfx('victory'); }
  b('rc', () => { G = null; openCrate('raid'); });
  b('rp', () => startRaid(t)); b('rr', () => SCREENS.raid()); b('mn', showMain);
}

// ============================================================ CAISSES DE RAID (Magasin)
const raidCrates = () => Save.load().raidCrates || 0;
const _openRaid = openCrate;
openCrate = function(id){
  if(id !== 'raid') return _openRaid(id);
  const d = Save.load(); if(!(d.raidCrates > 0)) return showShop('crates');
  d.raidCrates--; Save.save(); return _openRaid(id);
};
const _shopRaid = showShop;
showShop = function(tab){
  const i = SHOP.findIndex(o => o.id === 'raid'), n = raidCrates();
  if(n > 0 && i < 0) SHOP.push({ id:'raid', type:'crate', crate:'raid', label:'Caisse de raid', desc:'Gagnée en raid' });
  if(n <= 0 && i >= 0) SHOP.splice(i, 1);
  _shopRaid(tab);
  const el = document.querySelector("[data-o='raid'] .tag"); if(el){ el.textContent = '×' + n + ' · Gratuit'; el.classList.remove('bad'); }
};
SCREENS.shop = showShop;
const _crateRaid = showCrate;
showCrate = function(id){
  _crateRaid(id); if(id !== 'raid') return;
  const op = document.getElementById('op'); if(op){ op.disabled = raidCrates() <= 0; op.textContent = 'Ouvrir — ×' + raidCrates(); }
  const back = document.getElementById('back'); if(back) back.onclick = () => showShop('crates');
};

// ============================================================ ÉCRAN « COMBAT RAID »
{ const i = MAIN_MENU.findIndex(m => m.id === 'boss'); MAIN_MENU.splice(i >= 0 ? i + 1 : 1, 0, { id:'raid', label:'Combat Raid', desc:'Un Pokémon géant, seul ou jusqu\'à 4 joueurs', screen:'raid' }); }
function raidTeams(){ return Save.teams().filter(t => teamOk(t) && t.members.some(id => typeof Owned === 'undefined' || Owned.has(id))); }
function showRaid(sel){
  sel = sel || {};
  const teams = raidTeams();
  if(!teams.length){ menu(`<h1>Combat Raid</h1><p>Crée d'abord une équipe.</p><div class='row'><button class='btn' id='mk'>Mes équipes</button><button class='btn2' id='back'>Retour</button></div>`);
    document.getElementById('mk').onclick = showTeams; document.getElementById('back').onclick = showMain; return; }
  const t = sel.team || teams.find(x => x.id === Save.lastTeam) || teams[0], used = t.members.slice(0, RAID.teamMax), P = POKEMON[RAID.boss], d = Save.load();
  menu(`<div class='hd'><h1>Combat Raid</h1>${walletHtml()}</div>
    <div class='edit raidv'>
      <div class='left rboss'><canvas id='rbcv' width='200' height='170'></canvas><b>${esc(P.name)}</b><small>${P.types.map(tp => `<span class='tc' style='background:${COL[tp]}'>${TN[tp] || tp}</span>`).join('')}</small></div>
      <div class='scroll right'>
        <p><b class='gold'>${RAID.bars} barres de vie</b> — à chaque barre perdue il passe en <b style='color:#ff6a5a'>RAGE</b>.</p>
        <p><b style='color:#ff6a5a'>Attaque ultime</b> : des ondes de choc rouges partent de lui → <b>esquive au moment où l'onde arrive</b> pour passer à travers !</p>
        <p>Temps limite : ${Math.floor(RAID.time/60)} min. Seul : <b>très difficile</b>. À plusieurs (jusqu'à ${RAID.maxPlayers}) : bien plus simple.</p>
        <p>Récompense : <b class='gold'>${money(RAID.reward.solo)}</b> en solo · <b class='gold'>${money(RAID.reward.multi)}</b> à plusieurs + <b>Caisse de raid</b></p>
        ${P.moves.map(m => `<p class='mvl'><b>${esc(m.name)}</b> <span class='tc' style='background:${COL[m.type]}'>${TN[m.type] || m.type}</span></p>`).join('')}
        <p class='hint'>Raids réussis : ${d.raidWins || 0} · Caisses de raid à ouvrir : ${raidCrates()}</p>
      </div></div>
    <div class='row'>${teams.map(x => `<button class='btn2 sm ${x.id === t.id ? 'on' : ''}' data-team='${x.id}'>${esc(x.name)}</button>`).join('')}
      <span class='rtm'>${used.map(id => thumb(id)).join('')}</span><small class='hint'>3 Pokémon max</small></div>
    <div class='row'><button class='btn' id='rsolo'>Raid solo</button>${RaidHook.menuButtons ? RaidHook.menuButtons() : ''}<button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-team]', el => showRaid({ team:Save.team(el.dataset.team) }));
  document.getElementById('rsolo').onclick = () => startRaid(t);
  document.getElementById('back').onclick = showMain;
  if(RaidHook.bindMenu) RaidHook.bindMenu(t);
  raidPreview();
}
SCREENS.raid = showRaid;
// aperçu animé du boss : géant, aura rouge, yeux rouges
function raidPreview(){
  const cv = document.getElementById('rbcv'); if(!cv) return; const c = cv.getContext('2d'), id = RAID.boss, S = SPR[id], t0 = performance.now();
  const loop = now => {
    if(!cv.isConnected) return; const t = (now - t0)/1000; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 200, 170); c.imageSmoothingEnabled = false;
    const g = c.createRadialGradient(100, 130, 6, 100, 120, 100); g.addColorStop(0, `rgba(255,40,40,${.5 + .15*Math.sin(t*4)})`); g.addColorStop(1, 'rgba(120,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, 200, 170);
    if(S){ const an = resolveAnim(S, 'Idle') || 'Idle', fr = snFrame(id, an, 1, frameAt(S, an, t*44, 1)), E = raidEyes(fr, 1), k = 3;
      const x0 = 100 - fr.width*k/2, y0 = 70 - fr.height*k/2; c.drawImage(fr, x0, y0, fr.width*k, fr.height*k);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = .15 + .1*Math.sin(t*5); c.drawImage(tint(fr, '#ff2020'), x0, y0, fr.width*k, fr.height*k);
      c.globalAlpha = .6 + .4*Math.sin(t*5); E.pts.forEach(([i, j]) => c.drawImage(glow('#ff2020'), x0 + i*k - 10, y0 + j*k - 10, 22, 22));
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; E.pts.forEach(([i, j]) => { c.fillStyle = '#ff2a2a'; c.fillRect(x0 + i*k - 1, y0 + j*k - 1, 4, 3); }); }
    for(let i = 0; i < 6; i++){ const y = 160 - ((t*40 + i*29) % 140); c.fillStyle = i % 2 ? '#ff5a3a' : '#ff9a6a'; c.fillRect(40 + (i*37 % 120) + Math.sin(t*2 + i)*6, y, 2, 2); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
document.head.insertAdjacentHTML('beforeend', `<style>
.raidv{flex:1 1 auto;min-height:0;align-items:stretch}
.raidv .rboss{flex:0 0 auto;display:flex;flex-direction:column;align-items:center;justify-content:center;background:radial-gradient(ellipse at 50% 70%,rgba(120,10,20,.45),rgba(10,8,24,.5))!important}
.raidv .rboss canvas{width:200px;height:170px;image-rendering:pixelated}.raidv .rboss b{color:#ffb0a0}
.raidv .right p{margin:3px 0;font-size:11px}.rtm img{width:28px;height:28px;image-rendering:pixelated}
.rcrate{display:flex;align-items:center;gap:10px;justify-content:center;text-align:left}.rcrate img{width:72px;image-rendering:pixelated;filter:drop-shadow(0 0 8px #ff6a5a)}
</style>`);
