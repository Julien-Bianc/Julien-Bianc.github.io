// ============================================================
//  patch-v0172.js — correctif v0.17.2 (rapport de test v0.17.1)
//    1. Raid à plusieurs : l'allié ne « vibre » plus (sa position n'est plus écrasée par la cible du sprite)
//    2. Yeux rouges des boss de raid : placés sur les vrais yeux (point « tête » des sprites PMD + table EYES)
//    3. PC : attaques à la SOURIS (clic gauche = A, clic droit = B, clic molette = C) ;
//       maintenir (souris ou J/K/L) + bouger la souris = viser ; relâcher = tirer. Clic bref sans bouger = tir assisté.
//    4. Boss de raid : vise chacun son tour, le plus proche, au hasard, ou TOUS les joueurs à la fois ;
//       plus fort (cadence, dégâts) à chaque joueur en plus (RAID.perPlayer)
//    5. Rayons (Luminocanon…) : touchent pendant toute leur durée (traverser le rayon fait des dégâts)
//       Aurasphère : repousse le Pokémon touché
//    6. Raids 1 à 3 ★ : objet bonus commun ou peu commun possible (data/raid.js → bonus.held)
//    7. Raids : 4 attaques spéciales de boss (Traque, Tempête, Charge, Rayon balayant) — réglages : RAID.specials
// ============================================================

// ---------- 1. alliés du raid : position réseau séparée ----------
const _rnMsgV172 = rnMsg;
rnMsg = function(M, k, d){
  const r = _rnMsgV172(M, k, d);
  if(k === 's' && M && M.allies && d){ const a = M.allies.get(d.id); if(a){ a.nx = d.x; a.ny = d.y; } }
  return r;
};
const _stepV172a = step;
step = function(dt){
  // animOf() (dessin) remplace a.tx/a.ty par la position du boss : on remet la vraie cible avant le lissage
  if(typeof rnOn === 'function' && rnOn()) for(const a of RNET.m.allies.values()) if(a.nx != null){ a.tx = a.nx; a.ty = a.ny; }
  return _stepV172a(dt);
};

