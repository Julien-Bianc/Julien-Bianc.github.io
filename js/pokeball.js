// ============================================================
//  pokeball.js — POKÉBALL 3D + animations d'envoi et de rappel.
//  • La Pokéball est modélisée en 3D (sphère, couvercle qui pivote) mais rendue en PIXEL ART comme les sprites :
//    demi-résolution x2, ombrage en paliers de 4 tons, contour sombre, reflet blanc. Elle roule en vol,
//    frémit avant de s'ouvrir et s'OUVRE vraiment : le couvercle pivote sur sa charnière, l'intérieur s'illumine.
//  • Envoi : la ball est lancée en cloche (ombre au sol), s'ouvre en l'air, un faisceau de lumière dépose
//    le Pokémon qui se matérialise (silhouette blanche → couleurs), puis la ball repart.
//    → c'est à ce moment que se déclenche l'effet de la CAPSULE BALL équipée (js/capsules.js).
//  • Rappel : la ball apparaît au-dessus du Pokémon, s'ouvre, un rayon rouge l'aspire, elle se referme et repart.
//  Utilisé pour la Relève, l'entrée après un K.O., la toute première entrée du combat et l'arrivée des ennemis.
//  Durées : objet PB_T ci-dessous.
// ============================================================
const PB_T = { recall:.6, recallKo:1.0, throw:.4, pop:.12, open:.16, emerge:.42, leave:.35 };
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
//  RENDU DE LA BALL — PIXEL ART EN VOLUME
//  La géométrie est calculée en 3D (sphère, couvercle qui pivote, rotation), mais le rendu suit les règles
//  des sprites du jeu : demi-résolution agrandie x2, palettes de 4 tons par couleur (ombrage en paliers),
//  contour sombre d'1 pixel, reflet en pixels blancs francs, liseré de lumière en bas à droite.
//  ballSprite(ar, roll, yaw, open, glowCol) → canvas en « pixels d'art » (ar = rayon en pixels d'art), mis en cache.
//    roll : rotation avant/arrière (la ball « roule » en vol)   yaw : rotation gauche/droite
//    open : 0 fermée → 1 grande ouverte                          glowCol : couleur de la lumière intérieure
// ============================================================
const PB_CACHE = new Map();
const PB_PAL = {                                                   // du plus sombre au plus clair
  top: ['#4a0c16', '#9a1824', '#dc3434', '#ff6e5a'],
  bot: ['#545468', '#9a9aae', '#d6d6e2', '#f8f8ff'],
  band:['#0e0a14', '#1e1a26', '#34303e', '#4a4658'],
  btn: ['#7e7e92', '#c8c8d6', '#eeeef6', '#ffffff'],
  in:  ['#1a1822', '#2e2a3a', '#46425a', '#625e78']
};
const PB_SPEC = '#ffffff', PB_OL = '#14101c';
const v3 = {
  rx:(p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0], p[1]*c - p[2]*s, p[1]*s + p[2]*c]; },
  ry:(p, a) => { const c = Math.cos(a), s = Math.sin(a); return [p[0]*c + p[2]*s, p[1], -p[0]*s + p[2]*c]; },
  dot:(a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2],
  norm:a => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0]/l, a[1]/l, a[2]/l]; }
};
const PB_L = v3.norm([-.6, -.85, .7]), PB_H = v3.norm([PB_L[0], PB_L[1], PB_L[2] + 1]), PB_RIM = v3.norm([.8, .7, .1]);
const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v)*t));

