// ============================================================
//  arena.js — v5 : ARÈNES de stade en pixel art, dans l'esprit de Pokémon Donjon Mystère (contours sombres, ombrage à 3 tons,
//  lumière en haut à gauche) : sol, murs, tribunes avec public animé, 6 thèmes + OBSTACLES DESTRUCTIBLES évolués.
//
//  Le décor est dessiné en DEMI-résolution (PW x PH) puis agrandi x2 : 1 pixel de décor = 2 pixels écran,
//  exactement comme les sprites Pokémon (affichés x2). Le monde fait W x H (1280x720), l'écran VW x VH (640x360).
//
//  Ajouter / modifier une arène : édite son entrée dans ARENAS (paint = sol, obst = obstacles, th = thème de tribunes,
//  fx = ambiance). Son numéro sert dans STAGE_ARENAS de data/stages.js. (training.js ajoute l'arène n°6 : n'en ajoute pas ici.)
//  Ajouter un obstacle : une entrée dans OBS (forme, PV, rayon) + un nom de couleurs dans OPAL.
// ============================================================
const PW = W/2, PH = H/2;
const FX0 = 14, FY0 = 26, FX1 = PW - 14, FY1 = PH - 15;      // terrain jouable (px décor) ; autour : murs + tribunes
let curArena = 0, ARENA_FX = [], ARENA_CROWD = [], ARENA_FIRE = [];
const ROCK_LAYOUT = [[.5, .5]];                               // valeur de repli : la vraie disposition vient d'ARENAS[].obst (makeArena)

// ---------- outils pixel art ----------
function hash(x, y, s){ let h = (x*374761393 + y*668265263 + s*1274126177) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0)/4294967295; }
function rng(s){ let a = s >>> 0; return () => ((a = (a*1664525 + 1013904223) >>> 0)/4294967296); }
const rc = (a, x, y, w, h, c) => { a.fillStyle = c; a.fillRect(x, y, w, h); };
const px = (a, x, y, c) => { a.fillStyle = c; a.fillRect(x, y, 1, 1); };
function vn(x, y, s, seed){                                   // bruit de valeur lissé (0..1)
  const xi = Math.floor(x/s), yi = Math.floor(y/s), fx = x/s - xi, fy = y/s - yi, u = fx*fx*(3 - 2*fx), v = fy*fy*(3 - 2*fy);
  const p = hash(xi, yi, seed), q = hash(xi + 1, yi, seed), r = hash(xi, yi + 1, seed), t = hash(xi + 1, yi + 1, seed);
  return p + (q - p)*u + (r - p)*v + (p - q - r + t)*u*v;
}
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bay = (x, y) => BAY[(y & 3)*4 + (x & 3)]/16;            // tramage ordonné (dégradés pixel art)
function mkTile(fn, seed){
  const c = document.createElement('canvas'); c.width = c.height = 16; const x = c.getContext('2d');
  for(let j = 0; j < 16; j++) for(let i = 0; i < 16; i++){ const col = fn(i, j, hash(i, j, seed)); if(col){ x.fillStyle = col; x.fillRect(i, j, 1, 1); } }
  return c;
}
function fillTiles(a, T, seed){ for(let ty = 0; ty < PH; ty += 16) for(let tx = 0; tx < PW; tx += 16) a.drawImage(T[(hash(tx, ty, seed)*T.length) | 0], tx, ty); }
function blobPx(a, cx, cy, rx, ry, c){                        // boule avec contour (c.o) — gardée pour compatibilité
  cx = Math.round(cx); cy = Math.round(cy);
  for(let y = -ry - 2; y <= ry + 2; y++) for(let x = -rx - 2; x <= rx + 2; x++){
    const q = x*x/(rx*rx) + y*y/(ry*ry);
    if(q <= 1){ const lit = -x/rx*.6 - y/ry*.8; a.fillStyle = lit > .55 ? c.l : lit > -.15 ? c.m : c.d; a.fillRect(cx + x, cy + y, 1, 1); }
    else if(x*x/((rx + 1.2)*(rx + 1.2)) + y*y/((ry + 1.2)*(ry + 1.2)) <= 1){ a.fillStyle = c.o; a.fillRect(cx + x, cy + y, 1, 1); }
  }
}
function blob3(a, cx, cy, rx, ry, P){                         // ellipse ombrée à 3 tons (sans contour : outlinePx s'en charge)
  cx = Math.round(cx); cy = Math.round(cy);
  for(let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) for(let x = -Math.ceil(rx); x <= Math.ceil(rx); x++){
    if(x*x/(rx*rx) + y*y/(ry*ry) > 1) continue; const l = -x/rx*.6 - y/ry*.8; px(a, cx + x, cy + y, l > .5 ? P.l : l > -.2 ? P.m : P.d);
  }
}
function shadowPx(a, x, y, rx, ry, col){ a.fillStyle = col || 'rgba(0,0,0,.25)'; for(let j = -ry; j <= ry; j++){ const w = Math.round(rx*Math.sqrt(1 - j*j/(ry*ry + .01))); a.fillRect(x - w, y + j, 2*w + 1, 1); } }
function ringPx(a, cx, cy, r, col){ a.fillStyle = col; for(let t = 0; t < 6.283; t += .012) a.fillRect(Math.round(cx + Math.cos(t)*r), Math.round(cy + Math.sin(t)*r), 1, 1); }
function circ(a, cx, cy, r, col, t0, t1, wear){               // cercle / arc 1 px, trait « craie » usé
  const dt = .5/r; for(let t = t0 || 0; t < (t1 === undefined ? 6.2832 : t1); t += dt){ const x = Math.round(cx + Math.cos(t)*r), y = Math.round(cy + Math.sin(t)*r); if(wear && hash(x, y, 3) < wear) continue; px(a, x, y, col); }
}
function line(a, x0, y0, x1, y1, col, wear){
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) || 1;
  for(let i = 0; i <= n; i++){ const x = Math.round(x0 + (x1 - x0)*i/n), y = Math.round(y0 + (y1 - y0)*i/n); if(wear && hash(x, y, 4) < wear) continue; px(a, x, y, col); }
}
function polyPx(a, pts, col){                                 // polygone rempli SANS anticrénelage
  let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }); a.fillStyle = col;
  for(let y = Math.ceil(y0); y <= Math.floor(y1); y++){
    const xs = [], yy = y + .5;
    for(let i = 0; i < pts.length; i++){ const p = pts[i], q = pts[(i + 1)%pts.length]; if((p[1] <= yy && q[1] > yy) || (q[1] <= yy && p[1] > yy)) xs.push(p[0] + (yy - p[1])/(q[1] - p[1])*(q[0] - p[0])); }
    xs.sort((m, n) => m - n); for(let k = 0; k + 1 < xs.length; k += 2){ const xa = Math.round(xs[k]), xb = Math.round(xs[k + 1]); if(xb > xa) a.fillRect(xa, y, xb - xa, 1); }
  }
}
function outlinePx(c, col){                                   // contour sombre 1 px autour d'un sprite (marge transparente requise)
  const a = c.getContext('2d'), w = c.width, h = c.height, d = a.getImageData(0, 0, w, h).data, o = [];
  const al = (x, y) => x < 0 || y < 0 || x >= w || y >= h ? 0 : d[(y*w + x)*4 + 3];
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(!al(x, y) && (al(x - 1, y) || al(x + 1, y) || al(x, y - 1) || al(x, y + 1))) o.push([x, y]);
  a.fillStyle = col; o.forEach(p => a.fillRect(p[0], p[1], 1, 1));
}
function scatter(a, R, n, fn){ for(let i = 0; i < n; i++) fn(Math.floor(FX0 + 4 + R()*(FX1 - FX0 - 8)), Math.floor(FY0 + 4 + R()*(FY1 - FY0 - 8)), R); }
function paintField(a, pal, fn){                              // remplit tout le décor pixel par pixel : fn(x,y) → index dans pal
  const rgb = pal.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const im = a.createImageData(PW, PH), d = im.data;
  for(let y = 0; y < PH; y++) for(let x = 0; x < PW; x++){ const c = rgb[fn(x, y)], o = (y*PW + x)*4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; d[o + 3] = 255; }
  a.putImageData(im, 0, 0);
}
function slab(x, y, cw, ch, sg, seed){                        // dalles : u,v = position dans la dalle, h = hasard par dalle
  const row = Math.floor(y/ch), X = x + (sg ? (row & 1)*(cw >> 1) : 0), col = Math.floor(X/cw);
  return { u: X - col*cw, v: y - row*ch, h: hash(col, row, seed), cw, ch };
}

