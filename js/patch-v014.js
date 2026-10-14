// ============================================================
//  patch-v014.js — Rapport de test v0.13
//    1. Visée : le viseur part de l'endroit où le doigt touche le bouton (plus de visée « en arrière »
//       quand on appuie sur le bord du bouton) ; un appui long sans glisser vise l'adversaire
//    2. Sensibilité de la visée réglable (Options → Affichage)
//    3. Indicateur de charge autour de la base ronde du Pokémon
//    4. Inventaire : « Vendre tous les doublons » dans chaque onglet
//    5. Récompenses de collection à récupérer dans le Classeur (pastille 🎁)
//    6. Défaite : l'animation du K.O. du dernier Pokémon se joue avant l'écran de fin
//    7. Équilibrage de Vol (Dracaufeu) : invulnérable seulement en haut du vol, pas d'esquive pendant
//       et juste après (réglages : data/equilibrage.js)
// ============================================================
Object.assign(SETTINGS_DEFAULT, { aimSens:1 });

// ---------- 1. visée depuis le point touché ----------
AIM.p0 = [null, null, null];
document.getElementById('btns').addEventListener('pointerdown', e => {
  const b = e.target.closest && e.target.closest('.ab'); if(!b) return; const i = ['b0', 'b1', 'b2'].indexOf(b.id); if(i >= 0) AIM.p0[i] = [e.clientX, e.clientY];
}, true);
const _aimStartV14 = AIM.start;
AIM.start = function(i, b){ _aimStartV14.call(this, i, b); if(this.p0[i]) this.c[i] = this.p0[i].slice(); };
// ---------- 2. sensibilité ----------
const _aimMoveV14 = AIM.move;
AIM.move = function(i, e){
  const k = Settings.get().aimSens || 1, c = this.c[i];
  return _aimMoveV14.call(this, i, { clientX:c[0] + (e.clientX - c[0])*k, clientY:c[1] + (e.clientY - c[1])*k });
};

// ---------- 3. charge autour de la base ----------
function drawCharge(p){
  let k = 0, i0 = 0; for(let i = 0; i < 3; i++) if(p.ch[i] > k){ k = p.ch[i]; i0 = i; } if(k <= 0 || p.hid) return;
  const s = mon(p, 0), cx = p.x, cy = p.y + (s.sy !== undefined ? s.sy*2 : 14), rx = (s.sw !== undefined ? s.sw*2 : 22) + 5, ry = (s.sh !== undefined ? s.sh*2 : 9) + 4;
  const m = p.mv[i0], col = COL[m.tp || p.t] || '#ffd23f', full = k >= 1, pul = .5 + .5*Math.sin(G.time*18);
  ctx.save(); ctx.lineCap = 'round';
  ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(10,6,20,.55)'; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); ctx.stroke();
  ctx.lineWidth = 3; ctx.strokeStyle = full ? (pul > .5 ? '#ffffff' : col) : col; ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, -Math.PI/2, -Math.PI/2 + 6.283*Math.min(1, k)); ctx.stroke();
  if(full){ ctx.globalAlpha = .35 + .3*pul; ctx.lineWidth = 7; ctx.strokeStyle = col; ctx.beginPath(); ctx.ellipse(cx, cy, rx + 2, ry + 2, 0, 0, 6.283); ctx.stroke(); }
  const a = -Math.PI/2 + 6.283*Math.min(1, k); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.fillRect(cx + Math.cos(a)*rx - 1.5, cy + Math.sin(a)*ry - 1.5, 3, 3);
  ctx.restore();
}

// ---------- 4 + 5. inventaire : vendre les doublons, récompenses de collection ----------
const setComplete = pid => CARD_RARITIES.every(r => Save.itemCount(`card:${pid}:${r}`) > 0);
const claimable = pid => { const d = Save.load(); return setComplete(pid) && !(d.setDone && d.setDone[pid]); };
const anyClaim = () => [...ORDER, ...(typeof BOSSES !== 'undefined' ? BOSSES : [])].some(claimable);
function claimSet(pid){
  const d = Save.load(); d.setDone = d.setDone || {}; if(d.setDone[pid] || !setComplete(pid)) return;
  d.setDone[pid] = 1; Save.save(); Save.addCoins(CARD_SET_REWARD); if(typeof coinSfx === 'function') coinSfx();
  toast(`<b>Collection ${esc(NAME[pid] || pid)} récompensée !</b><span>+${money(CARD_SET_REWARD)}</span>`);
}
const _invV14 = showInventory;
showInventory = function(o){
  _invV14(o);
  o = Object.assign({ tab:'items', back:showMain, filter:'all' }, o && typeof o === 'object' ? o : {});
  const kind = o.tab === 'binder' ? 'card' : o.tab === 'caps' ? 'capsule' : 'held';
  const list = Object.values(ITEM).filter(it => it.kind === kind && Save.sellable(it.id) > 0);
  const total = list.reduce((n, it) => n + Save.sellable(it.id)*sellPrice(it), 0);
  const hd = document.querySelector('#menu .hd');
  if(hd && total > 0){
    hd.insertAdjacentHTML('afterend', `<div class='row'><button class='btn2 sm' id='sellall'>Vendre tous les doublons (${list.reduce((n, it) => n + Save.sellable(it.id), 0)}) · +${money(total)}</button></div>`);
    document.getElementById('sellall').onclick = () => {
      gameConfirm(`Vendre tous les doublons de cet onglet ?`, `Tu gagnes <b>${money(total)}</b>. Tu gardes toujours 1 exemplaire de chaque.`, 'Vendre', () => {
        list.forEach(it => Save.sell(it.id, Save.sellable(it.id), sellPrice(it))); if(typeof coinSfx === 'function') coinSfx(); showInventory(o); });
    };
  }
  if(o.tab === 'binder') document.querySelectorAll('#menu .bpg').forEach(pg => {
    const c = pg.querySelector('[data-id^="card:"]'); if(!c) return; const pid = c.dataset.id.split(':')[1];
    if(!claimable(pid)) return; const bn = pg.querySelector('.bn'); if(!bn) return;
    bn.insertAdjacentHTML('beforeend', `<button class='btn2 sm claim' data-claim='${pid}'><img class='gift' src='${giftIcon()}'> +${money(CARD_SET_REWARD)}</button>`);
  });
  document.querySelectorAll('[data-claim]').forEach(b => b.onclick = ev => { ev.stopPropagation(); claimSet(b.dataset.claim); showInventory(o); });
  markBadges();
};
SCREENS.inventory = () => showInventory();
function markBadges(){
  const on = anyClaim();
  document.querySelectorAll("[data-tab='binder'], .mmi[data-id='inventory'], .mm-list [data-id='inventory']").forEach(el => el.classList.toggle('bdg', on));
}
const _menuV14 = menu;
menu = function(h){ _menuV14(h); if(h) markBadges(); };

