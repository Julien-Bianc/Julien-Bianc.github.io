// ============================================================
//  menu-bg.js — ARRIÈRE-PLAN ANIMÉ DES MENUS (v0.12)
//  Coucher de soleil sur l'Arène : ciel en dégradé tramé, soleil, nuages qui dérivent, montagnes en parallaxe,
//  le Colisée au loin (fenêtres qui scintillent), ton équipe sur la colline (sprites animés), un Pokémon qui
//  traverse le ciel, lucioles et pétales. Dessiné sur le canvas du jeu quand aucun combat n'est en cours.
//  Réglages : MENU_SCENE ci-dessous.
// ============================================================
const MENU_SCENE = {
  fps:30,
  flyer:['dracaufeu', 'cizayox', 'alakazam'],   // Pokémon qui traversent le ciel (le 1er qui existe), silhouette
  fallback:['dracaufeu', 'farfuret', 'lucario'] // si tu n'as pas encore d'équipe
};
const MBG = { L:null, last:0, t:0, parts:[], fly:null, nextFly:4, team:null };
const mkcv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const hx = c => [parseInt(c.slice(1, 3), 16), parseInt(c.slice(3, 5), 16), parseInt(c.slice(5, 7), 16)];

// ---------- couches fixes (construites une fois) ----------
function mbgBuild(){
  const L = {};
  // ciel : bandes de couleur avec tramage ordonné (pixel art)
  { const [c, x] = mkcv(VW, VH), stops = ['#1c1238', '#3a1d58', '#7a2c6a', '#c8486a', '#ef7a5a', '#ffb35a', '#ffd88a'], n = stops.length - 1;
    const C = stops.map(hx);
    for(let y = 0; y < VH; y++){ const v = Math.min(.999, Math.pow(y/(VH*.78), 1.15))*n, i = Math.floor(v), f = v - i;
      for(let px = 0; px < VW; px++){ const k = f > (BAYER[(y & 3)*4 + (px & 3)] + .5)/16 ? i + 1 : i, q = C[Math.min(n, k)]; x.fillStyle = `rgb(${q[0]},${q[1]},${q[2]})`; x.fillRect(px, y, 1, 1); } }
    // étoiles en haut
    for(let i = 0; i < 70; i++){ const sx = Math.random()*VW, sy = Math.random()*VH*.28; x.fillStyle = `rgba(255,240,255,${.3 + Math.random()*.6})`; x.fillRect(sx | 0, sy | 0, 1, 1); }
    L.sky = c; }
  // soleil (halo en anneaux)
  { const [c, x] = mkcv(220, 220), cx = 110;
    [[108, 'rgba(255,200,120,.10)'], [86, 'rgba(255,190,110,.14)'], [66, 'rgba(255,200,130,.2)'], [48, '#ffd890'], [42, '#ffe8b0'], [36, '#fff4d8']].forEach(([r, col]) => { x.fillStyle = col; x.beginPath(); x.arc(cx, cx, r, 0, 6.283); x.fill(); });
    x.fillStyle = 'rgba(255,170,110,.55)'; for(const [y, h] of [[118, 2], [126, 3], [136, 3]]) x.fillRect(cx - 50, y, 100, h);
    L.sun = c; }
  // montagnes lointaines / moyennes (bord dentelé, sommets enneigés)
  const ridge = (seed, base, amp, col, rim, snow) => {
    const [c, x] = mkcv(VW + 80, VH); let h = 0, v = 0; const R = rng(seed);
    for(let px = 0; px < VW + 80; px++){
      v += (R() - .5)*1.6; v *= .94; h += v; h = Math.max(-amp, Math.min(amp, h));
      const top = Math.round(base - amp - h*1.2 - Math.sin(px*.013 + seed)*amp*.6);
      x.fillStyle = col; x.fillRect(px, top, 1, VH - top);
      if(rim){ x.fillStyle = rim; x.fillRect(px, top, 1, 1); }
      if(snow && top < base - amp*1.15){ x.fillStyle = snow; x.fillRect(px, top, 1, Math.max(1, (base - amp*1.15 - top)*.6)); }
    }
    return c;
  };
  L.far = ridge(11, 228, 34, '#6a3a72', '#b0608a', '#e8b0c8');
  L.mid = ridge(29, 262, 22, '#3e2552', '#8a4a6a', null);
  // le Colisée (l'Arène) sur sa colline
  { const [c, x] = mkcv(240, 120), D = '#24142e', M = '#331c40', cx = 120, by = 96;
    x.fillStyle = D; x.beginPath(); x.ellipse(cx, by, 108, 22, 0, 0, 6.283); x.fill();
    x.fillRect(cx - 92, by - 48, 184, 48);
    x.fillStyle = M; for(let i = 0; i < 12; i++){ const ax = cx - 86 + i*15; x.fillRect(ax, by - 44, 9, 15); x.fillRect(ax, by - 22, 9, 15); }
    x.fillStyle = D; x.fillRect(cx - 96, by - 52, 192, 5); x.fillRect(cx - 92, by - 30, 184, 4);
    // tours + mâts à drapeaux
    for(const tx of [cx - 98, cx + 88]){ x.fillStyle = D; x.fillRect(tx, by - 70, 12, 70); x.fillRect(tx - 2, by - 74, 16, 5); x.fillRect(tx + 5, by - 92, 2, 18); }
    x.fillRect(cx - 1, by - 84, 2, 32);
    L.arena = c; L.win = [];                                 // fenêtres allumées (scintillent)
    for(let i = 0; i < 12; i++) for(const yy of [by - 40, by - 18]) if(Math.random() < .55) L.win.push([cx - 86 + i*15 + 3, yy, Math.random()*6.283]); }
  // colline du premier plan (rebord éclairé par le couchant)
  { const [c, x] = mkcv(VW, VH);
    for(let px = 0; px < VW; px++){
      const u = (px - 250)/390, top = Math.round(px < 250 ? 312 + (250 - px)*.08 : 300 - Math.sin(Math.min(1, u)*Math.PI*.9)*28 + Math.sin(px*.05)*2);
      x.fillStyle = '#1e2a2a'; x.fillRect(px, top, 1, VH - top);
      x.fillStyle = '#2c4034'; x.fillRect(px, top, 1, 6);
      x.fillStyle = '#f0a860'; x.fillRect(px, top, 1, 1); x.fillStyle = '#b06a4a'; x.fillRect(px, top + 1, 1, 1);
    }
    L.hill = c; L.hillTop = px => px < 250 ? 312 + (250 - px)*.08 : 300 - Math.sin(Math.min(1, (px - 250)/390)*Math.PI*.9)*28; }
  MBG.L = L;
}

