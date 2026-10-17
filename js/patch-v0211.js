// ============================================================
//  patch-v0211.js — correctif v0.21.1 (rapport de test v0.21)
//    1. Mewtwo t'attrape (Ball'Ombre qui enferme, Télékinésie qui soulève) : IMPOSSIBLE de faire une relève
//    2. Relève : temps de recharge plus long (SWAP_CD)
//    3. Défis Mewtwo un peu plus durs (toutes les difficultés)
//    4. Niveau 13 : Rondoudou utilise beaucoup moins Berceuse (AI_WEIGHT) — et jamais deux fois de suite
//    5. BADGES de succès (style badges d'arène) : menu principal → Badges. Ils se débloquent tout seuls,
//       même pour ce que tu as déjà accompli avant cette version.
//  (Danse-Lames moins fort : data/pokemon-vague2.js · Fouinar « Météores » à distance : data/pokemon.js)
// ============================================================
const SWAP_CD = 4.5;                                   // secondes entre deux relèves (avant : 3)
const MW_HARDER = { hp:1.08, dmg:1.06 };               // en plus de la v0.21
const AI_WEIGHT = { 'Berceuse':.25 };                  // nom d'attaque → chance qu'un adversaire la garde quand il la choisit (1 = normal)
const AI_REUSE = { 'Berceuse':10 };                    // secondes minimum entre deux utilisations

// ---------- 1 + 2. relève ----------
const bdCaught = p => !!(p && (p.jail || p.lifted || (G.e && G.e.grb && G.e.grb.tgt === p)));
swap = (prev => function(){
  if(G && G.p && bdCaught(G.p)){ if(!G.swMsg || G.time - G.swMsg > 1){ G.swMsg = G.time; dmgTxt(G.p.x, G.p.y - 56, 'IMPOSSIBLE : TU ES RETENU !', '#ff8a7a'); if(typeof playSfx === 'function') playSfx('back'); } return; }
  return prev();
})(swap);
// la Pokéball (js/pokeball.js) remet le compteur à 3 s au moment du changement : on le remonte à SWAP_CD
step = (prev => function(dt){ const before = G ? G.swc : 0; prev(dt); if(G && G.swc > before + .5 && G.swc < SWAP_CD) G.swc = SWAP_CD; })(step);
doSwap = (prev => function(n){
  if(G && G.p && G.p.hp > 0 && bdCaught(G.p)){ swap(); return; }            // relève volontaire bloquée (le K.O. passe toujours)
  const r = prev(n); if(G && G.swc > 0) G.swc = Math.max(G.swc, SWAP_CD); return r; })(doSwap);

// ---------- 3. Mewtwo ----------
BOSS_DIFFS.concat(typeof SECRET_DIFF !== 'undefined' ? [SECRET_DIFF] : []).forEach(D => { const S = D.stage; S.hp = +(S.hp*MW_HARDER.hp).toFixed(2); S.dmg = +(S.dmg*MW_HARDER.dmg).toFixed(2); });

// ---------- 4. choix des attaques de l'adversaire ----------
step = (prev => function(dt){
  prev(dt);
  const e = G && G.e; if(!e || G.over || !MV[e.t]) return;
  if(!(e.tele > 0)){ e._rp = 0; return; }
  if(e._rp || e.tele !== e.tm) return; e._rp = 1;
  const L = MV[e.t], m = L[e.pat]; if(!m) return;
  const w = AI_WEIGHT[m.n], reuse = AI_REUSE[m.n], recent = reuse && e._used && G.time - (e._used[m.n] || -99) < reuse;
  if((w != null && Math.random() > w) || recent){
    const others = L.map((x, i) => i).filter(i => i !== e.pat && !(AI_WEIGHT[L[i].n] != null && AI_WEIGHT[L[i].n] < .5));
    if(others.length){ e.pat = others[Math.floor(Math.random()*others.length)]; if(L[e.pat].k === 'beam') e.aim = Math.atan2(G.p.y - e.y, G.p.x - e.x); }
  }
  (e._used = e._used || {})[L[e.pat].n] = G.time;
})(step);

