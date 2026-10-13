// ============================================================
//  pokeball.js — POKÉBALL 3D + animations d'envoi et de rappel.
//  • La Pokéball est calculée en vraie 3D (lancer de rayons pixel par pixel sur une sphère) : moitié rouge,
//    moitié blanche, bande noire, bouton, ombrage, reflet brillant. Elle tourne sur elle-même en vol et
//    s'OUVRE vraiment : le couvercle pivote sur sa charnière et on voit l'intérieur lumineux.
//  • Envoi : la ball est lancée en cloche (ombre au sol), s'ouvre en l'air, un faisceau de lumière dépose
//    le Pokémon qui se matérialise (silhouette blanche → couleurs), puis la ball repart.
//    → c'est à ce moment que se déclenche l'effet de la CAPSULE BALL équipée (js/capsules.js).
//  • Rappel : la ball apparaît au-dessus du Pokémon, s'ouvre, un rayon rouge l'aspire, elle se referme et repart.
//  Utilisé pour la Relève, l'entrée après un K.O., la toute première entrée du combat et l'arrivée des ennemis.
//  Durées : objet PB_T ci-dessous.
// ============================================================
const PB_T = { recall:.55, recallKo:1.0, throw:.42, open:.18, emerge:.42, leave:.35 };
const PB_VIEW = -.5;                                  // inclinaison de la caméra (vue un peu du dessus), en radians

// ---------- teinte d'un sprite (silhouette blanche / rouge) ----------
const TC = new WeakMap();
function tint(s, col){
  let m = TC.get(s); if(!m){ m = {}; TC.set(s, m); }
  if(m[col]) return m[col];
  const c = document.createElement('canvas'); c.width = s.width; c.height = s.height; const x = c.getContext('2d');
  x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return m[col] = c;
}

// ============================================================
//  RENDU 3D DE LA BALL
//  ballSprite(r, roll, yaw, open, glowCol) → canvas (2r+4)², mis en cache.
//    roll : rotation avant/arrière (la ball « roule » en vol)   yaw : rotation gauche/droite
//    open : 0 fermée → 1 grande ouverte                          glowCol : couleur de la lumière intérieure
// ============================================================
const PB_CACHE = new Map();
const PB_COL = { top:[232, 56, 52], bot:[242, 242, 246], band:[30, 26, 36], btn:[250, 250, 252], inner:[70, 70, 84] };
const v3 = {
  rx:(p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]; },
  ry:(p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c]; },
  dot:(a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
  norm:a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }
};
const PB_L = v3.norm([-.55, -.75, .65]), PB_H = v3.norm([PB_L[0], PB_L[1], PB_L[2] + 1]);
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

