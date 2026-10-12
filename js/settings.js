// ============================================================
//  settings.js — Réglages du joueur (volumes, touches, secousses d'écran) + plein écran + installation PWA.
//  Les réglages sont enregistrés dans le navigateur (avec les équipes, via js/save.js).
// ============================================================
// Touches par défaut (le moteur utilise ces codes en interne ; tes touches personnalisées sont converties par canon())
const DEFAULT_KEYS = { up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', a:'KeyJ', b:'KeyK', c:'KeyL', dash:'Space', swap:'KeyQ', pause:'Escape', fullscreen:'KeyF' };
const KEY_LABELS = { up:'Haut', down:'Bas', left:'Gauche', right:'Droite', a:'Attaque A', b:'Attaque B', c:'Attaque C', dash:'Esquive', swap:'Relève', pause:'Pause', fullscreen:'Plein écran' };
const SETTINGS_DEFAULT = { master:.8, sfx:.9, music:.5, shake:.35, autoFs:false, uiMenu:0, uiHud:0 };   // uiMenu / uiHud : 0 = automatique, sinon facteur (1 = normal)

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
const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement;
async function toggleFullscreen(){
  const el = document.documentElement;
  try{
    if(!fsEl()){
      await (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      if(screen.orientation && screen.orientation.lock) try{ await screen.orientation.lock('landscape'); }catch(e){}
    } else {
      await (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      if(screen.orientation && screen.orientation.unlock) screen.orientation.unlock();
    }
  }catch(e){
    alert("Le plein écran n'est pas disponible sur ce navigateur.\nSur iPhone : Partager → « Sur l'écran d'accueil », puis ouvre le jeu depuis l'icône.");
  }
}
const fsBtn = document.getElementById('fsBtn');
if(fsBtn){
  fsBtn.addEventListener('click', toggleFullscreen);
  if(matchMedia('(display-mode: fullscreen), (display-mode: standalone)').matches) fsBtn.style.display = 'none';
}
addEventListener('keydown', e => {
  if(e.repeat || (e.target && e.target.tagName === 'INPUT')) return;
  if(canon(e.code) === DEFAULT_KEYS.fullscreen) toggleFullscreen();
});
// plein écran automatique au premier toucher (option)
addEventListener('pointerdown', () => { if(!fsEl() && Settings.get().autoFs) toggleFullscreen(); }, { once:true });

// ---------- PWA (installation sur l'écran d'accueil, plein écran comme une appli) ----------
if('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  navigator.serviceWorker.register('sw.js').catch(() => {});

// ---------- taille de l'interface (écrans 2K/4K) ----------
const UIK = { menu:1, hud:1 };
function uiAuto(){ const w = Math.max(innerWidth, innerHeight); return { menu:Math.max(1, Math.min(3, w/900)), hud:Math.max(1, Math.min(1.8, w/1100)) }; }
function applyUI(){
  const s = Settings.get(), a = uiAuto();
  UIK.menu = s.uiMenu || a.menu; UIK.hud = s.uiHud || a.hud;
  document.documentElement.style.setProperty('--ui', UIK.menu.toFixed(2));
}
addEventListener('resize', applyUI);
applyUI();