// ---------- 5. BADGES ----------
//  { id, name, how (comment l'obtenir), ok() (accompli ?), draw (dessin du badge) }
const bdSOLO_ALL = () => STAGES.length;
const bdCapturedZone = z => { const Z = SAFARI.zones.find(x => x.id === z); return !!Z && Z.pokemon.filter(id => ORDER.includes(id)).every(id => Owned.has(id)); };
const bdHasLegend = () => Object.entries(Save.inv()).some(([id, n]) => n > 0 && /:L$/.test(id));
const bdConWins = () => (typeof Con !== 'undefined' ? Object.keys(Con.d().wins) : []);
const BADGES = [
  { id:'depart',   name:'Badge Départ',   how:'Termine le chapitre 1 du Solo (3v3 ou 6v6).',            ok:() => Save.cleared(3) >= 10 || Save.cleared(6) >= 10 },
  { id:'solo3',    name:'Badge Trio',     how:'Termine les 20 niveaux du Solo en 3v3.',                    ok:() => Save.cleared(3) >= bdSOLO_ALL() },
  { id:'solo6',    name:'Badge Hexa',     how:'Termine les 20 niveaux du Solo en 6v6.',                    ok:() => Save.cleared(6) >= bdSOLO_ALL() },
  { id:'mewtwo',   name:'Badge Cuillère', how:'Bats Mewtwo dans le Défi (n\'importe quelle difficulté).',  ok:() => BOSS_DIFFS.some(D => BossWins.has('mewtwo', D.id)) },
  { id:'mewtwo3',  name:'Badge Génome',   how:'Bats Mewtwo en Normal, Difficile ET Extrême.',              ok:() => ['normal', 'difficile', 'extreme'].every(d => BossWins.has('mewtwo', d)) },
  { id:'secret',   name:'Badge Mythe',    how:'Bats Mewtwo en mode SECRET.',                               ok:() => BossWins.has('mewtwo', 'secret') },
  { id:'raid1',    name:'Badge Raid',     how:'Gagne un Combat Raid.',                                     ok:() => (Save.load().raidWins || 0) >= 1 },
  { id:'raid5',    name:'Badge Titan',    how:'Gagne un raid 5 étoiles.',                                  ok:() => ((Save.load().raidStars || {})[5] || 0) >= 1 },
  { id:'raid10',   name:'Badge Rempart',  how:'Gagne 10 Combats Raid.',                                    ok:() => (Save.load().raidWins || 0) >= 10 },
  { id:'coop',     name:'Badge Alliance', how:'Gagne un raid à plusieurs.',                                ok:() => (Save.load().raidNetWins || 0) >= 1 },
  { id:'safari1',  name:'Badge Feuille',  how:'Capture un Pokémon au Safari.',                             ok:() => Owned.list().length >= 2 },
  { id:'safariA',  name:'Badge Départ+',  how:'Capture tous les Pokémon du Safari du Grand Départ.',       ok:() => bdCapturedZone('depart') },
  { id:'safariT',  name:'Badge Colosse',  how:'Capture tous les Pokémon du Safari des Titans.',            ok:() => bdCapturedZone('titans') },
  { id:'contest1', name:'Badge Ruban',    how:'Gagne un Concours Pokémon.',                                ok:() => bdConWins().length >= 1 },
  { id:'contestM', name:'Badge Étoile',   how:'Gagne un Concours de rang Master.',                         ok:() => bdConWins().some(k => /:3$/.test(k)) },
  { id:'legend',   name:'Badge Flamme',   how:'Obtiens une carte LÉGENDAIRE.',                             ok:() => bdHasLegend() },
  { id:'online',   name:'Badge Foudre',   how:'Gagne un combat en ligne.',                                 ok:() => (Save.load().onlineWins || 0) >= 1 },
  { id:'shiny',    name:'Badge Éclat',    how:'Possède un Pokémon shiny.',                                 ok:() => typeof Shiny !== 'undefined' && Object.keys(Shiny.all()).length > 0 }
];
const Badges = {
  all(){ const d = Save.load(); if(!d.badges) d.badges = {}; return d.badges; },
  has(id){ return !!this.all()[id]; },
  check(silent){
    const got = [];
    BADGES.forEach(B => { let ok = false; try{ ok = !this.has(B.id) && B.ok(); }catch(e){} if(ok){ this.all()[B.id] = Date.now(); got.push(B); } });
    if(got.length){ Save.save(); if(!silent) badgeToast(got); }
    return got;
  }
};
// --- dessin (64×64) : émail à bord doré, comme les badges d'arène ---
const bdBCOL = { rim:'#f0d070', rimD:'#7a5a18' };
function bdBGem(c, path, col){ c.lineJoin = 'round'; c.lineWidth = 6; c.strokeStyle = bdBCOL.rimD; c.stroke(path); c.lineWidth = 3.4; c.strokeStyle = bdBCOL.rim; c.stroke(path); c.fillStyle = col; c.fill(path); }
const bdP2 = f => { const p = new Path2D(); f(p); return p; };
const bdPoly = (pts) => bdP2(p => { pts.forEach(([x, y], i) => i ? p.lineTo(x, y) : p.moveTo(x, y)); p.closePath(); });
const bdNgon = (n, r, cx, cy, rot) => bdPoly(Array.from({ length:n }, (_, i) => { const a = (rot || 0) + i*6.2832/n; return [cx + Math.cos(a)*r, cy + Math.sin(a)*r]; }));
const bdStar = (n, R, r, cx, cy, rot) => bdPoly(Array.from({ length:n*2 }, (_, i) => { const a = (rot ?? -Math.PI/2) + i*Math.PI/n, k = i % 2 ? r : R; return [cx + Math.cos(a)*k, cy + Math.sin(a)*k]; }));
const bdDisc = (r, cx, cy) => bdP2(p => p.arc(cx, cy, r, 0, 6.2832));
const bdDrop = (cx, cy, s, rot) => bdP2(p => { const pts = []; for(let i = 0; i <= 24; i++){ const t = i/24*6.2832, x = Math.sin(t)*(1 - Math.cos(t))*.5*s, y = -Math.cos(t)*s*.75; pts.push([x, y]); }
  pts.forEach(([x, y], i) => { const X = cx + x*Math.cos(rot || 0) - y*Math.sin(rot || 0), Y = cy + x*Math.sin(rot || 0) + y*Math.cos(rot || 0); i ? p.lineTo(X, Y) : p.moveTo(X, Y); }); p.closePath(); });
