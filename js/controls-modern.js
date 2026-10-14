// ============================================================
//  controls-modern.js — COMMANDES « MODERNES » (v0.15), inspirées de Brawl Stars / Pokémon Unite
//  Options → Confort → « Commandes : modernes / classiques » (modernes par défaut).
//
//  • DÉPLACEMENT : pose le pouce N'IMPORTE OÙ sur la moitié gauche de l'écran → le joystick apparaît sous ton
//    pouce. Relâche : il disparaît.
//  • ATTAQUES : boutons ronds en arc autour du gros bouton A (attaque principale), à droite.
//      – appui bref          → tir automatique sur l'adversaire
//      – appui + glisser     → un cercle de visée apparaît sous ton doigt : tu vises (et tu charges si tu tiens)
//      – revenir au centre   → le cercle devient rouge ✕ : relâche = attaque ANNULÉE (aucune recharge perdue)
//    Le temps de recharge tourne autour de chaque bouton (comme une horloge) avec les secondes restantes.
//  • ESQUIVE : petit bouton au-dessus de A.   • RELÈVE : bouton avec le portrait du Pokémon qui entrera.
//  Tout reste déplaçable dans « Disposition des commandes… » (js/controls-layout.js).
// ============================================================
Object.assign(SETTINGS_DEFAULT, { ctlModern:true });
const isModern = () => !!Settings.get().ctlModern;
const appEl = document.getElementById('app'), uiEl = document.getElementById('ui'), joyEl = document.getElementById('joy');
function applyCtlMode(){ appEl.classList.toggle('ctl-modern', isModern()); }
applyCtlMode();

// coordonnées écran → coordonnées du jeu (le jeu est pivoté de 90° en portrait)
function toLocal(cx, cy){
  const r = appEl.getBoundingClientRect();
  if(innerHeight > innerWidth) return { x:cy - r.top, y:r.right - cx };
  return { x:cx - r.left, y:cy - r.top };
}

// ---------- joystick flottant ----------
const jz = document.createElement('div'); jz.id = 'joyzone'; uiEl.prepend(jz);
let JP = null;
jz.addEventListener('pointerdown', e => {
  if(!isModern() || JP) return; e.preventDefault();
  JP = e.pointerId; jz.setPointerCapture(e.pointerId);
  const L = toLocal(e.clientX, e.clientY), s = joyEl.offsetWidth;
  joyEl.style.translate = '0px 0px'; joyEl.style.left = (L.x - s/2) + 'px'; joyEl.style.top = (L.y - s/2) + 'px'; joyEl.classList.add('on');
  jmove(e);
});
jz.addEventListener('pointermove', e => { if(e.pointerId === JP) jmove(e); });
const jzEnd = e => { if(e.pointerId !== JP) return; JP = null; jend(); joyEl.classList.remove('on'); joyEl.style.left = joyEl.style.top = ''; if(typeof applyLayout === 'function') applyLayout(); };
jz.addEventListener('pointerup', jzEnd); jz.addEventListener('pointercancel', jzEnd);

// ---------- cercle de visée sous le doigt + annulation ----------
const stick = document.createElement('div'); stick.id = 'aimstick'; stick.innerHTML = '<i></i><b>✕</b>'; appEl.appendChild(stick);
AIM.cancel = [0, 0, 0]; AIM.was = [0, 0, 0]; AIM.cur = -1;
const AIM_DZ = 24;
document.getElementById('btns').addEventListener('pointerdown', e => {
  if(!isModern()) return; const b = e.target.closest && e.target.closest('.ab'), i = b ? ['b0', 'b1', 'b2'].indexOf(b.id) : -1; if(i < 0) return;
  AIM.cancel[i] = 0; AIM.was[i] = 0; AIM.cur = i;
  const L = toLocal(e.clientX, e.clientY); stick.style.left = L.x + 'px'; stick.style.top = L.y + 'px'; stick.className = 'show'; stick.firstChild.style.translate = '0px 0px';
  const col = G && G.p ? (COL[G.p.mv[i].tp || G.p.t] || '#ffd23f') : '#ffd23f'; stick.style.setProperty('--sc', col);
}, true);
const _moveCM = AIM.move;
AIM.move = function(i, e){
  const r = _moveCM.call(this, i, e);
  if(isModern() && i === this.cur){
    const k = Settings.get().aimSens || 1; let dx = (e.clientX - this.c[i][0])*k, dy = (e.clientY - this.c[i][1])*k;
    if(innerHeight > innerWidth){ const q = dx; dx = dy; dy = -q; }
    const m = Math.hypot(dx, dy), cl = Math.min(1, 44/(m || 1));
    stick.firstChild.style.translate = `${dx*cl}px ${dy*cl}px`;
    if(this.on[i]) this.was[i] = 1;
    this.cancel[i] = this.was[i] && m < AIM_DZ ? 1 : 0;
    stick.className = 'show' + (this.on[i] ? ' aim' : '') + (this.cancel[i] ? ' cancel' : '');
  }
  return r;
};
const _relCM = rel;
rel = function(i){
  if(i === AIM.cur){ stick.className = ''; AIM.cur = -1; }
  if(isModern() && AIM.cancel[i] && G && down[i]){                   // attaque annulée : pas de tir, pas de recharge
    AIM.cancel[i] = 0; down[i] = 0; G.p.ch[i] = 0; AIM.on[i] = 0; if(typeof playSfx === 'function') playSfx('back'); return;
  }
  return _relCM(i);
};
addEventListener('pointerup', () => { if(AIM.cur >= 0 && !down[AIM.cur]){ stick.className = ''; AIM.cur = -1; } });

