// ============================================================
//  titans.js — CAISSE DES TITANS (données : data/titans.js)
//    1. Effets en combat des nouveaux objets tenus (dodge, healBoost, sludge, balloon, contact, ranged, vest, flinch)
//    2. Les 9 Capsules Ball de la série « titans » (animations + sons + icônes)
//    3. Carte légendaire d'Ectoplasma : décor « Manoir hanté » + Ball'Ombre
//    4. Ticket Doré : Mewtwo devient jouable pour toujours
//    5. Caisse verrouillée tant que le chapitre 1 du Solo n'est pas terminé
//    6. Magasin : chaque caisse a son coffre et sa vitrine (la caisse de raid est bien distincte)
// ============================================================

// ============================================================ 1. OBJETS TENUS
const fxT = o => (o && o.item && typeof HELD_BY_ID !== 'undefined' && HELD_BY_ID[o.item]) ? HELD_BY_ID[o.item].fx : null;
// tes attaques : contact / distance, Roche Royale
const _hEtit = hurtE;
hurtE = function(d, b){
  const p = G && G.p, e = G && G.e, fx = fxT(p);
  if(fx && b && e && e.hp > 0){ if(fx.contact && b.k === 'melee') d *= fx.contact; if(fx.ranged && b.k !== 'melee') d *= fx.ranged; }
  const hp0 = e ? e.hp : 0, r = _hEtit(d, b);
  if(fx && fx.flinch && e && e.hp > 0 && e.hp < hp0 && G.time - (e.flT || -9) > 1.5 && Math.random() < fx.flinch){
    e.flT = G.time; e.tele = 0; e.next = Math.max(e.next || 0, .9); e.rs = null; dmgTxt(e.x, e.y - 62, 'APEURÉ !', '#d8d0ff');
  }
  return r;
};
// attaques reçues : Poudre Claire, Veste de Combat, Ballon
const _hPtit = hurtP;
hurtP = function(d, b){
  const p = G && G.p, fx = fxT(p);
  if(!fx || !p || p.hp <= 0 || !b || p.inv > 0 || p.dT > 0) return _hPtit(d, b);
  const ranged = b.k !== 'melee';
  if(fx.balloon && !p.balloonPop && b.t === 'sol'){ if(G.time - (p.blT || -9) > .5){ p.blT = G.time; dmgTxt(p.x, p.y - 56, 'BALLON : IMMUNISÉ', '#ffd0e0'); } return; }
  if(fx.dodge && ranged && Math.random() < fx.dodge){ p.inv = Math.max(p.inv, .25); dmgTxt(p.x, p.y - 56, 'ESQUIVE !', '#e8f0ff'); return; }
  if(fx.vest && ranged) d *= fx.vest;
  const hp0 = p.hp, r = _hPtit(d, b);
  if(fx.balloon && !p.balloonPop && G.p === p && p.hp < hp0){ p.balloonPop = 1; dmgTxt(p.x, p.y - 64, 'BALLON ÉCLATÉ !', '#ffb0c0'); }
  return r;
};
// chaque image : Grosse Racine (soins +x %), Boue Noire
const _stepTit = step;
step = function(dt){
  const p0 = G && G.p, h0 = p0 ? p0.hp : 0;
  _stepTit(dt);
  if(!G || G.over || G.paused) return;
  const p = G.p, fx = fxT(p);
  if(!fx || p !== p0 || p.hp <= 0 || G.sw || p.hid) return;
  if(fx.healBoost && p.hp > h0 && h0 > 0) p.hp = Math.min(p.max, p.hp + (p.hp - h0)*fx.healBoost);
  if(fx.sludge && G.intro <= 0){
    if(typesOf(p.t).includes('poison')) p.hp = Math.min(p.max, p.hp + p.max*fx.sludge.heal*dt);
    else p.hp -= p.max*fx.sludge.hurt*dt;
  }
};

// ============================================================ 2. CAPSULES BALL « TITANS »
// petits dessins réutilisés
function tNote(c, x, y, s, col, a, rot){                                   // note de musique ♪
  if(a <= 0) return; c.save(); c.globalAlpha = Math.min(1, a); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = col; c.strokeStyle = '#3a1030'; c.lineWidth = .8;
  c.beginPath(); c.ellipse(0, 0, s*.55, s*.4, -.4, 0, 6.283); c.fill(); c.stroke();
  c.fillRect(s*.42, -s*1.6, s*.18, s*1.6); c.beginPath(); c.moveTo(s*.6, -s*1.6); c.quadraticCurveTo(s*1.3, -s*1.3, s*1.1, -s*.7); c.lineWidth = s*.2; c.strokeStyle = col; c.stroke();
  c.restore();
}
function tHand(c, x, y, s, col, a, sway){                                   // main spectrale qui sort du sol
  if(a <= 0 || s <= 0) return; c.save(); c.globalAlpha = Math.min(1, a); c.translate(x, y); c.rotate(sway || 0);
  const g = c.createLinearGradient(0, 0, 0, -s*2.2); g.addColorStop(0, 'rgba(60,20,110,.2)'); g.addColorStop(.4, col); g.addColorStop(1, '#e8d8ff');
  c.fillStyle = g; c.beginPath(); c.moveTo(-s*.35, 0); c.lineTo(-s*.4, -s*1.1); c.lineTo(s*.4, -s*1.1); c.lineTo(s*.35, 0); c.closePath(); c.fill();     // avant-bras
  c.beginPath(); c.ellipse(0, -s*1.25, s*.5, s*.42, 0, 0, 6.283); c.fill();                                                                              // paume
  [-.36, -.12, .12, .36].forEach((fx, i) => { const L = s*(.75 + (i === 1 || i === 2 ? .15 : 0)); c.beginPath(); c.ellipse(fx*s*1.05, -s*1.45 - L*.5, s*.11, L*.5, fx*.4, 0, 6.283); c.fill(); });
  c.beginPath(); c.ellipse(-s*.55, -s*1.2, s*.1, s*.32, -.9, 0, 6.283); c.fill();                                                                          // pouce
  c.restore();
}
function tBlade(c, x, y, L, ang, a){                                         // lame d'acier
  if(a <= 0) return; c.save(); c.globalAlpha = Math.min(1, a); c.translate(x, y); c.rotate(ang);
  c.fillStyle = '#8a96b0'; c.beginPath(); c.moveTo(0, -L); c.lineTo(L*.12, -L*.2); c.lineTo(0, L*.15); c.lineTo(-L*.12, -L*.2); c.closePath(); c.fill();
  c.fillStyle = '#f4f8ff'; c.beginPath(); c.moveTo(0, -L); c.lineTo(L*.06, -L*.25); c.lineTo(0, -L*.1); c.closePath(); c.fill();
  c.fillStyle = '#c03030'; c.fillRect(-L*.16, L*.12, L*.32, L*.08); c.fillStyle = '#5a3a20'; c.fillRect(-L*.05, L*.2, L*.1, L*.3);
  c.restore();
}
function tSpoon(c, x, y, s, rot, a){                                          // cuillère qui lévite (Alakazam)
  if(a <= 0) return; c.save(); c.globalAlpha = Math.min(1, a); c.translate(x, y); c.rotate(rot);
  c.fillStyle = '#c8ccd8'; c.strokeStyle = '#3a3a50'; c.lineWidth = .6; c.beginPath(); c.ellipse(0, -s*.9, s*.35, s*.5, 0, 0, 6.283); c.fill(); c.stroke();
  c.fillRect(-s*.07, -s*.45, s*.14, s*1.3); c.fillStyle = '#ffffff'; c.fillRect(-s*.15, -s*1.15, s*.12, s*.25); c.restore();
}
function tRock(c, x, y, s, rot, col){                                          // rocher anguleux
  c.save(); c.translate(x, y); c.rotate(rot); c.fillStyle = col || '#8a6a40'; c.strokeStyle = '#2a1a10'; c.lineWidth = .8;
  c.beginPath(); c.moveTo(-s, -s*.3); c.lineTo(-s*.4, -s); c.lineTo(s*.6, -s*.8); c.lineTo(s, s*.1); c.lineTo(s*.3, s*.9); c.lineTo(-s*.7, s*.6); c.closePath(); c.fill(); c.stroke();
  c.fillStyle = 'rgba(255,240,200,.35)'; c.beginPath(); c.moveTo(-s*.4, -s*.9); c.lineTo(s*.5, -s*.7); c.lineTo(0, -s*.2); c.closePath(); c.fill(); c.restore();
}
function tPetal(c, x, y, s, rot, col, a){
  if(a <= 0) return; c.save(); c.globalAlpha = Math.min(1, a); c.translate(x, y); c.rotate(rot); c.fillStyle = col;
  c.beginPath(); c.moveTo(0, -s); c.quadraticCurveTo(s*.8, -s*.2, 0, s); c.quadraticCurveTo(-s*.8, -s*.2, 0, -s); c.fill();
  c.fillStyle = 'rgba(255,255,255,.55)'; c.beginPath(); c.ellipse(-s*.15, -s*.3, s*.12, s*.35, .2, 0, 6.283); c.fill(); c.restore();
}

