// ============================================================
//  patch-v022.js — VERSION 0.22.0 (rapport de test n°1 complet)
//   BUGS
//    1. Badges « Départ+ », « Colosse », « Pokédex » donnés au chargement (liste vide) → corrigé + retirés des sauvegardes concernées
//    2. Safari : les Pokémon sauvages se chargent après le menu (démarrage plus rapide) → on attend qu'ils soient prêts
//    3. Touches affichées selon le clavier réel (AZERTY : la relève est « A »)
//    4. Petits textes : « Niveau terminé : … », règles et fin de la Tour, doublon de l'écran de défaite
//    5. Menus sur téléphone, ligature « fi », carte Raid du menu, nombres de dégâts sous le HUD, boutons du choix du starter
//   ÉQUILIBRAGE / ÉCONOMIE
//    6. Mur du niveau 3 : conseil + bouton direct vers le Safari, « Conseillé : 2 Pokémon »
//    7. Safari Découverte (facile) : Fouinar, Raichu, Florizarre — 2 salles, pas de boss, capture ×1,5, ticket 100 ₽
//       + ticket rendu si on échoue dans la dernière salle, + 2 Poké Balls offertes
//    8. Gains : 15–20 ₽ minimum par victoire rejouée ; achat ×5 avec remise ; ticket des Titans verrouillé
//    9. Concours : bonus de Style pour les débutants sans capsule, règle du Total affichée
//   ERGONOMIE
//   10. PC : plus de joystick, petits boutons d'attaque ; grille Solo compacte ; bouton plein écran dans un coin
//   11. « Quitter le combat ? » (Solo, Safari) ; rappel « Va vers la SORTIE » ; recrues de la Tour : PV + attaques
//   NOUVEAU
//   12. Quêtes du jour (3 défis par jour) + objectifs du débutant
//   13. Indice de type avant un niveau Solo ; écran de défaite utile (dégâts, conseil)
//   14. Menu allégé pour les débutants : les modes avancés se dévoilent après le 2e Pokémon ou le niveau 3
// ============================================================

// ---------------------------------------------------------------- 1. badges
(() => {
  const fix = (id, fn) => { const B = BADGES.find(x => x.id === id); if(B) B.ok = fn; };
  fix('safariA', () => { const Z = SAFARI.zones.find(x => x.id === 'depart'), L = Z ? Z.pokemon.filter(id => ORDER.includes(id)) : []; return L.length > 0 && L.every(id => Owned.has(id)); });
  fix('safariT', () => { const Z = SAFARI.zones.find(x => x.id === 'titans'), L = Z ? Z.pokemon.filter(id => ORDER.includes(id)) : []; return L.length > 0 && L.every(id => Owned.has(id)); });
  fix('collectAll', () => ORDER.length > 5 && ORDER.every(id => Owned.list().includes(id)));
  const chk = Badges.check;
  Badges.check = function(silent){ if(!ORDER.length || !(typeof Owned !== 'undefined' && Owned.ready && Owned.ready())) return []; return chk.call(this, silent); };
})();
// sauvegardes touchées : on retire ces 3 badges s'ils ne sont pas réellement mérités (une seule fois)
function v22BadgeClean(){
  const d = Save.load(); if(d.v22badges || !ORDER.length) return; d.v22badges = 1;
  ['safariA', 'safariT', 'collectAll'].forEach(id => { const B = BADGES.find(x => x.id === id); let ok = false; try{ ok = B && B.ok(); }catch(e){}
    if(Badges.has(id) && !ok) delete Badges.all()[id]; });      // (si la récompense a déjà été prise, elle reste marquée « récupérée »)
  Save.save();
}

// ---------------------------------------------------------------- 2. Safari : sprites sauvages chargés en arrière-plan
const v22Wild = pid => (SAFARI_ROOMS[pid] || []).map(r => r.pokemon).concat(pid).filter(id => POKEMON[id] && !SPR[id]);
function v22WaitWild(pid, go){
  if(!v22Wild(pid).length) return go();
  menu(`<h1>Préparation du Safari…</h1><div class='ldbox'><i id='ldbar' style='width:60%'></i></div>`);
  WILD_READY.then(() => go());
}

