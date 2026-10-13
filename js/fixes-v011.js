// ============================================================
//  fixes-v011.js — Corrections du rapport de test v0.10
//    1. Crash « ellipse : radius is negative » (Vibrobscur et toutes les ondes) : un rayon négatif ne fait
//       plus planter le jeu, il est simplement ignoré (protection sur TOUS les dessins de cercles/ellipses).
//    2. Téléport (Alakazam…) entièrement contrôlable, et la zone de visée montre EXACTEMENT où tu arrives :
//         • glisser depuis le bouton (ou souris) : tu vas où tu vises, la longueur du glissé règle la distance
//         • simple appui : tu pars dans la direction de ton déplacement (joystick / ZQSD / flèches)
//         • simple appui sans bouger : dans la dernière direction où tu t'es déplacé
//       (les téléports « derrière la cible » comme Ombre Portée gardent leur fonctionnement)
//    3. Visée en début de combat : plus de tir « derrière soi ».
//         • la visée en cours (doigt / souris / touches) est remise à zéro à chaque début de combat et à chaque
//           arrivée d'un nouvel adversaire (avant : une visée restée « accrochée » du combat précédent pouvait servir)
//         • la souris ne sert à viser que si tu l'as bougée PENDANT ce combat
//         • l'ennemi n'anticipe plus un déplacement « fantôme » (téléport, projection, relève) : la vitesse
//           utilisée pour sa visée est limitée à ta vraie vitesse de course
// ============================================================

// ---------- 1. dessin : jamais de rayon négatif ----------
(function(){
  const P = CanvasRenderingContext2D.prototype, el = P.ellipse, ar = P.arc;
  P.ellipse = function(x, y, rx, ry, ...r){ return el.call(this, x, y, rx > 0 ? rx : 0, ry > 0 ? ry : 0, ...r); };
  P.arc = function(x, y, r, ...o){ return ar.call(this, x, y, r > 0 ? r : 0, ...o); };
})();