// ---------- couleurs des obstacles : o contour, l lumière, m ton moyen, d ombre, g accent ----------
const OPAL = {
  stone:{ o:'#2a2830', l:'#cfcac0', m:'#9a968f', d:'#6a6670', g:'#6a9a4a' },
  sand: { o:'#5a3a22', l:'#f4cc94', m:'#d29e60', d:'#9a6a3c', g:'#e8d8a8' },
  ice:  { o:'#2c5e92', l:'#f4fdff', m:'#a8dcf2', d:'#6aaedc', g:'#ffffff' },
  snow: { o:'#3a6a9a', l:'#ffffff', m:'#e4f2fa', d:'#b0d0e6', g:'#e8603c' },
  lava: { o:'#120c16', l:'#80708e', m:'#4a3c58', d:'#2a2034', g:'#ff7a2c' },
  iron: { o:'#14101c', l:'#9a9ab0', m:'#5e5c74', d:'#363448', g:'#ff8a2c' },
  ruin: { o:'#262634', l:'#d2d0dc', m:'#9a98a8', d:'#6c6a7c', g:'#6f9a56' },
  cave: { o:'#1c1030', l:'#b8a4dc', m:'#7c68a8', d:'#4e3c78', g:'#9ad0ff' },
  wood: { o:'#2a180e', l:'#dc9e5c', m:'#aa6c3c', d:'#6e4228', g:'#9a9aaa' },
  clay: { o:'#4a2412', l:'#f0a468', m:'#c46c3c', d:'#8a4428', g:'#8a4428' },
  leaf: { o:'#143a1c', l:'#a2ec6c', m:'#54b24a', d:'#2e7c38', g:'#f4a0c8' },
  cact: { o:'#14451f', l:'#92e478', m:'#42a04c', d:'#277040', g:'#f4e8a0' },
  cry:  { o:'#0a2e5a', l:'#d4fcff', m:'#38c8ea', d:'#1c7cc2', g:'#8af0ff' },
  cryP: { o:'#2a0e4a', l:'#f4d0ff', m:'#b46aea', d:'#7a3cb2', g:'#e8a0ff' }
};