// ---------- 2. yeux rouges ----------
//  Position des yeux par rapport au point « tête » du sprite (pixel noir de <Anim>-Offsets.png), en pixels.
//  [ de face, de 3/4 (bas-droite), de profil (droite) ] — la gauche est la même chose en miroir, de dos : pas d'yeux.
//  Nouveau boss de raid : ajoute sa ligne (sinon l'ancien placement automatique est utilisé).
const EYES = {
  farfuret:  [[[-3, -5], [3, -5]], [[-3, -3], [3, -5]], [[-2, -4]]],
  fouinar:   [[[-3, -2], [2, -2]], [[-2, -2], [2, -2]], [[-2, -2]]],
  rondoudou: [[[-4, -3], [3, -3]], [[-5, -3], [3, -3]], [[-3, -3]]],
  raichu:    [[[-3, -3], [3, -3]], [[-4, -3], [1, -3]], [[-2, -4]]],
  alakazam:  [[[-3, -2], [3, -2]], [[-3, -1], [1, -2]], [[-2, -2]]],
  gardevoir: [[[-2, -3], [2, -3]], [[-3, -3], [1, -3]], [[-1, -3]]],
  lucario:   [[[-2, -3], [2, -3]], [[-3, -3], [1, -3]], [[-1, -2]]],
  ectoplasma:[[[-4, -4], [4, -4]], [[-2, -4], [3, -4]], [[-2, -4]]],
  cizayox:   [[[-3, -2], [3, -2]], [[-3, -2], [1, -2]], [[-3, -1]]],
  tortank:   [[[-4, -5], [3, -5]], [[-4, -4], [0, -4]], [[-3, -3]]],
  dracaufeu: [[[-3, -4], [3, -4]], [[-5, -4], [-1, -4]], [[-3, -3]]],
  florizarre:[[[-5, -4], [5, -4]], [[-5, -3], [0, -3]], [[-4, 3]]],
  carchacrok:[[[-3, -3], [3, -3]], [[-1, -3], [2, -3]], [[-1, -2]]],
  tyranocif: [[[-3, -1], [3, -1]], [[-2, -1], [1, -1]], [[-1, -1]]],
  mewtwo:    [[[-3, -2], [3, -2]], [[-2, -2], [2, -3]], [[-1, -2]]]
};
const HEADS = {};
function headRows(img, fw, fh, nf){
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently:true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, Wd = c.width, nr = Math.max(1, Math.floor(c.height/fh)), rows = [];
  for(let r = 0; r < nr; r++){ const row = [];
    for(let f = 0; f < nf; f++){ let hp = null;
      for(let y = 0; y < fh && !hp; y++) for(let xx = 0; xx < fw; xx++){ const o = ((r*fh + y)*Wd + f*fw + xx)*4; if(d[o + 3] > 0 && d[o] < 40 && d[o + 1] < 40 && d[o + 2] < 40){ hp = [xx, y]; break; } }
      row.push(hp); }
    rows.push(row); }
  return rows;
}
function loadHeads(id){
  if(HEADS[id] || !SPR[id] || !EYES[id]) return;
  const S = SPR[id], H = HEADS[id] = {}, base = S.def.folder.replace(/\/?$/, '/');
  Object.keys(S.D.anim).forEach(an => { const d = S.D.anim[an]; loadImg(base + an + '-Offsets.png').then(img => { H[an] = headRows(img, d.fw, d.fh, d.dur.length); }).catch(() => {}); });
}
const _snV172 = snFrame;
snFrame = function(id, an, row, fi){
  const cv = _snV172(id, an, row, fi);
  if(cv.hd === undefined && EYES[id]){
    cv.pid = id; const H = HEADS[id] && HEADS[id][an], S = SPR[id], d = S.D.anim[an], im = S.IM[an];
    if(H && im && im.naturalWidth){
      const nr = Math.floor(im.naturalHeight/d.fh), r = nr >= 8 ? row : 0, hp = H[r] && H[r][fi];
      if(hp){ const a2 = (S.D.anc[an] && S.D.anc[an][r] && S.D.anc[an][r][fi]) || [d.fw/2, d.fh*.72], C = S.D.cs; cv.hd = [C/2 - a2[0] + hp[0], C/2 + 14 - a2[1] + hp[1]]; cv.hr = r; }
      else cv.hd = null;
    }
  }
  return cv;
};
const _reV172 = raidEyes;
raidEyes = function(f, row){
  if(f.pid) loadHeads(f.pid);
  if(!f.hd) return _reV172(f, row);
  const r = f.hr ?? row, src = [0, 1, 2, null, null, null, 2, 1][r], sg = r >= 6 ? -1 : 1;
  if(src == null) return { pts:[] };
  return { pts:EYES[f.pid][src].map(([dx, dy]) => [f.hd[0] + dx*sg + .25, f.hd[1] + dy + .5]) };
};

