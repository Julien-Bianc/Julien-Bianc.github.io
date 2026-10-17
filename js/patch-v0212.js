// ============================================================
//  patch-v0212.js — correctif (rapport de test v0.21.1)
//    1. TOUR DE COMBAT : déplacée dans js/tower.js (v0.21.3)
//    2. Badges : cliquables, RÉCOMPENSE à récupérer pour chacun, 14 nouveaux badges
//    3. Concours : les attaques du Pokémon et leur catégorie dans l'onglet Stats
//    4. Défi Mewtwo : encore plus dur + attaques de raid en Extrême et SECRET (Déferlante Psy, Pluie Psy)
//    5. Nom du jeu : PokéClash
//  (cuisine à poffin : js/contest-scenes.js · caisse des Titans : data/titans.js · Tyranocif : data/pokemon-vague2.js)
// ============================================================

// ================================================================ RÉGLAGES
const MW_HARDER2 = { hp:1.15, dmg:1.1, rate:.9, tele:.92, speed:1.05, pspeed:1.05 };   // tous les défis Mewtwo
// attaques de raid de Mewtwo (secondes ; dmg = part des PV max de ton Pokémon)
const MW_RAID = {
  extreme:{ ult:{ first:10, cd:17, charge:1.7, rings:3, gap:.8,  speed:320, width:28, dmg:.2,  push:90 },
            rain:{ first:6,  cd:12, n:4, delay:1.2, r:46, dmg:.13 } },
  secret: { ult:{ first:8,  cd:13, charge:1.5, rings:4, gap:.65, speed:350, width:30, dmg:.22, push:100 },
            rain:{ first:4,  cd:8.5, n:6, delay:1.05, r:50, dmg:.15 } }
};

