// ============================================================
//  patch-v0216.js — correctif (rapport de test v0.21.6)
//    1. Musiques : la Tour garde sa musique dans tous ses écrans ; la musique ne revient plus au début entre deux
//       écrans qui ont le même morceau (les fichiers absents sont repérés dès le démarrage)
//    2. Tartard « Élan Combatif » : +5 % par ATTAQUE DIFFÉRENTE qui a touché (3 max), au lieu de +7 % par coup
//    3. Tour : Pokédollars par étage ×1,5
//    4. Profil : les cartes favorites s'affichent (les tiennes et celles des autres) et se choisissent à nouveau
//    5. Concours : les épreuves utilisent la police du jeu
//    6. Solo : mention « Combat difficile » à partir du niveau 8
// ============================================================

// ---------------------------------------------------------------- 1. musiques
// la Tour : chaque écran de la Tour redemande sa musique (avant, le 2e écran retombait sur celle du menu)
menu = (prev => function(h){
  prev(h);
  if(!G && h && h.includes('data-twscene') && typeof musicSet === 'function'){ if(MU.kind !== 'menu:tower|menu') musicSet('menu'); }
})(menu);
// fichiers de musique absents : repérés dès le démarrage (plus d'essai raté qui relance le morceau)
(() => {
  if(typeof MUSIC === 'undefined' || typeof MU_BAD === 'undefined') return;
  const all = new Set(); Object.values(MUSIC).forEach(v => (Array.isArray(v) ? v : [v]).forEach(u => u && all.add(u)));
  all.forEach(u => fetch(u, { method:'HEAD', cache:'no-store' }).then(r => { if(!r.ok) MU_BAD.add(u); }).catch(() => {}));
})();
// quand le jeu retombe sur un autre fichier (ex. pas de musique propre à l'écran → musique du menu), il reprend à l'endroit où il était
musicChain = (prev => function(kind, urls, i){
  const r = prev(kind, urls, i), n = MU.cur;
  if(i > 0 && n && n.el && typeof MU_POS !== 'undefined' && MU_POS[n.el.src] > 1){ const t = MU_POS[n.el.src]; n.el.addEventListener('loadedmetadata', () => { try{ n.el.currentTime = t; }catch(_){} }, { once:true }); }
  return r;
})(musicChain);

// ---------------------------------------------------------------- 2. Tartard
if(POKEMON.tartard && POKEMON.tartard.ability) POKEMON.tartard.ability.desc = 'Chaque attaque DIFFÉRENTE qui touche : +5 % de dégâts (3 max). Tout est perdu quand il est touché.';
pkAttack = (prev => function(o, d, b){
  if(pkAb(o) !== 'momentum') return prev(o, d, b);
  if(o.dbf && o.dbf > G.time) d *= o.dbfK || .75;
  o.momSet = o.momSet || new Set();
  d *= 1 + .05*o.momSet.size;
  if(b && b.k) o.momSet.add(b.k === 'melee' ? 'melee:' + (b.t || '') : b.k);
  o.mom = Math.min(3, o.momSet.size);
  return d;
})(pkAttack);
pkDefend = (prev => function(o, d, b){ if(pkAb(o) === 'momentum' && d > 0){ o.momSet = new Set(); o.mom = 0; } return prev(o, d, b); })(pkDefend);
doSwap = (prev => function(n){ if(G && G.p){ G.p.momSet = null; } return prev(n); })(doSwap);

// ---------------------------------------------------------------- 3. Tour : sac expliqué + récompenses
TW.coins = f => Math.round((10 + 2*f)*.65*1.5);
// (v0.21.8 : les objets en plus ont été retirés — à la place, plus de CHOIX dans les bonus : js/tower.js)

// ---------------------------------------------------------------- 4. profil : cartes favorites
showProfile = (prev => function(msg){ if(typeof shopBuild === 'function') shopBuild(); return prev(msg); })(showProfile);
showTrainer = (prev => function(q, back){ if(typeof shopBuild === 'function') shopBuild(); return prev(q, back); })(showTrainer);
pfPick = (prev => function(title, L, fn, cls){ if(typeof shopBuild === 'function') shopBuild(); return prev(title, L, fn, cls); })(pfPick);
// ---------------------------------------------------------------- 5. concours : police du jeu dans les épreuves
conRun = (prev => function(sc){ if(sc) sc.pen = 1; return prev(sc); })(conRun);

// ---------------------------------------------------------------- 6. Solo : « Combat difficile » niveaux 8 à 10 et 18+ (v0.21.9 : 11 à 17 adoucis)
const soloHard = i => (i >= 7 && i <= 9) || i >= 17;
showSoloCh = (prev => function(sel){
  prev(sel);
  document.querySelectorAll('.stg[data-stage]').forEach(b => { if(soloHard(+b.dataset.stage)) b.insertAdjacentHTML('beforeend', `<i class='hdx'>DIFFICILE</i>`); });
  const go = document.getElementById('go'), on = document.querySelector('.stg.on[data-stage]');
  if(go && on && soloHard(+on.dataset.stage)) go.insertAdjacentHTML('beforeend', ` <span class='hdgo'>· combat difficile</span>`);
})(showSoloCh);
showSolo = sel => showSoloCh(sel); SCREENS.solo = sel => showSoloCh(sel);

document.head.insertAdjacentHTML('beforeend', `<style>
.twbagi{list-style:none;margin:2px auto 4px;padding:0;max-width:560px;font-size:10px;text-align:left}.twbagi li{display:flex;align-items:center;gap:5px;padding:2px 6px;border-radius:6px}.twbagi li.on{background:rgba(255,210,63,.18)}
.twbagi img{width:18px;height:18px}.twbagi b{color:#ffe27a}.twbagi em{font-style:normal;color:var(--txt2,#c9bcd8)}
.stg{position:relative}.stg .hdx{position:absolute;left:3px;bottom:2px;font-style:normal;font-size:7px;padding:0 3px;border-radius:3px;background:#c8402c;color:#fff;letter-spacing:.5px}
.hdgo{font-size:.75em;color:#a8201a;font-weight:700}
</style>`);