// ---------- boutons : recharge circulaire, secondes, portrait de la relève ----------
const _drawCM = draw;
draw = function(){
  _drawCM();
  if(!isModern() || !G || !G.p) return;
  const p = G.p;
  for(let i = 0; i < 3; i++){
    const b = bt[i]; if(!b) continue; const cd = Math.max(0, p.cd[i]), k = p.cm[i] ? cd/p.cm[i] : 0;
    b.style.setProperty('--cd', k.toFixed(3)); b.dataset.cd = cd > .05 ? (cd < 1 ? cd.toFixed(1) : Math.ceil(cd)) : '';
    b.classList.toggle('ready', cd <= 0); b.classList.toggle('charging', p.ch[i] > 0);
  }
  const d = document.getElementById('b3'); if(d){ const k = Math.max(0, p.dC/1.3); d.style.setProperty('--cd', k.toFixed(3)); d.dataset.cd = p.dC > .05 ? p.dC.toFixed(1) : ''; }
  const s = document.getElementById('b4');
  if(s){
    const i = G.team.indexOf(p); let nx = null; for(let k = 1; k < G.team.length; k++){ const c = G.team[(i + k) % G.team.length]; if(c.hp > 0){ nx = c; break; } }
    const key = nx ? nx.t : '-';
    if(s.dataset.nx !== key){ s.dataset.nx = key; s.innerHTML = nx ? `<img src='${spr(nx.t).toDataURL()}'><b>Relève</b><i></i>` : `<b>—</b><i></i>`; }
    s.classList.toggle('off', !nx); s.style.setProperty('--cd', Math.max(0, (G.swc || 0)/3).toFixed(3));
  }
};
// icônes des boutons Esquive
const _setBtnsCM = setBtns;
setBtns = function(){ _setBtnsCM(); const d = document.getElementById('b3'); if(d && !d.dataset.ic){ d.dataset.ic = 1; d.innerHTML = `<b>»</b><small>Esquive</small><i></i>`; } };

// ---------- Options ----------
const _optCM = showOptions;
showOptions = function(back){
  _optCM(back);
  const s = Settings.get(), lyt = document.getElementById('o-lyt'); if(!lyt) return;
  lyt.insertAdjacentHTML('beforebegin', `<button class='btn2 ${s.ctlModern ? 'on' : ''}' id='o-ctl'>Commandes : ${s.ctlModern ? 'modernes' : 'classiques'}</button>`);
  document.getElementById('o-ctl').onclick = () => { Settings.set('ctlModern', !s.ctlModern); applyCtlMode(); showOptions(back); };
};
SCREENS.options = showOptions;

