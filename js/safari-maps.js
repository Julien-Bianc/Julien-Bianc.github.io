// ============================================================
//  safari-maps.js — CARTES SAUVAGES du mode Safari (v0.11) : pas de tribunes, de la nature partout.
//  Une carte par grand type de Pokémon (voir SAFARI.maps dans data/safari.js) :
//    herbes (Plante, Normal, Fée, Insecte, Poison)   volcan (Feu, Dragon, Sol)      lagon (Eau)
//    toundra (Glace, Ténèbres, Spectre)               montagne (Combat, Acier, Roche, Psy)   orage (Électrik, Vol)
//  Elles sont ajoutées à ARENAS (js/arena.js) : même format que les arènes (paint, obst, fx).
// ============================================================
const WILD = {};                                           // WILD.herbes = index dans ARENAS
const wpx = (a, x, y, c) => { if(x >= 0 && y >= 0 && x < PW && y < PH) px(a, x, y, c); };
// arbre feuillu / sapin / palmier (pixel art)
function treePx(a, x, y, s, P){
  shadowPx(a, x + 3, y + 2, Math.round(s*1.1), Math.max(2, Math.round(s*.35)), 'rgba(0,0,0,.28)');
  rc(a, x - 1, y - s*.9 | 0, 3, s*.9 | 0, '#5a3a22'); rc(a, x - 1, y - s*.9 | 0, 1, s*.9 | 0, '#7a5232');
  blob3(a, x, y - s*1.4, s, s*.85, P); blob3(a, x - s*.55, y - s*1.05, s*.6, s*.5, P); blob3(a, x + s*.55, y - s*1.1, s*.6, s*.5, P);
  blob3(a, x - s*.25, y - s*1.7, s*.45, s*.35, { l:P.l, m:P.l, d:P.m });
}
function pinePx(a, x, y, s, snow){
  shadowPx(a, x + 3, y + 2, Math.round(s*.9), Math.max(2, Math.round(s*.3)), 'rgba(0,0,0,.25)');
  rc(a, x - 1, y - 4, 3, 5, '#4a2e1c');
  for(let k = 0; k < 3; k++){ const top = y - 3 - s*(1 + k*.55), w = s*(.95 - k*.22), b = y - 3 - s*k*.5;
    polyPx(a, [[x, top], [x + w, b], [x - w, b]], k % 2 ? '#2a5a44' : '#1e4a38'); polyPx(a, [[x, top], [x - w, b], [x - w*.3, b]], '#3a7a58');
    if(snow){ polyPx(a, [[x, top], [x + w*.45, top + (b - top)*.45], [x - w*.45, top + (b - top)*.45]], '#f4fbff'); rc(a, x - w*.8 | 0, b - 1 | 0, w*.6 | 0, 1, '#e4f2fa'); } }
}
function palmPx(a, x, y, s){
  shadowPx(a, x + 6, y + 2, s, 3, 'rgba(0,0,0,.25)');
  for(let i = 0; i < s*1.6; i++){ const xx = x + Math.round(Math.sin(i/s*1.2)*4); rc(a, xx - 1, y - i, 3, 1, i % 4 ? '#9a6a3c' : '#6a4426'); }
  const tx = x + Math.round(Math.sin(1.6*1.2)*4), ty = y - s*1.6 | 0;
  for(let k = 0; k < 6; k++){ const an = -Math.PI/2 + (k - 2.5)*.62; for(let j = 0; j < s; j++){ const X = Math.round(tx + Math.cos(an)*j), Y = Math.round(ty + Math.sin(an)*j + j*j*.03); rc(a, X - 1, Y, 3, 2, j % 3 ? '#3a9a48' : '#2a7a3a'); } }
  blob3(a, tx, ty + 2, 3, 3, { l:'#c89a5a', m:'#8a5a2a', d:'#5a3a1a' });
}
// bordure de végétation (le Safari est un coin de nature fermé)
function border(a, R, fn, step){ for(let x = -6; x < PW + 10; x += step + R()*step*.6){ fn(x | 0, 10 + R()*10 | 0, R); fn(x | 0, PH - 2 - R()*6 | 0, R); }
  for(let y = 30; y < PH - 20; y += step + R()*step*.6){ fn(4 + R()*6 | 0, y | 0, R); fn(PW - 6 - R()*6 | 0, y | 0, R); } }
const LEAF = OPAL.leaf, LEAF2 = { o:'#143a1c', l:'#8ad45c', m:'#4a9a3e', d:'#2a6a30', g:'#ffd0e0' };

