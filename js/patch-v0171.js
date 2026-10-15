// ============================================================
//  patch-v0171.js — correctif v0.17.1 (rapport de test v0.17)
//    1. Menu principal : « Défi : Mewtwo » et « Combat Raid » ne sont plus dans la liste de gauche, seulement
//       en encarts à droite. L'encart Raid montre le raid du moment, ses étoiles et le temps restant.
//    2. Les raids se débloquent en terminant le chapitre 1 (en Solo 3v3 ou 6v6)
//    3. Un raid gagné ne peut pas être refait (jusqu'au prochain raid, ou en payant pour en changer) ;
//       on peut toujours REJOINDRE le raid d'un autre joueur
//    4. Aperçu du boss de raid bien centré
//    5. Objets « Choix » (Bandeau / Mouchoir) : verrou visible sur les boutons, et une attaque annulée
//       ou qui n'est pas partie ne bloque plus
//    6. Raids : attaques de zone en plus (météores, fissures, ondes) qu'il faut esquiver
// ============================================================
const raidUnlocked = () => Save.cleared(3) >= CH_SIZE || Save.cleared(6) >= CH_SIZE;
const raidDone = cur => { const d = Save.load().raidDone; return !!(d && cur && d.slot === cur.slot && d.id === cur.id); };

// ---------- 1. menu principal ----------
const HIDE_LEFT = ['boss', 'raid'];
const _rmmV171 = renderMainMM;
renderMainMM = function(){
  _rmmV171();
  const box = document.querySelector('#menu .mm'); if(!box) return;
  document.querySelectorAll('.mmi').forEach(b => { if(HIDE_LEFT.includes(b.dataset.id)) b.remove(); });
  const btns = [...document.querySelectorAll('.mmi')], items = btns.map(b => MAIN_MENU.find(m => m.id === b.dataset.id));
  const focus = i => { MM.sel = i; btns.forEach((b, k) => b.classList.toggle('act', k === i)); const d = document.getElementById('mmd'); if(d && items[i]) d.textContent = items[i].desc || ''; };
  btns.forEach((b, i) => { b.onmouseenter = () => focus(i); b.onclick = () => { focus(i); openMain(items[i]); }; });
  MM.items = items; MM.focus = focus; focus(Math.max(0, Math.min(items.length - 1, MM.sel)));
  // encart Raid
  if(!SCREENS.raid) return;
  const cur = raidCurrent(), lock = !raidUnlocked(), done = raidDone(cur), S = SPR[cur.id];
  const html = `<button class='mm-feat raidc ${lock ? 'lock' : ''}' id='mmraid'>${S ? `<img src='${spr(cur.id, 1).toDataURL()}'>` : ''}<span>
    <b>Raid ${'★'.repeat(cur.stars)}${cur.stars >= 5 ? ' ✦' : ''}</b><small>${lock ? '🔒 Termine le chapitre 1' : esc(NAME[cur.id] || cur.id) + (done ? ' · ✔ battu' : '')}</small>
    <small class='rt'>${lock ? '' : "Nouveau raid dans <i id='mmrt'>" + mmss2(raidNextIn()) + '</i>'}</small></span></button>`;
  const mew = box.querySelector(".mm-feat[data-go='boss']");
  if(mew) mew.insertAdjacentHTML('afterend', html); else box.insertAdjacentHTML('beforeend', html);
  document.getElementById('mmraid').onclick = () => openMain(MAIN_MENU.find(m => m.id === 'raid'));
  const slot = raidSlot(), el = document.getElementById('mmrt');
  const tick = () => { if(!el || !el.isConnected) return; if(raidSlot() !== slot && document.querySelector('#menu .mm')) return renderMainMM(); el.textContent = mmss2(raidNextIn()); setTimeout(tick, 1000); };
  if(el) setTimeout(tick, 1000);
};

