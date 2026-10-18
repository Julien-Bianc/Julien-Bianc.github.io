// ============================================================
//  patch-v0216.js — correctif (rapport de test v0.21.6)
//    1. Musiques : la Tour garde sa musique dans tous ses écrans ; la musique ne revient plus au début entre deux
//       écrans qui ont le même morceau (les fichiers absents sont repérés dès le démarrage)
//    2. Tartard « Élan Combatif » : +5 % par ATTAQUE DIFFÉRENTE qui a touché (3 max), au lieu de +7 % par coup
//    3. Tour : description des objets du sac ; plus de récompenses (₽ ×1,5, objets trouvés, objet réel tous les 10 étages)
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
twFloor = (prev => function(msg){
  prev(msg);
  const R = Tower.run(), bag = document.getElementById('twbag'); if(!R || !bag) return;
  const sel = typeof TWSEL !== 'undefined' && TWSEL ? (TWSEL.from === 'bag' ? R.bag[TWSEL.k] : R.items[R.team[TWSEL.i].id]) : null;
  const held = R.team.filter(m => R.items[m.id]).map(m => [R.items[m.id], NAME[m.id]]);
  const line = (id, who) => { const h = HELD_BY_ID[id]; return h ? `<li class='${id === sel ? 'on' : ''}'><img src='${heldImg(h)}'><b>${esc(h.name)}</b>${who ? ` <em>(${esc(who)})</em>` : ''} — ${esc(h.desc)}</li>` : ''; };
  const list = R.bag.map(id => line(id)).join('') + held.map(([id, w]) => line(id, w)).join('');
  if(list) bag.insertAdjacentHTML('afterend', `<ul class='twbagi'>${list}</ul>`);
})(twFloor);
twAfter = (prev => function(R, note){
  const L = R.last;
  if(L && R._rw !== L.f){
    R._rw = L.f; const notes = [], pick = a => a[Math.floor(Math.random()*a.length)];
    if(Math.random() < .25){ const h = pick(HELD.filter(x => x.r === 'C' || x.r === 'PC')); (R.bag = R.bag || []).push(h.id); notes.push(`objet trouvé : ${h.name} (dans ton sac)`); }
    if(L.f % 10 === 0){ const h = pick(HELD.filter(x => x.r === 'PC' || x.r === 'R')); Save.addItem(h.id, 1); notes.push(`récompense du boss : ${h.name} ajouté à ton inventaire !`); }
    if(L.f % 5 === 0){ const n = Math.round((60 + L.f*6)*.65); Save.addCoins(n); R.coins = (R.coins || 0) + n; Tower.stats().coins += n; notes.push(`prime d'étage +${money(n)}`); }
    if(notes.length){ Tower.set(R); note = [note].concat(notes).filter(Boolean).join(' · '); }
  }
  return prev(R, note);
})(twAfter);

// ---------------------------------------------------------------- 4. profil : cartes favorites
showProfile = (prev => function(msg){ if(typeof shopBuild === 'function') shopBuild(); return prev(msg); })(showProfile);
showTrainer = (prev => function(q, back){ if(typeof shopBuild === 'function') shopBuild(); return prev(q, back); })(showTrainer);
pfPick = (prev => function(title, L, fn, cls){ if(typeof shopBuild === 'function') shopBuild(); return prev(title, L, fn, cls); })(pfPick);
// ---------------------------------------------------------------- 5. concours : police du jeu dans les épreuves
conRun = (prev => function(sc){ if(sc) sc.pen = 1; return prev(sc); })(conRun);

// ---------------------------------------------------------------- 6. Solo : « Combat difficile » dès le niveau 8
showSoloCh = (prev => function(sel){
  prev(sel);
  document.querySelectorAll('.stg[data-stage]').forEach(b => { if(+b.dataset.stage >= 7) b.insertAdjacentHTML('beforeend', `<i class='hdx'>DIFFICILE</i>`); });
  const go = document.getElementById('go'), on = document.querySelector('.stg.on[data-stage]');
  if(go && on && +on.dataset.stage >= 7) go.insertAdjacentHTML('beforeend', ` <span class='hdgo'>· combat difficile</span>`);
})(showSoloCh);
showSolo = sel => showSoloCh(sel); SCREENS.solo = sel => showSoloCh(sel);

document.head.insertAdjacentHTML('beforeend', `<style>
.twbagi{list-style:none;margin:2px auto 4px;padding:0;max-width:560px;font-size:10px;text-align:left}.twbagi li{display:flex;align-items:center;gap:5px;padding:2px 6px;border-radius:6px}.twbagi li.on{background:rgba(255,210,63,.18)}
.twbagi img{width:18px;height:18px}.twbagi b{color:#ffe27a}.twbagi em{font-style:normal;color:var(--txt2,#c9bcd8)}
.stg{position:relative}.stg .hdx{position:absolute;left:3px;bottom:2px;font-style:normal;font-size:7px;padding:0 3px;border-radius:3px;background:#c8402c;color:#fff;letter-spacing:.5px}
.hdgo{font-size:.75em;color:#a8201a;font-weight:700}
</style>`);