const WILD_MAPS = {
  herbes:{ name:'Plaine sauvage', fx:{ k:'petal', c:'#ffe0ec', n:22, s:2 },
    obst: sym([['bush', 'leaf', .5, .5], ['stump', 'wood', .36, .26], ['rock', 'stone', .36, .74], ['bush', 'leaf', .2, .34], ['bush', 'leaf', .2, .66], ['rock', 'stone', .5, .14]]),
    paint(a, R){
      const path = x => PH*.52 + Math.sin(x*.012)*40 + Math.sin(x*.031)*10;
      paintField(a, ['#3a7a34', '#468c3c', '#55a046', '#66b452', '#2c6028', '#a88a58', '#c0a46c', '#8a6e44'], (x, y) => {
        const d = Math.abs(y - path(x)), n = (hash(x, y, 7) - .5)*5;
        if(d + n < 11) return hash(x, y, 8) < .08 ? 7 : hash(x, y, 9) > .9 ? 6 : 5;
        const t = vn(x, y, 34, 3) + (bay(x, y) - .5)*.12, tall = vn(x, y, 22, 5) > .62;
        if(tall) return ((x + (y >> 1)) % 4 === 0 || hash(x, y, 4) < .2) ? 4 : (y % 3 ? 1 : 0);
        return t > .66 ? 3 : t > .42 ? 2 : 1; });
      scatter(a, R, 60, (x, y, r) => { const c = ['#ffffff', '#f6c0d8', '#ffe24a', '#9ad0ff'][(r()*4) | 0]; rc(a, x, y, 2, 2, c); px(a, x, y, '#f0a030'); });
      scatter(a, R, 140, (x, y) => { px(a, x, y, '#2a6a2a'); px(a, x, y - 1, '#8ad474'); });
      border(a, R, (x, y, r) => treePx(a, x, y + 8, 12 + (r()*5 | 0), r() < .5 ? LEAF : LEAF2), 30);
    } },
  volcan:{ name:'Volcan sauvage', fx:{ k:'ember', c:'#ff9a3c', n:60, s:2 },
    obst: sym([['column', 'lava', .5, .5], ['rock', 'lava', .34, .28], ['rock', 'lava', .36, .72], ['column', 'lava', .18, .4], ['rock', 'lava', .2, .7]]),
    paint(a, R){
      const riv = [x => PH*.25 + Math.sin(x*.02)*18, x => PH*.8 + Math.sin(x*.017 + 2)*16];
      paintField(a, ['#2a2026', '#352830', '#40303a', '#4c3a46', '#1a1216', '#ff5a1c', '#ffa030', '#ffe070', '#7a2a14'], (x, y) => {
        for(const f of riv){ const d = Math.abs(y - f(x)) + (hash(x, y, 2) - .5)*3; if(d < 3) return 7; if(d < 6) return 6; if(d < 9) return 5; if(d < 11) return 8; }
        const t = vn(x, y, 26, 13) + (bay(x, y) - .5)*.14; if(hash(x, y, 14) < .015) return 4;
        return t > .68 ? 3 : t > .48 ? 2 : t > .3 ? 1 : 0; });
      cracks(a, R, 16, 60, ['#ff7a2c', '#ffd23c', '#8a2a1c', 1]);
      scatter(a, R, 50, (x, y) => { px(a, x, y, '#6a5a66'); px(a, x + 1, y, '#1a1216'); });
      border(a, R, (x, y, r) => { const s = 7 + (r()*6 | 0); blob3(a, x, y, s + 3, s, OPAL.lava); px(a, x - 2, y - s + 2, '#ff9a3c'); }, 22);
    } },
  lagon:{ name:'Lagon', fx:{ k:'sparkle', c:'#ffffff', n:34, s:2 },
    obst: sym([['rock', 'stone', .5, .5], ['bush', 'leaf', .35, .27], ['barrel', 'wood', .35, .73], ['rock', 'stone', .2, .36], ['bush', 'leaf', .2, .66]]),
    paint(a, R){
      const water = (x, y) => Math.max(1.05 - (((x - PW*.66)/150)**2 + ((y - PH*.46)/78)**2)*.45 + (vn(x, y, 40, 23) - .5)*.25, (y - PH*.82)/PH*3 + .8 + (vn(x, y, 30, 27) - .5)*.2) + (hash(x, y, 24) - .5)*.03;   // lagune + mer en bas
      paintField(a, ['#e8c890', '#f2d6a0', '#d8b47a', '#5ac8e8', '#3aa8d8', '#2a88c0', '#ffffff', '#a8e8f4'], (x, y) => {
        const w = water(x, y);
        if(w > .82) return ((y + Math.round(Math.sin(x*.08)*2)) % 9 === 0) ? 4 : (w > .95 ? 5 : 3);
        if(w > .78) return hash(x, y, 25) < .6 ? 6 : 7;
        if(w > .74) return 2;
        const t = vn(x, y, 20, 26) + (bay(x, y) - .5)*.2; return t > .6 ? 1 : t < .3 ? 2 : 0; });
      scatter(a, R, 30, (x, y) => { px(a, x, y, '#fff4e0'); px(a, x + 1, y, '#c89a6a'); });
      scatter(a, R, 14, (x, y) => { if(water(x, y) > .85){ blob3(a, x, y, 4, 3, { l:'#7ad46a', m:'#4aa44a', d:'#2a7a3a' }); px(a, x + 1, y - 1, '#f4a0c8'); } });
      border(a, R, (x, y, r) => r() < .5 ? palmPx(a, x, y + 8, 12 + (r()*4 | 0)) : blob3(a, x, y, 9, 7, LEAF), 28);
    } },
  toundra:{ name:'Toundra gelée', fx:{ k:'snow', c:'#ffffff', n:60, s:2 },
    obst: sym([['ice', 'ice', .5, .5], ['snowman', 'snow', .35, .27], ['rock', 'ice', .36, .73], ['ice', 'ice', .2, .36], ['rock', 'ice', .2, .66]]),
    paint(a, R){
      paintField(a, ['#dce8f4', '#e8f2fa', '#f4faff', '#ffffff', '#b8d0e6', '#a8dcf2', '#c8ecfa', '#8cc0de'], (x, y) => {
        const pond = ((x - PW*.5)/170)**2 + ((y - PH*.5)/70)**2 + (vn(x, y, 30, 41) - .5)*.4;
        if(pond < .55) return hash(x, y, 42) < .02 ? 3 : (x + y) % 23 === 0 ? 6 : 5;
        if(pond < .62) return 7;
        const t = vn(x, y, 30, 43) + (bay(x, y) - .5)*.16; return t > .7 ? 3 : t > .5 ? 2 : t > .3 ? 1 : (hash(x, y, 44) < .3 ? 4 : 0); });
      cracks(a, R, 6, 40, ['#ffffff', '#f4fcff', '#7eb4d6']);
      scatter(a, R, 40, (x, y) => { px(a, x, y, '#b8d0e6'); px(a, x + 1, y + 1, '#ffffff'); });
      border(a, R, (x, y, r) => pinePx(a, x, y + 8, 9 + (r()*5 | 0), true), 22);
    } },
  montagne:{ name:'Col rocheux', fx:{ k:'dust', c:'#f0e0c8', n:24, s:2 },
    obst: sym([['rock', 'stone', .5, .5], ['pillar', 'ruin', .35, .27], ['rock', 'stone', .36, .73], ['rock', 'stone', .2, .36], ['stump', 'wood', .2, .66], ['rock', 'stone', .5, .15]]),
    paint(a, R){
      paintField(a, ['#8a7e70', '#9a8e7e', '#aa9e8c', '#bcb09c', '#6a6058', '#5a8a46', '#4a7a3a', '#c8bca8'], (x, y) => {
        const s = slab(x, y, 26, 18, 1, 51), t = vn(x, y, 40, 52) + (bay(x, y) - .5)*.1;
        if(vn(x, y, 28, 53) > .78) return hash(x, y, 54) < .3 ? 6 : 5;
        if(s.u === s.cw - 1 || s.v === s.ch - 1) return 4; if(s.u === 0 || s.v === 0) return 7;
        return t > .66 ? 3 : t > .45 ? 2 : t > .28 ? 1 : 0; });
      cracks(a, R, 14, 50, ['#5a5048']);
      scatter(a, R, 24, (x, y, r) => blob3(a, x, y, 2 + (r()*2 | 0), 1.6, OPAL.stone));
      border(a, R, (x, y, r) => { const s = 9 + (r()*7 | 0); blob3(a, x, y, s + 4, s, OPAL.stone); if(r() < .4) treePx(a, x + 6, y + 2, 8, LEAF2); }, 24);
    } },
  orage:{ name:'Plaine orageuse', fx:{ k:'sparkle', c:'#ffe86a', n:30, s:2 },
    obst: sym([['rock', 'stone', .5, .5], ['crate', 'wood', .35, .27], ['rock', 'stone', .36, .73], ['barrel', 'iron', .2, .36], ['bush', 'leaf', .2, .66]]),
    paint(a, R){
      paintField(a, ['#8a8a4a', '#9a9a52', '#aaa85c', '#bcb86a', '#6a6a3a', '#4a5a6a', '#6a7a8a', '#d4d080'], (x, y) => {
        const pud = vn(x, y, 24, 61); if(pud > .84) return hash(x, y, 62) < .1 ? 6 : 5;
        const t = vn(x, y, 30, 63) + (bay(x, y) - .5)*.14;
        if(vn(x, y, 18, 64) > .64) return (x + (y >> 1)) % 3 === 0 ? 4 : 1;
        return t > .7 ? 7 : t > .5 ? 3 : t > .32 ? 2 : 1; });
      scatter(a, R, 26, (x, y) => { line(a, x, y, x + 3, y + 4, '#ffe86a'); line(a, x + 3, y + 4, x + 1, y + 7, '#fff6b0'); });   // traces de foudre au sol
      border(a, R, (x, y, r) => treePx(a, x, y + 8, 11 + (r()*4 | 0), { o:'#1c2a1c', l:'#7a9a4a', m:'#4a6a34', d:'#2a4426', g:'#ffe86a' }), 30);
    } }
};
for(const k in WILD_MAPS){ WILD[k] = ARENAS.length; ARENAS.push(WILD_MAPS[k]); }
// éclairs lointains sur la Plaine orageuse
const _stepWild = step;
step = function(dt){
  _stepWild(dt);
  if(G && !G.over && curArena === WILD.orage && Math.random() < dt*.12 && typeof flashScreen === 'function'){ flashScreen(.12); if(typeof playSfx === 'function') playSfx('rock'); }
};
