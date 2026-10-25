// ============================================================
//  patch-v023.js — VERSION 0.23.0 (rapport de test n°2)
//   BUGS
//    1. Magasin ouvert depuis le menu : remise ×5 et verrou du ticket des Titans s'appliquent aussi
//    2. Mode développeur caché (lien « ?dev=1 ») et toujours coupé quand un compte en ligne est connecté
//    3. Safari : « Ticket rendu » s'affiche aussi quand l'équipe est K.O. ; icône 🌱 pour le Safari Découverte
//    4. Téléphone : l'adversaire ne se cache plus sous les boutons (caméra décalée + boutons transparents)
//    5. Tournoi : message clair s'il manque des Pokémon ; quêtes du jour seulement pour les modes débloqués
//    6. Fenêtre de confirmation fermée quand on change d'écran ; « 2 adversaires battus sur 3 »
//    7. Musiques : un fichier absent du manifeste est quand même vérifié (une musique ajoutée plus tard joue)
//   ÉQUILIBRAGE
//    8. Solo : niveaux 6 à 10 adoucis (pente divisée par 2), chapitre 2 qui commence au niveau de la fin du chapitre 1
//    9. Alakazam, Gardevoir, Tortank, Azumarill plus forts en main ; Carchacrok et Azumarill moins durs en face
//   10. Raids : Tortank, Dracaufeu et Florizarre passent en 3★ ; 4★ et 5★ un peu moins résistants
//   11. Signal un peu plus long avant les grosses attaques ennemies (l'esquive compte davantage)
//   EXPÉRIENCE
//   12. Pokémon capturé ajouté tout seul à l'équipe s'il reste une place
//   13. Objectifs du débutant prolongés : Tour étage 10, fin du chapitre 1 (→ premier Œuf Mystère) ; objets tenus offerts
//   14. Menu débutant : Défi Mewtwo et Raid aussi derrière « Plus de modes »
//   15. Rôle de chaque Pokémon (Attaquant, Tank, Distance, Soutien) ; fiche de combat après chaque partie Solo / Tour
// ============================================================

// ---------------------------------------------------------------- 1. Magasin depuis le menu
showShop = (prev => function(tab){ return prev(tab || Save.load().shopTab || 'crates'); })(showShop);
SCREENS.shop = showShop;

// ---------------------------------------------------------------- 2. mode développeur
const V23_DEV = (() => { try{ if(/[?&]dev=1\b/.test(location.search)) sessionStorage.setItem('pc.dev', '1'); return sessionStorage.getItem('pc.dev') === '1'; }catch(e){ return false; } })();
const v23DevOk = () => V23_DEV && !(typeof Online !== 'undefined' && Online.user);
if(typeof DEV !== 'undefined'){
  DEV.is = (prev => k => v23DevOk() ? prev(k) : false)(DEV.is.bind(DEV));
  if(!V23_DEV) try{ const D = Save.load().dev; if(D && D.on){ D.on = false; Save.save(); } }catch(e){}
  showOptions = (prev => function(back){
    prev(back);
    if(v23DevOk()) return;
    const b = document.getElementById('o-dev'); if(!b) return;
    const row = b.closest('.row'), h = row && row.previousElementSibling, hint = row && row.nextElementSibling;
    if(h && h.tagName === 'H3') h.remove(); if(hint && hint.classList.contains('hint')) hint.remove(); if(row) row.remove();
  })(showOptions);
  SCREENS.options = showOptions;
  showMain = (prev => function(){ if(!v23DevOk()){ const i = MAIN_MENU.findIndex(m => m.id === 'dev'); if(i >= 0) MAIN_MENU.splice(i, 1); } return prev.apply(this, arguments); })(showMain);
}

