// ============================================================
//  arenes-v6.js — refonte graphique des arènes (ajoute ?arenes=old à l'URL pour revoir les anciennes)
//    • Sols plus détaillés (dalles biseautées, pavés, marbre, basalte…), décors propres à chaque arène
//    • Éléments ANIMÉS : eau / lave qui coulent, cristaux qui pulsent, ombres de nuages, papillons, bannières,
//      braseros, guirlandes lumineuses, aurore sur la glace, palmiers dont l'ombre bouge…
//    • Public refait : petits spectateurs pixel art (cheveux, visage, tenue) qui bougent, lèvent les bras, flashs photo
//    • Lumières du décor branchées sur le système de lumière (light.js) : torches, lave, cristaux éclairent la scène
//  Chargé juste avant main.js. Ne touche ni aux collisions ni aux obstacles : seul l'aspect change.
// ============================================================
(function(){
if(/arenes=old/.test(location.search)) return;

// ---------- outils ----------
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const a = c.getContext('2d'); a.imageSmoothingEnabled = false; return c; };
const RGB = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const CX = PW/2 | 0, CY = (FY0 + FY1)/2 | 0;
function pix(w, h, fn, x0, y0, x1, y1){                       // canvas rempli pixel par pixel : fn(x,y) → [r,g,b,a?] ou null
  const c = mk(w, h), a = c.getContext('2d'), im = a.createImageData(w, h), d = im.data;
  for(let y = y0 || 0; y < (y1 || h); y++) for(let x = x0 || 0; x < (x1 || w); x++){ const v = fn(x, y); if(!v) continue; const o = (y*w + x)*4; d[o] = v[0]; d[o + 1] = v[1]; d[o + 2] = v[2]; d[o + 3] = v[3] === undefined ? 255 : v[3]; }
  a.putImageData(im, 0, 0); return c;
}
function vor(x, y, s, seed){                                  // cellules de Voronoï : pierres, pavés, plaques
  const gx = Math.floor(x/s), gy = Math.floor(y/s); let d1 = 1e9, d2 = 1e9, id = 0, ix = 0, iy = 0;
  for(let j = -1; j <= 1; j++) for(let i = -1; i <= 1; i++){
    const cx = gx + i, cy = gy + j, X = (cx + .12 + hash(cx, cy, seed)*.76)*s, Y = (cy + .12 + hash(cx, cy, seed + 1)*.76)*s, d = Math.hypot(x - X, y - Y);
    if(d < d1){ d2 = d1; d1 = d; id = hash(cx, cy, seed + 2); ix = X; iy = Y; } else if(d < d2) d2 = d;
  }
  return { e:d2 - d1, id, dx:x - ix, dy:y - iy, d:d1 };
}
const inField = (x, y) => x >= FX0 && x < FX1 && y >= FY0 && y < FY1;
// dessin dans le monde, en pixels de décor (1 px décor = 2 px monde)
const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(Math.round(x)*2, Math.round(y)*2, w*2, h*2); };
function DV(c){                                               // dessine un calque plein décor, recadré sur la caméra
  const sx = Math.max(0, Math.floor(CAM.x/2) - 40), sy = Math.max(0, Math.floor(CAM.y/2) - 40), sw = Math.min(c.width - sx, VW/2 + 80), sh = Math.min(c.height - sy, VH/2 + 80);
  if(sw > 0 && sh > 0) ctx.drawImage(c, sx, sy, sw, sh, sx*2, sy*2, sw*2, sh*2);
}
const D6 = k => V6[k];
const T = () => G ? Math.abs(G.time) : 0;
const vis = (x, y, m) => x*2 > CAM.x - (m || 40) && x*2 < CAM.x + VW + (m || 40) && y*2 > CAM.y - (m || 40) && y*2 < CAM.y + VH + (m || 40);

// ---------- PUBLIC v6 : de vrais petits spectateurs ----------
const SKIN = ['#f6d6b4', '#ecbc94', '#d09466', '#9a643e', '#6e4228', '#fbe4cc'];
const HAIR = ['#2a1a10', '#5a3420', '#c8a040', '#e86a2c', '#1c1c2c', '#9a9ab0', '#d8508a', '#3a5ad0', '#f4e070', '#58a848'];
const PSPR = {};
function person(sk, hr, sh, hs, pose){
  const k = [sk, hr, sh, hs, pose].join(); if(PSPR[k]) return PSPR[k];
  const c = mk(11, 15), a = c.getContext('2d'), ox = 2, oy = 2, dk = shade(sh, -.28), lt = shade(sh, .22);
  rc(a, ox + 1, oy + 5, 5, 6, sh); rc(a, ox + 1, oy + 5, 5, 1, lt); rc(a, ox + 1, oy + 9, 5, 2, dk); px(a, ox + 3, oy + 6, dk);
  rc(a, ox + 1, oy + 1, 5, 4, sk); px(a, ox + 2, oy + 3, '#1a1220'); px(a, ox + 4, oy + 3, '#1a1220'); px(a, ox + 3, oy + 4, shade(sk, -.15));
  if(hs === 0){ rc(a, ox + 1, oy, 5, 2, hr); px(a, ox + 1, oy + 2, hr); px(a, ox + 5, oy + 2, hr); }
  else if(hs === 1){ rc(a, ox + 1, oy, 5, 2, hr); rc(a, ox, oy + 1, 1, 6, hr); rc(a, ox + 6, oy + 1, 1, 6, hr); }
  else if(hs === 2){ rc(a, ox, oy, 7, 2, hr); rc(a, ox + 5, oy + 2, 2, 1, shade(hr, -.3)); px(a, ox + 3, oy - 1, '#ffffff'); }
  else { rc(a, ox + 2, oy, 3, 1, hr); px(a, ox + 1, oy + 1, hr); px(a, ox + 5, oy + 1, hr); }
  const arm = (x, up) => { if(up){ rc(a, x, oy, 1, 7, sh); px(a, x, oy - 1, sk); } else { rc(a, x, oy + 6, 1, 4, dk); px(a, x, oy + 10, sk); } };
  arm(ox, pose === 1 || pose === 2); arm(ox + 6, pose === 1);
  outlinePx(c, '#1a1220'); return PSPR[k] = c;
}
function crowdV6(th, R){
  const C = STH[th].crowd, L = [], gy = (PH/2 | 0) - 22, add = (x, y, side) => L.push({ x:Math.round(x), y, sk:SKIN[(R()*SKIN.length) | 0], hr:HAIR[(R()*HAIR.length) | 0],
    sh:C[(R()*C.length) | 0], hs:th === 3 ? (R() < .6 ? 2 : (R()*4) | 0) : (R()*4) | 0, o:R()*20, w:R() < .18, side });
  [[0, 0], [4, 4], [9, 2]].forEach(([y, o]) => { for(let x = 14 + o; x < PW - 18; x += 7 + ((R()*2) | 0)) if(Math.abs(x + 3 - CX) > 22) add(x + (R() - .5)*2, y); });
  for(let x = 16; x < PW - 20; x += 8 + ((R()*2) | 0)) add(x, PH - 10);
  for(let y = 28; y < PH - 14; y += 9) if(y < gy - 12 || y > gy + 46){ add(1, y); add(PW - 9, y); }
  return L.sort((p, q) => p.y - q.y);
}
function drawCrowdV6(L){
  const t = T(), cheer = G && G.e && G.e.hp <= 0 && G.wait > 0, fr = Math.floor(t*8);
  for(let i = 0; i < L.length; i++){
    const q = L[i]; if(!vis(q.x, q.y, 30)) continue;
    let pose = 0, j = Math.sin(t*(1.3 + q.o%1) + q.o*5) > .93 ? 1 : 0;
    if(cheer){ pose = 1; j = Math.round(Math.abs(Math.sin(t*10 + q.o))*2); }
    else if(q.w){ pose = Math.sin(t*5 + q.o) > 0 ? 2 : 0; }
    ctx.drawImage(person(q.sk, q.hr, q.sh, q.hs, pose), (q.x - 2)*2, (q.y - 2 - j)*2, 22, 30);
    if(hash(i, fr, 9) > .9975){ P(q.x + 2, q.y + 5, 3, 1, '#ffffff'); P(q.x + 3, q.y + 4, 1, 3, '#ffffff'); P(q.x + 3, q.y + 5, 1, 1, '#ffffcc'); }   // flash photo
  }
}
function pennants(cols, y0, sp){                                // fanions qui flottent au vent
  const t = T(); P(0, y0, PW, 1, '#2a2030');
  for(let x = 3, k = 0; x < PW; x += sp, k++){ if(!vis(x, y0)) continue; const c = cols[k%cols.length], f = Math.round(Math.sin(t*4 + k*.7)*1.2);
    P(x, y0 + 1, 5, 1, c); P(x + 1 + (f > 0 ? 1 : 0), y0 + 2, 3, 1, c); P(x + 2 + f, y0 + 3, 1, 1, c); P(x, y0 + 1, 5, 1, c); P(x, y0 + 1, 2, 1, shade(c, .3)); }
}

