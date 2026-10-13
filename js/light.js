// ============================================================
//  light.js — LUMIÈRES et REFLETS (v0.09)
//    • Bloom : chaque projectile, rayon, explosion… éclaire le sol et les Pokémon autour de lui
//      (calque de lumière en basse résolution, agrandi et additionné à l'image = halo doux).
//    • Ambiance par arène : les arènes sombres (grotte, lave, ruines) assombrissent légèrement la scène
//      pour faire ressortir les lumières. L'écran s'assombrit aussi un instant pendant les grosses attaques.
//    • Reflets au sol : tache de lumière sous chaque projectile / rayon, et reflet des Pokémon sur la glace.
//    • Impacts : anneaux de choc au sol + disque de poussière + étincelles (comme Façade dans le reel).
//  Réglage : Options → « Lumières » (0 = désactivé, utile sur les vieux téléphones).
//  Pour régler l'ambiance d'une arène : AMBIENT (assombrissement) et REFLECT (reflet des Pokémon).
// ============================================================
SETTINGS_DEFAULT.light = 1;

// couleur de LUMIÈRE de chaque type (plus claire que la couleur du type)
const LCOL = { normal:'#ffffff', feu:'#ffa040', eau:'#6ab8ff', foudre:'#fff070', plante:'#a8ff78', glace:'#c0f0ff', combat:'#ff9a70',
  poison:'#d47cff', sol:'#ffcc80', vol:'#d8e4ff', psy:'#ff7ac8', insecte:'#d0f050', roche:'#ffd890', spectre:'#a87aff', dragon:'#a890ff',
  tenebres:'#a070ff', acier:'#e8f0ff', fee:'#ffb8e8' };
const lcol = t => LCOL[t] || COL[t] || '#ffffff';

//                0 prairie  1 grotte  2 désert  3 banquise  4 lave  5 ruines  6 entraînement
const AMBIENT = [   .04,       .32,      .06,      .12,        .34,    .26,      .02 ];
const REFLECT = { 1:.14, 3:.24 };                   // arènes où les Pokémon se reflètent dans le sol (opacité)

const LIGHTS = [], GP = [], DIM = { a:0 };
function addLight(x, y, r, col, life, a){ if(LIGHTS.length < 90) LIGHTS.push({ x, y, r, col, life, max:life, a:a ?? 1 }); }
function groundRing(x, y, r0, r1, col, life, w){ if(GP.length < 120) GP.push({ k:'ring', x, y, r0, r1, col, life, max:life, w:w || 3 }); }
function groundDisc(x, y, r0, r1, col, life){ if(GP.length < 120) GP.push({ k:'disc', x, y, r0, r1, col, life, max:life }); }
function lightOn(){ return Settings.get().light > 0; }

// ---------- calque de lumière ----------
const LS = .25, LC = document.createElement('canvas'); LC.width = VW*LS; LC.height = VH*LS;
const lx = LC.getContext('2d');
function L(x, y, r, col, a){
  if(a <= .01 || r < 2) return;
  if(x + r < CAM.x - 60 || x - r > CAM.x + VW + 60 || y + r < CAM.y - 60 || y - r > CAM.y + VH + 60) return;
  lx.globalAlpha = Math.min(1, a); lx.drawImage(glow(col), x - r, y - r, r*2, r*2);
}
function collectLights(){
  for(const b of bullets) L(b.x, b.y, Math.max(24, b.r*7), b.col || lcol(b.t), .5);
  for(const q of bm){
    const k = q.t/q.mx, c = lcol(q.tp);
    if(q.col){ L(q.x, q.y, 90, c, .9*k); }
    else for(let i = 0; i < 520; i += 40) L(q.x + Math.cos(q.a)*i, q.y + Math.sin(q.a)*i, q.w*4, c, .55*k);
  }
  for(const z of zn) L(z.x, z.y, z.r*1.4, lcol(z.tp), .2);
  for(let i = 0; i < VP.length; i += 3){
    const p = VP[i]; if(p.kind !== 'glow' && p.kind !== 'spark' && p.kind !== 'arc') continue;
    const u = 1 - p.life/p.max, c = p.pal ? p.pal[Math.min(p.pal.length - 1, Math.floor(u*p.pal.length))] : p.col;
    L(p.x, p.y, Math.max(10, (p.s + (p.s1 - p.s)*u)*3), c, .14*p.a*(p.life/p.max));
  }
  for(const q of LIGHTS){ const k = q.life/q.max; L(q.x, q.y, q.r*(.7 + .3*k), q.col, q.a*k); }
  for(const o of [G.p, G.e]) if(o && o.hp > 0 && !o.hid && o.st === 'burn') L(o.x, o.y, 50, '#ff8a30', .35);
  if(typeof collectPlusLights === 'function') collectPlusLights(L);
}
function drawLights(){
  const S = Settings.get().light; if(!S || !G) return;
  const amb = Math.min(.6, AMBIENT[curArena]*Math.min(1, S) + DIM.a);
  if(amb > .01){ ctx.fillStyle = `rgba(12,6,30,${amb})`; ctx.fillRect(CAM.x - 60, CAM.y - 60, VW + 120, VH + 120); }
  lx.setTransform(1, 0, 0, 1, 0, 0); lx.clearRect(0, 0, LC.width, LC.height);
  lx.globalCompositeOperation = 'lighter'; lx.setTransform(LS, 0, 0, LS, -CAM.x*LS, -CAM.y*LS);
  collectLights();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.imageSmoothingEnabled = true;
  ctx.globalAlpha = Math.min(1, .6*S); ctx.drawImage(LC, CAM.x, CAM.y, VW, VH);
  if(S > 1){ ctx.globalAlpha = Math.min(1, (S - 1)*.6); ctx.drawImage(LC, CAM.x, CAM.y, VW, VH); }
  ctx.restore(); ctx.imageSmoothingEnabled = false;
}