// ---------- OBSTACLES : r rayon de collision (px monde), hp PV, w/h taille du sprite (px décor), ay ligne d'ancrage (le pied),
//            sh ombre au sol [cx, cy, rx, ry], glow halo lumineux, crack couleur des fissures, build dessine l'obstacle intact ----------
function prismPx(a, cx, base, hw, h, P, flat){                // cristal / colonne à facettes
  const top = base - h, sy = flat ? top + 3 : top + Math.round(hw*1.7);
  for(let y = top; y <= base; y++){
    const w = flat ? hw : (y < sy ? Math.round(hw*(y - top + 1)/(sy - top + 1)) : hw);
    for(let x = -w; x <= w; x++){ const f = x/Math.max(1, hw); px(a, cx + x, y, f < -.35 ? P.l : f > .3 ? P.d : P.m); }
  }
  if(flat) rc(a, cx - hw, top, 2*hw + 1, 2, P.l); else rc(a, cx - 1, top + 2, 1, Math.max(1, sy - top - 2), P.l);
  rc(a, cx + hw - 1, top + Math.round(hw*1.7), 1, Math.max(0, h - Math.round(hw*1.7)), P.d);
}
const OBS = {
  rock:{ r:21, hp:90, w:30, h:26, ay:19, sh:[15, 21, 12, 3], build(a, P){
    polyPx(a, [[3, 19], [2, 12], [8, 5], [15, 2], [22, 4], [27, 10], [27, 18], [21, 22], [8, 22]], P.m);
    polyPx(a, [[8, 5], [15, 2], [22, 4], [19, 9], [10, 11]], P.l);
    polyPx(a, [[22, 4], [27, 10], [27, 18], [21, 22], [14, 22], [20, 13]], P.d);
    polyPx(a, [[2, 12], [8, 5], [10, 11], [9, 22], [3, 19]], P.m);
    rc(a, 4, 15, 3, 1, P.l); rc(a, 12, 15, 2, 1, P.d); rc(a, 15, 18, 3, 1, P.d); px(a, 11, 7, '#fff');
    if(P.g === '#6a9a4a' || P.g === '#6f9a56'){ [[8, 4, 5], [15, 2, 4], [21, 4, 3]].forEach(q => { rc(a, q[0], q[1] + 1, q[2], 2, P.g); rc(a, q[0], q[1] + 1, q[2] - 1, 1, '#9ac86a'); }); rc(a, 4, 13, 2, 3, P.g); } } },
  crate:{ r:19, hp:55, w:28, h:28, ay:21, sh:[14, 22, 12, 3], build(a, P){
    polyPx(a, [[3, 10], [8, 4], [24, 4], [24, 10]], P.l); rc(a, 8, 6, 14, 1, P.m);
    rc(a, 3, 10, 21, 12, P.m); rc(a, 3, 10, 21, 1, P.l); rc(a, 3, 21, 21, 1, P.d);
    rc(a, 3, 10, 3, 12, P.d); rc(a, 21, 10, 3, 12, P.d); rc(a, 3, 10, 1, 12, P.m);
    rc(a, 6, 15, 15, 1, P.d); line(a, 6, 11, 20, 20, P.d); line(a, 6, 10, 20, 19, P.l);
    [[4, 11], [22, 11], [4, 20], [22, 20]].forEach(q => px(a, q[0], q[1], P.g)); px(a, 12, 8, P.d); } },
  barrel:{ r:16, hp:60, w:24, h:30, ay:23, sh:[12, 24, 9, 3], build(a, P){
    blob3(a, 12, 16, 8, 10, P);
    [[13, 7], [20, 7]].forEach(q => { const w = Math.round(8*Math.sqrt(1 - Math.pow((q[0] + 1 - 16)/10, 2))); rc(a, 12 - w, q[0], 2*w + 1, 2, P.g); rc(a, 12 - w, q[0], 2*w + 1, 1, P.l); });
    blob3(a, 12, 8, 8, 3.6, { l:P.l, m:P.l, d:P.m }); ringPx(a, 12, 8, 6, P.d); rc(a, 9, 7, 6, 2, P.m);
    rc(a, 8, 11, 1, 8, P.d); rc(a, 15, 11, 1, 8, P.d); } },
  crystal:{ r:18, hp:70, w:30, h:36, ay:28, glow:1, sh:[15, 29, 11, 3], build(a, P){
    prismPx(a, 8, 28, 4, 17, P); prismPx(a, 20, 29, 5, 22, P); prismPx(a, 14, 31, 4, 27, P);
    px(a, 14, 7, '#fff'); px(a, 20, 12, '#fff'); px(a, 8, 17, '#fff'); } },
  bush:{ r:20, hp:35, w:30, h:24, ay:17, sh:[15, 19, 12, 3], build(a, P){
    blob3(a, 15, 12, 11, 8, P); blob3(a, 8, 14, 7, 6, P); blob3(a, 22, 14, 7, 6, P); blob3(a, 12, 8, 6, 4, { l:P.l, m:P.l, d:P.m });
    [[7, 12], [14, 5], [22, 10], [17, 15], [10, 17]].forEach((q, i) => rc(a, q[0], q[1], 2, 2, i % 2 ? P.g : '#fff')); [[11, 12], [18, 9], [6, 16]].forEach(q => px(a, q[0], q[1], P.d)); } },
  stump:{ r:20, hp:130, w:26, h:24, ay:17, sh:[13, 20, 11, 3], build(a, P){
    rc(a, 3, 9, 20, 9, P.m); blob3(a, 13, 17, 10, 3, P); rc(a, 3, 9, 3, 9, P.l); rc(a, 20, 9, 3, 9, P.d); [[8, 11], [12, 12], [16, 11], [10, 15], [18, 14]].forEach(q => rc(a, q[0], q[1], 1, 5, P.d));
    blob3(a, 13, 9, 10, 5, { l:P.l, m:P.l, d:P.m }); ringPx(a, 13, 9, 7, P.m); ringPx(a, 13, 9, 4, P.d); px(a, 13, 9, P.d); } },
  pillar:{ r:17, hp:140, w:24, h:44, ay:38, sh:[12, 38, 10, 3], build(a, P){
    rc(a, 3, 3, 18, 5, P.m); rc(a, 3, 3, 18, 2, P.l); rc(a, 3, 7, 18, 1, P.d);
    rc(a, 6, 8, 12, 23, P.m); rc(a, 6, 8, 4, 23, P.l); rc(a, 14, 8, 4, 23, P.d); rc(a, 11, 8, 1, 23, P.d); rc(a, 9, 10, 1, 18, P.m);
    rc(a, 3, 31, 18, 6, P.m); rc(a, 3, 31, 18, 2, P.l); rc(a, 3, 36, 18, 1, P.d); rc(a, 15, 33, 6, 3, P.d);
    if(P.g === '#6f9a56'){ rc(a, 6, 14, 3, 6, P.g); rc(a, 5, 18, 2, 5, P.g); rc(a, 14, 27, 4, 3, P.g); } } },
  ice:{ r:19, hp:80, w:30, h:32, ay:24, sh:[15, 25, 12, 3], build(a, P){
    polyPx(a, [[4, 12], [9, 6], [26, 6], [21, 12]], P.l); rc(a, 4, 12, 17, 13, P.m); polyPx(a, [[21, 12], [26, 6], [26, 20], [21, 25]], P.d);
    line(a, 7, 22, 15, 14, P.l); line(a, 10, 23, 18, 15, '#fff'); rc(a, 6, 14, 3, 1, P.l); rc(a, 15, 20, 4, 1, P.d); line(a, 9, 9, 22, 9, '#fff'); px(a, 12, 17, '#fff'); px(a, 18, 19, P.d); } },
  cactus:{ r:15, hp:45, w:24, h:40, ay:34, sh:[12, 35, 8, 3], build(a, P){
    rc(a, 8, 5, 8, 30, P.m); rc(a, 8, 5, 3, 30, P.l); rc(a, 14, 5, 2, 30, P.d); rc(a, 9, 3, 6, 2, P.m); rc(a, 9, 3, 3, 1, P.l);
    rc(a, 2, 18, 6, 4, P.m); rc(a, 2, 11, 4, 9, P.m); rc(a, 2, 11, 2, 9, P.l);
    rc(a, 16, 22, 6, 4, P.m); rc(a, 18, 14, 4, 12, P.m); rc(a, 18, 14, 2, 12, P.l); rc(a, 20, 14, 2, 12, P.d);
    [[11, 9], [13, 14], [10, 20], [12, 27], [4, 14], [20, 18]].forEach(q => px(a, q[0], q[1], P.g)); rc(a, 10, 2, 2, 1, '#f08ab8'); } },
  statue:{ r:17, hp:150, w:28, h:46, ay:39, glow:1, sh:[14, 40, 10, 3], build(a, P){
    rc(a, 4, 31, 20, 7, P.m); rc(a, 4, 31, 20, 2, P.l); rc(a, 4, 37, 20, 1, P.d); rc(a, 17, 33, 7, 4, P.d);
    blob3(a, 14, 24, 7, 9, P); rc(a, 5, 20, 3, 9, P.m); rc(a, 20, 20, 3, 9, P.d); blob3(a, 14, 13, 6, 5, P);
    polyPx(a, [[8, 10], [9, 3], [12, 9]], P.m); polyPx(a, [[20, 10], [19, 3], [16, 9]], P.d); rc(a, 11, 13, 2, 2, P.g); rc(a, 16, 13, 2, 2, P.g); rc(a, 12, 20, 5, 1, P.d); } },
  snowman:{ r:16, hp:50, w:26, h:36, ay:29, sh:[13, 30, 9, 3], build(a, P){
    blob3(a, 13, 25, 9, 7, P); blob3(a, 13, 15, 7, 6, P); blob3(a, 13, 8, 5, 5, P);
    rc(a, 9, 2, 9, 2, '#2a2a3a'); rc(a, 10, -1 + 2, 7, 1, '#2a2a3a'); rc(a, 7, 13, 12, 2, P.g); rc(a, 17, 15, 2, 5, P.g);
    px(a, 11, 8, '#14101c'); px(a, 15, 8, '#14101c'); rc(a, 13, 9, 3, 1, '#f08a2c'); [[13, 19], [13, 24], [13, 28]].forEach(q => px(a, q[0], q[1], '#14101c')); } },
  column:{ r:18, hp:100, w:30, h:38, ay:30, glow:1, crack:'#ffd23c', sh:[15, 31, 11, 3], build(a, P){
    prismPx(a, 8, 30, 5, 16, P, 1); prismPx(a, 21, 30, 5, 22, P, 1); prismPx(a, 14, 32, 5, 28, P, 1);
    [[13, 12], [15, 18], [14, 25], [20, 16], [8, 24]].forEach(q => rc(a, q[0], q[1], 1, 3, P.g)); } }
};

// dégâts : état 1 = fissures, état 2 = fissures + éclats arrachés
function chipPx(c, R){ const a = c.getContext('2d'), w = c.width, h = c.height, d = a.getImageData(0, 0, w, h).data, ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y*w + x)*4 + 3] > 200;
  for(let i = 0; i < 9; i++){ const x = (R()*w) | 0, y = (R()*h*.85) | 0; if(ok(x, y) && (!ok(x - 3, y) || !ok(x + 3, y) || !ok(x, y - 3))) a.clearRect(x - 1, y - 1, 2 + (R() < .4), 2); } }
function crackPx(c, st, col, hi, R){ const a = c.getContext('2d'), w = c.width, h = c.height, d = a.getImageData(0, 0, w, h).data, ok = (x, y) => x >= 0 && y >= 0 && x < w && y < h && d[(y*w + x)*4 + 3] > 200;
  for(let i = 0; i < 2 + st*2; i++){ let x = Math.round(w*(.28 + R()*.44)), y = Math.round(h*(.2 + R()*.3));
    for(let s = 0; s < 6 + st*3; s++){ if(ok(x, y)){ px(a, x, y, col); if(ok(x + 1, y + 1)) px(a, x + 1, y + 1, hi); } y++; x += R() < .5 ? 0 : (R() < .5 ? -1 : 1); } } }
