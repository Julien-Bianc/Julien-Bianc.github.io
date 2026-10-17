// ============================================================
//  patch-v0212.js — correctif (rapport de test v0.21.1)
//    1. TOUR DE COMBAT : mode infini (1 Pokémon au départ, recrues et bonus en route, classement en ligne)
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
const TW = {
  heal:.1,                    // PV rendus à chaque Pokémon encore debout après chaque étage
  coins:f => 10 + 2*f,        // Pokédollars gagnés en passant l'étage f
  teamMax:6,
  arenas:[0, 1, 2, 3, 4, 5, 7, 8, 11, 13]
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
// récompense de chaque badge : Pokédollars (+ objet tenu)
const BADGE_REWARD = {
  depart:{ coins:300 }, solo3:{ coins:1500, item:'restes' }, solo6:{ coins:2500, item:'orbe-vie' },
  mewtwo:{ coins:500 }, mewtwo3:{ coins:1500, item:'ceinture-force' }, secret:{ coins:3000 },
  raid1:{ coins:300 }, raid5:{ coins:1000 }, raid10:{ coins:1500, item:'bandeau-choix' }, coop:{ coins:500 },
  safari1:{ coins:200 }, safariA:{ coins:800 }, safariT:{ coins:1500 },
  contest1:{ coins:300 }, contestM:{ coins:1500 }, legend:{ coins:1000 }, online:{ coins:300 }, shiny:{ coins:500 },
  tower10:{ coins:500 }, tower25:{ coins:1200, item:'baie-sitrus' }, tower50:{ coins:3000, item:'mouchoir-choix' },
  perfect:{ coins:2000 }, collect10:{ coins:600 }, collectAll:{ coins:3000, item:'restes' }, crates25:{ coins:500 }, crates100:{ coins:1500 },
  rich:{ coins:1000 }, rainbow:{ coins:1200 }, crown:{ coins:3000, item:'orbe-vie' }, shiny5:{ coins:1500 }, online10:{ coins:1500 }, champion:{ coins:5000, item:'ceinture-force' }
};
const bdRewardOf = id => BADGE_REWARD[id] || { coins:200 };
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

// ================================================================ 1. TOUR DE COMBAT
const twStage = f => { const t = Math.min(1, (f - 1)/40), x = Math.max(0, f - 40), r2 = v => +v.toFixed(2);
  return { name:'Tour — étage ' + f, level:Math.min(10, Math.ceil(f/5)), arena:TW.arenas[(f*7) % TW.arenas.length], hp:r2(.75 + .028*(f - 1) + .03*x), dmg:r2(.65 + .024*(f - 1) + .02*x),
    speed:r2(.8 + .45*t), pspeed:r2(.85 + .5*t), rate:r2(1.3 - .72*t), tele:r2(1.2 - .52*t), aim:r2(Math.min(1, (f - 1)/20)), boss:r2(1.8 + .03*f) }; };
const twEnemyN = f => f % 10 === 0 ? 3 : f % 5 === 0 ? 2 : 1;
const twPick = (pool, n) => pool.slice().sort(() => Math.random() - .5).slice(0, n);
const Tower = {
  run(){ return Save.load().tower || null; },
  set(r){ const d = Save.load(); d.tower = r; Save.save(); },
  best(){ return bdCount('towerBest'); },
  record(f, team){ const d = Save.load(); if(f > (d.towerBest || 0)){ d.towerBest = f; d.towerTeam = team; Save.save(); Badges.check(); } this.sync(); },
  async sync(){ const d = Save.load(); if(typeof Online === 'undefined' || !Online.user || !d.towerBest || (d.towerSent || 0) >= d.towerBest) return;
    try{ await Online.rpc('submit_tower', { p_floor:d.towerBest, p_team:d.towerTeam || '' }); d.towerSent = d.towerBest; Save.save(); }catch(e){ console.warn('tour', e.message); } },
  async top(){ return await Online.rpc('tower_top', { p_limit:30 }) || []; }
};
const TW_BONUS = {
  heal:  { name:'Soin total',      icon:'💖', desc:'Tous tes Pokémon debout récupèrent tous leurs PV.', ok:R => R.team.some(m => m.hp > 0 && m.hp < 1), go:R => R.team.forEach(m => { if(m.hp > 0) m.hp = 1; }) },
  revive:{ name:'Rappel',          icon:'✨', desc:'Tes Pokémon K.O. reviennent avec 50 % de leurs PV.', ok:R => R.team.some(m => m.hp <= 0), go:R => R.team.forEach(m => { if(m.hp <= 0) m.hp = .5; }) },
  atk:   { name:'Attaque +12 %',   icon:'⚔️', desc:'Toute ton équipe frappe plus fort jusqu\'à la fin de la tour.', ok:() => true, go:R => R.atk = +((R.atk || 1)*1.12).toFixed(3) },
  def:   { name:'Défense +10 %',   icon:'🛡️', desc:'Ton équipe subit 10 % de dégâts en moins.', ok:() => true, go:R => R.def = +((R.def || 1)*.9).toFixed(3) },
  spd:   { name:'Vitesse +8 %',    icon:'💨', desc:'Ton équipe se déplace plus vite.', ok:R => (R.spd || 1) < 1.4, go:R => R.spd = +((R.spd || 1)*1.08).toFixed(3) },
  hpm:   { name:'PV max +15 %',    icon:'❤️', desc:'Tous tes Pokémon ont plus de PV.', ok:R => (R.hpm || 1) < 2, go:R => R.hpm = +((R.hpm || 1)*1.15).toFixed(3) },
  item:  { name:'Objet tenu',      icon:'🎒', desc:'Ton Pokémon de tête reçoit un objet tenu (pour cette tour).', ok:R => R.team[0] && !(R.items || {})[R.team[0].id],
           go:R => { const L = HELD.filter(h => h.r === 'PC' || h.r === 'R'), h = L[Math.floor(Math.random()*L.length)]; R.items = R.items || {}; R.items[R.team[0].id] = h.id; return `${NAME[R.team[0].id]} tient ${h.name} !`; } },
  coins: { name:'Bourse',          icon:'💰', desc:'Des Pokédollars tout de suite.', ok:() => true, go:R => { const n = 40 + R.floor*8; Save.addCoins(n); R.coins = (R.coins || 0) + n; return `+ ${money(n)}`; } }
};
function twOffer(R, f){
  if(f % 5 === 0) return { kind:'bonus', opts:twPick(Object.keys(TW_BONUS).filter(k => TW_BONUS[k].ok(R)), 3) };
  if(R.team.length < TW.teamMax && (f % 5 === 2 || (f % 5 === 4 && R.team.length < 3))) return { kind:'recruit', opts:twPick(ORDER.filter(id => !R.team.some(m => m.id === id)), 3) };
  return null;
}
function twTeamHtml(R, click){
  return `<div class='twteam'>${R.team.map((m, i) => `<button class='twm ${m.hp <= 0 ? 'ko' : ''} ${i === 0 ? 'lead' : ''}' ${click ? `data-twl='${i}'` : 'disabled'}>${thumb(m.id)}<small>${esc(NAME[m.id] || m.id)}</small>
    <i><u style='width:${Math.max(0, m.hp)*100}%;background:${m.hp > .5 ? '#46d86a' : m.hp > .2 ? '#ffd23f' : '#ff5a4a'}'></u></i>${(R.items || {})[m.id] && HELD_BY_ID[R.items[m.id]] ? `<img class='twit' src='${heldImg(HELD_BY_ID[R.items[m.id]])}'>` : ''}</button>`).join('')}</div>`;
}
const twBuffs = R => [['atk', 'Attaque', v => '+' + Math.round((v - 1)*100) + ' %'], ['def', 'Dégâts subis', v => '−' + Math.round((1 - v)*100) + ' %'], ['spd', 'Vitesse', v => '+' + Math.round((v - 1)*100) + ' %'], ['hpm', 'PV max', v => '+' + Math.round((v - 1)*100) + ' %']]
  .filter(([k]) => R[k] && R[k] !== 1).map(([k, n, f]) => `<span class='twb'>${n} ${f(R[k])}</span>`).join('');

function showTower(){
  let R = Tower.run();
  if(R && R.inFight && !(G && G.cfg && G.cfg.mode === 'tower' && !G.over)){ G = null; return twEnd(R, 'abandon'); }
  G = null; Tower.sync();
  menu(`<div class='hd'><h1>Tour de Combat</h1>${walletHtml()}</div>
    <div class='edit twv'><div class='scroll left'>
      <p class='mini'>Monte le plus haut possible ! Tu commences avec <b>un seul Pokémon, sans objet</b>. Chaque étage est plus dur que le précédent.
        Tous les 5 étages : <b>un bonus au choix</b>. En route : <b>des Pokémon te rejoignent</b> (6 max). Les PV ne remontent presque pas entre deux étages
        et un Pokémon K.O. le reste. Si toute ton équipe tombe, la tour est finie. <b>Quitter un combat = fin de la tour.</b></p>
      <p class='twrec'>🏆 Ton record : <b>étage ${Tower.best()}</b></p>
      ${R ? `<div class='twrun'><b>Tour en cours : étage ${R.floor}</b>${twTeamHtml(R)}${twBuffs(R) ? `<div class='twbs'>${twBuffs(R)}</div>` : ''}</div>
        <div class='row'><button class='btn' id='twc'>Continuer</button><button class='btn2' id='twq'>Abandonner</button></div>`
        : `<div class='row'><button class='btn' id='twn'>Entrer dans la tour</button></div>`}
    </div><div class='scroll right'><p class='mini'><b>Classement en ligne</b></p><div id='twlb'><small>Chargement…</small></div></div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
  on('twn', twNew); on('twc', () => R.pending ? twAfter(R) : twFloor()); on('back', showMain);
  on('twq', () => gameConfirm('Abandonner la tour ?', `Ta tour s'arrête à l'étage ${R.floor - 1}.`, 'Abandonner', () => twEnd(R, 'quit')));
  twBoard();
}
SCREENS.tower = showTower;
async function twBoard(){
  const el = () => document.getElementById('twlb');
  if(typeof Online === 'undefined' || !Online.configured || !Online.configured() || !Online.user){ if(el()) el().innerHTML = `<small>Connecte-toi dans <b>Multijoueur</b> pour apparaître dans le classement.</small>`; return; }
  try{
    const L = await Tower.top(); if(!el()) return;
    el().innerHTML = L.length ? `<ol class='twlb'>${L.map((r, i) => `<li class='${r.pseudo === Online.user.pseudo ? 'me' : ''}'><span>${i + 1}.</span><b>${esc(r.pseudo)}</b><span class='tth'>${String(r.team || '').split(',').filter(id => ORDER.includes(id)).slice(0, 6).map(thumb).join('')}</span><em>${r.best}</em></li>`).join('')}</ol>` : '<small>Personne pour l\'instant : sois le premier !</small>';
  }catch(e){ if(el()) el().innerHTML = `<small>Classement indisponible pour l'instant.</small>`; console.warn('tower_top', e.message); }
}
function twNew(){
  const mine = ORDER.filter(id => Owned.has(id));
  menu(`<h1>Choisis ton Pokémon de départ</h1><small class='sub'>Il entre seul dans la tour, sans objet.</small><div class='scroll'><div class='grid2'>${mine.map(id => `<button class='card' data-pk='${id}'>${thumb(id)}<small>${NAME[id]}</small><small class='ty'>${typesOf(id).map(t => `<span class='tc' style='background:${COL[t]}'>${TN[t] || t}</span>`).join('')}</small></button>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='bk'>Retour</button></div>`);
  bindAll('[data-pk]', el => { Tower.set({ floor:1, team:[{ id:el.dataset.pk, hp:1 }], items:{}, atk:1, def:1, spd:1, hpm:1, coins:0, inFight:0, pending:null }); twFloor(); });
  document.getElementById('bk').onclick = showTower;
}
function twFloor(){
  const R = Tower.run(); if(!R) return showTower();
  const f = R.floor, n = twEnemyN(f);
  menu(`<div class='hd'><h1>Étage ${f}</h1>${walletHtml()}</div>
    <p class='twnext'>${f % 10 === 0 ? '👑 <b>Étage du boss</b> : 3 adversaires, le dernier est un boss !' : n > 1 ? `⚔ ${n} adversaires` : '⚔ 1 adversaire'}</p>
    ${twTeamHtml(R, true)}<small class='sub'>Touche un Pokémon pour le mettre en tête.</small>${twBuffs(R) ? `<div class='twbs'>${twBuffs(R)}</div>` : ''}
    <div class='row'><button class='btn' id='twgo'>Combattre</button><button class='btn2' id='twm'>Menu</button></div>`);
  bindAll('[data-twl]', el => { const i = +el.dataset.twl; if(R.team[i].hp <= 0) return; R.team.unshift(R.team.splice(i, 1)[0]); Tower.set(R); twFloor(); });
  document.getElementById('twgo').onclick = twFight; document.getElementById('twm').onclick = showMain;
}
function twFight(){
  const R = Tower.run(); if(!R) return showTower();
  const alive = R.team.filter(m => m.hp > 0); if(!alive.length) return twEnd(R, 'ko');
  const f = R.floor, S = twStage(f), foes = twPick(ORDER, twEnemyN(f));
  R.inFight = 1; Tower.set(R);
  start({ mode:'tower', team:alive.map(m => m.id), items:R.items || {}, size:alive.length, stage:S, arena:S.arena, enemies:foes });
  if(!G) return;
  G.tower = R;
  G.team.forEach(c => { const m = alive.find(x => x.id === c.t); c.max = Math.round(c.max*(R.hpm || 1)); c.hp = Math.max(1, Math.round(c.max*(m ? m.hp : 1))); c.sp *= R.spd || 1; });
  if(typeof setBtns === 'function') setBtns();
  if(typeof musicSet === 'function') musicSet(f % 10 === 0 ? 'tower:boss|boss|battle' : 'tower|battle');
}
hurtE = (prev => function(d, b){ if(G && G.tower && G.cfg && G.cfg.mode === 'tower') d *= G.tower.atk || 1; return prev(d, b); })(hurtE);
hurtP = (prev => function(d, b){ if(G && G.tower && G.cfg && G.cfg.mode === 'tower') d *= G.tower.def || 1; return prev(d, b); })(hurtP);
battleEnd = (prev => function(win, why){
  if(!(G && G.cfg && G.cfg.mode === 'tower')) return prev(win, why);
  const R = G.tower || Tower.run(); if(!R) return showTower();
  R.inFight = 0;
  if(!win){ R.team.forEach(m => m.hp = 0); return twEnd(R, 'ko'); }
  R.team.forEach(m => { const c = G.team.find(x => x.t === m.id); if(c) m.hp = Math.max(0, Math.min(1, c.hp/c.max + (c.hp > 0 ? TW.heal : 0))); });
  const f = R.floor, gain = TW.coins(f); Save.addCoins(gain); R.coins = (R.coins || 0) + gain; R.floor = f + 1;
  R.pending = twOffer(R, f); R.last = { f, gain }; Tower.set(R);
  Tower.record(f, R.team.map(m => m.id).join(','));
  twAfter(R);
})(battleEnd);
function twAfter(R, note){
  const P = R.pending, L = R.last || { f:R.floor - 1, gain:0 };
  const body = !P ? '' : P.kind === 'bonus'
    ? `<p class='mini'><b>Choisis un bonus :</b></p><div class='twopts'>${P.opts.map(k => { const B = TW_BONUS[k]; return `<button class='twopt' data-two='${k}'><em>${B.icon}</em><b>${B.name}</b><small>${B.desc}</small></button>`; }).join('')}</div>`
    : `<p class='mini'><b>Un Pokémon veut te rejoindre :</b> (${R.team.length}/${TW.teamMax})</p><div class='twopts'>${P.opts.map(id => `<button class='twopt' data-two='${id}'>${thumb(id)}<b>${esc(NAME[id] || id)}</b><small class='ty'>${typesOf(id).map(t => `<span class='tc' style='background:${COL[t]}'>${TN[t] || t}</span>`).join('')}</small></button>`).join('')}
      <button class='twopt skip' data-two=''><em>✖</em><b>Personne</b><small>Garder mon équipe</small></button></div>`;
  menu(`<div class='hd'><h1>🏆 Étage ${L.f} réussi !</h1>${walletHtml()}</div>
    <p class='twgain'>+${money(L.gain)} ${note ? ` · <b>${esc(note)}</b>` : ''}</p>${twTeamHtml(R)}${body}
    ${P ? '' : `<div class='row'><button class='btn' id='twnx'>Étage ${R.floor}</button><button class='btn2' id='twm'>Menu</button></div>`}`);
  bindAll('[data-two]', el => {
    const v = el.dataset.two; let msg = '';
    if(P.kind === 'bonus'){ msg = TW_BONUS[v].go(R) || TW_BONUS[v].name; }
    else if(v){ R.team.push({ id:v, hp:1 }); msg = `${NAME[v]} rejoint ton équipe !`; }
    R.pending = null; Tower.set(R); twAfter(R, msg);
  });
  const nx = document.getElementById('twnx'); if(nx) nx.onclick = twFloor;
  const mn = document.getElementById('twm'); if(mn) mn.onclick = showMain;
}
function twEnd(R, why){
  const f = Math.max(0, R.floor - 1), team = R.team.map(m => m.id).join(',');
  Tower.set(null); if(f) Tower.record(f, team); G = null;
  const best = Tower.best();
  menu(`<h1>${why === 'ko' ? 'Ton équipe est K.O.' : 'Fin de la tour'}</h1>
    <p>${why === 'abandon' ? 'Tu as quitté un combat : la tour est terminée.<br>' : ''}Tu es arrivé à l'<b>étage ${f}</b>${f && f >= best ? ' — <b>nouveau record !</b>' : ` (record : étage ${best})`}</p>
    <p class='twgain'>Gains de la tour : ${money(R.coins || 0)}</p>${twTeamHtml(R)}
    <div class='row'><button class='btn' id='twr'>Recommencer</button><button class='btn2' id='twm'>Menu</button></div>`);
  document.getElementById('twr').onclick = showTower; document.getElementById('twm').onclick = showMain;
}
if(!MAIN_MENU.some(m => m.id === 'tower')){ const i = MAIN_MENU.findIndex(m => m.id === 'solo'); MAIN_MENU.splice(i + 1, 0, { id:'tower', label:'Tour de Combat', desc:'Mode infini : monte le plus haut possible', screen:'tower' }); }

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
.twv .left{flex:0 0 56%}.twrec{font-size:13px;color:#ffe9a0;margin:6px 0}.twrun{margin:6px 0;padding:6px;border:1px solid #8a5a20;border-radius:8px;background:rgba(58,20,32,.4)}
.twteam{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:6px 0}.twm{position:relative;width:70px;padding:3px;border-radius:8px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);color:inherit;display:flex;flex-direction:column;align-items:center;cursor:pointer}
.twm img{width:40px;height:40px;image-rendering:pixelated}.twm small{font-size:9px}.twm i{display:block;width:58px;height:5px;background:#2a2146;border-radius:3px;overflow:hidden;margin-top:2px}.twm u{display:block;height:100%}
.twm.lead{border-color:#ffd23f;box-shadow:0 0 6px rgba(255,210,63,.45)}.twm.ko{opacity:.4;filter:grayscale(1)}.twm .twit{position:absolute;top:2px;right:2px;width:16px!important;height:16px!important}.twm:disabled{cursor:default}
.twbs{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin:4px 0}.twb{font-size:10px;padding:1px 6px;border-radius:8px;background:rgba(255,210,63,.15);color:#ffe9a0}
.twnext{font-size:13px;margin:4px 0}.twgain{color:#ffe9a0;font-size:13px;margin:4px 0}
.twopts{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0}.twopt{width:150px;padding:6px;border-radius:10px;border:2px solid #8a5a20;background:linear-gradient(180deg,#3a1a50,#22102e);color:inherit;display:flex;flex-direction:column;align-items:center;gap:2px;cursor:pointer}
.twopt:hover{border-color:#ffd23f}.twopt em{font-style:normal;font-size:22px}.twopt b{font-size:12px;color:#ffe9a0}.twopt small{font-size:10px}.twopt img{width:48px;height:48px;image-rendering:pixelated}.twopt.skip{width:110px;opacity:.8}
.twlb{list-style:none;margin:0;padding:0;font-size:11px}.twlb li{display:flex;align-items:center;gap:5px;padding:2px 4px;border-radius:5px}.twlb li:nth-child(odd){background:rgba(255,255,255,.05)}.twlb li.me{background:rgba(255,210,63,.18)}
.twlb b{flex:1;text-align:left}.twlb em{font-style:normal;color:#ffd23f;font-weight:700}.twlb .tth img{width:18px;height:18px;image-rendering:pixelated}
</style>`);
