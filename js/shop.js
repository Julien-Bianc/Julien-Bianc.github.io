// ============================================================
//  shop.js — MAGASIN (caisses), animation d'ouverture façon CS2, INVENTAIRE.
//  Données : data/shop.js (RARITY, CRATES, SHOP, ITEM). Sauvegarde : Save.inv() / Save.addItem() (js/save.js).
//  Écrans enregistrés : SCREENS.shop, SCREENS.inventory.
//  Les icônes sont générées en pixel art (contour sombre, ombrage 3 tons) : remplace-les plus tard par des PNG si tu veux.
// ============================================================
const _shopCache = {};
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v)*t).toString(16).padStart(2, '0')).join(''); };

// ---------- icône d'objet (16×16) : forme + couleur de rareté ----------
function itemIcon(it){
  const key = 'i' + it.id + it.r + it.icon; if(_shopCache[key]) return _shopCache[key];
  const rows = ICON_SHAPES[it.icon] || ICON_SHAPES[SHAPE_ORDER[0]], h = rows.length, w = Math.max(...rows.map(r => r.length));
  const base = RAR[it.r].col, L = mixHex(base, '#ffffff', .5), M = base, D = mixHex(base, '#000000', .45);
  const c = mkc(16, 16), x = c.getContext('2d'), ox = (16 - w) >> 1, oy = (16 - h) >> 1;
  const on = (px, py) => py >= 0 && py < h && px >= 0 && px < w && rows[py][px] === '#';
  for(let py = -1; py <= h; py++) for(let px = -1; px <= w; px++){          // contour
    if(on(px, py)) continue;
    if(on(px - 1, py) || on(px + 1, py) || on(px, py - 1) || on(px, py + 1)){ x.fillStyle = OL; x.fillRect(ox + px, oy + py, 1, 1); }
  }
  for(let py = 0; py < h; py++) for(let px = 0; px < w; px++){              // 3 tons : lumière haut-gauche, ombre bas-droite
    if(!on(px, py)) continue;
    x.fillStyle = (!on(px, py - 1) || !on(px - 1, py)) ? L : (!on(px, py + 1) || !on(px + 1, py)) ? D : M;
    x.fillRect(ox + px, oy + py, 1, 1);
  }
  const sx = (w >> 1) - 2, sy = (h >> 1) - 2;                               // petit reflet
  if(on(sx, sy)){ x.fillStyle = '#fff'; x.fillRect(ox + sx, oy + sy, 2, 1); x.fillRect(ox + sx, oy + sy + 1, 1, 1); }
  return _shopCache[key] = c.toDataURL();
}

// ---------- sprite de la caisse (40×32) : coffre doré, sangles sombres, cadenas ----------
function crateImg(){
  if(_shopCache.crate) return _shopCache.crate;
  const c = mkc(40, 32), x = c.getContext('2d'), R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const HL = '#fff0b0', L1 = '#ffd86a', M1 = '#f0a82c', D1 = '#b8701a', D2 = '#7a4512', S = '#9aa7b8';
  R(4, 3, 32, 26, OL);                                   // contour
  R(5, 4, 30, 6, L1); R(5, 4, 30, 1, HL);                // dessus du couvercle
  R(5, 10, 30, 5, M1); R(5, 15, 30, 1, D1);              // façade du couvercle
  R(5, 16, 30, 12, M1); R(5, 25, 30, 3, D1);             // corps
  R(5, 10, 1, 18, L1); R(34, 10, 1, 18, D1);             // arêtes gauche/droite
  [[9, 11], [27, 11]].forEach(([a]) => { R(a, 4, 4, 24, D2); R(a, 4, 1, 24, D1); R(a + 3, 4, 1, 24, OL); });   // sangles
  R(16, 11, 8, 9, OL); R(17, 12, 6, 7, S); R(17, 12, 6, 1, '#d8e0ea'); R(17, 18, 6, 1, '#6c7889'); R(19, 14, 2, 3, OL);   // cadenas
  for(let k = 0; k < 5; k++){ R(20 - k - 1, 21 + k, 2*k + 2, 1, OL); }   // emblème (triangle)
  for(let k = 1; k < 4; k++){ R(20 - k, 22 + k, 2*k, 1, '#e8603c'); }
  [[6, 5], [33, 5], [6, 26], [33, 26]].forEach(([a, b]) => R(a, b, 1, 1, HL));   // rivets
  return _shopCache.crate = c.toDataURL();
}