const ASPR = {};
function obstSprite(k, p, st){
  const key = k + p + st; if(ASPR[key]) return ASPR[key];
  const D = OBS[k], P = OPAL[p], c = document.createElement('canvas'); c.width = D.w; c.height = D.h; const a = c.getContext('2d'), R = rng(k.length*131 + p.length*17 + st*7 + 3);
  a.imageSmoothingEnabled = false; D.build(a, P); if(st > 1) chipPx(c, R); outlinePx(c, P.o); if(st) crackPx(c, st, D.crack || P.o, D.crack ? '#ff7a2c' : P.l, R);
  a.globalCompositeOperation = 'destination-over';
  if(D.glow && P.g.length === 7){ a.fillStyle = P.g + '30'; a.fillRect(0, 0, 0, 0); shadowPx(a, D.sh[0], D.sh[1], D.sh[2] + 4, D.sh[3] + 2, P.g + '2a'); }
  shadowPx(a, D.sh[0] + 2, D.sh[1], D.sh[2], D.sh[3]); a.globalCompositeOperation = 'source-over';
  return ASPR[key] = c;
}
function rubbleSprite(p){                                    // gravats laissés au sol quand l'obstacle est détruit
  const key = 'rub' + p; if(ASPR[key]) return ASPR[key]; const P = OPAL[p], c = document.createElement('canvas'); c.width = 30; c.height = 14; const a = c.getContext('2d'), R = rng(9 + p.length);
  for(let i = 0; i < 8; i++){ const x = 4 + R()*22, y = 4 + R()*6, rx = 1.5 + R()*2.5; blob3(a, x, y, rx, rx*.7 + .5, P); }
  outlinePx(c, P.o); a.globalCompositeOperation = 'destination-over'; shadowPx(a, 15, 9, 12, 3); return ASPR[key] = c;
}

