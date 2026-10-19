// ============================================================
//  patch-v0219.js — correctif (rapport de test v0.21.8)
//    1. Solo : niveaux 11 à 17 un peu plus faciles (plus de mention « difficile » : js/patch-v0216.js)
//    2. Carchacrok : Tunnel recharge plus lentement, moins de météores (joueur ET adversaire)
//    3. Tour de Combat sur téléphone : les boutons restent visibles (plus besoin de faire défiler)
//    4. Pension : les achats de la boutique apparaissent dans le décor + objets et menus plus beaux
// ============================================================

// ---------------------------------------------------------------- 1. Solo 11 → 17
STAGES.slice(10, 17).forEach(S => {
  const k = .88, r2 = v => +v.toFixed(2);
  S.hp = r2(S.hp*k); S.dmg = r2(S.dmg*k); S.rate = r2(S.rate/k); S.tele = r2(S.tele/Math.sqrt(k)); S.aim = r2(S.aim*.92);
});

// ---------------------------------------------------------------- 2. Carchacrok
if(POKEMON.carchacrok){
  const M = POKEMON.carchacrok.moves;
  M[1].cooldown = 5.5;                                 // Tunnel : 3,4 s → 5,5 s
  Object.assign(M[2], { count:4, cooldown:8.5 });      // Draco-Météore : 6 → 4 météores, 6,5 s → 8,5 s
}
// l'adversaire Carchacrok respecte aussi ces recharges (avant, il pouvait creuser toutes les secondes)
step = (prev => function(dt){
  prev(dt);
  const e = G && G.e; if(!e || G.over || e.t !== 'carchacrok' || !(e.tele > 0) || e._cgk === e.tm + ':' + e.pat) return;
  const m = MV.carchacrok && MV.carchacrok[e.pat]; if(!m) return;
  e._cgk = e.tm + ':' + e.pat;
  const key = m.k === 'burrow' ? 'cgB' : m.k === 'strike' ? 'cgM' : null, wait = m.k === 'burrow' ? 6 : 9;
  if(!key) return;
  if(G.time - (e[key] ?? -99) < wait){ e.pat = 0; e._cgk = e.tm + ':0'; } else e[key] = G.time;
})(step);

