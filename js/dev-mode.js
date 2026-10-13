// ============================================================
//  dev-mode.js — MODE DÉVELOPPEUR (v0.12) : pour tester sans jouer des heures.
//  Activation : Options → « Mode développeur ». Une entrée « Développeur » apparaît alors dans le menu principal.
//  Outils (chacun s'active / se désactive) :
//    • Argent infini (tu ne paies plus rien, ton vrai solde n'est pas touché)
//    • Tous les niveaux Solo débloqués
//    • Pokémon boss jouables (Mewtwo dans l'éditeur d'équipe) — recharge la page
//    • Rareté forcée des caisses (commun → ultra rare) pour tester les animations d'ouverture
//    • Invincible en combat, recharges instantanées, bouton « Gagner le combat » dans la pause
//    • Donner toutes les cartes / tous les objets, +10 000 ₽, réinitialiser la sauvegarde
//  Tout est enregistré avec la sauvegarde (Save.load().dev).
// ============================================================
const DEV = {
  get(){ const d = Save.load(); if(!d.dev) d.dev = { on:false, money:true, levels:true, bosses:false, rarity:null, god:false, cd:false }; return d.dev; },
  set(k, v){ this.get()[k] = v; Save.save(); },
  is(k){ const D = this.get(); return D.on && !!D[k]; }
};

// ---------- argent infini ----------
const _coinsDev = Save.coins, _spendDev = Save.spend;
Save.coins = function(){ return DEV.is('money') ? 999999 : _coinsDev.call(this); };
Save.spend = function(n){ return DEV.is('money') ? true : _spendDev.call(this, n); };
Save.addCoins = function(n){ const d = this.load(); d.coins = Math.max(0, _coinsDev.call(this) + n); this.save(); return this.coins(); };
// ---------- niveaux ----------
const _clearedDev = Save.cleared;
Save.cleared = function(size){ return DEV.is('levels') ? Math.max(_clearedDev.call(this, size), STAGES.length - 1) : _clearedDev.call(this, size); };
// ---------- Pokémon boss jouables (au chargement) ----------
const _regDev = registerPokemon;
registerPokemon = function(id){
  const r = _regDev(id);
  if(DEV.is('bosses') && POKEMON[id] && POKEMON[id].bossOnly && !ORDER.includes(id)) ORDER.push(id);
  return r;
};
// un boss jouable a 4 attaques : le joueur n'a que 3 boutons → on garde les 3 attaques offensives
const _startDev = start;
start = function(cfg){
  const r = _startDev(cfg);
  if(G && G.team){ let fix = false;
    G.team.forEach(c => { if(c.mv && c.mv.length > 3){ const A = POKEMON[c.t] && POKEMON[c.t].ai; c.mv = c.mv.filter((m, i) => !A || i !== A.react).slice(0, 3); fix = true; } });
    if(fix){ setBtns(); bt[3].innerHTML = '<b>Esquive</b><i></i>'; } }
  return r;
};
// ---------- rareté forcée des caisses ----------
const _rollDev = rollItem;
rollItem = function(c){
  const want = DEV.get().on && DEV.get().rarity; if(!want) return _rollDev(c);
  shopBuild();
  const slots = c.slots.filter(s => s.r === want && s.pool.length);
  if(slots.length){ const s = slots[Math.floor(Math.random()*slots.length)]; return s.pool[Math.floor(Math.random()*s.pool.length)]; }
  const any = Object.values(ITEM).filter(it => it.r === want && !it.limited);
  if(any.length) return any[Math.floor(Math.random()*any.length)];
  // rien de cette rareté dans le jeu (ex. ultra rare) : copie d'un objet rare, affichée en ultra rare (test d'animation)
  const base = _rollDev(c); return { ...base, r:want, name:base.name + ' (test ' + RAR[want].label + ')' };
};
// ---------- combat : invincible, recharges ----------
const _hPDev = hurtP; hurtP = function(d, b){ if(DEV.is('god') && G && !G.training) return; return _hPDev(d, b); };
const _stepDev = step;
step = function(dt){
  const r = _stepDev(dt);
  if(G && !G.over && G.p){ if(DEV.is('god')){ G.p.hp = Math.max(G.p.hp, 1); if(G.p.hp < G.p.max*.3) G.p.hp = G.p.max; } if(DEV.is('cd')) G.p.cd = [0, 0, 0]; }
  return r;
};
function devWin(){
  if(!G || G.over) return; G.paused = false; menu('');
  G.wave = G.et.length - 1; G.e.invT = 0; G.e.hp = 1; G.intro = 0;
  if(G.es && G.eko) G.eko = G.eko.map((v, i) => i === G.ei ? v : 1);
  hurtE(9999, { t:'normal', k:'shot', own:1 });
}
const _pauseDev = showPauseMenu;
showPauseMenu = function(){
  _pauseDev();
  if(!DEV.get().on || !G || G.training) return;
  const row = document.querySelector('#menu .row'); if(!row) return;
  row.insertAdjacentHTML('beforeend', `<button class='btn2 devb' id='dwin'>⚙ Gagner le combat</button>`);
  document.getElementById('dwin').onclick = devWin;
};