// ============================================================
//  0 — PRAIRIE VIVANTE : herbe tondue en damier, étangs animés, roseaux, papillons, ombres de nuages
// ============================================================
const PONDS = [[66, 66, 38, 22], [PW - 66, PH - 62, 38, 22]];
function paintPrairie(a, R, D){
  paintField(a, ['#2c6430', '#387a38', '#468e40', '#55a449', '#66b855', '#7ccc64'], (x, y) => {
    const ck = (((x/40) | 0) + ((y/40) | 0)) & 1, t = vn(x, y, 36, 11)*.75 + vn(x, y, 7, 12)*.25 + (bay(x, y) - .5)*.14, h = hash(x, y, 5);
    let i = ck ? 2 : 3; if(t > .64) i++; else if(t < .36) i--; if(h < .035) i--; else if(h > .975) i++; return cl(i, 0, 5); });
  [[FX0 + 30, CY, 26, 42], [FX1 - 30, CY, 26, 42], [CX, CY, 20, 14]].forEach((q, k) => dirtPx(a, Math.round(q[0]), Math.round(q[1]), q[2], q[3], 21 + k, '#a07e4c', '#c4a46a', '#7e6038'));
  scatter(a, R, 160, (x, y) => { px(a, x, y, '#8a7a6a'); px(a, x + 1, y, '#5e5248'); });                       // cailloux
  scatter(a, R, 420, (x, y, r) => { const hgt = 2 + ((r()*2) | 0); for(let b = -1; b <= 1; b++){ const hh = b ? hgt - 1 : hgt; rc(a, x + b, y - hh, 1, hh, '#2a5e2c'); px(a, x + b, y - hh, b ? '#58a64a' : '#9ae07a'); } });
  scatter(a, R, 46, (x, y, r) => { const c = ['#ffffff', '#f8c0dc', '#ffe24a', '#b8a0ff'][(r()*4) | 0]; for(let k = 0; k < 5; k++){ const fx = x + ((r()*10) | 0) - 5, fy = y + ((r()*8) | 0) - 4; px(a, fx, fy - 1, c); px(a, fx - 1, fy, c); px(a, fx + 1, fy, c); px(a, fx, fy + 1, c); px(a, fx, fy, '#f0a030'); px(a, fx, fy + 2, '#2a5e2c'); } });
  scatter(a, R, 30, (x, y) => { [[0, 0], [2, 0], [1, 1], [1, -1]].forEach(d => px(a, x + d[0], y + d[1], '#3c8a3a')); px(a, x + 1, y, '#7cd062'); });   // trèfles
  pitchLines(a, 'rgba(246,252,238,.85)', .08, { inset:8, r:54, r2:6, box:[58, 48] });
  // étangs : berge de terre + pierres, eau sombre (la surface animée est dans D.water)
  PONDS.forEach(([cx, cy, rx, ry], n) => {
    dirtPx(a, cx, cy, rx + 4, ry + 4, 90 + n, '#6a5434', '#8a7048', '#4e3c24');
    for(let k = 0; k < 26; k++){ const an = k/26*6.283 + hash(k, n, 3)*.2, r = 2 + ((hash(k, n, 4)*3) | 0); blob3(a, cx + Math.cos(an)*(rx + 2), cy + Math.sin(an)*(ry + 2), r + 1, r, OPAL.stone); }
  });
  // surface d'eau animée : 8 images en boucle (vaguelettes qui glissent, reflets, nénuphars)
  D.water = PONDS.map(([cx, cy, rx, ry], n) => pondFrames(cx, cy, rx, ry, n, ['#215e96', '#2f7cb8', '#4a9ccc', '#8ad0ee', '#e6faff'], true));
  D.cloud = pix(150, 90, (x, y) => { const q = ((x - 75)/72)**2 + ((y - 45)/40)**2 + (vn(x, y, 22, 5) - .5)*.9; return q < .82 || (q < 1 && bay(x, y) < (1 - q)*5) ? [8, 28, 12, 46] : null; });
  D.reeds = []; PONDS.forEach(([cx, cy, rx, ry], n) => { for(let k = 0; k < 9; k++){ const an = 3.3 + k*.35 + (n ? 3.14 : 0); D.reeds.push([Math.round(cx + Math.cos(an)*(rx - 1)), Math.round(cy + Math.sin(an)*(ry - 1)), 6 + ((hash(k, n, 8)*5) | 0), hash(k, n, 9)*6]); } });
}
function pondFrames(cx, cy, rx, ry, n, pal, lily){                // surface d'eau animée : 8 images en boucle
  {
    const w = rx*2 + 2, h = ry*2 + 2, [deep, mid, shal, lt, sp] = pal.map(RGB), pad = RGB('#3e9a3a'), padL = RGB('#6cc85a'), padD = RGB('#24662a'), fl = RGB('#f8a8d0');
    const pads = lily ? [[-.45, -.2, 4], [.3, .35, 5], [.55, -.35, 3], [-.1, .5, 3]] : [];
    const fr = [];
    for(let k = 0; k < 8; k++) fr.push({ x:cx - rx - 1, y:cy - ry - 1, c:pix(w, h, (x, y) => {
      const X = x - rx - 1, Y = y - ry - 1, q = X*X/(rx*rx) + Y*Y/(ry*ry); if(q > 1) return null;
      for(const [pxx, pyy, pr] of pads){ const dx = X - pxx*rx, dy = (Y - pyy*ry)*1.5; const dd = Math.hypot(dx, dy); if(dd < pr){ if(dx > 0 && Math.abs(dy) < 1) return deep; if(pr > 4 && dd < 1.5) return fl; return dx + dy < -pr*.4 ? padL : dx + dy > pr*.5 ? padD : pad; } }
      const ph = k/8*6.283, v = Math.sin(X*.42 + Y*.9 - ph) + Math.sin(X*.13 - Y*.55 + ph) + (vn(x, y, 6, 7 + n) - .5)*1.4;
      if(hash(x, y, k*13 + n) > .994) return sp;
      if(v > 1.35) return lt; if(q > .72) return v > .5 ? lt : shal; if(q > .4) return v > .2 ? shal : mid; return v > .6 ? mid : deep; }) });
    return fr;
  }
}
function drawPonds(W, t){ const f = Math.floor(t*5)%8; W.forEach(fr => { const q = fr[f]; if(vis(q.x + q.c.width/2, q.y + q.c.height/2, 140)) ctx.drawImage(q.c, q.x*2, q.y*2, q.c.width*2, q.c.height*2); }); }
function groundPrairie(D){
  const t = T(); drawPonds(D.water, t);
  for(const [x, y, h, o] of D.reeds){ if(!vis(x, y)) continue; const s = Math.round(Math.sin(t*1.6 + o)*1.2);
    for(let i = 0; i < h; i++) P(x + (i > h*.6 ? s : 0), y - i, 1, 1, i < 2 ? '#2a5e2c' : '#4a8a3a');
    P(x + s, y - h - 2, 1, 3, '#7a4a24'); P(x + s, y - h - 3, 1, 1, '#4a8a3a'); }
}
function topPrairie(D){
  const t = T();
  // papillons
  for(let i = 0; i < 6; i++){
    const x = CX + Math.sin(t*.23 + i*1.7)*230 + Math.sin(t*1.1 + i)*16, y = CY + Math.sin(t*.31 + i*2.3)*120 + Math.cos(t*.9 + i*3)*10;
    if(!vis(x, y)) continue; const op = Math.sin(t*14 + i*2) > 0, c = ['#ffffff', '#ffe24a', '#f8a8d0', '#a8d8ff'][i%4];
    P(x + 1, y + 9, 2, 1, 'rgba(0,0,0,.22)');
    if(op){ P(x - 2, y - 1, 2, 2, c); P(x + 2, y - 1, 2, 2, c); P(x - 1, y + 1, 1, 1, c); P(x + 2, y + 1, 1, 1, c); } else { P(x - 1, y - 2, 1, 2, c); P(x + 2, y - 2, 1, 2, c); }
    P(x, y - 1, 2, 3, '#2a1a20');
  }
  // ombres de nuages qui glissent sur le terrain (et sur les Pokémon)
  for(let i = 0; i < 3; i++){ const x = ((t*7 + i*260) % (PW + 300)) - 150, y = 40 + i*110 + Math.sin(i*3)*20; ctx.drawImage(D.cloud, Math.round(x)*2, Math.round(y)*2, 300, 180); }
}

