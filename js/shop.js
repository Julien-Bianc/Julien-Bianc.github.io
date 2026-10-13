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

// ---------- cartes ----------
const rarCss = r => `--rc:${RAR[r].col}`;
function itemCard(it, o){
  o = o || {};
  if(o.locked) return `<button class='itc locked' data-id='${it.id}' style='${rarCss(it.r)}'><span class='q'>?</span><i class='bar'></i></button>`;
  return `<button class='itc ${o.cls || ''}' data-id='${it.id}' style='${rarCss(it.r)}'><img src='${itemIcon(it)}'>${o.n > 1 ? `<span class='cnt'>×${o.n}</span>` : ''}<i class='bar'></i></button>`;
}
const pctTxt = p => (p*100).toFixed(p*100 % 1 === 0 ? 0 : 1).replace('.', ',') + ' %';
const rateChips = () => RARITY.map(r => `<span class='tag' style='background:${r.col};color:#fff'>${r.label} ${pctTxt(rarityPct(r.id))}</span>`).join(' ');

// ---------- sons ----------
const shopTick = () => { if(!AU.ctx) return; tone(1400, .025, 'square', .05); tone(520, .04, 'triangle', .07, -120); };
function shopReveal(r){
  if(!AU.ctx) return;
  const seq = { C:[660, 880], PC:[660, 880, 1100], R:[523, 659, 784, 1047], UR:[392, 523, 659, 784, 1047, 1319] }[r] || [660];
  seq.forEach((f, i) => { tone(f, .22, 'square', .08, 0, i*.09); tone(f/2, .22, 'triangle', .1, 0, i*.09); });
  if(r === 'R' || r === 'UR'){ noise(.5, .16, 7000, 1500, 'highpass', .05); }
  if(r === 'UR'){ tone(98, .8, 'sawtooth', .12, 40); noise(.8, .2, 2500, 200, 'lowpass'); }
}

// ============================================================
//  ÉCRAN MAGASIN
// ============================================================
function showShop(){
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
  const c = CRATE[id], free = !c.price, items = c.items.slice().sort(byRarity);
  menu(`<h1>${esc(c.name)}</h1>
    <div class='crv'><div class='crl'><img class='cr big' src='${crateImg()}'><div class='crates'>${rateChips()}</div></div>
    <div class='crr'><small>Objets possibles dans cette caisse</small><div class='scroll igrid'>${items.map(it => itemCard(it, { cls:'sm' })).join('')}</div></div></div>
    <div class='row'><button class='btn' id='op' ${free ? '' : 'disabled'}>${free ? 'Ouvrir — Gratuit' : 'Bientôt'}</button><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('op').onclick = () => openCrate(id);
  document.getElementById('back').onclick = showShop;
}

// ============================================================
//  OUVERTURE DE LA CAISSE (animation façon CS2)
//  Une bande défile vers la gauche, ralentit, et s'arrête sous la ligne jaune : l'objet sous la ligne est gagné.
//  Le tirage est fait AVANT l'animation et l'objet est ajouté tout de suite à l'inventaire (quitter ne fait rien perdre).
// ============================================================
const SHOP_CW = 72, SHOP_DUR = 6500;
function openCrate(id){
  const c = CRATE[id]; if(!c || c.price) return;
  const win = rollItem(c), isNew = Save.itemCount(win.id) === 0, n = Save.addItem(win.id); Save.countOpen();
  const N = 54, wi = 42 + Math.floor(Math.random()*6);                       // position de l'objet gagnant dans la bande
  const strip = Array.from({ length:N }, (_, i) => i === wi ? win : rollItem(c));

  menu(`<h1>Ouverture de la caisse</h1><small class='sub'>${esc(c.name)} · caisse gratuite</small>
    <div class='sview' id='sv'><div class='strip' id='st'>${strip.map((it, i) => itemCard(it, { cls:'sc' + (i === wi ? ' win' : '') })).join('')}</div><div class='sline'></div></div>
    <div class='res' id='res'></div>
    <div class='row' id='act'><button class='btn2' id='skip'>Passer</button></div>`);

  const sv = document.getElementById('sv'), st = document.getElementById('st'), vw = sv.offsetWidth || 480;
  const target = wi*SHOP_CW + SHOP_CW*(.12 + Math.random()*.76) - vw/2;      // la ligne tombe n'importe où dans la carte gagnante
  let t0 = performance.now(), lastIdx = -1, done = false, skip = false;
  document.getElementById('skip').onclick = () => { skip = true; };

  const finish = () => {
    done = true; st.style.transform = `translate3d(${-target}px,0,0)`; sv.classList.add('done');
    const R = RAR[win.r];
    document.getElementById('res').innerHTML = `<div class='rr' style='${rarCss(win.r)}'><img src='${itemIcon(win)}'><div><b style='color:${R.col}'>${esc(win.name)}</b><br><span class='tag' style='background:${R.col};color:#fff'>${R.label}</span> <small>${isNew ? 'Nouveau !' : 'Déjà possédé · ×' + n}</small></div></div>`;
    document.getElementById('res').classList.add('on');
    for(let i = 0; i < (win.r === 'UR' ? 40 : win.r === 'R' ? 28 : 16); i++){   // éclats autour de la ligne
      const p = document.createElement('b'), a = Math.random()*6.283, d = 40 + Math.random()*90;
      p.className = 'pp'; p.style.cssText = `--dx:${Math.cos(a)*d}px;--dy:${Math.sin(a)*d*.7}px;background:${i % 3 ? R.col : '#fff'}`; sv.appendChild(p);
    }
    if(win.r === 'UR' || win.r === 'R'){ sv.classList.add('flash'); }
    shopReveal(win.r);
    document.getElementById('act').innerHTML = `<button class='btn' id='again'>Rouvrir</button><button class='btn2' id='inv'>Inventaire</button><button class='btn2' id='cl'>Fermer</button>`;
    document.getElementById('again').onclick = () => openCrate(id);
    document.getElementById('inv').onclick = () => showInventory(win.id, () => showCrate(id));
    document.getElementById('cl').onclick = () => showCrate(id);
  };
  const frame = now => {
    if(!st.isConnected || done) return;                                       // écran quitté : on arrête
    let t = skip ? 1 : Math.min(1, (now - t0)/SHOP_DUR);
    const e = 1 - Math.pow(1 - t, 4), x = target*e;                          // départ rapide, longue décélération
    st.style.transform = `translate3d(${-x}px,0,0)`;
    const idx = Math.floor((x + vw/2)/SHOP_CW); if(idx !== lastIdx){ lastIdx = idx; if(!skip) shopTick(); }
    if(t >= 1) finish(); else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ============================================================
//  INVENTAIRE : tous les objets du jeu ; ceux qu'on n'a pas encore sont cachés (« ? »).
// ============================================================
function showInventory(sel, back){
  back = typeof back === 'function' ? back : showMain;
  const all = Object.values(ITEM).sort(byRarity), inv = Save.inv(), have = all.filter(it => inv[it.id] > 0).length;
  const it = sel && ITEM[sel] && inv[sel] > 0 ? ITEM[sel] : null;
  const detail = it
    ? `<div class='dh big'><img src='${itemIcon(it)}'><div><b style='color:${RAR[it.r].col}'>${esc(it.name)}</b><br><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span></div></div>
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