// ---------------------------------------------------------------- 3. Safari
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, saf = c && c.mode === 'safari' && !G.caught && !c.tuto, rooms = c && c.rooms, last = rooms ? (G.rm && G.rm.ri === rooms.length - 1) : true;
  const cap = c && c.mode === 'safari' && G.caught, pid = c && c.target, tid = c && c.teamId;
  const r = prev(win, why);
  if(saf && last){ let n = 0; const put = () => { const h = [...document.querySelectorAll('#menu .hint')].find(x => /ticket/i.test(x.textContent));
    if(h){ h.innerHTML = '🎟 <b>Ticket rendu</b> : tu avais atteint la dernière salle. Réessaie quand tu veux !'; } else if(n++ < 40) setTimeout(put, 100); }; put(); }
  // 12. le Pokémon capturé rejoint l'équipe utilisée s'il reste une place
  if(cap && pid){ try{ const t = Save.team(tid); if(t && !t.members.includes(pid) && t.members.length < t.size){ t.members.push(pid); Save.save();
      let n = 0; const put = () => { const p = [...document.querySelectorAll('#menu p')].find(x => /débloqué/.test(x.textContent)); if(p) p.innerHTML = `Il rejoint ton équipe <b>${esc(t.name)}</b> ! (modifiable dans <b>Mes équipes</b>)`; else if(n++ < 40) setTimeout(put, 100); }; put(); } }catch(e){} }
  return r;
})(battleEnd);
menu = (prev => function(h){
  const g = document.getElementById('gconf'); if(g) g.remove();                   // 6. une fenêtre de confirmation ne reste pas par-dessus l'écran suivant
  prev(h);
  if(h && h.includes('sf-ed')){ const r = document.querySelector('.v22easy'); if(r){ const box = r.nextElementSibling; if(box && /🔥/.test(box.innerHTML)) box.innerHTML = box.innerHTML.replace('🔥', '🌱'); } }
})(menu);
showSafari = (prev => function(sel){ prev(sel); const e = document.querySelector('.v22easy'); if(e){ const b = e.parentElement.querySelector('.v22easy + *'); if(b && /🔥/.test(b.innerHTML)) b.innerHTML = b.innerHTML.replace('🔥', '🌱'); } })(showSafari);
SCREENS.safari = showSafari;

// ---------------------------------------------------------------- 4. téléphone : adversaire sous les boutons
updCam = (prev => function(p, e){
  prev(p, e);
  if(!e || !document.body || document.body.classList.contains('pcmode')) return;
  // l'adversaire dans le coin bas-droit (zone des boutons) : la caméra glisse pour le remonter vers le centre
  const sx = e.x - CAM.x, sy = e.y - CAM.y;
  if(sx > VW*.7 && sy > VH*.55){ CAM.x = Math.min(W - VW, CAM.x + (sx - VW*.7)*.08); CAM.y = Math.min(H - VH, CAM.y + (sy - VH*.55)*.08); }
})(updCam);
let V23_BT = 0;
step = (prev => function(dt){
  prev(dt);
  if(!G || G.over || !G.e || (V23_BT += dt) < .15) return; V23_BT = 0;
  const btns = document.getElementById('btns'), cv = document.getElementById('cv'); if(!btns || !cv) return;
  const R = cv.getBoundingClientRect(), ex = R.left + (G.e.x - CAM.x)/VW*R.width, ey = R.top + (G.e.y - CAM.y)/VH*R.height, B = btns.getBoundingClientRect();
  btns.classList.toggle('v23ghost', ex > B.left - 20 && ex < B.right + 20 && ey > B.top - 30 && ey < B.bottom + 20);
})(step);