// ============================================================
//  1 — GROTTE CRISTALLINE : dalles naturelles, canal d'eau lumineuse qui coule autour, cristaux qui pulsent, gouttes
// ============================================================
const GEMS = [[30, 44, 'cry'], [52, 36, 'cryP'], [PW - 34, 46, 'cryP'], [PW - 54, 38, 'cry'], [32, PH - 24, 'cry'], [PW - 30, PH - 24, 'cryP'], [PW*.27 | 0, FY0 + 12, 'cry'], [PW*.73 | 0, FY1 - 10, 'cryP']];
function inCanal(x, y){ const i = Math.min(x - FX0, FX1 - 1 - x, y - FY0, FY1 - 1 - y); return i >= 2 && i < 7; }
function paintGrotte(a, R, D){
  paintField(a, ['#251a3a', '#30224a', '#3c2c5c', '#48366e', '#574282', '#140c22'], (x, y) => {
    const v = vor(x, y, 22, 31), n = (vn(x, y, 9, 33) - .5)*.8;
    if(v.e < 1.4) return 5;
    let i = v.id > .8 ? 3 : v.id < .25 ? 1 : 2; if(v.e < 3) i += v.dx + v.dy > 0 ? -1 : 1; i += n > .25 ? 1 : n < -.25 ? -1 : 0;
    if(hash(x, y, 34) < .02) i--; return cl(i, 0, 4); });
  cracks(a, R, 14, 40, ['#140c22', '#22163a']);
  scatter(a, R, 50, (x, y) => { px(a, x, y, '#8af0ff'); px(a, x + 1, y, '#38c8ea'); px(a, x, y + 1, '#1c7cc2'); });
  // canal : tranchée sombre + rebords de pierre (l'eau qui coule est dans D.canal)
  for(let y = FY0; y < FY1; y++) for(let x = FX0; x < FX1; x++){ const i = Math.min(x - FX0, FX1 - 1 - x, y - FY0, FY1 - 1 - y); if(i === 1 || i === 7) px(a, x, y, i === 7 ? '#6a58a0' : '#0c0816'); else if(i === 8) px(a, x, y, '#140c22'); }
  // cercle de runes au centre (gravé ; la lueur qui pulse est dans D.rune)
  [60, 46, 18].forEach(r => { circ(a, CX, CY, r, '#140c22'); circ(a, CX, CY, r + 1, '#5a4686', 0, undefined, .3); });
  for(let k = 0; k < 24; k++){ const an = k/24*6.283; line(a, Math.round(CX + Math.cos(an)*48), Math.round(CY + Math.sin(an)*48), Math.round(CX + Math.cos(an)*(k%3 ? 52 : 58)), Math.round(CY + Math.sin(an)*(k%3 ? 52 : 58)), '#140c22'); }
  GEMS.forEach(([x, y, p], k) => { shadowPx(a, x + 2, y + 1, 9, 3, 'rgba(0,0,0,.35)'); prismPx(a, x - 5, y, 3, 9 + k%3*2, OPAL[p]); prismPx(a, x + 5, y + 1, 3, 8, OPAL[p]); prismPx(a, x, y + 2, 4, 15 + k%2*4, OPAL[p]); });
  // bassins d'eau lumineuse (surface animée dans D.water) + lichen phosphorescent
  D.pools = [[150, 96, 30, 16], [PW - 150, PH - 92, 30, 16]];
  D.pools.forEach(([cx, cy, rx, ry], n) => { for(let k = 0; k < 22; k++){ const an = k/22*6.283, r = 2 + ((hash(k, n, 4)*3) | 0); blob3(a, cx + Math.cos(an)*(rx + 2), cy + Math.sin(an)*(ry + 2), r + 1, r, OPAL.cave); } });
  D.water = D.pools.map(([cx, cy, rx, ry], n) => pondFrames(cx, cy, rx, ry, n + 5, ['#0a2a5a', '#124a8c', '#1e7ac0', '#5ad0f4', '#d8fcff'], false));
  for(let k = 0; k < 40; k++){ const x = FX0 + 12 + R()*(FX1 - FX0 - 24), y = FY0 + 12 + R()*(FY1 - FY0 - 24); for(let j = 0; j < 7; j++){ const xx = Math.round(x + (R() - .5)*12), yy = Math.round(y + (R() - .5)*8); px(a, xx, yy, R() < .3 ? '#7af0e0' : '#2e8a8a'); } }
  scatter(a, R, 26, (x, y) => { if(inCanal(x, y)) return; rc(a, x, y, 3, 1, '#38c8ea'); px(a, x + 1, y - 1, '#9af4ff'); rc(a, x + 1, y + 1, 1, 2, '#c0b0e8'); });   // champignons lumineux
  // eau du canal : 8 images, le courant fait le tour de l'arène
  const c0 = RGB('#0c2c5a'), c1 = RGB('#1462a8'), c2 = RGB('#30a4e6'), c3 = RGB('#a4f0ff'), per = (x, y) => (y < FY0 + 7 ? x : y > FY1 - 8 ? -x : x < FX0 + 7 ? -y : y);
  D.canal = []; for(let k = 0; k < 8; k++) D.canal.push(pix(PW, PH, (x, y) => {
    if(!inCanal(x, y)) return null; const s = per(x, y), v = Math.sin(s*.16 - k/8*6.283) + (vn(x, y, 5, 40 + (k & 1)) - .5)*1.2;
    return hash(x, y, k*7) > .985 ? c3 : v > 1.1 ? c3 : v > .3 ? c2 : v > -.6 ? c1 : c0; }));
  D.rune = pix(PW, PH, (x, y) => { const d = Math.hypot(x - CX, y - CY); return (Math.abs(d - 60) < .8 || Math.abs(d - 46) < .8 || Math.abs(d - 18) < .8) ? [180, 124, 255, 255] : null; }, CX - 64, CY - 64, CX + 64, CY + 64);
}
function groundGrotte(D){
  const t = T(); DV(D.canal[Math.floor(t*6)%8]); drawPonds(D.water, t);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .35 + .3*Math.sin(t*1.8); DV(D.rune); ctx.restore();
  for(let k = 0; k < 10; k++){ const an = t*.35 + k*.628, x = CX + Math.cos(an)*53, y = CY + Math.sin(an)*53; P(x, y, 1, 1, '#e8c0ff'); P(x - 1, y, 1, 1, 'rgba(200,150,255,.5)'); }
  // gouttes qui tombent du plafond : chute + ronds dans l'eau
  for(let k = 0; k < 4; k++){
    const per = 1.7 + k*.4, n = Math.floor((t + k*.9)/per), u = ((t + k*.9)%per)/per, x = FX0 + 20 + hash(n, k, 1)*(FX1 - FX0 - 40), y = FY0 + 20 + hash(n, k, 2)*(FY1 - FY0 - 40);
    if(!vis(x, y)) continue;
    if(u < .25){ P(x, y - 40*(1 - u/.25), 1, 3, '#9ae8ff'); }
    else { const r = (u - .25)*16, al = 1 - (u - .25)/.75; ctx.globalAlpha = al; for(let s = 0; s < 6.283; s += .3) P(x + Math.cos(s)*r, y + Math.sin(s)*r*.5, 1, 1, '#9ae8ff'); ctx.globalAlpha = 1; }
  }
}
function topGrotte(D){
  const t = T();
  GEMS.forEach(([x, y], k) => { const b = Math.sin(t*2.2 + k*1.3); if(b > .6){ const yy = y - 15 - k%2*4; P(x, yy - 2, 1, 5, '#ffffff'); P(x - 2, yy, 5, 1, '#ffffff'); } });
  for(let i = 0; i < 26; i++){ const x = (hash(i, 1, 3)*PW + Math.sin(t*.5 + i)*12), y = PH - ((t*8 + hash(i, 2, 3)*PH) % PH); if(!vis(x, y)) continue; ctx.globalAlpha = .5 + .5*Math.sin(t*3 + i); P(x, y, 1, 1, i%3 ? '#9af4ff' : '#e8a0ff'); }
  ctx.globalAlpha = 1;
}
function lightsGrotte(L){
  const t = T();
  GEMS.forEach(([x, y, p], k) => L(x*2, y*2 - 16, 70 + 14*Math.sin(t*2.2 + k*1.3), p === 'cry' ? '#5ad8ff' : '#c07aff', .55 + .25*Math.sin(t*2.2 + k*1.3)));
  for(let x = FX0 + 4; x < FX1; x += 24){ L(x*2, (FY0 + 4)*2, 34, '#3ab8ff', .35 + .15*Math.sin(t*3 + x)); L(x*2, (FY1 - 5)*2, 34, '#3ab8ff', .35 + .15*Math.sin(t*3 + x*1.3)); }
  for(let y = FY0 + 10; y < FY1; y += 24){ L((FX0 + 4)*2, y*2, 34, '#3ab8ff', .35); L((FX1 - 5)*2, y*2, 34, '#3ab8ff', .35); }
  L(CX*2, CY*2, 130, '#a070ff', .18 + .12*Math.sin(t*1.8)); D6(1).pools.forEach(([x, y], k) => L(x*2, y*2, 110, '#3ac8ff', .5 + .12*Math.sin(t*1.5 + k)));
}

