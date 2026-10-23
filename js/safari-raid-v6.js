// ============================================================
//  safari-raid-v6.js — refonte du Stade du Raid et des 6 cartes du Safari
//    Même principe que arenes-v6.js : on repeint le décor, on ajoute des calques animés (sol / au-dessus) et des lumières.
//    Rien ne change pour le jeu (collisions, obstacles, zones).
// ============================================================
(function(){
if(/arenes=old/.test(location.search) || !window.V6K || !window.V6O) return;
const { mk, RGB, cl, pix, vor, inField, P, DV, T, vis, CX, CY, pondFrames, drawPonds, crowdV6 } = V6K;
const { ell, cyl, polyF, ramp, tone, mix } = V6O;

// ---------- végétation commune ----------
const LEAFS = [['#1e4a24', '#2e6a30', '#46903e', '#66b450', '#9ad870'], ['#24461e', '#3a6428', '#5a8a34', '#80b048', '#b4d870'], ['#1c2a1c', '#2e4426', '#46602e', '#62803a', '#8aa458']];
function tree(a, x, y, s, L){                                            // arbre feuillu ombré, feuillage texturé
  shadowPx(a, x + 4, y + 2, Math.round(s*1.2), Math.max(2, Math.round(s*.38)), 'rgba(0,0,0,.3)');
  cyl(a, x, 1.5, y - s, y, ['#2a180e', '#4e301c', '#6e4428', '#8e5e36', '#b07c4a'], { tex:1.5, sx:2, sy:.3 });
  const o = { tex:2.4, ts:1.5, seed:x + y };
  ell(a, x - s*.55, y - s*1.05, s*.62, s*.5, L, o); ell(a, x + s*.55, y - s*1.1, s*.62, s*.5, L, o); ell(a, x, y - s*1.45, s, s*.82, L, o); ell(a, x - s*.2, y - s*1.8, s*.5, s*.36, L, o);
}
function pine(a, x, y, s, snow){
  shadowPx(a, x + 3, y + 2, Math.round(s*.9), Math.max(2, Math.round(s*.3)), 'rgba(0,0,0,.28)'); rc(a, x - 1, y - 4, 3, 5, '#4a2e1c');
  const G = ['#10281c', '#1a3c2a', '#24543a', '#347a50', '#5aa070'];
  for(let k = 0; k < 3; k++){ const top = y - 3 - s*(1 + k*.55), w = s*(.95 - k*.22), b = y - 3 - s*k*.5;
    polyF(a, [[x, top], [x + w, b], [x - w, b]], (X, Y) => { const f = (X - x)/w, v = f < -.2 ? 3 : f > .35 ? 1 : 2; return (Y - top) % 3 === 0 && Math.abs(f) > .3 ? G[0] : G[cl(Math.round(v + (bay(X, Y) - .5)*.8 + (hash(X, Y, 3) - .5)), 0, 4)]; });
    if(snow){ polyF(a, [[x, top - 1], [x + w*.5, top + (b - top)*.5], [x - w*.5, top + (b - top)*.5]], (X, Y) => X < x ? '#ffffff' : '#d8ecfa'); for(let X = Math.round(x - w*.9); X < x + w*.6; X++) if(hash(X, k, 4) > .3) px(a, X, Math.round(b - 1), '#f4faff'); } }
}
function borderV6(a, R, fn, step){ for(let x = -6; x < PW + 10; x += step + R()*step*.6){ fn(x | 0, 10 + R()*10 | 0, R); fn(x | 0, PH - 2 - R()*6 | 0, R); }
  for(let y = 30; y < PH - 20; y += step + R()*step*.6){ fn(4 + R()*6 | 0, y | 0, R); fn(PW - 6 - R()*6 | 0, y | 0, R); } }
// hautes herbes qui ondulent au vent (3 images : penchées à gauche, droites, à droite)
const TUFT = [-1, 0, 1].map(lean => { const c = mk(9, 10), a = c.getContext('2d');
  [[1, 7, '#2e7a30'], [3, 9, '#3e9a3c'], [5, 8, '#2e7a30'], [7, 6, '#46a842']].forEach(([x, h, col]) => { for(let i = 0; i < h; i++){ const X = x + (i > h*.5 ? lean : 0) + (i > h*.8 ? lean : 0); px(a, X, 9 - i, i > h - 3 ? '#9ae07a' : col); } });
  return c; });
const TUFT_D = [-1, 0, 1].map(lean => { const c = mk(9, 10), a = c.getContext('2d');
  [[1, 7, '#4a5a2a'], [3, 9, '#5a6a30'], [5, 8, '#4a5a2a'], [7, 6, '#6a7a38']].forEach(([x, h, col]) => { for(let i = 0; i < h; i++){ const X = x + (i > h*.5 ? lean : 0) + (i > h*.8 ? lean : 0); px(a, X, 9 - i, i > h - 3 ? '#b8c070' : col); } });
  return c; });
function tufts(R, test, n){ const L = []; for(let i = 0; i < n; i++){ const x = FX0 + 6 + R()*(FX1 - FX0 - 12), y = FY0 + 8 + R()*(FY1 - FY0 - 12); if(test(x | 0, y | 0)) L.push([x | 0, y | 0]); } return L.sort((p, q) => p[1] - q[1]); }
function drawTufts(L, t, S, wind){ for(const [x, y] of L){ if(!vis(x, y, 20)) continue; const w = Math.sin(t*(wind || 1.6) - x*.045 + y*.02); ctx.drawImage(S[w > .45 ? 2 : w < -.45 ? 0 : 1], (x - 4)*2, (y - 9)*2, 18, 20); } }
// ombre de nuage + papillons (comme la prairie)
const CLOUD = pix(150, 90, (x, y) => { const q = ((x - 75)/72)**2 + ((y - 45)/40)**2 + (vn(x, y, 22, 5) - .5)*.9; return q < .82 || (q < 1 && bay(x, y) < (1 - q)*5) ? [8, 28, 12, 46] : null; });
function clouds(t, k){ for(let i = 0; i < 3; i++){ const x = ((t*(k || 7) + i*260) % (PW + 300)) - 150, y = 30 + i*110 + Math.sin(i*3)*20; ctx.drawImage(CLOUD, Math.round(x)*2, Math.round(y)*2, 300, 180); } }
function butterflies(t, n){ for(let i = 0; i < n; i++){ const x = CX + Math.sin(t*.23 + i*1.7)*230 + Math.sin(t*1.1 + i)*16, y = CY + Math.sin(t*.31 + i*2.3)*120 + Math.cos(t*.9 + i*3)*10;
  if(!vis(x, y)) continue; const op = Math.sin(t*14 + i*2) > 0, c = ['#ffffff', '#ffe24a', '#f8a8d0', '#a8d8ff'][i%4]; P(x + 1, y + 9, 2, 1, 'rgba(0,0,0,.22)');
  if(op){ P(x - 2, y - 1, 2, 2, c); P(x + 2, y - 1, 2, 2, c); } else { P(x - 1, y - 2, 1, 2, c); P(x + 2, y - 2, 1, 2, c); } P(x, y - 1, 2, 3, '#2a1a20'); } }
function crownSet(){ return [-.07, 0, .07].map((da, n) => { const c = mk(58, 48), q = c.getContext('2d'), cx = 29, cy = 16;
  for(let f = 0; f < 8; f++){ const an = f*.785 + .2 + da*(f%2 ? 1 : -1), dx = Math.cos(an), dy = Math.sin(an)*.62, L = 24 - (f%2)*3, dr = 7 + n;
    const tip = [cx + dx*L, cy + dy*L + dr], mid = [cx + dx*L*.5, cy + dy*L*.5 + dr*.3], nx = -dy*4, ny = dx*2.6;
    polyPx(q, [[cx, cy], [mid[0] + nx, mid[1] + ny], tip, [mid[0] - nx, mid[1] - ny]], f%2 ? '#3e8e3a' : '#4ea444'); polyPx(q, [[cx, cy], [mid[0] + nx*.5, mid[1] + ny*.5 - 1], tip, mid], f%2 ? '#58ac48' : '#6cc058');
    line(q, cx, cy, Math.round(tip[0]), Math.round(tip[1]), '#2a6a2c'); }
  blob3(q, cx - 2, cy + 1, 2, 2, { l:'#c8945a', m:'#8a5a2c', d:'#5a3a18' }); blob3(q, cx + 2, cy + 2, 2, 2, { l:'#c8945a', m:'#8a5a2c', d:'#5a3a18' }); outlinePx(c, '#1a3a1a'); return c; }); }
function puff(x, y, r, col, al){ ctx.globalAlpha = al; for(let j = -r; j <= r; j++){ const w = Math.round(Math.sqrt(r*r - j*j)); if(w > 0) P(x - w, y + j, w*2, 1, col); } ctx.globalAlpha = 1; }
function ripple(x, y, r, col, al){ ctx.globalAlpha = al; for(let s = 0; s < 6.283; s += .35) P(x + Math.cos(s)*r, y + Math.sin(s)*r*.5, 1, 1, col); ctx.globalAlpha = 1; }

// ============================================================ STADE DU RAID (nuit, sceau rouge, projecteurs)
const RAIDV = { amb:.2, crowd:RAID_TH,
  paint(a, R, D){
    const L = [[FX0 + 30, FY0 + 20], [FX1 - 30, FY0 + 20], [FX0 + 30, FY1 - 18], [FX1 - 30, FY1 - 18]];
    paintField(a, ['#0a1c10', '#0f2616', '#14301b', '#193a20', '#204627', '#2a5632', '#36663c', '#3a1012', '#7a1418', '#c8282a', '#14101a'], (x, y) => {
      const dx = x - CX, dy = (y - CY)*1.3, d = Math.hypot(dx, dy);
      if(d < 80 && d > 76) return 10; if(d <= 76 && d > 74) return 8;
      let light = 0; for(const [lx, ly] of L){ const q = Math.hypot(x - lx, (y - ly)*1.2); if(q < 90) light = Math.max(light, 1 - q/90); }
      let i = ((x/32) | 0) & 1 ? 1 : 2; const t = vn(x, y, 30, 7)*.7 + vn(x, y, 6, 8)*.3 + (bay(x, y) - .5)*.14; if(t > .64) i++; else if(t < .34) i--;
      if(light > .55) i += 3; else if(light > .3) i += 2; else if(light > .1) i++; if(d < 74) i = Math.max(0, i - 1);
      if(hash(x, y, 5) < .03) i--; return cl(i, 0, 6); });
    scatter(a, R, 300, (x, y) => { px(a, x, y, '#0a1a0e'); px(a, x, y - 1, '#2e5a32'); });
    pitchLines(a, 'rgba(230,240,230,.28)', .25, { inset:8, r:0, r2:0, box:[54, 44] });
    // sceau gravé (sombre) ; ses runes lumineuses tournent dans D.ring
    for(let k = 0; k < 24; k++){ const an = k/24*6.283; line(a, Math.round(CX + Math.cos(an)*40), Math.round(CY + Math.sin(an)*40/1.3), Math.round(CX + Math.cos(an)*70), Math.round(CY + Math.sin(an)*70/1.3), '#1a0a0e', .3); }
    D.ring = pix(170, 170, (x, y) => { const dx = x - 85, dy = y - 85, d = Math.hypot(dx, dy), an = Math.atan2(dy, dx);
      if(Math.abs(d - 72) < 1.3 || Math.abs(d - 58) < .9) return [255, 96, 70, 255];
      if(d > 60 && d < 70){ const s = (an + Math.PI)/(Math.PI*2)*20, f = s % 1, g = (s | 0) % 4; if(f > .25 && f < .75 && ((g === 0 && Math.abs(d - 65) < 3.5 && Math.abs(f - .5) < .1) || (g === 1 && Math.abs(d - 65 - (f - .5)*8) < 1) || (g === 2 && (Math.abs(d - 62) < .8 || Math.abs(d - 68) < .8)) || (g === 3 && Math.abs(f - .5) < .08))) return [255, 190, 150, 255]; }
      if(d < 56 && d > 20 && Math.abs(((an*4/Math.PI) % 1 + 1) % 1 - .5) < .03) return [200, 30, 40, 255];
      if(Math.abs(d - 20) < .8) return [255, 96, 70, 255]; return null; });
    // fissures d'énergie qui partent du sceau
    const cr = mk(PW, PH), cq = cr.getContext('2d'); for(let k = 0; k < 8; k++){ let x = CX + Math.cos(k*.785 + .3)*74, y = CY + Math.sin(k*.785 + .3)*57, an = k*.785 + .3; for(let i = 0; i < 70; i++){ an += (R() - .5)*.6; x += Math.cos(an); y += Math.sin(an)*.8; px(cq, Math.round(x), Math.round(y), i % 2 ? '#ff4a3a' : '#ffb08a'); if(R() < .03){ let bx = x, by = y, ba = an + (R() - .5)*2; for(let j = 0; j < 18; j++){ ba += (R() - .5)*.5; bx += Math.cos(ba); by += Math.sin(ba)*.8; px(cq, Math.round(bx), Math.round(by), '#ff4a3a'); } } } }
    a.globalAlpha = .55; a.drawImage(cr, 0, 0); a.globalAlpha = 1; D.cracks = cr;
    D.fog = pix(160, 70, (x, y) => { const q = ((x - 80)/78)**2 + ((y - 35)/32)**2 + (vn(x, y, 16, 9) - .5)*.8; return q < .7 || (q < 1 && bay(x, y) < (1 - q)*3) ? [140, 20, 30, 40] : null; });
  },
  ground(D){
    const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = .35 + .35*Math.sin(t*2.4); DV(D.cracks);
    ctx.globalAlpha = 1; ctx.translate(CX*2, CY*2); ctx.scale(1, 1/1.3); ctx.rotate(t*.15); ctx.drawImage(D.ring, -170, -170, 340, 340); ctx.globalAlpha = .5 + .5*Math.sin(t*3); ctx.drawImage(D.ring, -170, -170, 340, 340); ctx.restore();
  },
  top(D){
    const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
    [[0, 0, 1], [PW, 0, -1]].forEach(([x0, y0, s], k) => { const an = 1.0 + Math.sin(t*.4 + k*2)*.45, L = 420, w = .09;
      ctx.fillStyle = k ? 'rgba(255,80,70,.07)' : 'rgba(255,240,220,.06)'; ctx.beginPath(); ctx.moveTo(x0*2, y0*2);
      ctx.lineTo((x0 + s*Math.cos(an - w)*L)*2, (y0 + Math.sin(an - w)*L)*2); ctx.lineTo((x0 + s*Math.cos(an + w)*L)*2, (y0 + Math.sin(an + w)*L)*2); ctx.closePath(); ctx.fill(); });
    ctx.restore();
    for(let i = 0; i < 4; i++){ const x = ((t*5 + i*190) % (PW + 200)) - 100, y = 50 + i*80; ctx.drawImage(D.fog, Math.round(x)*2, Math.round(y)*2, 320, 140); }
    // bâtons lumineux dans le public
    for(let i = 0; i < 40; i++){ const x = 20 + hash(i, 1, 6)*(PW - 40), y = hash(i, 2, 6) < .7 ? 4 + hash(i, 3, 6)*12 : PH - 8; if(!vis(x, y)) continue; const s = Math.round(Math.sin(t*4 + i)*2);
      P(x + s, y - 3, 1, 3, i % 3 ? '#ff4a4a' : '#ffd23c'); P(x + s, y - 4, 1, 1, '#ffffff'); }
  },
  lights(L){ const t = T(); L(CX*2, CY*2, 200, '#ff3a3a', .3 + .2*Math.sin(t*3));
    [[FX0 + 30, FY0 + 20], [FX1 - 30, FY0 + 20], [FX0 + 30, FY1 - 18], [FX1 - 30, FY1 - 18]].forEach(([x, y], k) => L(x*2, y*2, 160, '#e8f0ff', .3 + .03*Math.sin(t*20 + k))); }
};

// ============================================================ SAFARI
// --- Plaine sauvage : hautes herbes qui ondulent, chemin de terre, arbres ombrés, papillons, nuages
const HERBES = { amb:.03,
  paint(a, R, D){
    const path = x => PH*.52 + Math.sin(x*.012)*40 + Math.sin(x*.031)*10;
    paintField(a, ['#2c6430', '#387a38', '#468e40', '#55a449', '#66b855', '#8a6a40', '#a88a58', '#c0a46c', '#6a5030', '#d8c088'], (x, y) => {
      const d = Math.abs(y - path(x)) + (vn(x, y, 6, 4) - .5)*4;
      if(d < 12){ if(d > 10) return 8; const rut = Math.abs(Math.abs(y - path(x)) - 5) < 1; if(rut) return 5; return hash(x, y, 8) < .06 ? 9 : hash(x, y, 9) < .3 ? 7 : 6; }
      if(d < 14) return 1;
      const t = vn(x, y, 34, 3)*.75 + vn(x, y, 7, 6)*.25 + (bay(x, y) - .5)*.12; let i = t > .64 ? 3 : t > .42 ? 2 : 1; if(hash(x, y, 5) < .04) i--; else if(hash(x, y, 5) > .97) i++; return cl(i, 0, 4); });
    scatter(a, R, 50, (x, y, r) => { const c = ['#ffffff', '#f8c0dc', '#ffe24a', '#b8a0ff'][(r()*4) | 0]; for(let k = 0; k < 4; k++){ const fx = x + ((r()*10) | 0) - 5, fy = y + ((r()*8) | 0) - 4; px(a, fx, fy - 1, c); px(a, fx - 1, fy, c); px(a, fx + 1, fy, c); px(a, fx, fy, '#f0a030'); } });
    scatter(a, R, 300, (x, y) => { px(a, x, y, '#2a5e2c'); px(a, x, y - 1, '#7cc862'); });
    D.tall = tufts(R, (x, y) => vn(x, y, 22, 5) > .6 && Math.abs(y - path(x)) > 16, 2600);
    D.tall.forEach(([x, y]) => shadowPx(a, x, y + 1, 4, 1, 'rgba(10,40,10,.35)'));
    borderV6(a, R, (x, y, r) => tree(a, x, y + 8, 12 + (r()*5 | 0), LEAFS[r() < .5 ? 0 : 1]), 30);
  },
  ground(D){ drawTufts(D.tall, T(), TUFT); },
  top(D){ const t = T(); butterflies(t, 6); clouds(t); }
};
// --- Volcan : basalte, rivières de lave qui coulent, cheminées qui fument, braises
const VOLC = { amb:.36, riv:[x => PH*.25 + Math.sin(x*.02)*18, x => PH*.8 + Math.sin(x*.017 + 2)*16], vents:[[150, 140], [470, 230], [300, 300], [520, 120]],
  paint(a, R, D){
    const dist = (x, y) => Math.min(...D.riv.map(f => Math.abs(y - f(x)) + (hash(x, y, 2) - .5)*2 + (vn(x, y, 8, 3) - .5)*3));
    paintField(a, ['#1c1420', '#261c2c', '#30243a', '#3c2e48', '#4a3a58', '#0c080e', '#5a2a1a', '#8a3a1a', '#2a0e08'], (x, y) => {
      const d = dist(x, y); if(d < 9) return 8; if(d < 11) return 7; if(d < 13) return 6;
      const v = vor(x, y, 16, 71); if(v.e < 1.2) return 5;
      let i = v.id > .8 ? 3 : v.id < .25 ? 1 : 2; if(v.e < 2.8) i += v.dx + v.dy > 0 ? -1 : 1; if(d < 22 && bay(x, y) < .4) i++; return cl(i, 0, 4); });
    cracks(a, R, 14, 50, ['#ff7a2c', '#ffd23c', '#8a2a1c', 1]);
    D.vents.forEach(([x, y]) => { blob3(a, x, y, 7, 4, OPAL.lava); blob3(a, x, y - 1, 4, 2, { l:'#1a1016', m:'#0c080e', d:'#0c080e' }); px(a, x - 1, y - 1, '#ff7a2c'); px(a, x + 1, y - 1, '#ffd23c'); });
    borderV6(a, R, (x, y, r) => { const s = 7 + (r()*6 | 0); ell(a, x, y - s*.4, s + 3, s, ramp(OPAL.lava), { facet:3, tex:.8 }); px(a, x - 2, y - s + 2, '#ff9a3c'); }, 22);
    const L = ['#3a1210', '#7a1e0c', '#d8400c', '#ff7a1c', '#ffc040', '#fff0a0'].map(RGB);
    D.lava = []; for(let k = 0; k < 8; k++){ const ph = k/8*6.283; D.lava.push(pix(PW, PH, (x, y) => { const d = dist(x, y); if(d >= 9) return null;
      const u = vn(x, y, 9, 64)*.5 + .5*(.5 + .5*Math.sin(x*.12 - ph + y*.03)) + (vn(x + k*2, y, 4, 65) - .5)*.25; if(d > 7) return L[4];
      return L[u > .8 ? 5 : u > .66 ? 4 : u > .52 ? 3 : u > .4 ? 2 : u > .3 ? 1 : 0]; })); }
  },
  ground(D){ DV(D.lava[Math.floor(T()*5) % 8]); },
  top(D){ const t = T();
    D.vents.forEach(([x, y], k) => { for(let i = 0; i < 6; i++){ const u = (t*.35 + i/6 + k*.13) % 1; if(!vis(x, y - u*60)) continue; puff(x + Math.sin(t + i + k)*4 + u*10, y - 4 - u*60, 2 + u*7 | 0, u < .2 ? '#ff9a5a' : '#6a6070', (1 - u)*.45); } });
    for(let i = 0; i < 60; i++){ const u = (t*.18 + hash(i, 1, 3)) % 1, x = hash(i, 2, 3)*PW + Math.sin(t*1.5 + i)*6, y = hash(i, 3, 3)*PH - u*80; if(!vis(x, y)) continue; ctx.globalAlpha = 1 - u; P(x, y, 1, 1, u < .3 ? '#ffe07a' : '#ff7a2c'); } ctx.globalAlpha = 1; },
  lights(L){ const t = T(); D_(this).riv.forEach((f, k) => { for(let x = 0; x < PW; x += 26) L(x*2, f(x)*2, 80, '#ff6a1c', .45 + .1*Math.sin(t*2 + x + k)); });
    D_(this).vents.forEach(([x, y], k) => L(x*2, y*2, 50, '#ff8a3a', .4 + .2*Math.sin(t*5 + k))); }
};
// --- Lagon : mer et lagune animées (vagues, écume, reflets), palmiers qui se balancent, coquillages
const LAG = { amb:.02,
  water:(x, y) => Math.max(1.05 - (((x - PW*.66)/150)**2 + ((y - PH*.46)/78)**2)*.45 + (vn(x, y, 40, 23) - .5)*.25, (y - PH*.82)/PH*3 + .8 + (vn(x, y, 30, 27) - .5)*.2),
  paint(a, R, D){
    const W = D.water;
    paintField(a, ['#e2c088', '#ecd09a', '#f4dcae', '#d0aa70', '#b8925a', '#2a88c0'], (x, y) => { const w = W(x, y); if(w > .74) return w > .8 ? 5 : 4;
      if(w > .7) return 3; const t = vn(x, y, 20, 26)*.7 + vn(x, y, 5, 28)*.3 + (bay(x, y) - .5)*.2; return t > .62 ? 2 : t < .32 ? 0 : 1; });
    scatter(a, R, 40, (x, y, r) => { if(W(x, y) > .7) return; if(r() < .5){ px(a, x, y, '#fff4e0'); px(a, x + 1, y, '#e8a0a0'); px(a, x, y + 1, '#c89a6a'); } else { [[0, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]].forEach(d => px(a, x + d[0], y + d[1], '#f08a5a')); px(a, x, y, '#ffb08a'); } });
    for(let i = 0; i < 18; i++){ const x = 120 + i*9, y = 300 - i*4 + Math.sin(i)*3; if(W(x, y) < .7){ px(a, x, y, '#c8a068'); px(a, x + 2, y + 2, '#c8a068'); } }      // traces de pas
    D.palms = []; borderV6(a, R, (x, y, r) => { if(W(x, y) > .7) return; if(r() < .55){ D.palms.push([x, y + 8]); shadowPx(a, x + 8, y + 10, 14, 3, 'rgba(60,30,0,.2)'); } else ell(a, x, y, 9, 7, LEAFS[0], { tex:2.2, ts:1.5 }); }, 28);
    D.crown = crownSet();
    const C = ['#bff2fa', '#6ad6ee', '#3ab4e0', '#2a8ec8', '#1e6aa8', '#ffffff', '#e8fcff'].map(RGB);
    D.sea = []; for(let k = 0; k < 8; k++){ const ph = k/8*6.283; D.sea.push(pix(PW, PH, (x, y) => { const w = W(x, y), foam = .755 + .02*Math.sin(ph + x*.03);
      if(w < foam - .012) return null; if(w < foam + .01) return hash(x, y, k) < .75 ? C[5] : C[6];
      const deep = cl((w - .78)/.3, 0, 1), cs = Math.abs(Math.sin(x*.21 + Math.sin(y*.13 + ph)*1.6 + ph)) + Math.abs(Math.sin(y*.27 - x*.07 - ph));
      if(cs < .22 && deep < .7) return C[0]; if(hash(x, y, k*3) > .996) return C[5];
      return C[cl(1 + Math.round(deep*3 + (bay(x, y) - .5)*.8 + (vn(x, y, 7, 30 + (k & 1)) - .5)*.6), 1, 4)]; })); }
  },
  ground(D){ DV(D.sea[Math.floor(T()*5) % 8]); },
  top(D){ const t = T(); D.palms.forEach(([x, y], k) => { if(!vis(x, y - 20, 80)) return; const dir = k & 1 ? -1 : 1;
      for(let i = 0; i < 22; i++){ const xx = x + Math.round(Math.sin(i/22*1.6)*4*dir); P(xx - 1, y - i, 4, 1, i%4 === 0 ? '#5a3a20' : '#8a6038'); P(xx - 1, y - i, 1, 1, '#b08050'); }
      const c = D.crown[Math.min(2, Math.floor((Math.sin(t*1.1 + k*1.7) + 1)*1.5))]; ctx.drawImage(c, (x + 4*dir - 29)*2, (y - 22 - 16)*2, c.width*2, c.height*2); });
    for(let i = 0; i < 3; i++){ const x = ((t*12 + i*230) % (PW + 60)) - 30, y = 60 + i*50 + Math.sin(t + i)*10; if(!vis(x, y)) continue; const f = Math.sin(t*6 + i) > 0 ? 1 : 0; P(x - 3, y - f, 3, 1, '#f4f4f4'); P(x + 1, y - f, 3, 1, '#f4f4f4'); P(x, y, 1, 1, '#c8c8c8'); P(x - 1 + 8, y + 40, 4, 1, 'rgba(0,0,0,.15)'); } }   // mouettes
};
// --- Toundra : neige profonde, étang gelé brillant, sapins enneigés, tempête de neige
const TOUN = { amb:.08, refl:.26,
  paint(a, R, D){
    const pond = (x, y) => ((x - PW*.5)/170)**2 + ((y - PH*.5)/70)**2 + (vn(x, y, 30, 41) - .5)*.4; D.pond = pond;
    paintField(a, ['#c4d8ec', '#d6e6f4', '#e6f0fa', '#f4f9ff', '#ffffff', '#5a92c4', '#76acd8', '#98c8ea', '#b8def4', '#e8f8ff', '#a8c4de'], (x, y) => {
      const p = pond(x, y);
      if(p < .55){ const gl = ((x*.5 - y + 900) % 90); let i = 6; const t = vn(x, y, 24, 44) + (bay(x, y) - .5)*.15; if(t > .7) i++; if(gl < 6) i += 2; else if(gl < 10) i++; if(p > .48) i = 8; return hash(x, y, 9) > .997 ? 9 : cl(i, 5, 9); }
      if(p < .6) return bay(x, y) < .5 ? 10 : 3;
      const t = vn(x, y, 30, 43)*.7 + vn(x, y, 6, 45)*.3 + (bay(x, y) - .5)*.16; return t > .66 ? 4 : t > .5 ? 3 : t > .34 ? 2 : t > .2 ? 1 : 0; });
    cracks(a, R, 7, 40, ['#ffffff', '#e8f8ff', '#4a7ab0']);
    for(let i = 0; i < 26; i++){ const x = 80 + i*13, y = 90 + Math.sin(i*.6)*14; if(pond(x, y) > .62){ blob3(a, x, y, 1.5, 1, { l:'#b8cce0', m:'#a0b8d0', d:'#8aa4c0' }); } }   // traces dans la neige
    borderV6(a, R, (x, y, r) => pine(a, x, y + 8, 9 + (r()*5 | 0), true), 22);
  },
  ground(D){ const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; const sx = ((t*40) % 900) - 150;
    for(let y = 0; y < PH; y += 2){ const x = sx + y*.5; if(D.pond(x | 0, y) < .55 && vis(x, y)){ ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.fillRect(Math.round(x)*2, y*2, 16, 4); } } ctx.restore();
    for(let i = 0; i < 14; i++){ const u = (t*.3 + hash(i, 1, 7)) % 1, x = (hash(i, 2, 7)*PW + t*80) % PW, y = hash(i, 3, 7)*PH; if(!vis(x, y)) continue; ctx.globalAlpha = Math.sin(u*3.14)*.7; P(x, y, 12, 1, '#ffffff'); P(x + 5, y - 1, 6, 1, '#f4faff'); } ctx.globalAlpha = 1; },
  top(){ const t = T(); for(let i = 0; i < 110; i++){ const z = 1 + (i%3), x = ((hash(i, 1, 2)*PW + t*(26 + z*14) + Math.sin(t + i)*8) % PW), y = ((hash(i, 2, 2)*PH + t*(16 + z*10)) % PH); if(!vis(x, y)) continue; ctx.globalAlpha = .5 + z*.16; P(x, y, z > 2 ? 2 : 1, z > 2 ? 2 : 1, '#ffffff'); } ctx.globalAlpha = 1; }
};
// --- Col rocheux : roche naturelle, herbe dans les fissures, torrent avec cascade, ombre d'aigle
const MONT = { amb:.06,
  sx:y => 160 + Math.sin(y*.022)*22,
  paint(a, R, D){
    const sx = D.sx;
    paintField(a, ['#6a5e54', '#7e7264', '#928674', '#a89a86', '#bcae98', '#3e342e', '#4a7a3a', '#68a048', '#8ab85a', '#5a4a3a'], (x, y) => {
      const ds = Math.abs(x - sx(y)); if(ds < 9) return 9; if(ds < 11) return 5;
      const v = vor(x, y, 24, 81), n = (vn(x, y, 7, 82) - .5)*.9;
      if(v.e < 1.6) return vn(x, y, 20, 83) > .55 ? (hash(x, y, 84) < .5 ? 6 : 7) : 5;
      if(v.e < 3 && vn(x, y, 20, 83) > .62 && bay(x, y) < .5) return 7;
      let i = v.id > .75 ? 3 : v.id < .25 ? 1 : 2; if(v.e < 3.4) i += v.dx + v.dy > 0 ? -1 : 1; i += n > .3 ? 1 : n < -.3 ? -1 : 0; return cl(i, 0, 4); });
    scatter(a, R, 30, (x, y, r) => { if(Math.abs(x - sx(y)) < 14) return; ell(a, x, y, 2 + (r()*2 | 0), 1.6, ramp(OPAL.stone), { facet:2 }); });
    scatter(a, R, 40, (x, y) => { if(Math.abs(x - sx(y)) < 14) return; [[-1, 0], [1, 0], [0, -1]].forEach(d => px(a, x + d[0], y + d[1], '#5a9a44')); px(a, x, y - 2, '#ffe24a'); });
    const by = CY + 40; for(let x = Math.round(sx(by)) - 14; x < sx(by) + 14; x++){ rc(a, x, by - 6, 1, 13, x % 3 ? '#8a5e36' : '#5a3a20'); px(a, x, by - 6, '#b07c4a'); } rc(a, sx(by) - 14 | 0, by - 7, 28, 1, '#3e2414'); rc(a, sx(by) - 14 | 0, by + 7, 28, 1, '#3e2414');   // pont
    D.bridge = by;
    borderV6(a, R, (x, y, r) => { const s = 9 + (r()*7 | 0); ell(a, x, y - s*.3, s + 4, s, ramp(OPAL.stone), { facet:3, tex:1 }); if(r() < .4) pine(a, x + 6, y + 2, 8, false); }, 24);
    const C = ['#e8fbff', '#9ad8f4', '#58b0e0', '#3a88c4', '#2a6aa8', '#ffffff'].map(RGB);
    D.water = []; for(let k = 0; k < 8; k++){ const ph = k/8*6.283; D.water.push(pix(PW, PH, (x, y) => { const ds = Math.abs(x - sx(y)); if(ds >= 9 || (Math.abs(y - by) < 7)) return null;
      if(y < 12) return hash(x, y + k*7, 3) < .6 ? C[5] : C[1];                                    // cascade
      const v = Math.sin(y*.35 - ph*1.0 + x*.2) + (vn(x, y - k*3, 4, 90) - .5)*1.6; if(ds > 7) return v > .2 ? C[5] : C[1];
      return v > 1.1 ? C[0] : v > .4 ? C[2] : v > -.5 ? C[3] : C[4]; })); }
  },
  ground(D){ DV(D.water[Math.floor(T()*7) % 8]); },
  top(D){ const t = T(), x = CX + Math.cos(t*.25)*200, y = CY + Math.sin(t*.25)*110, an = t*.25 + Math.PI/2, f = Math.sin(t*3) > 0 ? 1 : 0;   // ombre d'aigle
    ctx.globalAlpha = .22; for(let i = -9; i <= 9; i++){ const w = Math.abs(i) < 2 ? 3 : 1, yy = Math.abs(i)*(f ? -.3 : .2); P(x + Math.cos(an)*i - Math.sin(an)*yy, y + Math.sin(an)*i + Math.cos(an)*yy, 1, w, '#000000'); } ctx.globalAlpha = 1;
    for(let i = 0; i < 12; i++){ const u = (t*.3 + hash(i, 1, 9)) % 1, x2 = (hash(i, 2, 9)*PW + t*50) % PW, y2 = hash(i, 3, 9)*PH; if(!vis(x2, y2)) continue; ctx.globalAlpha = Math.sin(u*3.14)*.5; P(x2, y2, 8, 1, '#f0e0c8'); } ctx.globalAlpha = 1; }
};
// --- Plaine orageuse : herbe sombre couchée par le vent, flaques où tombe la pluie, éclairs qui frappent le sol
const ORAG = { amb:.3,
  paint(a, R, D){
    paintField(a, ['#3a4a2a', '#465a30', '#526a36', '#5e7a3e', '#6a8a46', '#2a3a4a', '#3a4e60', '#5a7088', '#7a90a8', '#2a3420'], (x, y) => {
      const pud = vn(x, y, 24, 61); if(pud > .82) return pud > .86 ? (hash(x, y, 62) < .05 ? 8 : 6) : 5;
      if(pud > .8) return 9;
      const t = vn(x, y, 30, 63)*.7 + vn(x, y, 5, 65)*.3 + (bay(x, y) - .5)*.14; return t > .66 ? 3 : t > .48 ? 2 : t > .3 ? 1 : 0; });
    scatter(a, R, 260, (x, y) => { px(a, x, y, '#2a3420'); px(a, x + 1, y - 1, '#7a9050'); });
    D.puds = []; for(let i = 0; i < 400 && D.puds.length < 40; i++){ const x = FX0 + R()*(FX1 - FX0), y = FY0 + R()*(FY1 - FY0); if(vn(x, y, 24, 61) > .86) D.puds.push([x | 0, y | 0]); }
    D.tall = tufts(R, (x, y) => vn(x, y, 18, 64) > .6 && vn(x, y, 24, 61) < .78, 2200);
    D.scorch = [];
    borderV6(a, R, (x, y, r) => tree(a, x, y + 8, 11 + (r()*4 | 0), LEAFS[2]), 30);
  },
  ground(D){ const t = T(); drawTufts(D.tall, t, TUFT_D, 3.2);
    D.puds.forEach(([x, y], k) => { const u = (t*1.3 + hash(k, 1, 4)) % 1; if(vis(x, y)) ripple(x + hash(k, Math.floor(t*1.3 + hash(k, 1, 4)), 5)*6 - 3, y, 1 + u*4, '#c8d8ea', 1 - u); });
    const n = Math.floor(t/4.5), u = (t % 4.5)/4.5, bx = FX0 + 40 + hash(n, 1, 8)*(FX1 - FX0 - 80), byy = FY0 + 30 + hash(n, 2, 8)*(FY1 - FY0 - 60);
    if(u < .6){ ctx.globalAlpha = 1 - u/.6; for(let s = 0; s < 6.283; s += .4) for(let r = 2; r < 9; r += 3) P(bx + Math.cos(s + r)*r, byy + Math.sin(s + r)*r*.5, 1, 1, r < 4 ? '#fff6b0' : '#2a2a20'); ctx.globalAlpha = 1; } },
  top(D){ const t = T();
    ctx.fillStyle = 'rgba(200,215,235,.5)'; for(let i = 0; i < 140; i++){ const x = (hash(i, 1, 1)*PW + t*120) % PW, y = (hash(i, 2, 1)*PH + t*340) % PH; if(!vis(x, y)) continue; for(let j = 0; j < 5; j++) ctx.fillRect(Math.round(x - j*.6)*2, Math.round(y - j*2)*2, 2, 4); }
    const n = Math.floor(t/4.5), u = (t % 4.5)/4.5; if(u < .08){ const bx = FX0 + 40 + hash(n, 1, 8)*(FX1 - FX0 - 80), byy = FY0 + 30 + hash(n, 2, 8)*(FY1 - FY0 - 60); let x = bx + 30, y = byy - 180; ctx.globalAlpha = 1 - u/.08;
      while(y < byy){ const nx = x + (hash(Math.round(y), n, 3) - .5)*14, ny = y + 8; for(let s = 0; s <= 8; s++){ P(x + (nx - x)*s/8 - 1, y + s, 3, 1, '#fff6b0'); P(x + (nx - x)*s/8, y + s, 1, 1, '#ffffff'); } x = nx; y = ny; } ctx.globalAlpha = 1; } },
  lights(L){ const t = T(), n = Math.floor(t/4.5), u = (t % 4.5)/4.5; if(u < .25){ const bx = FX0 + 40 + hash(n, 1, 8)*(FX1 - FX0 - 80), byy = FY0 + 30 + hash(n, 2, 8)*(FY1 - FY0 - 60); L(bx*2, byy*2, 260, '#fff6c0', 1.2*(1 - u/.25)); } }
};

// ---------- branchement ----------
const D_ = o => o;
const MAPS = [[RAID_ARENA, RAIDV, 'Stade du Raid'], [WILD.herbes, HERBES, 'Plaine sauvage'], [WILD.volcan, VOLC, 'Volcan sauvage'], [WILD.lagon, LAG, 'Lagon'], [WILD.toundra, TOUN, 'Toundra gelée'], [WILD.montagne, MONT, 'Col rocheux'], [WILD.orage, ORAG, 'Plaine orageuse']];
for(const [i, D, name] of MAPS){
  const A = ARENAS[i]; if(!A) continue; D.name = name; A.v6 = D;
  if(D.lights){ const f = D.lights; D.lights = L => f.call(D, L); }
  A.paint = function(a, R){ D.paint(a, R, D); if(D.crowd !== undefined) D.people = crowdV6(D.crowd, rng(777 + i)); };
  AMBIENT[i] = D.amb; if(D.refl) REFLECT[i] = D.refl;
}
})();
