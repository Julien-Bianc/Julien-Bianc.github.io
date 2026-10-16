// ============================================================
//  patch-v019.js — v0.19.0 (rapport de test v0.18)
//    1. Solo : équipes FIXES de l'ordinateur à chaque niveau (data/chapters.js → teams3 / teams6)
//       Niveaux 11 à 20 un peu plus faciles (PV / dégâts / boss) → SOLO_CH2
//    2. Corps à corps VISÉ : le Pokémon va jusqu'au bout de la portée affichée (comme en tir auto)
//    3. Limite de charge : rester trop longtemps en charge MAX annule l'attaque → CHARGE_HOLD
//    4. Mode fantôme : un Pokémon qui entre en combat (relève, adversaire suivant) est intouchable
//       et ne peut pas attaquer pendant un court instant → GHOST
//    5. Safari en salles pour tous (Raichu, Lucario, Farfuret, Fouinar en plus) : on traverse une carte,
//       salle par salle — la SORTIE s'ouvre quand la salle est vidée (data/safari-rooms.js → map)
//    6. Premier Safari OFFERT (tutoriel) : Farfuret ou Raichu, 3 Poké Balls, il ne peut pas tomber K.O.,
//       la capture est assurée
// ============================================================
const SOLO_CH2 = { hp:.86, dmg:.86, boss:.8 };      // multiplicateurs des niveaux 11 à 20
const CHARGE_HOLD = 1.5;                           // secondes en charge MAX avant que l'attaque s'annule
const GHOST = 1;                                   // secondes de mode fantôme à l'entrée en combat
const FIRST_SAFARI = { pokemon:['farfuret', 'raichu'], balls:3, stage:{ hp:1.1, dmg:.3, rate:1.4, tele:1.2, aim:.2, speed:.7 } };

// ---------- 1. solo ----------
STAGES.forEach(S => { if(S.chapter === 1){ S.hp = +(S.hp*SOLO_CH2.hp).toFixed(2); S.dmg = +(S.dmg*SOLO_CH2.dmg).toFixed(2); S.boss = +(S.boss*SOLO_CH2.boss).toFixed(2); } });
const _enemyTeamV19 = enemyTeam;
enemyTeam = function(size){
  if(!SOLO_CTX || SOLO_STAGE == null) return _enemyTeamV19(size);
  const st = SOLO_STAGE, ch = chapterOf(st), C = CHAPTERS[ch], k = st - ch*CH_SIZE, ok = id => SPR[id] && MV[id];
  const L = ((SOLO_CTX.size === 6 ? C.teams6 : C.teams3) || [])[k];
  if(!L || !L.length) return _enemyTeamV19(size);
  const n = (typeof SOLO_COUNT !== 'undefined' && SOLO_COUNT[st]) || SOLO_CTX.size, list = L.filter(ok), out = [];
  for(let i = 0; i < n && list.length; i++) out.push(list[i % list.length]);
  const B = typeof PENDING_BOSS !== 'undefined' && PENDING_BOSS && BOSSES.includes(PENDING_BOSS) ? PENDING_BOSS : null;
  if(B && !out.includes(B)) out[out.length - 1] = B;
  return out;
};

// ---------- 2. corps à corps visé : jusqu'au bout ----------
melee = function(s, d, m, c, own, sc, ang){
  if(s.rs || s.fl) return;
  const S = SPR[s.t], M = m.mel, an = resolveAnim(S, M.an) || 'Attack', cum = S.CUM[an], tk = 1/(60*AS);
  const ta = M.ta || .14, hf = M.hf || [S.D.anim[an].hit || 3], c0 = cum[hf[0]], rng = M.rng || 240;
  const a = ang ?? Math.atan2(d.y - s.y, d.x - s.x);
  const ux = Math.cos(a), uy = Math.sin(a), along = (d.x - s.x)*ux + (d.y - s.y)*uy, perp = Math.abs(-(d.x - s.x)*uy + (d.y - s.y)*ux);
  const onPath = along > 0 && perp < d.r + s.r + 26;
  // sur la trajectoire : on s'arrête au contact ; sinon le joueur va jusqu'au bout de la portée (l'ordinateur reste prudent)
  const go = Math.min(rng, onPath ? Math.max(0, along - (s.r + d.r + 6)) : (own ? rng : Math.min(120, rng)));
  let ex = s.x + ux*go, ey = s.y + uy*go;
  ex = Math.max(30, Math.min(W - 30, ex)); ey = Math.max(44, Math.min(H - 34, ey));
  const hits = hf.map(f => ({ t: ta + (cum[f] - c0)*tk, done:0 })), last = hits[hits.length - 1].t;
  const tr = last + .1, end = Math.max(ta + (S.TOT[an] - c0)*tk, tr + .12);
  s.rs = { an, t0:G.time, sx:s.x, sy:s.y, ex, ey, ta, tk, c0, hits, tr, tb:end - tr, end, m, M, c, own, sc };
};