// ============================================================
//  2 — BAZAR DU DÉSERT : place pavée, mosaïque, sable qui vole, ombres de palmiers, guirlandes lumineuses
// ============================================================
const PALMS = [[FX0 + 34, FY0 + 26], [FX1 - 40, FY0 + 22], [FX0 + 40, FY1 - 24], [FX1 - 34, FY1 - 28]];
const GARL = [FY0 + 74, FY1 - 74];
function paintDesert(a, R, D){
  const mos = ['#2aa8a0', '#e8d6a8', '#c8502c', '#1e6a8a', '#f0c040'];
  paintField(a, ['#a8784a', '#bc8c5a', '#cc9e6a', '#dcb27c', '#e8c690', '#8a6038', '#f4dcae', '#d8c08a', '#c8b078', '#2aa8a0', '#c8502c', '#1e6a8a', '#f0c040', '#e8d6a8', '#6a4428'], (x, y) => {
    const d = Math.hypot(x - CX, (y - CY)*1.0), sand = vn(x, y, 14, 44)*.45 + Math.max(0, 1 - Math.min(x - FX0, FX1 - x, y - FY0, FY1 - y)/26)*.75 + (hash(x, y, 48) - .5)*.12;
    if(d < 58){                                              // mosaïque ronde
      if(d > 55) return 14; if(d > 53) return 12;
      const an = Math.atan2(y - CY, x - CX), st = Math.abs(Math.cos(an*4))*20 + 18;
      if(Math.abs(d - st) < 1.2) return 14;
      const ring = d < st ? (d < 10 ? 12 : ((((an + 3.15)/0.3927) | 0) + (d < 26 ? 0 : 1)) & 1 ? 9 : 13) : ((((an + 3.15)/0.2618) | 0) & 1 ? 11 : 10);
      return ring;
    }
    if(sand > .62) return hash(x, y, 46) < .08 ? 7 : sand > .7 ? 6 : 4;   // sable qui recouvre les pavés
    const v = vor(x, y, 9, 45); if(v.e < 1.1) return 5;
    if(v.id > .93) return v.e < 2.4 && v.dx + v.dy > 0 ? 8 : 7; let i = v.id > .7 ? 3 : v.id < .3 ? 1 : 2; if(v.e < 2.4) i += v.dx + v.dy > 0 ? -1 : 1; else if(v.d < 1.5) i++; if(hash(x, y, 47) < .03) i--; return cl(i, 0, 4); });
  // lanternes sur pied le long des tribunes
  for(let x = FX0 + 50; x < FX1 - 40; x += 90){ [FY0 + 4, FY1 - 3].forEach(y => { shadowPx(a, x + 2, y, 4, 1, 'rgba(0,0,0,.3)'); rc(a, x, y - 14, 1, 14, '#3a2414'); rc(a, x - 2, y - 18, 5, 5, '#6a4428'); rc(a, x - 1, y - 17, 3, 3, '#ffd870'); rc(a, x - 2, y - 19, 5, 1, '#3a2414'); }); }
  // ombre de palmier (le feuillage se balance → dessinée dans le sol animé)
  D.palm = pix(80, 60, (x, y) => { const X = x - 40, Y = (y - 30)*1.4, an = Math.atan2(Y, X), r = Math.hypot(X, Y), f = Math.abs(Math.sin(an*3.5)); return (r < 38*(.35 + .65*f) && r > 3 && f > .4) || r < 5 ? [40, 16, 0, 60] : null; });
  D.crown = [-.07, 0, .07].map((da, n) => { const c = mk(58, 48), q = c.getContext("2d"), cx = 29, cy = 16;
    for(let f = 0; f < 8; f++){ const an = f*.785 + .2 + da*(f%2 ? 1 : -1), dx = Math.cos(an), dy = Math.sin(an)*.62, L = 24 - (f%2)*3, dr = 7 + n;
      const tip = [cx + dx*L, cy + dy*L + dr], mid = [cx + dx*L*.5, cy + dy*L*.5 + dr*.3], nx = -dy*4, ny = dx*2.6;
      polyPx(q, [[cx, cy], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], f%2 ? '#3e8e3a' : '#4ea444');
      polyPx(q, [[cx, cy], [mid[0] + nx*.5, mid[1] + ny*.5 - 1], tip, mid], f%2 ? '#58ac48' : '#6cc058');
      line(q, cx, cy, Math.round(tip[0]), Math.round(tip[1]), '#2a6a2c'); }
    blob3(q, cx - 2, cy + 1, 2, 2, { l:'#c8945a', m:'#8a5a2c', d:'#5a3a18' }); blob3(q, cx + 2, cy + 2, 2, 2, { l:'#c8945a', m:'#8a5a2c', d:'#5a3a18' });
    outlinePx(c, '#1a3a1a'); return c; });
  PALMS.forEach(([x, y]) => { rc(a, x - 1, y - 2, 3, 6, '#6a4a2c'); shadowPx(a, x + 8, y + 3, 14, 2, 'rgba(40,16,0,.25)'); });
}
function groundDesert(D){
  const t = T();
  PALMS.forEach(([x, y], k) => { const dx = Math.round(Math.sin(t*.9 + k)*2), dy = Math.round(Math.cos(t*.7 + k)*1); ctx.drawImage(D.palm, (x - 40 + 22 + dx)*2, (y - 30 + 8 + dy)*2, 160, 120); });
  for(let i = 0; i < 14; i++){ const u = ((t*.4 + hash(i, 1, 5)) % 1), x = FX0 + ((hash(i, 2, 5)*PW + t*60) % PW), y = FY0 + 10 + hash(i, 3, 5)*(FY1 - FY0 - 20); if(!vis(x, y)) continue; ctx.globalAlpha = Math.sin(u*3.14)*.6; P(x, y, 6 + (i%3)*3, 1, '#f8e4b8'); P(x + 3, y + 1, 4, 1, '#f0d4a0'); }
  ctx.globalAlpha = 1;
}
function garland(y0, t, sag){                                   // guirlande : fil + ampoules qui scintillent
  const cols = ['#ff5a4a', '#ffd23c', '#5ad0ff', '#7cf06a', '#ff8ae0'];
  for(let x = FX0; x < FX1; x++){ const u = (x - FX0)/(FX1 - FX0), y = y0 + Math.sin(u*Math.PI*3)*sag; if(x%2 || !vis(x, y)) continue; P(x, y, 1, 1, 'rgba(40,24,16,.85)');
    if(x % 10 === 0){ const k = x/10 | 0, on = Math.sin(t*3 + k*1.7) > -.4; P(x - 1, y + 1, 3, 3, '#2a1810'); P(x, y + 1, 1, 1, '#2a1810'); P(x - 1, y + 2, 3, 2, on ? cols[k%5] : shade(cols[k%5], -.5)); P(x, y + 2, 1, 2, on ? cols[k%5] : shade(cols[k%5], -.5)); if(on) P(x - 1, y + 2, 1, 1, '#ffffff'); } }
}
function topDesert(D){
  const t = T(); GARL.forEach((y, k) => garland(y, t + k, 9));
  PALMS.forEach(([x, y], k) => {                                 // palmiers : tronc courbé + couronne qui se balance
    const dir = k & 1 ? -1 : 1, top = y - 22;
    for(let i = 0; i < 22; i++){ const xx = x + Math.round(Math.sin(i/22*1.6)*4*dir); P(xx - 1, y - i, 4, 1, i%4 === 0 ? '#5a3a20' : '#8a6038'); P(xx - 1, y - i, 1, 1, '#b08050'); P(xx + 2, y - i, 1, 1, '#4a2e18'); }
    const v = Math.min(2, Math.floor((Math.sin(t*1.1 + k*1.7) + 1)*1.5)), c = D.crown[v];
    ctx.drawImage(c, (x + 4*dir - 29)*2, (top - 16)*2, c.width*2, c.height*2);
  });
}
function lightsDesert(L){
  const t = T(); GARL.forEach((y0, g) => { for(let x = FX0; x < FX1; x += 20){ const u = (x - FX0)/(FX1 - FX0), y = y0 + Math.sin(u*Math.PI*3)*9; L(x*2, y*2 + 2, 22, ['#ff7a5a', '#ffd23c', '#5ad0ff', '#7cf06a', '#ff8ae0'][(x/10 | 0)%5], .45 + .15*Math.sin(t*3 + x)); } });
  for(let x = FX0 + 50; x < FX1 - 40; x += 90) [FY0 + 4, FY1 - 3].forEach(y => L(x*2, (y - 16)*2, 70, '#ffc060', .5 + .08*Math.sin(t*9 + x)));
}