// ---------- TRIBUNES : murs, gradins, public, portes, emblème ----------
// back fond ; wall/seat couleurs (o,l,m,d,g) ; crowd couleurs du public ; trim cadre de l'emblème ; gate sol des portes ; deco(a,R) décor du bord haut ; torch = flammes
const STH = [
 { back:'#14161c', wall:{ o:'#1c1a20', l:'#c8c4b8', m:'#9a968c', d:'#6a6660' }, seat:{ l:'#c08a50', m:'#94622f', d:'#5e3c20', g:'#3e2616' }, trim:'#e8c050', gate:'#a08a60',
   crowd:['#e8503c', '#3b8fd9', '#f0c030', '#58b848', '#e878b0', '#f4f0e8', '#8a5ad0', '#f08a30'],
   deco(a){ for(let x = 4; x < PW; x += 9){ const c = ['#e8503c', '#f0c030', '#3b8fd9', '#58b848'][((x/9) | 0)%4]; polyPx(a, [[x, 0], [x + 6, 0], [x + 3, 3]], c); } } },
 { back:'#120a1e', wall:{ o:'#140c22', l:'#a48ccc', m:'#72589c', d:'#4a3670' }, seat:{ l:'#6e54a0', m:'#503a7c', d:'#34245a', g:'#241640' }, trim:'#8af0ff', gate:'#46386a', torch:['#6ae4ff', '#e8ffff'],
   crowd:['#7a5ad0', '#3ac8e8', '#e86ac8', '#58d8a8', '#f4e8ff', '#9a8ae8', '#2a9ac0'],
   deco(a, R){ for(let x = 3; x < PW; x += 7 + ((R()*8) | 0)){ const h = 3 + ((R()*5) | 0); polyPx(a, [[x, 0], [x + 4, 0], [x + 2, h]], R() < .3 ? '#38c8ea' : '#5e4a8c'); } } },
 { back:'#24160e', wall:{ o:'#3a2414', l:'#f0d4a0', m:'#d0a468', d:'#9a6c3c' }, seat:{ l:'#e8c088', m:'#c89458', d:'#946238', g:'#6e4626' }, trim:'#c8402c', gate:'#c89458',
   crowd:['#e8503c', '#3b8fd9', '#f0c030', '#58b848', '#f4f0e8', '#e878b0', '#f08a30'],
   deco(a){ for(let x = 0; x < PW; x += 8){ const c = ((x/8) | 0)%2 ? '#f4ecd8' : '#c8402c'; rc(a, x, 0, 8, 2, c); polyPx(a, [[x, 2], [x + 8, 2], [x + 4, 4]], c); } } },
 { back:'#142030', wall:{ o:'#243a5a', l:'#f6fcff', m:'#c4e0ee', d:'#8ab4cc' }, seat:{ l:'#e8f6fc', m:'#bcd8e8', d:'#86aac4', g:'#6a8eac' }, trim:'#4a82c4', gate:'#9ac4dc',
   crowd:['#ffffff', '#8cc8f0', '#f0a0c8', '#5a9ae0', '#d4f0ff', '#f4e068', '#a8e0d0'],
   deco(a, R){ for(let x = 2; x < PW; x += 5 + ((R()*7) | 0)){ const h = 3 + ((R()*6) | 0); polyPx(a, [[x, 0], [x + 3, 0], [x + 1.5, h]], '#d8f4ff'); px(a, x + 1, 0, '#ffffff'); } } },
 { back:'#0c080e', wall:{ o:'#140c14', l:'#7a6488', m:'#4c3a58', d:'#2e2238' }, seat:{ l:'#5c4668', m:'#3e2e4c', d:'#281c34', g:'#180e22' }, trim:'#ff7a2c', gate:'#3a2840', torch:['#ff8a2c', '#ffe060'],
   crowd:['#e8503c', '#f08a30', '#a03ac8', '#f0c030', '#c83a5a', '#6a4ad0', '#ff9a5a'],
   deco(a, R){ for(let x = 3; x < PW; x += 6 + ((R()*10) | 0)){ const h = 2 + ((R()*4) | 0); rc(a, x, 0, 2, h, '#ff7a2c'); px(a, x, h, '#ffd23c'); px(a, x, 0, '#ffd23c'); } } },
 { back:'#10120e', wall:{ o:'#1c1c26', l:'#bcbaca', m:'#8a889a', d:'#5c5a6c' }, seat:{ l:'#9a98aa', m:'#747286', d:'#4e4c60', g:'#34324a' }, trim:'#8ad0ff', gate:'#6a6880', torch:['#ff9a3c', '#ffe27a'], alpha:.75,
   crowd:['#dff4ff', '#bfe6ff', '#e8dcff', '#c8f4e8', '#ffffff'],
   deco(a, R){ for(let x = 2; x < PW; x += 5 + ((R()*9) | 0)){ const h = 2 + ((R()*5) | 0); rc(a, x, 0, 1, h, '#4e8a3c'); if(h > 3) px(a, x + 1, h - 1, '#6fae52'); } } }
];
function crowdSpr(c, k){
  const key = 'cw' + c + k; if(ASPR[key]) return ASPR[key]; const s = document.createElement('canvas'); s.width = 10; s.height = 10; const a = s.getContext('2d'), dk = shade(c, -.3);
  rc(a, 2, 3, 6, 6, c); rc(a, 2, 7, 6, 2, dk); rc(a, 3, 2, 4, 1, c); rc(a, 2, 3, 2, 1, shade(c, .4));
  if(k === 1){ px(a, 2, 1, c); px(a, 7, 1, c); px(a, 2, 2, c); px(a, 7, 2, c); } else if(k === 2){ rc(a, 4, 0, 2, 2, c); } else if(k === 3){ px(a, 3, 1, dk); px(a, 6, 1, dk); }
  px(a, 3, 5, '#1a1220'); px(a, 6, 5, '#1a1220'); outlinePx(s, '#1a1220'); return ASPR[key] = s;
}
function standsPx(a, T, R){
  const w = T.wall, s = T.seat, fire = [], gy = (PH/2 | 0) - 22, row = (y, o) => {
    rc(a, 0, y, PW, 9, s.m); rc(a, 0, y, PW, 1, s.l); rc(a, 0, y + 7, PW, 2, s.d); rc(a, 0, y + 3, PW, 1, s.g);
    for(let x = o; x < PW; x += 22) rc(a, x, y + 1, 1, 6, s.g); };
  rc(a, 0, 0, PW, FY0, T.back); rc(a, 0, FY1, PW, PH - FY1, T.back); rc(a, 0, 0, FX0, PH, T.back); rc(a, FX1, 0, PW - FX1, PH, T.back);
  // côtés (gauche : mur à l'est de la tribune ; droite : l'inverse)
  rc(a, 0, 0, 9, PH, s.m); rc(a, 0, 0, 9, PH, s.m); rc(a, 0, 0, 1, PH, w.o); rc(a, 1, 0, 1, PH, s.l); rc(a, 8, 0, 1, PH, s.d);
  rc(a, 9, 0, 1, PH, w.l); rc(a, 10, 0, 2, PH, w.m); rc(a, 12, 0, 1, PH, w.d); rc(a, 13, 0, 1, PH, w.o);
  rc(a, PW - 9, 0, 9, PH, s.m); rc(a, PW - 1, 0, 1, PH, w.o); rc(a, PW - 2, 0, 1, PH, s.d); rc(a, PW - 9, 0, 1, PH, s.l);
  rc(a, PW - 14, 0, 1, PH, w.o); rc(a, PW - 13, 0, 1, PH, w.l); rc(a, PW - 12, 0, 2, PH, w.m); rc(a, PW - 10, 0, 1, PH, w.d);
  for(let y = 6; y < PH; y += 12){ rc(a, 10, y, 2, 1, w.d); rc(a, PW - 12, y, 2, 1, w.d); }
  // portes (gauche et droite) : tunnel sombre + linteau + lampes
  [0, 1].forEach(sd => { const x0 = sd ? PW - 14 : 0;
    rc(a, x0, gy, 14, 44, '#0c0a10'); for(let i = 0; i < 14; i++){ const k = sd ? 13 - i : i; rc(a, x0 + i, gy + 2, 1, 40, T.gate); a.fillStyle = `rgba(8,6,12,${Math.max(0, .85 - k*.075)})`; a.fillRect(x0 + i, gy + 2, 1, 40); }
    rc(a, x0, gy - 3, 14, 3, w.m); rc(a, x0, gy - 3, 14, 1, w.l); rc(a, x0, gy + 44, 14, 3, w.m); rc(a, x0, gy + 46, 14, 1, w.d); rc(a, x0, gy - 3, 14, 1, w.l);
    px(a, sd ? x0 + 1 : x0 + 12, gy - 1, '#ffe27a'); px(a, sd ? x0 + 1 : x0 + 12, gy + 44, '#ffe27a'); });
  // haut : 2 rangées de gradins + mur avant
  row(2, 0); row(11, 11); rc(a, 0, 20, PW, 1, w.l); rc(a, 0, 21, PW, 3, w.m); rc(a, 0, 24, PW, 1, w.d); rc(a, 0, 25, PW, 1, w.o);
  for(let x = 5; x < PW; x += 14) rc(a, x, 21, 1, 3, w.d); for(let x = 12; x < PW; x += 28) rc(a, x, 21, 3, 1, w.l);
  // bas : muret + 1 rangée
  rc(a, 0, FY1, PW, 1, w.o); rc(a, 0, FY1 + 1, PW, 1, w.l); rc(a, 0, FY1 + 2, PW, 3, w.m); rc(a, 0, FY1 + 5, PW, 1, w.d); row(FY1 + 6, 6);
  for(let x = 8; x < PW; x += 14) rc(a, x, FY1 + 2, 1, 3, w.d);
  // emblème central (Pokéball sur panneau)
  const cx = PW/2 | 0; rc(a, cx - 17, 1, 35, 19, T.trim); rc(a, cx - 16, 2, 33, 17, '#1a1620'); rc(a, cx - 16, 2, 33, 1, '#3a3244');
  for(let y = -6; y <= 6; y++) for(let x = -6; x <= 6; x++){ const q = x*x + y*y; if(q > 42) continue; px(a, cx + x, 11 + y, q > 33 ? '#14101c' : Math.abs(y) < 1 ? '#14101c' : y < 0 ? (x + y < -3 ? '#ff7a6a' : '#e23b3b') : (x + y < -2 ? '#ffffff' : '#c8c8d8')); }
  rc(a, cx - 1, 10, 3, 3, '#14101c'); px(a, cx, 11, '#fff'); T.deco(a, R);
  if(T.torch) for(let i = 0; i < 7; i++){ const x = 24 + i*((PW - 48)/6) | 0; if(Math.abs(x - cx) < 22) continue; rc(a, x - 1, 18, 3, 3, '#2a2028'); fire.push({ x, y:19, c1:T.torch[0], c2:T.torch[1] }); }
  return fire;
}
function buildCrowd(T, R){
  const L = [], gy = (PH/2 | 0) - 26, ex = (PW/2 | 0), col = () => T.crowd[(R()*T.crowd.length) | 0], add = (x, y) => L.push({ x:Math.round(x), y, c:col(), k:(R()*4) | 0, o:R()*20, al:T.alpha || 1 });
  for(let x = 14; x < PW - 14; x += 9) if(Math.abs(x - ex) > 20){ add(x + R()*2 - 1, 10); add(x + 4 + R()*2 - 1, 19); }
  for(let x = 16; x < PW - 20; x += 9) add(x + R()*2, PH - 2);
  for(let y = 30; y < PH - 12; y += 10) if(y < gy || y > gy + 52){ add(0, y + 8); add(PW - 10, y + 8); }
  return L.sort((p, q) => p.y - q.y);
}
// ombre portée des tribunes (lumière en haut à gauche) : bandes pixel + grande ombre diagonale douce
function fieldShade(a){
  [.34, .22, .13, .07, .03].forEach((al, i) => { rc(a, FX0, FY0 + i, FX1 - FX0, 1, `rgba(0,0,0,${al})`); rc(a, FX0 + i, FY0, 1, FY1 - FY0, `rgba(0,0,0,${al*.8})`); });
  [.2, .1].forEach((al, i) => { rc(a, FX0, FY1 - 1 - i, FX1 - FX0, 1, `rgba(0,0,0,${al})`); rc(a, FX1 - 1 - i, FY0, 1, FY1 - FY0, `rgba(0,0,0,${al})`); });
  for(let y = FY0; y < FY1; y++){ const w = Math.round(120 - (y - FY0)*.9); if(w > 0) rc(a, FX0 + 5, y, w, 1, 'rgba(0,0,0,.07)'); if(w > 6) rc(a, FX0 + 5 + w, y, 4, 1, 'rgba(0,0,0,.035)'); }
}
function shaft(a, x, wd, al){ polyPx(a, [[x, FY0], [x + wd, FY0], [x + wd - 70, FY1], [x - 70, FY1]], `rgba(255,248,220,${al})`); }
function bubble(a, cx, cy, r, P){ shadowPx(a, cx, cy + 1, r + 6, Math.round(r*.7) + 5, P.g + '22'); blob3(a, cx, cy, r, r, P); ringPx(a, cx, cy, r + 1, P.o); px(a, cx - Math.round(r*.4), cy - Math.round(r*.4), '#fff'); }
function plantPx(a, cx, cy, r){ for(let k = 0; k < 8; k++){ const an = k*.785 + .2, tx = cx + Math.cos(an)*r, ty = cy + Math.sin(an)*r*.8, nx = -Math.sin(an)*r*.28, ny = Math.cos(an)*r*.22;
    polyPx(a, [[cx, cy], [cx + (tx - cx)*.5 + nx, cy + (ty - cy)*.5 + ny], [tx, ty], [cx + (tx - cx)*.5 - nx, cy + (ty - cy)*.5 - ny]], k % 2 ? '#3a2a78' : '#4a3a98'); line(a, cx, cy, Math.round(tx), Math.round(ty), '#38b0d8'); } px(a, cx, cy, '#e8a0ff'); }
