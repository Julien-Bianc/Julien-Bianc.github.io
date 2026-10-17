// ============================================================
//  menu-contest.js — ÉCRANS DU « CONCOURS POKÉMON » avec fond animé (comme le menu du Défi Mewtwo)
//    • Arrivée en « swipe » (un balayage rose et or traverse l'écran) quand on clique sur « Concours Pokémon »
//    • Fond animé : salle de concours — grand écran LED rond (emblème aux 5 couleurs, rayons tournants), rideaux noués,
//      rampe de projecteurs à faisceaux colorés, parquet verni avec reflet, podium néon, serpentins, public avec bâtons
//      lumineux et flashs d'appareils, confettis (+ canons), un Pokémon différent qui danse sur le podium
//      (cœurs et étincelles) et des rubans qui tournent autour de lui.
//  Actif pour tous les écrans du concours (hub, choix, Pokémon, marché, cuisine, rubans, résultats).
//  Les épreuves jouables (canvas) mettent le fond en pause.
// ============================================================
const CM = { L:null, t:0, parts:[], conf:[], list:[], mon:0, swT:-9, burstT:5, rib:null, flash:[], hearts:[], on:false, fresh:false, pause:false };
const CMX = 470, CMY = 281;                       // position du podium (pieds du Pokémon)
const CM_BEAM = ['255,120,200', '255,226,122', '120,220,255', '255,255,255', '255,120,200'];