// ============================================================
//  3 — BANQUISE AURORE : glace polie avec reflets, congères, traces de patins, reflet d'aurore boréale animé
// ============================================================
function paintBanquise(a, R, D){
  paintField(a, ['#2e5a8c', '#3a6c9e', '#4880b2', '#5894c4', '#72acd6', '#d4eefc', '#f4fcff', '#22487a'], (x, y) => {
    const t = vn(x, y, 50, 51)*.7 + vn(x, y, 12, 52)*.3 + (bay(x, y) - .5)*.12, gl = ((x*.55 - y + 900) % 120), e = Math.min(x - FX0, FX1 - 1 - x, y - FY0, FY1 - 1 - y);
    if(e < 10 && vn(x, y, 8, 53)*12 + bay(x, y)*3 > e + 2) return e < 3 || hash(x, y, 1) > .8 ? 6 : 5;       // congères
    let i = 2; if(t > .62) i++; else if(t < .36) i--; if(gl < 7) i += 2; else if(gl < 12) i++;
    if(hash(x, y, 9) > .996) return 6; return cl(i, 0, 5); });
  for(let k = 0; k < 26; k++){ const cx = FX0 + 40 + R()*(FX1 - FX0 - 80), cy = FY0 + 30 + R()*(FY1 - FY0 - 60), r = 20 + R()*60, a0 = R()*6.28; circ(a, cx, cy, r, 'rgba(255,255,255,.55)', a0, a0 + .8 + R(), .3); circ(a, cx + 1, cy + 1, r, 'rgba(120,170,210,.35)', a0, a0 + .6, .5); }
  cracks(a, R, 8, 46, ['#ffffff', '#f4fcff', '#7eb4d6']);
  scatter(a, R, 30, (x, y) => { ringPx(a, x, y, 2, 'rgba(255,255,255,.7)'); px(a, x - 1, y - 1, '#ffffff'); });   // bulles prises dans la glace
  // lignes de la patinoire (rouge au centre, bleues de chaque côté) + cercle d'engagement
  for(let y = FY0 + 8; y < FY1 - 8; y++){ if(hash(1, y, 3) > .1){ rc(a, CX - 1, y, 3, 1, 'rgba(210,50,60,.7)'); } [CX - 120, CX + 120].forEach(x => { if(hash(x, y, 4) > .1) rc(a, x - 1, y, 3, 1, 'rgba(40,90,190,.6)'); }); }
  circ(a, CX, CY, 46, 'rgba(40,90,190,.8)', 0, undefined, .06); circ(a, CX, CY, 47, 'rgba(40,90,190,.5)', 0, undefined, .2); blob3(a, CX, CY, 4, 4, { l:'#ff8a8a', m:'#d23c3c', d:'#9a2a2a' });
  // reflet d'aurore (calque tramé qui défile en lumière additive)
  D.aur = pix(PW, PH, (x, y) => { const w = Math.sin(x*.012 + Math.sin(x*.004)*3)*40 + 120, d = Math.abs(y - w), d2 = Math.abs(y - w - 110); const v = Math.max(0, 1 - d/38), v2 = Math.max(0, 1 - d2/30);
    if(bay(x, y) > v*.9 && bay(x, y) > v2*.9) return null; return v > v2 ? [60, 255, 170, 70] : [190, 110, 255, 60]; });
}
function groundBanquise(D){
  const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = .55 + .3*Math.sin(t*.7); const o = (t*9) % PW; ctx.translate(-Math.round(o)*2, 0); DV(D.aur); ctx.translate(PW*2, 0); DV(D.aur); ctx.restore();
  for(let i = 0; i < 40; i++){ const x = hash(i, 4, 1)*PW, y = FY0 + hash(i, 5, 1)*(FY1 - FY0), b = Math.sin(t*2.5 + i*2.1); if(b < .7 || !vis(x, y)) continue; P(x, y - 1, 1, 3, '#ffffff'); P(x - 1, y, 3, 1, '#ffffff'); }
  for(let i = 0; i < 10; i++){ const u = (t*.25 + hash(i, 1, 7)) % 1, x = (hash(i, 2, 7)*PW + t*70) % PW, y = FY0 + 10 + hash(i, 3, 7)*(FY1 - FY0 - 20); if(!vis(x, y)) continue; ctx.globalAlpha = Math.sin(u*3.14)*.7; P(x, y, 10, 1, '#ffffff'); P(x + 4, y - 1, 5, 1, '#e4f6ff'); }
  ctx.globalAlpha = 1;
}
function topBanquise(){
  const t = T();
  for(let i = 0; i < 70; i++){ const z = 1 + (i%3), x = ((hash(i, 1, 2)*PW + t*(10 + z*8) + Math.sin(t + i)*10) % PW), y = ((hash(i, 2, 2)*PH + t*(14 + z*10)) % PH); if(!vis(x, y)) continue; ctx.globalAlpha = .55 + z*.15; P(x, y, z > 2 ? 2 : 1, z > 2 ? 2 : 1, '#ffffff'); }
  ctx.globalAlpha = 1;
}