// ---------------------------------------------------------------- 3. touches selon le clavier (AZERTY / QWERTY)
let V22_LAYOUT = null;
try{ if(navigator.keyboard && navigator.keyboard.getLayoutMap) navigator.keyboard.getLayoutMap().then(m => { V22_LAYOUT = m; }).catch(() => {}); }catch(e){}
const V22_AZERTY = { KeyQ:'A', KeyA:'Q', KeyW:'Z', KeyZ:'W', Semicolon:'M', KeyM:',' };
keyName = (prev => function(code){
  if(V22_LAYOUT && /^(Key|Digit|Semicolon|Comma|Period|Slash|Quote|Bracket)/.test(code || '')){ const k = V22_LAYOUT.get(code); if(k) return k.toUpperCase(); }
  if(!V22_LAYOUT && /^fr/i.test(navigator.language || '') && V22_AZERTY[code]) return V22_AZERTY[code];
  return prev(code);
})(keyName);

// ---------------------------------------------------------------- 4/5. textes et petits défauts d'affichage
if(typeof MAIN_MENU !== 'undefined'){
  const tr = MAIN_MENU.find(m => m.id === 'training'); if(tr) tr.desc = 'Teste tes Pokémon contre le mannequin de ton choix';
  const tw = MAIN_MENU.find(m => m.id === 'tower'); if(tw) tw.desc = 'Le meilleur mode pour gagner des ₽ : monte le plus haut possible';
}
// nombres de dégâts : jamais par-dessus les barres de PV du haut
step = (prev => function(dt){ prev(dt); if(G && !G.over) for(const t of txt) if(t.y < 84) t.y = 84; })(step);
// accessibilité : nom des boutons du choix du starter
menu = (prev => function(h){
  prev(h);
  if(!h) return;
  document.querySelectorAll('[data-st]').forEach(b => { if(!b.getAttribute('aria-label') && NAME[b.dataset.st]) b.setAttribute('aria-label', NAME[b.dataset.st]); });
  document.querySelectorAll('#menu img:not([alt])').forEach(i => i.setAttribute('alt', ''));
  // Concours : la règle du total
  const ct = document.querySelector('#menu .ctab'); if(ct && !document.querySelector('.ctabnote') && typeof WEIGHT !== 'undefined')
    ct.insertAdjacentHTML('afterend', `<p class='ctabnote'>Total = ${Math.round(WEIGHT.style*100)} % du Style + ${Math.round(WEIGHT.dance*100)} % du Rythme + ${Math.round(WEIGHT.perf*100)} % de la Prestation</p>`);
  // Tour : recrues → PV et attaques
  document.querySelectorAll('#menu .twopt[data-two]').forEach(b => { const id = b.dataset.two; if(!id || !HERO[id] || b.querySelector('.twrc')) return;
    b.insertAdjacentHTML('beforeend', `<span class='twrc'><b>${HERO[id].hp*10} PV</b>${(MV[id] || []).map(m => `<i style='background:${COL[m.tp] || '#666'}'>${esc(m.n)}</i>`).join('')}</span>`); });
})(menu);

// ---------------------------------------------------------------- 6. mur du niveau 3 + 13. écran de défaite utile
hurtE = (prev => function(d, b){ const e = G && G.e, h0 = e ? e.hp : 0, r = prev(d, b); if(G && e){ const dd = Math.max(0, h0 - Math.max(0, e.hp)); G.v22 = G.v22 || { dmg:0, taken:0 }; G.v22.dmg += dd; Quests.ev('dmg', dd); if(h0 > 0 && e.hp <= 0) Quests.ev('ko', 1); } return r; })(hurtE);
hurtP = (prev => function(d, b){ const p = G && G.p, h0 = p ? p.hp : 0, r = prev(d, b); if(G && p){ G.v22 = G.v22 || { dmg:0, taken:0 }; G.v22.taken += Math.max(0, h0 - Math.max(0, p.hp)); } return r; })(hurtP);
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, mode = c && c.mode, st = G && G.v22, team = G ? G.team.slice() : [], si = c && c.stageIndex, caught = G && G.caught;
  const rooms = c && c.rooms, lastRoom = rooms ? (G.rm && G.rm.ri === rooms.length - 1) : true, zone = c && c.zone;
  // quêtes
  try{ if(win && mode && !['safari', 'training'].includes(mode)){ Quests.ev('win', 1); Quests.ev('win:' + mode, 1); if(team.length && team.every(x => x.hp > 0)) Quests.ev('flawless', 1); }
    if(mode === 'tourney') Quests.ev('tourney', 1); }catch(e){}
  const r = prev(win, why);
  try{
    if(mode === 'solo' && !win){
      const box = [], dm = st ? `<p class='v22st'>Dégâts infligés <b>${Math.round(st.dmg*10)}</b> · reçus <b>${Math.round(st.taken*10)}</b></p>` : '';
      if(si === 2 && team.length === 1){
        const more = Owned.list().length >= 2;
        box.push(`<div class='v22tip'><b>${more ? 'Ton équipe est trop petite : ajoute ton 2e Pokémon !' : 'Ton équipe est trop petite : capture un 2e Pokémon au Safari !'}</b>
          <small>Au niveau 3, tu affrontes 3 adversaires, dont un boss. Avec 2 ou 3 Pokémon, c'est bien plus simple.</small>
          <button class='btn' id='v22go'>${more ? 'Mes équipes' : 'Aller au Safari'}</button></div>`);
      } else if(si >= 2) box.push(`<p class='v22tip2'>💡 Conseil : la <b>Tour de Combat</b> rapporte vite des ₽ et le <b>Safari</b> agrandit ton équipe.</p>`);
      // l'écran de défaite peut s'afficher un peu après (animation de K.O.) : on attend qu'il soit là
      let tries = 0; const put = () => { const h = document.querySelector('#menu h1'); if(h && /Défaite/.test(h.textContent) && !document.querySelector('.v22st')){ h.insertAdjacentHTML('afterend', dm + box.join('')); const b = document.getElementById('v22go'); if(b) b.onclick = () => Owned.list().length >= 2 ? showTeams() : showSafari({ zone:'decouverte' }); } else if(tries++ < 40) setTimeout(put, 100); }; put();
    }
    // Safari : ticket rendu si l'échec arrive dans la dernière salle
    if(mode === 'safari' && !caught && !(c && c.tuto) && lastRoom && zone && ZONE[zone]){
      Save.addItem(ZONE[zone].ticket.id, 1);
      const hn = document.querySelector('#menu .hint'); if(hn) hn.innerHTML = '🎟 <b>Ticket rendu</b> : tu avais atteint la dernière salle. Réessaie quand tu veux !';
    }
  }catch(e){ console.warn('v22 fin', e); }
  return r;
})(battleEnd);

// ---------------------------------------------------------------- 7. Safari Découverte
const SAFARI_EASY = { id:'decouverte', name:'Safari Découverte', easy:true, desc:'Le Safari pour débuter : 2 salles, pas de boss, capture plus facile.',
  pokemon:['fouinar', 'raichu', 'florizarre'],
  ticket:{ id:'ticket:decouverte', name:'Ticket Safari — Découverte', price:100, col:'#ffb020' },
  stage:{ name:'Safari Découverte', level:2, hp:1.3, dmg:.55, speed:1, pspeed:.95, rate:1.2, tele:1.15, aim:.3, boss:1 } };
if(!SAFARI.zones.some(z => z.id === SAFARI_EASY.id)){ SAFARI.zones.unshift(SAFARI_EASY); ZONE[SAFARI_EASY.id] = SAFARI_EASY; }
let V22_SFZ = null;
roomsFor = (prev => function(pid){ const R = prev(pid); return R && V22_SFZ && V22_SFZ.easy && R.length > 2 ? [R[0], R[R.length - 1]] : R; })(roomsFor);      // Découverte : 1re salle (la plus facile) + la cible
startSafari = (prev => function(team, z, pid){
  v22WaitWild(pid, () => { V22_SFZ = z; try{ prev(team, z, pid); } finally { V22_SFZ = null; } });
})(startSafari);
if(typeof startFirstSafari === 'function') startFirstSafari = (prev => function(team, pid){ v22WaitWild(pid, () => prev(team, pid)); })(startFirstSafari);
showSafari = (prev => function(sel){
  const z = ZONE[sel && sel.zone] || SAFARI.zones[0]; V22_SFZ = z;
  try{ prev(sel); } finally { V22_SFZ = null; }
  if(z && z.easy){ const r = document.querySelector('#menu .sf-ed .right'); if(r && !r.querySelector('.v22easy')) r.insertAdjacentHTML('afterbegin', `<p class='v22easy'>🌱 <b>Safari facile</b> : 2 salles, pas de boss, capture <b>×1,5</b>. Ticket rendu si tu échoues dans la dernière salle.</p>`); }
})(showSafari);
SCREENS.safari = showSafari;
catchChance = (prev => function(e, b){ const c = prev(e, b); return G && G.cfg && G.cfg.zone === 'decouverte' ? Math.min(.97, c*1.5) : c; })(catchChance);
spawn = (prev => function(){ prev(); if(G && G.cfg && G.cfg.mode === 'safari' && G.cfg.zone === 'decouverte' && G.e && G.e.t === G.cfg.target){ G.e.boss = false; G.e.r = Math.min(G.e.r, 26); } })(spawn);
// 2 Poké Balls offertes avec le ticket du début (une fois)
showMain = (prev => function(){
  const r = prev.apply(this, arguments);
  try{ const d = Save.load(); if(d.freeTicket && !d.v22balls && typeof Owned !== 'undefined' && Owned.ready()){ d.v22balls = 1; Save.addItem('ball:poke', 2); Save.save(); setTimeout(() => Notif.toast('🎁 2 Poké Balls offertes pour ton premier Safari !'), 4500); }
    v22BadgeClean(); }catch(e){}
  return r;
})(showMain);

// ---------------------------------------------------------------- 8. gains et Magasin
soloReward = (prev => function(stageIndex, enemies, first){
  const R = prev(stageIndex, enemies, first);
  if(!first){ const floor = stageIndex < 1 ? 15 : 20; if(R.win < floor){ R.win = floor; R.total = R.win + R.bonus; } }
  return R;
})(soloReward);
const V22_X5 = .88;      // ×5 : 12 % de remise
showShop = (prev => function(tab){
  const r = prev(tab);
  if(tab !== 'safari') return r;
  const unit = id => BALL[id] ? BALL[id].price : (SAFARI.zones.find(z => z.ticket.id === id) || { ticket:{ price:0 } }).ticket.price;
  const lockT = typeof raidUnlocked === 'function' && !raidUnlocked();
  document.querySelectorAll('[data-buy]').forEach(b => {
    const id = b.dataset.buy, n = +b.dataset.n, p = n === 5 ? Math.round(unit(id)*5*V22_X5/5)*5 : unit(id);
    if(n === 5) b.innerHTML = `×5 · ${money(p)} <s>${money(unit(id)*5)}</s>`;
    b.disabled = Save.coins() < p;
    if(id === 'ticket:titans' && lockT){ b.disabled = true; if(n === 1) b.insertAdjacentHTML('beforebegin', `<small class='v22lk'>🔒 Termine le niveau 7</small>`); }
    b.onclick = () => { if(b.disabled) return; if(Save.spend(p)){ Save.addItem(id, n); if(id.startsWith('ball:')) Save.load().boughtBall = 1; if(typeof coinSfx === 'function') coinSfx(); Save.save(); showShop('safari'); } };
  });
  return r;
})(showShop);
SCREENS.shop = showShop;

// ---------------------------------------------------------------- 9. Concours : un débutant sans capsule n'est plus dernier d'office
styleCalc = (prev => function(C, ct){
  const R = prev(C, ct);
  if(ct && ct.human >= 0 && !ct.cap && C.rank <= 1) R.score = Math.min(100, R.score + 12);       // « charme naturel »
  return R;
})(styleCalc);

// ---------------------------------------------------------------- 10. PC / téléphone : affichage
const v22PC = () => { const pc = (typeof IS_PC === 'function' ? IS_PC() : matchMedia('(hover: hover) and (pointer: fine)').matches) && !V22_TOUCH; document.body.classList.toggle('pcmode', pc); };
let V22_TOUCH = false;
addEventListener('touchstart', () => { if(!V22_TOUCH){ V22_TOUCH = true; v22PC(); } }, { passive:true });
v22PC();
document.head.insertAdjacentHTML('beforeend', `<style>
body,#menu,button{font-variant-ligatures:none;font-feature-settings:"liga" 0,"clig" 0}
/* PC : pas de joystick, petits boutons d'attaque (recharges visibles) en bas à droite */
body.pcmode #joy{display:none!important}
body.pcmode #btns{transform:scale(.62);transform-origin:bottom right;opacity:.85}
/* menu principal sur téléphone : la colonne défile, la description se cache quand un groupe est ouvert */
.mm-side{overflow-y:auto;overflow-x:hidden;scrollbar-width:none}.mm-side::-webkit-scrollbar{display:none}
@media (max-height:420px){ .mm-side:has(.mmi.open) .mm-desc{display:none} }
/* carte Raid / Mewtwo du menu : fond opaque, marge à droite */
.mm-feat{background:rgba(22,14,40,.94)!important;right:8px!important;border-radius:10px!important;max-width:calc(100% - 330px)}
/* bouton plein écran : dans le coin en bas à droite hors combat */
#app.nogame #fsBtn{left:auto!important;right:calc(8px + env(safe-area-inset-right,0px))!important;bottom:calc(8px + env(safe-area-inset-bottom,0px))!important;transform:scale(.8)!important;transform-origin:bottom right!important;opacity:.75}
/* grille Solo compacte (2 lignes de 5) sur petit écran */
@media (max-height:440px){ .stages{gap:3px}.stg{padding:1px 2px!important}.stg b{font-size:12px}.stg small{font-size:8px}.stg .stars{font-size:7px;line-height:1}
  .chtabs .btn2{max-width:46vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.chhead small{font-size:8px} }
.ctabnote{font-size:9px;color:#c9bcd8;margin:2px 0}
.twrc{display:flex;flex-wrap:wrap;gap:2px;justify-content:center;margin-top:3px}.twrc b{width:100%;font-size:9px;color:#8dff9a}.twrc i{font-style:normal;font-size:7.5px;padding:0 3px;border-radius:3px;color:#fff;text-shadow:0 1px 0 #0006}
.twcompact .twrc{display:none}
.v22st{font-size:11px;margin:2px 0}.v22tip{margin:6px auto;padding:6px 10px;max-width:460px;border:2px solid #ffd23f;border-radius:10px;background:rgba(60,40,10,.8)}.v22tip b{display:block;color:#ffe27a}.v22tip small{display:block;margin:3px 0}
.v22easy{font-size:10px;margin:0 0 4px;padding:3px 6px;border-radius:7px;background:rgba(40,120,50,.5);border:1px solid #5ad06a;text-align:left}.v22tip2{font-size:11px;color:#ffe9a0}.v22lk{font-size:9px;color:#ffb070;margin-right:4px}
[data-buy] s{opacity:.55;font-size:.8em}
</style>`);

// ---------------------------------------------------------------- 11. confirmations et rappels
showPauseMenu = (prev => function(){
  prev();
  const q = document.getElementById('qt'), mode = G && G.cfg && G.cfg.mode; if(!q || !['solo', 'safari'].includes(mode)) return;
  const orig = q.onclick;
  q.onclick = () => gameConfirm('Quitter le combat ?', mode === 'safari' ? 'Le <b>ticket</b> utilisé sera perdu.' : 'Le combat sera perdu (aucun gain).', 'Quitter', () => orig && orig());
})(showPauseMenu);
// Safari : rappel permanent tant que la sortie n'est pas atteinte + grande flèche
drawScreenFx = (prev => function(){
  prev();
  const S = G && G.rm; if(!S || !S.door || S.doorMsg || G.over) return;
  ctx.save(); ctx.globalAlpha = .75 + .25*Math.sin(G.time*4); htext('➜ Va vers la SORTIE (la porte lumineuse)', VW/2, 74, 10, '#ffe9a0', 'center'); ctx.restore();
})(drawScreenFx);
drawBullets = (prev => function(){
  prev();
  const S = G && G.rm, D = S && S.door, p = G && G.p; if(!D || !p) return;
  const an = Math.atan2(D.y - p.y, D.x - p.x); if(Math.hypot(D.x - p.x, D.y - p.y) < 120) return;
  ctx.save(); ctx.translate(p.x + Math.cos(an)*58, p.y + Math.sin(an)*58); ctx.rotate(an); ctx.globalAlpha = .55 + .45*Math.sin(G.time*8);
  ctx.fillStyle = '#ffe9a0'; ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(22, 0); ctx.lineTo(-8, -14); ctx.lineTo(-2, 0); ctx.lineTo(-8, 14); ctx.closePath(); ctx.stroke(); ctx.fill(); ctx.restore();
})(drawBullets);

// ---------------------------------------------------------------- 12. QUÊTES DU JOUR + objectifs du débutant
const QUEST_POOL = [
  { id:'solo2',   txt:'Gagne 2 combats en Solo',                     n:2,   ev:'win:solo',  r:40 },
  { id:'win3',    txt:'Gagne 3 combats (tous modes)',                n:3,   ev:'win',       r:45 },
  { id:'tower3',  txt:'Franchis 3 étages de la Tour de Combat',      n:3,   ev:'win:tower', r:40 },
  { id:'dmg',     txt:'Inflige 1 500 dégâts',                        n:150, ev:'dmg',       r:30, k:10 },
  { id:'flaw',    txt:'Gagne un combat sans perdre de Pokémon',      n:1,   ev:'flawless',  r:50 },
  { id:'ko10',    txt:'Mets 10 Pokémon adverses K.O.',               n:10,  ev:'ko',        r:35 },
  { id:'ball2',   txt:'Lance 2 Balls au Safari',                     n:2,   ev:'ball',      r:30 },
  { id:'contest', txt:'Participe à un Concours Pokémon',             n:1,   ev:'contest',   r:40 },
  { id:'tourney', txt:'Joue un combat de Tournoi',                   n:1,   ev:'tourney',   r:40 }
];
const BEGIN_GOALS = [
  { id:'b-lv2',   txt:'Termine le niveau 2 du Solo',        r:50,  ok:() => Math.max(Save.cleared(3), Save.cleared(6)) >= 2, go:() => SCREENS.solo() },
  { id:'b-tower', txt:'Franchis 3 étages de la Tour',       r:60,  ok:() => Tower.stats().floors >= 3, go:() => SCREENS.tower() },
  { id:'b-balls', txt:'Achète des Poké Balls au Magasin',   r:40,  ok:() => !!Save.load().boughtBall || SAFARI.balls.reduce((s, b) => s + Save.itemCount(b.id), 0) >= 3, go:() => showShop('safari') },
  { id:'b-catch', txt:'Capture un Pokémon au Safari',       r:80,  ok:() => Owned.list().length >= 2, go:() => showSafari({ zone:'decouverte' }) },
  { id:'b-lv3',   txt:'Termine le niveau 3 du Solo',        r:100, ok:() => Math.max(Save.cleared(3), Save.cleared(6)) >= 3, go:() => SCREENS.solo() }
];
const Quests = {
  day(){ const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  d(){
    const s = Save.load(), day = this.day();
    if(!s.quests || s.quests.day !== day){
      let seed = [...day].reduce((a, c) => a*31 + c.charCodeAt(0), 7) >>> 0; const rnd = () => (seed = (seed*1103515245 + 12345) >>> 0)/4294967296;
      const pool = QUEST_POOL.filter(q => !(q.id === 'contest' && typeof CONTEST_RANKS === 'undefined')).slice(), list = [];
      while(list.length < 3 && pool.length) list.push({ id:pool.splice(Math.floor(rnd()*pool.length), 1)[0].id, p:0, c:0 });
      s.quests = { day, list, goals:(s.quests && s.quests.goals) || {} };
    }
    if(!s.quests.goals) s.quests.goals = {};
    return s.quests;
  },
  def: id => QUEST_POOL.find(q => q.id === id),
  ev(kind, n){
    if(typeof Save === 'undefined') return; let ch = false;
    try{ this.d().list.forEach(q => { const D = this.def(q.id); if(!D || q.c || q.p >= D.n) return; if(D.ev === kind){ q.p = Math.min(D.n, q.p + (n || 1)); ch = true; if(q.p >= D.n) Notif.toast(`📜 Quête accomplie : ${D.txt} — récupère ${money(D.r)} !`); } }); }catch(e){}
    if(ch) Save.save();
  },
  open(){ const Q = this.d(); return Q.list.filter(q => { const D = this.def(q.id); return D && !q.c && q.p >= D.n; }).length + BEGIN_GOALS.filter(g => !Q.goals[g.id] && g.ok()).length; },
  beginner(){ return BEGIN_GOALS.some(g => !this.d().goals[g.id]); }
};
Save.addItem = (prev => function(id, n){ const r = prev.call(this, id, n); if(n < 0 && String(id).startsWith('ball:') && G && G.cfg && G.cfg.mode === 'safari') Quests.ev('ball', 1); return r; })(Save.addItem);
if(typeof contestEnd === 'function') contestEnd = (prev => function(C){ Quests.ev('contest', 1); return prev(C); })(contestEnd);
function showQuests(msg){
  const Q = Quests.d(), now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), left = mid - now, hh = Math.floor(left/3600e3), mm = Math.floor(left/60e3) % 60;
  const qrow = q => { const D = Quests.def(q.id); if(!D) return ''; const k = D.k || 1, done = q.p >= D.n;
    return `<div class='qrow ${q.c ? 'got' : done ? 'ok' : ''}'><div><b>${esc(D.txt)}</b><i><u style='width:${q.p/D.n*100}%'></u></i><small>${Math.round(q.p*k)} / ${D.n*k}</small></div>
      ${q.c ? `<em>✔ Récupérée</em>` : done ? `<button class='btn sm' data-qc='${q.id}'>+${money(D.r)}</button>` : `<span class='qr'>${money(D.r)}</span>`}</div>`; };
  const begin = Quests.beginner();
  menu(`<div class='hd'><h1>Quêtes du jour</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='edit qv'><div class='scroll left'><p class='qh'>Défis du jour <small>· nouveaux dans ${hh} h ${String(mm).padStart(2, '0')}</small></p>${Q.list.map(qrow).join('')}</div>
      ${begin ? `<div class='scroll right'><p class='qh'>Objectifs du débutant</p>${BEGIN_GOALS.map((g, i) => { const got = Q.goals[g.id], ok = g.ok();
        return `<div class='qrow ${got ? 'got' : ok ? 'ok' : ''}'><div><b>${i + 1}. ${esc(g.txt)}</b></div>${got ? `<em>✔</em>` : ok ? `<button class='btn sm' data-gc='${g.id}'>+${money(g.r)}</button>` : `<button class='btn2 sm' data-gg='${g.id}'>Y aller</button>`}</div>`; }).join('')}
        <p class='hint'>Termine-les pour bien démarrer : les modes avancés se dévoilent en chemin.</p></div>` : ''}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-qc]', b => { const q = Q.list.find(x => x.id === b.dataset.qc), D = Quests.def(q.id); if(q.c || q.p < D.n) return; q.c = 1; Save.addCoins(D.r); Save.save(); if(typeof coinSfx === 'function') coinSfx(); showQuests('+' + money(D.r)); });
  bindAll('[data-gc]', b => { const g = BEGIN_GOALS.find(x => x.id === b.dataset.gc); if(Q.goals[g.id] || !g.ok()) return; Q.goals[g.id] = 1; Save.addCoins(g.r); Save.save(); if(typeof coinSfx === 'function') coinSfx(); showQuests('+' + money(g.r)); });
  bindAll('[data-gg]', b => BEGIN_GOALS.find(x => x.id === b.dataset.gg).go());
  document.getElementById('back').onclick = showMain;
}
SCREENS.quests = showQuests;
if(!MAIN_MENU.some(m => m.id === 'quests')) MAIN_MENU.push({ id:'quests', label:'Quêtes du jour', desc:'3 défis par jour (+ objectifs du débutant) : des ₽ à gagner', screen:'quests' });
if(!MM_GROUPS.some(g => g.id === 'quests')) MM_GROUPS.splice(1, 0, { id:'quests' });
// pastille sur l'entrée du menu
renderMainMM = (prev => function(){
  prev();
  try{ const n = Quests.open(), b = document.querySelector(".mmi[data-id='quests']"); if(n && b) b.insertAdjacentHTML('beforeend', `<span class='bdgdot'>${n}</span>`);
    const L = document.querySelector(".mmi[data-id='v22lock']"); if(L) L.classList.add('v22lock'); }catch(e){}
})(renderMainMM);
document.head.insertAdjacentHTML('beforeend', `<style>
.qv .left,.qv .right{display:flex;flex-direction:column;gap:5px}.qh{margin:0 0 2px;font-size:12px;color:#ffd890;letter-spacing:1px;text-transform:uppercase;text-align:left}.qh small{text-transform:none;letter-spacing:0;color:#c9bcd8;font-size:9px}
.qrow{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:10px;border:1px solid rgba(255,255,255,.12);background:rgba(20,12,36,.7);text-align:left}.qrow>div{flex:1;min-width:0}.qrow b{font-size:11px;display:block}
.qrow i{display:block;height:6px;border-radius:4px;background:rgba(255,255,255,.12);overflow:hidden;margin:3px 0 1px}.qrow i u{display:block;height:100%;background:linear-gradient(90deg,#ffb020,#ffe27a)}.qrow small{font-size:8.5px;color:#c9bcd8}
.qrow.ok{border-color:#ffd23f;box-shadow:0 0 8px rgba(255,210,63,.35)}.qrow.got{opacity:.55}.qrow em{font-style:normal;font-size:10px;color:#8dff9a}.qr{font-size:10px;color:#ffe27a;white-space:nowrap}
.mmi.v22lock{opacity:.55}
</style>`);

// ---------------------------------------------------------------- 13. indice de type avant un niveau Solo (+ « Conseillé : 2 Pokémon »)
function v22Adv(a, b){ return lg2(bestHit(a, b)) - lg2(bestHit(b, a)); }
showSoloCh = (prev => function(sel){
  prev(sel);
  try{
    const on = document.querySelector('.stg.on[data-stage]'); if(!on) return;
    const i = +on.dataset.stage, size = Save.load().soloSize || 3, ch = Math.floor(i/CH_SIZE), C = CHAPTERS[ch];
    const tb = document.querySelector("[data-team].on"), t = tb ? Save.team(tb.dataset.team) : null;
    let foes = ((C && C['teams' + size]) || [])[i - ch*CH_SIZE] || [];
    if(SOLO_COUNT && SOLO_COUNT[i] != null) foes = foes.slice(0, SOLO_COUNT[i]);
    if(STAGE_BOSS && STAGE_BOSS[i] && !foes.includes(STAGE_BOSS[i])) foes = foes.slice(0, -1).concat(STAGE_BOSS[i]);
    foes = foes.filter(id => HERO[id]);
    if(i === 2 && Owned.list().length < 2){ const b = document.querySelector(".stg[data-stage='2']"); if(b && !b.querySelector('.v22rec')) b.insertAdjacentHTML('beforeend', `<i class='v22rec'>Conseillé : 2 Pokémon</i>`); }
    if(!foes.length || !t || on.disabled) return;
    const uniq = [...new Set(foes)], mem = t.members.filter(id => HERO[id]);
    const pill = id => { const s = uniq.reduce((a, f) => a + v22Adv(id, f), 0)/uniq.length; return s > .3 ? `<b class='adv up'>▲ avantage</b>` : s < -.3 ? `<b class='adv dn'>▼ désavantage</b>` : `<b class='adv eq'>= équilibré</b>`; };
    const html = `<div class='v22ty'><span class='v22f'><small>Adversaires</small>${foes.map(id => `<span class='v22m'>${thumb(id)}<em>${typesOf(id).map(x => `<i style='background:${COL[x]}'>${TN[x] || x}</i>`).join('')}</em></span>`).join('')}</span>
      <span class='v22f'><small>Ton équipe</small>${mem.map(id => `<span class='v22m'>${thumb(id)}${pill(id)}</span>`).join('')}</span></div>`;
    const tr = tb && tb.closest('.row'); if(tr) tr.insertAdjacentHTML('beforeend', html);
  }catch(e){ console.warn('v22 type', e); }
})(showSoloCh);
showSolo = sel => showSoloCh(sel); SCREENS.solo = sel => showSoloCh(sel);
document.head.insertAdjacentHTML('beforeend', `<style>
.v22ty{display:inline-flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:0 0 0 6px;font-size:9px;vertical-align:middle}.v22f{display:flex;align-items:center;gap:4px;padding:2px 6px;border-radius:8px;background:rgba(0,0,0,.3)}.v22f>small{color:#ffd890;font-size:8px;text-transform:uppercase}
.v22m{display:inline-flex;flex-direction:column;align-items:center}.v22m img{width:22px;height:22px;image-rendering:pixelated}.v22m em{display:flex;gap:1px;font-style:normal}.v22m em i{font-style:normal;font-size:6.5px;padding:0 2px;border-radius:2px;color:#fff}
.adv{font-size:7.5px;padding:0 3px;border-radius:3px}.adv.up{background:#2e8a3e;color:#dfffe4}.adv.dn{background:#a8302a;color:#ffe0dc}.adv.eq{background:#555;color:#eee}
.stg .v22rec{position:absolute;left:0;right:0;bottom:1px;font-style:normal;font-size:6.5px;color:#ffe27a;background:rgba(80,50,0,.8)}
</style>`);

// ---------------------------------------------------------------- 14. menu allégé pour les débutants
const V22_ADV = ['contest', 'pension', 'tourney', 'online'];
const v22Beginner = () => { try{ return typeof Owned !== 'undefined' && Owned.ready() && Owned.list().length < 2 && Math.max(Save.cleared(3), Save.cleared(6)) < 3 && !Save.load().v22all; }catch(e){ return false; } };
mmView = (prev => function(full){
  if(!v22Beginner()) return prev(full);
  const out = prev(full.map(m => V22_ADV.includes(m.id) ? { ...m, soon:true } : m));
  out.push({ id:'v22lock', label:'🔒 Plus de modes', desc:'Concours, Pension, Tournoi, Multijoueur : capture un 2e Pokémon ou termine le niveau 3 du Solo', screen:'v22lock' });
  return out;
})(mmView);
SCREENS.v22lock = () => gameConfirm('Modes avancés', 'Le <b>Concours</b>, la <b>Pension</b>, le <b>Tournoi</b> et le <b>Multijoueur</b> se dévoilent dès que tu as <b>2 Pokémon</b> ou que tu as terminé le <b>niveau 3</b> du Solo.<br><small>Tu peux aussi les afficher tout de suite.</small>', 'Tout afficher', () => { Save.load().v22all = 1; Save.save(); showMain(); });