// ---------- sprites animés (sans dépendre d'un combat en cours) ----------
function mbgFrame(id, anim, row, t, rate){
  const S = SPR[id]; if(!S) return null;
  const an = resolveAnim(S, anim) || resolveAnim(S, 'Idle') || 'Idle'; if(!S.D.anim[an]) return null;
  return snFrame(id, an, row, frameAt(S, an, t*(rate || 48), 1));
}
function mbgTeam(){
  const t = Save.team(Save.lastTeam) || Save.teams()[0], ids = (t ? t.members : []).filter(id => SPR[id]);
  const list = (ids.length ? ids : MENU_SCENE.fallback.filter(id => SPR[id])).slice(0, 3);
  return list;
}

// ---------- dessin d'une image ----------
function drawMenuScene(dt){
  if(!MBG.L) mbgBuild();
  const L = MBG.L, t = MBG.t += dt, sway = Math.sin(t*.07);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(L.sky, 0, 0);
  // soleil qui « respire »
  const sp = 1 + Math.sin(t*.8)*.015; ctx.drawImage(L.sun, 470 - 110*sp, 168 - 110*sp, 220*sp, 220*sp);
  // nuages
  for(let i = 0; i < 6; i++){
    const w = 70 + (i*37 % 60), y = 40 + (i*53 % 120), x = ((i*173 + t*(4 + i*1.3)) % (VW + 200)) - 120;
    ctx.fillStyle = i % 2 ? 'rgba(255,170,190,.35)' : 'rgba(200,120,170,.3)';
    for(let k = 0; k < 4; k++){ ctx.beginPath(); ctx.ellipse(Math.round(x + k*w*.22), Math.round(y - (k % 2)*5), w*.22, 7 + (k % 2)*3, 0, 0, 6.283); ctx.fill(); }
    ctx.fillStyle = 'rgba(255,220,200,.25)'; ctx.fillRect(Math.round(x - w*.1), Math.round(y + 5), Math.round(w*.85), 2);
  }
  ctx.drawImage(L.far, Math.round(-40 + sway*6), 0);
  // le Pokémon volant (silhouette) traverse le ciel
  MBG.nextFly -= dt;
  if(!MBG.fly && MBG.nextFly <= 0){ const id = MENU_SCENE.flyer.find(i => SPR[i]); if(id) MBG.fly = { id, x:-60, y:70 + Math.random()*60, t0:t }; MBG.nextFly = 14 + Math.random()*10; }
  if(MBG.fly){ const F = MBG.fly; F.x += dt*70; const fr = mbgFrame(F.id, 'Walk', 2, t - F.t0, 70);
    if(fr){ const y = F.y + Math.sin((t - F.t0)*2)*6; ctx.save(); ctx.globalAlpha = .85; ctx.drawImage(tintOf(fr, '#2a1438'), Math.round(F.x - fr.width*.6), Math.round(y - fr.height*.6), fr.width*1.2, fr.height*1.2); ctx.restore(); }
    if(F.x > VW + 60) MBG.fly = null; }
  ctx.drawImage(L.mid, Math.round(-40 + sway*12), 0);
  // le Colisée + fenêtres
  const ax = 400, ay = 178; ctx.drawImage(L.arena, ax, ay);
  for(const [wx, wy, ph] of L.win){ const a = .55 + .45*Math.sin(t*3 + ph); ctx.fillStyle = `rgba(255,${200 + 40*a | 0},110,${a})`; ctx.fillRect(ax + wx, ay + wy, 3, 4); }
  // drapeaux qui flottent
  for(const fx of [ax + 22 + 5, ax + 208 + 5, ax + 120]){ const fy = ay + (fx === ax + 120 ? 12 : 4); ctx.fillStyle = fx === ax + 120 ? '#ffd23f' : '#e23b3b';
    ctx.beginPath(); ctx.moveTo(fx + 1, fy); for(let k = 0; k <= 4; k++) ctx.lineTo(fx + 2 + k*4, fy + 2 + Math.sin(t*6 + k)*1.5); ctx.lineTo(fx + 1, fy + 7); ctx.closePath(); ctx.fill(); }
  // lumière du Colisée (faisceaux)
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  for(let k = 0; k < 2; k++){ const a = -1.57 + Math.sin(t*.5 + k*2)*.35, x0 = ax + 120 + (k ? 40 : -40), y0 = ay + 50;
    ctx.fillStyle = 'rgba(255,220,160,.07)'; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x0 + Math.cos(a - .06)*260, y0 + Math.sin(a - .06)*260); ctx.lineTo(x0 + Math.cos(a + .06)*260, y0 + Math.sin(a + .06)*260); ctx.closePath(); ctx.fill(); }
  ctx.restore();
  // brume dorée
  const g = ctx.createLinearGradient(0, 250, 0, 300); g.addColorStop(0, 'rgba(255,170,110,0)'); g.addColorStop(1, 'rgba(255,150,100,.28)'); ctx.fillStyle = g; ctx.fillRect(0, 250, VW, 60);
  ctx.drawImage(L.hill, 0, 0);
  // herbes du premier plan qui ondulent
  for(let x = 240; x < VW; x += 3){ const top = L.hillTop(x) + 2, h = 3 + ((x*7) % 5), bend = Math.sin(t*1.8 + x*.08)*1.5;
    ctx.fillStyle = (x % 2) ? '#3c5a3c' : '#4a6a40'; ctx.fillRect(Math.round(x + bend), Math.round(top - h), 1, h); }
  // l'équipe sur la colline (le chef regarde l'Arène)
  if(!MBG.team || MBG.team.key !== Save.lastTeam || MBG.team.ids.length < Math.min(3, (Save.team(Save.lastTeam) || Save.teams()[0] || { members:[1, 2, 3] }).members.length)){ MBG.team = { key:Save.lastTeam, ids:mbgTeam() }; }
  const spots = [[468, 3, 0], [420, 1, 1.3], [524, 7, 2.1]];
  MBG.team.ids.forEach((id, i) => {
    const [x, row, ph] = spots[i], y = L.hillTop(x) + 4, fr = mbgFrame(id, 'Idle', row, t + ph, 44); if(!fr) return;
    const k = 2; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(x, y, 14, 4, 0, 0, 6.283); ctx.fill();
    ctx.drawImage(fr, Math.round(x - fr.width*k/2), Math.round(y - fr.height*k/2 - 18), fr.width*k, fr.height*k);
    // contre-jour : léger liseré chaud
    ctx.save(); ctx.globalAlpha = .18; ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tintOf(fr, '#ffb070'), Math.round(x - fr.width*k/2) + 1, Math.round(y - fr.height*k/2 - 18) - 1, fr.width*k, fr.height*k); ctx.restore();
  });
  // particules : lucioles dorées qui montent + pétales qui tombent
  if(MBG.parts.length < 46 && Math.random() < .5) MBG.parts.push(Math.random() < .6
    ? { k:0, x:200 + Math.random()*440, y:VH + 4, vx:(Math.random() - .5)*8, vy:-8 - Math.random()*14, life:6 + Math.random()*4, ph:Math.random()*6 }
    : { k:1, x:Math.random()*VW + 60, y:-6, vx:-14 - Math.random()*10, vy:12 + Math.random()*10, life:14, ph:Math.random()*6 });
  for(let i = MBG.parts.length - 1; i >= 0; i--){
    const p = MBG.parts[i]; p.life -= dt; p.x += (p.vx + Math.sin(t*1.5 + p.ph)*6)*dt; p.y += p.vy*dt;
    if(p.life <= 0 || p.y < -10 || p.y > VH + 10 || p.x < -10){ MBG.parts.splice(i, 1); continue; }
    if(p.k === 0){ const a = .5 + .5*Math.sin(t*4 + p.ph); ctx.fillStyle = `rgba(255,230,140,${a})`; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); ctx.fillStyle = `rgba(255,200,100,${a*.25})`; ctx.fillRect((p.x | 0) - 1, (p.y | 0) - 1, 4, 4); }
    else { ctx.fillStyle = Math.sin(t*5 + p.ph) > 0 ? '#ff9ac8' : '#e86aa8'; ctx.fillRect(p.x | 0, p.y | 0, 2, Math.sin(t*5 + p.ph) > 0 ? 2 : 1); }
  }
  ctx.restore();
}
// silhouette colorée d'un sprite (mise en cache)
const _tintC = new WeakMap();
function tintOf(s, col){ let m = _tintC.get(s); if(!m){ m = {}; _tintC.set(s, m); } if(m[col]) return m[col];
  const [c, x] = mkcv(s.width, s.height); x.drawImage(s, 0, 0); x.globalCompositeOperation = 'source-atop'; x.fillStyle = col; x.fillRect(0, 0, c.width, c.height); return m[col] = c; }

// ---------- boucle : uniquement quand aucun combat n'est en cours ----------
function menuBgLoop(now){
  requestAnimationFrame(menuBgLoop);
  if(G || document.hidden) { MBG.last = now; return; }
  if(now - MBG.last < 1000/MENU_SCENE.fps - 2) return;
  const dt = Math.min(.1, (now - (MBG.last || now))/1000); MBG.last = now;
  try{ drawMenuScene(dt); }catch(e){ console.warn('menu-bg', e); }
}
requestAnimationFrame(menuBgLoop);