// ---------------------------------------------------------------- 5. Tournoi et quêtes
if(typeof showTourney === 'function'){
  showTourney = (prev => function(){
    prev();
    const n = Owned.list().length; if(n >= 3 || TO) return;
    document.querySelectorAll('[data-ts], [data-to]').forEach(b => { b.disabled = true; });
    const box = document.querySelector('.trbox'); if(box) box.insertAdjacentHTML('beforebegin', `<p class='v23need'>🔒 Il te faut <b>3 Pokémon</b> (+1 remplaçant conseillé) pour un tournoi. Tu en as ${n} : capture-en au Safari !</p>`);
  })(showTourney);
  SCREENS.tourney = showTourney;
}
// quêtes du jour : seulement des modes débloqués
(() => {
  const valid = id => { const beg = typeof v22Beginner === 'function' && v22Beginner(); if(id === 'tourney') return !beg && Owned.list().length >= 3; if(id === 'contest') return !beg; return true; };
  const d0 = Quests.d.bind(Quests);
  Quests.d = function(){
    const Q = d0();
    try{ let ch = false; Q.list.forEach((q, i) => { if(!valid(q.id) && !q.p && !q.c){ const alt = QUEST_POOL.find(x => valid(x.id) && !Q.list.some(y => y.id === x.id)); if(alt){ Q.list[i] = { id:alt.id, p:0, c:0 }; ch = true; } } }); if(ch) Save.save(); }catch(e){}
    return Q;
  };
})();

// ---------------------------------------------------------------- 7. musiques absentes du manifeste : on vérifie le fichier (une musique ajoutée plus tard joue)
(typeof ASSETS_READY !== 'undefined' ? ASSETS_READY : Promise.resolve(null)).then(A => {
  if(!A || !A.music || typeof MU_BAD === 'undefined') return;
  const all = new Set(); Object.values(MUSIC).forEach(v => (Array.isArray(v) ? v : [v]).forEach(u => u && all.add(u)));
  all.forEach(u => { if(!A.music.includes(u.split('/').pop()) && MU_BAD.has(u)) fetch(u, { method:'HEAD', cache:'no-store' }).then(r => { if(r.ok) MU_BAD.delete(u); }).catch(() => {}); });
});

// ---------------------------------------------------------------- 8. courbe de difficulté du Solo
(() => {
  const S = STAGES, r2 = v => +v.toFixed(2), keys = ['hp', 'dmg', 'rate', 'tele', 'aim'];
  // chapitre 1, niveaux 6 à 10 : on garde le niveau 5 et on divise par 2 la montée
  const b = S[4]; for(let i = 5; i < 10 && i < S.length; i++) keys.forEach(k => { S[i][k] = r2(b[k] + (S[i][k] - b[k])*.5); });
  // chapitre 2 : il démarre là où le chapitre 1 s'arrête (Pokémon plus forts → multiplicateurs un peu plus bas), puis monte régulièrement
  const from = { hp:1.2, dmg:1.05, rate:.9, tele:.88, aim:.8, boss:2.4 }, to = { hp:1.75, dmg:1.5, rate:.62, tele:.7, aim:1, boss:3.1 };
  for(let i = 10; i < 20 && i < S.length; i++){ const t = (i - 10)/9; ['hp', 'dmg', 'rate', 'tele', 'aim', 'boss'].forEach(k => S[i][k] = r2(from[k] + (to[k] - from[k])*t)); }
})();

// ---------------------------------------------------------------- 9. équilibrage des Pokémon (avant l'enregistrement)
if(POKEMON.alakazam) POKEMON.alakazam.hp = 95;                                                  // 80 → 95 (+ Téléport qui frappe : plus bas)
if(POKEMON.gardevoir){ const m = POKEMON.gardevoir.moves.find(x => x.name === 'Reflet Magik'); if(m) m.cooldown = 5; }         // 7 s → 5 s
if(POKEMON.tortank){ const m = POKEMON.tortank.moves.find(x => x.name === 'Pistolet à O'); if(m) m.power = 12; }              // 10 → 12
if(POKEMON.azumarill){ POKEMON.azumarill.hp = 115;                                              // 130 → 115
  const M = POKEMON.azumarill.moves; Object.assign(M[0], { speed:250, radius:18 }); Object.assign(M[1], { speed:470, bounces:4 }); }   // touchent plus facilement