// ---------- 2 + 3. écran Raid : verrou du chapitre 1, raid déjà battu ----------
const _showRaidV171 = showRaid;
showRaid = function(sel){
  if(!raidUnlocked()){
    menu(`<h1>Combat Raid</h1><p>Les raids se débloquent quand tu as terminé le <b>chapitre 1 « ${esc(CHAPTERS[0].name)} »</b> en Solo (3v3 ou 6v6).</p>
      <p class='hint'>Progression : 3v3 ${Math.min(CH_SIZE, Save.cleared(3))}/${CH_SIZE} · 6v6 ${Math.min(CH_SIZE, Save.cleared(6))}/${CH_SIZE}</p>
      <div class='row'><button class='btn' id='rgs'>Aller au Solo</button><button class='btn2' id='back'>Retour</button></div>`);
    document.getElementById('rgs').onclick = () => SCREENS.solo(); document.getElementById('back').onclick = showMain; return;
  }
  _showRaidV171(sel);
  const cur = raidCurrent(); if(!raidDone(cur)) return;
  ['rsolo', 'rnnew'].forEach(id => { const b = document.getElementById(id); if(b){ b.disabled = true; b.title = 'Raid déjà battu'; } });
  const s = document.getElementById('rsolo'); if(s) s.textContent = '✔ Raid battu';
  const r = document.querySelector('.raidv .right');
  if(r) r.insertAdjacentHTML('afterbegin', `<p class='rdone'>✔ Tu as déjà battu ce raid. Le prochain arrive dans ${mmss2(raidNextIn())} — ou change-le maintenant. Tu peux toujours <b>rejoindre</b> le raid d'un autre joueur.</p>`);
};
SCREENS.raid = showRaid;
const _rnChooseV171 = rnChoose;
rnChoose = function(t, create){
  if(create && raidDone(raidCurrent())){ gameConfirm('Raid déjà battu', 'Tu as déjà battu ce raid. Attends le prochain (ou change-le), ou rejoins celui d\'un autre joueur.', 'Rejoindre', () => _rnChooseV171(t, false)); return; }
  return _rnChooseV171(t, create);
};
// victoire dans TON raid (solo ou hôte) : il est marqué comme battu, pas de « Rejouer »
const _beV171 = battleEnd;
battleEnd = function(win){
  const own = G && G.cfg && G.cfg.mode === 'raid' && G.raid && (!G.raid.net || G.raid.host) && win && !G.raid.ended;
  const boss = own && G.cfg.raidBoss, r = _beV171(win);
  if(own){ const cur = raidCurrent(); if(cur.id === boss){ Save.load().raidDone = { slot:cur.slot, id:cur.id }; Save.save(); } const b = document.getElementById('rp'); if(b) b.remove(); }
  return r;
};

// ---------- 4. aperçu du boss de raid centré sur sa silhouette ----------
const BBOX = new WeakMap();
function opaqueBox(f){
  let b = BBOX.get(f); if(b) return b;
  const w = f.width, h = f.height, d = f.getContext('2d', { willReadFrequently:true }).getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for(let j = 0; j < h; j++) for(let i = 0; i < w; i++) if(d[(j*w + i)*4 + 3] > 40){ if(i < x0) x0 = i; if(i > x1) x1 = i; if(j < y0) y0 = j; if(j > y1) y1 = j; }
  b = x1 < 0 ? { x0:0, y0:0, w, h } : { x0, y0, w:x1 - x0 + 1, h:y1 - y0 + 1 }; BBOX.set(f, b); return b;
}
// dessine un sprite centré dans une zone (cx, cy, largeur, hauteur max) ; renvoie la position pour les effets
function drawCentered(c, fr, cx, cy, mw, mh, kmax){
  const b = opaqueBox(fr), k = Math.max(1, Math.min(kmax || 3, Math.floor(Math.min(mw/b.w, mh/b.h)*2)/2));
  const x0 = Math.round(cx - b.w*k/2 - b.x0*k), y0 = Math.round(cy - b.h*k/2 - b.y0*k);
  c.drawImage(fr, x0, y0, fr.width*k, fr.height*k); return { x0, y0, k };
}
raidPreview = function(id){
  const cv = document.getElementById('rbcv'); if(!cv) return; const c = cv.getContext('2d'), S = SPR[id], t0 = performance.now(), W2 = cv.width, H2 = cv.height;
  const loop = now => {
    if(!cv.isConnected) return; const t = (now - t0)/1000; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, W2, H2); c.imageSmoothingEnabled = false;
    const g = c.createRadialGradient(W2/2, H2*.8, 6, W2/2, H2*.6, W2*.45); g.addColorStop(0, `rgba(255,40,40,${.5 + .15*Math.sin(t*4)})`); g.addColorStop(1, 'rgba(120,0,0,0)'); c.fillStyle = g; c.fillRect(0, 0, W2, H2);
    if(S){ const an = resolveAnim(S, 'Idle') || 'Idle', fr = snFrame(id, an, 1, frameAt(S, an, t*44, 1)), E = raidEyes(fr, 1);
      const P = drawCentered(c, fr, W2/2, H2/2 + 2, W2*.8, H2*.86, 3);
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = .15 + .1*Math.sin(t*5); c.drawImage(tint(fr, '#ff2020'), P.x0, P.y0, fr.width*P.k, fr.height*P.k);
      c.globalAlpha = .6 + .4*Math.sin(t*5); E.pts.forEach(([i, j]) => c.drawImage(glow('#ff2020'), P.x0 + i*P.k - 10, P.y0 + j*P.k - 10, 22, 22));
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; E.pts.forEach(([i, j]) => { c.fillStyle = '#ff2a2a'; c.fillRect(P.x0 + i*P.k - 1, P.y0 + j*P.k - 1, 4, 3); }); }
    for(let i = 0; i < 6; i++){ const y = H2 - ((t*40 + i*29) % H2); c.fillStyle = i % 2 ? '#ff5a3a' : '#ff9a6a'; c.fillRect(30 + (i*37 % (W2 - 60)) + Math.sin(t*2 + i)*6, y, 2, 2); }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
};