// ============================================================
//  4 — CRATÈRE DE LAVE : plateau de basalte entouré d'une rivière de lave qui coule, fissures qui pulsent, bulles
// ============================================================
const LROCK = [[40, 10, 16, 9], [130, 6, 10, 6], [250, 12, 14, 8], [400, 8, 12, 7], [520, 12, 18, 9], [610, 6, 10, 6], [90, PH - 6, 14, 6], [330, PH - 5, 18, 6], [560, PH - 6, 12, 6], [6, 90, 6, 14], [7, 280, 6, 16], [PW - 6, 100, 6, 16], [PW - 7, 260, 6, 14]];
const inLRock = (x, y) => LROCK.some(([cx, cy, rx, ry]) => ((x - cx)/rx)**2 + ((y - cy)/ry)**2 + (hash(x, y, 7) - .5)*.25 < 1);
function paintLave(a, R, D){
  const seams = [];
  paintField(a, ['#1c1420', '#261c2c', '#30243a', '#3c2e48', '#4a3a58', '#0c080e', '#ff6a1c', '#ffc23c', '#6a2a1a', '#5a4a6a', '#2a0e08'], (x, y) => {
    if(!inField(x, y)) return inLRock(x, y) ? (hash(x, y, 3) > .7 ? 9 : 4) : 10;
    const e = Math.min(x - FX0, FX1 - 1 - x, y - FY0, FY1 - 1 - y);
    if(e < 1) return 5; if(e < 3) return 9;
    const v = vor(x, y, 20, 61);
    const hz = vn(x, y, 70, 66) + vn(x, y, 23, 67)*.4; if(v.e < 1.5){ const hot = hz > .82; return hot ? (v.e < .6 ? 7 : 6) : 5; }
    let i = v.id > .8 ? 3 : v.id < .25 ? 1 : 2; if(v.e < 3.2) i += v.dx + v.dy > 0 ? -1 : 1; if(hash(x, y, 63) < .03) i--;
    if(v.e < 4 && hz > .82 && bay(x, y) < .5) return 8; if(hz > .92 && v.e < 7 && bay(x, y) < .25) return 8;
    return cl(i, 0, 4); });
  scatter(a, R, 60, (x, y) => { px(a, x, y, '#5a4a66'); px(a, x + 1, y, '#160e1a'); });
  // sceau d'obsidienne au centre
  [52, 50, 24].forEach((r, k) => circ(a, CX, CY, r, k === 1 ? '#0c080e' : '#7a3a2a', 0, undefined, .15));
  for(let k = 0; k < 12; k++){ const an = k*.5236; line(a, Math.round(CX + Math.cos(an)*26), Math.round(CY + Math.sin(an)*26), Math.round(CX + Math.cos(an)*48), Math.round(CY + Math.sin(an)*48), '#ff6a1c', .3); }
  // masque des fissures brûlantes (pulse en lumière additive)
  const im = a.getImageData(0, 0, PW, PH).data;
  D.seam = pix(PW, PH, (x, y) => { const o = (y*PW + x)*4; return im[o] > 200 && im[o + 1] > 80 && inField(x, y) ? [255, 150, 40, 255] : null; });
  // rivière de lave : 8 images en boucle (croûte sombre qui dérive sur la lave en fusion)
  const L0 = RGB('#3a1210'), L1 = RGB('#7a1e0c'), L2 = RGB('#d8400c'), L3 = RGB('#ff7a1c'), L4 = RGB('#ffc040'), L5 = RGB('#fff0a0');
  D.lava = []; for(let k = 0; k < 8; k++){ const ph = k/8*6.283; D.lava.push(pix(PW, PH, (x, y) => {
    if(inField(x, y) || inLRock(x, y)) return null;
    const near = LROCK.some(([cx, cy, rx, ry]) => ((x - cx)/(rx + 2))**2 + ((y - cy)/(ry + 2))**2 < 1) || Math.min(Math.abs(x - FX0), Math.abs(x - FX1), Math.abs(y - FY0), Math.abs(y - FY1)) < 2;
    const u = vn(x, y, 11, 64)*.55 + .45*(.5 + .5*Math.sin(x*.1 + y*.06 - ph)) + (vn(x + k*2, y, 4, 65) - .5)*.25;
    if(near) return u > .5 ? L5 : L4;
    return u > .8 ? L5 : u > .66 ? L4 : u > .52 ? L3 : u > .4 ? L2 : u > .3 ? L1 : L0; })); }
}
function groundLave(D){
  const t = T(); DV(D.lava[Math.floor(t*5)%8]);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .25 + .25*(.5 + .5*Math.sin(t*2.1)); DV(D.seam); ctx.restore();
  for(let k = 0; k < 16; k++){                                  // bulles de lave qui éclatent
    const per = 1.6 + hash(k, 1, 1), n = Math.floor((t + k)/per), u = ((t + k)%per)/per, side = k%4;
    let x = hash(n, k, 2)*PW, y = hash(n, k, 3)*PH; if(side === 0) y = 3 + hash(n, k, 4)*20; else if(side === 1) y = FY1 + 3 + hash(n, k, 4)*10; else if(side === 2) x = 2 + hash(n, k, 4)*9; else x = FX1 + 2 + hash(n, k, 4)*9;
    if(inLRock(x, y) || !vis(x, y)) continue;
    if(u < .7){ const r = 1 + u*3; P(x - r, y - r, r*2 + 1, r*2 + 1, '#ffc040'); P(x - r + 1, y - r, 1, 1, '#fff0a0'); }
    else { const s = (u - .7)*14; [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(d => P(x + d[0]*s, y + d[1]*s - s*.5, 1, 1, '#ffe07a')); }
  }
}
function topLave(){
  const t = T();
  for(let i = 0; i < 50; i++){ const u = (t*.18 + hash(i, 1, 3)) % 1, x = hash(i, 2, 3)*PW + Math.sin(t*1.5 + i)*6, y = hash(i, 3, 3)*PH - u*80; if(!vis(x, y)) continue; ctx.globalAlpha = 1 - u; P(x, y, 1, 1, u < .3 ? '#ffe07a' : '#ff7a2c'); }
  for(let i = 0; i < 18; i++){ const x = (hash(i, 5, 3)*PW + t*12) % PW, y = (hash(i, 6, 3)*PH + t*9) % PH; if(!vis(x, y)) continue; ctx.globalAlpha = .5; P(x, y, 1, 1, '#9a9098'); }
  ctx.globalAlpha = 1;
}
function lightsLave(L){
  const t = T();
  for(let x = 0; x < PW; x += 22){ L(x*2, 14*2, 90, '#ff6a1c', .42 + .1*Math.sin(t*2 + x)); L(x*2, (FY1 + 8)*2, 70, '#ff6a1c', .38 + .1*Math.sin(t*2.3 + x)); }
  for(let y = 0; y < PH; y += 22){ L(7*2, y*2, 70, '#ff6a1c', .38 + .1*Math.sin(t*2 + y)); L((FX1 + 7)*2, y*2, 70, '#ff6a1c', .38); }
  L(CX*2, CY*2, 120, '#ff7a2c', .14 + .1*Math.sin(t*2.1));
}

// ============================================================
//  5 — SALLE DU CHAMPION : marbre poli, médaillon doré qui pulse, tapis rouge, balustrades, braseros, bannières, rayons de lune
// ============================================================
const BRAZ = [40, 120, 200, 440, 520, 600];
const WIN = [80, 160, 240, 400, 480, 560];
function paintChampion(a, R, D){
  const cy = CY;
  paintField(a, ['#cdbd92', '#d9caa2', '#e5d8b4', '#f0e6c8', '#b8a678', '#9a8658', '#f8f2de', '#b8922e', '#ecc85a', '#a8182a', '#c8283a', '#7a1020', '#e0b040', '#8a6a24', '#5a4a3a'], (x, y) => {
    if(!inField(x, y)) return 14;
    const d = Math.hypot(x - CX, y - cy);
    // tapis rouges depuis les portes jusqu'au médaillon
    if(Math.abs(y - cy) <= 10 && (x < CX - 72 || x > CX + 72)){ const v = Math.abs(y - cy); if(v >= 9) return 13; if(v >= 7) return 12; if(v === 6) return 11;
      const dx = Math.abs(((x + 6) % 14) - 7) + Math.abs(y - cy); if(dx === 3) return 12; return (x + y) % 7 === 0 ? 11 : v < 2 ? 10 : 9; }
    // médaillon
    if(d < 74){
      if(d > 72) return 13; if(d > 70) return 8; if(d > 69) return 7;
      if(d > 60){ const an = Math.atan2(y - cy, x - CX), k = ((an + 3.1416)/(6.2832/36)) % 1; if(d > 63 && d < 67 && (k < .12 || (k > .45 && k < .55))) return 7; return d > 67 ? 1 : 0; }
      if(d > 58) return 8; if(d > 57) return 7;
      if(d > 40){ const an = Math.atan2(y - cy, x - CX), k = ((an + 3.1416)/(6.2832/16)) % 1; return k < .06 ? 7 : ((((an + 3.1416)/(6.2832/16)) | 0) & 1 ? 3 : 2); }
      if(d > 38) return 8; if(d > 37) return 7;
      if(Math.abs(y - cy) < 2 && d > 14) return Math.abs(y - cy) < 1 ? 8 : 7;
      if(d > 14 && d < 16) return 8; return y < cy ? 3 : 2;
    }
    // dalles de marbre 24x24 biseautées + incrustations dorées aux coins + veines
    const u = (x - FX0) % 24, v = (y - FY0) % 24, tid = hash(((x - FX0)/24) | 0, ((y - FY0)/24) | 0, 81);
    const cu = Math.min(u, 23 - u), cv = Math.min(v, 23 - v);
    if(cu + cv < 3) return cu + cv < 2 ? 8 : 7;
    if(u === 0 || v === 0) return 6; if(u === 23 || v === 23) return 5; if(u === 22 || v === 22) return 4;
    const ck = ((((x - FX0)/24) | 0) + (((y - FY0)/24) | 0)) & 1, vein = Math.abs(vn(x, y, 18, 82) - .5) < .009 && hash(x, y, 84) > .25;
    if(vein) return ck ? 0 : 1;
    let i = (ck ? 1 : 3) + (tid > .8 ? -1 : 0); if(vn(x, y, 10, 83) > .7 && bay(x, y) > .5) i++; return cl(i, 0, 3); });
  // --- murs : fond de pierre, fenêtres en arche avec ciel étoilé, piliers, balustrade ---
  const st = (x, y, w, h, c) => rc(a, x, y, w, h, c);
  st(0, 0, PW, FY0, '#3a3048'); for(let y = 0; y < FY0; y += 4) for(let x = (y/4 & 1)*6; x < PW; x += 12){ st(x, y, 11, 3, '#463a56'); st(x, y, 11, 1, '#54466a'); }
  WIN.forEach(x => { st(x - 9, 2, 18, 14, '#0a0c24'); for(let i = 0; i < 18; i++) for(let j = 0; j < 14; j++){ const ax = i - 8.5, ay = 6 - j; if(ay > 0 && ax*ax + ay*ay*2.2 > 85) px(a, x - 9 + i, 2 + j, '#463a56'); else if(hash(x + i, j, 5) > .94) px(a, x - 9 + i, 2 + j, '#c8d4ff'); else if(j > 7) px(a, x - 9 + i, 2 + j, '#141a40'); }
    st(x - 10, 16, 20, 1, '#e0b040'); st(x, 2, 1, 14, '#2a2440'); st(x - 9, 9, 18, 1, '#2a2440'); });
  BRAZ.concat([CX - 26, CX + 26]).forEach(x => { st(x - 4, 0, 9, FY0, '#d8ccac'); st(x - 4, 0, 2, FY0, '#f4ecd4'); st(x + 3, 0, 2, FY0, '#a8987a'); for(let k = -2; k <= 2; k += 2) st(x + k, 3, 1, FY0 - 6, '#b8a888'); st(x - 5, 0, 11, 3, '#e0b040'); st(x - 5, 2, 11, 1, '#9a7a28'); });
  // blason : grande Poké Ball dorée au centre du mur
  for(let y = -9; y <= 9; y++) for(let x = -9; x <= 9; x++){ const q = x*x + y*y; if(q > 90) continue; px(a, CX + x, 11 + y, q > 70 ? '#6a4a14' : Math.abs(y) < 1 ? '#6a4a14' : (x + y < -4 ? '#fff0a8' : y < 0 ? '#ecc85a' : '#c89a34')); }
  rc(a, CX - 2, 9, 5, 5, '#6a4a14'); rc(a, CX - 1, 10, 3, 3, '#fff8d0');
  // balustrade haute et basse
  const balu = (y0, h) => { st(0, y0, PW, 2, '#f0e6c8'); st(0, y0 + 2, PW, 1, '#a8987a'); for(let x = 2; x < PW; x += 5){ st(x, y0 + 3, 3, h - 5, '#e0d4b0'); st(x, y0 + 3, 1, h - 5, '#f8f0dc'); st(x + 2, y0 + 3, 1, h - 5, '#a8987a'); } st(0, y0 + h - 2, PW, 2, '#cfc19a'); st(0, y0 + h - 1, PW, 1, '#8a7a5a'); };
  balu(17, 9); balu(FY1, PH - FY1);
  // côtés : marbre + portes en arche avec cadre doré
  [0, PW - FX0].forEach(x0 => { st(x0, FY0, FX0, FY1 - FY0, '#d8ccac'); for(let y = FY0; y < FY1; y += 20){ st(x0, y, FX0, 1, '#a8987a'); st(x0, y + 1, FX0, 1, '#f4ecd4'); }
    st(x0, cy - 22, FX0, 44, '#e0b040'); st(x0 + 1, cy - 20, FX0 - 2, 40, '#1a1420'); st(x0 + 1, cy - 10, FX0 - 2, 20, '#7a1020'); st(x0 + 1, cy - 8, FX0 - 2, 16, '#a8182a'); });
  fieldShade(a);
}
function crowdChampion(D){                                     // bannières qui ondulent + étoiles qui scintillent dans les fenêtres
  const t = T();
  for(const x of WIN){ for(let k = 0; k < 6; k++){ const i = (hash(x, k, 5)*18) | 0, j = (hash(x, k, 6)*7) | 0; if(Math.sin(t*3 + k*2 + x) > .85) P(x - 9 + i, 3 + j, 1, 1, '#ffffff'); } }
  [[CX - 52, 0], [CX + 52, 1]].forEach(([x]) => { for(let c = 0; c < 12; c++){ const w = Math.round(Math.sin(t*2.4 - c*.45)*1.3), len = 17 + (c < 6 ? c : 11 - c)/2; P(x - 6 + c, 1 + w*.3, 1, len + w, c < 1 || c > 10 ? '#e0b040' : c%4 === 0 ? '#c8283a' : '#a8182a'); }
    for(let y = -3; y <= 3; y++) for(let xx = -3; xx <= 3; xx++){ const q = xx*xx + y*y; if(q > 10) continue; P(x + xx, 10 + y + Math.round(Math.sin(t*2.4 - (xx + 6)*.45)*1.3), 1, 1, q > 6 ? '#e0b040' : y === 0 ? '#e0b040' : y < 0 ? '#ffe080' : '#fff8e0'); } });
  BRAZ.forEach((x, k) => { if(!vis(x, 20)) return; P(x - 4, 17, 9, 3, '#6a4a14'); P(x - 3, 17, 7, 1, '#e0b040'); const f = Math.floor(t*10 + k*3)%3;
    P(x - 3, 13 - f, 7, 4 + f, '#ff7a2c'); P(x - 2, 11 - f, 5, 3, '#ffb040'); P(x - 1, 12 - f, 3, 4, '#ffe060'); P(x, 9 - f + (f & 1), 1, 2, '#fff0a0'); });
}
function groundChampion(D){
  const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .22 + .18*Math.sin(t*1.6); DV(D.med); ctx.restore();
  for(let k = 0; k < 12; k++){ const an = t*.25 + k*.5236, x = CX + Math.cos(an)*80, y = CY + Math.sin(an)*80, al = .55 + .35*Math.sin(t*2 + k); ctx.globalAlpha = al;
    const tx = Math.round(-Math.sin(an)*2), ty = Math.round(Math.cos(an)*2); P(x - tx, y - ty, 1, 1, '#ffe080'); P(x, y, 1, 1, '#fff4c0'); P(x + tx, y + ty, 1, 1, '#ffe080'); }
  ctx.globalAlpha = 1;
}
function topChampion(){
  const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  WIN.forEach((x, k) => { const al = .09 + .04*Math.sin(t*.8 + k); ctx.fillStyle = `rgba(190,205,255,${al})`;
    for(let y = 17; y < FY1; y += 1){ const s = (y - 17)*.42; ctx.fillRect(Math.round(x - 7 + s)*2, y*2, (14 + s*.12)*2 | 0, 2); } });
  ctx.restore();
  for(let i = 0; i < 30; i++){ const k = i%WIN.length, u = (t*.05 + hash(i, 1, 8)) % 1, y = 20 + u*(FY1 - 30), x = WIN[k] - 6 + (y - 17)*.42 + hash(i, 2, 8)*14 + Math.sin(t + i)*3; if(!vis(x, y)) continue; ctx.globalAlpha = Math.sin(u*3.14)*.8; P(x, y, 1, 1, '#f4f0ff'); }
  ctx.globalAlpha = 1;
}
function lightsChampion(L){
  const t = T(); BRAZ.forEach((x, k) => L(x*2, 13*2, 120, '#ffa040', .6 + .12*Math.sin(t*11 + k)));
  L(CX*2, CY*2, 190, '#ffd060', .16 + .1*Math.sin(t*1.6)); L(CX*2, 22, 60, '#ffe080', .5);
}

// ============================================================
//  BRANCHEMENT : remplace le dessin des 6 arènes, ajoute les calques animés et les lumières
// ============================================================
const V6 = {
  0:{ name:'Stade de la Prairie', paint:paintPrairie, ground:groundPrairie, top:topPrairie, crowd:0, flags:['#e8503c', '#f0c030', '#3b8fd9', '#58b848', '#f4f0e8'], amb:.02 },
  1:{ name:'Cavernes cristallines', paint:paintGrotte, ground:groundGrotte, top:topGrotte, lights:lightsGrotte, crowd:1, amb:.3 },
  2:{ name:'Bazar du Désert', paint:paintDesert, ground:groundDesert, top:topDesert, lights:lightsDesert, crowd:2, flags:['#c8402c', '#f4ecd8', '#2aa8a0', '#f0c040'], amb:.08 },
  3:{ name:'Patinoire de l\'Aurore', paint:paintBanquise, ground:groundBanquise, top:topBanquise, crowd:3, amb:.14, refl:.34 },
  4:{ name:'Cratère de lave', paint:paintLave, ground:groundLave, top:topLave, lights:lightsLave, noStands:1, amb:.4 },
  5:{ name:'Salle du Champion', paint:paintChampion, ground:groundChampion, top:topChampion, lights:lightsChampion, crowdFn:crowdChampion, noStands:1, opal:{ pillar:'marb', rock:'marb', statue:'gold', barrel:'gold' }, amb:.2, refl:.12 }
};
OPAL.marb = { o:'#5a4a30', l:'#fbf4e0', m:'#e0d4b0', d:'#b8a67e', g:'#e0b040' }; OPAL.gold = { o:'#4a3208', l:'#fff0a8', m:'#ecc85a', d:'#b8922e', g:'#ffffff' };
for(const k in V6){
  const A = ARENAS[k], D = V6[k]; if(!A) continue;
  A.name = D.name; A.v6 = D;
  A.paint = function(a, R){ D.paint(a, R, D); if(D.crowd !== undefined) D.people = crowdV6(D.crowd, rng(999 + +k)); };
  if(D.noStands) A.th = undefined;
  if(D.opal && A.obst) A.obst = A.obst.map(o => [o[0], D.opal[o[0]] || o[1], o[2], o[3]]);
  AMBIENT[k] = D.amb; if(D.refl) REFLECT[k] = D.refl;
}
// le médaillon de la salle du champion (calque de lueur) : construit à part car il dépend du sol peint
V6[5].med = pix(PW, PH, (x, y) => { const d = Math.hypot(x - CX, y - CY); return (d > 69 && d < 72) || (d > 57 && d < 59) || (d > 37 && d < 39) ? [255, 200, 90, 255] : null; }, CX - 76, CY - 76, CX + 76, CY + 76);

window.V6K = { mk, RGB, cl, pix, vor, inField, P, DV, T, vis, person, SKIN, HAIR, CX, CY, pondFrames, drawPonds, crowdV6, drawCrowdV6, pennants, garland };       // outils partagés (obstacles, nouvelles arènes)
const cur = () => { const A = ARENAS[curArena]; return A && A.v6; };
const _dc = drawCrowd;
drawCrowd = function(){
  const D = cur(); if(!D){ _dc(); return; }
  ctx.imageSmoothingEnabled = false;
  if(D.people){ drawCrowdV6(D.people); }
  if(D.flags) pennants(D.flags, 0, 7);
  if(D.crowdFn) D.crowdFn(D);
  const f = Math.floor(T()*12); for(const q of ARENA_FIRE){ const h = 3 + ((f + q.x)%3), X = q.x*2, Y = q.y*2; ctx.fillStyle = q.c1; ctx.fillRect(X - 3, Y - h*2, 6, h*2); ctx.fillStyle = q.c2; ctx.fillRect(X - 1, Y - h*2 + 4, 2, h*2 - 4); }
};
const _dg = drawGround;
drawGround = function(){ const D = cur(); if(D && D.ground && G){ ctx.imageSmoothingEnabled = false; D.ground(D); } _dg(); };
const _dfx = drawFx;
drawFx = function(){ const D = cur(); if(D && D.top && G){ ctx.imageSmoothingEnabled = false; D.top(D); } _dfx(); };
const _cpl = typeof collectPlusLights === 'function' ? collectPlusLights : null;
collectPlusLights = function(L){ if(_cpl) _cpl(L); const D = cur(); if(D && D.lights && G) D.lights(L);
  if(G && ARENA_FIRE.length) ARENA_FIRE.forEach(q => L(q.x*2, q.y*2 - 6, 60, q.c1, .45)); };
})();