// ---------------------------------------------------------------- 3. Tour de Combat : boutons toujours visibles sur téléphone
document.head.insertAdjacentHTML('beforeend', `<style>
#menu.twscene .mc{justify-content:flex-start!important;overflow-y:auto;overflow-x:hidden}#menu.twscene .mc>*{flex-shrink:0}
#menu.twscene .twfoot{position:sticky;bottom:0;z-index:5;display:flex;gap:8px;justify-content:center;flex-wrap:wrap;padding:6px 8px calc(6px + env(safe-area-inset-bottom,0px));
  background:linear-gradient(180deg,rgba(10,6,20,0),rgba(10,6,20,.92) 35%);width:100%;max-width:none!important}
.twscroll{overflow:auto;min-height:0;flex:1 1 auto;width:100%;-webkit-overflow-scrolling:touch}
.twopts{display:flex;gap:8px;justify-content:center;flex-wrap:nowrap;overflow-x:auto;padding:4px 4px 8px;scroll-snap-type:x mandatory;max-width:100%}
.twopts>*{scroll-snap-align:center;flex:0 0 auto}
.twhint{font-size:10px;color:#ffd890;opacity:.85;margin:2px 0}
.twcompact .twopt{width:96px!important;min-height:0!important;padding:5px 4px!important}.twcompact .twopt small,.twcompact .twopt p{display:none!important}.twcompact .twopt b{font-size:10px!important}
.twcompact .twopt img,.twcompact .twopt .twi{width:30px!important;height:30px!important}.twcompact .twopt.twsel{border-color:#ffd23f!important;box-shadow:inset 0 0 0 2px #ffd23f,0 0 10px rgba(255,210,63,.5)}
.twinfo2{font-size:10px;margin:0 6px;flex:1 1 260px;max-width:520px;text-align:left;align-self:center}.twinfo2 b{color:#ffe27a}
@media (max-height:520px){
  #menu.twscene .hd h1{font-size:20px}
  .twopt{width:112px!important;min-height:0!important;padding:5px!important}.twopt img{width:30px!important;height:30px!important}.twopt b{font-size:11px!important}.twopt small,.twopt p{font-size:8.5px!important;line-height:1.25!important}
  .twm{min-height:0!important}.twm img{width:34px!important;height:34px!important}
}
</style>`);
// sur téléphone, chaque écran de la Tour met ses boutons dans une barre fixée en bas
function twFixLayout(){
  const m = document.getElementById('menu'); if(!m || !m.classList.contains('twscene')) return;
  const mc = m.querySelector('.mc') || m; if(mc.querySelector('.twfoot')) return;
  const rows = [...mc.querySelectorAll(':scope > .row')]; if(rows.length) rows[rows.length - 1].classList.add('twfoot');
  // accueil de la Tour : « Entrer dans la tour » / « Continuer » passent dans la barre du bas (toujours visibles)
  const foot = mc.querySelector('.twfoot'), inner = mc.querySelector('.twhome .scroll .row');
  if(foot && inner){ [...inner.children].reverse().forEach(b => foot.prepend(b)); inner.remove(); }
  // bonus : les cartes défilent à l'horizontale (une seule ligne) au lieu de s'empiler en hauteur
  const opts = mc.querySelectorAll('.twopt'); if(!opts.length) return;
  const par = opts[0].parentElement; par.classList.add('twopts');
  // petit écran : cartes compactes (image + nom). 1er toucher = sélection + description, bouton « Choisir » en bas
  if(innerHeight < 560 || innerWidth < 700){
    par.classList.add('twcompact');
    mc.insertAdjacentHTML('beforeend', `<div class='row twfoot'><p class='twinfo2'>Touche un choix pour voir sa description.</p><button class='btn' id='twpick' disabled>Choisir</button></div>`);
    const info = mc.querySelector('.twinfo2'), go = mc.querySelector('#twpick');
    let sel = null, pass = false;
    par.addEventListener('click', ev => {
      const b = ev.target.closest('.twopt'); if(!b || pass) return;
      ev.stopPropagation(); ev.preventDefault();
      if(sel === b) return pick();
      par.querySelectorAll('.twopt').forEach(x => x.classList.toggle('twsel', x === b)); sel = b;
      const nm = b.querySelector('b'), ds = b.querySelector('small, p');
      info.innerHTML = `<b>${nm ? nm.textContent : ''}</b>${ds ? ' — ' + ds.textContent : ''}`; go.disabled = false;
    }, true);
    const pick = () => { if(!sel) return; pass = true; sel.click(); pass = false; };
    go.onclick = pick;
  }
  if(par.scrollWidth > par.clientWidth + 4 && !mc.querySelector('.twhint')) par.insertAdjacentHTML('afterend', `<p class='twhint'>◀ fais glisser pour voir tous les choix ▶</p>`);
}
menu = (prev => function(h){ prev(h); try{ twFixLayout(); }catch(e){} })(menu);
// bonus de la Tour : un vrai message (avant : « · 0.9 » s'affichait après un bonus de Défense)
['heal', 'revive', 'atk', 'def', 'spd', 'hpm'].forEach(k => { const B = TW_BONUS[k]; if(!B) return; const g = B.go; B.go = R => { g(R); return B.name + ' !'; }; });
addEventListener('resize', () => { try{ twFixLayout(); }catch(e){} });