function pitchLines(a, col, wear, o){
  const i = o.inset, x0 = FX0 + i, y0 = FY0 + i, x1 = FX1 - i - 1, y1 = FY1 - i - 1, cx = PW/2, cy = (FY0 + FY1)/2 | 0;
  line(a, x0, y0, x1, y0, col, wear); line(a, x0, y1, x1, y1, col, wear); line(a, x0, y0, x0, y1, col, wear); line(a, x1, y0, x1, y1, col, wear); line(a, cx, y0, cx, y1, col, wear);
  circ(a, cx, cy, o.r, col, 0, undefined, wear); circ(a, cx, cy, o.r2 || 6, col, 0, undefined, wear);
  if(o.box) [x0, x1].forEach((sx, k) => { const dx = k ? -o.box[0] : o.box[0], b = o.box[1]; line(a, sx, cy - b, sx + dx, cy - b, col, wear); line(a, sx + dx, cy - b, sx + dx, cy + b, col, wear); line(a, sx + dx, cy + b, sx, cy + b, col, wear); });
  if(o.arc) { circ(a, x0, cy, o.arc, col, -1.5708, 1.5708, wear); circ(a, x1, cy, o.arc, col, 1.5708, 4.7124, wear); }
}
const sym = L => L.flatMap(o => o[2] === .5 && o[3] === .5 ? [o] : [o, [o[0], o[1], 1 - o[2], 1 - o[3]]]);   // disposition symétrique (rotation 180°)

// fissure irrégulière (marche aléatoire à cap persistant) ; cols = [coeur, éclat, halo] ; se ramifie parfois
function crackWalk(a, R, x, y, n, cols, depth){
  let an = R()*6.283;
  for(let i = 0; i < n; i++){
    an += (R() - .5)*.55; x += Math.cos(an); y += Math.sin(an); const X = Math.round(x), Y = Math.round(y);
    if(X < FX0 + 2 || X > FX1 - 3 || Y < FY0 + 2 || Y > FY1 - 3) break;
    if(cols[2]){ px(a, X + 1, Y, cols[2]); px(a, X, Y + 1, cols[2]); }
    px(a, X, Y, cols[1] && i%2 ? cols[1] : cols[0]); if(cols[3]){ px(a, X + 1, Y, cols[0]); px(a, X, Y - 1, cols[2]); px(a, X - 1, Y, cols[2]); }
    if(depth < 2 && R() < .03) crackWalk(a, R, x, y, ((n - i)*.5) | 0, cols, depth + 1);
  }
}
function cracks(a, R, n, len, cols){ for(let i = 0; i < n; i++) crackWalk(a, R, FX0 + 12 + R()*(FX1 - FX0 - 24), FY0 + 12 + R()*(FY1 - FY0 - 24), len*(.6 + R()*.8) | 0, cols, 0); }
function dirtPx(a, cx, cy, rx, ry, seed, c0, c1, c2){            // plaque de terre à bord tramé
  for(let y = cy - ry - 3; y <= cy + ry + 3; y++) for(let x = cx - rx - 3; x <= cx + rx + 3; x++){
    const q = ((x - cx)/rx)**2 + ((y - cy)/ry)**2 + (hash(x, y, seed) - .5)*.3 + (bay(x, y) - .5)*.12; if(q > 1) continue;
    const h = hash(x, y, seed + 1); px(a, x, y, h < .1 ? c2 : h > .93 ? c1 : c0);
  }
}
const slabCorner = s => (s.u < 2 && s.v < 2) || (s.u > s.cw - 3 && s.v < 2) || (s.u < 2 && s.v > s.ch - 3) || (s.u > s.cw - 3 && s.v > s.ch - 3);