// ---------- carte de collection (format carte Pokémon, en HTML pour de beaux effets holo) ----------
const spriteURL = id => _shopCache['sp' + id] || (_shopCache['sp' + id] = spr(id).toDataURL());
const SYM = { C:'●', PC:'◆', R:'★', UR:'✦' };
function cardHtml(it, s){
  const D = POKEMON[it.poke]; if(!D) return '';
  const c0 = COL[D.types[0]] || '#999', R = RAR[it.r];
  const body = mixHex(c0, '#ffffff', .4), a1 = mixHex(c0, '#ffffff', .15), a2 = mixHex(c0, '#000000', .72);
  const dots = D.types.map(t => `<i class='td' style='background:${COL[t] || '#999'}'></i>`).join('');
  const mv = D.moves.map(m => `<div class='tm'><i class='td' style='background:${m.color || COL[m.type] || '#999'}'></i><span>${esc(m.name)}</span><b>${m.power || '—'}</b></div>`).join('');
  const no = String(ORDER.indexOf(it.poke) + 1).padStart(2, '0') + '/' + String(ORDER.length).padStart(2, '0');
  return `<div class='cw r-${it.r}' style='--cs:${s}'><div class='tcg'><div class='tin' style='background:${body}'>
    <div class='th'><b>${esc(D.name)}</b><span>PV ${D.hp}${dots}</span></div>
    <div class='ta' style='background:radial-gradient(ellipse at 50% 90%,${a1},${a2})'><img src='${spriteURL(it.poke)}'></div>
    <div class='ti'>${D.types.map(t => TN[t] || t).join('/')} · Vit. ${D.speed}</div>
    <div class='tmv'>${mv}</div>
    <div class='tf'><span>${no}</span><span class='ts' style='color:${R.col}'>${SYM[it.r]}</span></div></div>
    <u class='rb'></u><u class='sh'></u><u class='sp'></u></div></div>`;
}
// visuel d'un objet : carte (échelle s) ou icône pixel art
const itemVisual = (it, s) => it.kind === 'card' ? cardHtml(it, s) : `<img src='${itemIcon(it)}'>`;

// ---------- cartes de la grille / de la bande ----------
const rarCss = r => `--rc:${RAR[r].col}`;
function itemCard(it, o){
  o = o || {};
  const cd = it.kind === 'card' ? 'cd ' : '';
  if(o.locked) return `<button class='itc ${cd}locked' data-id='${it.id}' style='${rarCss(it.r)}'><span class='q'>?</span><i class='bar'></i></button>`;
  return `<button class='itc ${cd}r-${it.r} ${o.cls || ''}' data-id='${it.id}' style='${rarCss(it.r)}'>${itemVisual(it, o.s || .4)}${o.n > 1 ? `<span class='cnt'>×${o.n}</span>` : ''}<i class='bar'></i></button>`;
}
const pctTxt = p => (p*100).toFixed(p*100 % 1 === 0 ? 0 : 1).replace('.', ',') + ' %';
const rateChips = () => RARITY.map(r => `<span class='tag' style='background:${r.col};color:#fff'>${r.label} ${pctTxt(rarityPct(r.id))}</span>`).join(' ');