if(POKEMON.carchacrok){ POKEMON.carchacrok.hp = 120; Object.assign(POKEMON.carchacrok.moves[0], { power:10 }); }              // 130 → 120 PV, Draco-Griffe 12 → 10
if(typeof MOVE_DESC !== 'undefined') MOVE_DESC['Téléport'] = 'Se téléporte à l\'abri… et lance un Choc Mental en réapparaissant.';
// Téléport d'Alakazam : un Choc Mental part à l'arrivée
const V23Q = [];
if(typeof blink === 'function') blink = (prev => function(s, d, m, c, own, sc, a){
  const r = prev(s, d, m, c, own, sc, a);
  if(s && s.t === 'alakazam' && MV.alakazam && MV.alakazam[0]) V23Q.push({ t:G.time + ((m.opt && m.opt.delay) || .12) + .1, s, own });
  return r;
})(blink);
step = (prev => function(dt){
  prev(dt);
  if(!G || !V23Q.length) return;
  for(let i = V23Q.length - 1; i >= 0; i--){ const q = V23Q[i]; if(G.time < q.t) continue; V23Q.splice(i, 1);
    const tg = q.own ? G.e : G.p; if(!tg || tg.hp <= 0 || q.s.hp <= 0) continue;
    try{ cast(q.s, tg, MV.alakazam[0], 0, q.own, .7, Math.atan2(tg.y - q.s.y, tg.x - q.s.x)); }catch(e){} }
})(step);

// ---------------------------------------------------------------- 10. raids
(() => {
  const T3 = RAID_TIERS.find(T => T.stars === 3), T4 = RAID_TIERS.find(T => T.stars === 4); if(!T3 || !T4) return;
  ['tortank', 'dracaufeu', 'florizarre'].forEach(id => { const i = T4.pokemon.indexOf(id); if(i >= 0){ T4.pokemon.splice(i, 1); if(!T3.pokemon.includes(id)) T3.pokemon.push(id); } });
  if(RAID_STARS[4]){ RAID_STARS[4].hp = 9; if(RAID_STARS[4].stage) RAID_STARS[4].stage.dmg = 1.8; }
  if(RAID_STARS[5]){ RAID_STARS[5].hp = 10.5; }
})();

// ---------------------------------------------------------------- 11. grosses attaques ennemies : signal +15 %
step = (prev => function(dt){
  const e = G && G.e, mode = G && G.cfg && G.cfg.mode;
  prev(dt);
  if(!e || !G || G.over || G.e !== e || mode === 'tourney' || mode === 'online') return;
  if(e.tele > 0 && e._v23 !== e.tm){ const m = MV[e.t] && MV[e.t][e.pat]; if(m && isBig(m)){ e.tele *= 1.15; e.tm = e.tele; } e._v23 = e.tm; }
  if(!(e.tele > 0)) e._v23 = null;
})(step);