// ---------- menu principal + Options ----------
function syncDevMenu(){
  const i = MAIN_MENU.findIndex(m => m.id === 'dev');
  if(DEV.get().on && i < 0) MAIN_MENU.push({ id:'dev', label:'Développeur', desc:'Outils de test : argent, niveaux, caisses, Pokémon…', screen:'dev' });
  if(!DEV.get().on && i >= 0) MAIN_MENU.splice(i, 1);
}
syncDevMenu();
const _optDev = showOptions;
showOptions = function(back){
  _optDev(back);
  const box = document.querySelector('#menu .opts'); if(!box) return;
  const on = DEV.get().on;
  box.insertAdjacentHTML('beforeend', `<h3>Développeur</h3><div class='row'><button class='btn2 ${on ? 'on' : ''}' id='o-dev'>Mode développeur : ${on ? 'oui' : 'non'}</button></div>
    <p class='hint'>Ajoute un menu « Développeur » : argent infini, tous les niveaux, raretés de caisse forcées, Pokémon boss jouables…</p>`);
  document.getElementById('o-dev').onclick = () => { DEV.set('on', !on); syncDevMenu(); showOptions(back); };
};
SCREENS.options = showOptions;

// ---------- écran Développeur ----------
function showDev(){
  const D = DEV.get(), tg = (k, label) => `<button class='btn2 ${D[k] ? 'on' : ''}' data-tg='${k}'>${label} : ${D[k] ? 'oui' : 'non'}</button>`;
  shopBuild();
  const nCards = Object.values(ITEM).filter(it => it.kind === 'card' && !it.limited).length, nHeld = Object.values(ITEM).filter(it => it.kind !== 'card').length;
  menu(`<div class='hd'><h1>⚙ Développeur</h1>${walletHtml()}</div>
    <div class='scroll opts devs'>
      <h3>Progression</h3>
      <div class='row left'>${tg('money', 'Argent infini')}${tg('levels', 'Tous les niveaux Solo')}${tg('bosses', 'Pokémon boss jouables')}</div>
      <p class='hint'>Pokémon boss jouables : la page se recharge pour ajouter Mewtwo à l'éditeur d'équipe.</p>
      <h3>Caisses — rareté forcée</h3>
      <div class='row left'>${[[null, 'Aléatoire'], ...RARITY.slice().reverse().map(r => [r.id, r.label])].map(([id, l]) => `<button class='btn2 sm ${D.rarity === id ? 'on' : ''}' data-rar='${id || ''}' ${id ? `style='border-color:${RAR[id].col}'` : ''}>${l}</button>`).join('')}
        <button class='btn2 sm' id='d-shop'>Aller au Magasin →</button></div>
      <h3>Combat</h3>
      <div class='row left'>${tg('god', 'Invincible')}${tg('cd', 'Recharges instantanées')}</div>
      <p class='hint'>En combat, la pause propose « Gagner le combat ». Le Défi : Mewtwo propose déjà ses 3 difficultés.</p>
      <h3>Inventaire</h3>
      <div class='row left'><button class='btn2' id='d-cards'>+ Toutes les cartes (${nCards})</button><button class='btn2' id='d-held'>+ Tous les objets (${nHeld})</button>
        <button class='btn2' id='d-lim'>+ Cartes édition limitée</button><button class='btn2' id='d-coin'>+10 000 ₽ réels</button></div>
      <h3>Danger</h3>
      <div class='row left'><button class='btn2' id='d-inv'>Vider l'inventaire</button><button class='btn2' id='d-prog'>Remettre la progression à zéro</button><button class='btn2 bad' id='d-reset'>Effacer TOUTE la sauvegarde</button></div>
      <p id='d-msg' class='hint'></p>
    </div>
    <div class='row'><button class='btn2' id='d-off'>Désactiver le mode développeur</button><button class='btn' id='back'>Retour</button></div>`);
  const msg = t => { const el = document.getElementById('d-msg'); if(el) el.textContent = '✔ ' + t; };
  bindAll('[data-tg]', el => { const k = el.dataset.tg; DEV.set(k, !D[k]); if(k === 'bosses'){ location.reload(); return; } showDev(); });
  bindAll('[data-rar]', el => { DEV.set('rarity', el.dataset.rar || null); showDev(); });
  document.getElementById('d-shop').onclick = SCREENS.shop;
  document.getElementById('d-cards').onclick = () => { Object.values(ITEM).filter(it => it.kind === 'card' && !it.limited).forEach(it => Save.addItem(it.id, 1)); showDev(); msg('Cartes ajoutées'); };
  document.getElementById('d-held').onclick = () => { Object.values(ITEM).filter(it => it.kind !== 'card').forEach(it => Save.addItem(it.id, 1)); showDev(); msg('Objets ajoutés'); };
  document.getElementById('d-lim').onclick = () => { Object.values(ITEM).filter(it => it.limited).forEach(it => Save.addItem(it.id, 1)); showDev(); msg('Cartes limitées ajoutées'); };
  document.getElementById('d-coin').onclick = () => { const d = Save.load(); d.coins = _coinsDev.call(Save) + 10000; Save.save(); showDev(); msg('+10 000 ₽ ajoutés à ton vrai solde'); };
  document.getElementById('d-inv').onclick = () => { if(!confirm('Vider tout l\'inventaire (cartes + objets) ?')) return; Save.load().inv = {}; Save.teams().forEach(t => t.items = {}); Save.save(); showDev(); msg('Inventaire vidé'); };
  document.getElementById('d-prog').onclick = () => { if(!confirm('Remettre à zéro les niveaux Solo et le Défi : Mewtwo ?')) return; const d = Save.load(); d.progress = { 3:0, 6:0 }; d.bossWins = {}; Save.save(); showDev(); msg('Progression remise à zéro'); };
  document.getElementById('d-reset').onclick = () => { if(!confirm('Effacer TOUTE la sauvegarde (équipes, argent, inventaire, progression) ?')) return; localStorage.removeItem(Save.KEY); location.reload(); };
  document.getElementById('d-off').onclick = () => { DEV.set('on', false); syncDevMenu(); showMain(); };
  document.getElementById('back').onclick = showMain;
}
SCREENS.dev = showDev;
