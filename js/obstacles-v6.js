// ============================================================
//  obstacles-v6.js — obstacles redessinés
//    Même taille, même collision, mêmes PV : seul le dessin change. Volume éclairé en haut à gauche
//    (ombrage à 5 tons tramé), textures (bois, pierre, glace, écorce, feuillage), reflets et occlusion au sol.
//    Les états abîmés (fissures, éclats) et les gravats d'arena.js s'appliquent toujours.
// ============================================================
(function(){
if(/arenes=old/.test(location.search)) return;
const cl = (v, a, b) => v < a ? a : v > b ? b : v;
const hx = c => { if(c[0] !== '#'){ const m = c.match(/\d+/g).map(Number); return m; } return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)); };
const mix = (a, b, t) => { const A = hx(a), B = hx(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v)*t).toString(16).padStart(2, '0')).join(''); };
const ramp = P => [mix(P.d, P.o, .45), P.d, P.m, P.l, mix(P.l, '#ffffff', .6)];
const L0 = -.5, L1 = -.62, L2 = .6;                                        // direction de la lumière
const tone = (a, x, y, v, R5) => px(a, x, y, R5[cl(Math.round(v + (bay(x, y) - .5)*.8), 0, 4)]);
const lit = (nx, ny, nz) => (nx*L0 + ny*L1 + nz*L2 + .25)*2.6;           // → 0..4 environ
function ell(a, cx, cy, rx, ry, R5, o){                                     // volume ellipsoïde éclairé
  o = o || {};
  for(let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++) for(let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++){
    let nx = (x + .5 - cx)/rx, ny = (y + .5 - cy)/ry; const q = nx*nx + ny*ny; if(q > 1) continue;
    if(o.facet){ nx = Math.round(nx*o.facet)/o.facet; ny = Math.round(ny*o.facet)/o.facet; }
    const nz = Math.sqrt(Math.max(0, 1 - nx*nx - ny*ny));
    let v = lit(nx, ny, nz) + (o.tex ? (vn(x, y, o.ts || 3, o.seed || 1) - .5)*o.tex : 0);
    if(o.fn){ const r = o.fn(x, y, nx, ny, v); if(r === null) continue; if(typeof r === 'string'){ px(a, x, y, r); continue; } v = r; }
    tone(a, x, y, v, R5);
  }
}
function cyl(a, cx, hw, y0, y1, R5, o){                                     // cylindre vertical éclairé
  o = o || {};
  for(let y = y0; y <= y1; y++){ const w = o.w ? o.w(y) : hw; for(let x = Math.floor(cx - w); x <= Math.ceil(cx + w); x++){
    const nx = (x + .5 - cx)/(w + .5); if(Math.abs(nx) > 1) continue; const nz = Math.sqrt(1 - nx*nx);
    let v = lit(nx, -.15, nz) + (o.tex ? (vn(x*(o.sx || 1), y*(o.sy || 1), o.ts || 3, o.seed || 2) - .5)*o.tex : 0);
    if(o.fn){ const r = o.fn(x, y, nx, v); if(r === null) continue; if(typeof r === 'string'){ px(a, x, y, r); continue; } v = r; }
    tone(a, x, y, v, R5); } }
}
function polyF(a, pts, fn){                                                 // polygone rempli, couleur par pixel
  let y0 = 1e9, y1 = -1e9; pts.forEach(p => { y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); });
  for(let y = Math.ceil(y0); y <= Math.floor(y1); y++){
    const xs = [], yy = y + .5;
    for(let i = 0; i < pts.length; i++){ const p = pts[i], q = pts[(i + 1)%pts.length]; if((p[1] <= yy && q[1] > yy) || (q[1] <= yy && p[1] > yy)) xs.push(p[0] + (yy - p[1])/(q[1] - p[1])*(q[0] - p[0])); }
    xs.sort((m, n) => m - n); for(let k = 0; k + 1 < xs.length; k += 2) for(let x = Math.round(xs[k]); x < Math.round(xs[k + 1]); x++){ const c = fn(x, y); if(c) px(a, x, y, c); }
  }
}
const isMoss = P => P.g === '#6a9a4a' || P.g === '#6f9a56';
const MOSS = ['#2e5a2a', '#3e7a34', '#5a9a44', '#7cbc5a', '#a8e07a'];
const METAL = ['#2a2a36', '#4a4a5c', '#7a7a90', '#a8a8bc', '#e4e4f0'];