// ---------- sons : de plus en plus spectaculaires avec la rareté ----------
const shopTick = () => { if(!AU.ctx) return; tone(1400, .025, 'square', .05); tone(520, .04, 'triangle', .07, -120); };
function shopSuspense(r){ if(!AU.ctx || r === 'C') return; tone(180, r === 'UR' ? 1.6 : .9, 'sawtooth', .04, r === 'UR' ? 900 : 400); }
function shopReveal(r){
  if(!AU.ctx) return;
  const arp = (fr, step, v) => fr.forEach((f, i) => { tone(f, .24, 'square', v, 0, i*step); tone(f/2, .24, 'triangle', v*1.2, 0, i*step); });
  if(r === 'C'){ arp([660, 880], .09, .07); }
  else if(r === 'PC'){ arp([660, 880, 1100], .09, .08); noise(.25, .1, 6000, 2000, 'highpass', .1); }
  else if(r === 'R'){ arp([523, 659, 784, 1047, 1319], .08, .09); noise(.6, .2, 7000, 1200, 'highpass', .05); tone(110, .4, 'sine', .25, -40); }
  else { arp([392, 523, 659, 784, 1047, 1319, 1568, 2093], .07, .1); noise(1.1, .3, 3000, 150, 'lowpass'); tone(70, .9, 'sine', .45, -30); tone(98, .8, 'sawtooth', .1, 60, .1); [0, .3, .6].forEach(d => noise(.4, .22, 8000, 1500, 'highpass', d + .1)); }
}