// ---------- 5. objets Choix ----------
//  le verrou ne se pose que si l'attaque est vraiment partie (temps de recharge lancé)
rel = (prev => function(i){
  const p = G && G.p, fx = p && fxOf(p), cd0 = p ? p.cd[i] : 0, had = p && p.choice;
  prev(i);
  if(p && fx && fx.choice && had == null && p.choice === i && !(p.cd[i] > cd0)) p.choice = null;
})(rel);
const _stepV171 = step;
step = function(dt){
  _stepV171(dt);
  if(!G || !G.p) return;
  const p = G.p, h = heldOf(p), lockOn = h && h.fx && h.fx.choice && p.choice != null;
  for(let i = 0; i < 3; i++){ const b = bt[i]; if(!b) continue; const L = lockOn && p.choice !== i; if(b.dataset.lk !== String(!!L)){ b.dataset.lk = String(!!L); b.classList.toggle('chlk', !!L); b.title = L ? 'Bloqué par ' + h.name + ' : fais une Relève pour changer d\'attaque' : ''; } }
};

// ---------- 6. raids : attaques de zone ----------
const ZONE_NAMES = { meteor:'Pluie de Météores', cross:'Fissure Sismique', ring:'Onde Concentrique' };
function raidZoneMake(kind){
  const e = G.e, R = G.raid, Z = RCF().zones, tp = typesOf(e.t)[0], st = RCF().stars || 3, pts = [];
  const add = (x, y, t, r) => { x = clX(x); y = clY(y); pts.push([Math.round(x), Math.round(y), +t.toFixed(2), r]); };
  if(kind === 'meteor'){
    raidTargets().forEach(T => { add(T.x, T.y, 0, 46); for(let k = 0; k < 2; k++) add(T.x + (T.vx || 0)*.6 + R_(-70, 70), T.y + (T.vy || 0)*.6 + R_(-50, 50), .2 + k*.2, 40); });
    for(let k = 0; k < Z.count + st; k++) add(R_(80, W - 80), R_(90, H - 70), R_(0, .7), 42);
  } else if(kind === 'cross'){
    const n = st >= 4 ? 6 : 4, a0 = R_(0, 6.283);
    for(let l = 0; l < n; l++){ const a = a0 + l*6.283/n; for(let d = 90; d < 620; d += 58){ const x = e.x + Math.cos(a)*d, y = e.y + 20 + Math.sin(a)*d*.85; if(x > 40 && x < W - 40 && y > 50 && y < H - 40) add(x, y, d/58*.06, 30); } }
  } else {
    for(let k = 0; k < 14; k++){ const a = k*6.283/14; add(e.x + Math.cos(a)*150, e.y + 20 + Math.sin(a)*125, 0, 36); }
    for(let k = 0; k < 22; k++){ const a = k*6.283/22 + .14; add(e.x + Math.cos(a)*300, e.y + 20 + Math.sin(a)*250, 1.1, 38); }
  }
  return { k:kind, tp, dm:+(Z.power*G.stage.dmg*Math.pow(RCF().rage.dmg, R.rage)).toFixed(2), delay:Z.delay, pts };
}
function raidZoneApply(Q){
  const look = { meteor:'meteor', cross:'pillar', ring:'implode' }[Q.k] || 'meteor';
  Q.pts.forEach(([x, y, t, r]) => ZONES.push({ x, y, R:r, t:-t, delay:Q.delay, dm:Q.dm, own:0, tp:Q.tp, look, status:null, done:0, col:lcol(Q.tp), seed:Math.random() }));
  lbl(1, ZONE_NAMES[Q.k] || 'Attaque de zone', Q.tp); if(typeof playSfx === 'function') playSfx('charge');
  G.raid.zBanner = { t0:G.time, s:'⚠ ' + (ZONE_NAMES[Q.k] || '') + ' — SORS DES ZONES AU SOL !' };
}
const _stepZ = step;
step = function(dt){
  _stepZ(dt);
  if(!isRaid() || G.over || G.paused || !raidAuth()) return;
  const R = G.raid, e = G.e, Z = RCF().zones; if(!Z || e.hp <= 0 || G.intro > 0 || R.ult) return;
  if(R.zoneT == null) R.zoneT = Z.first;
  R.zoneT -= dt; if(R.zoneT > 0) return;
  R.zoneT = Z.every*Math.pow(.88, R.rage);
  const kinds = Z.kinds.filter(k => k !== R.lastZone), kind = kinds[Math.floor(Math.random()*kinds.length)]; R.lastZone = kind;
  const Q = raidZoneMake(kind); raidZoneApply(Q);
  if(RaidHook.zones) RaidHook.zones(Q);
  e.next = Math.max(e.next || 0, .8);
};
RaidHook.zones = Q => { if(typeof rnOn === 'function' && rnOn() && RNET.m.host) rsend('bz', Q); };
const _rnMsgV171 = rnMsg;
rnMsg = function(M, k, d){ if(k === 'bz'){ if(!M.host && M.state === 'fight' && G && G.raid && d && d.pts) raidZoneApply(d); return; } return _rnMsgV171(M, k, d); };
const _dsfZ = drawScreenFx;
drawScreenFx = function(){
  _dsfZ();
  const B = isRaid() && G.raid.zBanner; if(!B) return; const t = G.time - B.t0; if(t > 1.8){ G.raid.zBanner = null; return; }
  ctx.save(); ctx.globalAlpha = Math.min(1, t*5, (1.8 - t)*3); htext(B.s, VW/2, VH - 74, 11, '#ff7a6a', 'center'); ctx.restore();
};

document.head.insertAdjacentHTML('beforeend', `<style>
.mm-feat.raidc{top:calc(46% + 54px);border-color:rgba(255,90,70,.6);background:linear-gradient(90deg,rgba(70,10,14,.88),rgba(14,8,30,.9));box-shadow:0 0 14px rgba(255,60,50,.3);animation:none}
.mm-feat.raidc img{filter:drop-shadow(0 0 4px #ff3030)}.mm-feat.raidc b{color:#ffb0a0}.mm-feat.raidc .rt{color:#ffe9a0}.mm-feat.raidc .rt i{font-style:normal}
.mm-feat.raidc.lock{filter:grayscale(.7);opacity:.75}
.rdone{color:#6ae08a;font-size:11px}
.ab.chlk{opacity:.35;filter:grayscale(1)}.ab.chlk::before{content:"🔒";position:absolute;top:2px;left:50%;transform:translateX(-50%);font-size:11px;z-index:4}
@media (max-height:330px){.mm-feat{top:36%}.mm-feat.raidc{top:calc(36% + 50px)}}
</style>`);