// matériau d'un point de la surface (coordonnées locales de la ball, y vers le BAS)
function pbMaterial(q){
  const front = q[2];                                         // le bouton est à l'avant (0,0,1)
  if(front > .955) return front > .985 ? 'btn' : 'band';
  if(Math.abs(q[1]) < .085) return 'band';
  return q[1] < 0 ? 'top' : 'bot';
}
// intersection d'un rayon (o + t·d) avec la sphère unité → [t1, t2] ou null
function pbHit(o, d){
  const b = v3.dot(o, d), c = v3.dot(o, o) - 1, D = b*b - c; if(D < 0) return null;
  const s = Math.sqrt(D); return [-b - s, -b + s];
}
// une demi-coquille : keep = +1 garde la moitié BASSE (y ≥ 0), -1 la moitié HAUTE.
// toLocal(p) / dirLocal(d) : passage du repère de la vue au repère de la coquille ; nLocalToView : normale → vue
function pbShell(o, d, toLocal, dirLocal, keep){
  const O = toLocal(o), Dd = dirLocal(d), h = pbHit(O, Dd); if(!h) return null;
  for(const [t, inner] of [[h[0], false], [h[1], true]]){
    const q = [O[0] + Dd[0]*t, O[1] + Dd[1]*t, O[2] + Dd[2]*t];
    if(q[1]*keep >= -.0001) return { t, q, inner };
  }
  return null;
}
function ballSprite(r, roll, yaw, open, glowCol){
  roll = ((roll % 6.2832) + 6.2832) % 6.2832;
  const qr = Math.round(roll/6.2832*32) % 32, qo = Math.round(Math.min(1, Math.max(0, open))*12), qy = Math.round(yaw*10);
  const key = r + '|' + qr + '|' + qo + '|' + qy + '|' + (glowCol || '');
  if(PB_CACHE.has(key)) return PB_CACHE.get(key);
  if(PB_CACHE.size > 900) PB_CACHE.clear();
  const R = qr/32*6.2832, OP = qo/12, Y = qy/10, G = hexRgb(glowCol || '#ffffff');
  const S = Math.ceil(r)*2 + 4, half = S/2, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), img = x.createImageData(S, S), D = img.data;
  // vue → ball : inclinaison de la caméra, puis yaw, puis roll
  const toBall = p => v3.rx(v3.ry(v3.rx(p, -PB_VIEW), -Y), -R);
  // couvercle : pivote autour de la charnière (arrière, y=0, z=-1) d'un angle OP·115°
  const HA = -OP*2.0;
  const toLid = p => { const b = toBall(p), q = [b[0], b[1], b[2] + 1], w = v3.rx(q, HA); return [w[0], w[1], w[2] - 1]; };
  const dirLid = d => v3.rx(toBall(d), HA);
  const lidN = n => v3.rx(v3.ry(v3.rx(v3.rx(n, -HA), R), Y), PB_VIEW);       // normale couvercle → vue
  const ballN = n => v3.rx(v3.ry(v3.rx(n, R), Y), PB_VIEW);                  // normale ball → vue
  const SS = 3, cover = new Float32Array(S*S);
  for(let py = 0; py < S; py++) for(let px = 0; px < S; px++){
    let ar = 0, ag = 0, ab = 0, n = 0;
    for(let sy = 0; sy < SS; sy++) for(let sx = 0; sx < SS; sx++){
      const X = (px + (sx + .5)/SS - half)/r, Yv = (py + (sy + .5)/SS - half)/r;
      if(X*X + Yv*Yv > 1.25) continue;
      const o = [X, Yv, 4], d = [0, 0, -1];
      let best = null;
      if(OP <= 0){
        const h = pbHit(toBall(o), toBall(d)); if(h){ const B = toBall(o), Dd = toBall(d), q = [B[0] + Dd[0]*h[0], B[1] + Dd[1]*h[0], B[2] + Dd[2]*h[0]]; best = { t:h[0], q, inner:false, lid:false }; }
      } else {
        const a = pbShell(o, d, toBall, toBall, 1), b = pbShell(o, d, toLid, dirLid, -1);
        if(a) best = { ...a, lid:false };
        if(b && (!best || b.t < best.t)) best = { ...b, lid:true };
      }
      if(!best) continue;
      let col;
      if(best.inner){                                                     // intérieur : gris sombre éclairé par la lumière
        const gl = OP*(best.lid ? .5 : 1)*(1 - Math.min(1, Math.hypot(best.q[0], best.q[2])*.55));
        col = PB_COL.inner.map((c, i) => Math.min(255, c*.55 + G[i]*(.25 + gl*1.25) + 255*Math.pow(gl, 3)*.6));
      } else {
        const m = pbMaterial(best.q), base = PB_COL[m], nv = (best.lid ? lidN : ballN)(best.q);
        const dif = Math.max(0, v3.dot(nv, PB_L)), spec = Math.pow(Math.max(0, v3.dot(nv, PB_H)), m === 'band' ? 18 : 46)*(m === 'band' ? .35 : .95);
        const rim = Math.pow(1 - Math.max(0, nv[2]), 3)*.22, amb = .38;
        col = base.map(c => Math.min(255, c*(amb + dif*.78) + 255*spec + 140*rim));
        if(m === 'btn' && OP > 0){ col = col.map((c, i) => Math.min(255, c*.6 + G[i]*.5*OP)); }   // le bouton s'allume à l'ouverture
      }
      ar += col[0]; ag += col[1]; ab += col[2]; n++;
    }
    if(!n) continue;
    const k = (py*S + px)*4, cov = n/(SS*SS); cover[py*S + px] = cov;
    D[k] = ar/n; D[k + 1] = ag/n; D[k + 2] = ab/n; D[k + 3] = cov > .45 ? 255 : 0;
  }
  // contour sombre d'1 pixel (comme les sprites du jeu)
  const M = new Uint8Array(S*S); for(let i = 0; i < S*S; i++) M[i] = D[i*4 + 3] ? 1 : 0;
  for(let py = 0; py < S; py++) for(let px = 0; px < S; px++){
    const k = (py*S + px)*4; if(M[py*S + px]) continue;
    const on = (a, b) => a >= 0 && b >= 0 && a < S && b < S && M[b*S + a] === 1;
    if(on(px - 1, py) || on(px + 1, py) || on(px, py - 1) || on(px, py + 1)){ D[k] = 20; D[k + 1] = 16; D[k + 2] = 28; D[k + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  PB_CACHE.set(key, cv); return cv;
}
// dessine la ball centrée en (x, y) sur le contexte c
function drawBall3D(c, x, y, r, o){
  o = o || {};
  const s = ballSprite(r, o.roll || 0, o.yaw ?? -.25, o.open || 0, o.glow);
  c.save(); c.globalAlpha *= o.alpha ?? 1;
  if(o.open > .05){ c.globalCompositeOperation = 'lighter'; c.globalAlpha = (o.alpha ?? 1)*o.open*.85; c.drawImage(glow(o.glow || '#ffffff'), x - r*3, y - r*3.4, r*6, r*6); c.globalCompositeOperation = 'source-over'; c.globalAlpha = o.alpha ?? 1; }
  c.drawImage(s, Math.round(x - s.width/2), Math.round(y - s.height/2));
  c.restore();
}
// ombre au sol (plus petite et plus claire quand la ball est haute)
function drawBallShadow(c, x, gy, r, h){
  const k = Math.max(.35, 1 - h/120);
  c.save(); c.fillStyle = `rgba(0,0,0,${.35*k})`; c.beginPath(); c.ellipse(x, gy, r*1.1*k, r*.45*k, 0, 0, 6.283); c.fill(); c.restore();
}
// compatibilité : ancienne fonction (rayon r, ouverture, rotation)
function drawBall(x, y, r, open, spin){ drawBall3D(ctx, x, y, r, { open, roll:spin || 0 }); }
function stars(x, y, n, col){ burst(n, (i, a) => vp({ x, y, vx:Math.cos(a)*R_(60, 160), vy:Math.sin(a)*R_(60, 160), life:R_(.4, .7), s:R_(5, 9), s1:2, kind:'star', col:col || '#fff6c0', rot:a, vr:5, fr:2 })); }

// ============================================================
//  SÉQUENCES (communes au joueur et aux ennemis)
//  sendOut(c, A, t)  : A = { x, y (sol du Pokémon), from:{x,y} (d'où part le lancer), mon:canvas, k:échelle, glow }
//  recall(c, A, t)   : A = { x, y, to:{x,y} (où repart la ball), mon, k }
// ============================================================
const pbEase = u => 1 - Math.pow(1 - u, 3);
const pbLerp = (a, b, u) => a + (b - a)*u;
const PB_R = 10, PB_HOVER = 34;                      // rayon de la ball, hauteur d'ouverture au-dessus du Pokémon
function sendOutDraw(c, A, t){
  const T = PB_T, tO = T.throw, tE = tO + T.open, tL = tE + T.emerge, gy = A.y + A.feet;
  if(t < tO){                                                         // lancer en cloche
    const u = t/tO, bx = pbLerp(A.from.x, A.x, pbEase(u)), base = pbLerp(A.from.y, gy, u), h = pbLerp(A.from.h || 20, PB_HOVER, u) + Math.sin(u*Math.PI)*70;
    drawBallShadow(c, bx, base, PB_R, h);
    drawBall3D(c, bx, base - h, PB_R*(1 + .25*Math.sin(u*Math.PI)), { roll:u*14*(A.dir || 1), yaw:-.3 });
    return;
  }
  const bx = A.x, by = gy - PB_HOVER;
  if(t < tL + T.leave){
    const uo = Math.min(1, (t - tO)/T.open), ue = Math.min(1, Math.max(0, (t - tE)/T.emerge));
    const ul = Math.max(0, (t - tL)/T.leave), open = t < tL ? uo : Math.max(0, 1 - ul*2.5);
    // faisceau de lumière vers le sol
    if(uo > .3 && ul < .6){
      const a = Math.min(1, (uo - .3)*2)*(1 - ul/.6);
      c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .55*a;
      const g = c.createLinearGradient(0, by, 0, gy); g.addColorStop(0, A.glow || '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(bx - 5, by + 4); c.lineTo(bx + 5, by + 4); c.lineTo(bx + 26, gy); c.lineTo(bx - 26, gy); c.closePath(); c.fill();
      c.globalAlpha = .7*a; c.drawImage(glow(A.glow || '#ffffff'), bx - 34, gy - 14, 68, 28); c.restore();
    }
    // le Pokémon se matérialise : petite silhouette blanche qui descend et grandit, puis prend ses couleurs
    if(ue > 0 && A.mon){
      const fr = A.mon, sc = A.k*(.25 + .75*pbEase(ue)), cy = pbLerp(by, A.y, pbEase(ue)), white = Math.max(0, 1 - Math.max(0, ue - .55)/.45);
      c.save(); c.translate(A.x, cy);
      c.globalAlpha = 1; c.drawImage(fr, -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc);
      if(white > 0){ c.globalAlpha = white; c.drawImage(tint(fr, A.glow || '#ffffff'), -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc); }
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = white*.8; c.drawImage(glow(A.glow || '#ffffff'), -fr.width*sc*.5, -fr.height*sc*.5, fr.width*sc, fr.height*sc);
      c.restore();
    }
    // la ball : s'ouvre, reste en l'air, puis repart vers le lanceur en tournant
    const lx = pbLerp(bx, A.from.x, pbEase(ul)), ly = pbLerp(by, A.from.y - 60, pbEase(ul));
    drawBall3D(c, lx, ly, PB_R, { open, roll:ul*-12*(A.dir || 1), yaw:-.3, glow:A.glow, alpha:1 - ul });
  }
}
function recallDraw(c, A, t, dur){
  const u = Math.min(1, t/dur), gy = A.y + A.feet, bx = pbLerp(A.x, A.to.x, .25), by = gy - PB_HOVER - 14;
  const appear = Math.min(1, t/.12), suck = Math.min(1, Math.max(0, (t - .08)/(dur*.6))), close = Math.min(1, Math.max(0, (t - dur*.7)/(dur*.12)));
  const leave = Math.max(0, (t - dur*.82)/(dur*.18));
  if(suck < 1 && A.mon){                                             // silhouette rouge aspirée
    const fr = A.mon, sc = A.k*(1 - pbEase(suck)*.9), cx = pbLerp(A.x, bx, pbEase(suck)), cy = pbLerp(A.y, by, pbEase(suck));
    c.save(); c.globalAlpha = .95 - suck*.3; c.translate(cx, cy); c.drawImage(tint(fr, '#ff4a3a'), -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc); c.restore();
    c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = `rgba(255,70,50,${.85*(1 - suck)})`; c.lineWidth = 9*(1 - suck) + 2;
    c.beginPath(); c.moveTo(bx, by); c.lineTo(A.x, A.y); c.stroke(); c.globalAlpha = .6*(1 - suck); c.drawImage(glow('#ff5040'), A.x - 30, A.y - 30, 60, 60); c.restore();
  }
  const open = Math.min(appear, 1 - close), lx = pbLerp(bx, A.to.x, pbEase(leave)), ly = pbLerp(by, A.to.y - 40, pbEase(leave));
  drawBall3D(c, lx, ly, PB_R, { open, roll:leave*10*(A.dir || 1), yaw:-.3, glow:'#ff6050', alpha:appear*(1 - leave) });
  if(close > 0 && close < 1){ c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = 1 - close; c.drawImage(glow('#ffffff'), bx - 22, by - 22, 44, 44); c.restore(); }
}
const PB_FEET = 28;                                    // le sol est ~28 px sous le centre du sprite (échelle x2)

// ============================================================
//  BRANCHEMENTS DANS LE JEU
// ============================================================
// côté du « dresseur » : le joueur lance depuis le bas-gauche, l'ennemi depuis le haut-droite
const trainerFrom = (o, enemy) => enemy ? { x:o.x + 130, y:o.y - 70, h:60 } : { x:o.x - 120, y:o.y + 60, h:20 };

// ----- relève du joueur (et entrée après un K.O.) -----
const _doSwapB = doSwap;
doSwap = function(n){
  if(!G || G.sw) return;
  const o = G.p, ko = o.hp <= 0;
  G.sw = { from:o, to:n, t0:G.time, x:o.x, y:o.y, ko, did:false, ev:{}, rec:ko ? PB_T.recallKo : PB_T.recall };
  G.swc = 3; down[0] = down[1] = down[2] = 0;
  if(!ko){ o.inv = 3; o.hid = true; playSfx('recall'); }
};
// toute première entrée du combat : ton Pokémon sort aussi d'une Pokéball
const _startB = start;
start = function(cfg){
  _startB(cfg);
  if(!G || !G.p) return;
  const p = G.p; p.hid = true; p.inv = 2;
  G.sw = { intro:true, from:p, to:p, t0:G.time - .01, x:p.x, y:p.y, ko:false, did:true, ev:{}, rec:0 };
  playSfx('throw');
};
function updSwap(){
  const S = G && G.sw; if(!S) return;
  const t = G.time - S.t0, T = PB_T, tSend = S.rec, tOpen = tSend + T.throw, tEnd = tOpen + T.open + T.emerge;
  if(!S.did && t >= tSend){
    S.did = true; _doSwapB(S.to); S.from.hid = false; S.to.hid = true; S.to.inv = 1.2;
    playSfx('throw');
  }
  if(S.did) S.to.inv = Math.max(S.to.inv, .2);
  if(t >= tOpen && !S.ev.open){
    S.ev.open = true; playSfx('ball_open'); flashScreen(.18);
    vp({ x:S.x, y:S.y + PB_FEET, life:.45, s:10, s1:70, kind:'ring', col:'#ffffff' });
    if(typeof capsuleFire === 'function') capsuleFire(S.to, false);
  }
  if(t >= tEnd){ S.to.hid = false; S.from.hid = false; if(S.intro) S.to.inv = .3; G.sw = null; }
}
function drawSwap(){
  const S = G && G.sw; if(!S) return;
  const t = G.time - S.t0, k = 2;
  if(!S.intro && t < S.rec){
    if(!S.ko) recallDraw(ctx, { x:S.x, y:S.y, feet:PB_FEET, to:trainerFrom(S, false), mon:mon(S.from, 0), k, dir:-1 }, t, S.rec);
    else if(t > S.rec*.45) recallDraw(ctx, { x:S.x, y:S.y, feet:PB_FEET, to:trainerFrom(S, false), mon:null, k, dir:-1 }, t - S.rec*.45, S.rec*.55);
  }
  if(S.did || S.intro){
    const tt = t - S.rec;
    if(tt >= 0) sendOutDraw(ctx, { x:S.x, y:S.y, feet:PB_FEET, from:trainerFrom(S, false), mon:mon(S.to, 0), k, glow:capsuleGlow(S.to, false), dir:1 }, tt);
  }
}
// ----- arrivée de l'ennemi : sort d'une Pokéball -----
const _spawnB = spawn;
spawn = function(){
  _spawnB(); const e = G.e; e.hid = true; G.em = { e, t0:G.time, ev:false };
};
function updEmerge(){
  const M = G && G.em; if(!M) return; const t = G.time - M.t0, T = PB_T, tOpen = T.throw, tEnd = tOpen + T.open + T.emerge;
  if(t >= tOpen && !M.ev){
    M.ev = true; playSfx('ball_open'); flashScreen(.15);
    vp({ x:M.e.x, y:M.e.y + PB_FEET*(M.e.boss ? 1.5 : 1), life:.45, s:10, s1:90, kind:'ring', col:'#ffffff' });
    if(typeof capsuleFire === 'function') capsuleFire(M.e, true);
  }
  if(t >= tEnd){ M.e.hid = false; G.em = null; }
}
function drawEmerge(){
  const M = G && G.em; if(!M) return; const t = G.time - M.t0, e = M.e, k = e.boss ? 3 : 2;
  sendOutDraw(ctx, { x:e.x, y:e.y, feet:PB_FEET*k/2, from:trainerFrom(e, true), mon:mon(e, 1), k, glow:capsuleGlow(e, true), dir:-1 }, t);
}
// ----- branchements -----
const _stepB = step;
step = function(dt){
  if(G && G.sw){                                 // joueur bloqué pendant l'animation
    const p = G.p, x = p.x, y = p.y; _stepB(dt); if(G && !G.over){ p.x = x; p.y = y; }
  } else _stepB(dt);
  if(G && !G.over){ updSwap(); updEmerge(); }
};
const _pressB = press; press = function(i){ if(G && G.sw) return; _pressB(i); };
const _dashB = dash; dash = function(){ if(G && G.sw) return; _dashB(); };
// la ball et le Pokémon qui se matérialise sont dessinés PAR-DESSUS les Pokémon (drawFx)
const _dfB = drawFx; drawFx = function(){ _dfB(); if(G){ drawSwap(); drawEmerge(); } };
// couleur de la lumière de la ball (remplacée par la couleur de la Capsule Ball équipée, js/capsules.js)
function capsuleGlow(){ return '#ffffff'; }