// ---------- 2. téléport contrôlable ----------
const isFreeBlink = m => m && m.k === 'blink' && !(m.opt && m.opt.behind);
// dernière direction de déplacement du joueur (sert quand on téléporte sans bouger)
const LASTDIR = { x:1, y:0 };
function moveInput(){ const dx = jx + kx, dy = jy + ky, m = Math.hypot(dx, dy); return m > .2 ? { x:dx/m, y:dy/m } : null; }
// point d'arrivée du téléport du joueur pour le bouton i (même calcul pour l'aperçu et pour l'attaque)
function blinkLanding(p, m, c, i){
  const O = m.opt || {}, rng = (O.range || 260)*(1 + c*.3);
  let ux, uy, dist = rng;
  if(AIM.on[i]){ ux = Math.cos(AIM.a[i]); uy = Math.sin(AIM.a[i]); dist = rng*(.25 + .75*AIM.r[i]); }
  else { const mv = moveInput() || LASTDIR; ux = mv.x; uy = mv.y; }
  return { x:clX(p.x + ux*dist), y:clY(p.y + uy*dist) };
}
let BLINK_TO = null;
const _fireBl = fire;
fire = function(m, c, i){
  if(G && isFreeBlink(m)) BLINK_TO = blinkLanding(G.p, m, c, i);
  try{ _fireBl(m, c, i); } finally { BLINK_TO = null; }
};
const _blinkCtl = blink;
blink = function(s, d, m, c, own, sc, a){
  if(!(own && BLINK_TO && isFreeBlink(m))) return _blinkCtl(s, d, m, c, own, sc, a);
  // on réutilise le téléport d'origine en lui donnant une « cible » au point d'arrivée exact
  const T = BLINK_TO, dist = Math.hypot(T.x - s.x, T.y - s.y);
  if(dist < 2) return _blinkCtl(s, { x:s.x + LASTDIR.x, y:s.y + LASTDIR.y, r:1 }, { ...m, opt:{ ...m.opt, range:1 } }, 0, own, sc, Math.atan2(LASTDIR.y, LASTDIR.x));
  const O = m.opt || {}, rng = (O.range || 260)*(1 + c*.3);
  return _blinkCtl(s, { x:T.x, y:T.y, r:1 }, { ...m, opt:{ ...O, range:Math.max(rng, dist) } }, c, own, sc, Math.atan2(T.y - s.y, T.x - s.x));
};
// aperçu : ligne pointillée + cercle d'arrivée + silhouette, exactement là où tu vas apparaître
const _drawAimBl = drawAimShape;
drawAimShape = function(p, i){
  const m = p.mv[i]; if(!isFreeBlink(m)) return _drawAimBl(p, i);
  const T = blinkLanding(p, m, p.ch[i] || 0, i), col = COL[m.tp || p.t] || '#ffffff';
  const q = Settings.get().aimOpacity, A = (.7 + .3*Math.sin(G.time*10))*(q/.5)*.6 + .15;
  ctx.save(); ctx.lineCap = 'round';
  ctx.setLineDash([7, 6]); ctx.lineDashOffset = -G.time*40; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(T.x, T.y);
  ctx.lineWidth = 4; ctx.strokeStyle = `rgba(0,0,0,${.3*A})`; ctx.stroke(); ctx.lineWidth = 2; ctx.strokeStyle = hexA(col, .9*A); ctx.stroke(); ctx.setLineDash([]);
  ctx.beginPath(); ctx.ellipse(T.x, T.y + 8, 22, 15, 0, 0, 6.283); ctx.fillStyle = hexA(col, .3*A); ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = hexA(col, A); ctx.stroke();
  const k = (G.time*1.6) % 1; ctx.beginPath(); ctx.ellipse(T.x, T.y + 8, 22*(1 - k*.6), 15*(1 - k*.6), 0, 0, 6.283); ctx.lineWidth = 2; ctx.strokeStyle = hexA('#ffffff', .6*A); ctx.stroke();
  if(SPR[p.t]){ const f = mon(p, 0); ctx.globalAlpha = .35*A; ctx.drawImage(f, T.x - f.width, T.y - f.height, f.width*2, f.height*2); }
  ctx.restore(); ctx.globalAlpha = 1;
};
// mémorise la direction de déplacement + 3. limite la vitesse vue par l'ennemi
const _stepFx = step;
step = function(dt){
  const mv = G && !G.over && moveInput(); if(mv){ LASTDIR.x = mv.x; LASTDIR.y = mv.y; }
  return _stepFx(dt);
};
const _eFireFx = eFire;
eFire = function(){
  const p = G.p, vx = p.vx || 0, vy = p.vy || 0, v = Math.hypot(vx, vy), max = (p.sp || 200)*1.15;
  if(p.hid || p.bl || p.bur) { p.vx = 0; p.vy = 0; } else if(v > max){ p.vx = vx*max/v; p.vy = vy*max/v; }
  try{ return _eFireFx(); } finally { p.vx = vx; p.vy = vy; }
};

// ---------- 3. visée remise à zéro au début de chaque combat / adversaire ----------
let MOUSE_FIGHT = false;                 // la souris a-t-elle bougé pendant CE combat ?
function resetAim(){
  AIM.on = [0, 0, 0]; AIM.mouse = null; AIM.mouseT = 0; MOUSE_FIGHT = false;
  if(typeof down !== 'undefined'){ down[0] = down[1] = down[2] = 0; }
  if(G && G.p){ G.p.ch = [0, 0, 0]; G.p.vx = G.p.vy = 0; }
}
const _startFx = start;
start = function(cfg){ AIM.on = [0, 0, 0]; AIM.mouse = null; MOUSE_FIGHT = false; const r = _startFx(cfg); resetAim();
  if(G && G.p && G.e){ const a = Math.atan2(G.e.y - G.p.y, G.e.x - G.p.x); LASTDIR.x = Math.cos(a); LASTDIR.y = Math.sin(a); G.p.tx = G.e.x; G.p.ty = G.e.y; }
  return r; };
const _spawnFx = spawn;
spawn = function(){ const r = _spawnFx(); AIM.on = [0, 0, 0]; if(G && G.p && G.e){ G.p.tx = G.e.x; G.p.ty = G.e.y; } return r; };
cv.addEventListener('mousemove', () => { if(G && !G.over && !G.paused) MOUSE_FIGHT = true; });
const _aimKeyFx = AIM.key;
AIM.key = function(i){ if(!MOUSE_FIGHT) return; return _aimKeyFx.call(AIM, i); };
