// ============================================================
//  legend-card.js — CARTES LÉGENDAIRES animées (données : LEGEND_CARDS dans data/secret.js)
//  Carte « pleine illustration » dessinée en direct dans un <canvas> :
//    • décor animé (thème) : ciel embrasé, soleil de feu qui pulse, rayons de lumière, volcans, mer de lave, braises
//    • le Pokémon respire (animation Idle) puis, toutes les quelques secondes, lance une attaque avec un vrai
//      jet de flammes dessiné (pas seulement le sprite)
//    • flammes au premier plan, cadre doré qui miroite, gemmes, ruban « LÉGENDAIRE », hologramme arc-en-ciel,
//      paillettes et reflet qui suit le doigt / la souris (la carte s'incline en 3D)
//  Toucher une grande carte légendaire (révélation, inventaire, classeur) → ZOOM plein écran.
//  Toucher la carte zoomée → loupe x2 qui suit le doigt.
//
//  legendHtml(it, s)  : HTML d'une carte légendaire à l'échelle s (comme cardHtml)
//  Les <canvas class='lgc'> sont animés automatiquement dès qu'ils apparaissent à l'écran.
// ============================================================
const LEG_LIVE = new Set();
const lgR = (i, k) => { const s = Math.sin(i*91.7 + k*47.3 + 3.1)*43758.5453; return s - Math.floor(s); };
const LEG_FIRE = ['#fff8d0', '#ffe070', '#ffb030', '#ff6a18', '#d8300c', '#7a1408'];

// ---------- thèmes de décor (un par type de carte) ----------
const LEGEND_THEMES = {
  volcan:{
    sky:['#1a0614', '#4a0c18', '#a8240e', '#ff7a1a'], sun:'#ffb040', rays:'#ffcf6a', rim:'#ff9a30', ember:['#ffe070', '#ffb030', '#ff6a18'],
    ribbon:['#7a0c0c', '#e8402c', '#7a0c0c'], panel:'rgba(26,6,10,.74)', fx:'fire'
  }
};

// ---------- sprite du Pokémon : image, cadre utile, bouche approximative ----------
const LEG_BOX = new Map();
function legFrameBox(fr){
  if(LEG_BOX.has(fr)) return LEG_BOX.get(fr);
  const w = fr.width, h = fr.height, d = fr.getContext('2d').getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) if(d[(y*w + x)*4 + 3]){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; }
  const b = x1 < 0 ? { x0:0, y0:0, x1:w, y1:h } : { x0, y0, x1, y1 };
  LEG_BOX.set(fr, b); return b;
}
function legPose(pid, t){
  const S = SPR[pid]; if(!S) return null;
  const has = n => { const a = resolveAnim(S, n); return a && S.IM[a] && S.D.anim[a] ? a : null; };
  const idle = has('Idle'), atk = has('Shoot') || has('SpAttack') || has('Attack') || idle;
  const CYC = 6.2, ta = t % CYC, A0 = 4.1, slow = 1.9;
  const atkLen = S.TOT[atk]/60*slow;
  let an = idle, tk = t*48, loop = true, fire = 0;
  if(ta > A0 && ta < A0 + atkLen){ an = atk; tk = (ta - A0)/slow*60; loop = false; }
  if(ta > A0 + atkLen*.35) fire = Math.min(1, (ta - A0 - atkLen*.35)/.25)*Math.max(0, 1 - Math.max(0, ta - (A0 + atkLen + .5))/.6);
  const fi = frameAt(S, an, tk, loop), row = 1;
  return { fr:snFrame(pid, an, row, fi), fire, idleFr:snFrame(pid, idle, row, 0), shoot:an === atk };
}