// ---------- les 6 arènes ----------
const ARENAS = [
 { name:'Stade de la Prairie', th:0, fx:{ k:'petal', c:'#ffd0e0', n:16, s:2 },
   obst: sym([['stump', 'wood', .5, .5], ['crate', 'wood', .36, .27], ['bush', 'leaf', .36, .73], ['bush', 'leaf', .2, .36], ['rock', 'stone', .2, .66], ['crate', 'wood', .5, .15], ['bush', 'leaf', .1, .5], ['barrel', 'wood', .28, .5]]),
   paint(a, R){
     paintField(a, ['#3e7c3a', '#4d9544', '#5eaa4d', '#72be5b'], (x, y) => {
       const st = ((x/40) | 0) & 1, t = vn(x, y, 46, 11) + (bay(x, y) - .5)*.1, h = hash(x, y, 5); let i = st ? 2 : 1;
       if(t > .67) i++; else if(t < .3) i--; if(h < .03) i--; else if(h > .985) i++; return Math.max(0, Math.min(3, i)); });
     [[FX0 + 26, PH/2, 24, 40], [FX1 - 26, PH/2, 24, 40], [PW/2, PH/2, 22, 16]].forEach((q, k) => dirtPx(a, Math.round(q[0]), Math.round(q[1]), q[2], q[3], 21 + k, '#a98650', '#c0a064', '#8e6e40'));
     scatter(a, R, 170, (x, y) => { px(a, x, y, '#2f6c30'); px(a, x - 1, y - 1, '#2f6c30'); px(a, x + 1, y - 1, '#2f6c30'); px(a, x, y - 1, '#8ad474'); });
     scatter(a, R, 40, (x, y, r) => { const c = ['#ffffff', '#f6c0d8', '#ffe24a'][(r()*3) | 0]; rc(a, x, y, 2, 2, c); px(a, x, y, '#f0a030'); });
     pitchLines(a, 'rgba(244,250,236,.8)', .1, { inset:8, r:52, r2:6, box:[56, 46] });
   } },
 { name:'Cavernes cristallines', th:1, fx:{ k:'sparkle', c:'#bff4ff', n:30, s:2 },
   obst: sym([['crystal', 'cry', .5, .5], ['crystal', 'cryP', .36, .27], ['rock', 'cave', .36, .73], ['crystal', 'cry', .2, .36], ['rock', 'cave', .2, .66], ['crystal', 'cryP', .5, .15], ['rock', 'cave', .1, .5], ['crystal', 'cry', .28, .5]]),
   paint(a, R){
     paintField(a, ['#3a2356', '#47306a', '#573d82', '#6a4a98', '#22133a'], (x, y) => {
       const s = slab(x, y, 30, 22, 0, 31); if(s.u === s.cw - 1 || s.v === s.ch - 1 || slabCorner(s)) return 4;
       let i = s.h > .84 ? 2 : s.h < .12 ? 0 : 1; if(s.u === 0 || s.v === 0) i = Math.min(3, i + 1); else if(s.u === s.cw - 2 || s.v === s.ch - 2) i = Math.max(0, i - 1);
       if(hash(x, y, 32) < .025) i = Math.min(3, i + 1); return i; });
     cracks(a, R, 12, 40, ['#22133a']);
     scatter(a, R, 34, (x, y) => { shadowPx(a, x, y, 3, 2, 'rgba(120,220,255,.16)'); px(a, x, y, '#8af0ff'); px(a, x + 1, y, '#38c8ea'); px(a, x, y + 1, '#1c7cc2'); });
     pitchLines(a, 'rgba(190,150,255,.45)', .25, { inset:8, r:52, r2:8, box:[0, 0] });
     [[FX0 + 34, FY0 + 34], [FX1 - 36, FY0 + 30], [FX0 + 32, FY1 - 32], [FX1 - 34, FY1 - 34]].forEach(q => { for(let i = 0; i < 8; i++) bubble(a, Math.round(q[0] + (R() - .5)*44), Math.round(q[1] + (R() - .5)*34), 3 + ((R()*(i ? 4 : 7)) | 0), OPAL.cry); });
     [[PW*.3, PH*.12], [PW*.7, PH*.88], [PW*.12, PH*.78], [PW*.9, PH*.2]].forEach(q => plantPx(a, Math.round(q[0]), Math.round(q[1]), 9));
     shaft(a, PW*.3, 26, .05); shaft(a, PW*.72, 22, .045);
   } },
 { name:'Arène du Désert', th:2, fx:{ k:'dust', c:'#fff0c0', n:22, s:2 },
   obst: sym([['pillar', 'sand', .5, .5], ['cactus', 'cact', .36, .27], ['rock', 'sand', .36, .73], ['barrel', 'clay', .2, .36], ['cactus', 'cact', .2, .66], ['rock', 'sand', .5, .15], ['barrel', 'clay', .1, .5], ['crate', 'wood', .28, .5]]),
   paint(a, R){
     paintField(a, ['#cc8a46', '#d99b55', '#e6ae69', '#f1c386', '#b07238'], (x, y) => {
       const t = vn(x, y, 60, 41) + (bay(x, y) - .5)*.1, h = hash(x, y, 43); let i = 1; if(t > .64) i = 2; else if(t < .3) i = 0;
       if(h < .012) return 4; if(h > .992) return 3; return i; });
     cracks(a, R, 8, 30, ['#a2622c']);
     scatter(a, R, 120, (x, y, r) => { const w = 3 + ((r()*5) | 0); rc(a, x, y, w, 1, '#f1c386'); rc(a, x + 1, y + 1, w, 1, '#b57a3c'); });
     scatter(a, R, 44, (x, y) => { px(a, x, y, '#b07a44'); px(a, x + 1, y, '#eec890'); px(a, x + 1, y + 1, '#8a5a2c'); });
     pitchLines(a, 'rgba(252,246,228,.85)', .12, { inset:8, r:46, r2:6, box:[52, 44] });
   } },
 { name:'Patinoire de la Banquise', th:3, fx:{ k:'snow', c:'#ffffff', n:40, s:2 },
   obst: sym([['ice', 'ice', .5, .5], ['snowman', 'snow', .36, .27], ['ice', 'ice', .36, .73], ['rock', 'ice', .2, .36], ['snowman', 'snow', .2, .66], ['ice', 'ice', .5, .15], ['rock', 'ice', .1, .5], ['crate', 'wood', .28, .5]]),
   paint(a, R){
     paintField(a, ['#a8d8ee', '#b9e3f5', '#cbedfa', '#e0f7ff', '#8cc0de', '#ffffff'], (x, y) => {
       const s = slab(x, y, 32, 24, 0, 51); if(s.u === s.cw - 1 || s.v === s.ch - 1) return 4; if(s.u === 0 || s.v === 0) return 3;
       let i = s.h > .84 ? 2 : s.h < .14 ? 0 : 1; if(s.u === s.cw - 2 || s.v === s.ch - 2) i = Math.max(0, i - 1); return hash(x, y, 9) > .997 ? 5 : i; });
     cracks(a, R, 9, 44, ['#f4fcff', '#ffffff', '#7eb4d6']);
     scatter(a, R, 22, (x, y) => { px(a, x, y, '#fff'); [[-1, 0], [1, 0], [0, -1], [0, 1]].forEach(d => px(a, x + d[0], y + d[1], '#e4f6ff')); });
     pitchLines(a, 'rgba(60,110,190,.85)', .06, { inset:8, r:46, r2:7, box:[0, 0], arc:36 });
   } },
 { name:'Cratère de lave', th:4, fx:{ k:'ember', c:'#ff9a3c', n:46, s:2 },
   obst: sym([['column', 'lava', .5, .5], ['barrel', 'iron', .36, .27], ['rock', 'lava', .36, .73], ['column', 'lava', .2, .36], ['barrel', 'iron', .2, .66], ['rock', 'lava', .5, .15], ['column', 'lava', .1, .5], ['crate', 'wood', .28, .5]]),
   paint(a, R){
     paintField(a, ['#2e2234', '#3a2c42', '#463652', '#52405f', '#1a1220'], (x, y) => {
       const s = slab(x, y, 18, 18, 0, 61); if(s.u === s.cw - 1 || s.v === s.ch - 1) return 4;
       let i = s.h > .84 ? 2 : s.h < .12 ? 0 : 1; if(s.u === 0 || s.v === 0) i = Math.min(3, i + 1); if(hash(x, y, 62) < .02) i = Math.max(0, i - 1); return i; });
     cracks(a, R, 12, 110, ['#ff7a2c', '#ffd23c', '#8a2a1c', 1]);
     scatter(a, R, 60, (x, y) => { px(a, x, y, '#5a4a66'); px(a, x + 1, y, '#241a2c'); });
     const cx = PW/2, cy = (FY0 + FY1)/2 | 0; circ(a, cx, cy, 52, '#ff7a2c', 0, undefined, .2); circ(a, cx, cy, 50, 'rgba(255,122,44,.3)'); circ(a, cx, cy, 22, '#ffb040', 0, undefined, .2);
     for(let k = 0; k < 8; k++){ const an = k*.785; line(a, Math.round(cx + Math.cos(an)*24), Math.round(cy + Math.sin(an)*24), Math.round(cx + Math.cos(an)*50), Math.round(cy + Math.sin(an)*50), '#c0301c', .3); }
   } },
 { name:'Ruines anciennes', th:5, fx:{ k:'mote', c:'#d8f0ff', n:26, s:2 },
   obst: sym([['statue', 'ruin', .5, .5], ['pillar', 'ruin', .36, .27], ['rock', 'ruin', .36, .73], ['pillar', 'ruin', .2, .36], ['rock', 'ruin', .2, .66], ['barrel', 'clay', .5, .15], ['rock', 'ruin', .1, .5], ['crate', 'wood', .28, .5]]),
   paint(a, R){
     paintField(a, ['#8a8898', '#9a98a8', '#a9a7b7', '#7a7888', '#58566a', '#5f8c4a', '#7aa85a'], (x, y) => {
       const s = slab(x, y, 22, 22, 0, 71); if(s.u === s.cw - 1 || s.v === s.ch - 1) return 4;
       const cm = hash((x/22) | 0, (y/22) | 0, 75) > .86, d = s.u + s.v; if(cm && d < 8 - ((hash(x, y, 76)*3) | 0)) return d < 4 ? 6 : 5;
       let i = s.h > .84 ? 2 : s.h < .12 ? 0 : 1; if(s.u === 0 || s.v === 0) i = Math.min(2, i + 1); if(hash(x, y, 74) < .02) i = 3; return i; });
     cracks(a, R, 12, 38, ['#4e4c60']);
     const cx = PW/2, cy = (FY0 + FY1)/2 | 0, rn = '#8ad0ff';
     [58, 40].forEach(r => { circ(a, cx, cy, r, rn, 0, undefined, .08); circ(a, cx, cy, r + 1, 'rgba(138,208,255,.25)'); circ(a, cx, cy, r - 1, 'rgba(138,208,255,.18)'); });
     for(let k = 0; k < 8; k++){ const an = k*.785 + .39; line(a, Math.round(cx + Math.cos(an)*40), Math.round(cy + Math.sin(an)*40), Math.round(cx + Math.cos(an)*58), Math.round(cy + Math.sin(an)*58), rn, .15); }
     for(let k = 0; k < 16; k++){ const an = k*.3927, x = Math.round(cx + Math.cos(an)*49), y = Math.round(cy + Math.sin(an)*49); rc(a, x - 1, y - 1, 3, 3, 'rgba(138,208,255,.5)'); px(a, x, y, '#e8f8ff'); }
     scatter(a, R, 18, (x, y, r) => { blob3(a, x, y, 2 + ((r()*2) | 0), 1.5, OPAL.ruin); });
     shaft(a, PW*.25, 30, .06); shaft(a, PW*.62, 24, .05);
   } }
];