Object.assign(CAP_FX, {
  // ---------- COMMUNES ----------
  melodie:{ dur:1.7, sfx:'melodie',
    under(c, x, gy, t){ ADD(c, () => { for(let k = 0; k < 3; k++){ const u = (t - k*.3)/1; if(u > 0 && u < 1) cRing(c, x, gy, 8 + cE(u)*55, 2.5*(1 - u) + .5, '#ffb0e0', (1 - u)*.8); } }); },
    over(c, x, gy, t){ NORM(c, () => {
      for(let i = 0; i < 14; i++){ const d = capR(i, 1)*.6, u = (t - d)/1.1; if(u <= 0 || u > 1) continue;
        const side = i % 2 ? 1 : -1, px = x + side*(10 + u*34*(.6 + capR(i, 2)*.6)) + Math.sin(u*9 + i)*7, py = gy - 18 - u*70*(.7 + capR(i, 3)*.5);
        tNote(c, px, py, 4.2 + capR(i, 4)*2, ['#ff8ad0', '#ffffff', '#c890ff', '#ffd0f0'][i % 4], 1 - cC((u - .7)/.3), Math.sin(u*6 + i)*.4); } });
      ADD(c, () => cGlow(c, x, gy - 22, 70, '#ffb0e0', cBell(t/1.6)*.6)); } },
  petales:{ dur:1.8, sfx:'petales',
    under(c, x, gy, t){ ADD(c, () => cGlow(c, x, gy, 120, '#ff9ad0', cBell(t/1.7)*.45)); },
    over(c, x, gy, t){ NORM(c, () => {
      for(let i = 0; i < 26; i++){ const ph = i/26*6.283, u = cC(t/1.8), an = ph + u*7, rad = 12 + u*40 + capR(i, 1)*14, h = 70*(1 - u)*(.4 + capR(i, 2)*.7) + 6;
        const px = x + Math.cos(an)*rad, py = gy - h + Math.sin(an)*rad*.4;
        tPetal(c, px, py, 3 + capR(i, 3)*1.6, an*2 + i, ['#ff9ad0', '#ffc0e0', '#ff70b0', '#fff0f8'][i % 4], (1 - cC((t - 1.4)/.4))*(Math.sin(an) < 0 ? .6 : 1)); } }); } },
  // ---------- PEU COMMUNES ----------
  spectre:{ dur:1.9, sfx:'spectre', shake:.1,
    under(c, x, gy, t){ const f = 1 - cC((t - 1.4)/.5), g = cE(t/.35);
      NORM(c, () => { const gr = c.createRadialGradient(x, gy, 0, x, gy, 60*g); gr.addColorStop(0, 'rgba(20,0,40,.85)'); gr.addColorStop(1, 'rgba(40,10,80,0)'); c.globalAlpha = f; c.fillStyle = gr; c.beginPath(); c.ellipse(x, gy, 60*g, 25*g, 0, 0, 6.283); c.fill(); });
      ADD(c, () => { cRing(c, x, gy, 44*g, 2, '#a070ff', .8*f); }); },
    over(c, x, gy, t){ const f = 1 - cC((t - 1.3)/.6);
      ADD(c, () => {
        for(let i = 0; i < 6; i++){ const a = i/6*6.283 + .5, R = 34 + (i % 2)*8, d = i*.07, u = cC((t - d)/.45), sink = cC((t - 1.2 - i*.03)/.5);
          const s = (6 + capR(i, 1)*2.5)*cE(u)*(1 - sink), hx = x + Math.cos(a)*R, hy = gy + Math.sin(a)*R*.42;
          tHand(c, hx, hy, s, 'rgba(160,110,255,.85)', f, Math.sin(t*5 + i)*.25 + Math.cos(a)*.35); cGlow(c, hx, hy - s*1.3, s*4, '#a070ff', .4*f); }
        for(let i = 0; i < 10; i++){ const u = ((t*.9 + capR(i, 2)) % 1); cGlow(c, x + (capR(i, 3) - .5)*80, gy - u*70, 6, '#c8a0ff', (1 - u)*f*.8); }   // feux follets
        for(let k = 0; k < 2; k++){ const bl = Math.sin(t*9 + k) > .85 ? 0 : 1; c.globalAlpha = f*bl*cC(t/.4); c.fillStyle = '#ff4060'; c.fillRect(x - 22 + k*4, gy - 40, 2, 1); c.fillRect(x + 18 + k*4, gy - 36, 2, 1); }   // yeux dans l'ombre
      }); } },
  sable:{ dur:1.9, sfx:'sable', shake:.15,
    under(c, x, gy, t){ NORM(c, () => { const u = cC(t/1.8); c.globalAlpha = .35*cBell(u); c.fillStyle = '#c8a060'; c.beginPath(); c.ellipse(x, gy, 70, 26, 0, 0, 6.283); c.fill(); }); },
    over(c, x, gy, t){ NORM(c, () => {
      const burst = cC((t - 1.25)/.55);
      for(let i = 0; i < 70; i++){ const h = (i/70)*95, base = i*.37 + t*(7 - h*.03), rad = (10 + h*.45)*(1 + burst*2.2);
        const px = x + Math.cos(base)*rad, py = gy - h*(1 - burst*.6) + Math.sin(base)*rad*.3 + burst*burst*40;
        c.globalAlpha = (Math.sin(base) < 0 ? .5 : .95)*cC(t/.3)*(1 - burst); c.fillStyle = ['#e8c070', '#c89a50', '#f4dca0', '#a07838'][i % 4];
        c.fillRect(Math.round(px), Math.round(py), i % 7 ? 2 : 3, i % 7 ? 2 : 3); }
      for(let i = 0; i < 6; i++){ const a = t*6 + i*1.05, h = 20 + i*12; tRock(c, x + Math.cos(a)*(18 + i*3)*(1 + burst*2), gy - h + burst*burst*50, 2.5 + (i % 3), a, '#9a7a48'); } }); } },
  lames:{ dur:1.6, sfx:'lames',
    over(c, x, gy, t){
      const spin = cC(t/.75), stab = cC((t - .75)/.12), out = cC((t - 1.25)/.35);
      ADD(c, () => { if(t < .8) cRing(c, x, gy - 28, 30*(1 - spin*.3), 1.5, '#dfe8f8', .6); });
      NORM(c, () => {
        for(let i = 0; i < 6; i++){
          const a0 = i/6*6.283, a = a0 + (1 - spin)*9, R = 44 - spin*10, px = x + Math.cos(a)*R, py = gy - 30 + Math.sin(a)*R*.45;
          if(t < .75) tBlade(c, px, py, 17, a + 1.57 + t*20, 1);
          else { const gx = x + Math.cos(a0)*34, gyy = gy + Math.sin(a0)*34*.42, yy = pbLerp(gy - 30 + Math.sin(a0)*34*.45, gyy - 4, stab); tBlade(c, gx, yy, 17, Math.PI, 1 - out); }
        } });
      ADD(c, () => { if(stab > 0 && stab < 1 || (t > .87 && t < 1.1)) for(let i = 0; i < 6; i++){ const a0 = i/6*6.283, gx = x + Math.cos(a0)*34, gyy = gy + Math.sin(a0)*34*.42; cStar4(c, gx, gyy - 3, 6*(1.1 - cC((t - .87)/.25)), '#ffffff', 1, 0); cGlow(c, gx, gyy, 20, '#dfe8f8', .7); } }); } },
  // ---------- RARES ----------
  cosmos:{ dur:2.1, sfx:'cosmos', flash:.12,
    under(c, x, gy, t){ const g = cE(t/.4), f = 1 - cC((t - 1.6)/.5), R = 62*g;
      NORM(c, () => { c.save(); c.globalAlpha = f; c.beginPath(); c.ellipse(x, gy, R, R*.42, 0, 0, 6.283); c.clip();
        const sp = c.createRadialGradient(x, gy, 0, x, gy, R); sp.addColorStop(0, '#2a1a5a'); sp.addColorStop(.6, '#0a0a2a'); sp.addColorStop(1, '#04040e'); c.fillStyle = sp; c.fillRect(x - R, gy - R, R*2, R*2);
        c.globalCompositeOperation = 'lighter';
        for(let arm = 0; arm < 3; arm++) for(let i = 0; i < 40; i++){ const u = i/40, a = arm*2.094 + u*5 - t*1.5, r = u*R*.95;
          c.globalAlpha = f*(1 - u)*.8; c.fillStyle = HUE(240 + u*80 + arm*20, 70); c.fillRect(x + Math.cos(a)*r, gy + Math.sin(a)*r*.42, 2, 1.4); }
        for(let i = 0; i < 26; i++){ const tw = .5 + .5*Math.sin(t*8 + i*3); c.globalAlpha = f*tw; c.fillStyle = '#ffffff'; c.fillRect(x + (capR(i, 1) - .5)*R*1.8, gy + (capR(i, 2) - .5)*R*.8, 1, 1); }
        c.restore(); });
      ADD(c, () => { cRing(c, x, gy, R, 2.5, '#9ad0ff', f); cRing(c, x, gy, R + 3, 1, '#e0c0ff', f*.6); cGlow(c, x, gy, R*2.6, '#7a6aff', .35*f); }); },
    over(c, x, gy, t){ const f = 1 - cC((t - 1.6)/.5), g = cE((t - .2)/.5);
      NORM(c, () => { for(let i = 0; i < 5; i++){ const a = i/5*6.283 + t*1.6, R = 40*g; tSpoon(c, x + Math.cos(a)*R, gy - 34 + Math.sin(a)*R*.35 + Math.sin(t*4 + i)*3, 5, a + t*3, f*g*(Math.sin(a) < 0 ? .55 : 1)); } });
      ADD(c, () => { for(let i = 0; i < 3; i++){ const u = ((t*.8 + i*.33) % 1), sx = x - 60 + u*120, sy = gy - 90 + u*40 + i*10; c.globalAlpha = f*(1 - u); c.strokeStyle = '#ffffff'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(sx, sy); c.lineTo(sx - 14, sy - 5); c.stroke(); cStar4(c, sx, sy, 3, '#ffffff', f*(1 - u), 0); } }); } },
  seisme:{ dur:1.9, sfx:'seisme', shake:.55, flash:.08,
    under(c, x, gy, t){ const g = cE(t/.3), f = 1 - cC((t - 1.4)/.5);
      NORM(c, () => { c.globalAlpha = f; c.strokeStyle = '#2a1a10'; c.lineWidth = 2.4; c.lineJoin = 'round';
        for(let i = 0; i < 9; i++){ const a = i/9*6.283 + capR(i, 1)*.4; c.beginPath(); c.moveTo(x, gy); let px = x, py = gy;
          for(let k = 1; k <= 5; k++){ const r = k/5*62*g; px = x + Math.cos(a + (capR(i, k) - .5)*.5)*r; py = gy + Math.sin(a + (capR(i, k + 3) - .5)*.5)*r*.42; c.lineTo(px, py); } c.stroke(); }
        c.strokeStyle = '#ff9a40'; c.lineWidth = .8; c.globalAlpha = f*.6*cBell(t/1); c.stroke(); });
      NORM(c, () => { const u = cC(t/1.6); c.globalAlpha = .22*cBell(u); c.fillStyle = '#b8945c'; for(let i = 0; i < 10; i++){ const a = i/10*6.283; c.beginPath(); c.arc(x + Math.cos(a)*(30 + u*40), gy + Math.sin(a)*(30 + u*40)*.42 - u*8, 9 + u*10, 0, 6.283); c.fill(); } }); },
    over(c, x, gy, t){ NORM(c, () => {
      for(let i = 0; i < 12; i++){ const d = capR(i, 1)*.25, tt = t - d; if(tt <= 0) continue; const a = capR(i, 2)*6.283, v = 40 + capR(i, 3)*70, up = 170 + capR(i, 4)*120;
        const px = x + Math.cos(a)*v*tt*.9, py = gy + Math.sin(a)*v*tt*.35 - up*tt + 330*tt*tt; if(py > gy + 16) continue;
        tRock(c, px, py, 3 + capR(i, 5)*3.5, tt*8 + i, ['#8a6a40', '#a07a48', '#6a5030'][i % 3]); } }); } },
  // ---------- ULTRA RARES ----------
  distorsion:{ dur:2.5, sfx:'distorsion', flash:.3, shake:.35,
    under(c, x, gy, t){ const g = cE(t/.5), f = 1 - cC((t - 1.9)/.6);
      NORM(c, () => { c.globalAlpha = .55*f*g; const gr = c.createRadialGradient(x, gy - 20, 10, x, gy - 20, 170); gr.addColorStop(0, 'rgba(30,10,50,.9)'); gr.addColorStop(1, 'rgba(10,0,20,0)'); c.fillStyle = gr; c.fillRect(x - 180, gy - 190, 360, 260); });
      NORM(c, () => { for(let k = 0; k < 6; k++){ c.globalAlpha = .85*f; c.strokeStyle = k % 2 ? '#3a1a5a' : '#120820'; c.lineWidth = 3.2; c.lineCap = 'round'; c.beginPath();      // ombres-tentacules (Giratina)
          for(let i = 0; i <= 24; i++){ const u = i/24, a = k*1.047 + u*2.4 - t*1.8, r = 10 + u*80*g; c.lineTo(x + Math.cos(a)*r, gy + Math.sin(a)*r*.42 - Math.sin(u*Math.PI)*12); } c.stroke(); } });
      ADD(c, () => { cRing(c, x, gy, 50*g, 3, '#7a5aff', f); cRing(c, x, gy, 58*g, 1.5, '#ff3060', f*.7); }); },
    over(c, x, gy, t){ const g = cE(t/.6), f = 1 - cC((t - 1.9)/.6);
      NORM(c, () => { for(let i = 0; i < 5; i++){ const a = i/5*6.283 + t*.4, R = 70*g, px = x + Math.cos(a)*R, py = gy - 50 + Math.sin(a)*R*.5 + Math.sin(t*2 + i)*6, rot = Math.sin(t + i)*.6 + a;   // plateformes qui flottent
          c.save(); c.globalAlpha = f; c.translate(px, py); c.rotate(rot*.4); c.fillStyle = '#4a3a6a'; c.fillRect(-9, -3, 18, 6); c.fillStyle = '#5ac87a'; c.fillRect(-9, -4, 18, 2); c.fillStyle = '#2a1a3a'; c.fillRect(-9, 2, 18, 1); c.restore(); }
        for(let i = 0; i < 30; i++){ const u = ((t*.6 + capR(i, 1)) % 1); c.globalAlpha = f*(1 - u)*.9; c.fillStyle = i % 3 ? '#b090ff' : '#ff4a70'; c.fillRect(x + (capR(i, 2) - .5)*160, gy + 20 - u*140, 2, 2); } });   // particules qui « tombent » vers le haut
      ADD(c, () => { const blink = Math.sin(t*3) > .3 ? 1 : 0; c.globalAlpha = f*blink*g; c.fillStyle = '#ff2050'; c.fillRect(x - 6, gy - Math.min(120, gy - 12), 4, 2); c.fillRect(x + 4, gy - Math.min(120, gy - 12), 4, 2); cGlow(c, x, gy - Math.min(119, gy - 13), 30, '#ff2050', .5*f*blink*g);    // yeux rouges dans le ciel
        cGlow(c, x, gy - 30, 100, '#7a5aff', cBell(t/2.2)*.45); }); } },
  eclipse:{ dur:2.6, sfx:'eclipse', flash:.45, shake:.3,
    under(c, x, gy, t){ const g = cE(t/.5), f = 1 - cC((t - 2)/.6);
      NORM(c, () => { c.globalAlpha = .6*g*f; const gr = c.createRadialGradient(x, gy - 40, 20, x, gy - 40, 200); gr.addColorStop(0, 'rgba(0,0,10,.75)'); gr.addColorStop(1, 'rgba(0,0,10,0)'); c.fillStyle = gr; c.fillRect(x - 210, gy - 240, 420, 320); });
      ADD(c, () => { const beam = cBell(cC((t - 1.1)/1.2)); c.globalAlpha = beam*.8; const g2 = c.createLinearGradient(x - 18, 0, x + 18, 0); g2.addColorStop(0, 'rgba(255,230,160,0)'); g2.addColorStop(.5, 'rgba(255,240,200,.9)'); g2.addColorStop(1, 'rgba(255,230,160,0)'); c.fillStyle = g2; c.fillRect(x - 18, gy - 135, 36, 140); cRing(c, x, gy, 30 + beam*20, 3, '#ffe8a0', beam); }); },
    over(c, x, gy, t){ const g = cE(t/.6), f = 1 - cC((t - 2)/.6), ex = x, ey = gy - Math.min(120, gy - 28);
      ADD(c, () => {                                                         // couronne solaire
        for(let i = 0; i < 18; i++){ const a = i/18*6.283 + t*.15, L = 22 + 10*Math.sin(t*3 + i*1.7); c.globalAlpha = f*g*.55; c.strokeStyle = i % 2 ? '#ffe8a0' : '#ffffff'; c.lineWidth = 2; c.beginPath(); c.moveTo(ex + Math.cos(a)*20, ey + Math.sin(a)*20); c.lineTo(ex + Math.cos(a)*(20 + L), ey + Math.sin(a)*(20 + L)); c.stroke(); }
        cGlow(c, ex, ey, 110*g, '#ffe8a0', .8*f); cRing(c, ex, ey, 21, 3, '#ffffff', f*g);
        const dia = cBell(cC((t - .45)/.35)); if(dia > 0){ cStar4(c, ex + 15, ey - 14, 18*dia, '#ffffff', dia, 0); cGlow(c, ex + 15, ey - 14, 50*dia, '#ffffff', dia); }   // « bague de diamant »
        for(let i = 0; i < 24; i++){ const tw = Math.sin(t*5 + i*2.3); if(tw > .4) cStar4(c, x + (capR(i, 1) - .5)*220, gy - 150 + capR(i, 2)*110, 2*tw, '#ffffff', f*g, 0); } });
      NORM(c, () => { c.globalAlpha = f*g; c.fillStyle = '#05040a'; c.beginPath(); c.arc(ex, ey, 20, 0, 6.283); c.fill(); }); } }
});
// sons des nouvelles capsules
const _capSfxTit = capSfx;
capSfx = function(kind){
  if(typeof AU === 'undefined' || !AU.ctx) return _capSfxTit(kind);
  const arp = (fr, st, v, ty) => fr.forEach((f, i) => tone(f, .25, ty || 'triangle', v, 0, i*st));
  switch(kind){
    case 'melodie': arp([784, 659, 784, 988, 784, 659], .13, .06, 'sine'); return;
    case 'petales': noise(.9, .08, 4000, 7000, 'bandpass'); arp([1568, 1976, 2349], .15, .03, 'sine'); return;
    case 'spectre': tone(220, 1.2, 'sine', .07, -110); tone(233, 1.2, 'sine', .05, -120, .05); noise(.8, .12, 600, 150, 'lowpass'); return;
    case 'sable': noise(1.7, .3, 900, 2500, 'bandpass'); noise(.5, .25, 300, 80, 'lowpass', 1.2); return;
    case 'lames': [0, .1, .2, .3, .4, .5].forEach(d => tone(2600 + d*800, .12, 'square', .03, -1500, d)); tone(1900, .35, 'triangle', .07, -400, .78); noise(.2, .2, 8000, 3000, 'highpass', .78); return;
    case 'cosmos': arp([523, 784, 1047, 1568, 2093], .11, .05, 'sine'); tone(110, 1.6, 'sine', .1, 55); return;
    case 'seisme': noise(1.6, .5, 300, 50, 'lowpass'); tone(45, 1.4, 'sawtooth', .14, -10); noise(.4, .3, 2000, 400, 'lowpass', .3); return;
    case 'distorsion': tone(880, 1.4, 'sawtooth', .04, -800); tone(55, 2, 'sawtooth', .12, 30); noise(2, .15, 200, 1500, 'bandpass'); tone(659, .5, 'sine', .05, -300, 1.2); return;
    case 'eclipse': [[392, 494, 587], [440, 554, 659], [523, 659, 784, 1047]].forEach((ch, k) => ch.forEach(f => tone(f, 1, 'sine', .05, 0, .3 + k*.45))); noise(1.5, .2, 3000, 200, 'lowpass', .4); tone(65, 1.2, 'sine', .3, -20, .4); return;
  }
  return _capSfxTit(kind);
};
// symboles des icônes
const _capSymTit = capSym;
capSym = function(c, sym, x, y, col){
  const P = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.stroke(); };
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = '#14101c'; c.lineWidth = 1;
  let done = true;
  switch(sym){
    case 'note': c.beginPath(); c.ellipse(-1, 3, 2.6, 2, -.4, 0, 6.283); c.fill(); c.stroke(); c.fillRect(1, -5, 1.4, 8); c.fillRect(1, -5, 4, 1.6); break;
    case 'petal': c.beginPath(); c.moveTo(0, -5); c.quadraticCurveTo(5, 0, 0, 5); c.quadraticCurveTo(-5, 0, 0, -5); c.fill(); c.stroke(); break;
    case 'hand': P([[-3,5],[-3,-1],[-4,-4],[-2,-4],[-1,-2],[-1,-5],[1,-5],[1,-2],[2,-5],[4,-4],[3,0],[3,5]]); break;
    case 'sand': c.strokeStyle = col; c.lineWidth = 1.4; for(let i = 0; i < 3; i++){ c.beginPath(); c.ellipse(0, -3 + i*3, 5 - i, 1.4, 0, 0, 6.283); c.stroke(); } break;
    case 'blade': P([[0,-6],[1.6,1],[0,3],[-1.6,1]]); c.fillStyle = '#c03030'; c.fillRect(-2.5, 3, 5, 1.2); break;
    case 'galaxy': c.strokeStyle = col; c.lineWidth = 1.2; for(let k = 0; k < 2; k++){ c.beginPath(); for(let i = 0; i < 16; i++){ const a = k*3.14 + i*.35, r = i*.33; c.lineTo(Math.cos(a)*r, Math.sin(a)*r); } c.stroke(); } c.fillStyle = '#fff'; c.fillRect(-.5, -.5, 1.5, 1.5); break;
    case 'quake': c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); c.moveTo(-5, 4); c.lineTo(-2, 0); c.lineTo(0, 3); c.lineTo(2, -2); c.lineTo(5, 1); c.stroke(); P([[-4,-5],[-1,-6],[0,-3],[-3,-2]]); break;
    case 'distort': c.strokeStyle = col; c.lineWidth = 1.4; c.beginPath(); for(let i = 0; i < 20; i++){ const a = i*.6, r = 5 - i*.2; c.lineTo(Math.cos(a)*r, Math.sin(a)*r*.7); } c.stroke(); c.fillStyle = '#ff3060'; c.fillRect(-2, -1, 1.4, 1); c.fillRect(1, -1, 1.4, 1); break;
    case 'eclipse': c.fillStyle = col; c.beginPath(); c.arc(0, 0, 5.5, 0, 6.283); c.fill(); c.fillStyle = '#05040a'; c.beginPath(); c.arc(0, 0, 4, 0, 6.283); c.fill(); c.stroke(); break;
    default: done = false;
  }
  c.restore();
  if(!done) _capSymTit(c, sym, x, y, col);
};

