// ============================================================
//  menu-main.js — NOUVEAU MENU PRINCIPAL (v0.12)
//  Panneau à gauche (logo + liste verticale, curseur Pokéball), scène animée à droite (js/menu-bg.js),
//  Pokédollars en haut à droite, encart « Défi : Mewtwo », version en bas à gauche.
//  Les entrées viennent toujours de data/menu.js (MAIN_MENU) : rien à changer pour ajouter un mode.
//  Clavier : ↑ ↓ (ou Z/S, W/S) pour choisir, Entrée / Espace pour valider.
//  Le style de TOUS les menus est dans css/menus.css.
// ============================================================
const MM = { sel:0 };
// le conteneur #menu sait s'il affiche l'accueil (fond transparent) ou un sous-menu (voile sombre)
const _menuMM = menu;
menu = function(h){
  _menuMM(h);
  const m = document.getElementById('menu');
  m.classList.toggle('home', !!h && h.includes("class='mm'"));
  m.classList.toggle('ingame', !!G);
  document.getElementById('app').classList.toggle('nogame', !G);    // hors combat : pas de joystick/boutons, décor plein écran
};
function renderMainMM(){
  const items = MAIN_MENU.filter(m => !m.soon), soon = MAIN_MENU.filter(m => m.soon);
  MM.sel = Math.max(0, Math.min(items.length - 1, MM.sel));
  const feat = BOSSES.includes('mewtwo') && MAIN_MENU.some(m => m.id === 'boss')
    ? `<button class='mm-feat' data-go='boss'><img src='${spr('mewtwo').toDataURL()}'><span><b>Défi : Mewtwo</b><small>${typeof BOSS_DIFFS !== 'undefined' ? BOSS_DIFFS.filter(d => BossWins.has('mewtwo', d.id)).length + '/' + BOSS_DIFFS.length + ' cartes limitées' : 'Le boss ultime'}</small></span></button>` : '';
  menu(`<div class='mm'>
    <div class='mm-side'>
      <div class='logo'><div class='lball'><i></i></div><b>ARÈNE</b><small>des Créatures</small></div>
      <nav class='mm-list'>${items.map((m, i) => `<button class='mmi ${i === MM.sel ? 'act' : ''} ${m.id === 'dev' ? 'dev' : ''}' data-i='${i}' data-id='${m.id}'><span class='cur'></span>${esc(m.label)}</button>`).join('')}</nav>
      <p class='mm-desc' id='mmd'>${esc(items[MM.sel] ? items[MM.sel].desc || '' : '')}</p>
      ${soon.length ? `<p class='mm-soon'>${soon.map(m => esc(m.label)).join(' · ')} — bientôt</p>` : ''}
      <div class='mm-line'><i></i></div>
      <p class='mm-ver'>v${GAME_VERSION}${typeof DEV !== 'undefined' && DEV.get().on ? " · <span class='devtag'>MODE DÉVELOPPEUR</span>" : ''}</p>
    </div>
    <div class='mm-top'>${walletHtml()}</div>
    ${feat}
    ${MENU_WARN ? `<div class='mm-warn'>${MENU_WARN}</div>` : ''}
  </div>`);
  const btns = [...document.querySelectorAll('.mmi')];
  const focus = i => { MM.sel = i; btns.forEach((b, k) => b.classList.toggle('act', k === i)); const d = document.getElementById('mmd'); if(d) d.textContent = items[i].desc || ''; };
  btns.forEach((b, i) => { b.onmouseenter = () => focus(i); b.onclick = () => { focus(i); openMain(items[i]); }; });
  document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => openMain(MAIN_MENU.find(m => m.id === b.dataset.go)));
  MM.focus = focus; MM.items = items;
}
const _showMainMM = showMain;
showMain = function(){ _showMainMM(); renderMainMM(); };   // garde la musique du menu (js/audio.js)
function openMain(it){
  if(!it) return; const fn = SCREENS[it.screen];
  if(typeof playSfx === 'function' && typeof AU !== 'undefined' && AU.ctx) playSfx('select');
  if(fn) fn(); else console.warn('Écran inconnu : ' + it.screen);
}
addEventListener('keydown', e => {
  if(G || !MM.items || !document.querySelector('#menu.home') || (e.target && e.target.tagName === 'INPUT') || (typeof Settings !== 'undefined' && Settings.capture)) return;
  const n = MM.items.length;
  if(['ArrowDown', 'KeyS'].includes(e.code)){ e.preventDefault(); MM.focus((MM.sel + 1) % n); }
  else if(['ArrowUp', 'KeyW', 'KeyZ'].includes(e.code)){ e.preventDefault(); MM.focus((MM.sel + n - 1) % n); }
  else if(['Enter', 'Space'].includes(e.code)){ e.preventDefault(); openMain(MM.items[MM.sel]); }
});