// ---------- 3. PC : attaques à la souris ----------
const MBTN = { 0:0, 2:1, 1:2 }, MHOLD = {}; let lastPT = 'mouse';
const inFight = () => G && !G.over && !G.paused && G.p && (document.getElementById('menu').style.display !== 'flex');
const mouseOk = t => t && (t === cv || t.id === 'joyzone' || t.id === 'app' || t.id === 'ui') && !(t.closest && t.closest('button,#menu,#btns,input,select,a'));
function setMouse(e){
  const r = cv.getBoundingClientRect(), s = Math.min(r.width/VW, r.height/VH), ox = r.left + (r.width - VW*s)/2, oy = r.top + (r.height - VH*s)/2;
  AIM.mouse = { x:(e.clientX - ox)/s, y:(e.clientY - oy)/s }; AIM.mouseT = performance.now();
}
const _aimKey = AIM.key.bind(AIM);
AIM.key = function(i){ this.on[i] = 0; MHOLD[i] = { mx:this.mouse ? this.mouse.x : 0, my:this.mouse ? this.mouse.y : 0, moved:0 }; };   // J/K/L : la visée commence si la souris bouge
//  (v0.18) tout passe par les événements « pointer » : bloquer pointerdown empêchait les mousedown d'arriver.
//  e.buttons (1 gauche, 2 droit, 4 molette) dit quels boutons sont enfoncés ; on compare avec l'état précédent.
let mMask = 0;
function mouseButtons(e, start){
  const was = mMask; mMask = e.buttons;
  for(const [bit, i] of [[1, 0], [2, 1], [4, 2]]){
    const on = !!(e.buttons & bit), before = !!(was & bit);
    if(on && !before && start){ setMouse(e); press(i); if(down[i]) AIM.key(i); }
    else if(!on && before && MHOLD[i]) rel(i);
  }
}
addEventListener('pointerdown', e => {
  lastPT = e.pointerType;
  if(e.pointerType !== 'mouse' || !inFight() || !mouseOk(e.target)) return;
  if(typeof sfPickAt === 'function' && sfPickAt(e)){ e.stopImmediatePropagation(); e.preventDefault(); return; }   // v0.21 : Safari, clic sur un Pokémon = cible
  e.stopPropagation(); e.preventDefault(); mouseButtons(e, true);       // pas de joystick tactile au clic de souris
}, true);
addEventListener('pointermove', e => {
  if(e.pointerType !== 'mouse') return;
  setMouse(e);
  if(e.buttons !== mMask) mouseButtons(e, inFight());                   // 2e bouton appuyé / relâché pendant un maintien
  for(const k in MHOLD){ const h = MHOLD[k], i = +k; if(!down[i]){ delete MHOLD[k]; continue; }
    if(!h.moved && Math.hypot(AIM.mouse.x - h.mx, AIM.mouse.y - h.my) > 10) h.moved = 1;
    if(h.moved) _aimKey(i); }
}, true);
addEventListener('pointerup', e => { if(e.pointerType === 'mouse') mouseButtons(e, false); }, true);
addEventListener('blur', () => { mMask = 0; });
addEventListener('contextmenu', e => { if(G && mouseOk(e.target)) e.preventDefault(); });
rel = (prev => function(i){
  const h = MHOLD[i];
  if(h){ delete MHOLD[i]; if(h.moved) _aimKey(i); else AIM.on[i] = 0; }
  return prev(i);
})(rel);

// ---------- 4. boss de raid : cibles variées, plus fort à plusieurs ----------
raidTarget = function(){
  const L = raidTargets(), e = G.e, R = G.raid; if(!L.length) return null;
  if(L.length === 1) return R.tgt = L[0];
  const q = Math.random(), d = o => Math.hypot(o.x - e.x, o.y - e.y);
  if(q < .4){ R.rr = ((R.rr || 0) + 1) % L.length; return R.tgt = L[R.rr]; }            // chacun son tour
  if(q < .75) return R.tgt = L.reduce((b, o) => d(o) < d(b) ? o : b);                    // le plus proche
  return R.tgt = L[Math.floor(Math.random()*L.length)];                                  // au hasard
};
raidFire = function(){
  const e = G.e, R = G.raid; if(!raidAuth() || R.ult) return;
  const L = raidTargets(); if(!L.length) return;
  const all = L.length > 1 && Math.random() < .35, T = all ? L : [raidTarget()];         // parfois : tout le monde à la fois
  const m = MV[e.t][e.pat], S = G.stage; lbl(1, m.n, e.t); e.atk = e.atkD = .35;
  const sc = S.dmg*Math.pow(RCF().rage.dmg, R.rage)*(isBig(m) ? .85 : 1)*(all ? .85 : 1), sp = (m.fan && m.fan.speed) || m.s || 300;
  T.forEach(t => {
    const k = Math.hypot(t.x - e.x, t.y - e.y)/Math.max(120, sp*.9)*S.aim, d = { x:clX(t.x + (t.vx || 0)*k), y:clY(t.y + (t.vy || 0)*k), r:t.r || 14 };
    cast(e, d, m, .5, 0, sc, undefined);
    if(RaidHook.cast) RaidHook.cast({ i:e.pat, x:r2(d.x), y:r2(d.y), r:d.r, sc:r2(sc) });
  });
};
raidCfg = (prev => function(stars){
  const c = prev(stars), S = RAID_STARS[stars] || {};
  c.specials = { ...(RAID.specials || {}), ...(S.specials || {}) }; return c;
})(raidCfg);
const _spawnV172 = spawn;
spawn = function(){
  _spawnV172();
  const R = G && G.raid; if(!R) return;
  SPX.length = 0; R.spT = (RCF().specials || {}).first || 6;
  const n = Math.max(0, (R.n || 1) - 1), PP = RAID.perPlayer; if(!n || !PP) return;
  G.stage.rate *= Math.pow(PP.rate, n); G.stage.tele *= Math.pow(PP.tele, n); G.stage.dmg *= Math.pow(PP.dmg, n);
  R.base = { ...G.stage };
};