// ---------- les obstacles ----------
const NEW = {
  rock(a, P){                                                               // rocher taillé à facettes + mousse
    const R5 = ramp(P), moss = isMoss(P), o = { facet:3, tex:.9, ts:2.5, seed:5, fn:(x, y, nx, ny, v) => moss && ny < -.35 && vn(x, y, 3, 8) > .42 ? (tone(a, x, y, v + .3, MOSS), null) : v };
    ell(a, 15, 12, 12, 9, R5, o); ell(a, 8, 16, 7, 5.5, R5, o); ell(a, 22, 15, 7, 6.5, R5, o);
    line(a, 13, 7, 16, 12, R5[0]); line(a, 16, 12, 15, 16, R5[0]); px(a, 14, 7, R5[4]); line(a, 20, 10, 23, 14, R5[1]);
    [[4, 21], [26, 20], [24, 22]].forEach(q => { px(a, q[0], q[1], R5[2]); px(a, q[0] - 1, q[1], R5[3]); });
  },
  crate(a, P){                                                              // caisse en bois : planches, veinures, cornières en métal
    const W = ['#3e2414', '#6e4228', '#9a6234', '#c48448', '#e8b070'], grain = (x, y, b) => W[cl(Math.round(b + (vn(x*.35, y*3, 2, 4) - .5)*1.6 + (bay(x, y) - .5)*.6), 0, 4)];
    polyF(a, [[3, 9], [8, 4], [26, 4], [21, 9]], (x, y) => (x - y*1) % 5 === 0 ? W[2] : grain(x, y, 3.6));              // dessus
    polyF(a, [[21, 9], [26, 4], [26, 18], [21, 23]], (x, y) => (y - x*0) % 5 === 0 ? W[0] : grain(x, y, 1.3));            // côté
    for(let y = 9; y < 23; y++) for(let x = 3; x < 21; x++) px(a, x, y, (y - 9) % 5 === 4 ? W[0] : (y - 9) % 5 === 0 ? W[3] : grain(x, y, 2.4));   // face
    for(let i = 0; i < 18; i++){ const x = 4 + i, y = 21 - Math.round(i*11/17); px(a, x, y, W[3]); px(a, x, y + 1, W[1]); px(a, x + 1, y, W[3]); }        // traverse
    [[3, 9, 18, 2], [3, 21, 18, 2], [3, 9, 2, 14], [19, 9, 2, 14]].forEach(([x, y, w, h]) => { rc(a, x, y, w, h, W[1]); rc(a, x, y, w, 1, W[3]); });
    [[3, 9], [19, 9], [3, 21], [19, 21]].forEach(([x, y]) => { rc(a, x, y, 2, 2, METAL[2]); px(a, x, y, METAL[4]); });
    [[21, 9], [21, 21]].forEach(([x, y]) => { rc(a, x, y, 2, 2, METAL[1]); px(a, x, y, METAL[3]); });
    rc(a, 8, 4, 18, 1, W[4]); px(a, 25, 4, METAL[3]);
  },
  barrel(a, P){                                                             // tonneau : douelles, cerclages brillants, couvercle
    const W = [mix(P.d, P.o, .5), P.d, P.m, P.l, mix(P.l, '#ffffff', .5)];
    cyl(a, 12, 8, 7, 23, W, { w:y => 7 + Math.round(Math.sin((y - 7)/16*3.1416)*1.4), tex:1, sx:.4, sy:3, fn:(x, y, nx, v) => {
      const st = Math.asin(cl(nx, -1, 1))*3.3; if(Math.abs(st - Math.round(st)) < .14) return v - 1.4;
      if((y >= 10 && y <= 11) || (y >= 19 && y <= 20)) return METAL[cl(Math.round(v - (y & 1)*.6 + (bay(x, y) - .5)*.7), 0, 4)]; return v; } });
    ell(a, 12, 7, 7, 3, W, { fn:(x, y, nx, ny) => { const r = Math.hypot(nx, ny); return r > .78 ? W[1] : r > .62 ? W[3] : (Math.abs(x - 12) % 3 === 0 ? W[2] : W[3]); } });
    px(a, 10, 6, W[4]); px(a, 9, 7, W[4]); rc(a, 14, 6, 2, 1, W[1]);
  },
  crystal(a, P){                                                            // cristaux à facettes avec cœur lumineux
    const R5 = ramp(P), pr = (cx, base, hw, h) => { const top = base - h, sy = top + Math.round(hw*1.6);
      for(let y = top; y <= base; y++){ const w = y < sy ? Math.round(hw*(y - top + 1)/(sy - top + 1)) : hw;
        for(let x = -w; x <= w; x++){ const f = x/Math.max(1, hw), g = (y - top)/h; let v = f < -.34 ? 3.6 : f > .34 ? 1.2 : 2.6 - g*.9;
          if(y < sy && Math.abs(x) <= 1) v += .6; if(Math.abs(f + .1) < .18 && g > .3 && g < .8) v += 1.1; tone(a, cx + x, y, v, R5); } }
      line(a, cx - hw, sy, cx, top, R5[4]); px(a, cx - 1, top + 2, '#ffffff'); };
    pr(8, 28, 4, 16); pr(21, 29, 5, 21); pr(14, 31, 5, 27); pr(25, 31, 2, 8); pr(4, 31, 2, 7);
  },
  bush(a, P){                                                               // buisson touffu : feuilles, baies
    const R5 = [mix(P.d, P.o, .5), P.d, P.m, P.l, mix(P.l, '#ffffff', .4)], o = { tex:2.2, ts:1.6, seed:7 };
    ell(a, 8, 14, 7, 6, R5, o); ell(a, 22, 14, 7, 6, R5, o); ell(a, 15, 12, 11, 8.5, R5, o); ell(a, 11, 8, 6, 4.5, R5, o); ell(a, 19, 8, 5, 4, R5, o);
    [[7, 12], [13, 6], [21, 10], [17, 15], [10, 17], [24, 15], [15, 10]].forEach((q, i) => { rc(a, q[0], q[1], 2, 2, i % 2 ? P.g : '#e83a5a'); px(a, q[0], q[1], '#ffffff'); });
  },
  stump(a, P){                                                              // souche : écorce, cernes, racines, champignon
    const B = ['#2a180e', '#4e301c', '#6e4428', '#8e5e36', '#b07c4a'], T = ['#8a5a30', '#b07a44', '#d09a5a', '#e8bc7a', '#f6d8a0'];
    [[3, 19, 5, 2], [18, 19, 6, 2], [9, 20, 4, 2]].forEach(([x, y, w, h]) => ell(a, x + w/2, y, w/2 + 1, h, B, { tex:1 }));
    cyl(a, 13, 8, 8, 19, B, { w:y => 8 + (y > 16 ? 1 : 0), tex:2.2, sx:1.6, sy:.25, ts:2, seed:3 });
    ell(a, 13, 8, 8, 3.5, T, { fn:(x, y, nx, ny) => { const r = Math.hypot(nx, ny); if(r > .86) return B[3]; const ring = Math.floor(r*5 + vn(x, y, 3, 2)*.6); return ring % 2 ? T[2] : T[3]; } });
    line(a, 13, 8, 17, 6, T[0]); px(a, 13, 8, T[0]);
    rc(a, 20, 13, 3, 2, '#e8503c'); px(a, 20, 13, '#ffd0c0'); px(a, 22, 14, '#ffffff'); rc(a, 21, 15, 1, 2, '#f4e8d8');
  },
  pillar(a, P){                                                             // colonne cannelée : chapiteau, fût, base
    const R5 = ramp(P), moss = isMoss(P);
    for(let y = 2; y < 8; y++) for(let x = 2; x < 22; x++){ const v = y < 4 ? 3.6 : y === 7 ? 1 : x < 6 ? 3 : x > 18 ? 1.5 : 2.4; tone(a, x, y, v, R5); }
    rc(a, 4, 6, 16, 1, R5[1]); rc(a, 3, 2, 18, 1, R5[4]);
    cyl(a, 12, 6, 8, 31, R5, { tex:.6, fn:(x, y, nx, v) => { if((x - 6) % 3 === 2) v -= .9; if(moss && vn(x, y, 3, 9) > .62 && (y > 24 || y < 13)) return tone(a, x, y, v + .4, MOSS), null; return v; } });
    for(let y = 31; y < 38; y++) for(let x = 2; x < 22; x++){ const v = y === 31 || y === 34 ? 3.6 : y === 37 ? .8 : x < 6 ? 3 : x > 18 ? 1.4 : 2.3; tone(a, x, y, v, R5); }
    if(moss){ rc(a, 3, 36, 4, 1, MOSS[2]); px(a, 19, 7, MOSS[3]); }
  },
  ice(a, P){                                                                // bloc de glace : éclats translucides, cœur bleu, givre, bulles
    const I = ['#1e4a8a', '#2e78c4', '#4eaee8', '#9ae0fa', '#f4fdff'];
    const shard = (pts, base, depth) => { const yt = Math.min(...pts.map(q => q[1])); polyF(a, pts, (x, y) => { const g = (y - yt)/(depth || 20), n = vn(x, y, 3, 11);
      let v = base + 1.5 - g*2.8 + (n - .5)*1.1; if(((x*2 + y) % 11) === 0 && n > .45) v += 2; return I[cl(Math.round(v + (bay(x, y) - .5)*.7), 0, 4)]; }); };
    shard([[3, 25], [5, 14], [10, 9], [12, 25]], 1.8, 16);                         // éclat gauche (ombre)
    shard([[8, 25], [9, 10], [15, 2], [21, 8], [22, 25]], 2.6, 23);                // éclat central (face)
    shard([[18, 25], [20, 12], [25, 9], [27, 16], [26, 25]], 1.4, 16);             // éclat droit
    polyF(a, [[9, 10], [15, 2], [13, 12]], () => I[4]); polyF(a, [[15, 2], [21, 8], [16, 10]], () => I[3]);     // facettes du sommet
    line(a, 9, 10, 15, 2, '#ffffff'); line(a, 5, 14, 10, 9, '#ffffff'); line(a, 20, 12, 25, 9, '#ffffff');
    line(a, 12, 15, 17, 22, '#ffffff'); line(a, 17, 22, 19, 19, '#ffffff'); line(a, 14, 13, 16, 16, I[1]);       // fractures internes
    [[11, 19], [18, 15], [6, 20], [23, 18]].forEach(q => { px(a, q[0], q[1], '#ffffff'); px(a, q[0] + 1, q[1] + 1, I[2]); });
    for(let x = 3; x < 27; x++){ if(hash(x, 1, 3) < .7) px(a, x, 25, '#ffffff'); if(hash(x, 2, 3) < .4) px(a, x, 24, '#e4f6ff'); }     // givre au pied
  },
  cactus(a, P){                                                             // cactus : côtes, épines, fleur
    const R5 = ramp(P), rib = (x, y, nx, v) => { if(Math.abs(nx) < .9 && (x % 2 === 0)) v -= .7; if(hash(x, y, 4) > .93) return '#f8f0c8'; return v; };
    cyl(a, 12, 4, 6, 34, R5, { fn:rib }); ell(a, 12, 6, 4.5, 3, R5);
    cyl(a, 4, 2, 12, 20, R5, { fn:rib }); ell(a, 4, 12, 2.5, 2, R5); for(let x = 4; x < 9; x++){ tone(a, x, 20, 2.4, R5); tone(a, x, 21, 1.6, R5); }
    cyl(a, 20, 2, 15, 25, R5, { fn:rib }); ell(a, 20, 15, 2.5, 2, R5); for(let x = 15; x < 21; x++){ tone(a, x, 25, 2.2, R5); tone(a, x, 26, 1.4, R5); }
    rc(a, 10, 1, 4, 2, '#f06aa8'); px(a, 11, 1, '#ffd0e8'); px(a, 12, 2, '#ffe24a');
  },
  statue(a, P){                                                             // statue de gardien sur socle
    const R5 = ramp(P);
    for(let y = 31; y < 39; y++) for(let x = 3; x < 25; x++){ const v = y < 33 ? 3.6 : y === 38 ? .8 : x < 7 ? 3 : x > 20 ? 1.3 : 2.3; tone(a, x, y, v, R5); }
    rc(a, 6, 35, 16, 1, R5[1]); rc(a, 6, 34, 16, 1, R5[3]);
    ell(a, 14, 24, 8, 8.5, R5, { tex:.5 }); ell(a, 7, 27, 3, 4, R5); ell(a, 21, 27, 3, 4, R5);
    ell(a, 14, 13, 6.5, 5.5, R5, { tex:.4 }); polyF(a, [[8, 11], [8, 2], [12, 9]], (x, y) => R5[3]); polyF(a, [[20, 11], [20, 2], [16, 9]], (x, y) => R5[1]);
    rc(a, 11, 13, 2, 2, P.g); rc(a, 16, 13, 2, 2, P.g); px(a, 11, 13, '#ffffff'); px(a, 16, 13, '#ffffff'); rc(a, 12, 20, 5, 1, R5[1]); line(a, 10, 24, 14, 29, R5[1]);
  },
  snowman(a, P){                                                            // bonhomme de neige : écharpe, chapeau, bras en bois
    const S = ['#7eaedc', '#a8ccec', '#d4e8f8', '#f4faff', '#ffffff'];
    ell(a, 13, 25, 9, 7, S, { tex:.6 }); ell(a, 13, 15, 7, 6, S, { tex:.5 }); ell(a, 13, 8, 5, 5, S, { tex:.4 });
    line(a, 6, 15, 1, 11, '#6a4428'); line(a, 1, 11, 0, 9, '#6a4428'); line(a, 20, 15, 25, 12, '#6a4428'); px(a, 24, 11, '#6a4428');
    rc(a, 8, 2, 10, 2, '#2a2a3a'); rc(a, 10, -1 + 0, 6, 3, '#2a2a3a'); rc(a, 10, 1, 6, 1, P.g); px(a, 10, 0, '#4a4a5a');
    for(let x = 7; x < 20; x++){ px(a, x, 12, x < 10 ? shade(P.g, .25) : P.g); px(a, x, 13, shade(P.g, -.25)); }
    rc(a, 16, 13, 3, 6, P.g); rc(a, 18, 13, 1, 6, shade(P.g, -.3)); [16, 18].forEach(x => px(a, x, 19, '#ffffff'));
    px(a, 11, 7, '#14101c'); px(a, 15, 7, '#14101c'); rc(a, 13, 8, 3, 1, '#f08a2c'); px(a, 16, 8, '#c8601c');
    [[13, 18], [13, 23], [13, 27]].forEach(q => { px(a, q[0], q[1], '#14101c'); px(a, q[0], q[1] - 1, '#4a4a5a'); });
  },
  column(a, P){                                                             // orgues de basalte + veines de magma
    const R5 = ramp(P), hexc = (cx, base, hw, h) => { const top = base - h;
      for(let y = top; y <= base; y++) for(let x = -hw; x <= hw; x++){ const f = x/hw; let v = f < -.4 ? 3 : f > .4 ? 1 : 2; v += (vn(cx + x, y, 2, 6) - .5)*.8;
        if(Math.abs(f) < .15 && hash(cx + x, y, 2) > .55 && y > top + 3) { px(a, cx + x, y, y % 3 ? P.g : '#ffd23c'); continue; } tone(a, cx + x, y, v, R5); }
      for(let x = -hw; x <= hw; x++) for(let y = top - 2; y < top + 1; y++) tone(a, cx + x, y, 3.8 - Math.abs(x)/hw, R5); };
    hexc(8, 30, 5, 16); hexc(21, 30, 5, 22); hexc(14, 32, 5, 28);
    [[14, 3], [21, 7], [8, 13]].forEach(q => { px(a, q[0], q[1], '#ffd23c'); px(a, q[0] + 1, q[1], P.g); });
  }
};
window.V6O = { ell, cyl, polyF, ramp, tone, mix, lit };
for(const k in NEW) if(OBS[k]) OBS[k].build = NEW[k];
// nouvel obstacle : candélabre (cathédrale)
OBS.cand = { r:13, hp:70, w:22, h:42, ay:37, glow:1, sh:[11, 38, 7, 2], build(a, P){
  const G5 = ramp(OPAL.gold);
  ell(a, 11, 36, 6, 2.5, G5); cyl(a, 11, 1, 14, 35, G5); ell(a, 11, 24, 2.5, 1.5, G5);
  for(let x = 3; x < 20; x++){ const y = 16 - Math.round(Math.sin((x - 3)/16*3.1416)*4); tone(a, x, y, 3, G5); tone(a, x, y + 1, 1.4, G5); }
  [[4, 15], [11, 11], [18, 15]].forEach(([x, y]) => { ell(a, x, y, 2, 1, G5); rc(a, x - 1, y - 6, 3, 5, '#f4ecd8'); px(a, x - 1, y - 6, '#ffffff'); px(a, x + 1, y - 3, '#c8bca8');
    rc(a, x, y - 9, 1, 3, '#ffb040'); px(a, x, y - 10, '#fff0a0'); px(a, x, y - 7, '#ffe060'); });
} };
})();
