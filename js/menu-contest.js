// ============================================================
//  menu-contest.js — ÉCRANS DU « CONCOURS POKÉMON » avec fond animé (comme le menu du Défi Mewtwo)
//    • Arrivée en « swipe » (un balayage rose et or traverse l'écran) quand on clique sur « Concours Pokémon »
//    • Fond animé : salle de concours — rideaux roses, lambrequin aux ampoules qui courent, 3 loges de jury
//      qui lèvent leurs notes, projecteurs qui balaient, public avec bâtons lumineux et flashs d'appareils,
//      confettis qui tombent en continu (+ gros canons à confettis), un Pokémon différent qui danse sur le podium
//      (étincelles à chaque changement) et des rubans qui tournent autour de lui.
//  Actif pour tous les écrans du concours (hub, choix, Pokémon, marché, cuisine, rubans, résultats).
//  Les épreuves jouables (canvas) mettent le fond en pause.
// ============================================================
const CM = { L:null, t:0, parts:[], conf:[], list:[], mon:0, swT:-9, burstT:5, rib:null, flash:[], jd:null, on:false, fresh:false, pause:false, pf:0 };

function cmBuild(){
  const L = {}, [c, x] = mkcv(VW, VH), R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // mur du fond : dégradé violet + bandes
  const g = x.createLinearGradient(0, 0, 0, 262); g.addColorStop(0, '#1b1048'); g.addColorStop(.6, '#46228a'); g.addColorStop(1, '#8a3aa0'); x.fillStyle = g; x.fillRect(0, 0, VW, 262);
  for(let px = 0; px < VW; px += 24){ R(px % 48 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.12)', px, 0, 24, 262); }
  const hg = x.createRadialGradient(470, 150, 10, 470, 150, 260); hg.addColorStop(0, 'rgba(255,170,230,.4)'); hg.addColorStop(1, 'rgba(255,170,230,0)'); x.fillStyle = hg; x.fillRect(0, 0, VW, 262);
  // emblème de concours (rosette) au centre haut
  x.save(); x.translate(470, 66); x.strokeStyle = 'rgba(255,226,122,.55)'; x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 26, 0, 6.283); x.stroke(); x.lineWidth = 1; x.beginPath(); x.arc(0, 0, 20, 0, 6.283); x.stroke();
  for(let k = 0; k < 12; k++){ const a = k*.5236; x.fillStyle = 'rgba(255,226,122,.5)'; x.beginPath(); x.arc(Math.cos(a)*26, Math.sin(a)*26, 3, 0, 6.283); x.fill(); } x.restore();
  // loges de jury (3) : cadre doré, fenêtre éclairée, pupitre de notes
  [372, 470, 568].forEach(cx => {
    R('#14081e', cx - 44, 90, 88, 66); R('#e8b84a', cx - 42, 92, 84, 62); R('#2a1244', cx - 40, 94, 80, 58);
    const wg = x.createLinearGradient(0, 96, 0, 140); wg.addColorStop(0, '#fff0b8'); wg.addColorStop(1, '#f0b060'); x.fillStyle = wg; x.fillRect(cx - 36, 98, 72, 44);
    R('#7a3a2a', cx - 36, 132, 72, 10); R('#a85a3a', cx - 36, 132, 72, 2);
    R('#14081e', cx - 40, 156, 80, 14); R('#e8b84a', cx - 40, 156, 80, 1);
  });
  // rideaux latéraux + lambrequin
  [[0, 1], [VW - 70, -1]].forEach(([sx, dir]) => {
    const cg = x.createLinearGradient(sx, 0, sx + 70, 0); cg.addColorStop(dir > 0 ? 0 : 1, '#8a1f4f'); cg.addColorStop(dir > 0 ? 1 : 0, '#e8628a'); x.fillStyle = cg; x.fillRect(sx, 0, 70, 262);
    for(let k = 0; k < 7; k++){ R('rgba(0,0,0,.22)', sx + k*10 + 3, 0, 3, 262); R('rgba(255,255,255,.12)', sx + k*10 + 6, 0, 2, 262); }
    for(let yy = 0; yy < 262; yy += 6){ R('rgba(0,0,0,.08)', sx, yy, 70, 1); }
    R('#e8b84a', sx, 258, 70, 4); for(let k = 0; k < 14; k++) R('#ffe27a', sx + k*5, 262, 2, 6);
  });
  R('#14081e', 0, 0, VW, 34); const vg = x.createLinearGradient(0, 0, 0, 30); vg.addColorStop(0, '#ff9ec0'); vg.addColorStop(1, '#d8487a'); x.fillStyle = vg; x.fillRect(0, 0, VW, 28);
  for(let px = 0; px < VW; px += 32){ x.fillStyle = '#d8487a'; x.beginPath(); x.arc(px + 16, 28, 16, 0, Math.PI); x.fill(); x.fillStyle = '#ff9ec0'; x.beginPath(); x.arc(px + 16, 27, 11, 0, Math.PI); x.fill(); R('#e8b84a', px + 15, 30, 2, 8); }
  R('#e8b84a', 0, 0, VW, 3);
  // scène en bois + rebord + rampe de lumières
  const fg = x.createLinearGradient(0, 262, 0, VH); fg.addColorStop(0, '#f2d890'); fg.addColorStop(.5, '#d6a850'); fg.addColorStop(1, '#8a5a2a'); x.fillStyle = fg; x.fillRect(0, 262, VW, VH - 262);
  x.strokeStyle = 'rgba(100,50,10,.25)'; x.lineWidth = 1; for(let k = -14; k <= 14; k++){ x.beginPath(); x.moveTo(470 + k*16, 262); x.lineTo(470 + k*58, VH); x.stroke(); }
  for(let yy = 270, s = 8; yy < VH; yy += s, s *= 1.28){ R('rgba(100,50,10,.22)', 0, yy | 0, VW, 1); }
  R('#14081e', 0, 258, VW, 5); R('#5b7cf0', 0, 259, VW, 2);
  // podium rond
  x.fillStyle = '#14081e'; x.beginPath(); x.ellipse(470, 288, 86, 22, 0, 0, 6.283); x.fill(); x.fillStyle = '#7a4a28'; x.beginPath(); x.ellipse(470, 284, 84, 20, 0, 0, 6.283); x.fill();
  x.fillStyle = '#e8b84a'; x.beginPath(); x.ellipse(470, 280, 84, 20, 0, 0, 6.283); x.fill(); x.fillStyle = '#fff6dc'; x.beginPath(); x.ellipse(470, 279, 78, 17, 0, 0, 6.283); x.fill();
  x.strokeStyle = '#ff7ac8'; x.lineWidth = 2; x.beginPath(); x.ellipse(470, 279, 60, 12, 0, 0, 6.283); x.stroke();
  L.base = c;
  // public : 2 rangées de silhouettes
  const aud = (y, r, col, off) => { const [a, ax] = mkcv(VW + 40, 60); ax.fillStyle = col;
    for(let px = off; px < VW + 40; px += r*2.1){ const hy = 18 + ((px*7) % 6); ax.beginPath(); ax.arc(px, hy, r, 0, 6.283); ax.fill(); ax.fillRect(px - r*1.15, hy + r*.6, r*2.3, 40); ax.fillStyle = col; }
    return a; };
  L.aud1 = aud(0, 10, '#2a1448', 8); L.aud2 = aud(0, 14, '#0e0620', 0);
  CM.L = L;
  CM.rib = CONTEST_STATS.map((s, i) => { const im = new Image(); im.src = ribbonImg(s.id, i % 4); return { im, a:i*1.05, r:92 + (i % 3)*14, sp:.32 + (i % 4)*.07, y:(i % 2 ? -1 : 1)*(8 + i*5) }; });
  CM.stars = Array.from({ length:34 }, () => ({ x:300 + Math.random()*340, y:36 + Math.random()*210, p:Math.random()*6.28, s:1 + Math.random()*1.6 }));
  CM.sticks = Array.from({ length:26 }, (_, i) => ({ x:30 + i*24 + Math.random()*10, y:336 + (i % 3)*6, col:['#ff5a8a', '#5ab8ff', '#7aff9a', '#ffd23f', '#c06eff'][i % 5], p:Math.random()*6.28 }));
  CM.judges = [{ skin:'#f0c090', hair:'#4a2a1a', suit:'#c8202c' }, { skin:'#d8a070', hair:'#e8e8f0', suit:'#2a6ac8' }, { skin:'#f6d0a8', hair:'#c8602a', suit:'#2aa850' }].map(j => ({ ...j, stars:4, shown:4, tt:Math.random()*3 }));
  CM.list = ORDER.filter(id => SPR[id]).sort(() => Math.random() - .5);
}