// ============================================================
//  DESSIN D'UNE CARTE (repère 120 x 180, u = pixels par unité)
// ============================================================
function legRound(c, x, y, w, h, r, keep){ if(!keep) c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
function legStar(c, x, y, s, col, a){ if(a <= 0) return; c.globalAlpha = Math.min(1, a); c.fillStyle = col; c.beginPath(); for(let i = 0; i < 8; i++){ const r = i % 2 ? s*.22 : s, an = i*Math.PI/4; c.lineTo(x + Math.cos(an)*r, y + Math.sin(an)*r); } c.closePath(); c.fill(); }
function legFlame(c, x, y, h, w, a){
  if(a <= 0 || h <= .5) return; c.globalAlpha = Math.min(1, a);
  const g = c.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, LEG_FIRE[4]); g.addColorStop(.35, LEG_FIRE[3]); g.addColorStop(.7, LEG_FIRE[2]); g.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w*.9, y - h*.55, x, y - h); c.quadraticCurveTo(x + w*.9, y - h*.55, x + w, y); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,250,215,.8)'; c.beginPath(); c.moveTo(x - w*.4, y); c.quadraticCurveTo(x - w*.3, y - h*.35, x, y - h*.55); c.quadraticCurveTo(x + w*.3, y - h*.35, x + w*.4, y); c.closePath(); c.fill();
}
function legBgVolcan(c, t, fire, T){
  const W = 120, H = 180;
  // soleil de feu + rayons
  const pul = 1 + .06*Math.sin(t*2.2) + fire*.12, sx = 60, sy = 74;
  c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 14; i++){
    const a = i/14*6.283 + t*.12, w = .09 + .04*Math.sin(t*1.3 + i*2);
    c.globalAlpha = .07 + fire*.03; c.fillStyle = T.rays; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx + Math.cos(a - w)*170, sy + Math.sin(a - w)*170); c.lineTo(sx + Math.cos(a + w)*170, sy + Math.sin(a + w)*170); c.closePath(); c.fill();
  }
  let g = c.createRadialGradient(sx, sy, 0, sx, sy, 46*pul); g.addColorStop(0, 'rgba(255,250,220,.95)'); g.addColorStop(.25, T.sun); g.addColorStop(.6, 'rgba(255,90,20,.35)'); g.addColorStop(1, 'rgba(255,60,10,0)');
  c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(sx, sy, 46*pul, 0, 6.283); c.fill();
  c.globalCompositeOperation = 'source-over';
  // volcans
  const vol = (pts, col) => { c.fillStyle = col; c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => c.lineTo(p[0], p[1])); c.closePath(); c.fill(); };
  vol([[0, 128], [0, 92], [14, 84], [26, 70], [34, 72], [52, 128]], '#3a0e14');
  vol([[60, 128], [86, 78], [94, 76], [104, 86], [120, 96], [120, 128]], '#2a080e');
  vol([[0, 128], [0, 104], [20, 98], [44, 112], [70, 106], [98, 110], [120, 102], [120, 128]], '#1a0408');
  c.globalCompositeOperation = 'lighter';
  [[26, 70, 34, 72, 18, 110], [86, 78, 94, 76, 102, 116]].forEach(([ax, ay, bx, by, ex, ey], k) => {     // coulées de lave
    const lg = c.createLinearGradient(0, ay, 0, ey); lg.addColorStop(0, 'rgba(255,200,80,.9)'); lg.addColorStop(1, 'rgba(255,60,10,0)');
    c.strokeStyle = lg; c.lineWidth = 1.4; c.globalAlpha = .7 + .3*Math.sin(t*3 + k);
    c.beginPath(); c.moveTo((ax + bx)/2, ay); c.quadraticCurveTo((ax + ex)/2 + 4*Math.sin(t + k), (ay + ey)/2, ex, ey); c.stroke();
    c.globalAlpha = .5 + .5*Math.sin(t*5 + k*2); legStar(c, (ax + bx)/2, ay - 2, 2.2, '#ffd060', 1);
  });
  c.globalCompositeOperation = 'source-over';
  // mer de lave
  const lava = c.createLinearGradient(0, 116, 0, 175); lava.addColorStop(0, '#ff8a20'); lava.addColorStop(.3, '#d8300c'); lava.addColorStop(1, '#4a0808');
  c.fillStyle = lava; c.beginPath(); c.moveTo(0, 175);
  for(let x = 0; x <= 120; x += 4) c.lineTo(x, 122 + Math.sin(x*.12 + t*1.6)*1.4);
  c.lineTo(120, 175); c.closePath(); c.fill();
  c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#ffd070'; c.lineWidth = .7;
  for(let k = 0; k < 4; k++){ c.globalAlpha = .45; c.beginPath(); const yy = 126 + k*5;
    for(let x = 0; x <= 120; x += 3){ const y = yy + Math.sin(x*.18 + t*(1.4 + k*.3) + k)*.9; x ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  c.globalCompositeOperation = 'source-over';
}
function legAtkFire(c, mx, my, t, fire){
  let g; const ang = -.42;
      c.save(); c.globalCompositeOperation = 'lighter';
      for(let i = 0; i < 70; i++){
        const life = .6, age = ((t*1.0 + lgR(i, 1)*life) % life)/life, sp = 125, spread = (lgR(i, 2) - .5)*.6*age;
        const a2 = ang + spread, d = age*sp*.62 + 2, px = mx + Math.cos(a2)*d, py = my + Math.sin(a2)*d - age*age*10;
        const r = 1.5 + age*10, ci = Math.min(5, Math.floor(age*5.5));
        c.globalAlpha = fire*(1 - age)*.85; c.fillStyle = LEG_FIRE[ci]; c.beginPath(); c.arc(px, py, r, 0, 6.283); c.fill();
      }
      g = c.createRadialGradient(mx, my, 0, mx, my, 10); g.addColorStop(0, 'rgba(255,255,230,1)'); g.addColorStop(1, 'rgba(255,200,80,0)');
      c.globalAlpha = fire; c.fillStyle = g; c.beginPath(); c.arc(mx, my, 10, 0, 6.283); c.fill();
      c.restore();
}
function legFgVolcan(c, t, fire, T){
  const W = 120, H = 180;
  c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 46; i++){
    const sp = 6 + lgR(i, 1)*16, y = 178 - ((t*sp + lgR(i, 2)*180) % 180), x = 5 + lgR(i, 3)*110 + Math.sin(t*1.5 + i)*3;
    const fl = .5 + .5*Math.sin(t*9 + i*1.7), s = .5 + lgR(i, 4)*1.1;
    c.globalAlpha = (.35 + .65*fl)*Math.min(1, (178 - y)/30); c.fillStyle = T.ember[i % 3]; c.fillRect(x, y, s, s);
  }
  // flammes au premier plan
  for(let i = 0; i < 16; i++){
    const x = 6 + i*7.4 + Math.sin(i*3.3)*2, h = (9 + lgR(i, 6)*10)*(.75 + .25*Math.sin(t*9 + i*2.1)) + fire*6;
    legFlame(c, x, 146, h, 3.6 + lgR(i, 7)*1.5, .9);
  }
  c.globalCompositeOperation = 'source-over';
  // voile chaud qui pulse pendant l'attaque
  if(fire > 0){ c.globalAlpha = fire*.07; c.fillStyle = '#ffb040'; c.fillRect(0, 0, W, H); }
}
function drawLegendCard(c, u, t, it, tilt){
  const D = POKEMON[it.poke] || { name:NAME[it.poke] || it.poke, hp:'?', types:[], moves:[] }, T = LEGEND_THEMES[it.theme] || LEGEND_THEMES.volcan;
  const W = 120, H = 180, gx = 60 + (tilt ? tilt.x : 0)*55, gy = 90 + (tilt ? tilt.y : 0)*80;
  c.setTransform(u, 0, 0, u, 0, 0); c.clearRect(0, 0, W, H); c.imageSmoothingEnabled = false;
  const P = legPose(it.poke, t), fire = P ? P.fire : 0; let g;

  // ---------- illustration (tout l'intérieur de la carte) ----------
  c.save(); legRound(c, 5, 5, 110, 170, 5); c.clip();
  const sky = c.createLinearGradient(0, 5, 0, 130); T.sky.forEach((col, i) => sky.addColorStop(i/(T.sky.length - 1), col)); c.fillStyle = sky; c.fillRect(0, 0, W, H);
  (T.bg || legBgVolcan)(c, t, fire, T);

  // ---------- le Pokémon ----------
  if(P && P.fr){
    const ib = legFrameBox(P.idleFr), h0 = Math.max(8, ib.y1 - ib.y0 + 1), kd = Math.max(1, Math.round(70*u/h0)), k = kd/u;
    const fr = P.fr, C = fr.width, feetX = 58, feetY = 131, breath = Math.sin(t*2.4)*.6;
    const ox = feetX - (C/2)*k, oy = feetY - (C/2 + 14)*k + breath;
    // ombre portée sur la lave
    c.globalAlpha = .45; c.fillStyle = T.shadow || '#1a0408'; c.beginPath(); c.ellipse(feetX, feetY + 1, 26, 5, 0, 0, 6.283); c.fill();
    // halo de contre-jour
    c.save(); c.shadowColor = T.rim; c.shadowBlur = (7 + fire*4)*u; c.globalAlpha = 1;
    c.drawImage(fr, Math.round(ox*u)/u, Math.round(oy*u)/u, C*k, C*k); c.restore();
    c.drawImage(fr, Math.round(ox*u)/u, Math.round(oy*u)/u, C*k, C*k);
    // liseré lumineux (le côté face au soleil)
    c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .14 + fire*.06; c.drawImage(tint(fr, T.rimTint || '#ff9a40'), Math.round(ox*u)/u - .6, Math.round(oy*u)/u - .6, C*k, C*k); c.restore();
    // attaque (jet de flammes, Ball'Ombre…) : selon le thème
    if(fire > 0 && P.shoot){
      const b = legFrameBox(fr), M = T.mouth || [.78, .24], mx = ox + (b.x0 + (b.x1 - b.x0)*M[0])*k, my = oy + (b.y0 + (b.y1 - b.y0)*M[1])*k;
      (T.atk || legAtkFire)(c, mx, my, t, fire);
    }
  }
  (T.fg || legFgVolcan)(c, t, fire, T);
  c.restore();

  // ---------- en-tête ----------
  c.globalAlpha = 1;
  g = c.createLinearGradient(0, 6, 0, 24); g.addColorStop(0, 'rgba(10,2,6,.75)'); g.addColorStop(1, 'rgba(10,2,6,0)'); c.fillStyle = g; c.fillRect(5, 5, 110, 20);
  c.font = 'bold 9px "Courier New",monospace'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  c.lineWidth = 2.2; c.strokeStyle = '#2a0a06'; c.strokeText(D.name, 10, 13.5);
  g = c.createLinearGradient(0, 9, 0, 18); g.addColorStop(0, '#fffbe8'); g.addColorStop(1, '#ffd77a'); c.fillStyle = g; c.fillText(D.name, 10, 13.5);
  c.font = 'bold 5px "Courier New",monospace'; c.textAlign = 'right'; c.lineWidth = 1.6; c.strokeText('PV ' + D.hp, 101, 13.8); c.fillStyle = '#ffe9b0'; c.fillText('PV ' + D.hp, 101, 13.8);
  (D.types || []).slice(0, 2).forEach((tp, i) => { const x = 106 + i*5 - (D.types.length > 1 ? 2.5 : 0); c.fillStyle = '#14101c'; c.beginPath(); c.arc(x, 13.6, 2.4, 0, 6.283); c.fill(); c.fillStyle = COL[tp] || '#999'; c.beginPath(); c.arc(x, 13.6, 1.8, 0, 6.283); c.fill(); });
  c.textAlign = 'left';

  // ---------- ruban + panneau des attaques ----------
  c.fillStyle = T.panel; legRound(c, 9, 146, 102, 26, 3); c.fill();
  c.strokeStyle = 'rgba(255,215,120,.7)'; c.lineWidth = .6; legRound(c, 9, 146, 102, 26, 3); c.stroke();
  const rb = c.createLinearGradient(20, 0, 100, 0); T.ribbon.forEach((col, i) => rb.addColorStop(i/(T.ribbon.length - 1), col));
  c.fillStyle = rb; c.beginPath(); c.moveTo(22, 141); c.lineTo(98, 141); c.lineTo(102, 145.5); c.lineTo(98, 150); c.lineTo(22, 150); c.lineTo(18, 145.5); c.closePath(); c.fill();
  c.strokeStyle = '#ffd76a'; c.lineWidth = .7; c.stroke();
  c.font = 'bold 6px "Courier New",monospace'; c.textAlign = 'center';
  const sh = (t*.35) % 1.6 - .3, tg = c.createLinearGradient(30 + sh*70, 0, 50 + sh*70, 0); tg.addColorStop(0, '#ffcf5a'); tg.addColorStop(.5, '#ffffff'); tg.addColorStop(1, '#ffcf5a');
  c.lineWidth = 1.6; c.strokeStyle = '#4a0606'; c.strokeText('✦ LÉGENDAIRE ✦', 60, 146); c.fillStyle = tg; c.fillText('✦ LÉGENDAIRE ✦', 60, 146);
  c.font = 'bold 5px "Courier New",monospace';
  (D.moves || []).slice(0, 3).forEach((m, i) => {
    const y = 155 + i*6; c.textAlign = 'left';
    c.fillStyle = '#14101c'; c.beginPath(); c.arc(14, y, 1.9, 0, 6.283); c.fill(); c.fillStyle = m.color || COL[m.type] || '#999'; c.beginPath(); c.arc(14, y, 1.4, 0, 6.283); c.fill();
    c.fillStyle = '#fff4dc'; c.fillText(m.name, 18, y); c.textAlign = 'right'; c.fillStyle = '#ffd77a'; c.fillText(String(m.power || '—'), 106, y);
  });
  c.textAlign = 'left';

  // ---------- hologramme, paillettes, reflet ----------
  c.save(); legRound(c, 5, 5, 110, 170, 5); c.clip();
  c.globalCompositeOperation = 'overlay'; c.globalAlpha = .32;
  const off = (t*18 + (tilt ? tilt.x*60 + tilt.y*40 : 0)) % 120;
  const holo = c.createLinearGradient(-60 + off, 0, 60 + off, 180);
  for(let i = 0; i <= 12; i++) holo.addColorStop(i/12, `hsl(${i*30},100%,62%)`);
  c.fillStyle = holo; c.fillRect(0, 0, W, H);
  c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 26; i++){ const tw = Math.sin(t*3.2 + i*2.39); if(tw < .55) continue; legStar(c, 8 + lgR(i, 8)*104, 8 + lgR(i, 9)*164, 2.6*(tw - .55)/.45 + .3, '#ffffff', .9); }
  g = c.createRadialGradient(gx, gy, 0, gx, gy, 70); g.addColorStop(0, `rgba(255,255,255,${T.glare ?? .32})`); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.globalAlpha = 1; c.fillStyle = g; c.fillRect(0, 0, W, H);
  c.restore();

  // ---------- cadre doré ----------
  c.save();
  const fg = c.createLinearGradient(0, 0, 120, 180), ph = (t*.25) % 1;
  [[0, '#8a5a10'], [.15, '#ffe9a0'], [.3, '#d89a20'], [.5, '#fff6c8'], [.7, '#b8781a'], [.85, '#ffe08a'], [1, '#7a4a0a']].forEach(([s, col]) => fg.addColorStop((s + ph) % 1, col));
  c.fillStyle = fg; c.beginPath(); legRound(c, 0, 0, 120, 180, 8, true); legRound(c, 5, 5, 110, 170, 5, true); c.fill('evenodd');
  c.strokeStyle = '#2a1404'; c.lineWidth = .8; legRound(c, .4, .4, 119.2, 179.2, 7.8); c.stroke(); legRound(c, 5, 5, 110, 170, 5); c.stroke();
  c.strokeStyle = 'rgba(255,255,230,.6)'; c.lineWidth = .4; legRound(c, 1.6, 1.6, 116.8, 176.8, 7); c.stroke();
  // gemmes aux coins
  [[6.5, 6.5], [113.5, 6.5], [6.5, 173.5], [113.5, 173.5]].forEach(([x, y], i) => {
    c.fillStyle = '#2a0404'; c.beginPath(); c.moveTo(x, y - 3); c.lineTo(x + 3, y); c.lineTo(x, y + 3); c.lineTo(x - 3, y); c.closePath(); c.fill();
    c.fillStyle = '#e8302c'; c.beginPath(); c.moveTo(x, y - 2.2); c.lineTo(x + 2.2, y); c.lineTo(x, y + 2.2); c.lineTo(x - 2.2, y); c.closePath(); c.fill();
    c.fillStyle = '#ffb0a0'; c.fillRect(x - 1, y - 1.2, .8, .8);
    c.globalCompositeOperation = 'lighter'; legStar(c, x, y, 2.5 + 1.5*Math.sin(t*4 + i*1.6), '#ffffff', .5 + .5*Math.sin(t*4 + i*1.6)); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
  });
  // pied de carte
  c.font = 'bold 3.6px "Courier New",monospace'; c.textBaseline = 'middle'; c.fillStyle = '#3a1c04'; c.textAlign = 'left';
  c.fillText(String(ORDER.indexOf(it.poke) + 1).padStart(2, '0') + '/' + String(ORDER.length).padStart(2, '0'), 12, 177.6);
  c.textAlign = 'right'; c.fillText('✦ ' + 'LÉGENDAIRE', 108, 177.6); c.textAlign = 'left';
  c.restore();
}