function bdShine(c, x, y, r){ c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(x, y, r, r*.45, -.6, 0, 6.2832); c.fill(); }
const bdBDRAW = {
  depart(c){ const o = bdNgon(8, 26, 32, 32, Math.PI/8); bdBGem(c, o, '#6a6a7c'); c.strokeStyle = '#3a3a4a'; c.lineWidth = 1.5;
    for(let i = 0; i < 8; i++){ const a = Math.PI/8 + i*Math.PI/4; c.beginPath(); c.moveTo(32 + Math.cos(a)*12, 32 + Math.sin(a)*12); c.lineTo(32 + Math.cos(a)*24, 32 + Math.sin(a)*24); c.stroke(); }
    const i = bdNgon(8, 12, 32, 32, Math.PI/8); c.fillStyle = '#9a9aae'; c.fill(i); c.stroke(i); bdShine(c, 24, 22, 5); },
  solo3(c){ [[32, 18, 0], [20, 40, -.5], [44, 40, .5]].forEach(([x, y, r]) => { bdBGem(c, bdDrop(x, y + 4, 15, r), '#3aa8f0'); bdShine(c, x - 3, y + 2, 2.5); }); },
  solo6(c){ const cols = ['#e84a3a', '#f0a030', '#f0e040', '#4ac860', '#3a9ae8', '#a060e0'];
    cols.forEach((col, i) => { const a = i*Math.PI/3 - Math.PI/2; bdBGem(c, bdNgon(6, 9, 32 + Math.cos(a)*16, 32 + Math.sin(a)*16, 0), col); });
    bdBGem(c, bdNgon(6, 9, 32, 32, 0), '#ffffff'); bdShine(c, 28, 28, 3); },
  mewtwo(c){ const p = bdP2(q => { q.ellipse(40, 20, 10, 13, .6, 0, 6.2832); }); const h = bdPoly([[33, 28], [37, 32], [18, 54], [13, 50]]); bdBGem(c, h, '#c0a0e8'); bdBGem(c, p, '#b070e8');
    c.fillStyle = '#7a3ac0'; c.beginPath(); c.ellipse(40, 20, 5, 7, .6, 0, 6.2832); c.fill(); bdShine(c, 36, 14, 3); },
  mewtwo3(c){ const cap = bdP2(p => p.roundRect(19, 6, 26, 52, 13)); bdBGem(c, cap, '#3a2266');
    c.lineWidth = 2.6; for(let k = 0; k < 2; k++){ c.strokeStyle = k ? '#ff8ad8' : '#b070ff'; c.beginPath(); for(let y = 12; y <= 52; y += 1){ const x = 32 + Math.sin(y/6 + k*Math.PI)*8; y === 12 ? c.moveTo(x, y) : c.lineTo(x, y); } c.stroke(); }
    c.strokeStyle = 'rgba(255,255,255,.6)'; c.lineWidth = 1.2; for(let y = 15; y < 52; y += 6){ c.beginPath(); c.moveTo(32 + Math.sin(y/6)*8, y); c.lineTo(32 - Math.sin(y/6)*8, y); c.stroke(); } bdShine(c, 26, 12, 3); },
  secret(c){ bdBGem(c, bdStar(8, 28, 15, 32, 32), '#ffd23f'); bdBGem(c, bdDisc(10, 32, 32), '#8a3ae8'); c.fillStyle = '#e8c0ff'; c.fillRect(29, 26, 2, 3); c.fillRect(33, 26, 2, 3); bdShine(c, 22, 18, 4); },
  raid1(c){ bdBGem(c, bdStar(5, 28, 12, 32, 33), '#e8402c'); bdBGem(c, bdDisc(8, 32, 33), '#1a1020'); c.fillStyle = '#ff5a4a'; [[29, 31], [35, 31], [32, 36]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 1.6, 0, 6.2832); c.fill(); }); bdShine(c, 24, 20, 3); },
  raid5(c){ bdBGem(c, bdStar(10, 28, 18, 32, 32, 0), '#f0a020'); bdBGem(c, bdDisc(13, 32, 32), '#c8201a'); c.font = 'bold 14px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#ffe9a0'; c.fillText('5', 32, 33); bdShine(c, 26, 25, 3); },
  raid10(c){ const s = bdPoly([[32, 6], [54, 14], [52, 36], [32, 58], [12, 36], [10, 14]]); bdBGem(c, s, '#a81c2a');
    c.strokeStyle = '#ffd23f'; c.lineWidth = 3.4; [22, 32, 42].forEach(y => { c.beginPath(); c.moveTo(20, y); c.lineTo(32, y + 7); c.lineTo(44, y); c.stroke(); }); bdShine(c, 20, 16, 3.5); },
  coop(c){ bdBGem(c, bdDisc(15, 24, 32), '#e84a3a'); bdBGem(c, bdDisc(15, 40, 32), '#3a8ae8'); c.save(); c.clip(bdDisc(15, 24, 32)); c.fillStyle = '#a04ac8'; c.fill(bdDisc(15, 40, 32)); c.restore();
    c.strokeStyle = bdBCOL.rim; c.lineWidth = 2; c.stroke(bdDisc(15, 40, 32)); bdShine(c, 18, 25, 3.5); },
  safari1(c){ const l = bdP2(p => { p.moveTo(32, 6); p.bezierCurveTo(56, 16, 54, 46, 32, 58); p.bezierCurveTo(10, 46, 8, 16, 32, 6); p.closePath(); }); bdBGem(c, l, '#3ab84a');
    c.strokeStyle = '#1a6a2a'; c.lineWidth = 2; c.beginPath(); c.moveTo(32, 12); c.lineTo(32, 54); [[22, 20], [40, 26], [22, 34], [40, 40]].forEach(([x, y]) => { c.moveTo(32, y + 6); c.lineTo(x, y); }); c.stroke(); bdShine(c, 24, 18, 3.5); },
  safariA(c){ const b = bdDisc(25, 32, 32); bdBGem(c, b, '#f4f4f4'); c.save(); c.clip(b); c.fillStyle = '#e8402c'; c.fillRect(0, 0, 64, 31); c.fillStyle = '#1a1020'; c.fillRect(0, 29, 64, 5); c.restore();
    bdBGem(c, bdDisc(7, 32, 32), '#ffffff'); bdShine(c, 22, 18, 4); },
  safariT(c){ const b = bdDisc(25, 32, 32); bdBGem(c, b, '#2a1a40'); c.save(); c.clip(b); c.fillStyle = '#6a3ab0'; c.fillRect(0, 0, 64, 31); c.fillStyle = '#ffd23f'; c.fillRect(0, 28, 64, 6); c.restore();
    bdBGem(c, bdDisc(7, 32, 32), '#ffd23f'); c.fillStyle = '#8a5ae8'; c.beginPath(); c.arc(32, 32, 3, 0, 6.2832); c.fill(); bdShine(c, 22, 18, 4); },
  contest1(c){ bdBGem(c, bdPoly([[22, 36], [14, 60], [24, 54], [28, 62], [30, 40]]), '#e85aa8'); bdBGem(c, bdPoly([[42, 36], [50, 60], [40, 54], [36, 62], [34, 40]]), '#e85aa8');
    bdBGem(c, bdStar(10, 22, 16, 32, 26, 0), '#ff8ad0'); bdBGem(c, bdDisc(9, 32, 26), '#ffd23f'); bdShine(c, 27, 20, 3); },
  contestM(c){ bdBGem(c, bdPoly([[22, 36], [14, 60], [24, 54], [28, 62], [30, 40]]), '#7a3ac8'); bdBGem(c, bdPoly([[42, 36], [50, 60], [40, 54], [36, 62], [34, 40]]), '#7a3ac8');
    bdBGem(c, bdStar(12, 22, 16, 32, 26, 0), '#c06eff'); bdBGem(c, bdStar(5, 10, 4.5, 32, 27), '#ffd23f'); bdShine(c, 25, 18, 3); },
  legend(c){ const f = bdP2(p => { p.moveTo(32, 4); p.bezierCurveTo(40, 18, 56, 22, 52, 42); p.bezierCurveTo(50, 54, 40, 60, 32, 60); p.bezierCurveTo(24, 60, 14, 54, 12, 42); p.bezierCurveTo(10, 30, 20, 26, 22, 14); p.bezierCurveTo(26, 22, 28, 26, 32, 4); p.closePath(); });
    bdBGem(c, f, '#e8402c'); c.fillStyle = '#ffd23f'; c.beginPath(); c.moveTo(32, 26); c.bezierCurveTo(42, 36, 40, 52, 32, 52); c.bezierCurveTo(24, 52, 22, 38, 32, 26); c.fill(); c.fillStyle = '#fff6c0'; c.beginPath(); c.moveTo(32, 38); c.lineTo(36, 46); c.lineTo(32, 50); c.lineTo(28, 46); c.closePath(); c.fill(); bdShine(c, 22, 30, 3); },
  online(c){ bdBGem(c, bdPoly([[36, 4], [14, 36], [30, 36], [24, 60], [50, 24], [34, 24], [42, 4]]), '#ffd23f'); c.fillStyle = '#f08a20'; c.beginPath(); c.moveTo(38, 8); c.lineTo(22, 32); c.lineTo(30, 32); c.closePath(); c.fill(); bdShine(c, 32, 14, 2.5); },
  shiny(c){ bdBGem(c, bdStar(4, 28, 8, 32, 32, -Math.PI/2), '#5ad8f0'); bdBGem(c, bdStar(4, 14, 4, 46, 16, -Math.PI/2), '#c0f4ff'); c.fillStyle = '#ffffff'; c.beginPath(); c.arc(32, 32, 3, 0, 6.2832); c.fill(); bdShine(c, 28, 20, 2.5); }
};
const bdBIMG = {};
function badgeImg(id, locked){
  const k = id + (locked ? ':l' : ''); if(bdBIMG[k]) return bdBIMG[k];
  const cv = document.createElement('canvas'); cv.width = cv.height = 64; const c = cv.getContext('2d');
  try{ (bdBDRAW[id] || bdBDRAW.depart)(c); }catch(e){ console.warn('badge', id, e); }
  if(locked){ c.globalCompositeOperation = 'source-atop'; c.fillStyle = '#2a2438'; c.fillRect(0, 0, 64, 64); c.globalCompositeOperation = 'source-over'; c.font = 'bold 22px monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#6a6080'; c.fillText('?', 32, 34); }
  return bdBIMG[k] = cv.toDataURL();
}
function badgeToast(list){
  list.slice(0, 3).forEach((B, i) => setTimeout(() => {
    Notif.show({ id:'bdg' + B.id, cls:'bdgn', title:`🏅 Nouveau badge : ${esc(B.name)}`, text:`<span class='bdgt'><img src='${badgeImg(B.id)}'><small>${esc(B.how)}</small></span>`, timeout:5, buttons:[{ label:'Voir mes badges', fn:() => { G = null; showBadges(); } }] });
    if(typeof playSfx === 'function') playSfx('victory');
  }, 400 + i*1500));
  if(list.length > 3) setTimeout(() => Notif.toast(`🏅 + ${list.length - 3} autres badges débloqués !`, '#ffd23f'), 400 + 3*1500);
}
function showBadges(sel){
  Badges.check(true);
  const got = BADGES.filter(B => Badges.has(B.id)).length, S = BADGES.find(B => B.id === sel) || BADGES.find(B => Badges.has(B.id)) || BADGES[0], has = Badges.has(S.id), when = has ? new Date(Badges.all()[S.id]).toLocaleDateString('fr-FR') : null;
  menu(`<div class='hd'><h1>Badges</h1><span class='bdgc'>${got}/${BADGES.length}</span></div>
    <div class='edit bdgv'><div class='scroll left'><div class='bdgcase'>${BADGES.map(B => `<button class='bgx ${Badges.has(B.id) ? 'on' : ''} ${B.id === S.id ? 'foc' : ''}' data-bdg='${B.id}' title='${esc(B.name)}'><img src='${badgeImg(B.id, !Badges.has(B.id))}'></button>`).join('')}</div></div>
      <div class='scroll right'><div class='bdgd'><img src='${badgeImg(S.id, !has)}'><div><b>${has ? esc(S.name) : '???'}</b><p>${esc(S.how)}</p><small>${has ? '✔ Obtenu le ' + when : '🔒 Pas encore obtenu'}</small></div></div></div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-bdg]', el => showBadges(el.dataset.bgx));
  document.getElementById('back').onclick = showMain;
}
SCREENS.badges = showBadges;
if(!MAIN_MENU.some(m => m.id === 'badges')){ const i = MAIN_MENU.findIndex(m => m.id === 'inventory'); MAIN_MENU.splice(i >= 0 ? i + 1 : MAIN_MENU.length, 0, { id:'badges', label:'Badges', desc:'Tes succès, comme des badges d\'arène', screen:'badges' }); }
// suivi de ce qui n'était pas encore enregistré + vérification après chaque combat et au retour au menu
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, R = G && G.raid;
  if(win && c){ const d = Save.load(); if(c.mode === 'online') d.onlineWins = (d.onlineWins || 0) + 1; if(c.mode === 'raid' && R && R.net) d.raidNetWins = (d.raidNetWins || 0) + 1; Save.save(); }
  const r = prev(win, why);
  setTimeout(() => Badges.check(), 1200);
  return r;
})(battleEnd);
showMain = (prev => function(){ const r = prev.apply(this, arguments); setTimeout(() => Badges.check(), 600); return r; })(showMain);
setTimeout(() => { try{ if(typeof Owned !== 'undefined' && Owned.ready()) Badges.check(); }catch(e){} }, 3000);

document.head.insertAdjacentHTML('beforeend', `<style>
.bdgv .left{flex:0 0 58%}.bdgcase{display:grid;grid-template-columns:repeat(6,1fr);gap:4px;padding:6px;background:linear-gradient(180deg,#3a1420,#22080e);border:2px solid #8a5a20;border-radius:10px;box-shadow:inset 0 0 0 2px #2a0a10,inset 0 6px 14px rgba(0,0,0,.6)}
.bgx{background:radial-gradient(circle at 50% 40%,#5a2430,#2a0c12);border:1px solid #6a3a20;border-radius:8px;padding:3px;aspect-ratio:1;display:flex;align-items:center;justify-content:center;cursor:pointer}
.bgx img{width:100%;max-width:52px;image-rendering:auto;filter:bdDrop-shadow(0 2px 2px rgba(0,0,0,.6))}.bgx.on img{filter:bdDrop-shadow(0 2px 2px rgba(0,0,0,.6)) bdDrop-shadow(0 0 4px rgba(255,220,120,.35))}
.bgx.foc{outline:2px solid #ffd23f;box-shadow:0 0 10px rgba(255,210,63,.5)}
.bdgd{display:flex;gap:10px;align-items:center;text-align:left}.bdgd img{width:96px;height:96px;filter:bdDrop-shadow(0 3px 4px rgba(0,0,0,.6))}.bdgd b{color:#ffe9a0;font-size:14px}.bdgd p{font-size:11px;margin:4px 0}.bdgd small{font-size:10px;color:var(--txt2,#c9bcd8)}
.bdgc{color:#ffd23f;font-size:13px}
.np.bdgn{border-color:#ffd23f}.bdgt{display:flex;align-items:center;gap:6px}.bdgt img{width:40px;height:40px}
</style>`);