// matériau d'un point de la surface (coordonnées locales de la ball, y vers le BAS, bouton à l'avant z+)
function pbMaterial(q){
  const front = q[2];
  if(front > .9) return front > .962 ? 'btn' : 'band';
  if(Math.abs(q[1]) < .15) return 'band';
  return q[1] < 0 ? 'top' : 'bot';
}
function pbHit(o, d){
  const b = v3.dot(o, d), c = v3.dot(o, o) - 1, D = b*b - c; if(D < 0) return null;
  const s = Math.sqrt(D); return [-b - s, -b + s];
}
// une demi-coquille : keep = +1 garde la moitié BASSE (y ≥ 0), -1 la moitié HAUTE
function pbShell(o, d, toLocal, dirLocal, keep){
  const O = toLocal(o), Dd = dirLocal(d), h = pbHit(O, Dd); if(!h) return null;
  for(const [t, inner] of [[h[0], false], [h[1], true]]){
    const q = [O[0] + Dd[0]*t, O[1] + Dd[1]*t, O[2] + Dd[2]*t];
    if(q[1]*keep >= -.0001) return { t, q, inner };
  }
  return null;
}
function ballSprite(ar, roll, yaw, open, glowCol){
  roll = ((roll % 6.2832) + 6.2832) % 6.2832;
  const qr = Math.round(roll/6.2832*24) % 24, qo = Math.round(Math.min(1, Math.max(0, open))*10), qy = Math.round(yaw*10);
  const key = ar + '|' + qr + '|' + qo + '|' + qy + '|' + (glowCol || '');
  if(PB_CACHE.has(key)) return PB_CACHE.get(key);
  if(PB_CACHE.size > 900) PB_CACHE.clear();
  const R = qr/24*6.2832, OP = qo/10, Y = qy/10, GL = hexRgb(glowCol || '#ffffff');
  const S = Math.ceil(ar*2) + 4 + (OP > 0 ? Math.ceil(ar*1.2) : 0), cx = S/2, cy = S/2 + (OP > 0 ? ar*.55 : 0);
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), img = x.createImageData(S, S), D = img.data, M = new Uint8Array(S*S);
  const toBall = p => v3.rx(v3.ry(v3.rx(p, -PB_VIEW), -Y), -R);
  const HA = -OP*1.15;                                                   // le couvercle pivote sur sa charnière arrière
  const toLid = p => { const b = toBall(p), q = [b[0], b[1], b[2] + 1], w = v3.rx(q, HA); return [w[0], w[1], w[2] - 1]; };
  const dirLid = d => v3.rx(toBall(d), HA);
  const lidN = n => v3.rx(v3.ry(v3.rx(v3.rx(n, -HA), R), Y), PB_VIEW);
  const ballN = n => v3.rx(v3.ry(v3.rx(n, R), Y), PB_VIEW);
  const put = (i, hex) => { const c = typeof hex === 'string' ? hexRgb(hex) : hex; D[i*4] = c[0]; D[i*4 + 1] = c[1]; D[i*4 + 2] = c[2]; D[i*4 + 3] = 255; M[i] = 1; };
  const bayer = [0, .5, .75, .25];                                      // petit tramage 2x2 aux transitions (comme le pixel art)
  for(let py = 0; py < S; py++) for(let px = 0; px < S; px++){
    const X = (px + .5 - cx)/ar, Yv = (py + .5 - cy)/ar;
    const o = [X, Yv, 4], d = [0, 0, -1];
    let best = null;
    if(OP <= 0){
      const B = toBall(o), Dd = toBall(d), h = pbHit(B, Dd);
      if(h) best = { t:h[0], q:[B[0] + Dd[0]*h[0], B[1] + Dd[1]*h[0], B[2] + Dd[2]*h[0]], inner:false, lid:false };
    } else {
      const a = pbShell(o, d, toBall, toBall, 1), b = pbShell(o, d, toLid, dirLid, -1);
      if(a) best = { ...a, lid:false };
      if(b && (!best || b.t < best.t)) best = { ...b, lid:true };
    }
    if(!best) continue;
    const i = py*S + px, dth = bayer[(px & 1) + (py & 1)*2]*.22 - .11;
    if(best.inner){                                                     // intérieur : sombre, éclairé par la lumière de la capsule
      const r0 = Math.hypot(best.q[0], best.q[2]), gl = OP*(best.lid ? .55 : 1)*(1 - Math.min(1, r0*.75));
      const k = gl > .5 ? 3 : gl > .28 ? 2 : gl > .1 ? 1 : 0;                 // lumière intérieure en 4 paliers nets
      put(i, k === 3 ? mixRgb(GL, [255, 255, 255], .7) : mixRgb(hexRgb(PB_PAL.in[k + 1]), mixRgb(GL, [255, 255, 255], .3), [.35, .6, .82][k]));
      continue;
    }
    const m = pbMaterial(best.q), nv = (best.lid ? lidN : ballN)(best.q), pal = PB_PAL[m];
    const dif = Math.max(0, v3.dot(nv, PB_L)), spec = Math.pow(Math.max(0, v3.dot(nv, PB_H)), 40);
    if(spec > .55 && m !== 'band'){ put(i, PB_SPEC); continue; }
    let L = .18 + dif*.95 + dth;
    if(v3.dot(nv, PB_RIM) > .55 && nv[2] < .55) L += .3;               // liseré de lumière (contre-jour)
    if(m === 'btn' && OP > 0){ put(i, mixRgb([255, 255, 255], GL, .5)); continue; }
    put(i, pal[Math.max(0, Math.min(3, Math.floor(L*3.2)))]);
  }
  // contour sombre d'1 pixel
  const ol = hexRgb(PB_OL);
  for(let py = 0; py < S; py++) for(let px = 0; px < S; px++){
    const i = py*S + px; if(M[i]) continue;
    const on = (a, b) => a >= 0 && b >= 0 && a < S && b < S && M[b*S + a] === 1;
    if(on(px - 1, py) || on(px + 1, py) || on(px, py - 1) || on(px, py + 1)){ D[i*4] = ol[0]; D[i*4 + 1] = ol[1]; D[i*4 + 2] = ol[2]; D[i*4 + 3] = 255; }
  }
  x.putImageData(img, 0, 0);
  cv.cx = cx; cv.cy = cy;                                               // centre de la sphère dans l'image
  PB_CACHE.set(key, cv); return cv;
}
// dessine la ball (r = rayon À L'ÉCRAN) centrée en (x, y). o : roll, yaw, open, glow, alpha, sx, sy (étirement), rot (inclinaison)
const PB_PX = 2;                                                        // 1 pixel d'art = 2 pixels écran (comme les sprites)
function drawBall3D(c, x, y, r, o){
  o = o || {};
  const s = ballSprite(r/PB_PX, o.roll || 0, o.yaw ?? -.3, o.open || 0, o.glow), al = o.alpha ?? 1;
  if(al <= 0) return;
  c.save();
  if(o.open > .05){ c.globalCompositeOperation = 'lighter'; c.globalAlpha = al*o.open*.45; c.drawImage(glow(o.glow || '#ffffff'), x - r*2.5, y - r*3, r*5, r*5); c.globalCompositeOperation = 'source-over'; }
  c.globalAlpha = al; c.imageSmoothingEnabled = false;
  c.translate(Math.round(x), Math.round(y)); if(o.rot) c.rotate(o.rot); c.scale((o.sx || 1)*PB_PX, (o.sy || 1)*PB_PX);
  c.drawImage(s, -s.cx, -s.cy);
  c.restore();
}
// ombre au sol en pixels (plus petite et plus claire quand la ball est haute)
function drawBallShadow(c, x, gy, r, h){
  const k = Math.max(.35, 1 - h/120), w = Math.round(r*1.1*k/PB_PX), hh = Math.max(1, Math.round(r*.4*k/PB_PX));
  c.save(); c.fillStyle = `rgba(20,16,28,${.4*k})`;
  for(let j = -hh; j <= hh; j++){ const ww = Math.round(w*Math.sqrt(1 - (j/(hh + .5))**2)); c.fillRect(Math.round(x/PB_PX - ww)*PB_PX, Math.round(gy/PB_PX + j)*PB_PX, ww*2*PB_PX, PB_PX); }
  c.restore();
}
// éclat en croix façon pixel art (4 branches + diagonales courtes)
function pixStar(c, x, y, s, col, a){
  if(a <= 0 || s < 1) return; const P = PB_PX, X = Math.round(x/P)*P, Y = Math.round(y/P)*P, n = Math.round(s/P);
  c.save(); c.globalAlpha = Math.min(1, a); c.fillStyle = col;
  c.fillRect(X - n*P, Y, (n*2 + 1)*P, P); c.fillRect(X, Y - n*P, P, (n*2 + 1)*P);
  const d = Math.max(1, Math.round(n*.35)); for(let k = 1; k <= d; k++){ c.fillRect(X + k*P, Y + k*P, P, P); c.fillRect(X - k*P, Y - k*P, P, P); c.fillRect(X + k*P, Y - k*P, P, P); c.fillRect(X - k*P, Y + k*P, P, P); }
  c.fillStyle = '#ffffff'; c.fillRect(X - P, Y, P*3, P); c.fillRect(X, Y - P, P, P*3);
  c.restore();
}
// compatibilité : ancienne fonction (rayon r, ouverture, rotation)
function drawBall(x, y, r, open, spin){ drawBall3D(ctx, x, y, r*1.3, { open, roll:spin || 0 }); }
function stars(x, y, n, col){ burst(n, (i, a) => vp({ x, y, vx:Math.cos(a)*R_(60, 160), vy:Math.sin(a)*R_(60, 160), life:R_(.4, .7), s:R_(5, 9), s1:2, kind:'star', col:col || '#fff6c0', rot:a, vr:5, fr:2 })); }