// remplissage de polygone sans anti-crénelage (pixel art)
function cmPoly(x, pts, col){
  const y0 = Math.floor(Math.min(...pts.map(p => p[1]))), y1 = Math.ceil(Math.max(...pts.map(p => p[1]))); x.fillStyle = col;
  for(let y = y0; y < y1; y++){ const yy = y + .5, xs = [];
    for(let i = 0; i < pts.length; i++){ const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay)/(by - ay)*(bx - ax)); }
    xs.sort((m, n) => m - n); for(let k = 0; k + 1 < xs.length; k += 2){ const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if(b > a) x.fillRect(a, y, b - a, 1); } }
}
function cmBuild(){
  const L = {}, [c, x] = mkcv(VW, VH), R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // ---------- MUR (fond) ----------
  const g = x.createLinearGradient(0, 0, 0, 270); g.addColorStop(0, '#0f0830'); g.addColorStop(.45, '#2a1670'); g.addColorStop(.85, '#762c9c'); g.addColorStop(1, '#b84aa0'); x.fillStyle = g; x.fillRect(0, 0, VW, 270);
  for(let py = 8, r = 0; py < 262; py += 18, r++) for(let px = (r % 2 ? 9 : 0); px < VW; px += 18){ R('rgba(255,255,255,.075)', px, py - 2, 1, 5); R('rgba(255,255,255,.075)', px - 2, py, 5, 1); }   // motif de losanges
  for(let k = 0; k < 8; k++){ const a = .035 - k*.003; R(`rgba(255,255,255,${a})`, 0, 30 + k*28, VW, 1); }
  // grand écran LED rond (cadre doré + fond sombre)
  x.fillStyle = '#0a0418'; x.beginPath(); x.arc(CMX, 150, 90, 0, 6.283); x.fill();
  x.fillStyle = '#7a4a10'; x.beginPath(); x.arc(CMX, 150, 87, 0, 6.283); x.fill(); x.fillStyle = '#e8b84a'; x.beginPath(); x.arc(CMX, 150, 85, 0, 6.283); x.fill(); x.fillStyle = '#fff0a8'; x.beginPath(); x.arc(CMX, 147, 84, Math.PI*1.1, Math.PI*1.9); x.fill();
  x.fillStyle = '#e8b84a'; x.beginPath(); x.arc(CMX, 150, 83, 0, 6.283); x.fill();
  const pg = x.createRadialGradient(CMX, 150, 4, CMX, 150, 76); pg.addColorStop(0, '#4a1a8a'); pg.addColorStop(1, '#14062e'); x.fillStyle = '#0a0418'; x.beginPath(); x.arc(CMX, 150, 77, 0, 6.283); x.fill(); x.fillStyle = pg; x.beginPath(); x.arc(CMX, 150, 75, 0, 6.283); x.fill();
  L.wall = c;
  // trame de points LED par-dessus le disque
  { const [l, lx] = mkcv(VW, 300); lx.fillStyle = 'rgba(0,0,0,.32)'; for(let py = 76; py < 226; py += 4) for(let px = CMX - 76; px < CMX + 76; px += 4){ if((px - CMX)**2 + (py - 150)**2 < 74*74) lx.fillRect(px + 2, py + 2, 2, 2); } L.led = l; }
  // ---------- AVANT-PLAN : rideaux, lambrequin, rampe, scène, podium ----------
  const [f, fx] = mkcv(VW, VH), F = (col, a, b, w, h) => { fx.fillStyle = col; fx.fillRect(a, b, w, h); };
  // rampe de projecteurs (structure métallique)
  F('#0a0418', 60, 36, 520, 12); F('#4a5070', 60, 37, 520, 3); F('#2a2e44', 60, 40, 520, 5); F('#0a0418', 60, 45, 520, 1);
  for(let px = 62; px < 578; px += 12){ fx.strokeStyle = '#7a82a8'; fx.lineWidth = 1; fx.beginPath(); fx.moveTo(px, 47); fx.lineTo(px + 6, 39); fx.lineTo(px + 12, 47); fx.stroke(); }
  [200, 300, 400, 500, 590].forEach(lx0 => { F('#0a0418', lx0 - 9, 46, 18, 14); F('#3a3e5c', lx0 - 8, 47, 16, 11); F('#5a608a', lx0 - 8, 47, 16, 2); F('#14101c', lx0 - 1, 40, 2, 7); });
  // rideaux latéraux (noués par une embrasse dorée)
  [0, 1].forEach(side => {
    const X = px => side ? VW - px : px;
    fx.save(); fx.beginPath(); [[0, 0], [94, 0], [94, 146], [66, 160], [60, 262], [0, 262]].forEach(([a, b], i) => i ? fx.lineTo(X(a), b) : fx.moveTo(X(a), b)); fx.closePath(); fx.clip();
    const cols = ['#8a1f58', '#c63a78', '#f27aa8', '#c63a78'];
    for(let k = 0; k < 10; k++){ const gx = side ? VW - (k + 1)*10 : k*10; fx.fillStyle = cols[k % 4]; fx.fillRect(gx, 0, 10, 262); fx.fillStyle = 'rgba(255,255,255,.14)'; fx.fillRect(gx + (k % 4 === 2 ? 4 : 1), 0, 2, 262); }
    const sg = fx.createLinearGradient(0, 0, 0, 262); sg.addColorStop(0, 'rgba(0,0,0,.35)'); sg.addColorStop(.25, 'rgba(0,0,0,0)'); sg.addColorStop(1, 'rgba(60,0,40,.45)'); fx.fillStyle = sg; fx.fillRect(0, 0, VW, 262);
    fx.restore();
    // embrasse + gland
    cmPoly(fx, [[X(66), 150], [X(90), 143], [X(90), 149], [X(66), 158]], '#14101c'); cmPoly(fx, [[X(66), 151], [X(89), 144.5], [X(89), 147.5], [X(66), 155]], '#ffd23f');
    F('#14101c', X(66) - 4, 156, 9, 20); F('#e8b84a', X(66) - 3, 157, 7, 4); for(let k = 0; k < 7; k++) F(k % 2 ? '#ffd23f' : '#c08a20', X(66) - 3 + k, 161, 1, 14);
    for(let k = 0; k < 9; k++) F(k % 2 ? '#ffd23f' : '#c08a20', side ? VW - 66 + k*7 : k*7, 258, 5, 4);
  });
  // lambrequin
  F('#14081e', 0, 0, VW, 36); const vg = fx.createLinearGradient(0, 0, 0, 28); vg.addColorStop(0, '#ff9ec0'); vg.addColorStop(1, '#d8487a'); fx.fillStyle = vg; fx.fillRect(0, 0, VW, 28); F('#fff0f6', 0, 1, VW, 2);
  for(let px = 0; px < VW; px += 32){ fx.fillStyle = '#14081e'; fx.beginPath(); fx.arc(px + 16, 28, 17, 0, Math.PI); fx.fill(); fx.fillStyle = '#d8487a'; fx.beginPath(); fx.arc(px + 16, 28, 15, 0, Math.PI); fx.fill(); fx.fillStyle = '#ff9ec0'; fx.beginPath(); fx.arc(px + 16, 27, 11, 0, Math.PI); fx.fill();
    for(let k = 0; k < 5; k++) F(k % 2 ? '#ffd23f' : '#c08a20', px + 6 + k*5, 43 - (k === 2 ? 0 : 3) - 0, 3, 3 + (k === 2 ? 4 : 0)); }
  F('#e8b84a', 0, 0, VW, 2); F('#14081e', 0, 0, VW, 1);
  // scène : parquet verni
  const fg = fx.createLinearGradient(0, 262, 0, 336); fg.addColorStop(0, '#f6e2a2'); fg.addColorStop(.55, '#d8a850'); fg.addColorStop(1, '#a8702e'); fx.fillStyle = fg; fx.fillRect(0, 262, VW, 74);
  fx.strokeStyle = 'rgba(100,50,10,.28)'; fx.lineWidth = 1; for(let k = -16; k <= 16; k++){ fx.beginPath(); fx.moveTo(CMX + k*17, 262); fx.lineTo(CMX + k*46, 336); fx.stroke(); }
  for(let yy = 268, st = 7; yy < 336; yy += st, st *= 1.18) F('rgba(100,50,10,.28)', 0, yy | 0, VW, 1);
  for(let k = 0; k < 6; k++){ fx.fillStyle = 'rgba(255,255,255,.1)'; cmPoly(fx, [[40 + k*110, 262], [58 + k*110, 262], [26 + k*110, 336], [0 + k*110, 336]], 'rgba(255,255,255,.07)'); }
  F('#14081e', 0, 258, VW, 5); F('#5b7cf0', 0, 259, VW, 2); F('#a8bcff', 0, 259, VW, 1);
  F('#14081e', 0, 330, VW, 7); F('#ffd23f', 0, 331, VW, 2); F('#fff6b8', 0, 331, VW, 1); F('#8a5a10', 0, 334, VW, 2); F('#0a0412', 0, 337, VW, VH - 337);
  // podium à deux niveaux
  const E = (col, cx, cy, rx, ry) => { fx.fillStyle = col; fx.beginPath(); fx.ellipse(cx, cy, rx, ry, 0, 0, 6.283); fx.fill(); };
  E('#14081e', CMX, 296, 100, 25); E('#8a5a28', CMX, 292, 98, 22); E('#e8b84a', CMX, 288, 98, 22); E('#fff0b8', CMX, 287, 94, 20);
  E('#14081e', CMX, 289, 76, 16); E('#d8488a', CMX, 288, 74, 15); E('#ff8ac0', CMX, 286, 72, 13); E('#ffd0e8', CMX, 284, 60, 9);
  for(let k = 0; k < 14; k++){ const a = k*.4488; F('#fff', Math.round(CMX + Math.cos(a)*90) - 1, Math.round(288 + Math.sin(a)*19) - 1, 2, 2); }
  L.fg = f;
  // ---------- PUBLIC : 2 rangées de silhouettes avec liseré lumineux ----------
  const aud = (r, col, off, rim) => { const [a, ax] = mkcv(VW + 60, 50);
    for(let px = off; px < VW + 60; px += r*2.05){ const hy = 16 + ((px*7) % 5), hh = r;
      ax.fillStyle = col; ax.beginPath(); ax.arc(px, hy, hh, 0, 6.283); ax.fill(); ax.beginPath(); ax.ellipse(px, hy + hh*1.9, hh*1.45, hh*1.2, 0, Math.PI, 6.283); ax.fill(); ax.fillRect(px - hh*1.45, hy + hh*1.9, hh*2.9, 40);
      ax.strokeStyle = rim; ax.lineWidth = 1.5; ax.beginPath(); ax.arc(px, hy, hh, Math.PI*1.1, Math.PI*1.9); ax.stroke(); }
    return a; };
  L.aud1 = aud(11, '#240e40', 8, 'rgba(255,140,220,.45)'); L.aud2 = aud(15, '#0b0418', 0, 'rgba(255,170,230,.3)');
  CM.L = L;
  CM.rib = CONTEST_STATS.map((s, i) => { const im = new Image(); im.src = ribbonImg(s.id, i % 4); return { im, a:i*1.05, r:100 + (i % 3)*14, sp:.3 + (i % 4)*.06, y:(i % 2 ? -1 : 1)*(8 + i*5) }; });
  CM.stars = Array.from({ length:40 }, () => ({ x:200 + Math.random()*440, y:50 + Math.random()*200, p:Math.random()*6.28, s:1 + Math.random()*1.4 }));
  CM.sticks = Array.from({ length:26 }, (_, i) => ({ x:24 + i*25 + Math.random()*10, y:342 + (i % 3)*4, col:['#ff5a8a', '#5ab8ff', '#7aff9a', '#ffd23f', '#c06eff'][i % 5], p:Math.random()*6.28 }));
  CM.list = ORDER.filter(id => SPR[id]).sort(() => Math.random() - .5);
}