// ---------- sol : anneaux de choc, poussière, reflets ----------
function drawGround(){
  if(!G) return;
  const S = Settings.get().light;
  // reflets des Pokémon (glace, cristal)
  const rf = REFLECT[curArena];
  if(rf && S) for(const [o, en] of [[G.e, 1], [G.p, 0]]){
    if(!o || o.hid || (o.hp <= 0 && !en) || !SPR[o.t]) continue;
    const im = mon(o, en), k = o.boss ? 3 : 2, C = im.width;
    ctx.save(); ctx.globalAlpha = rf*(o.hp > 0 ? 1 : .4); ctx.translate(Math.round(o.x), Math.round(o.y + 14*k)); ctx.scale(k, -k*.8);
    ctx.drawImage(im, -C/2, -(C/2 + 14)); ctx.restore();
  }
  // anneaux et disques au sol
  for(const g of GP){
    const u = 1 - g.life/g.max, e = 1 - Math.pow(1 - u, 3), r = g.r0 + (g.r1 - g.r0)*e, a = g.life/g.max;
    if(g.k === 'ring'){
      ctx.globalAlpha = a; ctx.strokeStyle = g.col; ctx.lineWidth = Math.max(1, g.w*a + 1);
      ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r*.55, 0, 0, 6.283); ctx.stroke();
    } else {
      ctx.globalAlpha = .55*a; ctx.fillStyle = g.col; ctx.beginPath(); ctx.ellipse(g.x, g.y, r, r*.55, 0, 0, 6.283); ctx.fill();
      ctx.globalAlpha = .35*a; ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(g.x, g.y, r*.92, r*.5, 0, 3.4, 6); ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
  if(!S) { if(typeof drawGroundPlus === 'function') drawGroundPlus(); return; }
  // taches de lumière au sol sous les projectiles (reflet)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for(const b of bullets){ const c = glow(b.col || lcol(b.t)), w = Math.max(10, b.r*4.5), h = w*.4; ctx.globalAlpha = .32; ctx.drawImage(c, b.x - w, b.y + 12 - h, w*2, h*2); }
  for(const q of bm) if(!q.col){ const k = q.t/q.mx, c = glow(lcol(q.tp)); ctx.globalAlpha = .25*k; for(let i = 0; i < 520; i += 26) ctx.drawImage(c, q.x + Math.cos(q.a)*i - q.w*2, q.y + Math.sin(q.a)*i + 12 - q.w, q.w*4, q.w*2); }
  ctx.restore();
  if(typeof drawGroundPlus === 'function') drawGroundPlus();
}

// ---------- impacts plus lourds : anneaux au sol, poussière, étincelles, éclair de lumière ----------
const _hitFxL = hitFx;
hitFx = function(x, y, d, m, en, tp, col){
  _hitFxL(x, y, d, m, en, tp, col);
  const t = tp || 'normal', c = col || lcol(t), big = d >= 14, k = Math.min(1.8, .6 + d/20);
  addLight(x, y, 60 + d*2.5, c, big ? .3 : .2, big ? .6 : .45);
  groundRing(x, y + 10, 8, 46*k, '#ffffff', .4, 3);
  if(big){ groundRing(x, y + 10, 14, 80*k, '#ffffff', .55, 2); groundDisc(x, y + 10, 10, 34*k, t === 'eau' || t === 'glace' ? '#a8d8ff' : '#8a7058', .6); }
  burst(big ? 14 : 7, (i, a) => vp({ x:x + R_(-10, 10), y:y + R_(-14, 6), vx:Math.cos(a)*R_(20, 90), vy:R_(-140, -40), life:R_(.4, .8), s:R_(2, 3), s1:2, kind:'snow', col:'#ffffff', g:120, fr:1 }));
};

// ---------- grosses attaques : l'écran s'assombrit un instant + éclair au départ ----------
const _castL = cast;
cast = function(s, d, m, c, own, sc, ang){
  const r = _castL(s, d, m, c, own, sc, ang);
  if(lightOn() && s && m){
    const a = ang ?? Math.atan2(d.y - s.y, d.x - s.x), tp = m.tp || s.t;
    addLight(s.x + Math.cos(a)*20, s.y + Math.sin(a)*20, 55, lcol(tp), .25, .55);
    if(m.d > 15 || c > .5) DIM.a = Math.max(DIM.a, .2*Math.min(1, Settings.get().light));
  }
  return r;
};
const _onKOL = onKO;
onKO = function(o, en){ _onKOL(o, en); DIM.a = Math.max(DIM.a, .3); addLight(o.x, o.y, 160, '#ffffff', .6, .8); groundRing(o.x, o.y + 10, 10, 160, '#ffffff', .8, 4); };

// ---------- mise à jour + affichage ----------
const _stepL = step;
step = function(dt){
  _stepL(dt);
  for(let i = LIGHTS.length - 1; i >= 0; i--) if((LIGHTS[i].life -= dt) <= 0) LIGHTS.splice(i, 1);
  for(let i = GP.length - 1; i >= 0; i--) if((GP[i].life -= dt) <= 0) GP.splice(i, 1);
  DIM.a *= Math.pow(.08, dt);
};
const _drawFxL = drawFx;
drawFx = function(){ if(G) drawLights(); _drawFxL(); };          // les étiquettes de statut restent lisibles (dessinées après)
const _startL = start;
start = function(cfg){ LIGHTS.length = 0; GP.length = 0; DIM.a = 0; _startL(cfg); };