// ============================================================
//  HTML + ANIMATION
// ============================================================
function legendHtml(it, s){
  const big = s >= .8, ph = Math.max(1, Math.min(6, Math.round(s*(window.devicePixelRatio || 1)*1.6)));
  return `<div class='cw r-UR leg' style='--cs:${s}'><div class='lgw ${big ? 'zoomable' : ''}' data-lg='${it.id}'><canvas class='lgc' width='${120*ph}' height='${180*ph}' data-id='${it.id}' data-u='${ph}'></canvas></div></div>`;
}
function mountLegendCards(){
  document.querySelectorAll('canvas.lgc').forEach(cv => {
    if(cv._leg) return; const it = ITEM[cv.dataset.id]; if(!it) return;
    const o = { cv, it, u:+cv.dataset.u || 2, tilt:{ x:0, y:0 }, hover:false, t0:performance.now()/1000 - lgR(LEG_LIVE.size, 5)*3 };
    cv._leg = o; LEG_LIVE.add(o);
    const w = cv.closest('.lgw');
    if(w){
      w.addEventListener('pointermove', e => { const r = w.getBoundingClientRect(); o.hover = true; o.tilt.x = ((e.clientX - r.left)/r.width - .5)*2; o.tilt.y = ((e.clientY - r.top)/r.height - .5)*2; });
      w.addEventListener('pointerleave', () => { o.hover = false; });
      if(w.classList.contains('zoomable')) w.addEventListener('click', e => { e.stopPropagation(); legendZoom(it); });
    }
  });
  if(LEG_LIVE.size && !mountLegendCards.on){ mountLegendCards.on = true; requestAnimationFrame(legTick); }
}
function legTick(now){
  const t = now/1000;
  LEG_LIVE.forEach(o => {
    if(!o.cv.isConnected){ LEG_LIVE.delete(o); return; }
    if(!o.hover){ o.tilt.x += (Math.sin(t*.7 + o.t0)*.45 - o.tilt.x)*.06; o.tilt.y += (Math.cos(t*.53 + o.t0)*.3 - o.tilt.y)*.06; }
    const w = o.cv.parentElement; if(w) w.style.transform = `perspective(500px) rotateY(${o.tilt.x*9}deg) rotateX(${-o.tilt.y*9}deg)` + (w.classList.contains('mag') ? ' scale(2.1)' : '');
    try{ drawLegendCard(o.cv.getContext('2d'), o.u, t - o.t0, o.it, o.tilt); }catch(err){ LEG_LIVE.delete(o); console.error(err); }
  });
  if(LEG_LIVE.size) requestAnimationFrame(legTick); else mountLegendCards.on = false;
}
// toute nouvelle page de menu : on anime les cartes légendaires présentes
const _menuLeg = menu;
menu = function(h){ _menuLeg(h); if(h) setTimeout(mountLegendCards, 0); };

