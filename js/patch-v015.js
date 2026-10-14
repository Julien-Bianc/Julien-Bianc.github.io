// ============================================================
//  patch-v015.js — Rapport de test v0.14
//    1. Plus de « pastilles » transparentes qui restaient au sol après les grosses attaques (un impact qui s'efface)
//    2. Icône cadeau en pixel art (style du jeu) au lieu de l'emoji
//    3. Fenêtre de confirmation DANS le jeu (plus de message système)
//    4. Plein écran : plus de message « impossible » quand on revient dans l'appli ; il ne s'affiche que si TU
//       appuies sur le bouton plein écran
//    5. La musique et les sons se coupent quand le téléphone se met en veille / qu'on quitte l'appli
// ============================================================

// ---------- 1. impacts au sol : un anneau qui s'efface au lieu d'une tache permanente ----------
crater = function(x, y, r, col){
  if(typeof groundDisc === 'function'){ groundDisc(x, y, r*.3, r*1.3, col || '#ffffff', .45); groundRing(x, y, r*.6, r*1.6, '#ffffff', .35, 2); }
};

// ---------- 2. icône cadeau pixel art ----------
let _giftURL = null;
function giftIcon(){
  if(_giftURL) return _giftURL;
  const P = [                                                       // 12 x 12 : O contour, Y or, R ruban, L reflet
    '...OO..OO...', '..ORRO.ORRO.', '..ORROORRO..', 'OOOOORROOOOO', 'OYYYLRRYYYYO', 'OYYYYRRYYYYO',
    'OOOOORROOOOO', '.OYYYRRYYYO.', '.OYLYRRYYYO.', '.OYYYRRYYYO.', '.OYYYRRYYYO.', '.OOOOOOOOOO.'];
  const C = { O:'#2a1606', Y:'#ffc83a', R:'#e8403c', L:'#fff2b0' }, c = document.createElement('canvas'); c.width = c.height = 24;
  const x = c.getContext('2d'); P.forEach((row, j) => [...row].forEach((ch, i) => { if(C[ch]){ x.fillStyle = C[ch]; x.fillRect(i*2, j*2, 2, 2); } }));
  return _giftURL = c.toDataURL();
}
document.head.insertAdjacentHTML('beforeend', `<style>
.bdg::after{content:"";background:url(${giftIcon()}) center/16px 16px no-repeat,radial-gradient(circle,#3a1a5a 55%,#14101c 60%);width:20px;height:20px;box-shadow:0 0 0 1px #ffd23f,0 0 8px rgba(255,210,63,.6)}
.btn2.claim img.gift{width:16px;height:16px;image-rendering:pixelated;vertical-align:-3px}
</style>`);

// ---------- 3. fenêtre de confirmation du jeu ----------
function gameConfirm(title, text, okLabel, onYes){
  const d = document.createElement('div'); d.id = 'gconf';
  d.innerHTML = `<div class='gc'><h2>${title}</h2><p>${text}</p><div class='row'><button class='btn' id='gc-ok'>${okLabel || 'OK'}</button><button class='btn2' id='gc-no'>Annuler</button></div></div>`;
  document.getElementById('app').appendChild(d);
  document.getElementById('gc-ok').onclick = () => { d.remove(); onYes && onYes(); };
  document.getElementById('gc-no').onclick = () => d.remove();
}
document.head.insertAdjacentHTML('beforeend', `<style>
#gconf{position:absolute;inset:0;z-index:70;display:flex;align-items:center;justify-content:center;background:rgba(6,4,16,.6);animation:gcf .15s ease-out}
#gconf .gc{max-width:360px;padding:12px 18px;background:linear-gradient(180deg,rgba(54,42,96,.97),rgba(20,14,40,.97));border:2px solid var(--gold,#ffd23f);border-radius:12px;
  text-align:center;font-family:var(--font,monospace);color:#f4ead6;box-shadow:0 0 24px rgba(255,210,63,.3);transform:scale(min(var(--ui,1),1.6));animation:gcz .2s cubic-bezier(.2,1.4,.4,1)}
#gconf h2{margin:0 0 6px;font-size:15px;color:#ffe9a0}#gconf p{font-size:12px;margin:0 0 8px}#gconf b{color:#ffe27a}
@keyframes gcf{from{opacity:0}}@keyframes gcz{from{transform:scale(.8);opacity:0}}
</style>`);

// ---------- 4. plein écran : message d'aide seulement sur demande ----------
let FS_EXPLICIT = 0, FS_BUSY = false;
document.addEventListener('click', e => { if(e.target.closest && e.target.closest('#fsBtn, #o-fs, #o-afs')) FS_EXPLICIT = performance.now(); }, true);
addEventListener('keydown', e => { if(typeof canon === 'function' && canon(e.code) === DEFAULT_KEYS.fullscreen) FS_EXPLICIT = performance.now(); }, true);
const _helpV15 = showInstallHelp;
showInstallHelp = function(){ if(performance.now() - FS_EXPLICIT < 1500) _helpV15(); };      // tentative automatique ratée : silence
toggleFullscreen = async function(){ if(FS_BUSY) return; FS_BUSY = true; try{ await _tfsV13(); } finally { FS_BUSY = false; } };

// ---------- 5. veille / appli en arrière-plan : silence ----------
document.addEventListener('visibilitychange', () => {
  if(typeof AU === 'undefined' || !AU.ctx) return;
  const el = typeof MU !== 'undefined' && MU.cur && MU.cur.el;
  if(document.hidden){
    try{ AU.ctx.suspend(); }catch(e){}
    if(el && el instanceof HTMLMediaElement && !el.paused){ el.pause(); el._wasOn = true; }
    if(G && !G.over && !G.paused && typeof pauseGame === 'function' && !(G.cfg && (G.cfg.mode === 'online' || G.cfg.net))) pauseGame();   // le combat se met en pause
  } else {
    try{ AU.ctx.resume(); }catch(e){}
    if(el && el._wasOn){ el._wasOn = false; el.play().catch(() => {}); }
  }
});
addEventListener('pagehide', () => { try{ AU.ctx && AU.ctx.suspend(); }catch(e){} });