// ---------- 3. limite de charge ----------
const _stepV19a = step;
step = function(dt){
  _stepV19a(dt);
  const p = G && G.p; if(!p || G.over || G.paused) return;
  p.chH = p.chH || [0, 0, 0];
  for(let i = 0; i < 3; i++){
    if(!(down[i] && p.ch[i] >= 1)){ p.chH[i] = 0; continue; }
    p.chH[i] += dt;
    if(p.chH[i] < CHARGE_HOLD) continue;
    down[i] = 0; p.ch[i] = 0; p.chH[i] = 0; AIM.on[i] = 0; if(typeof MHOLD !== 'undefined') delete MHOLD[i];
    p.cd[i] = p.cm[i] = .6;
    dmgTxt(p.x, p.y - 50, 'CHARGE PERDUE !', '#ff8a7a'); if(typeof playSfx === 'function') playSfx('back');
  }
};
function drawChargeWarn(){
  const p = G && G.p; if(!p || !p.chH) return;
  const h = Math.max(...p.chH); if(h < CHARGE_HOLD - .7) return;
  const u = (h - (CHARGE_HOLD - .7))/.7, bl = Math.sin(G.time*(18 + u*20)) > 0;
  ctx.save(); ctx.strokeStyle = bl ? '#ff3b3b' : '#ffd0a0'; ctx.lineWidth = 3; ctx.globalAlpha = .5 + .5*u;
  ctx.beginPath(); ctx.arc(p.x, p.y + 4, 26 - u*8, 0, 6.283*(1 - u)); ctx.stroke(); ctx.restore();
}

// ---------- 4. mode fantôme ----------
const ghostOn = o => o && o.ghost && G && o.ghost > G.time;
// détection de l'entrée en combat (après l'animation de Pokéball) : le mode fantôme démarre quand il apparaît
const _stepV19g = step;
step = function(dt){
  _stepV19g(dt);
  if(!G || G.over) return;
  const p = G.p, e = G.e;
  if(p && p !== G._gp){ G._gp = p; if(G.time > .5) p.ghostP = 1; }
  if(p && p.ghostP){ p.ghost = G.time + GHOST; if(!G.sw && !p.hid) p.ghostP = 0; }            // intouchable pendant la sortie de Pokéball + GHOST
  if(e && e !== G._ge){ G._ge = e; if(G.wave > 0 && !(G.cfg && G.cfg.mode === 'online') && !e.raid) e.ghostP = 1; }
  if(e && e.ghostP && e.hp > 0){ e.ghost = G.time + GHOST; if(!e.hid && !G.em){ e.ghostP = 0; e.next = Math.max(e.next || 0, GHOST); e.tele = 0; } }
};
hurtE = (prev => function(d, b){ if(ghostOn(G && G.e)) return; return prev(d, b); })(hurtE);
hurtP = (prev => function(d, b){ if(ghostOn(G && G.p)) return; return prev(d, b); })(hurtP);
press = (prev => function(i){ if(ghostOn(G && G.p)) return; return prev(i); })(press);
const GHC = new WeakMap();
function ghostCv(f){
  let c = GHC.get(f); if(c) return c;
  c = document.createElement('canvas'); c.width = f.width; c.height = f.height; Object.assign(c, { sy:f.sy, sw:f.sw, sh:f.sh, hd:f.hd, hr:f.hr, pid:f.pid });
  const x = c.getContext('2d'); x.globalAlpha = .45; x.drawImage(f, 0, 0); x.globalCompositeOperation = 'source-atop'; x.globalAlpha = .35; x.fillStyle = '#bfe0ff'; x.fillRect(0, 0, c.width, c.height);
  GHC.set(f, c); return c;
}
mon = (prev => function(o, en){ const f = prev(o, en); return ghostOn(o) && Math.sin(G.time*30) > -.6 ? ghostCv(f) : f; })(mon);