// ================================================================ 4. MEWTWO
new Set(BOSS_DIFFS.concat(typeof SECRET_DIFF !== 'undefined' ? [SECRET_DIFF] : [])).forEach(D => {
  const S = D.stage; Object.keys(MW_HARDER2).forEach(k => { if(S[k] != null) S[k] = +(S[k]*MW_HARDER2[k]).toFixed(2); });
});
const PSY2 = '#c070ff';
const mwRaidCfg = () => G && G.cfg && G.cfg.mode === 'boss' && G.e && G.e.t === 'mewtwo' ? MW_RAID[G.cfg.diff] : null;
function mwRaidStep(dt){
  const C = mwRaidCfg(); if(!C || G.over || G.paused) return;
  const e = G.e, p = G.p, M = G.mwr || (G.mwr = { ultT:G.time + C.ult.first, rainT:G.time + C.rain.first, ult:null, zones:[] });
  const k = e.rage ? .75 : 1, free = e.hp > 0 && G.intro <= 0 && !G.wait && !bossBusy(e) && !busy(e) && !heldBy(e) && !heldBy(p) && e.tele <= 0;
  // Déferlante Psy (comme la Colère du Titan des raids) : des ondes partent de Mewtwo, traverse-les avec l'esquive
  if(!M.ult && free && G.time >= M.ultT){
    M.ult = { t0:G.time, x:e.x, y:e.y, hit:[] }; M.ultT = G.time + C.ult.cd*k + C.ult.charge + C.ult.rings*C.ult.gap;
    e.tele = 0; e.next = C.ult.charge + C.ult.rings*C.ult.gap + 1; lbl(1, 'Déferlante Psy', 'psy');
    if(SPR[e.t]) e.ann = { an:resolveAnim(SPR[e.t], 'Charge') || 'Idle', t0:G.time };
  }
  const Q = M.ult;
  if(Q){
    const U = C.ult, t = G.time - Q.t0; e.x = Q.x; e.y = Q.y; e.tele = 0;
    if(t < U.charge){ DIM.a = Math.max(DIM.a, .5*t/U.charge); G.shake = Math.max(G.shake, .1*t/U.charge);
      if(Math.random() < .8){ const q = R_(0, 6.283), r = R_(110, 200); vp({ x:e.x + Math.cos(q)*r, y:e.y + Math.sin(q)*r*.7, vx:-Math.cos(q)*r*2, vy:-Math.sin(q)*r*1.4, life:.45, s:4, s1:1, kind:'star', col:PSY2, rot:q }); } }
    else { DIM.a = Math.max(DIM.a, .4);
      for(let i = 0; i < U.rings; i++){
        const tk = U.charge + i*U.gap; if(t < tk) continue; const r = 40 + (t - tk)*U.speed;
        if(!Q['b' + i]){ Q['b' + i] = 1; G.shake = Math.max(G.shake, .5); flashScreen(.15); if(typeof playSfx === 'function') playSfx('rock'); }
        if(Q.hit[i] || p.hp <= 0 || p.hid) continue;
        const d = Math.hypot(p.x - Q.x, (p.y - Q.y)*1.15);
        if(Math.abs(d - r) < U.width/2 + p.r*.7){ Q.hit[i] = 1;
          if(p.dT > 0 || p.inv > 0){ dmgTxt(p.x, p.y - 50, 'ESQUIVÉ !', '#9fe3ff'); continue; }
          hurtP(p.max*U.dmg, { t:'psy', k:'ult' }); if(!G || G.over) return;
          if(p.hp > 0) throwBack(p, Math.atan2(p.y - Q.y, p.x - Q.x), U.push, .3); }
      }
      if(t > U.charge + (U.rings - 1)*U.gap + 2.6) M.ult = null;
    }
  }
  // Pluie Psy : des zones apparaissent sous toi (et autour) puis explosent
  if(!M.ult && e.hp > 0 && G.intro <= 0 && !G.wait && G.time >= M.rainT){
    const R = C.rain; M.rainT = G.time + R.cd*k; lbl(1, 'Pluie Psy', 'psy');
    for(let i = 0; i < R.n; i++){
      const a = R_(0, 6.283), dd = i ? R_(60, 190) : 0, lead = i ? 0 : .5;
      M.zones.push({ x:clX(p.x + (p.vx || 0)*lead + Math.cos(a)*dd), y:clY(p.y + (p.vy || 0)*lead + Math.sin(a)*dd), t0:G.time + i*.12, r:R.r, done:0 });
    }
  }
  M.zones = M.zones.filter(z => {
    const R = C.rain, t = G.time - z.t0; if(t < R.delay) return true;
    if(!z.done){ z.done = 1; G.shake = Math.max(G.shake, .25); crater(z.x, z.y, 16, '#6a2a9a');
      burst(14, (i, q) => vp({ x:z.x, y:z.y, vx:Math.cos(q)*R_(80, 200), vy:Math.sin(q)*R_(60, 150) - 60, life:.5, s:R_(3, 6), s1:1, kind:'star', col:i % 2 ? PSY2 : '#ffffff', rot:q }));
      if(p.hp > 0 && !p.hid && Math.hypot(p.x - z.x, (p.y - z.y)*1.15) < z.r + p.r*.6){
        if(p.dT > 0 || p.inv > 0) dmgTxt(p.x, p.y - 50, 'ESQUIVÉ !', '#9fe3ff'); else { hurtP(p.max*R.dmg, { t:'psy', k:'ult' }); if(!G || G.over) return false; } } }
    return t < R.delay + .35;
  });
}
function mwRaidDraw(){
  const C = mwRaidCfg(), M = G && G.mwr; if(!C || !M) return;
  ctx.save();
  M.zones.forEach(z => { const t = G.time - z.t0; if(t < 0) return; const R = C.rain, u = Math.min(1, t/R.delay);
    if(t < R.delay){ ctx.globalAlpha = .25 + .2*Math.sin(G.time*20); ctx.fillStyle = '#8a3ae8'; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r/1.15, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = .9; ctx.strokeStyle = PSY2; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r*u, z.r*u/1.15, 0, 0, 6.283); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(z.x, z.y, z.r, z.r/1.15, 0, 0, 6.283); ctx.stroke();
      const fy = z.y - 260*(1 - u); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9; ctx.drawImage(glow(PSY2), z.x - 18, fy - 18, 36, 36); ctx.globalCompositeOperation = 'source-over'; }
    else { ctx.globalAlpha = Math.max(0, 1 - (t - R.delay)/.35); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(PSY2), z.x - z.r*1.6, z.y - z.r*1.6, z.r*3.2, z.r*3.2); ctx.globalCompositeOperation = 'source-over'; } });
  const Q = M.ult, U = C.ult, e = G.e;
  if(Q){ const t = G.time - Q.t0;
    if(t < U.charge){ const k = t/U.charge;
      for(let i = 0; i < U.rings; i++){ const r = 60 + ((G.time*120 + i*90) % 320); ctx.globalAlpha = .25*k*(1 - r/400); ctx.strokeStyle = PSY2; ctx.lineWidth = 3; ctx.setLineDash([14, 10]); ctx.beginPath(); ctx.ellipse(e.x, e.y + 20, r, r/1.15, 0, 0, 6.283); ctx.stroke(); }
      ctx.setLineDash([]); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5*k + .2*Math.sin(G.time*30); ctx.drawImage(glow(PSY2), e.x - 140*k, e.y - 140*k - 40, 280*k, 280*k); ctx.globalCompositeOperation = 'source-over'; }
    for(let i = 0; i < U.rings; i++){ const tk = U.charge + i*U.gap; if(t < tk) continue; const r = 40 + (t - tk)*U.speed; if(r > 900) continue; const a = Math.max(0, 1 - r/900);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = .55*a; ctx.strokeStyle = '#2a0640'; ctx.lineWidth = U.width + 8; ctx.beginPath(); ctx.ellipse(Q.x, Q.y + 20, r, r/1.15, 0, 0, 6.283); ctx.stroke();
      ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .9*a; ctx.strokeStyle = PSY2; ctx.lineWidth = U.width; ctx.stroke(); ctx.strokeStyle = '#f0d8ff'; ctx.lineWidth = 4; ctx.stroke(); }
  }
  ctx.restore();
  if(Q){ const t = G.time - Q.t0; if(t < U.charge + .4){ const a = Math.min(1, t*4)*(t > U.charge ? 1 - (t - U.charge)/.4 : 1);
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = a; htext('⚠ DÉFERLANTE PSY — ESQUIVE LES ONDES ! ⚠', VW/2, VH/2 + 70, 13, PSY2, 'center'); ctx.restore(); } }
}
step = (prev => function(dt){ prev(dt); try{ if(G && !(HS > 0)) mwRaidStep(dt); }catch(err){ console.warn('mwRaid', err); } })(step);
drawBullets = (prev => function(){ prev(); try{ if(G) mwRaidDraw(); }catch(err){ console.warn('mwRaidDraw', err); } })(drawBullets);