// ============================================================ 3. CARTE LÉGENDAIRE ECTOPLASMA — « MANOIR HANTÉ »
function legBgManoir(c, t, fire, T){
  const W = 120, H = 180;
  const sky = c.createLinearGradient(0, 5, 0, 135); T.sky.forEach((col, i) => sky.addColorStop(i/(T.sky.length - 1), col)); c.fillStyle = sky; c.fillRect(0, 0, W, H);
  // étoiles
  for(let i = 0; i < 30; i++){ const tw = .4 + .6*Math.abs(Math.sin(t*1.5 + i*2.1)); c.globalAlpha = tw*.8; c.fillStyle = '#e8e0ff'; c.fillRect(5 + lgR(i, 11)*110, 8 + lgR(i, 12)*60, .7, .7); }
  // pleine lune + halo
  const mx = 84, my = 40, pul = 1 + .03*Math.sin(t*1.3) + fire*.1;
  c.globalCompositeOperation = 'lighter'; let g = c.createRadialGradient(mx, my, 6, mx, my, 50*pul); g.addColorStop(0, 'rgba(220,210,255,.55)'); g.addColorStop(1, 'rgba(120,80,200,0)');
  c.globalAlpha = 1; c.fillStyle = g; c.beginPath(); c.arc(mx, my, 50*pul, 0, 6.283); c.fill(); c.globalCompositeOperation = 'source-over';
  g = c.createRadialGradient(mx - 4, my - 4, 2, mx, my, 16); g.addColorStop(0, '#fffaf0'); g.addColorStop(1, '#d8cce8'); c.fillStyle = g; c.beginPath(); c.arc(mx, my, 16, 0, 6.283); c.fill();
  c.fillStyle = 'rgba(150,130,180,.45)'; [[78, 36, 3], [90, 46, 4], [86, 33, 2], [80, 48, 2.2]].forEach(([a, b, r]) => { c.beginPath(); c.arc(a, b, r, 0, 6.283); c.fill(); });
  // nuages qui passent devant la lune
  c.fillStyle = 'rgba(30,14,50,.75)';
  for(let k = 0; k < 3; k++){ const cx = ((t*(4 + k*2) + k*50) % 170) - 25, cy = 30 + k*14; c.beginPath(); c.ellipse(cx, cy, 16, 4, 0, 0, 6.283); c.ellipse(cx + 9, cy - 2, 10, 4, 0, 0, 6.283); c.fill(); }
  // chauves-souris
  c.fillStyle = '#0a0612';
  for(let i = 0; i < 5; i++){ const bx = ((t*(10 + i*3) + i*40) % 150) - 15, by = 22 + i*9 + Math.sin(t*3 + i)*4, fl = Math.sin(t*14 + i*2)*1.6;
    c.beginPath(); c.moveTo(bx - 4, by - fl); c.lineTo(bx - 1, by + .5); c.lineTo(bx, by - .5); c.lineTo(bx + 1, by + .5); c.lineTo(bx + 4, by - fl); c.lineTo(bx, by + 1.6); c.closePath(); c.fill(); }
  // manoir
  const M = '#140a20', R2 = '#0c0614';
  c.fillStyle = M; c.fillRect(30, 70, 62, 52); c.fillRect(20, 84, 14, 38); c.fillRect(88, 80, 16, 42);
  c.beginPath(); c.moveTo(26, 70); c.lineTo(61, 46); c.lineTo(96, 70); c.closePath(); c.fill();                                          // toit principal
  c.beginPath(); c.moveTo(17, 84); c.lineTo(27, 66); c.lineTo(37, 84); c.closePath(); c.fill();                                          // tour gauche
  c.beginPath(); c.moveTo(86, 80); c.lineTo(96, 58); c.lineTo(106, 80); c.closePath(); c.fill();                                        // tour droite
  c.fillRect(58, 40, 6, 10); c.fillStyle = R2; c.fillRect(70, 56, 4, 10);                                                            // cheminées
  // fenêtres qui clignotent
  [[38, 78], [50, 78], [72, 78], [84, 78], [38, 94], [72, 94], [84, 94], [24, 92], [93, 88], [58, 60]].forEach(([wx, wy], i) => {
    const on = Math.sin(t*(.7 + i*.13) + i*2.3) > -.2, col = i % 3 === 0 ? '#c890ff' : '#ffd070';
    c.fillStyle = on ? col : '#2a1838'; c.fillRect(wx, wy, 5, 6); c.fillStyle = M; c.fillRect(wx + 2, wy, 1, 6); c.fillRect(wx, wy + 3, 5, .8);
    if(on){ c.globalCompositeOperation = 'lighter'; c.globalAlpha = .25; c.fillStyle = col; c.beginPath(); c.arc(wx + 2.5, wy + 3, 6, 0, 6.283); c.fill(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
  });
  c.fillStyle = '#2a1838'; c.fillRect(56, 104, 10, 18); c.fillStyle = '#ffd070'; c.globalAlpha = .4 + .3*Math.sin(t*2); c.fillRect(57, 105, 8, 17); c.globalAlpha = 1;   // porte
  // arbres morts
  c.strokeStyle = '#0a0612'; c.lineCap = 'round';
  const tree = (x0, y0, h, s) => { c.lineWidth = 2.4; c.beginPath(); c.moveTo(x0, y0); c.lineTo(x0 + s*2, y0 - h); c.stroke(); c.lineWidth = 1.1;
    [[.5, -6], [.7, 5], [.85, -4], [.6, 7]].forEach(([k, dx]) => { const bx = x0 + s*2*k, by = y0 - h*k; c.beginPath(); c.moveTo(bx, by); c.lineTo(bx + dx*s, by - 5); c.lineTo(bx + dx*s*1.3, by - 8); c.stroke(); }); };
  tree(9, 128, 44, 1); tree(112, 128, 36, -1);
  // fantômes qui flottent derrière le Pokémon
  for(let i = 0; i < 3; i++){ const gx = 18 + i*42 + Math.sin(t*.8 + i*2)*8, gy = 96 - i*6 + Math.sin(t*1.6 + i)*4, a = .22 + .12*Math.sin(t*2 + i);
    c.globalAlpha = a; c.fillStyle = '#e8e0ff'; c.beginPath(); c.arc(gx, gy, 6, Math.PI, 0); c.lineTo(gx + 6, gy + 7);
    for(let k = 0; k < 4; k++) c.lineTo(gx + 6 - (k + .5)*3, gy + 7 + (k % 2 ? -2 : 1) + Math.sin(t*6 + k)*.6); c.lineTo(gx - 6, gy + 7); c.closePath(); c.fill();
    c.globalAlpha = a*2; c.fillStyle = '#1a0a2a'; c.fillRect(gx - 3, gy - 1, 1.6, 2); c.fillRect(gx + 1.5, gy - 1, 1.6, 2); }
  c.globalAlpha = 1;
  // sol du cimetière
  const gr = c.createLinearGradient(0, 118, 0, 175); gr.addColorStop(0, '#2a1a3a'); gr.addColorStop(1, '#0a0612'); c.fillStyle = gr; c.fillRect(0, 120, W, 60);
  [[14, 124, 7, 10], [36, 127, 6, 8], [86, 125, 7, 11], [104, 128, 6, 8]].forEach(([tx, ty, tw, th]) => {                                // tombes
    c.fillStyle = '#4a4058'; c.beginPath(); c.moveTo(tx - tw/2, ty); c.lineTo(tx - tw/2, ty - th + tw/2); c.arc(tx, ty - th + tw/2, tw/2, Math.PI, 0); c.lineTo(tx + tw/2, ty); c.closePath(); c.fill();
    c.fillStyle = '#2a2236'; c.fillRect(tx - .5, ty - th + 3, 1, 4); c.fillRect(tx - 1.5, ty - th + 4, 3, 1); });
}
function legFgManoir(c, t, fire, T){
  const W = 120, H = 180;
  // brume au sol qui glisse
  for(let k = 0; k < 5; k++){ const y = 128 + k*4, off = (t*(5 + k*2) + k*30) % 160 - 20;
    for(let i = 0; i < 3; i++){ const x = off + i*60 - 40; const g = c.createRadialGradient(x, y, 0, x, y, 26); g.addColorStop(0, 'rgba(200,180,255,.22)'); g.addColorStop(1, 'rgba(200,180,255,0)'); c.fillStyle = g; c.fillRect(x - 26, y - 10, 52, 20); } }
  // feux follets bleus
  c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 7; i++){ const x = 10 + lgR(i, 21)*100 + Math.sin(t*1.2 + i)*6, y = 120 + lgR(i, 22)*30 - ((t*6 + i*9) % 40), a = .4 + .4*Math.sin(t*5 + i);
    const g = c.createRadialGradient(x, y, 0, x, y, 4); g.addColorStop(0, 'rgba(180,220,255,.95)'); g.addColorStop(1, 'rgba(120,140,255,0)'); c.globalAlpha = a; c.fillStyle = g; c.beginPath(); c.arc(x, y, 4, 0, 6.283); c.fill(); }
  // volutes violettes qui montent
  for(let i = 0; i < 30; i++){ const sp = 5 + lgR(i, 23)*10, y = 178 - ((t*sp + lgR(i, 24)*180) % 180), x = 5 + lgR(i, 25)*110 + Math.sin(t + i)*4;
    c.globalAlpha = .5*Math.min(1, (178 - y)/30); c.fillStyle = i % 3 ? '#a070ff' : '#e0c8ff'; c.fillRect(x, y, .9, .9); }
  c.globalCompositeOperation = 'source-over';
  if(fire > 0){ c.globalAlpha = fire*.1; c.fillStyle = '#5a20a0'; c.fillRect(0, 0, W, H); }
  c.globalAlpha = 1;
}
function legAtkShadowBall(c, mx, my, t, fire){                          // Ball'Ombre : la sphère se forme puis part
  const grow = Math.min(1, fire*1.4), fly = Math.max(0, (fire - .55)/.45), x = mx + fly*fly*40, y = my - fly*fly*30, r = 4 + grow*7;
  c.save(); c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 26; i++){ const a = i/26*6.283 + t*6, d = r + 4 + Math.sin(t*9 + i)*2.5; c.globalAlpha = fire*.7; c.fillStyle = i % 2 ? '#c890ff' : '#6a30d0'; c.fillRect(x + Math.cos(a)*d, y + Math.sin(a)*d, 1.2, 1.2); }   // énergie aspirée
  const g = c.createRadialGradient(x, y, 0, x, y, r*2.4); g.addColorStop(0, 'rgba(200,150,255,.9)'); g.addColorStop(1, 'rgba(90,30,180,0)'); c.globalAlpha = fire; c.fillStyle = g; c.beginPath(); c.arc(x, y, r*2.4, 0, 6.283); c.fill();
  c.globalCompositeOperation = 'source-over';
  c.globalAlpha = fire; const g2 = c.createRadialGradient(x - r*.3, y - r*.3, 0, x, y, r); g2.addColorStop(0, '#5a2a8a'); g2.addColorStop(.7, '#1a0630'); g2.addColorStop(1, '#0a0216'); c.fillStyle = g2; c.beginPath(); c.arc(x, y, r, 0, 6.283); c.fill();
  c.strokeStyle = '#c890ff'; c.lineWidth = .8; c.beginPath(); for(let i = 0; i < 8; i++){ const a = i/8*6.283 + t*4; c.moveTo(x + Math.cos(a)*r*.3, y + Math.sin(a)*r*.3); c.lineTo(x + Math.cos(a + .4)*r*1.1, y + Math.sin(a + .4)*r*1.1); } c.stroke();   // éclairs violets
  c.restore();
}
LEGEND_THEMES.manoir = {
  sky:['#05030c', '#120826', '#2a1450', '#4a2a6a'], rim:'#a070ff', rimTint:'#8a50e0', glare:.1, shadow:'#0a0612', mouth:[.62, .42],
  ribbon:['#24083e', '#8a3ae8', '#24083e'], panel:'rgba(12,6,24,.8)', bg:legBgManoir, fg:legFgManoir, atk:legAtkShadowBall
};