// ---------------------------------------------------------------- 4. Pension : objets de confort dessinés et installés dans le décor
//  Nouveaux dessins (40×40, contour sombre comme les sprites du jeu), utilisés partout : boutique, accueil, camp, ferme.
function penArt(id){
  const N = 40, g = Array.from({ length:N }, () => Array(N).fill(null));
  const px = (x, y, c) => { x |= 0; y |= 0; if(x >= 0 && y >= 0 && x < N && y < N) g[y][x] = c; };
  const rect = (x, y, w, h, c) => { for(let j = 0; j < h; j++) for(let i = 0; i < w; i++) px(x + i, y + j, c); };
  const ell = (cx, cy, rx, ry, c, f) => { for(let y = Math.floor(cy - ry); y <= cy + ry; y++) for(let x = Math.floor(cx - rx); x <= cx + rx; x++){ const d = ((x + .5 - cx)/rx)**2 + ((y + .5 - cy)/ry)**2; if(d <= 1 && (!f || f(x, y))) px(x, y, c); } };
  const trap = (y0, y1, xl0, xr0, xl1, xr1, c) => { for(let y = y0; y <= y1; y++){ const u = (y - y0)/Math.max(1, y1 - y0); for(let x = Math.round(xl0 + (xl1 - xl0)*u); x <= Math.round(xr0 + (xr1 - xr0)*u); x++) px(x, y, c); } };
  if(id === 'bed'){                              // panier en osier, coussin rose, petit oreiller cœur
    trap(17, 33, 3, 36, 6, 33, '#b8793a'); for(let y = 19; y < 33; y += 3) for(let x = 5; x < 35; x++) if(g[y][x]) px(x, y, '#9a5e28');
    for(let x = 6; x < 35; x += 4) for(let y = 18; y < 33; y++) if(g[y][x] && (y + x) % 2) px(x, y, '#d8954a');
    ell(20, 17, 17, 5, '#e0a050'); ell(20, 17, 15, 4, '#ff9ac8'); ell(18, 16, 11, 2.5, '#ffc8e4'); rect(10, 15, 4, 1, '#fff');
    [[26, 11], [28, 11], [25, 12], [26, 12], [27, 12], [28, 12], [29, 12], [26, 13], [27, 13], [28, 13], [27, 14]].forEach(([x, y]) => px(x, y, '#ff5a8a')); px(26, 11, '#ffb0d0');
  } else if(id === 'bowl'){                      // gamelle en porcelaine pleine de baies, Poké Ball sur le devant
    trap(19, 32, 4, 35, 9, 30, '#f4f4fc'); rect(9, 32, 22, 2, '#c8c8dc'); for(let y = 19; y < 32; y++) for(let x = 4; x < 36; x++) if(g[y][x] && x > 26) px(x, y, '#d8d8ea');
    rect(5, 21, 30, 2, '#3a8ae8'); ell(20, 18, 16, 4, '#3a8ae8'); ell(20, 18, 14.5, 3, '#8a5a28');
    [[11, 16, '#ff8a3c'], [15, 15, '#4a7ae8'], [19, 14, '#ff7ac8'], [23, 15, '#ffd23f'], [27, 16, '#ff8a3c'], [17, 17, '#e8402c'], [22, 17, '#4a7ae8']].forEach(([x, y, c]) => { ell(x, y, 2.2, 2, c); px(x - 1, y - 1, '#fff'); });
    ell(20, 27, 3.5, 3.5, '#fff'); ell(20, 27, 3.5, 3.5, '#e8402c', (x, y) => y < 27); rect(16, 27, 8, 1, '#2a1a14'); px(20, 27, '#fff');
  } else if(id === 'toys'){                      // coffre en bois ouvert, ballon et étoile qui dépassent
    rect(5, 18, 30, 16, '#b07a3a'); for(let y = 21; y < 34; y += 4) rect(5, y, 30, 1, '#8a5a28'); rect(5, 18, 3, 16, '#ffd23f'); rect(32, 18, 3, 16, '#ffd23f'); rect(5, 24, 30, 2, '#ffd23f');
    trap(8, 14, 7, 33, 5, 35, '#c88a48'); rect(5, 14, 30, 2, '#8a5a28'); rect(18, 22, 4, 4, '#6a6a7a'); px(19, 23, '#2a1a14');
    ell(14, 16, 6, 6, '#fff'); ell(14, 16, 6, 6, '#e8402c', (x, y) => y < 16); rect(8, 16, 13, 1, '#2a1a14'); ell(14, 16, 1.6, 1.6, '#fff');
    [[27, 9], [26, 10], [27, 10], [28, 10], [24, 11], [25, 11], [26, 11], [27, 11], [28, 11], [29, 11], [30, 11], [25, 12], [26, 12], [27, 12], [28, 12], [29, 12], [26, 13], [27, 13], [28, 13], [25, 14], [26, 14], [28, 14], [29, 14], [24, 15], [30, 15]].forEach(([x, y]) => px(x, y, '#ffd23f')); px(27, 11, '#fff8b0');
  } else if(id === 'soap'){                      // baquet d'eau moussante, savon rose, canard
    trap(18, 33, 5, 34, 8, 31, '#c08848'); for(let x = 7; x < 33; x += 5) for(let y = 18; y < 34; y++) if(g[y][x]) px(x, y, '#9a6a34'); rect(5, 22, 30, 2, '#7a7a8a'); rect(6, 30, 28, 2, '#7a7a8a');
    ell(20, 18, 15, 3.5, '#6ad0ff'); ell(19, 17.5, 11, 2, '#b8ecff');
    [[10, 13, 4], [17, 11, 5], [25, 13, 4], [30, 10, 3], [13, 8, 3], [22, 6, 2.5]].forEach(([x, y, r]) => { ell(x, y, r, r, '#ffffff'); px(x - r/2, y - r/2, '#d8f6ff'); });
    rect(26, 15, 8, 4, '#ff8ac8'); rect(27, 15, 6, 1, '#ffc8e4'); ell(9, 15, 3, 2.5, '#ffd23f'); ell(7, 12, 2, 2, '#ffd23f'); px(5, 12, '#ff8a3c'); px(7, 11, '#2a1a14');
  } else if(id === 'plant'){                     // jardinière en terre cuite et fleurs
    trap(23, 34, 3, 36, 6, 33, '#d86a3a'); rect(3, 23, 34, 3, '#b8502a'); rect(6, 30, 27, 1, '#b8502a'); ell(20, 23, 16, 2, '#6a4222');
    [[9, 10, '#ff7ac8'], [16, 6, '#ffd23f'], [24, 9, '#ffffff'], [31, 7, '#ff7ac8'], [20, 13, '#8ab8ff']].forEach(([x, y, c]) => {
      rect(x, y + 3, 1, 23 - y - 3, '#3a9a3a'); ell(x - 2, y + 9, 2.5, 1.2, '#4ac04a'); ell(x + 2, y + 12, 2.5, 1.2, '#4ac04a');
      [[0, -2], [2, 0], [0, 2], [-2, 0]].forEach(([dx, dy]) => ell(x + dx, y + dy, 1.8, 1.8, c)); ell(x, y, 1.2, 1.2, '#ffb020'); });
  } else if(id === 'incubator'){                 // couveuse : dôme de verre, œuf, lampe chauffante
    rect(6, 30, 28, 5, '#6a6a7a'); rect(6, 30, 28, 1, '#9a9aaa'); rect(9, 35, 3, 2, '#4a4a5a'); rect(28, 35, 3, 2, '#4a4a5a'); rect(17, 32, 6, 2, '#ff8a3c');
    ell(20, 29, 10, 3, '#ffd0e8'); ell(20, 23, 6, 7.5, '#f8f0d8'); ell(18, 21, 1.6, 1.6, '#5ac85a'); ell(23, 25, 1.4, 1.4, '#5ac85a'); px(18, 18, '#fff');
    ell(20, 22, 13, 13, 'rgba(180,230,255,.35)', (x, y) => y <= 29 && !g[y][x]); for(let a = 0; a < 6.28; a += .05){ const x = 20 + Math.cos(a)*13, y = 22 + Math.sin(a)*13; if(y <= 29) px(x, y, '#d8f2ff'); }
    rect(12, 12, 2, 6, '#ffffff'); rect(19, 6, 3, 3, '#6a6a7a'); ell(20, 9, 4, 1.4, '#ffd23f');
  } else return null;
  // contour sombre autour de tout le dessin
  const O = '#2a1a14', out = g.map(r => r.slice());
  for(let y = 0; y < N; y++) for(let x = 0; x < N; x++) if(!g[y][x] && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => g[y + dy] && g[y + dy][x + dx] && !String(g[y + dy][x + dx]).startsWith('rgba'))) out[y][x] = O;
  const c = document.createElement('canvas'); c.width = c.height = N; const x = c.getContext('2d');
  out.forEach((r, y) => r.forEach((col, i) => { if(col){ x.fillStyle = col; x.fillRect(i, y, 1, 1); } }));
  return c;
}
const PEN_ART = {};
const penArtCv = id => PEN_ART[id] || (PEN_ART[id] = penArt(id));
penIcon = (prev => function(id){ const k = 'pic2' + id; if(_cs[k]) return _cs[k]; const c = penArtCv(id); return c ? (_cs[k] = c.toDataURL()) : prev(id); })(penIcon);

