// ============================================================
//  shiny.js — POKÉMON SHINY (chromatiques)
//    • Shiny Swapper (objet SECRET, data/secret.js) : s'utilise depuis l'inventaire sur un de tes Pokémon,
//      qui devient shiny pour toujours (sauvegardé). Un exemplaire est consommé.
//    • Rendu : chaque image du Pokémon est recolorée à la volée avec sa palette shiny officielle (data/shiny.js).
//      Ton Pokémon shiny l'est en combat, dans la Pokéball, dans les menus et les miniatures.
//      Les Pokémon ADVERSES ne sont jamais shiny. Dans « Mes équipes », chaque Pokémon shiny peut jouer en Classique ou en Shiny
//      (team.look = { idPokémon:'normal' } quand on choisit Classique ; Shiny par défaut).
//    • À son entrée en combat, ton Pokémon shiny scintille (éclat chromatique + son, comme dans les jeux).
// ============================================================
const Shiny = {
  all(){ const d = Save.load(); if(!d.shiny || typeof d.shiny !== 'object') d.shiny = {}; return d.shiny; },
  has(pid){ return !!(pid && this.all()[pid] && SHINY_PAL[pid]); },
  can(pid){ return !!(SHINY_PAL[pid] && ORDER.includes(pid) && !this.has(pid)); },
  add(pid){ this.all()[pid] = 1; Save.save(); },
  // en combat : shiny débloqué ET pas mis en « Classique » dans l'équipe utilisée
  battle(pid){ return this.has(pid) && !(G && G.cfg && G.cfg.look && G.cfg.look[pid] === 'normal'); },
  // miniatures : idem + écran d'édition d'équipe (SHINY_VIEW) + jamais l'espèce adverse en combat
  view(pid){
    if(!this.has(pid)) return false;
    if(SHINY_VIEW && SHINY_VIEW[pid] === 'normal') return false;
    if(G && G.cfg){ if(G.cfg.look && G.cfg.look[pid] === 'normal') return false; if(G.e && G.e.t === pid && !(G.p && G.p.t === pid)) return false; }
    return true;
  }
};
let SHINY_VIEW = null;                                                           // apparences choisies dans l'éditeur d'équipe en cours

// ---------- recoloration (mise en cache par image source) ----------
const SH_CACHE = new WeakMap(), SH_MAPS = {};
function shinyMap(pid){
  if(SH_MAPS[pid]) return SH_MAPS[pid];
  const m = new Map(), P = SHINY_PAL[pid] || {};
  for(const a in P){ const b = P[a]; m.set(parseInt(a, 16), [parseInt(b.slice(0, 2), 16), parseInt(b.slice(2, 4), 16), parseInt(b.slice(4, 6), 16)]); }
  return SH_MAPS[pid] = m;
}
function shinyCanvas(src, pid){
  if(!src || !src.width) return src;
  let per = SH_CACHE.get(src); if(per && per.v === src._shv) return per.c;
  const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
  const x = c.getContext('2d'); x.drawImage(src, 0, 0);
  const img = x.getImageData(0, 0, c.width, c.height), d = img.data, M = shinyMap(pid);
  for(let i = 0; i < d.length; i += 4){ if(!d[i + 3]) continue; const k = (d[i] << 16) | (d[i + 1] << 8) | d[i + 2], r = M.get(k); if(r){ d[i] = r[0]; d[i + 1] = r[1]; d[i + 2] = r[2]; } }
  x.putImageData(img, 0, 0);
  ['sy', 'sw', 'sh'].forEach(k => { if(src[k] !== undefined) c[k] = src[k]; });      // infos d'ombre au sol utilisées par le rendu
  SH_CACHE.set(src, { c, v:src._shv }); return c;
}
// combat : seulement TON Pokémon (en = 0)
const _monSh = mon;
mon = function(o, en){ const f = _monSh(o, en); return (!en && o && Shiny.battle(o.t)) ? shinyCanvas(f, o.t) : f; };
// miniature shiny : on recolore l'image À TAILLE RÉELLE avant de la réduire (sinon le lissage mélange les couleurs)
const SH_TH = {};
function shinyThumb(pid){
  if(SH_TH[pid]) return SH_TH[pid];
  const S = SPR[pid]; if(!S || !S.IM.Idle || !S.IM.Idle.naturalWidth) return _sprSh(pid);
  const d = S.D.anim.Idle, src = document.createElement('canvas'); src.width = d.fw; src.height = d.fh;
  src.getContext('2d').drawImage(S.IM.Idle, 0, 0, d.fw, d.fh, 0, 0, d.fw, d.fh);
  const sh = shinyCanvas(src, pid), cv = document.createElement('canvas'); cv.width = cv.height = 48;
  const k = Math.min(1, 48/Math.max(d.fw, d.fh)), w = d.fw*k, h = d.fh*k;
  cv.getContext('2d').drawImage(sh, 0, 0, d.fw, d.fh, (48 - w)/2, (48 - h)/2, w, h);
  return SH_TH[pid] = cv;
}
const _sprSh = spr;
spr = function(t, b){ return (!b && Shiny.view(t)) ? shinyThumb(t) : _sprSh(t, b); };
// au lancement d'un combat : apparence choisie dans l'équipe (Classique / Shiny)
const _startSh = start;
start = function(cfg){
  const t = cfg && cfg.teamId && Save.team(cfg.teamId);
  if(t && !cfg.look) cfg.look = { ...(t.look || {}) };
  return _startSh(cfg);
};
// éditeur d'équipe : choix de l'apparence d'un Pokémon shiny
function lookBox(ed){
  const id = ed.focus; if(!Shiny.has(id)) return '';
  const normal = ed.look && ed.look[id] === 'normal';
  return `<div class='held look'><span>Apparence</span><img src='${_sprSh(id).toDataURL()}'><button class='btn2 sm ${normal ? 'on' : ''}' data-look='normal'>Classique</button>
    <img src='${shinyThumb(id).toDataURL()}'><button class='btn2 sm ${normal ? '' : 'on'}' data-look='shiny'>✦ Shiny</button></div>`;
}
// éclat chromatique à l'entrée en combat
const _cfSh = capsuleFire;
capsuleFire = function(o, enemy){
  _cfSh(o, enemy);
  if(enemy || !o || !Shiny.battle(o.t) || typeof CAP_FX === 'undefined') return;
  CAP_ON.push({ fx:CAP_FX.brillant, x:o.x, gy:o.y + PB_FEET, t0:G.time + .1 }); capSfx('shiny');
};
// marque ✦ sur les Pokémon shiny dans les grilles de sélection
const _menuSh = menu;
menu = function(h){
  _menuSh(h); if(!h) return;
  document.querySelectorAll('[data-add], [data-pk], [data-st]').forEach(el => { const id = el.dataset.add || el.dataset.pk || el.dataset.st; if(Shiny.view(id) && !el.querySelector('.shy')) el.insertAdjacentHTML('beforeend', `<span class='shy'>✦</span>`); });
};