// ============================================================ 4. TICKET DORÉ → MEWTWO JOUABLE
const Golden = {
  list(){ const d = Save.load(); if(!Array.isArray(d.golden)) d.golden = []; return d.golden; },
  has(id){ return this.list().includes(id); }
};
const _regGold = registerPokemon;
registerPokemon = function(id){
  const r = _regGold(id);
  if(POKEMON[id] && POKEMON[id].bossOnly && Golden.has(id) && !ORDER.includes(id)) ORDER.push(id);
  return r;
};
function useGoldenTicket(back){
  const id = 'mewtwo';
  if(Save.itemCount('ticket-dore') <= 0) return back();
  if(!POKEMON[id] || !SPR[id]){ gameConfirm('Ticket Doré', 'Les sprites de Mewtwo sont introuvables (assets/pokemon/mewtwo/).', 'OK', back); return; }
  if(Golden.has(id)){ gameConfirm('Mewtwo est déjà à toi !', 'Garde ce Ticket Doré : il servira pour un futur Pokémon secret.', 'OK', () => {}); return; }
  gameConfirm('Utiliser le Ticket Doré ?', `<b>Mewtwo</b> rejoindra tes Pokémon pour toujours : tu pourras le mettre dans tes équipes.`, 'Oui !', () => {
    Save.addItem('ticket-dore', -1); Golden.list().push(id); if(!ORDER.includes(id)) ORDER.push(id);
    if(typeof Owned !== 'undefined') Owned.add(id); Save.save(); shopBuild.key = null;
    if(typeof capSfx === 'function') capSfx('legend');
    menu(`<div class='st-win gold-win'><img src='${spr(id).toDataURL()}'><h1>Mewtwo rejoint ton aventure !</h1>
      <p>Le Pokémon génétique est maintenant <b>jouable</b>. Ajoute-le à une équipe dans <b>Mes équipes</b>.</p>
      <div class='row'><button class='btn' id='gw-t'>Mes équipes</button><button class='btn2' id='gw-ok'>Fermer</button></div></div>`);
    document.getElementById('gw-t').onclick = showTeams; document.getElementById('gw-ok').onclick = back;
  });
}
// bouton « Utiliser » des objets spéciaux (inventaire et révélation)
function useSpecial(it, back){ return it && it.use === 'golden' ? useGoldenTicket(back) : showShinySwap(back); }