// objets posés dans le camp (là où ton Pokémon vit) : ombre, petite animation, le panier est là où il dort
const PEN_SPOTS = () => ({ bed:[CV.l + 128, 126, 46], toys:[CV.r - 82, 104, 34], plant:[CV.r - 34, 100, 34], bowl:[CV.cx + 92, 128, 28], soap:[CV.r - 28, 134, 30] });
function penDrawItem(x, id, px, py, s, t){
  const c = penArtCv(id); if(!c) return;
  x.fillStyle = 'rgba(0,0,0,.22)'; x.beginPath(); x.ellipse(px, py - 1, s*.42, s*.1, 0, 0, 6.2832); x.fill();
  x.save(); x.imageSmoothingEnabled = false; x.drawImage(c, Math.round(px - s/2), Math.round(py - s*.9), s, s); x.restore();
  if(id === 'soap' && Math.sin(t*2) > .6){ const u = (t*1.5) % 1; x.fillStyle = `rgba(255,255,255,${.8*(1 - u)})`; x.beginPath(); x.arc(px - 4 + Math.sin(t*3)*3, py - s*.7 - u*16, 1.6, 0, 6.2832); x.fill(); }
  if(id === 'plant' && Math.random() < .01) { x.fillStyle = '#ffd23f'; x.fillRect(px + 6, py - s*.9, 1, 1); }
}
penDrawCamp = (prev => function(x, t, P, sleepDim){
  prev(x, t, { ...P, items:{} }, sleepDim);
  const it = P.items || {}, S = PEN_SPOTS();
  Object.keys(S).forEach(id => { if(it[id]) penDrawItem(x, id, S[id][0], S[id][1], S[id][2], t); });
})(penDrawCamp);
penBarn = (prev => function(x, t, P){
  prev(x, t, { ...P, items:{ ...(P.items || {}), incubator:0 } });
  if(P.items && P.items.incubator){
    x.save(); x.globalCompositeOperation = 'lighter'; const gg = x.createRadialGradient(CV.cx, 112, 4, CV.cx, 112, 60); gg.addColorStop(0, `rgba(255,170,80,${.22 + .06*Math.sin(t*3)})`); gg.addColorStop(1, 'rgba(255,170,80,0)'); x.fillStyle = gg; x.fillRect(CV.cx - 60, 52, 120, 120); x.restore();
    penDrawItem(x, 'incubator', CV.r - 52, 138, 40, t);
  }
})(penBarn);