// ---------- 5. safari : traverser la carte, salle par salle ----------
const roomMap = R => R && R.map && typeof WILD !== 'undefined' && WILD[R.map] != null ? WILD[R.map] : null;
const _spawnV19r = spawn;
spawn = function(){
  if(!(G && G.cfg && G.cfg.rooms)) return _spawnV19r();
  const S = rmState();
  if(S.ri < 0){ const m = roomMap(G.cfg.rooms[0]); if(m != null) G.stage.arena = m; return _spawnV19r(); }   // le spawn de base refait la carte avec G.stage.arena
  let n = G.wave; while(S.dead.has(n)) n++;
  if(n < G.et.length){ const ri = roomOf(n); if(ri > S.ri && !(S.pass && S.pass[ri])){ openDoor(ri); return; } }
  return _spawnV19r();
};
function openDoor(ri){
  const S = G.rm; S.door = { ri, x:W - 70, y:clY(H/2), t0:G.time };
  if(G.e){ G.e.hid = true; G.e.tele = 0; G.e.next = 99; G.e.koDone = 1; G.e.hp = 0; }   // déjà K.O. : rules.js ne le recompte pas
  bullets.length = 0;
  S.doorMsg = { t0:G.time, s:'Salle vidée ! Va vers la SORTIE →' };
  if(typeof playSfx === 'function') playSfx('victory');
}
function goThrough(S){
  const D = S.door; S.door = null; S.pass = S.pass || {}; S.pass[D.ri] = true;
  S.tr = { t0:G.time, ri:D.ri, swapped:false };
}
const _stepV19r = step;
step = function(dt){
  const S = G && G.rm, p = G && G.p;
  if(S && S.tr && p){ const x = p.x, y = p.y; _stepV19r(dt); if(!G || !G.p) return; if(!S.tr) return; if(!S.tr.swapped){ p.x = x; p.y = y; }
    const t = G.time - S.tr.t0;
    if(t >= .35 && !S.tr.swapped){
      S.tr.swapped = true; const m = roomMap(G.cfg.rooms[S.tr.ri]);
      if(m != null) G.stage.arena = m;
      bullets.length = 0; [TRAPS, BOOMS, PULSES, ZONES, BEAMS, AFTER].forEach(l => l.length = 0);
      p.x = 90; p.y = clY(H/2); p.rs = null; p.fl = null; p.kb = null; p.lx = p.x; p.ly = p.y;
      if(typeof CAM !== 'undefined'){ CAM.x = Math.max(0, p.x - VW/2); }
      _spawnV19r();
      const e = G.e;
      if(e){ const dx = W*.68 - e.x, dy = clY(H/2) - e.y; e.x += dx; e.y += dy; e.lx = e.x; e.ly = e.y; (S.adds || []).forEach(a => { a.x = clX(a.x + dx); a.y = clY(a.y + dy); }); }
    }
    if(t > .8) S.tr = null;
    return;
  }
  _stepV19r(dt);
  if(S && S.door && p && !G.over && Math.hypot(p.x - S.door.x, p.y - S.door.y) < 52) goThrough(S);
};
function drawDoor(){
  const S = G && G.rm, D = S && S.door; if(!D) return;
  const t = G.time - D.t0, a = Math.min(1, t*2), pul = .7 + .3*Math.sin(G.time*5);
  ctx.save(); ctx.globalAlpha = a;
  ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(D.x, D.y + 30, 40, 12, 0, 0, 6.283); ctx.fill();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createRadialGradient(D.x, D.y, 4, D.x, D.y, 60); g.addColorStop(0, `rgba(255,240,170,${.9*pul})`); g.addColorStop(1, 'rgba(255,200,80,0)'); ctx.fillStyle = g; ctx.fillRect(D.x - 60, D.y - 60, 120, 120);
  ctx.strokeStyle = '#ffe9a0'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(D.x, D.y, 22, 36, 0, 0, 6.283); ctx.stroke();
  ctx.lineWidth = 2; ctx.strokeStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(D.x, D.y, 14 + 4*Math.sin(G.time*6), 26, 0, 0, 6.283); ctx.stroke();
  ctx.globalCompositeOperation = 'source-over'; htext('SORTIE', D.x, D.y - 48, 9, '#ffe9a0', 'center');
  if(Math.random() < .5) vp({ x:D.x + R_(-20, 20), y:D.y + R_(-30, 30), vx:R_(-20, 20), vy:R_(-60, -20), life:.6, s:3, s1:1, col:'#ffe9a0' });
  // flèche près du Pokémon
  const p = G.p, an = Math.atan2(D.y - p.y, D.x - p.x), dd = Math.hypot(D.x - p.x, D.y - p.y);
  if(dd > 120){ ctx.translate(p.x + Math.cos(an)*44, p.y + Math.sin(an)*44); ctx.rotate(an); ctx.fillStyle = '#ffe9a0'; ctx.globalAlpha = a*(.6 + .4*Math.sin(G.time*8));
    ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-6, -8); ctx.lineTo(-2, 0); ctx.lineTo(-6, 8); ctx.closePath(); ctx.fill(); }
  ctx.restore();
}
const _dbV19 = drawBullets;
drawBullets = function(){ _dbV19(); drawDoor(); drawChargeWarn(); };
const _dsfV19 = drawScreenFx;
drawScreenFx = function(){
  _dsfV19();
  if(!G) return;
  const S = G.rm;
  if(S && S.doorMsg){ const t = G.time - S.doorMsg.t0; if(t > 2.6 || !S.door) S.doorMsg = null; else { ctx.save(); ctx.globalAlpha = Math.min(1, t*4, (2.6 - t)*3); htext(S.doorMsg.s, VW/2, VH/2 - 40, 14, '#ffe9a0', 'center'); ctx.restore(); } }
  if(S && S.tr){ const t = G.time - S.tr.t0, a = t < .35 ? t/.35 : Math.max(0, 1 - (t - .35)/.45); ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; ctx.fillStyle = '#000'; ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height); ctx.restore(); }
  drawTutoSafari();
};
// les Pokémon de la meute du même nom (ex. Farfuret) ont un autre identifiant : on affiche le vrai nom partout
if(typeof NAME !== 'undefined' && POKEMON.farfuretw) NAME.farfuretw = POKEMON.farfuretw.name;

