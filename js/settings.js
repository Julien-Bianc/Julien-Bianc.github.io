// ============================================================
//  settings.js — Réglages du joueur (volumes, touches, secousses d'écran) + plein écran + installation PWA.
//  Les réglages sont enregistrés dans le navigateur (avec les équipes, via js/save.js).
// ============================================================
// Touches par défaut (le moteur utilise ces codes en interne ; tes touches personnalisées sont converties par canon())
const DEFAULT_KEYS = { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', a:'KeyJ', b:'KeyK', c:'KeyL', dash:'Space', swap:'KeyQ', pause:'Escape', fullscreen:'KeyF' };
const KEY_LABELS = { up:'Haut', down:'Bas', left:'Gauche', right:'Droite', a:'Attaque A', b:'Attaque B', c:'Attaque C', dash:'Esquive', swap:'Relève', pause:'Pause', fullscreen:'Plein écran' };
const SETTINGS_DEFAULT = { master:.8, sfx:.9, music:.5, shake:.35, autoFs:false, uiMenu:0, uiHud:0, aimGuides:true, aimOpacity:.5 };   // uiMenu / uiHud : 0 = automatique, sinon facteur (1 = normal)

const Settings = {
  get(){
    const d = Save.load();
    if(!d.settings) d.settings = {};
    const s = d.settings;
    if((s.ver || 0) < 5){ s.shake = SETTINGS_DEFAULT.shake; s.ver = 5; }       // v0.05 : secousses réduites par défaut
    for(const k in SETTINGS_DEFAULT) if(s[k] === undefined) s[k] = SETTINGS_DEFAULT[k];
    if(!s.keys) s.keys = {};
    for(const a in DEFAULT_KEYS) if(!s.keys[a]) s.keys[a] = DEFAULT_KEYS[a];
    return s;
  },
  set(k, v){ this.get()[k] = v; Save.save(); if(typeof applyAudio === 'function') applyAudio(); },
  // donne la touche `code` à l'action `action` (si une autre action l'utilisait, on échange les deux)
  bind(action, code){
    const K = this.get().keys, old = K[action], other = Object.keys(K).find(a => a !== action && K[a] === code);
    if(other) K[other] = old;
    K[action] = code; Save.save();
  },
  resetKeys(){ this.get().keys = { ...DEFAULT_KEYS }; Save.save(); },
  capture:null            // fonction appelée à la prochaine touche pressée (écran Options)
};

// Convertit la touche physique en touche « moteur ». Renvoie null si la touche n'est plus utilisée.
function canon(code){
  const K = Settings.get().keys;
  for(const a in K) if(K[a] === code) return DEFAULT_KEYS[a];
  for(const a in DEFAULT_KEYS) if(DEFAULT_KEYS[a] === code) return null;
  return code;                    // flèches, etc. : inchangées
}
function keyName(code){
  return ({ Space:'Espace', Escape:'Échap', ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→', Enter:'Entrée', ShiftLeft:'Maj G', ShiftRight:'Maj D', Tab:'Tab' })[code]
    || code.replace(/^Key/, '').replace(/^Digit/, '').replace(/^Numpad/, 'Pavé ');
}
// capture d'une touche pour l'écran Options (prioritaire sur le jeu)
addEventListener('keydown', e => {
  if(!Settings.capture) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const fn = Settings.capture; Settings.capture = null; fn(e.code);
}, true);

// ---------- plein écran ----------
// iPhone : Safari n'autorise PAS le plein écran pour une page web (seulement pour les vidéos).
// La seule solution est d'installer le jeu sur l'écran d'accueil : il s'ouvre alors sans barres, comme une appli.
// (iPad : le plein écran classique fonctionne.)
const IS_IOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const IS_APP = () => matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches || navigator.standalone === true;
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
const fsOk = () => !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
async function toggleFullscreen(){
  if(!fsEl() && !fsOk()){ showInstallHelp(); return; }
  const el = document.documentElement;
  try{
    if(!fsEl()){
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if(screen.orientation && screen.orientation.lock) try{ await screen.orientation.lock('landscape'); }catch(e){}
    } else {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
  }catch(e){ showInstallHelp(); }
}
// fenêtre d'aide : comment installer le jeu pour l'avoir en plein écran
function showInstallHelp(){
  if(document.getElementById('fsHelp')) return;
  const d = document.createElement('div');
  d.id = 'fsHelp';
  d.innerHTML = IS_IOS
    ? `<div><h2>Plein écran sur iPhone</h2>
       <p>Safari ne permet pas le plein écran pour les jeux web.<br>Installe le jeu, il s'ouvrira <b>sans aucune barre</b>, comme une vraie appli :</p>
       <ol><li>Touche <b>Partager</b> <span class='ios-sh'>⬆︎</span> (ou <b>⋯</b> puis <b>Partager</b>)</li>
       <li>Choisis <b>« Sur l'écran d'accueil »</b>, puis <b>Ajouter</b></li>
       <li>Lance le jeu depuis sa nouvelle icône</li></ol>
       <p class='sub'>Ta progression et tes équipes sont à refaire une fois dans l'appli (le stockage est séparé de Safari).</p>
       <button class='btn' id='fsHelpOk'>OK</button></div>`
    : `<div><h2>Plein écran indisponible</h2><p>Ce navigateur ne permet pas le plein écran.<br>Essaie le menu du navigateur → <b>« Installer l'application »</b> ou <b>« Ajouter à l'écran d'accueil »</b>.</p>
       <button class='btn' id='fsHelpOk'>OK</button></div>`;
  document.getElementById('app').appendChild(d);
  document.getElementById('fsHelpOk').onclick = () => d.remove();
}
const fsBtn = document.getElementById('fsBtn');
if(fsBtn){
  fsBtn.addEventListener('click', toggleFullscreen);
  if(IS_APP()) fsBtn.style.display = 'none';            // déjà lancé depuis l'icône : déjà en plein écran
}
addEventListener('keydown', e => {
  if(e.repeat || (e.target && e.target.tagName === 'INPUT')) return;
  if(canon(e.code) === DEFAULT_KEYS.fullscreen) toggleFullscreen();
});
// plein écran automatique au premier toucher (option) — pas de fenêtre d'aide imposée sur iPhone
addEventListener('pointerdown', () => { if(!fsEl() && fsOk() && Settings.get().autoFs) toggleFullscreen(); }, { once:true });

// ---------- PWA (installation sur l'écran d'accueil, plein écran comme une appli) ----------
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- taille de l'interface (écrans 2K/4K) ----------
const UIK = { menu:1, hud:1 };
function uiAuto(){
  const w = Math.max(innerWidth, innerHeight), h = Math.min(innerWidth, innerHeight);      // le menu doit tenir en largeur ET en hauteur
  return { menu:Math.max(1, Math.min(3, w/900, h/500)), hud:Math.max(1, Math.min(1.35, w/1400, h/700)) };
}
function applyUI(){
  const s = Settings.get(), a = uiAuto();
  UIK.menu = s.uiMenu || a.menu; UIK.hud = s.uiHud || a.hud;
  document.documentElement.style.setProperty('--ui', UIK.menu.toFixed(2));
}
addEventListener('resize', applyUI);
applyUI();