// ---------- 6. défaite en douceur ----------
const _endV14 = battleEnd;
battleEnd = function(win){
  if(!win && G && G.endAt) return;                                       // v0.15 : un 2e appel (K.O. vérifié par rules.js) ne coupe plus l'animation
  if(!win && G && !G.endAt && G.p && G.p.hp <= 0 && !(G.cfg && G.cfg.mode === 'online')){
    G.endAt = G.time + 2.4; G.over = 0; G.p.inv = 0; G.p.hid = false; G.p.koDone = 1; menu(''); return;   // on laisse jouer l'animation du K.O.
  }
  return _endV14(win);
};
const _stepV14 = step;
step = function(dt){
  if(!G || !G.endAt) return _stepV14(dt);
  const p = G.p, x = p.x, y = p.y, e = G.e;
  _stepV14(dt);
  if(!G) return;
  p.x = x; p.y = y; down[0] = down[1] = down[2] = 0; if(e){ e.next = 99; e.tele = 0; }
  if(G.time >= G.endAt && !G.over){ G.over = 1; G.endAt = 0; _endV14(false); }
};
const _pressV14 = press; press = function(i){ if(G && G.endAt) return; _pressV14(i); };
const _dashV14 = dash;
dash = function(){
  if(G && G.endAt) return;
  const p = G && G.p; if(p && (p.fl || (p.flyLock || 0) > G.time)) return;     // 7. pas d'esquive pendant / juste après Vol
  _dashV14();
};

// ---------- 7. Vol : invulnérable seulement en haut ----------
const _updFlV14 = updFl;
updFl = function(s, d, own){
  const inv0 = s.inv, invT0 = s.invT, had = !!s.fl;
  _updFlV14(s, d, own);
  const F = s.fl;
  if(F && F.oy > -F.h*FLY_RULES.invulnAbove){ if(own) s.inv = inv0; else s.invT = invT0; }      // près du sol : on peut être touché
  if(had && !s.fl) s.flyLock = G.time + FLY_RULES.lockAfter;
};

// ---------- Options : sensibilité de la visée ----------
const _optV14 = showOptions;
showOptions = function(back){
  _optV14(back);
  const s = Settings.get(), ao = document.getElementById('o-aimo'); if(!ao) return;
  ao.closest('label').insertAdjacentHTML('afterend', `<label class='opt'><span>Sensibilité de la visée</span><input type='range' id='o-sens' min='.5' max='2' step='.1' value='${s.aimSens || 1}'><b id='o-sensv'>×${(s.aimSens || 1).toFixed(1).replace('.', ',')}</b></label>`);
  const el = document.getElementById('o-sens');
  el.oninput = () => { Settings.set('aimSens', +el.value); document.getElementById('o-sensv').textContent = '×' + (+el.value).toFixed(1).replace('.', ','); };
};
SCREENS.options = showOptions;

document.head.insertAdjacentHTML('beforeend', `<style>
.bdg{position:relative}
.bdg::after{content:"🎁";position:absolute;right:-6px;top:-7px;font-size:11px;width:17px;height:17px;line-height:17px;text-align:center;border-radius:50%;background:#e8403c;box-shadow:0 0 0 2px #14101c,0 0 8px #ff6a5a;animation:bdgp 1s ease-in-out infinite alternate}
.mmi.bdg::after{right:auto;left:auto;margin-left:6px;position:relative;display:inline-block;top:-2px}
@keyframes bdgp{to{transform:scale(1.15)}}
.btn2.claim{margin-left:auto;border-color:#ffd23f;color:#ffe9a0;animation:bdgp 1s ease-in-out infinite alternate}
</style>`);