// étincelles de changement de Pokémon / canon à confettis
function cmSparkBurst(n, x0, y0, big){
  const cols = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']);
  for(let i = 0; i < n; i++){ const a = Math.random()*6.283, v = 40 + Math.random()*(big ? 170 : 110); CM.parts.push({ x:x0, y:y0, vx:Math.cos(a)*v, vy:Math.sin(a)*v*.8 - 30, g:90, life:.8 + Math.random()*.9, t:0, c:cols[(Math.random()*cols.length) | 0], s:Math.random() < .35 ? 2 : 1 }); }
}
function cmCannon(side){
  const cols = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']), x0 = side ? VW - 8 : 300, y0 = 250;
  for(let i = 0; i < 80; i++){ const a = (side ? Math.PI : 0) + (side ? 1 : -1)*(.5 + Math.random()*.8) - 0; const ang = side ? Math.PI + .35 + Math.random()*.9 : -.35 - Math.random()*.9 + 0, v = 150 + Math.random()*230;
    CM.conf.push({ x:x0, y:y0, vx:Math.cos(ang)*v, vy:-Math.abs(Math.sin(ang))*v, w:2 + (Math.random()*3 | 0), h:2 + (Math.random()*2 | 0), c:cols[(Math.random()*cols.length) | 0], ph:Math.random()*6.28, vph:6 + Math.random()*8 }); }
}