// ============================================================
//  SÉQUENCES (communes au joueur, aux ennemis et aux aperçus)
//  sendOut : lancer en cloche qui tourne (traînée) → la ball s'arrête en l'air, frémit (écrasement/étirement)
//            → elle s'ouvre d'un coup : éclat en croix + rayons → faisceau → le Pokémon se matérialise → la ball repart
//  recall  : la ball surgit (rebond), s'ouvre, rayon rouge qui aspire, se referme, frémit, repart en tournant
// ============================================================
const pbEase = u => 1 - Math.pow(1 - Math.min(1, Math.max(0, u)), 3);
const pbBack = u => { u = Math.min(1, Math.max(0, u)); const s = 2.2; return 1 + (s + 1)*Math.pow(u - 1, 3) + s*Math.pow(u - 1, 2); };   // dépasse un peu puis revient
const pbLerp = (a, b, u) => a + (b - a)*u;
const PB_R = 13, PB_HOVER = 36;                      // rayon de la ball à l'écran, hauteur d'ouverture au-dessus du sol
function sendOutDraw(c, A, t){
  const T = PB_T, tO = T.throw, tP = tO + T.pop, tE = tP + T.open, tL = tE + T.emerge, gy = A.y + A.feet, dir = A.dir || 1;
  const bx = A.x, by = gy - PB_HOVER;
  const pos = u => ({ x:pbLerp(A.from.x, bx, pbEase(u)), base:pbLerp(A.from.y, gy, u), h:pbLerp(A.from.h || 20, PB_HOVER, u) + Math.sin(u*Math.PI)*64 });
  if(t < tO){                                                         // lancer en cloche + traînée
    const u = t/tO, P = pos(u);
    drawBallShadow(c, P.x, P.base, PB_R, P.h);
    for(let k = 4; k >= 1; k--){ const uk = u - k*.05; if(uk <= 0) continue; const Q = pos(uk); drawBall3D(c, Q.x, Q.base - Q.h, PB_R, { roll:pbEase(uk)*Math.PI*4*dir, alpha:.28*(1 - k/5), glow:A.glow }); }
    drawBall3D(c, P.x, P.base - P.h, PB_R, { roll:pbEase(u)*Math.PI*4*dir });       // 2 tours complets : bouton devant à l'arrivée
    if(u > .15) pixStar(c, pos(u - .1).x, pos(u - .1).base - pos(u - .1).h, 3, A.glow || '#fff6c0', .7);
    return;
  }
  if(t < tP){                                                         // la ball s'arrête et frémit
    const u = (t - tO)/T.pop, w = Math.sin(u*Math.PI*3)*(1 - u);
    drawBallShadow(c, bx, gy, PB_R, PB_HOVER);
    drawBall3D(c, bx, by, PB_R, { roll:0, rot:w*.35, sx:1 + .18*Math.sin(u*Math.PI), sy:1 - .16*Math.sin(u*Math.PI) });
    return;
  }
  if(t >= tL + T.leave) return;
  const uo = Math.min(1, (t - tP)/T.open), ue = Math.min(1, Math.max(0, (t - tE)/T.emerge));
  const ul = Math.max(0, (t - tL)/T.leave), open = t < tL ? pbBack(uo) : Math.max(0, 1 - ul*3);
  // éclat d'ouverture : croix + rayons qui tournent
  const fl = Math.max(0, 1 - (t - tP)/.32);
  if(fl > 0) ADD_PB(c, () => {
    pixStar(c, bx, by, 6 + 22*pbEase(1 - fl), '#ffffff', fl);
    c.globalAlpha = fl*.75; c.strokeStyle = A.glow || '#ffffff'; c.lineWidth = PB_PX*2;
    for(let i = 0; i < 10; i++){ const a = i/10*6.283 + (t - tP)*3, r0 = 10 + 30*(1 - fl), r1 = r0 + 18*fl; c.beginPath(); c.moveTo(bx + Math.cos(a)*r0, by + Math.sin(a)*r0*.8); c.lineTo(bx + Math.cos(a)*r1, by + Math.sin(a)*r1*.8); c.stroke(); }
  });
  // faisceau de lumière vers le sol
  if(uo > .3 && ul < .6){
    const a = Math.min(1, (uo - .3)*2)*(1 - ul/.6);
    ADD_PB(c, () => {
      c.globalAlpha = .4*a; const g = c.createLinearGradient(0, by, 0, gy); g.addColorStop(0, A.glow || '#ffffff'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(bx - 6, by + 6); c.lineTo(bx + 6, by + 6); c.lineTo(bx + 28, gy); c.lineTo(bx - 28, gy); c.closePath(); c.fill();
      c.globalAlpha = .45*a; c.drawImage(glow(A.glow || '#ffffff'), bx - 36, gy - 14, 72, 28);
      for(let i = 0; i < 6; i++){ const v = ((t*2.2 + i/6) % 1); pixStar(c, bx + (((i*37) % 40) - 20)*(1 - v), pbLerp(gy, by, v), 1.5, '#ffffff', a*(1 - v)); }
    });
  }
  // le Pokémon se matérialise : petite silhouette lumineuse qui descend et grandit, puis prend ses couleurs
  if(ue > 0 && A.mon){
    const fr = A.mon, sc = A.k*(.25 + .75*pbEase(ue)), cy = pbLerp(by, A.y, pbEase(ue)), white = Math.max(0, 1 - Math.max(0, ue - .55)/.45);
    c.save(); c.translate(A.x, cy); c.imageSmoothingEnabled = false;
    c.drawImage(fr, -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc);
    if(white > 0){ c.globalAlpha = white; c.drawImage(tint(fr, A.glow || '#ffffff'), -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc); }
    c.globalCompositeOperation = 'lighter'; c.globalAlpha = white*.4; c.drawImage(glow(A.glow || '#ffffff'), -fr.width*sc*.5, -fr.height*sc*.5, fr.width*sc, fr.height*sc);
    c.restore();
  }
  // la ball : grande ouverte en l'air, puis se referme et repart vers le lanceur en tournant
  const lx = pbLerp(bx, A.from.x, pbEase(ul)), ly = pbLerp(by, A.from.y - 70, pbEase(ul)) - Math.sin(ul*Math.PI)*30;
  drawBall3D(c, lx, ly, PB_R*(1 - ul*.4), { open, roll:-pbEase(ul)*Math.PI*4*dir, glow:A.glow, alpha:1 - ul*ul });
}
function ADD_PB(c, f){ c.save(); c.globalCompositeOperation = 'lighter'; f(); c.restore(); }
function NORM_PB(c, f){ c.save(); f(); c.restore(); }
function recallDraw(c, A, t, dur){
  const gy = A.y + A.feet, bx = pbLerp(A.x, A.to.x, .2), by = gy - PB_HOVER - 16, dir = A.dir || 1;
  const pop = pbBack(t/.16), suck = Math.min(1, Math.max(0, (t - .1)/(dur*.55))), close = Math.min(1, Math.max(0, (t - dur*.68)/(dur*.1)));
  const wob = Math.max(0, Math.min(1, (t - dur*.78)/(dur*.1))), leave = Math.max(0, (t - dur*.86)/(dur*.14));
  if(suck < 1 && A.mon){                                             // silhouette rouge aspirée
    const fr = A.mon, sc = A.k*(1 - pbEase(suck)*.9), cx = pbLerp(A.x, bx, pbEase(suck)), cy = pbLerp(A.y, by, pbEase(suck));
    c.save(); c.imageSmoothingEnabled = false; c.globalAlpha = .95 - suck*.3; c.translate(cx, cy); c.drawImage(tint(fr, '#ff4a3a'), -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc); c.restore();
    NORM_PB(c, () => {                                                // rayon rouge en zigzag pixel
      c.globalAlpha = .9*(1 - suck); c.fillStyle = '#ff3a30';
      const n = 12; for(let i = 0; i <= n; i++){ const u = i/n, px = pbLerp(bx, A.x, u) + Math.sin(u*14 + t*40)*4*(1 - suck), py = pbLerp(by, A.y, u); c.fillRect(Math.round(px/PB_PX)*PB_PX - 3, Math.round(py/PB_PX)*PB_PX - 3, 6, 6); }
      c.fillStyle = '#ffd0c8'; for(let i = 0; i <= 12; i++){ const u = i/12; c.fillRect(Math.round(pbLerp(bx, A.x, u)/PB_PX)*PB_PX - 1, Math.round(pbLerp(by, A.y, u)/PB_PX)*PB_PX - 1, 2, 2); }
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35*(1 - suck); c.drawImage(glow('#ff5040'), A.x - 30, A.y - 30, 60, 60);
    });
  }
  const open = Math.min(1, t/.14)*(1 - close), lx = pbLerp(bx, A.to.x, pbEase(leave)), ly = pbLerp(by, A.to.y - 50, pbEase(leave)) - Math.sin(leave*Math.PI)*24;
  const w = Math.sin(wob*Math.PI*3)*(1 - wob)*(leave > 0 ? 0 : 1);
  drawBall3D(c, lx, ly, PB_R*Math.max(.01, pop)*(1 - leave*.4), { open, roll:pbEase(leave)*Math.PI*4*dir, rot:w*.4, glow:'#ff6050', alpha:1 - leave*leave });
  if(close > 0 && close < 1) pixStar(c, bx, by, 8*(1 - close) + 2, '#ffffff', 1 - close);
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
  const t = G.time - S.t0, T = PB_T, tSend = S.rec, tOpen = tSend + T.throw + T.pop, tEnd = tOpen + T.open + T.emerge;
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
  const M = G && G.em; if(!M) return; const t = G.time - M.t0, T = PB_T, tOpen = T.throw + T.pop, tEnd = tOpen + T.open + T.emerge;
  if(t >= tOpen && !M.ev){
    M.ev = true; playSfx('ball_open'); flashScreen(.15);
    vp({ x:M.e.x, y:M.e.y + PB_FEET*(M.e.boss ? 1.5 : 1), life:.45, s:10, s1:90, kind:'ring', col:'#ffffff' });
    if(typeof capsuleFire === 'function') capsuleFire(M.e, true);
  }
  if(t >= tEnd){ M.e.hid = false; G.em = null; }
}
function drawEmerge(){
  const M = G && G.em; if(!M) return; const t = G.time - M.t0, e = M.e, k = e.boss ? (e.sc || 3) : 2;
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