// ---------- zoom plein écran ----------
function legendZoom(it){
  const old = document.getElementById('lgzoom'); if(old) old.remove();
  const app = document.getElementById('app'), z = document.createElement('div'); z.id = 'lgzoom';
  const H = app.clientHeight, Wd = app.clientWidth, ch = Math.min(H*.86, Wd*.9*1.5), cw = ch/1.5, dpr = window.devicePixelRatio || 1;
  const u = Math.max(2, Math.min(10, Math.ceil(ch*dpr/180)));
  z.innerHTML = `<div class='lgz-in'><div class='lgw lgz' style='width:${cw}px;height:${ch}px'><canvas class='lgc' width='${120*u}' height='${180*u}' data-id='${it.id}' data-u='${u}' style='width:100%;height:100%'></canvas></div>
    <div class='lgz-side'><b>${esc(it.name)}</b><span class='tag' style='background:${RAR.UR.col};color:#fff'>Légendaire</span>
    <small>Bouge le doigt sur la carte pour l'incliner. Touche-la pour la loupe.</small><button class='btn2' id='lgz-x'>Fermer</button></div></div>`;
  app.appendChild(z);
  const w = z.querySelector('.lgz');
  w.addEventListener('click', e => {
    e.stopPropagation(); const r = w.getBoundingClientRect(); w.classList.toggle('mag');
    w.style.transformOrigin = `${(e.clientX - r.left)/r.width*100}% ${(e.clientY - r.top)/r.height*100}%`;
  });
  w.addEventListener('pointermove', e => { if(!w.classList.contains('mag')) return; const r = w.getBoundingClientRect(); w.style.transformOrigin = `${(e.clientX - r.left)/r.width*100}% ${(e.clientY - r.top)/r.height*100}%`; });
  z.addEventListener('click', e => { if(e.target === z || e.target.classList.contains('lgz-in')) z.remove(); });
  document.getElementById('lgz-x').onclick = () => z.remove();
  if(typeof playSfx === 'function' && typeof AU !== 'undefined' && AU.ctx) tone(880, .2, 'triangle', .05, 600);
  mountLegendCards();
}