// ---------- construction d'une arène (décor mis en cache : les combats suivants sont instantanés) ----------
const ARENA_CACHE = {};
function makeArena(w){
  curArena = ((w % ARENAS.length) + ARENAS.length)%ARENAS.length; const A = ARENAS[curArena];
  let C = ARENA_CACHE[curArena];
  if(!C){
    const c = document.createElement('canvas'); c.width = PW; c.height = PH; const a = c.getContext('2d'); a.imageSmoothingEnabled = false; const R = rng(1234 + curArena*77);
    A.paint(a, R); C = { c, crowd:[], fire:[] };
    if(A.th !== undefined){ C.fire = standsPx(a, STH[A.th], R); fieldShade(a); C.crowd = buildCrowd(STH[A.th], R); }
    ARENA_CACHE[curArena] = C;
  }
  const b = bg.getContext('2d'); b.imageSmoothingEnabled = false; b.clearRect(0, 0, W, H); b.drawImage(C.c, 0, 0, W, H);
  const g = b.createRadialGradient(W/2, H/2, H*.45, W/2, H/2, W*.62); g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,.3)'); b.fillStyle = g; b.fillRect(0, 0, W, H);
  ARENA_CROWD = C.crowd; ARENA_FIRE = C.fire;
  const R2 = rng(((Math.random()*1e6) | 0) + 1); ARENA_FX = []; for(let i = 0; i < A.fx.n; i++) ARENA_FX.push({ x:R2()*PW, y:R2()*PH, o:R2()*100, k:A.fx.k, c:A.fx.c, s:A.fx.s });
  // obstacles destructibles : {x,y,r,hp,m} comme avant (le combat les lit tels quels) + k forme, p couleurs, état visuel
  rocks = (A.obst || []).map(o => { const D = OBS[o[0]]; return { x:W*o[2], y:H*o[3], r:D.r, hp:D.hp, m:D.hp, k:o[0], p:o[1], lh:D.hp, shk:0, fl:0 }; });
}

// ---------- vie des obstacles : touche (secousse, éclats), destruction (débris, poussière, gravats au sol) ----------
function obstChips(r, n){
  const P = OPAL[r.p]; for(let i = 0; i < n; i++) pt.push({ x:r.x + (Math.random() - .5)*22, y:r.y - 8 - Math.random()*14, vx:(Math.random() - .5)*170, vy:-70 - Math.random()*90, g:430, t:.35 + Math.random()*.3, c:[P.l, P.m, P.d][i%3], s:2 + ((Math.random()*2) | 0) });
}
function obstBreak(r){
  const P = OPAL[r.p], rn = Math.random;
  for(let i = 0; i < 28; i++){ const an = rn()*6.283, sp = 60 + rn()*230; pt.push({ x:r.x, y:r.y - 12, vx:Math.cos(an)*sp, vy:Math.sin(an)*sp - 100, g:540, t:.5 + rn()*.55, c:[P.l, P.m, P.d, P.o, P.g.length === 7 ? P.g : P.l][i%5], s:2 + ((rn()*3) | 0) }); }
  for(let i = 0; i < 10; i++) pt.push({ x:r.x + (rn() - .5)*30, y:r.y + 6 + rn()*8, vx:(rn() - .5)*80, vy:-12 - rn()*30, g:0, t:.5 + rn()*.35, c:'#e4dcd0', s:4 + ((rn()*3) | 0) });
  fx.push({ x:r.x, y:r.y - 6, t:.45, mx:.45 }); if(G) G.shake = Math.max(G.shake, .14);
  const t = TR.getContext('2d'); t.imageSmoothingEnabled = false; t.drawImage(rubbleSprite(r.p), Math.round(r.x - 30), Math.round(r.y - 16), 60, 28);
}
const _stepAr = step;
step = function(dt){
  _stepAr(dt); if(!G) return;
  for(const r of rocks){
    if(r.hp < r.lh){ r.lh = r.hp; if(r.hp > 0){ r.shk = .22; r.fl = .08; obstChips(r, 5); } else if(!r.dead){ r.dead = 1; obstBreak(r); } }
    if(r.shk > 0) r.shk -= dt; if(r.fl > 0) r.fl -= dt;
  }
};

// ---------- dessin ----------
function crowdSpot(){ return G ? G.time : 0; }
function drawCrowd(){                                          // public animé : il saute quand un Pokémon est K.O.
  const t = crowdSpot(), cheer = G && G.e && G.e.hp <= 0 && G.wait > 0, x0 = CAM.x/2 - 14, x1 = (CAM.x + VW)/2 + 14, y0 = CAM.y/2 - 4, y1 = (CAM.y + VH)/2 + 14;
  ctx.imageSmoothingEnabled = false;
  for(const q of ARENA_CROWD){
    if(q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) continue;
    const j = cheer ? Math.round(Math.abs(Math.sin(t*10 + q.o))*3) : (Math.sin(t*(1.2 + (q.o%1)) + q.o*5) > .96 ? 1 : 0);
    ctx.globalAlpha = q.al; ctx.drawImage(crowdSpr(q.c, q.k), q.x*2, (q.y - 9 - j)*2, 20, 20);
  }
  ctx.globalAlpha = 1;
  const f = Math.floor(t*12);
  for(const q of ARENA_FIRE){ const h = 3 + ((f + q.x)%3), X = q.x*2, Y = q.y*2; ctx.fillStyle = q.c1; ctx.fillRect(X - 3, Y - h*2, 6, h*2); ctx.fillStyle = q.c2; ctx.fillRect(X - 1, Y - h*2 + 4, 2, h*2 - 4); }
}
// dessine, de l'arrière vers l'avant : public, puis obstacles + Pokémon triés par profondeur (eSp / pSp = fonctions de dessin du Pokémon ennemi / du joueur, fournies par render.js)
function drawRocks(eSp, pSp){
  drawCrowd(); ctx.imageSmoothingEnabled = false;
  const L = rocks.filter(r => r.hp > 0).map(r => ({ y:r.y, r }));
  if(eSp && G.e) L.push({ y:G.e.y + 18, f:eSp }); if(pSp && G.p) L.push({ y:G.p.y + 18, f:pSp });
  L.sort((p, q) => p.y - q.y);
  for(const o of L){
    if(o.f){ o.f(); continue; }
    const r = o.r, D = OBS[r.k], k = r.hp/r.m, st = k > .66 ? 0 : k > .33 ? 1 : 2, s = obstSprite(r.k, r.p, st), sx = r.shk > 0 ? Math.round(Math.sin(r.shk*80)*2) : 0, pop = r.shk > .15 ? 2 : 0;
    ctx.drawImage(r.fl > 0 ? flash(s) : s, Math.round(r.x - D.w) + sx - pop/2, Math.round(r.y - D.ay*2) - pop, D.w*2 + pop, D.h*2 + pop);
  }
}
// ambiance : braises, étincelles, neige, pétales, poussières, lucioles (au-dessus des Pokémon)
function drawArenaFg(){
  const t = G ? G.time : 0;
  for(const f of ARENA_FX){
    let x = f.x*2, y = f.y*2, al = 1;
    if(f.k === 'ember'){ const u = (t*22 + f.o*2)%100; y -= u; x += Math.sin(t*2 + f.o)*6; al = 1 - u/100; }
    else if(f.k === 'sparkle') al = Math.max(0, Math.sin(t*2.4 + f.o*3));
    else if(f.k === 'snow'){ y = (y + t*26 + f.o*7)%H; x += Math.sin(t*.9 + f.o)*14 + t*8; x = (x + W)%W; al = .85; }
    else if(f.k === 'petal'){ x = (x + t*14 + f.o*9)%W; y += Math.sin(t*.8 + f.o)*18 + t*5; y = (y + H)%H; al = .8; }
    else if(f.k === 'mote'){ y -= (t*9 + f.o*3)%60; x += Math.sin(t*.7 + f.o)*10; al = .35 + .35*Math.sin(t*1.5 + f.o); }
    else { x += Math.sin(t*.8 + f.o)*10; y += Math.cos(t*.6 + f.o)*6; al = .4; }
    ctx.globalAlpha = Math.max(0, Math.min(1, al)); ctx.fillStyle = f.c; ctx.fillRect(Math.round(x), Math.round(y), f.s, f.s);
  }
  ctx.globalAlpha = 1;
}