function drawContestScene(dt){
  if(!CM.L) cmBuild();
  if(CM.pause) return;
  const L = CM.L, t = CM.t += dt, bpm = 3.4;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(L.base, 0, 0);
  // ampoules du lambrequin qui courent
  for(let k = 0; k < 40; k++){ const on = ((k + (t*8 | 0)) % 6) < 2; ctx.fillStyle = on ? '#fff6a8' : '#a8466e'; ctx.fillRect(k*16 + 6, 31, 4, 4); if(on){ ctx.fillStyle = 'rgba(255,240,160,.25)'; ctx.fillRect(k*16 + 3, 28, 10, 10); } }
  // étoiles scintillantes sur le mur
  CM.stars.forEach(s => { const a = .3 + .7*Math.max(0, Math.sin(t*2 + s.p)); ctx.fillStyle = `rgba(255,240,200,${a*.8})`; ctx.fillRect(s.x | 0, s.y | 0, s.s | 0 || 1, s.s | 0 || 1); if(a > .85){ ctx.fillRect((s.x | 0) - 1, s.y | 0, 3, 1); ctx.fillRect(s.x | 0, (s.y | 0) - 1, 1, 3); } });
  // jury : visages, pupitres et étoiles
  [372, 470, 568].forEach((cx, i) => {
    const j = CM.judges[i]; j.tt -= dt; if(j.tt <= 0){ j.tt = 2.2 + Math.random()*2.4; j.stars = 3 + ((Math.random()*3) | 0); j.shown = 0; }
    j.shown = Math.min(j.stars, j.shown + dt*5);
    const bob = Math.sin(t*bpm + i)*1.5, hx = cx, hy = 122 + bob;
    ctx.fillStyle = j.suit; ctx.fillRect(hx - 12, hy + 6, 24, 14); ctx.fillStyle = '#fff'; ctx.fillRect(hx - 3, hy + 6, 6, 8);
    ctx.fillStyle = j.skin; ctx.beginPath(); ctx.arc(hx, hy, 8, 0, 6.283); ctx.fill(); ctx.fillStyle = j.hair; ctx.beginPath(); ctx.arc(hx, hy - 3, 8, Math.PI, 6.283); ctx.fill(); ctx.fillRect(hx - 8, hy - 3, 16, 2);
    ctx.fillStyle = '#14101c'; ctx.fillRect(hx - 4, hy, 2, 2); ctx.fillRect(hx + 2, hy, 2, 2); ctx.fillRect(hx - 2, hy + 4, 4, 1);
    for(let s = 0; s < 5; s++){ const on = s < Math.floor(j.shown); ctx.fillStyle = on ? '#ffd23f' : '#3a2858'; ctx.fillRect(cx - 34 + s*14, 159, 10, 8); if(on){ ctx.fillStyle = '#fff6b8'; ctx.fillRect(cx - 32 + s*14, 160, 3, 2); } }
  });
  // Pokémon sur le podium (change toutes les 6,5 s)
  const mx = 470, my = 281, per = 6.5;
  if(CM.list.length){
    const idx = Math.floor(t/per), pid = CM.list[idx % CM.list.length];
    if(idx !== CM.mon){ CM.mon = idx; CM.swT = t; cmSparkBurst(70, mx, my - 30, true); }
    const lt = t - idx*per, ph = Math.floor(lt/1.6) % 4, pos = [ANIM.hop, ANIM.idle, ANIM.atk, ANIM.hop][ph], row = [0, 2, 0, 6][ph];
    const lift = pos === ANIM.hop ? Math.abs(Math.sin(lt*bpm*1.2))*8 : 0, a = Math.min(1, (t - CM.swT)/.35);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; const ag = ctx.createRadialGradient(mx, my - 40, 8, mx, my - 40, 120); ag.addColorStop(0, `rgba(255,180,240,${.35 + .1*Math.sin(t*3)})`); ag.addColorStop(1, 'rgba(255,120,200,0)'); ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(mx, my - 40, 120, 0, 6.283); ctx.fill(); ctx.restore();
    // rubans qui tournent (derrière)
    const rib = (r, front) => { const ang = r.a + t*r.sp, z = Math.sin(ang); if((z > 0) !== front) return; const px = mx + Math.cos(ang)*r.r*1.5, py = my - 50 + r.y + z*16 + Math.sin(t*2 + r.a)*3, k = front ? 1.5 : 1.1;
      if(!r.im.complete) return; ctx.globalAlpha = front ? 1 : .7; ctx.drawImage(r.im, Math.round(px - 12*k), Math.round(py - 14*k), Math.round(24*k), Math.round(28*k)); ctx.globalAlpha = 1; };
    CM.rib.forEach(r => rib(r, false));
    conMon(ctx, pid, pos, t, row, mx + (ph === 0 ? Math.sin(lt*bpm)*6 : 0), my - lift, 3, { lift:0, alpha:a });
    CM.rib.forEach(r => rib(r, true));
    // plaquette du nom
    const nm = (NAME[pid] || pid).toUpperCase(); ctx.font = 'bold 9px "Courier New",monospace'; ctx.textAlign = 'center'; const w = ctx.measureText(nm).width + 18;
    ctx.fillStyle = '#14081e'; ctx.fillRect(mx - w/2 - 1, 301, w + 2, 15); ctx.fillStyle = '#ff9ec0'; ctx.fillRect(mx - w/2, 302, w, 13); ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(mx - w/2, 302, w, 4);
    ctx.fillStyle = '#14081e'; ctx.fillText(nm, mx + 1, 312); ctx.fillStyle = '#fff'; ctx.fillText(nm, mx, 311);
  }
  // projecteurs qui balaient
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  [350, 470, 590].forEach((sx, i) => { const tx = mx + Math.sin(t*.9 + i*2.1)*80, a = .1 + .05*Math.sin(t*2 + i);
    ctx.fillStyle = `rgba(255,240,180,${a})`; ctx.beginPath(); ctx.moveTo(sx - 5, 36); ctx.lineTo(sx + 5, 36); ctx.lineTo(tx + 44, 290); ctx.lineTo(tx - 44, 290); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,240,180,${a*.7})`; ctx.beginPath(); ctx.ellipse(tx, 290, 44, 8, 0, 0, 6.283); ctx.fill(); });
  ctx.restore();
  // étincelles
  for(let i = CM.parts.length - 1; i >= 0; i--){ const p = CM.parts[i]; p.t += dt; if(p.t > p.life){ CM.parts.splice(i, 1); continue; } p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    ctx.globalAlpha = Math.min(1, (p.life - p.t)*2.5); ctx.fillStyle = p.c; ctx.fillRect(p.x | 0, p.y | 0, p.s + 1, p.s + 1); if(p.s > 1){ ctx.fillRect((p.x | 0) - 1, p.y | 0, 4, 1); ctx.fillRect(p.x | 0, (p.y | 0) - 1, 1, 4); } }
  ctx.globalAlpha = 1;
  // public + bâtons lumineux + flashs d'appareils
  const b1 = Math.sin(t*bpm)*2, b2 = Math.sin(t*bpm + 1.6)*3;
  ctx.drawImage(L.aud1, -20, Math.round(310 + b1)); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  CM.sticks.forEach(s => { const sw = Math.sin(t*bpm*1.2 + s.p)*9, sx = s.x, sy = s.y + b2*.5; ctx.strokeStyle = s.col; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + sw, sy - 15); ctx.stroke();
    const gg = ctx.createRadialGradient(sx + sw, sy - 15, 0, sx + sw, sy - 15, 9); gg.addColorStop(0, s.col); gg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = .55; ctx.fillStyle = gg; ctx.fillRect(sx + sw - 9, sy - 24, 18, 18); ctx.globalAlpha = 1; });
  ctx.restore(); ctx.drawImage(L.aud2, -20, Math.round(332 + b2));
  if(Math.random() < dt*3) CM.flash.push({ x:30 + Math.random()*580, y:318 + Math.random()*30, t:0 });
  for(let i = CM.flash.length - 1; i >= 0; i--){ const f = CM.flash[i]; f.t += dt; if(f.t > .14){ CM.flash.splice(i, 1); continue; } ctx.fillStyle = '#fff'; ctx.fillRect((f.x | 0) - 3, f.y | 0, 7, 1); ctx.fillRect(f.x | 0, (f.y | 0) - 3, 1, 7); ctx.fillStyle = 'rgba(255,255,255,.5)'; ctx.fillRect((f.x | 0) - 1, (f.y | 0) - 1, 3, 3); }
  // confettis : pluie continue + canons
  const cols = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']);
  if(CM.conf.length < 140 && Math.random() < dt*30) CM.conf.push({ x:Math.random()*VW, y:-4, vx:(Math.random() - .5)*14, vy:24 + Math.random()*40, w:2 + (Math.random()*2 | 0), h:2 + (Math.random()*2 | 0), c:cols[(Math.random()*cols.length) | 0], ph:Math.random()*6.28, vph:4 + Math.random()*6 });
  CM.burstT -= dt; if(CM.burstT <= 0){ CM.burstT = 9 + Math.random()*5; cmCannon(Math.random() < .5 ? 1 : 0); }
  for(let i = CM.conf.length - 1; i >= 0; i--){ const q = CM.conf[i]; q.vy += 120*dt; q.vy = Math.min(q.vy, 70 + (q.h)*8); q.vx *= 1 - .8*dt; q.x += (q.vx + Math.sin(t*2 + q.ph)*10)*dt; q.y += q.vy*dt; q.ph += q.vph*dt;
    if(q.y > VH + 6){ CM.conf.splice(i, 1); continue; } ctx.fillStyle = q.c; ctx.fillRect(q.x | 0, q.y | 0, Math.max(1, Math.round(q.w*Math.abs(Math.cos(q.ph)))), q.h); }
  // vignette
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