// ============================================================
//  ZOOM SUR TOUTES LES CARTES (cartes normales : commune, peu commune, rare)
//  Toucher une grande carte (révélation, détail du classeur, fiche d'objet) → plein écran, inclinaison 3D + reflet
//  qui suivent le doigt ; toucher la carte zoomée → loupe x2.
// ============================================================
function cardZoom(it){
  if(!it) return; if(it.legend) return legendZoom(it);
  const old = document.getElementById('lgzoom'); if(old) old.remove();
  const app = document.getElementById('app'), z = document.createElement('div'); z.id = 'lgzoom';
  const ch = Math.min(app.clientHeight*.86, app.clientWidth*.9*1.5), s = ch/180, cw = 120*s, R = RAR[it.r], MAG = 2.1;
  // la carte est mise en page à sa vraie taille (propriété « zoom ») : texte et pixels restent nets, même à la loupe
  z.innerHTML = `<div class='lgz-in'><div class='czw r-${it.r}' style='width:${cw}px;height:${ch}px'><div class='czp'>${cardHtml(it, 1)}</div><u class='cglare'></u></div>
    <div class='lgz-side'><b>${esc(it.name)}</b><span class='tag' style='background:${R.col};color:#fff'>${R.label}</span>
    <small>Bouge le doigt sur la carte pour l'incliner. Touche-la pour la loupe.</small><button class='btn2' id='lgz-x'>Fermer</button></div></div>`;
  app.appendChild(z);
  const w = z.querySelector('.czw'), pn = z.querySelector('.czp'), card = pn.firstElementChild, gl = z.querySelector('.cglare');
  let tx = 0, ty = 0, mag = false, fx = .5, fy = .5;
  const layout = () => {
    const k = mag ? s*MAG : s; card.style.zoom = k;
    pn.style.left = mag ? -fx*(cw*MAG - cw) + 'px' : '0px'; pn.style.top = mag ? -fy*(ch*MAG - ch) + 'px' : '0px';
  };
  const apply = () => { w.style.transform = `perspective(700px) rotateY(${tx*(mag ? 4 : 12)}deg) rotateX(${-ty*(mag ? 4 : 12)}deg)`;
    gl.style.background = `radial-gradient(circle at ${50 + tx*45}% ${50 + ty*45}%, rgba(255,255,255,.38), rgba(255,255,255,0) 55%)`; };
  w.addEventListener('pointermove', e => { const r = w.getBoundingClientRect(); fx = Math.min(1, Math.max(0, (e.clientX - r.left)/r.width)); fy = Math.min(1, Math.max(0, (e.clientY - r.top)/r.height)); tx = (fx - .5)*2; ty = (fy - .5)*2; w._hov = 1; if(mag) layout(); apply(); });
  w.addEventListener('pointerleave', () => { w._hov = 0; tx = ty = 0; apply(); });
  w.addEventListener('click', e => { e.stopPropagation(); const r = w.getBoundingClientRect(); fx = (e.clientX - r.left)/r.width; fy = (e.clientY - r.top)/r.height; mag = !mag; w.classList.toggle('mag', mag); layout(); apply(); });
  z.addEventListener('click', e => { if(e.target === z || e.target.classList.contains('lgz-in')) z.remove(); });
  document.getElementById('lgz-x').onclick = () => z.remove();
  layout(); apply();
  if(typeof AU !== 'undefined' && AU.ctx) tone(880, .2, 'triangle', .05, 600);
  const t0 = performance.now(), idle = now => { if(!w.isConnected) return; if(!w._hov && !mag){ const t = (now - t0)/1000; tx = Math.sin(t*.8)*.35; ty = Math.cos(t*.6)*.25; apply(); } requestAnimationFrame(idle); };
  requestAnimationFrame(idle);
}
// les grandes cartes affichées dans les menus deviennent zoomables
const _menuZoom = menu;
menu = function(h){
  _menuZoom(h); if(!h) return;
  document.querySelectorAll('.rvc .cw[data-card], .bdv .cw[data-card], .pkv .cw[data-card], .dh .cw[data-card]').forEach(c => {
    if(c._zm) return; c._zm = 1; c.classList.add('zoomable');
    c.addEventListener('click', e => { e.stopPropagation(); cardZoom(ITEM[c.dataset.card]); });
  });
};