// ============================================================
//  UTILISER LE SHINY SWAPPER
// ============================================================
function showShinySwap(back, sel){
  back = typeof back === 'function' ? back : () => showInventory();
  const n = Save.itemCount('shiny-swapper');
  const mine = ORDER.filter(id => SHINY_PAL[id] && (typeof Owned === 'undefined' || Owned.has(id)) && !(typeof BOSSES !== 'undefined' && BOSSES.includes(id)));
  const img = (id, s) => `<img src='${(s ? shinyThumb(id) : _sprSh(id)).toDataURL()}'>`;
  menu(`<div class='hd'><h1>Shiny Swapper</h1><span class='tag' style='background:${RAR.S.col};color:#3a2400'>×${n}</span></div>
    <p class='hint'>Choisis le Pokémon qui deviendra <b>shiny</b> pour toujours.</p>
    <div class='scroll'><div class='shgrid'>${mine.map(id => { const done = Shiny.has(id); return `<button class='shc ${id === sel ? 'on' : ''}' data-sh='${id}' ${done ? 'disabled' : ''}>
      <span class='shp'>${img(id, false)}<i>➜</i>${img(id, true)}</span><b>${esc(NAME[id])}</b><small>${done ? '✦ déjà shiny' : ''}</small></button>`; }).join('') || '<p>Aucun Pokémon disponible.</p>'}</div></div>
    <div class='row'>${sel ? `<button class='btn' id='shgo' ${n > 0 ? '' : 'disabled'}>✦ Rendre ${esc(NAME[sel])} shiny</button>` : ''}<button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-sh]', el => showShinySwap(back, el.dataset.sh));
  document.getElementById('back').onclick = back;
  const go = document.getElementById('shgo');
  if(go) go.onclick = () => {
    const doIt = () => { if(Save.itemCount('shiny-swapper') <= 0 || !Shiny.can(sel)) return; Save.addItem('shiny-swapper', -1); Shiny.add(sel); showShinyDone(sel, back); };
    if(typeof gameConfirm === 'function') gameConfirm(`Rendre ${esc(NAME[sel])} shiny ?`, `Un <b>Shiny Swapper</b> sera utilisé. C'est définitif !`, 'Oui !', doIt); else doIt();
  };
}
// célébration : le Pokémon tourne sur lui-même dans une pluie d'étincelles et change de couleurs
function showShinyDone(pid, back){
  menu(`<div class='shdone'><canvas id='shcv' width='240' height='170'></canvas><h1>${esc(NAME[pid])} est maintenant <span class='gold'>shiny</span> !</h1>
    <p>Il brillera à chacune de ses entrées en combat.</p><div class='row'><button class='btn' id='shok'>Génial !</button></div></div>`);
  document.getElementById('shok').onclick = back;
  if(typeof capSfx === 'function') capSfx('shiny');
  const cv = document.getElementById('shcv'), c = cv.getContext('2d'), S = SPR[pid], t0 = performance.now();
  const loop = now => {
    if(!cv.isConnected) return; const t = (now - t0)/1000; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 240, 170); c.imageSmoothingEnabled = false;
    const g = c.createRadialGradient(120, 95, 5, 120, 95, 110); g.addColorStop(0, 'rgba(255,230,140,.55)'); g.addColorStop(1, 'rgba(255,230,140,0)'); c.fillStyle = g; c.fillRect(0, 0, 240, 170);
    if(S){
      const an = t < 1.4 ? (resolveAnim(S, 'Rotate') || 'Idle') : 'Idle', row = t < 1.4 ? 0 : 1;
      const fr = snFrame(pid, an, row, frameAt(S, an, t*60, true)), k = 3, sw = t > .8 ? 1 : 0;
      const img2 = sw ? shinyCanvas(fr, pid) : fr;
      c.drawImage(img2, 120 - fr.width*k/2, 100 - (fr.height/2 + 14)*k + 40, fr.width*k, fr.height*k);
      if(t > .7 && t < 1.1){ c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - Math.abs(t - .9)/.2; c.drawImage(tint(fr, '#ffffff'), 120 - fr.width*k/2, 100 - (fr.height/2 + 14)*k + 40, fr.width*k, fr.height*k); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    }
    if(typeof CAP_FX !== 'undefined'){ const F = CAP_FX.brillant, tt = (t - .8) % 1.8; if(t > .8 && tt <= F.dur){ c.save(); F.over.call(F, c, 120, 128, tt); c.restore(); } }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