document.head.insertAdjacentHTML('beforeend', `<style>
#app.ctl-modern #ui{display:block;inset:0;padding:0}
#app.ctl-modern.nogame #ui{display:none}
#joyzone{display:none}
#app.ctl-modern #joyzone{display:block;position:absolute;left:0;top:18%;bottom:0;width:46%;pointer-events:auto;touch-action:none}
#app.ctl-modern #joy{position:absolute;left:calc(40px + env(safe-area-inset-left,0px));top:auto;bottom:34px;pointer-events:none;transform-origin:center;opacity:.45;transition:opacity .12s;
  background:radial-gradient(circle,rgba(255,255,255,.06) 40%,rgba(255,255,255,.16));border:3px solid rgba(255,255,255,.45)}
#app.ctl-modern #joy.on{opacity:1;bottom:auto;border-color:rgba(255,230,150,.85);box-shadow:0 0 16px rgba(255,210,63,.35)}
#app.ctl-modern #knob{background:radial-gradient(circle at 35% 35%,#fff,#d8d8e8);box-shadow:0 2px 6px rgba(0,0,0,.4)}
#app.ctl-modern #btns{position:absolute;right:calc(16px + env(safe-area-inset-right,0px));bottom:16px;width:250px;height:230px;display:block;transform-origin:bottom right}
#app.ctl-modern .ab{position:absolute;border-radius:50%;padding:0;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;
  background:radial-gradient(circle at 50% 35%,rgba(70,56,120,.92),rgba(22,16,44,.92));border-width:3px;box-shadow:0 3px 0 rgba(0,0,0,.45),inset 0 2px 0 rgba(255,255,255,.12);font-family:var(--font,monospace)}
#app.ctl-modern .ab b{font-size:9px;line-height:1.05;text-align:center;padding:0 6px;text-shadow:0 1px 2px #000;z-index:2}
#app.ctl-modern .ab small{display:none}
#app.ctl-modern .ab em{display:none}
#app.ctl-modern .ab i{inset:0;height:auto!important;background:conic-gradient(rgba(6,4,14,.72) calc(var(--cd,0)*1turn),transparent 0);z-index:1;border-radius:50%}
#app.ctl-modern .ab[data-cd]:not([data-cd=""])::after{content:attr(data-cd);position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 16px var(--font,monospace);color:#fff;text-shadow:0 0 4px #000;z-index:3}
#app.ctl-modern .ab[data-cd]:not([data-cd=""]) b{opacity:.25}
#app.ctl-modern .ab.ready{box-shadow:0 3px 0 rgba(0,0,0,.45),0 0 10px rgba(255,255,255,.15)}
#app.ctl-modern .ab.charging{filter:brightness(1.25)}
#app.ctl-modern #b0{width:86px;height:86px;right:24px;bottom:22px}
#app.ctl-modern #b0 b{font-size:10px}
#app.ctl-modern #b1{width:62px;height:62px;right:122px;bottom:12px}
#app.ctl-modern #b2{width:62px;height:62px;right:112px;bottom:88px}
#app.ctl-modern #b3{width:50px;height:50px;right:44px;bottom:120px;border-color:#9fe3ff}
#app.ctl-modern #b3 b{font-size:20px;line-height:1}#app.ctl-modern #b3 small{display:block;font-size:6px;z-index:2}
#app.ctl-modern #b4{width:50px;height:50px;right:18px;bottom:178px;border-color:#ffd23f}
#app.ctl-modern #b4 img{width:30px;height:30px;image-rendering:pixelated;z-index:2;margin-bottom:-3px}#app.ctl-modern #b4 b{font-size:6px}
#app.ctl-modern #b4.off{opacity:.3}
#app.ctl-modern #b5{width:54px;height:54px;right:192px;bottom:14px}
#aimstick{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;pointer-events:none;z-index:30;display:none;
  border:3px solid color-mix(in srgb,var(--sc,#ffd23f) 70%,transparent);background:radial-gradient(circle,transparent 18%,color-mix(in srgb,var(--sc,#ffd23f) 14%,transparent) 20%,color-mix(in srgb,var(--sc,#ffd23f) 22%,transparent))}
#aimstick.show{display:block;opacity:.35}#aimstick.aim{opacity:1}
#aimstick i{position:absolute;left:50%;top:50%;width:40px;height:40px;margin:-20px 0 0 -20px;border-radius:50%;background:var(--sc,#ffd23f);box-shadow:0 0 12px var(--sc,#ffd23f),inset 0 -4px 0 rgba(0,0,0,.25)}
#aimstick b{display:none;position:absolute;inset:0;align-items:center;justify-content:center;font-size:40px;color:#ff5a4a;text-shadow:0 0 8px #000}
#aimstick.cancel{border-color:#ff5a4a;background:radial-gradient(circle,rgba(255,60,60,.25),rgba(255,60,60,.1))}#aimstick.cancel b{display:flex}#aimstick.cancel i{background:#ff5a4a;box-shadow:none}
</style>`);