// ---------------------------------------------------------------- 13. objectifs du débutant prolongés + objets offerts
(() => {
  const g3 = BEGIN_GOALS.find(g => g.id === 'b-lv3'); if(g3) g3.item = 'baie-sitrus';
  if(!BEGIN_GOALS.some(g => g.id === 'b-tower10')) BEGIN_GOALS.push({ id:'b-tower10', txt:'Atteins l\'étage 10 de la Tour', r:100, item:'restes', ok:() => Tower.best() >= 10, go:() => SCREENS.tower() });
  if(!BEGIN_GOALS.some(g => g.id === 'b-ch1')) BEGIN_GOALS.push({ id:'b-ch1', txt:'Termine le chapitre 1 du Solo (bats Mewtwo)', r:150, item:typeof PEN !== 'undefined' ? PEN.egg : null, itemTxt:'un Œuf Mystère', ok:() => Math.max(Save.cleared(3), Save.cleared(6)) >= 10, go:() => SCREENS.solo() });
})();
showQuests = (prev => function(msg){
  prev(msg);
  // récompenses en objet : affichées sur le bouton, données à la récupération
  BEGIN_GOALS.forEach(g => { if(!g.item) return; const b = document.querySelector(`[data-gc='${g.id}']`), lab = g.itemTxt || (HELD_BY_ID[g.item] ? HELD_BY_ID[g.item].name : g.item);
    const row = document.querySelector(`[data-gc='${g.id}'], [data-gg='${g.id}']`); if(row){ const t = row.closest('.qrow') && row.closest('.qrow').querySelector('b'); if(t && !t.querySelector('.v23it')) t.insertAdjacentHTML('beforeend', ` <small class='v23it'>+ ${esc(lab)}</small>`); }
    if(b) b.onclick = () => { const Q = Quests.d(); if(Q.goals[g.id] || !g.ok()) return; Q.goals[g.id] = 1; Save.addCoins(g.r); if(g.item) Save.addItem(g.item, 1); Save.save(); if(typeof coinSfx === 'function') coinSfx(); showQuests(`+${money(g.r)} et ${lab} !`); }; });
})(showQuests);
SCREENS.quests = showQuests;

// ---------------------------------------------------------------- 14. menu débutant : cartes Défi Mewtwo / Raid cachées aussi
renderMainMM = (prev => function(){ prev(); try{ document.body.classList.toggle('v23beg', typeof v22Beginner === 'function' && v22Beginner()); }catch(e){} })(renderMainMM);

// ---------------------------------------------------------------- 15. rôles + fiche de combat
function pkRole(id){
  const D = POKEMON[id], H = HERO[id]; if(!D || !H) return null;
  const mv = MV[id] || [], mel = mv.filter(m => m.mel || ['melee', 'uppercut', 'roll', 'hug', 'xspeed', 'burrow', 'fly', 'skydive'].includes(m.k)).length;
  if(mv.some(m => ['shield', 'heal'].includes(m.k)) || D.moves.some(m => m.power === 0 && m.kind !== 'blink')) return { n:'Soutien', c:'#5ad8ff', d:'protège ou affaiblit' };
  if(H.hp >= 130) return { n:'Tank', c:'#8a9aaa', d:'beaucoup de PV, encaisse' };
  if(mel >= 2) return { n:'Attaquant', c:'#e8503a', d:'corps à corps, gros dégâts' };
  return { n:'Distance', c:'#ffb020', d:'attaque de loin' };
}
const pkRoleTag = id => { const R = pkRole(id); return R ? `<span class='v23role' style='--c:${R.c}' title='${R.d}'>${R.n}</span>` : ''; };
if(typeof pokeDetail === 'function') pokeDetail = (prev => function(id){
  const h = prev(id); const R = pkRoleTag(id); return R ? h.replace(/<br>/, ` ${R}<br>`) : h;
})(pokeDetail);
// fiche de combat : attaques utilisées, touches, dégâts par Pokémon
fire = (prev => function(m, c, i){ if(G && G.p){ const F = G.v23f || (G.v23f = {}), o = F[G.p.t] || (F[G.p.t] = { use:0, hit:0, dmg:0, mv:{} }); o.use++; o.mv[m.n] = (o.mv[m.n] || 0) + 1; } return prev(m, c, i); })(fire);
hurtE = (prev => function(d, b){ const e = G && G.e, h0 = e ? e.hp : 0, r = prev(d, b);
  if(G && G.p && e && b && b.own !== 0){ const F = G.v23f || (G.v23f = {}), o = F[G.p.t] || (F[G.p.t] = { use:0, hit:0, dmg:0, mv:{} }), dd = Math.max(0, h0 - Math.max(0, e.hp)); if(dd > 0){ o.dmg += dd; if(!b._v23){ b._v23 = 1; o.hit++; } } }
  return r; })(hurtE);
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, F = G && G.v23f, st = G && G.v22, t = G ? G.time : 0;
  const r = prev(win, why);
  if(c && ['solo', 'tower'].includes(c.mode) && F && Object.keys(F).length){
    let n = 0; const put = () => { const row = [...document.querySelectorAll('#menu .row')].pop(); if(row && !document.getElementById('v23fiche')){ row.insertAdjacentHTML('afterbegin', `<button class='btn2' id='v23fiche'>📊 Fiche</button>`); document.getElementById('v23fiche').onclick = () => v23Fiche(F, st, t); } else if(!row && n++ < 40) setTimeout(put, 100); };
    setTimeout(put, 50);
  }
  return r;
})(battleEnd);
function v23Fiche(F, st, t){
  const rows = Object.entries(F).map(([id, o]) => `<tr><td>${thumb(id)} ${esc(NAME[id] || id)} ${pkRoleTag(id)}</td><td>${o.use}</td><td>${o.use ? Math.min(100, Math.round(o.hit/o.use*100)) : 0} %</td><td>${Math.round(o.dmg*10)}</td><td class='v23mv'>${Object.entries(o.mv).map(([n, k]) => `${esc(n)} ×${k}`).join(' · ')}</td></tr>`).join('');
  const d = document.createElement('div'); d.id = 'gconf';
  d.innerHTML = `<div class='gc v23fc'><h2>Fiche de combat</h2><p>Durée ${Math.floor(t/60)}:${String(Math.floor(t) % 60).padStart(2, '0')}${st ? ` · dégâts infligés <b>${Math.round(st.dmg*10)}</b> · reçus <b>${Math.round(st.taken*10)}</b>` : ''}</p>
    <table class='trtab'><tr><th>Pokémon</th><th>Attaques</th><th>Touché</th><th>Dégâts</th><th>Détail</th></tr>${rows}</table>
    <p class='hint'>« Touché » = part des attaques lancées qui ont touché. Un Pokémon qui touche peu ? Vise à la main (glisse depuis le bouton) : +25 % de dégâts.</p>
    <div class='row'><button class='btn' id='gc-no'>Fermer</button></div></div>`;
  document.getElementById('app').appendChild(d); document.getElementById('gc-no').onclick = () => d.remove();
}