// ---------- confettis (canvas demi-résolution = gros pixels, comme le reste du jeu) ----------
const CONF = {
  C:  { waves:[[0, 22]],                                  cols:['#4b69ff', '#9fb4ff', '#ffffff'],                         v:[90, 230],  sz:[2, 3], fl:0 },
  PC: { waves:[[0, 55]],                                  cols:['#8847ff', '#c9a8ff', '#ffffff'],                         v:[120, 320], sz:[2, 4], fl:.25 },
  R:  { waves:[[0, 90], [.3, 80]],                        cols:['#d32ce6', '#ff9af0', '#ffe27a', '#ffffff'],              v:[150, 400], sz:[2, 4], fl:.5 },
  UR: { waves:[[0, 150], [.25, 150], [.55, 150], [.9, 170]], rain:2.6, cols:['#eb4b4b', '#ff7b7b', '#b01e1e', '#ffd0d0', '#ffb43c'], v:[200, 700], sz:[2, 5], fl:.95 }
};
function shopConfetti(r){
  const m = document.getElementById('menu'), cf = CONF[r]; if(!m || !cf) return;
  const cv = document.createElement('canvas'); cv.className = 'cfx'; cv.width = Math.ceil(m.clientWidth/2); cv.height = Math.ceil(m.clientHeight/2); m.appendChild(cv);
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, P = [], rnd = (a, b) => a + Math.random()*(b - a), pick = a => a[Math.floor(Math.random()*a.length)];
  const waves = cf.waves.map(w => ({ t:w[0], n:w[1], done:false }));
  const piece = (px, py, vx, vy) => P.push({ x:px, y:py, vx, vy, w:Math.round(rnd(cf.sz[0], cf.sz[1])), h:Math.round(rnd(cf.sz[0], cf.sz[1])), c:pick(cf.cols), ph:rnd(0, 6.28), vph:rnd(6, 14) });
  let t0 = performance.now(), prev = t0, rainAcc = 0;
  const frame = now => {
    if(!cv.isConnected) return;
    const dt = Math.min(.05, (now - prev)/1000), t = (now - t0)/1000; prev = now;
    waves.forEach(w => { if(!w.done && t >= w.t){ w.done = true; for(let i = 0; i < w.n; i++){ const a = rnd(0, 6.283), v = rnd(cf.v[0], cf.v[1])/2; piece(W/2, H*.5, Math.cos(a)*v*1.3, Math.sin(a)*v - v*.35); } } });
    if(cf.rain && t < cf.rain){ rainAcc += dt*70; while(rainAcc >= 1){ rainAcc--; piece(rnd(0, W), -4, rnd(-12, 12), rnd(20, 70)); } }
    x.clearRect(0, 0, W, H);
    if(cf.fl && t < .45){ x.fillStyle = r === 'UR' ? `rgba(255,60,60,${cf.fl*(1 - t/.45)})` : `rgba(255,255,255,${cf.fl*(1 - t/.45)*.5})`; x.fillRect(0, 0, W, H); }
    for(let i = P.length - 1; i >= 0; i--){
      const q = P[i]; q.vy += 260*dt; q.vx *= 1 - .9*dt; q.vy *= 1 - .25*dt; q.x += q.vx*dt; q.y += q.vy*dt; q.ph += q.vph*dt;
      if(q.y > H + 6){ P.splice(i, 1); continue; }
      x.fillStyle = q.c; x.fillRect(Math.round(q.x), Math.round(q.y), Math.max(1, Math.round(q.w*Math.abs(Math.cos(q.ph)))), q.h);   // « bascule » du confetti
    }
    if(P.length || t < (cf.rain || 0) || waves.some(w => !w.done)) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}

// ============================================================
//  ÉCRAN MAGASIN
// ============================================================
function showShop(){
  shopBuild();
  menu(`<h1>Magasin</h1><div class='mlist shoplist'>${SHOP.map(o => {
      const c = CRATE[o.crate], free = !c.price;
      return `<button class='mbtn offer' data-o='${o.id}'><img class='cr' src='${crateImg()}'><b>${esc(o.label)}</b><small>${esc(o.desc || '')}</small><span class='tag'>${free ? 'Gratuit' : c.price}</span></button>`;
    }).join('')}</div>
    <div class='row'><button class='btn2' id='inv'>Inventaire</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-o]', el => showCrate(SHOP.find(o => o.id === el.dataset.o).crate));
  document.getElementById('inv').onclick = () => showInventory(null, showShop);
  document.getElementById('back').onclick = showMain;
}

// ---------- aperçu d'une caisse : contenu + probabilités ----------
function showCrate(id){
  shopBuild();
  const c = CRATE[id], free = !c.price, items = c.items.slice().sort(byRarity);
  menu(`<h1>${esc(c.name)}</h1>
    <div class='crv'><div class='crl'><img class='cr big' src='${crateImg()}'><div class='crates'>${rateChips()}</div></div>
    <div class='crr'><small>Objets possibles dans cette caisse</small><div class='scroll igrid'>${items.map(it => itemCard(it, { s:.4 })).join('')}</div></div></div>
    <div class='row'><button class='btn' id='op' ${free ? '' : 'disabled'}>${free ? 'Ouvrir — Gratuit' : 'Bientôt'}</button><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('op').onclick = () => openCrate(id);
  document.getElementById('back').onclick = showShop;
}

// ============================================================
//  OUVERTURE DE LA CAISSE (animation façon CS2)
//  Une bande défile vers la gauche, ralentit, et s'arrête sous la ligne jaune : l'objet sous la ligne est gagné.
//  Le tirage est fait AVANT l'animation et l'objet est ajouté tout de suite à l'inventaire (quitter ne fait rien perdre).
// ============================================================
const SHOP_CW = 72, SHOP_DUR = 6500, SUSPENSE = { C:500, PC:900, R:1300, UR:2000 };
function openCrate(id){
  shopBuild();
  const c = CRATE[id]; if(!c || c.price) return;
  const win = rollItem(c), isNew = Save.itemCount(win.id) === 0, n = Save.addItem(win.id); Save.countOpen();
  const N = 54, wi = 42 + Math.floor(Math.random()*6);                       // position de l'objet gagnant dans la bande
  const strip = Array.from({ length:N }, (_, i) => i === wi ? win : rollItem(c));

  menu(`<h1>Ouverture de la caisse</h1><small class='sub'>${esc(c.name)} · caisse gratuite</small>
    <div class='sview' id='sv' style='${rarCss(win.r)}'><div class='strip' id='st'>${strip.map((it, i) => itemCard(it, { s:.5, cls:'sc' + (i === wi ? ' win' : '') })).join('')}</div><div class='sline'></div></div>
    <div class='row' id='act'><button class='btn2' id='skip'>Passer</button></div>`);

  const sv = document.getElementById('sv'), st = document.getElementById('st'), vw = sv.offsetWidth || 480;
  const target = wi*SHOP_CW + SHOP_CW*(.12 + Math.random()*.76) - vw/2;      // la ligne tombe n'importe où dans la carte gagnante
  let t0 = performance.now(), lastIdx = -1, done = false, skip = false;
  document.getElementById('skip').onclick = () => { skip = true; };

  const finish = () => {
    done = true; st.style.transform = `translate3d(${-target}px,0,0)`; sv.classList.add('done', 'z-' + win.r);
    document.getElementById('act').innerHTML = '';
    shopSuspense(win.r);
    setTimeout(() => { if(sv.isConnected) showReveal(win, isNew, n, id); }, SUSPENSE[win.r] || 600);
  };
  const frame = now => {
    if(!st.isConnected || done) return;                                       // écran quitté : on arrête
    const t = skip ? 1 : Math.min(1, (now - t0)/SHOP_DUR);
    const e = 1 - Math.pow(1 - t, 4), x = target*e;                          // départ rapide, longue décélération
    st.style.transform = `translate3d(${-x}px,0,0)`;
    const idx = Math.floor((x + vw/2)/SHOP_CW); if(idx !== lastIdx){ lastIdx = idx; if(!skip) shopTick(); }
    if(t >= 1) finish(); else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- révélation : grande carte + confettis selon la rareté ----------
function showReveal(win, isNew, n, id){
  const R = RAR[win.r], shake = win.r === 'UR' ? 'shk2' : win.r === 'R' ? 'shk1' : '';
  menu(`<div class='rv r-${win.r} ${shake}' style='${rarCss(win.r)}'>
    <div class='rvc'><div class='rays'></div>${win.kind === 'card' ? cardHtml(win, 1.3) : `<img class='ric' src='${itemIcon(win)}'>`}</div>
    <div class='rvt'><small>${esc(CRATE[win.crate].name)}</small><b class='rn' style='color:${R.col}'>${esc(win.name)}</b>
      <div><span class='tag' style='background:${R.col};color:#fff'>${R.label}</span></div>
      <p>${isNew ? 'Nouveau !' : 'Déjà possédé · ×' + n}</p>
      <div class='row'><button class='btn' id='again'>Rouvrir</button><button class='btn2' id='inv'>Inventaire</button><button class='btn2' id='cl'>Fermer</button></div></div></div>`);
  shopReveal(win.r); shopConfetti(win.r);
  document.getElementById('again').onclick = () => openCrate(id);
  document.getElementById('inv').onclick = () => showInventory(win.id, () => showCrate(id));
  document.getElementById('cl').onclick = () => showCrate(id);
}

// ============================================================
//  INVENTAIRE : tous les objets du jeu ; ceux qu'on n'a pas encore sont cachés (« ? »).
// ============================================================
function showInventory(sel, back){
  shopBuild();
  back = typeof back === 'function' ? back : showMain;
  const all = Object.values(ITEM).sort(byRarity), inv = Save.inv(), have = all.filter(it => inv[it.id] > 0).length;
  const it = sel && ITEM[sel] && inv[sel] > 0 ? ITEM[sel] : null;
  const detail = it
    ? `<div class='dh big'>${it.kind === 'card' ? cardHtml(it, .85) : `<img src='${itemIcon(it)}'>`}<div><b style='color:${RAR[it.r].col}'>${esc(it.name)}</b><br><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span></div></div>
       <p>Possédé : ×${inv[it.id]}</p><p>Caisse : ${esc(CRATE[it.crate].name)}</p>${it.desc ? `<p>${esc(it.desc)}</p>` : ''}`
    : `<p>Touche un objet pour voir ses détails.</p><p>Caisses ouvertes : ${Save.opened()}</p>`;
  menu(`<h1>Inventaire <small>${have}/${all.length}</small></h1>
    <div class='edit invw'><div class='scroll left igrid'>${all.map(x => inv[x.id] > 0 ? itemCard(x, { n:inv[x.id], cls:x.id === sel ? 'foc' : '' }) : itemCard(x, { locked:true })).join('')}</div>
    <div class='scroll right'>${detail}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('.itc:not(.locked)', el => showInventory(el.dataset.id, back));
  document.getElementById('back').onclick = back;
}

SCREENS.shop = showShop;
SCREENS.inventory = () => showInventory();