// ================================================================ 3. CONCOURS : attaques et catégories
showContestMon = (prev => function(pid, tab, msg){
  prev(pid, tab, msg);
  if((tab || 'stats') !== 'stats' || !POKEMON[pid]) return;
  const cr = document.querySelector('.cdet .cr'); if(!cr) return;
  cr.insertAdjacentHTML('beforeend', `<p class='mini'><b>Attaques en concours</b> (la catégorie dépend du type de l'attaque) :</p><div class='cmvs'>${POKEMON[pid].moves.map(m => { const c = CSTAT[catOf(m.type)];
    return `<div class='cmv'><b>${esc(m.name)}</b><span class='tc' style='background:${COL[m.type] || '#666'}'>${esc(TN[m.type] || m.type)}</span><span class='ccat2' style='color:${c.col};border-color:${c.col}'>${c.name}</span><small>${m.power || 0}</small></div>`; }).join('')}</div>`);
})(showContestMon);

// ================================================================ 2. BADGES : nouveaux badges + récompenses
const bdCount = k => +(Save.load()[k] || 0);
const bdConAll = () => typeof Con !== 'undefined' ? Con.d().wins : {};
BADGES.push(
  { id:'tower10',    name:'Badge Tour',       how:'Atteins l\'étage 10 de la Tour de Combat.',          ok:() => bdCount('towerBest') >= 10 },
  { id:'tower25',    name:'Badge Donjon',     how:'Atteins l\'étage 25 de la Tour de Combat.',          ok:() => bdCount('towerBest') >= 25 },
  { id:'tower50',    name:'Badge Sommet',     how:'Atteins l\'étage 50 de la Tour de Combat.',          ok:() => bdCount('towerBest') >= 50 },
  { id:'perfect',    name:'Badge Intouchable', how:'Bats Mewtwo sans perdre un seul Pokémon.',          ok:() => typeof MwPerfect !== 'undefined' && Object.keys(MwPerfect.all()).length > 0 },
  { id:'collect10',  name:'Badge Collection', how:'Possède 10 Pokémon.',                                 ok:() => Owned.list().filter(id => ORDER.includes(id)).length >= 10 },
  { id:'collectAll', name:'Badge Pokédex',    how:'Possède tous les Pokémon du jeu.',                    ok:() => ORDER.every(id => Owned.list().includes(id)) },
  { id:'crates25',   name:'Badge Coffre',     how:'Ouvre 25 caisses.',                                   ok:() => Save.opened() >= 25 },
  { id:'crates100',  name:'Badge Trésor',     how:'Ouvre 100 caisses.',                                  ok:() => Save.opened() >= 100 },
  { id:'rich',       name:'Badge Fortune',    how:'Possède 10 000 ₽ en même temps.',                     ok:() => Save.coins() >= 10000 },
  { id:'rainbow',    name:'Badge Arc-en-ciel', how:'Gagne un Concours dans chacune des 5 catégories.',   ok:() => CONTEST_STATS.every(s => Object.keys(bdConAll()).some(k => k.startsWith(s.id + ':'))) },
  { id:'crown',      name:'Badge Couronne',   how:'Gagne les 20 Concours (5 catégories × 4 rangs).',     ok:() => CONTEST_STATS.every(s => CONTEST_RANKS.every(r => bdConAll()[s.id + ':' + r.id])) },
  { id:'shiny5',     name:'Badge Prisme',     how:'Possède 5 Pokémon shiny.',                            ok:() => typeof Shiny !== 'undefined' && Object.keys(Shiny.all()).length >= 5 },
  { id:'online10',   name:'Badge Tonnerre',   how:'Gagne 10 combats en ligne.',                          ok:() => bdCount('onlineWins') >= 10 },
  { id:'champion',   name:'Badge Champion',   how:'Obtiens tous les autres badges.',                     ok:() => BADGES.every(B => B.id === 'champion' || Badges.has(B.id)) }
);
// récompense de chaque badge : Pokédollars (+ objet tenu) — v0.21.3 : Pokédollars divisés par 2
const BADGE_REWARD = {
  depart:{ coins:150 }, solo3:{ coins:750, item:'restes' }, solo6:{ coins:1250, item:'orbe-vie' },
  mewtwo:{ coins:250 }, mewtwo3:{ coins:750, item:'ceinture-force' }, secret:{ coins:1500 },
  raid1:{ coins:150 }, raid5:{ coins:500 }, raid10:{ coins:750, item:'bandeau-choix' }, coop:{ coins:250 },
  safari1:{ coins:100 }, safariA:{ coins:400 }, safariT:{ coins:750 },
  contest1:{ coins:150 }, contestM:{ coins:750 }, legend:{ coins:500 }, online:{ coins:150 }, shiny:{ coins:250 },
  tower10:{ coins:250 }, tower25:{ coins:600, item:'baie-sitrus' }, tower50:{ coins:1500, item:'mouchoir-choix' },
  perfect:{ coins:1000 }, collect10:{ coins:300 }, collectAll:{ coins:1500, item:'restes' }, crates25:{ coins:250 }, crates100:{ coins:750 },
  rich:{ coins:500 }, rainbow:{ coins:600 }, crown:{ coins:1500, item:'orbe-vie' }, shiny5:{ coins:750 }, online10:{ coins:750 }, champion:{ coins:2500, item:'ceinture-force' }
};
const bdRewardOf = id => BADGE_REWARD[id] || { coins:100 };
const bdRewardTxt = id => { const R = bdRewardOf(id), it = R.item && HELD_BY_ID[R.item]; return money(R.coins) + (it ? ' + ' + it.name : ''); };
const BdClaim = {
  all(){ const d = Save.load(); if(!d.badgeClaim) d.badgeClaim = {}; return d.badgeClaim; },
  has(id){ return !!this.all()[id]; },
  open(){ return BADGES.filter(B => Badges.has(B.id) && !this.has(B.id)); },
  take(id){ if(!Badges.has(id) || this.has(id)) return false; const R = bdRewardOf(id); this.all()[id] = Date.now(); Save.addCoins(R.coins); if(R.item && HELD_BY_ID[R.item]) Save.addItem(R.item, 1); Save.save(); return true; }
};
// --- dessins des nouveaux badges ---
const bdRect = (x, y, w, h, r) => bdP2(p => p.roundRect(x, y, w, h, r || 0));
function bdTower(c, col, top){
  bdBGem(c, bdPoly([[18, 58], [20, 22], [16, 22], [16, 12], [22, 12], [22, 16], [28, 16], [28, 12], [36, 12], [36, 16], [42, 16], [42, 12], [48, 12], [48, 22], [44, 22], [46, 58]]), col);
  c.fillStyle = 'rgba(0,0,0,.25)'; [[24, 30], [34, 30], [24, 42], [34, 42]].forEach(([x, y]) => c.fillRect(x, y, 6, 3));
  c.fillStyle = top; c.beginPath(); c.roundRect(28, 46, 8, 12, [4, 4, 0, 0]); c.fill(); bdShine(c, 22, 18, 2.5);
}
Object.assign(bdBDRAW, {
  tower10(c){ bdTower(c, '#8a8a9c', '#ffd23f'); },
  tower25(c){ bdTower(c, '#6a3ab0', '#ffd23f'); c.strokeStyle = '#7a5a18'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 12); c.lineTo(32, 2); c.stroke(); c.fillStyle = '#e8402c'; c.beginPath(); c.moveTo(32, 2); c.lineTo(44, 5); c.lineTo(32, 9); c.fill(); },
  tower50(c){ bdBGem(c, bdPoly([[4, 58], [24, 22], [32, 32], [40, 18], [60, 58]]), '#6a5a8a'); c.fillStyle = '#f4f4ff'; c.beginPath(); c.moveTo(40, 18); c.lineTo(46, 30); c.lineTo(41, 27); c.lineTo(36, 30); c.closePath(); c.fill(); bdBGem(c, bdStar(5, 11, 5, 40, 10), '#ffd23f'); },
  perfect(c){ const s = bdP2(p => { p.moveTo(32, 5); p.lineTo(54, 13); p.bezierCurveTo(54, 38, 44, 52, 32, 59); p.bezierCurveTo(20, 52, 10, 38, 10, 13); p.closePath(); }); bdBGem(c, s, '#5a3ad8');
    c.strokeStyle = '#ffffff'; c.lineWidth = 4.5; c.lineCap = 'round'; c.beginPath(); c.moveTo(21, 31); c.lineTo(29, 40); c.lineTo(44, 22); c.stroke(); bdShine(c, 22, 16, 3); },
  collect10(c){ [[20, 40], [44, 40], [32, 20]].forEach(([x, y], i) => { const b = bdDisc(13, x, y); bdBGem(c, b, '#f4f4f4'); c.save(); c.clip(b); c.fillStyle = ['#e8402c', '#3a8ae8', '#3ab84a'][i]; c.fillRect(x - 14, y - 14, 28, 13); c.fillStyle = '#1a1020'; c.fillRect(x - 14, y - 2, 28, 3); c.restore(); c.fillStyle = '#fff'; c.strokeStyle = '#1a1020'; c.lineWidth = 1.5; c.beginPath(); c.arc(x, y, 3.5, 0, 6.2832); c.fill(); c.stroke(); }); },
  collectAll(c){ bdBGem(c, bdRect(12, 6, 40, 52, 6), '#d8302c'); c.fillStyle = '#9a1a18'; c.fillRect(14, 22, 36, 3); bdBGem(c, bdDisc(7, 23, 15), '#5ac8f8'); bdShine(c, 21, 13, 2);
    c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(36, 13, 2.5, 0, 6.2832); c.fill(); c.fillStyle = '#7ade8a'; c.beginPath(); c.arc(43, 13, 2.5, 0, 6.2832); c.fill(); c.fillStyle = '#e8f4ff'; c.fillRect(18, 30, 28, 20); c.fillStyle = '#2a8ac8'; c.fillRect(21, 34, 22, 3); c.fillRect(21, 40, 16, 3); },
  crates25(c){ bdBGem(c, bdRect(10, 14, 44, 40, 4), '#b07838'); c.strokeStyle = '#6a4418'; c.lineWidth = 2; [24, 34, 44].forEach(y => { c.beginPath(); c.moveTo(12, y); c.lineTo(52, y); c.stroke(); }); c.strokeStyle = '#e8c070'; c.lineWidth = 3; c.beginPath(); c.moveTo(14, 18); c.lineTo(50, 50); c.moveTo(50, 18); c.lineTo(14, 50); c.stroke(); bdShine(c, 18, 18, 2.5); },
  crates100(c){ bdBGem(c, bdP2(p => { p.moveTo(8, 28); p.bezierCurveTo(8, 8, 56, 8, 56, 28); p.closePath(); }), '#e8a020'); bdBGem(c, bdRect(8, 28, 48, 28, 3), '#c8401a'); c.fillStyle = '#ffd23f'; c.fillRect(8, 36, 48, 4); bdBGem(c, bdRect(27, 30, 10, 12, 2), '#ffd23f'); c.fillStyle = '#1a1020'; c.fillRect(31, 34, 2, 5); bdShine(c, 20, 16, 3); },
  rich(c){ bdBGem(c, bdDisc(25, 32, 32), '#ffc020'); c.strokeStyle = '#c88a10'; c.lineWidth = 2; c.beginPath(); c.arc(32, 32, 19, 0, 6.2832); c.stroke(); c.font = 'bold 24px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#a86a08'; c.fillText('₽', 33, 34); c.fillStyle = '#fff2b0'; c.fillText('₽', 32, 33); bdShine(c, 22, 18, 4); },
  rainbow(c){ const cols = CONTEST_STATS.map(s => s.col); cols.forEach((col, i) => { const r = 28 - i*4.5; const a = bdP2(p => { p.arc(32, 46, r, Math.PI, 0); p.arc(32, 46, r - 4.5, 0, Math.PI, true); p.closePath(); }); if(!i){ c.lineWidth = 6; c.strokeStyle = bdBCOL.rimD; c.stroke(a); c.lineWidth = 3.4; c.strokeStyle = bdBCOL.rim; c.stroke(a); } c.fillStyle = col; c.fill(a); });
    bdBGem(c, bdP2(p => p.ellipse(12, 48, 9, 6, 0, 0, 6.2832)), '#ffffff'); bdBGem(c, bdP2(p => p.ellipse(52, 48, 9, 6, 0, 0, 6.2832)), '#ffffff'); },
  crown(c){ bdBGem(c, bdPoly([[8, 50], [8, 18], [20, 32], [32, 10], [44, 32], [56, 18], [56, 50]]), '#ffd23f'); c.fillStyle = '#c88a10'; c.fillRect(10, 42, 44, 3);
    [[20, 44, '#e8402c'], [32, 44, '#3b8fd9'], [44, 44, '#3fbf5a']].forEach(([x, y, col]) => { c.fillStyle = col; c.beginPath(); c.arc(x, y - 6, 3.5, 0, 6.2832); c.fill(); }); bdBGem(c, bdDisc(4, 32, 10), '#ff7ac8'); bdShine(c, 18, 26, 2.5); },
  shiny5(c){ [[24, 36, 20, '#ff8ad8'], [44, 22, 13, '#5ad8f0'], [46, 48, 10, '#ffd23f']].forEach(([x, y, R, col]) => { bdBGem(c, bdStar(4, R, R*.3, x, y, -Math.PI/2), col); }); c.fillStyle = '#fff'; c.beginPath(); c.arc(24, 36, 2.5, 0, 6.2832); c.fill(); },
  online10(c){ bdBGem(c, bdP2(p => { p.moveTo(14, 30); p.bezierCurveTo(6, 30, 6, 16, 16, 16); p.bezierCurveTo(18, 6, 34, 4, 38, 13); p.bezierCurveTo(48, 8, 58, 18, 52, 28); p.bezierCurveTo(56, 32, 52, 34, 48, 34); p.lineTo(16, 34); p.closePath(); }), '#5a5a8a');
    bdBGem(c, bdPoly([[24, 30], [16, 46], [24, 46], [20, 60], [34, 40], [26, 40], [32, 30]]), '#ffd23f'); bdBGem(c, bdPoly([[40, 30], [34, 42], [40, 42], [37, 54], [48, 38], [42, 38], [46, 30]]), '#ffd23f'); bdShine(c, 22, 14, 3); },
  champion(c){ bdBGem(c, bdP2(p => { p.moveTo(16, 8); p.lineTo(48, 8); p.bezierCurveTo(48, 30, 42, 38, 32, 38); p.bezierCurveTo(22, 38, 16, 30, 16, 8); p.closePath(); }), '#ffd23f');
    c.lineWidth = 3.4; c.strokeStyle = '#f0d070'; c.beginPath(); c.moveTo(16, 12); c.bezierCurveTo(4, 12, 6, 28, 20, 28); c.moveTo(48, 12); c.bezierCurveTo(60, 12, 58, 28, 44, 28); c.stroke();
    bdBGem(c, bdRect(28, 38, 8, 8, 1), '#e8a020'); bdBGem(c, bdRect(18, 46, 28, 10, 2), '#8a3ae8'); bdBGem(c, bdStar(5, 7, 3, 32, 20), '#ffffff'); bdShine(c, 22, 14, 3); }
});
// --- écran des badges (8 colonnes, détail + récompense) ---
function showBadges(sel, msg){
  Badges.check(true);
  const got = BADGES.filter(B => Badges.has(B.id)).length, S = BADGES.find(B => B.id === sel) || BdClaim.open()[0] || BADGES.find(B => Badges.has(B.id)) || BADGES[0];
  const has = Badges.has(S.id), claimed = BdClaim.has(S.id), when = has ? new Date(Badges.all()[S.id]).toLocaleDateString('fr-FR') : null, nOpen = BdClaim.open().length;
  menu(`<div class='hd'><h1>Badges</h1><span class='bdgc'>${got}/${BADGES.length}</span>${walletHtml()}</div>
    <div class='edit bdgv'><div class='scroll left'><div class='bdgcase'>${BADGES.map(B => `<button class='bgx ${Badges.has(B.id) ? 'on' : ''} ${B.id === S.id ? 'foc' : ''} ${Badges.has(B.id) && !BdClaim.has(B.id) ? 'gift' : ''}' data-bdg='${B.id}' title='${esc(B.name)}'><img src='${badgeImg(B.id, !Badges.has(B.id))}'></button>`).join('')}</div></div>
      <div class='scroll right'><div class='bdgd'><img src='${badgeImg(S.id, !has)}'><div><b>${has ? esc(S.name) : '???'}</b><p>${esc(S.how)}</p><small>${has ? '✔ Obtenu le ' + when : '🔒 Pas encore obtenu'}</small></div></div>
        <div class='bdgr'><span>Récompense : <b>${bdRewardTxt(S.id)}</b></span>${has ? (claimed ? `<small>✔ Récupérée</small>` : `<button class='btn' id='bdclaim'>Récupérer</button>`) : `<small>Obtiens le badge pour la récupérer</small>`}</div>
        ${msg ? `<p class='bdgmsg'>${msg}</p>` : ''}
        ${nOpen > 1 ? `<button class='btn2' id='bdall'>Tout récupérer (${nOpen})</button>` : ''}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-bdg]', el => showBadges(el.dataset.bdg));
  const take = id => { const R = bdRewardOf(id); if(BdClaim.take(id)){ if(typeof coinSfx === 'function') coinSfx(); return R; } return null; };
  const cl = document.getElementById('bdclaim'); if(cl) cl.onclick = () => { if(take(S.id)) showBadges(S.id, `+ ${bdRewardTxt(S.id)} !`); };
  const all = document.getElementById('bdall'); if(all) all.onclick = () => { let c = 0, n = 0; BdClaim.open().forEach(B => { const R = take(B.id); if(R){ c += R.coins; n++; } }); showBadges(S.id, `${n} récompenses : + ${money(c)} (et les objets)`); };
  document.getElementById('back').onclick = showMain;
}
SCREENS.badges = showBadges;
// pastille sur l'entrée « Badges » du menu principal quand une récompense attend
renderMainMM = (prev => function(){
  prev();
  const n = BdClaim.open().length, b = document.querySelector(".mmi[data-id='badges']"); if(b && n) b.insertAdjacentHTML('beforeend', `<span class='bdgdot'>${n}</span>`);
  const lg = document.querySelector('.mm .logo'); if(lg) lg.innerHTML = `<div class='lball'><i></i></div><b class='pcl'>POKÉCLASH</b><small>Arène de combat</small>`;
})(renderMainMM);
document.title = 'PokéClash';

document.head.insertAdjacentHTML('beforeend', `<style>
.bdgcase{grid-template-columns:repeat(8,1fr)!important}
.bgx.gift{position:relative;animation:bdgp 1.6s ease-in-out infinite}.bgx.gift::after{content:"!";position:absolute;right:-3px;top:-4px;width:14px;height:14px;border-radius:50%;background:#ffd23f;color:#3a1406;font:bold 10px/14px monospace;text-align:center;box-shadow:0 0 6px #ffd23f}
@keyframes bdgp{50%{box-shadow:0 0 10px rgba(255,210,63,.55)}}
.bdgr{display:flex;align-items:center;justify-content:space-between;gap:8px;margin:8px 0;padding:6px 8px;border:1px solid #8a5a20;border-radius:8px;background:rgba(58,20,32,.5);font-size:11px}.bdgr b{color:#ffe9a0}.bdgr small{color:var(--txt2,#c9bcd8)}
.bdgmsg{color:#7aff9a;font-size:11px;margin:4px 0}
.bdgdot{display:inline-block;margin-left:6px;min-width:15px;height:15px;padding:0 3px;border-radius:8px;background:#ffd23f;color:#3a1406;font:bold 10px/15px monospace;text-align:center;vertical-align:middle}
.logo b.pcl{font-size:31px;letter-spacing:2px}.mm .logo .lball{left:188px;top:-6px;background:linear-gradient(180deg,#8a3ae8 0 47%,#14101c 47% 53%,#f4f4f4 53%)}
.cmvs{display:flex;flex-direction:column;gap:3px}.cmv{display:flex;align-items:center;gap:6px;font-size:11px;padding:3px 6px;border-radius:6px;background:rgba(255,255,255,.06)}.cmv b{flex:1;text-align:left}
.cmv .tc{font-size:9px;padding:1px 5px;border-radius:4px;color:#fff}.ccat2{font-size:9px;padding:0 5px;border:1px solid;border-radius:4px;font-weight:700}.cmv small{width:22px;text-align:right;color:var(--txt2,#c9bcd8)}
</style>`);