// ---------------------------------------------------------------- textes + styles
battleEnd = (prev => function(win, why){ const r = prev(win, why);
  let n = 0; const fix = () => { const p = [...document.querySelectorAll('#menu p')].find(x => /adversaire\(s\) battu\(s\)/.test(x.textContent)); if(p){ p.textContent = p.textContent.replace(/(\d+) adversaire\(s\) battu\(s\) sur (\d+)/, (_, a, b) => `${a} adversaire${a > 1 ? 's' : ''} battu${a > 1 ? 's' : ''} sur ${b}`); } else if(n++ < 30) setTimeout(fix, 100); };
  if(G && G.cfg && G.cfg.mode === 'solo' && !win) setTimeout(fix, 30);
  return r; })(battleEnd);
document.head.insertAdjacentHTML('beforeend', `<style>
#btns{transition:opacity .2s}#btns.v23ghost{opacity:.28!important}
body.v23beg .mm-feat{display:none!important}
.v23need{font-size:11px;color:#ffd0a0;margin:4px 0;padding:4px 8px;border:1px solid #ff9a5a;border-radius:8px;background:rgba(80,30,10,.6)}
.v23role{display:inline-block;font-size:9px;padding:0 5px;border-radius:5px;border:1px solid var(--c);color:var(--c);background:rgba(0,0,0,.35);vertical-align:middle;margin-left:3px;font-weight:700}
.v23it{color:#8dff9a;font-weight:400}
.v23fc{max-width:min(620px,94vw)}.v23fc .trtab td{font-size:10px}.v23fc .v23mv{font-size:8.5px;color:#c9bcd8;text-align:left}
</style>`);