// ---------- 5. rayons qui touchent pendant toute leur durée + recul de l'Aurasphère ----------
updBeams = function(dt){
  for(let i = BEAMS.length - 1; i >= 0; i--){
    const q = BEAMS[i]; q.t += dt;
    if(!q.done){ q.x = q.s.x; q.y = q.s.y; if(Math.random() < .8 && q.delay){ const r = R_(20, 40), an = R_(0, 6.283); vp({ x:q.x + Math.cos(q.a)*16 + Math.cos(an)*r, y:q.y + Math.sin(q.a)*16 + Math.sin(an)*r, vx:-Math.cos(an)*r*3, vy:-Math.sin(an)*r*3, life:.3, s:3, s1:1, col:q.col }); } }
    if(!q.done && q.t >= q.delay){ q.done = 1; G.shake = Math.max(G.shake, .2); addLight(q.x, q.y, 70, q.col, .3, .7); }
    if(q.done && !q.hit && q.t < q.delay + q.life*.9){
      const tg = foeOf(q.own), dx = tg.x - q.x, dy = tg.y - q.y, al = dx*Math.cos(q.a) + dy*Math.sin(q.a), pd = Math.abs(-dx*Math.sin(q.a) + dy*Math.cos(q.a));
      if(visible(tg) && al > -tg.r && al < q.len && pd < tg.r + q.w/2 + 4){ q.hit = 1; if(hurtSide(q.own, q.dm, { t:q.tp, k:'beam', own:q.own, status:q.status })) return; }
    }
    if(q.t > q.delay + q.life) BEAMS.splice(i, 1);
  }
};
const KNOCK = { 'Aurasphère':85 };                               // nom de l'attaque → distance de recul
fan = (prev => function(s, d, m){
  const n0 = bullets.length, r = prev.apply(this, arguments), k = (m.fan && m.fan.knock) || KNOCK[m.n] || 0;
  if(k) for(let i = n0; i < bullets.length; i++) bullets[i].knock = k;
  return r;
})(fan);
const knockOf = (o, b) => { if(!b || !b.knock || !o || o.hp <= 0 || o.raid) return; const a = Math.hypot(b.vx || 0, b.vy || 0) ? Math.atan2(b.vy, b.vx) : 0; throwBack(o, a, b.knock, .22); };
hurtE = (prev => function(d, b){ const e = G && G.e, h = e && e.hp, r = prev(d, b); if(e && e.hp < h) knockOf(e, b); return r; })(hurtE);
hurtP = (prev => function(d, b){ const p = G && G.p, h = p && p.hp, r = prev(d, b); if(G && p === G.p && p.hp < h) knockOf(p, b); return r; })(hurtP);

// ---------- 6. butin bonus : rareté au choix dans une liste ----------
//  l'écran Raid affiche RAR[held] : on crée une entrée pour chaque liste (ex. ['C', 'PC'] → « commun ou peu commun »)
Object.values(RAID_STARS).forEach(S => { const B = S.reward && S.reward.bonus; if(!B) return;
  ['held', 'caps'].forEach(k => { const v = B[k]; if(!Array.isArray(v) || RAR[v]) return; const L = [...new Set(v)].filter(r => RAR[r]);
    RAR[v] = { ...RAR[L[L.length - 1]], label:L.map(r => RAR[r].label).join(' ou ') }; }); });