// la ferme de l'accueil : les objets achetés sont installés dans l'enclos
const PNS_SPOTS = { plant:[612, 268, 40], toys:[560, 280, 38], bed:[470, 290, 50], bowl:[528, 322, 34], soap:[604, 328, 34], incubator:[392, 304, 40] };
pnsBuild = (prev => function(){
  prev();
  const it = Pen.d().items || {}, x = PNS.L.base.getContext('2d'); PNS.L.key = JSON.stringify(it);
  Object.entries(PNS_SPOTS).forEach(([id, [px, py, s]]) => { if(it[id]) penDrawItem(x, id, px, py, s, 0); });
})(pnsBuild);
drawPensionScene = (prev => function(dt){
  if(PNS.L && PNS.L.key !== JSON.stringify(Pen.d().items || {})) PNS.L = null;      // un objet vient d'être acheté : on le pose
  const M = PNS.mon, it = Pen.d().items || {};
  // de temps en temps, ton Pokémon va voir un de ses objets
  if(M && M.t <= dt && Math.random() < .5){ const own = Object.keys(PNS_SPOTS).filter(k => it[k] && k !== 'incubator'); if(own.length){ const s = PNS_SPOTS[own[Math.floor(Math.random()*own.length)]]; M.tx = s[0] - 24; M.t = 3 + Math.random()*2; } }
  return prev(dt);
})(drawPensionScene);

// boutique de la pension : objets mis en valeur
document.head.insertAdjacentHTML('beforeend', `<style>
.pshop2 .pitem{position:relative;background:linear-gradient(180deg,#4a2e1a,#2e1a10)!important;border:2px solid #8a5a2a!important;border-radius:12px!important;box-shadow:inset 0 2px 0 rgba(255,220,160,.15),0 3px 0 rgba(0,0,0,.35)}
.pshop2 .pitem img{width:52px!important;height:52px!important;image-rendering:pixelated;background:radial-gradient(circle,#fff6d8 0,#f0d8a0 55%,#c89a5a 56%,#a8783a 62%,transparent 63%);border-radius:50%;padding:5px}
.pshop2 .pitem.own{border-color:#5ad06a!important}.pshop2 .pitem.own::after{content:'INSTALLÉ';position:absolute;top:6px;right:-4px;transform:rotate(12deg);background:#3fae4a;color:#fff;font-size:8px;padding:1px 5px;border-radius:3px;letter-spacing:1px;box-shadow:0 1px 0 #1a5a20}
.pshop2 .pitem b{color:#ffe9a8}.pshop2 .pitem small{color:#e8d0b0}.pshop2 .psh{color:#ffd890;letter-spacing:2px}
.pact img{image-rendering:pixelated}
</style>`);
