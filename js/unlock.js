// ============================================================
//  unlock.js — POKÉMON VERROUILLÉS + CHOIX DU PREMIER POKÉMON (v0.11)
//    • Au premier lancement (ou à la mise à jour d'une ancienne sauvegarde) : écran « Choisis ton premier
//      Pokémon » parmi STARTERS_CHOICE (data/safari.js). Il est le seul débloqué.
//    • Les autres se débloquent en les capturant au Safari (js/safari.js) ou lors d'événements : Owned.add(id).
//    • Équipes : un Pokémon verrouillé ne peut pas y entrer (cadenas dans l'éditeur) ; les anciennes
//      équipes sont nettoyées automatiquement. Entraînement : « ton Pokémon » parmi tes Pokémon débloqués.
//    • Mode développeur : « Tous les Pokémon débloqués » (js/dev-mode.js).
// ============================================================
const Owned = {
  list(){ const d = Save.load(); if(!Array.isArray(d.owned)) d.owned = []; return d.owned; },
  has(id){ return (typeof DEV !== 'undefined' && DEV.is('allmons')) || this.list().includes(id); },
  add(id){ if(!this.list().includes(id)){ this.list().push(id); Save.save(); return true; } return false; },
  ready(){ return !!Save.load().starter; },
  starter(){ return Save.load().starter; }
};
// les équipes ne gardent que des Pokémon débloqués (au moins le Pokémon de départ)
const _teamsLock = Save.teams;
Save.teams = function(){
  const T = _teamsLock.call(this);
  if(Owned.ready()) T.forEach(t => {
    const m = t.members.filter(id => Owned.has(id));
    if(m.length !== t.members.length){ t.members = m.length ? m : [Owned.starter()]; if(t.items) for(const k in t.items) if(!t.members.includes(k)) delete t.items[k]; }
  });
  return T;
};

// ---------- écran de choix du premier Pokémon ----------
function showStarter(sel){
  const list = STARTERS_CHOICE.filter(id => ORDER.includes(id));
  sel = sel && list.includes(sel) ? sel : null;
  const old = Save.teams().length > 0;
  menu(`<h1>Choisis ton premier Pokémon</h1>
    <p class='st-sub'>${old ? 'Nouveau : les Pokémon se débloquent maintenant en les capturant au <b>Safari</b>. Choisis celui qui commence l\'aventure avec toi !' : 'Il t\'accompagnera dès le premier combat. Les autres se capturent au <b>Safari</b>.'}</p>
    <div class='st-grid'>${list.map(id => `<button class='st-c ${id === sel ? 'on' : ''}' data-st='${id}' style='--tc:${COL[typesOf(id)[0]] || '#888'}'><img src='${spr(id).toDataURL()}'><b>${esc(NAME[id])}</b><small>${typesOf(id).map(t => `<span class='tc' style='background:${COL[t]}'>${TN[t] || t}</span>`).join('')}</small></button>`).join('')}</div>
    ${sel ? `<div class='scroll st-det'>${pokeDetail(sel)}</div>
      <div class='row'><button class='btn' id='st-go'>Je choisis ${esc(NAME[sel])} !</button></div>`
          : `<p class='hint'>Touche un Pokémon pour voir ses statistiques et ses attaques.</p>`}`);
  bindAll('[data-st]', el => showStarter(el.dataset.st));
  const go = document.getElementById('st-go'); if(go) go.onclick = () => chooseStarter(sel);
}
function chooseStarter(id){
  const d = Save.load(); d.starter = id; Owned.add(id);
  if(!d.teams.length) d.teams.push({ id:'t-def3', name:'Mon équipe', size:3, members:[id], items:{} });
  Save.lastTeam = d.teams[0].id; Save.save(); Save.teams();
  if(typeof playSfx === 'function' && typeof AU !== 'undefined' && AU.ctx) playSfx('victory');
  menu(`<div class='st-win'><img src='${spr(id).toDataURL()}'><h1>${esc(NAME[id])} rejoint ton aventure !</h1>
    <p>Il est dans ton équipe. Gagne des Pokédollars en Solo, achète un <b>Ticket Safari</b> et des <b>Poké Balls</b> au Magasin,
    puis va capturer de nouveaux Pokémon au <b>Safari</b> !</p><div class='row'><button class='btn' id='st-ok'>C'est parti !</button></div></div>`);
  document.getElementById('st-ok').onclick = showMain;
}
const _showMainLock = showMain;
showMain = function(){
  if(!Owned.ready() && ORDER.length){ G = null; if(typeof musicSet === 'function') musicSet('menu'); showStarter(); return; }
  _showMainLock();
};

// ---------- éditeur d'équipe : cadenas sur les Pokémon verrouillés ----------
const _menuLock = menu;
menu = function(h){
  _menuLock(h);
  if(!h || !h.includes('data-add')) return;
  document.querySelectorAll('.grid2c [data-add]').forEach(el => { if(!Owned.has(el.dataset.add)){ el.classList.add('locked'); el.insertAdjacentHTML('beforeend', `<span class='lk'>🔒</span>`); } });
  const f = document.querySelector('.grid2c .foc[data-add]'), tg = document.getElementById('tg');
  if(f && tg && !Owned.has(f.dataset.add)){ tg.disabled = true; tg.classList.remove('on'); tg.textContent = '🔒 À capturer au Safari'; tg.onclick = null; }
};
// ---------- entraînement : ton Pokémon parmi tes Pokémon débloqués (le mannequin peut être n'importe lequel) ----------
const _pickerLock = pokemonPicker;
pokemonPicker = function(title, current, onPick, back){
  if(!/ton pokémon/i.test(title)) return _pickerLock(title, current, onPick, back);
  const removed = [];
  for(let i = ORDER.length - 1; i >= 0; i--) if(!Owned.has(ORDER[i])) removed.unshift([i, ORDER.splice(i, 1)[0]]);
  try{ _pickerLock(title, current, onPick, back); } finally { removed.forEach(([i, id]) => ORDER.splice(i, 0, id)); }
};