raidBonus = function(B){
  if(!B || Math.random() >= (B.chance ?? 1)) return [];
  shopBuild(); const out = [], pick = L => L[Math.floor(Math.random()*L.length)], rar = v => Array.isArray(v) ? pick(v) : v;
  if(B.held){ const r = rar(B.held), L = HELD.filter(h => h.r === r); if(L.length) out.push(ITEM[pick(L).id]); }
  if(B.caps && typeof CAPSULES !== 'undefined'){ const r = rar(B.caps), L = CAPSULES.filter(h => h.r === r); if(L.length) out.push(ITEM[pick(L).id]); }
  out.filter(Boolean).forEach(it => Save.addItem(it.id, 1));
  return out.filter(Boolean);
};

// ---------- 7. attaques spéciales de boss ----------
const SPX = [];
const SP_INFO = {
  chase: ['Traque Titanesque', '⚠ TRAQUE — NE RESTE PAS SUR PLACE !', 2.2],
  spiral:['Tempête Furieuse', '⚠ TEMPÊTE — FAUFILE-TOI ENTRE LES PROJECTILES !', 2.8],
  dash:  ['Charge du Titan', '⚠ CHARGE — ÉCARTE-TOI DE LA LIGNE !', 1.6],
  sweep: ['Rayon Dévastateur', '⚠ RAYON — ROULADE AU BON MOMENT POUR LE TRAVERSER !', 3.6]
};
const spDmg = f => Math.max(1, G.p.max*f*((RCF().specials || {}).power || 1)*Math.pow(RCF().rage.dmg, G.raid.rage));
function spMake(kind){
  const e = G.e, tp = typesOf(e.t)[0], T = raidTarget() || G.p, a = Math.atan2(T.y - e.y, T.x - e.x), st = RCF().stars || 3;
  if(kind === 'chase')  return { k:kind, tp, f:.13, n:3 + Math.min(3, st), gap:.32, delay:.7 };
  if(kind === 'spiral') return { k:kind, tp, f:.07, a0:+R_(0, 6.283).toFixed(2), spin:(Math.random() < .5 ? 1 : -1)*.42, arms:st >= 4 ? 5 : st >= 2 ? 4 : 3, dur:2 + st*.15, sp:170 + st*12 };
  if(kind === 'dash'){ const L = 520, x1 = clX(e.x + Math.cos(a)*L), y1 = clY(e.y + Math.sin(a)*L);
    return { k:kind, tp, f:.2, x0:r2(e.x), y0:r2(e.y), x1:r2(x1), y1:r2(y1), tele:.8 - st*.04 }; }
  return { k:kind, tp, f:.18, a0:+(a - 1.3).toFixed(2), arc:2.6 + st*.25, dir:1, tele:1.1, dur:1.6 + st*.1 };
}
function spApply(Q){
  const e = G.e, I = SP_INFO[Q.k]; if(!I || !e) return;
  const o = { ...Q, t0:G.time, dm:spDmg(Q.f), col:lcol(Q.tp), n0:0, hitT:0 };
  SPX.push(o); lbl(1, I[0], Q.tp); if(typeof playSfx === 'function') playSfx('charge');
  G.raid.zBanner = { t0:G.time, s:I[1] }; e.next = Math.max(e.next || 0, I[2]); e.tele = 0;
  if(Q.k === 'dash' && SPR[e.t]) e.ann = { an:resolveAnim(SPR[e.t], 'Charge') || 'Idle', t0:G.time };
}
const meHit = () => !G.raid.out && G.p.hp > 0 && !G.p.hid;
function spUpdate(dt){
  const e = G.e, p = G.p;
  for(let i = SPX.length - 1; i >= 0; i--){
    const o = SPX[i], t = G.time - o.t0;
    if(o.k === 'chase'){                                         // impacts successifs sur TA position
      while(o.n0 < o.n && t >= o.n0*o.gap){ o.n0++; if(meHit()) ZONES.push({ x:clX(p.x), y:clY(p.y), R:42, t:0, delay:o.delay, dm:o.dm, own:0, tp:o.tp, look:o.n0 % 2 ? 'meteor' : 'pillar', status:null, done:0, col:o.col, seed:Math.random() }); }
      if(t > o.n*o.gap + o.delay + .2) SPX.splice(i, 1);
    } else if(o.k === 'spiral'){                                // spirale de projectiles
      while(o.n0*.11 <= Math.min(t, o.dur)){ const a = o.a0 + o.n0*o.spin;
        for(let k = 0; k < o.arms; k++){ const b = a + k*6.283/o.arms; bullets.push({ x:e.x + Math.cos(b)*30, y:e.y - 10 + Math.sin(b)*24, vx:Math.cos(b)*o.sp, vy:Math.sin(b)*o.sp, r:8, d:o.dm, t:o.tp, k:'fan', own:0, life:3.2, hit:0, age:0, col:o.col }); }
        o.n0++; }
      if(t > o.dur) SPX.splice(i, 1);
    } else if(o.k === 'dash'){                                  // le boss fonce en ligne droite
      if(t >= o.tele){
        const u = Math.min(1, (t - o.tele)/.42), k = 1 - Math.pow(1 - u, 2);
        e.x = o.x0 + (o.x1 - o.x0)*k; e.y = o.y0 + (o.y1 - o.y0)*k;
        if(Math.random() < .9) vp({ x:e.x + R_(-30, 30), y:e.y + 20, vx:R_(-40, 40), vy:R_(-60, -20), life:.5, s:10, s1:22, kind:'smoke', col:'#3a0a0c', a:.6, fr:2 });
        if(!o.hit && meHit() && Math.hypot(p.x - e.x, p.y - e.y) < e.r*.85 + p.r){ o.hit = 1; const a = Math.atan2(p.y - e.y, p.x - e.x);
          if(!(p.dT > 0 || p.inv > 0)){ if(hurtP(o.dm, { t:o.tp, k:'strike', own:0 })) return; if(p.hp > 0) throwBack(p, a, 170, .3); } }
        if(u >= 1 && !o.end){ o.end = 1; G.shake = Math.max(G.shake, .55); flashScreen(.12); groundRing(e.x, e.y + 20, 20, 140, o.col, .5, 5); crater(e.x, e.y + 20, 34, '#ff3b3b'); if(typeof playSfx === 'function') playSfx('rock');
          if(!o.hit && meHit() && Math.hypot(p.x - e.x, (p.y - e.y)*1.15) < 120 && !(p.dT > 0 || p.inv > 0)){ o.hit = 1; if(hurtP(o.dm*.6, { t:o.tp, k:'strike', own:0 })) return; } }
      }
      if(t > o.tele + .8) SPX.splice(i, 1);
    } else if(o.k === 'sweep'){                                 // rayon qui balaie l'arène
      if(t >= o.tele && t < o.tele + o.dur){
        const ang = o.a0 + o.dir*o.arc*(t - o.tele)/o.dur, dx = p.x - e.x, dy = p.y - (e.y - 20), al = dx*Math.cos(ang) + dy*Math.sin(ang), pd = Math.abs(-dx*Math.sin(ang) + dy*Math.cos(ang));
        G.shake = Math.max(G.shake, .12);
        if(meHit() && al > 0 && al < 900 && pd < 22 + p.r*.6 && G.time > o.hitT){ o.hitT = G.time + .5; if(hurtP(o.dm, { t:o.tp, k:'beam', own:0 })) return; }
      }
      if(t > o.tele + o.dur + .2) SPX.splice(i, 1);
    }
  }
}
function spDraw(){
  const e = G.e; if(!SPX.length || !e) return;
  for(const o of SPX){
    const t = G.time - o.t0; ctx.save();
    if(o.k === 'dash' && t < o.tele){
      const a = Math.atan2(o.y1 - o.y0, o.x1 - o.x0), L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0), u = t/o.tele;
      ctx.translate(o.x0, o.y0 + 20); ctx.rotate(a); ctx.globalAlpha = .25 + .15*Math.sin(G.time*30); ctx.fillStyle = '#ff2a2a'; ctx.fillRect(0, -e.r*.9, L, e.r*1.8);
      ctx.globalAlpha = .55; ctx.fillRect(0, -e.r*.9, L*u, e.r*1.8); ctx.strokeStyle = '#ffd0a0'; ctx.lineWidth = 2; ctx.strokeRect(0, -e.r*.9, L, e.r*1.8);
    } else if(o.k === 'sweep'){
      const cx = e.x, cy = e.y - 20;
      if(t < o.tele){ ctx.globalAlpha = .18 + .12*Math.sin(G.time*20); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, 700, Math.min(o.a0, o.a0 + o.dir*o.arc), Math.max(o.a0, o.a0 + o.dir*o.arc)); ctx.closePath(); ctx.fill();
        ctx.globalAlpha = .8; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 3; ctx.setLineDash([16, 10]); ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(o.a0)*700, cy + Math.sin(o.a0)*700); ctx.stroke(); ctx.setLineDash([]);
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = t/o.tele; ctx.drawImage(glow(o.col), cx - 60, cy - 60, 120, 120);
      } else if(t < o.tele + o.dur){
        const ang = o.a0 + o.dir*o.arc*(t - o.tele)/o.dur; ctx.translate(cx, cy); ctx.rotate(ang); ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = .55; ctx.fillStyle = o.col; ctx.fillRect(0, -26, 900, 52); ctx.globalAlpha = .9; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, -9, 900, 18);
        ctx.globalAlpha = 1; ctx.drawImage(glow(o.col), -50, -50, 100, 100);
        if(Math.random() < .9){ const d = R_(60, 700); vp({ x:cx + Math.cos(ang)*d, y:cy + Math.sin(ang)*d, vx:R_(-60, 60), vy:R_(-120, -40), life:.4, s:R_(3, 5), s1:1, col:o.col }); }
      }
    } else if(o.k === 'spiral' && t < o.dur){ ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .4 + .2*Math.sin(G.time*25); ctx.drawImage(glow(o.col), e.x - 70, e.y - 90, 140, 140); }
    ctx.restore();
  }
}
const _stepV172b = step;
step = function(dt){
  _stepV172b(dt);
  if(!isRaid() || !G || G.over || G.paused) return;
  const R = G.raid, e = G.e, S = RCF().specials;
  spUpdate(dt); if(!G || G.over) return;
  if(!raidAuth() || !S || !S.kinds || e.hp <= 0 || G.intro > 0 || R.ult || SPX.length || e.kb || e.jail) return;
  if(R.spT == null) R.spT = S.first || 6;
  R.spT -= dt; if(R.spT > 0) return;
  const n = Math.max(0, (R.n || 1) - 1), PP = RAID.perPlayer || {};
  R.spT = (S.every || 9)*Math.pow(.88, R.rage)*Math.pow(PP.special || 1, n);
  if(R.zoneT != null && R.zoneT < 2.5) R.zoneT += 2.5;                 // pas de zones en même temps
  const L = S.kinds.filter(k => k !== R.lastSp && SP_INFO[k]), kind = L[Math.floor(Math.random()*L.length)] || S.kinds[0]; R.lastSp = kind;
  const Q = spMake(kind); spApply(Q);
  if(typeof rnOn === 'function' && rnOn() && RNET.m.host) rsend('bx', Q);
};
const _rnMsgV172b = rnMsg;
rnMsg = function(M, k, d){ if(k === 'bx'){ if(!M.host && M.state === 'fight' && G && G.raid && d && d.k) spApply(d); return; } return _rnMsgV172b(M, k, d); };
const _dbV172 = drawBullets;
drawBullets = function(){ _dbV172(); if(isRaid()) spDraw(); };