// ---------- 6. premier Safari offert ----------
const firstSafariPending = () => { if(typeof Owned === 'undefined' || !Owned.ready()) return false; const d = Save.load(); return !d.firstSafari && Owned.list().length <= 1 && FIRST_SAFARI.pokemon.some(id => !Owned.has(id) && SPR[id]); };
function firstTeam(){
  const t = Save.teams().filter(teamOk)[0]; if(t) return t;
  const st = Owned.starter() || Owned.list()[0]; Save.saveTeam({ id:null, name:'Mon équipe', size:3, members:[st], items:{} });
  return Save.teams().filter(teamOk)[0];
}
function showFirstSafari(sel){
  const L = FIRST_SAFARI.pokemon.filter(id => !Owned.has(id) && SPR[id]), pid = L.includes(sel) ? sel : L[0], t = firstTeam();
  menu(`<div class='hd'><h1>Ton premier Safari</h1></div>
    <p>🎁 <b>C'est offert !</b> Entrée gratuite + <b>${FIRST_SAFARI.balls} Poké Balls</b>. Choisis le Pokémon que tu veux capturer :</p>
    <div class='row fsf'>${L.map(id => `<button class='card ${id === pid ? 'foc sel' : ''}' data-fs='${id}'>${thumb(id)}<small>${esc(NAME[id])}</small><i>${typesOf(id).map(tp => `<span class='tc' style='background:${COL[tp]}'>${TN[tp] || tp}</span>`).join('')}</i></button>`).join('')}</div>
    <p class='hint'>Ce premier Safari est un entraînement : je te guide pas à pas, ${esc(NAME[pid])} ne peut pas tomber K.O. et la capture est assurée.</p>
    <p class='hint'>Ton équipe : <b>${t ? esc(t.name) : '—'}</b></p>
    <div class='row'><button class='btn' id='fsgo' ${t ? '' : 'disabled'}>C'est parti !</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-fs]', el => showFirstSafari(el.dataset.fs));
  document.getElementById('fsgo').onclick = () => startFirstSafari(t, pid);
  document.getElementById('back').onclick = showMain;
}
function startFirstSafari(team, pid){
  const z = SAFARI.zones[0], poke = SAFARI.balls[0], have = Save.itemCount(poke.id);
  if(have < FIRST_SAFARI.balls) Save.addItem(poke.id, FIRST_SAFARI.balls - have);
  Save.lastTeam = team.id;
  const M = mapOf(pid), stage = { ...z.stage, ...FIRST_SAFARI.stage, arena:M.idx };
  start({ mode:'safari', zone:z.id, target:pid, tuto:true, team:team.members.slice(), size:team.size, teamId:team.id, stage, arena:M.idx, enemies:[pid] });
  G.safari = { ball:poke.id, cd:0, warned:true };
  G.tutoSf = { step:0, t0:G.time };
}
if(SCREENS.safari){ const _sfV19 = SCREENS.safari; SCREENS.safari = function(){ if(firstSafariPending()) return showFirstSafari(); return _sfV19.apply(this, arguments); }; }
const isTutoSf = () => G && G.cfg && G.cfg.mode === 'safari' && G.cfg.tuto;
catchChance = (prev => function(e, b){ return isTutoSf() ? 1 : prev(e, b); })(catchChance);
hurtE = (prev => function(d, b){
  if(!isTutoSf()) return prev(d, b);
  const e = G.e; if(!e || e.hp <= 0) return prev(d, b);
  if(e.hp < 2){ if(!G.tutoSf.tb || G.time - G.tutoSf.tb > 1){ G.tutoSf.tb = G.time; dmgTxt(e.x, e.y - 60, 'IL TIENT BON !', '#ffe9a0'); } return; }
  const x = (typeof mult === 'function' ? mult(b.t, e.t) : 1) || 1;
  if(d*x*1.6 >= e.hp - 1) d = Math.max(0, (e.hp - 1.5)/(x*1.6));            // marge pour les bonus (objets, talents)
  const r = prev(d, b); if(e.hp > 0) e.st = null; if(e.hp < 1 && e.hp > -1e9){ e.hp = 1; e.koDone = 0; } return r;
})(hurtE);
const _stepV19t = step;
step = function(dt){
  if(isTutoSf() && G.ballFly && G.e && !G.e.hid){ G.ballFly.tx = G.e.x; G.ballFly.ty = G.e.y; }   // tuto : la Ball suit le Pokémon
  _stepV19t(dt);
  if(!isTutoSf() || !G.tutoSf) return;
  const T = G.tutoSf, e = G.e;
  if(e && e.hp > 0 && e.hp < 1) e.hp = 1;
  if(T.step === 0 && e && e.hp < e.max*.45){ T.step = 1; T.t0 = G.time; if(typeof playSfx === 'function') playSfx('select'); }
  if(T.step === 1 && (G.ballFly || G.cap)){ T.step = 2; T.t0 = G.time; }
  if(T.step <= 2 && G.caught){ T.step = 3; T.t0 = G.time; const d = Save.load(); d.firstSafari = 1; Save.save(); }
  if(typeof ballBtn !== 'undefined') ballBtn.classList.toggle('tutop', T.step === 1);
};
function drawTutoSafari(){
  if(!isTutoSf() || !G.tutoSf || G.over) return;
  const T = G.tutoSf, e = G.e, N = esc(NAME[G.cfg.target] || '');
  const msg = [`Affaiblis ${NAME[G.cfg.target]} avec tes attaques (A, B, C)… il ne peut pas tomber K.O. !`,
    `Il est affaibli ! Lance une Poké Ball : bouton « Ball » (ou touche E)`,
    `La Ball bouge… encore un instant !`, `Bravo, ${NAME[G.cfg.target]} est à toi !`][T.step]; if(!msg || !N) return;
  const t = G.time - T.t0; ctx.save();
  ctx.globalAlpha = Math.min(1, t*3); ctx.fillStyle = 'rgba(12,6,24,.82)'; ctx.fillRect(VW/2 - 250, 50, 500, 30); ctx.fillStyle = '#ffd23f'; ctx.fillRect(VW/2 - 250, 78, 500, 2);
  htext('TUTO', VW/2 - 236, 69, 9, '#ffb070', 'left'); htext(msg, VW/2 + 14, 69, 10, '#fff6e0', 'center');
  ctx.restore();
}

document.head.insertAdjacentHTML('beforeend', `<style>
.fsf .card{width:110px;height:auto;padding:6px;display:flex;flex-direction:column;align-items:center;gap:2px}.fsf .card img{width:56px;height:56px;image-rendering:pixelated}
.fsf .card i{font-style:normal;display:flex;gap:2px}
.ab.ballb.tutop{animation:tutop .7s ease-in-out infinite;box-shadow:0 0 0 3px #ffd23f,0 0 18px #ffd23f}
@keyframes tutop{50%{transform:scale(1.15)}}
</style>`);