// étincelles de changement de Pokémon / canon à confettis / cœurs qui montent
function cmSparkBurst(n, x0, y0, big){
  const cols = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']);
  for(let i = 0; i < n; i++){ const a = Math.random()*6.283, v = 40 + Math.random()*(big ? 170 : 110); CM.parts.push({ x:x0, y:y0, vx:Math.cos(a)*v, vy:Math.sin(a)*v*.8 - 30, g:90, life:.8 + Math.random()*.9, t:0, c:cols[(Math.random()*cols.length) | 0], s:Math.random() < .35 ? 2 : 1 }); }
}
function cmCannon(side){
  const cols = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']), x0 = side ? VW - 8 : 300, y0 = 250;
  for(let i = 0; i < 80; i++){ const ang = side ? Math.PI + .35 + Math.random()*.9 : -.35 - Math.random()*.9, v = 150 + Math.random()*230;
    CM.conf.push({ x:x0, y:y0, vx:Math.cos(ang)*v, vy:-Math.abs(Math.sin(ang))*v, w:2 + (Math.random()*3 | 0), h:2 + (Math.random()*2 | 0), c:cols[(Math.random()*cols.length) | 0], ph:Math.random()*6.28, vph:6 + Math.random()*8 }); }
}
const CM_HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
function cmHeart(x, px, py, col){ x.fillStyle = col; CM_HEART.forEach((r, j) => { for(let i = 0; i < 7; i++) if(r[i] === '#') x.fillRect(px + i, py + j, 1, 1); }); }