// ============================================================ 5. CAISSE VERROUILLÉE (chapitre 1)
const chapter1Done = () => (typeof RAID_UNLOCK_AT === 'undefined' ? 10 : RAID_UNLOCK_AT) <= Math.max(Save.cleared(3), Save.cleared(6));      // v0.24 : niveau 7
const crateLocked = c => !!(c && c.unlock === 'chapter1' && !chapter1Done());
const _openTit = openCrate;
openCrate = function(id){ if(crateLocked(CRATE[id])) return showCrate(id); return _openTit(id); };

// ============================================================ 6. MAGASIN : coffres et vitrines
const CRATE_LOOK = {
  depart:{ pal:{ HL:'#fff0b0', L1:'#ffd86a', M1:'#f0a82c', D1:'#b8701a', D2:'#7a4512', S:'#9aa7b8', E:'#e8603c' }, bg:'linear-gradient(160deg,#5a3a10,#2a1a08 60%,#140c04)', glow:'#ffc83a', tag:'' },
  titans:{ pal:{ HL:'#e8dcff', L1:'#9a80e0', M1:'#5a3fa0', D1:'#36226a', D2:'#1a1038', S:'#c0c8d8', E:'#b070ff' }, bg:'linear-gradient(160deg,#3a1a6a,#160a30 60%,#08040e)', glow:'#a070ff', tag:'Chapitre 2' },
  raid:  { pal:{ HL:'#ffd8c8', L1:'#f06048', M1:'#b82424', D1:'#6a1010', D2:'#2a0606', S:'#ffd23f', E:'#ffd23f' }, bg:'repeating-linear-gradient(135deg,#4a0808 0 10px,#2a0404 10px 20px)', glow:'#ff4a3a', tag:'RAID' }
};
const _crateArt = {};
function crateArt(look){
  look = CRATE_LOOK[look] ? look : 'depart'; if(_crateArt[look]) return _crateArt[look];
  const P = CRATE_LOOK[look].pal, c = document.createElement('canvas'); c.width = 40; c.height = 32; const x = c.getContext('2d'), R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  R(4, 3, 32, 26, OL); R(5, 4, 30, 6, P.L1); R(5, 4, 30, 1, P.HL); R(5, 10, 30, 5, P.M1); R(5, 15, 30, 1, P.D1); R(5, 16, 30, 12, P.M1); R(5, 25, 30, 3, P.D1);
  R(5, 10, 1, 18, P.L1); R(34, 10, 1, 18, P.D1);
  [9, 27].forEach(a => { R(a, 4, 4, 24, P.D2); R(a, 4, 1, 24, P.D1); R(a + 3, 4, 1, 24, OL); });
  if(look === 'titans'){                                                       // runes qui brillent + œil
    [[7, 18], [32, 20], [7, 23], [32, 12], [15, 26], [24, 26]].forEach(([a, b]) => R(a, b, 1, 1, P.E));
    R(16, 11, 8, 9, OL); R(17, 12, 6, 7, '#2a1450'); R(18, 14, 4, 3, P.E); R(19, 15, 2, 1, '#ffffff'); R(17, 12, 6, 1, '#6a4aa0');
    for(let k = 0; k < 4; k++) R(20 - k - 1, 21 + k, 2*k + 2, 1, OL); for(let k = 1; k < 4; k++) R(20 - k, 22 + k, 2*k, 1, P.E);
  } else if(look === 'raid'){                                                  // étoile dorée + pointes
    R(16, 11, 8, 9, OL); R(17, 12, 6, 7, P.S); R(17, 12, 6, 1, '#fff2b0'); R(19, 14, 2, 3, OL);
    [[20, 20], [19, 21], [21, 21], [17, 22], [18, 22], [19, 22], [20, 22], [21, 22], [22, 22], [23, 22], [18, 23], [19, 23], [20, 23], [21, 23], [22, 23], [19, 24], [21, 24], [18, 25], [22, 25]].forEach(([a, b]) => R(a, b, 1, 1, P.E));
    [[3, 6], [36, 6], [3, 24], [36, 24]].forEach(([a, b]) => { R(a, b, 1, 3, '#dfe8f8'); });
  } else {
    R(16, 11, 8, 9, OL); R(17, 12, 6, 7, P.S); R(17, 12, 6, 1, '#d8e0ea'); R(17, 18, 6, 1, '#6c7889'); R(19, 14, 2, 3, OL);
    for(let k = 0; k < 5; k++) R(20 - k - 1, 21 + k, 2*k + 2, 1, OL); for(let k = 1; k < 4; k++) R(20 - k, 22 + k, 2*k, 1, P.E);
  }
  [[6, 5], [33, 5], [6, 26], [33, 26]].forEach(([a, b]) => R(a, b, 1, 1, P.HL));
  return _crateArt[look] = c.toDataURL();
}
const crateLookOf = id => { const c = CRATE[id]; return c && c.look ? c.look : id === 'raid' ? 'raid' : 'depart'; };
// vitrine des caisses (onglet Caisses du Magasin)
function crateTile(o){
  const c = CRATE[o.crate], look = crateLookOf(o.crate), L = CRATE_LOOK[look], lock = crateLocked(c), raid = look === 'raid';
  const n = raid && typeof raidCrates === 'function' ? raidCrates() : 0, ok = raid ? n > 0 : Save.coins() >= c.price;
  const price = raid ? `×${n} à ouvrir · Gratuit` : lock ? '🔒 Chapitre 1' : c.price ? money(c.price) : 'Gratuit';
  const leg = Object.values(ITEM).filter(it => it.legend && (c.slots || []).some(s => s.pool && s.pool.includes(it))).length;
  return `<button class='crt crt-${look} ${lock ? 'lock' : ''}' data-o='${o.id}' style='--cbg:${L.bg};--cg:${L.glow}'>
    ${L.tag ? `<span class='crt-rib'>${L.tag}</span>` : ''}${raid && n > 0 ? `<span class='crt-n'>${n}</span>` : ''}
    <span class='crt-img'><i class='crt-halo'></i><img src='${crateArt(look)}'></span>
    <b>${esc(o.label)}</b><small>${esc(o.desc || '')}</small>
    <span class='crt-info'>${(c.slots || []).length} emplacements${leg ? ' · ✦ Légendaire' : ''}${(c.slots || []).some(s => s.hidden) ? ' · ??? Secret' : ''}</span>
    <span class='tag ${lock || !ok ? 'bad' : ''}'>${price}</span>
    ${lock ? `<span class='crt-lock'>🔒<small>Termine le niveau 7 du Solo</small></span>` : ''}</button>`;
}
const _shopTit = showShop;
showShop = function(tab){
  _shopTit(tab);
  const list = document.querySelector('#menu .shoplist'); if(!list) return;
  shopBuild();
  list.className = 'crtlist'; list.innerHTML = SHOP.map(crateTile).join('');
  bindAll('#menu .crtlist [data-o]', el => showCrate(SHOP.find(o => o.id === el.dataset.o).crate));
};
SCREENS.shop = showShop;
// aperçu d'une caisse : son coffre, sa couleur, et le verrou
const _crateTit = showCrate;
showCrate = function(id){
  _crateTit(id);
  const look = crateLookOf(id), img = document.querySelector('#menu .cr.big'); if(img) img.src = crateArt(look);
  const crv = document.querySelector('#menu .crv'); if(crv) crv.classList.add('crv-' + look);
  if(crateLocked(CRATE[id])){
    const op = document.getElementById('op'); if(op){ op.disabled = true; op.textContent = '🔒 Termine le niveau 7'; }
    const row = op && op.closest('.row'); if(row) row.insertAdjacentHTML('afterend', `<p class='hint bad'>Cette caisse se débloque quand tu as terminé le <b>niveau 7</b> du Solo (3v3 ou 6v6).</p>`);
  }
};