function drawContestScene(dt){
  if(!CM.L) cmBuild();
  if(CM.pause) return;
  const L = CM.L, t = CM.t += dt, bpm = 3.4, mx = CMX, my = CMY;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#0a0412'; ctx.fillRect(0, 0, VW, VH); ctx.translate(0, -10);          // (sur écran large le haut et le bas sont rognés : on remonte un peu la scène)
  ctx.drawImage(L.wall, 0, 0);
  // rayons tournants derrière l'écran
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for(let k = 0; k < 20; k++){ const a0 = k*.31416 + t*.1; ctx.fillStyle = k % 2 ? 'rgba(255,170,230,.055)' : 'rgba(255,226,122,.045)'; ctx.beginPath(); ctx.moveTo(mx, 150); ctx.arc(mx, 150, 420, a0, a0 + .157); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // écran LED : emblème qui tourne (5 pétales = 5 catégories)
  ctx.save(); ctx.beginPath(); ctx.arc(mx, 150, 75, 0, 6.283); ctx.clip();
  const pulse = (t % 2.2)/2.2; ctx.strokeStyle = `rgba(255,170,230,${.5*(1 - pulse)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(mx, 150, 10 + pulse*66, 0, 6.283); ctx.stroke();
  for(let i = 0; i < 5; i++){ const a = i*1.2566 + t*.55, px = mx + Math.cos(a)*26, py = 150 + Math.sin(a)*26; ctx.save(); ctx.translate(px, py); ctx.rotate(a); ctx.fillStyle = CONTEST_STATS[i].col; ctx.beginPath(); ctx.ellipse(0, 0, 21, 10, 0, 0, 6.283); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.beginPath(); ctx.ellipse(-3, -3, 12, 3, 0, 0, 6.283); ctx.fill(); ctx.restore(); }
  ctx.fillStyle = '#14081e'; ctx.beginPath(); ctx.arc(mx, 150, 14, 0, 6.283); ctx.fill(); ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(mx, 150, 11, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff6b8'; ctx.beginPath(); ctx.arc(mx - 2, 147, 5, 0, 6.283); ctx.fill();
  for(let i = 0; i < 8; i++){ const a = -t*.9 + i*.785, rr = 56 + Math.sin(t*2 + i)*5; ctx.fillStyle = '#fff'; ctx.fillRect(Math.round(mx + Math.cos(a)*rr), Math.round(150 + Math.sin(a)*rr), 2, 2); }
  ctx.restore(); ctx.drawImage(L.led, 0, 0);
  // ampoules du cadre qui courent
  for(let k = 0; k < 36; k++){ const a = k*.1745, on = ((k + (t*10 | 0)) % 4) < 2, bx = Math.round(mx + Math.cos(a)*81), by = Math.round(150 + Math.sin(a)*81); ctx.fillStyle = on ? '#fffbe0' : '#a8781c'; ctx.fillRect(bx - 1, by - 1, 3, 3); if(on){ ctx.fillStyle = 'rgba(255,240,160,.3)'; ctx.fillRect(bx - 3, by - 3, 7, 7); } }
  // étoiles scintillantes
  CM.stars.forEach(s => { const a = Math.max(0, Math.sin(t*2 + s.p)); if((s.x - mx)**2 + (s.y - 150)**2 < 94*94) return; ctx.fillStyle = `rgba(255,240,200,${.25 + a*.75})`; ctx.fillRect(s.x | 0, s.y | 0, 1, 1); if(a > .8){ ctx.fillRect((s.x | 0) - 2, s.y | 0, 5, 1); ctx.fillRect(s.x | 0, (s.y | 0) - 2, 1, 5); } });
  // projecteurs : faisceaux colorés qui balaient + flaques de lumière
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [200, 300, 400, 500, 590].forEach((sx, i) => { const tx = mx + Math.sin(t*.7 + i*1.3)*80, col = CM_BEAM[(i + Math.floor(t/3)) % 5], a = .13 + .05*Math.sin(t*2 + i);
    ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.moveTo(sx - 5, 58); ctx.lineTo(sx + 5, 58); ctx.lineTo(tx + 48, 292); ctx.lineTo(tx - 48, 292); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(${col},${a*1.5})`; ctx.beginPath(); ctx.ellipse(tx, 292, 48, 8, 0, 0, 6.283); ctx.fill();
    ctx.fillStyle = `rgba(${col},.9)`; ctx.fillRect(sx - 5, 57, 10, 3); });
  ctx.restore();
  ctx.drawImage(L.fg, 0, 0);
  // ampoules du lambrequin + rampe de la scène
  for(let k = 0; k < 40; k++){ const on = ((k + (t*8 | 0)) % 6) < 2; ctx.fillStyle = on ? '#fff6a8' : '#a8466e'; ctx.fillRect(k*16 + 6, 30, 4, 4); if(on){ ctx.fillStyle = 'rgba(255,240,160,.25)'; ctx.fillRect(k*16 + 3, 27, 10, 10); } }
  for(let k = 0; k < 32; k++){ const on = ((k + (t*7 | 0)) % 3) === 0; ctx.fillStyle = on ? '#fffbe0' : '#b88a2a'; ctx.fillRect(k*20 + 8, 332, 4, 3); if(on){ ctx.fillStyle = 'rgba(255,240,160,.28)'; ctx.fillRect(k*20 + 5, 326, 10, 10); } }
  // anneau lumineux du podium (néon rose qui pulse)
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,120,200,${.55 + .25*Math.sin(t*3)})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(mx, 288, 76, 16, 0, 0, 6.283); ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(mx, 288, 76, 16, 0, 0, 6.283); ctx.stroke(); ctx.restore();
  // serpentins suspendus
  [[250, '#ff7ac8'], [350, '#ffd23f'], [560, '#5ab8ff'], [610, '#7aff9a']].forEach(([sx, col], i) => { ctx.fillStyle = col; for(let y = 48; y < 120 + (i % 2)*30; y += 2){ const u = (y - 48)/60, xx = sx + Math.sin(u*6 + t*1.6 + i)*6*u; ctx.fillRect(Math.round(xx), y, 2, 2); } });
  // Pokémon sur le podium (change toutes les 6,5 s) + reflet + rubans en orbite
  const per = 6.5;
  if(CM.list.length){
    const idx = Math.floor(t/per), pid = CM.list[idx % CM.list.length];
    if(idx !== CM.mon){ CM.mon = idx; CM.swT = t; cmSparkBurst(70, mx, my - 30, true); }
    const lt = t - idx*per, ph = Math.floor(lt/1.6) % 4, pos = [ANIM.hop, ANIM.idle, ANIM.atk, ANIM.hop][ph], row = [0, 2, 0, 6][ph];
    const lift = pos === ANIM.hop ? Math.abs(Math.sin(lt*bpm*1.2))*8 : 0, a = Math.min(1, (t - CM.swT)/.35), px = mx + (ph === 0 ? Math.sin(lt*bpm)*6 : 0);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ag = ctx.createRadialGradient(mx, my - 40, 8, mx, my - 40, 120); ag.addColorStop(0, `rgba(255,180,240,${.28 + .08*Math.sin(t*3)})`); ag.addColorStop(1, 'rgba(255,120,200,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(mx, my - 40, 120, 0, 6.283); ctx.fill(); ctx.restore();
    const rib = (r, front) => { const ang = r.a + t*r.sp, z = Math.sin(ang); if((z > 0) !== front) return; const rx = mx + Math.cos(ang)*r.r*1.5, ry = my - 56 + r.y + z*16 + Math.sin(t*2 + r.a)*3, k = front ? 1.35 : 1;
      if(!r.im.complete || !r.im.width) return; ctx.globalAlpha = front ? 1 : .7; ctx.drawImage(r.im, Math.round(rx - r.im.width*k/2), Math.round(ry - r.im.height*k/2), Math.round(r.im.width*k), Math.round(r.im.height*k)); ctx.globalAlpha = 1; };
    CM.rib.forEach(r => rib(r, false));
    ctx.save(); ctx.beginPath(); ctx.rect(0, my, VW, 330 - my); ctx.clip(); ctx.translate(0, 2*my); ctx.scale(1, -1); conMon(ctx, pid, pos, t, row, px, my - lift, 3, { alpha:.16*a, noShadow:true }); ctx.restore();   // reflet sur le parquet
    conMon(ctx, pid, pos, t, row, px, my - lift, 3, { alpha:a });
    CM.rib.forEach(r => rib(r, true));
    const nm = (NAME[pid] || pid).toUpperCase(); ctx.font = 'bold 9px "Courier New",monospace'; ctx.textAlign = 'center'; const w = ctx.measureText(nm).width + 22;
    ctx.fillStyle = '#14081e'; ctx.fillRect(mx - w/2 - 1, 311, w + 2, 15); ctx.fillStyle = '#e8b84a'; ctx.fillRect(mx - w/2, 312, w, 13); ctx.fillStyle = '#5a1a4a'; ctx.fillRect(mx - w/2 + 2, 314, w - 4, 9);
    ctx.fillStyle = '#14081e'; ctx.fillText(nm, mx + 1, 322); ctx.fillStyle = '#ffe8f4'; ctx.fillText(nm, mx, 321);
    if(Math.random() < dt*2.5) CM.hearts.push({ x:mx + (Math.random() - .5)*150, y:my - 10, vy:-14 - Math.random()*14, p:Math.random()*6.28, t:0, c:Math.random() < .5 ? '#ff7ac8' : '#ffffff' });
  }
  for(let i = CM.hearts.length - 1; i >= 0; i--){ const h = CM.hearts[i]; h.t += dt; h.y += h.vy*dt; if(h.t > 4.2){ CM.hearts.splice(i, 1); continue; } ctx.globalAlpha = Math.min(1, (4.2 - h.t)); cmHeart(ctx, Math.round(h.x + Math.sin(h.t*2 + h.p)*6), Math.round(h.y), h.c); } ctx.globalAlpha = 1;
  // étincelles
  for(let i = CM.parts.length - 1; i >= 0; i--){ const p = CM.parts[i]; p.t += dt; if(p.t > p.life){ CM.parts.splice(i, 1); continue; } p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    ctx.globalAlpha = Math.min(1, (p.life - p.t)*2.5); ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, p.s + 1, p.s + 1); if(p.s > 1){ ctx.fillRect((p.x | 0) - 1, p.y | 0, 4, 1); ctx.fillRect(p.x | 0, (p.y | 0) - 1, 1, 4); } }
  ctx.globalAlpha = 1;
  // public + bâtons lumineux + flashs d'appareils
  const b1 = Math.sin(t*bpm)*2, b2 = Math.sin(t*bpm + 1.6)*3;
  ctx.drawImage(L.aud1, -30, Math.round(322 + b1)); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  CM.sticks.forEach(s => { const sw = Math.sin(t*bpm*1.2 + s.p)*9, sx = s.x, sy = s.y + b2*.5; ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy - 16); ctx.stroke();
    const gg = ctx.createRadialGradient(sx + sw, sy - 16, 0, sx + sw, sy - 16, 10); gg.addColorStop(0, s.col); gg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = .6; ctx.fillStyle = gg; ctx.fillRect(sx + sw - 10, sy - 26, 20, 20); ctx.globalAlpha = 1; });
  ctx.restore(); ctx.drawImage(L.aud2, -30, Math.round(342 + b2));
  if(Math.random() < dt*3) CM.flash.push({ x:30 + Math.random()*580, y:336 + Math.random()*20, t:0 });
  for(let i = CM.flash.length - 1; i >= 0; i--){ const f = CM.flash[i]; f.t += dt; if(f.t > .14){ CM.flash.splice(i, 1); continue; } ctx.fillStyle = '#fff'; ctx.fillRect((f.x | 0) - 3, f.y | 0, 7, 1); ctx.fillRect(f.x | 0, (f.y | 0) - 3, 1, 7); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect((f.x | 0) - 1, (f.y | 0) - 1, 3, 3); }
  // confettis : pluie continue + canons
  const cols = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']);
  if(CM.conf.length < 140 && Math.random() < dt*30) CM.conf.push({ x:Math.random()*VW, y:-4, vx:(Math.random() - .5)*14, vy:24 + Math.random()*40, w:2 + (Math.random()*2 | 0), h:2 + (Math.random()*2 | 0), c:cols[(Math.random()*cols.length) | 0], ph:Math.random()*6.28, vph:4 + Math.random()*6 });
  CM.burstT -= dt; if(CM.burstT <= 0){ CM.burstT = 9 + Math.random()*5; cmCannon(Math.random() < .5 ? 1 : 0); }
  for(let i = CM.conf.length - 1; i >= 0; i--){ const q = CM.conf[i]; q.vy += 120*dt; q.vy = Math.min(q.vy, 70 + q.h*8); q.vx *= 1 - .8*dt; q.x += (q.vx + Math.sin(t*2 + q.ph)*10)*dt; q.y += q.vy*dt; q.ph += q.vph*dt;
    if(q.y > VH + 6){ CM.conf.splice(i, 1); continue; } ctx.fillStyle = q.c; ctx.fillRect(q.x | 0, q.y | 0, Math.max(1, Math.round(q.w*Math.abs(Math.cos(q.ph)))), q.h); }
  const vg = ctx.createRadialGradient(VW*.68, VH*.5, VH*.3, VW*.68, VH*.5, VW*.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(10,0,24,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}
const _dmsCM = drawMenuScene;
drawMenuScene = function(dt){ return MBG.scene === 'contest' ? drawContestScene(dt) : _dmsCM(dt); };

// ---------- activation : le menu « Concours » (tous ses écrans) prend la scène + le « swipe » ----------
const _menuCM = menu;
menu = function(h){
  const was = MBG.scene, hh = h || '';
  if(hh.includes("class='mm'") || (typeof G !== 'undefined' && G)) CM.on = false;           // retour à l'accueil / combat : le fond du concours s'arrête
  const isCon = CM.on, play = hh.includes("class='cwrap'");
  _menuCM(h);                                                                              // (le menu Mewtwo remet la scène à null : on la reprend)
  if(isCon){ MBG.scene = 'contest'; CM.pause = play; } else CM.pause = false;
  const m = document.getElementById('menu'); if(!m) return;
  m.classList.toggle('cscene', isCon && !play);
  if(isCon && CM.fresh){ CM.fresh = false; m.classList.remove('cswin'); void m.offsetWidth; m.classList.add('cswin'); }
  if(!isCon) m.classList.remove('cswin');
};
const _scrCM = SCREENS.contest;
SCREENS.contest = function(){ CM.on = true; CM.fresh = true; _scrCM(); };
document.head.insertAdjacentHTML('beforeend', `<style>
#menu.cscene{background:linear-gradient(90deg,rgba(20,6,40,.93) 0%,rgba(20,6,40,.78) 48%,rgba(20,6,40,.18) 76%,rgba(20,6,40,0) 100%);-webkit-backdrop-filter:none;backdrop-filter:none}
#menu.cscene .mc{align-items:flex-start!important;padding-left:calc(14px + env(safe-area-inset-left,0px))}
#menu.cscene .mc>*{max-width:55%}
#menu.cscene .hd{justify-content:flex-start;gap:10px}
#menu.cscene h1{background:linear-gradient(180deg,#fff6c8 0%,#ffd23f 45%,#ff7ac8 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 2px 0 #2a0a3a) drop-shadow(0 0 10px rgba(255,140,210,.55))}
#menu.cscene h1::after{background:linear-gradient(90deg,#ffd23f,transparent)}
#menu.cscene .row{justify-content:flex-start}
#menu.cswin .mc{animation:mwin .55s cubic-bezier(.2,.9,.25,1) both}
#menu.cswin::before{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(100deg,transparent 30%,rgba(255,122,200,.55) 44%,rgba(255,226,122,.9) 50%,rgba(255,122,200,.55) 56%,transparent 70%);animation:mwipe .65s ease-out forwards}
</style>`);
