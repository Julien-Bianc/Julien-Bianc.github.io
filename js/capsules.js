// ============================================================
//  capsules.js — CAPSULES BALL : effets d'arrivée des Pokémon (données : data/capsules.js).
//  • CAP_FX[fx] = { dur, sfx, flash, shake, under(c,x,gy,t), over(c,x,gy,t) }
//      x, gy : position du Pokémon AU SOL ; t : temps (s) depuis l'ouverture de la Pokéball
//      under : dessiné au sol (sous les Pokémon)  ·  over : dessiné par-dessus
//    Les effets ne dépendent que du temps (pas de particules stockées) : le même code sert en combat,
//    dans l'aperçu du magasin / de l'inventaire et dans l'éditeur d'équipe.
//  • capsuleFire(pokémon) : déclenché par js/pokeball.js quand la ball s'ouvre.
//  • Équipement : team.caps = { idPokémon: idCapsule } (Mes équipes).
// ============================================================
const capR = (i, k) => { const s = Math.sin(i*127.1 + k*311.7 + 17.3)*43758.5453; return s - Math.floor(s); };   // hasard fixe
const cC = u => Math.min(1, Math.max(0, u));
const cE = u => 1 - Math.pow(1 - cC(u), 3);
const cBell = u => Math.sin(cC(u)*Math.PI);
function cGlow(c, x, y, s, col, a){ if(a <= 0 || s <= 0) return; c.globalAlpha = Math.max(0, Math.min(1, a)); c.drawImage(glow(col), x - s/2, y - s/2, s, s); }
function cRing(c, x, y, r, w, col, a, k){ if(a <= 0 || r <= 0) return; c.globalAlpha = Math.max(0, Math.min(1, a)); c.strokeStyle = col; c.lineWidth = Math.max(.5, w); c.beginPath(); c.ellipse(x, y, r, r*(k || .42), 0, 0, 6.283); c.stroke(); }
function cStar4(c, x, y, s, col, a, rot){
  if(a <= 0 || s <= 0) return; c.save(); c.globalAlpha = Math.max(0, Math.min(1, a)); c.translate(x, y); c.rotate(rot || 0); c.fillStyle = col; c.beginPath();
  for(let i = 0; i < 8; i++){ const r = i % 2 ? s*.22 : s, an = i*Math.PI/4; c.lineTo(Math.cos(an)*r, Math.sin(an)*r); }
  c.closePath(); c.fill(); c.restore();
}
function cBolt(c, x0, y0, x1, y1, seed, w, col, a){
  if(a <= 0) return; const n = 7, pts = [[x0, y0]];
  for(let i = 1; i < n; i++){ const u = i/n; pts.push([x0 + (x1 - x0)*u + (capR(seed, i) - .5)*26, y0 + (y1 - y0)*u + (capR(seed, i + 9) - .5)*8]); }
  pts.push([x1, y1]);
  for(const [lw, cl, al] of [[w*3, col, .35], [w*1.6, col, .8], [w*.6, '#ffffff', 1]]){
    c.globalAlpha = Math.max(0, a*al); c.strokeStyle = cl; c.lineWidth = lw; c.lineJoin = 'round'; c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.stroke();
  }
}
const ADD = (c, f) => { c.save(); c.globalCompositeOperation = 'lighter'; f(); c.restore(); };
const NORM = (c, f) => { c.save(); f(); c.restore(); };
const FIREPAL = ['#fff6c0', '#ffd040', '#ff8a20', '#e0401c'];
function cFlame(c, x, y, h, w, a){                                  // langue de feu (base en x,y)
  if(a <= 0 || h <= 1) return; c.globalAlpha = Math.max(0, Math.min(1, a));
  const g = c.createLinearGradient(0, y, 0, y - h); g.addColorStop(0, FIREPAL[3]); g.addColorStop(.35, FIREPAL[2]); g.addColorStop(.7, FIREPAL[1]); g.addColorStop(1, 'rgba(255,240,180,0)');
  c.fillStyle = g; c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w*.9, y - h*.55, x, y - h); c.quadraticCurveTo(x + w*.9, y - h*.55, x + w, y); c.closePath(); c.fill();
  c.fillStyle = 'rgba(255,250,210,.85)'; c.beginPath(); c.moveTo(x - w*.4, y); c.quadraticCurveTo(x - w*.3, y - h*.35, x, y - h*.55); c.quadraticCurveTo(x + w*.3, y - h*.35, x + w*.4, y); c.closePath(); c.fill();
}
const HUE = (h, l) => `hsl(${(h % 360 + 360) % 360},100%,${l || 60}%)`;

// ============================================================
//  LES EFFETS
// ============================================================
const CAP_FX = {
  // ---------------- COMMUNS ----------------
  etincelles:{ dur:1, sfx:'sparkle',
    over(c, x, gy, t){ const by = gy - 24, u = t/1;
      ADD(c, () => { cGlow(c, x, by, 70*(1 - u), '#fff2a0', (1 - u*3)*.9);
        for(let i = 0; i < 18; i++){ const a = i/18*6.283 + capR(i, 1)*.5, d = (40 + capR(i, 2)*45)*cE(u*1.4);
          cStar4(c, x + Math.cos(a)*d, by + Math.sin(a)*d*.75 + u*u*20, 6*(1 - u) + 1.5, ['#fff6c0', '#ffd23f', '#ffffff'][i % 3], 1 - u, u*4 + i); } }); } },
  bulles:{ dur:1.5, sfx:'bubble',
    under(c, x, gy, t){ ADD(c, () => { cRing(c, x, gy, 10 + cE(t/.6)*40, 3, '#9fdcff', (1 - t/.8)*.8); }); },
    over(c, x, gy, t){ NORM(c, () => {
      for(let i = 0; i < 20; i++){ const d = capR(i, 2)*.45, u = (t - d)/1, bx = x + (capR(i, 1) - .5)*80; if(u <= 0 || u > 1.08) continue;
        const r = 2.5 + capR(i, 4)*4, px = bx + Math.sin(u*8 + i)*5, py = gy - 4 - u*80*(.6 + capR(i, 3)*.5);
        if(u > 1){ cRing(c, px, py, r + (u - 1)*90, 1.2, '#dff4ff', 1 - (u - 1)*12, 1); continue; }
        c.globalAlpha = Math.max(0, .85); c.strokeStyle = '#cdeeff'; c.lineWidth = 1.2; c.fillStyle = 'rgba(140,210,255,.25)'; c.beginPath(); c.arc(px, py, r, 0, 6.283); c.fill(); c.stroke();
        c.fillStyle = '#fff'; c.fillRect(Math.round(px - r*.45), Math.round(py - r*.5), 2, 2); } }); } },
  feuilles:{ dur:1.5, sfx:'leaves',
    over(c, x, gy, t){ NORM(c, () => { const u = t/1.5;
      for(let i = 0; i < 16; i++){ const ph = i/16*6.283, an = ph + u*8, rad = 36 - u*8 + capR(i, 1)*10, h = u*70*(.5 + capR(i, 2)*.6);
        const px = x + Math.cos(an)*rad, py = gy - 8 - h + Math.sin(an)*rad*.38, a = (1 - cC((u - .7)/.3))*(Math.sin(an) < 0 ? .55 : 1);
        c.save(); c.globalAlpha = Math.max(0, a); c.translate(px, py); c.rotate(an*2 + i); c.fillStyle = i % 3 ? '#6fd04a' : '#a8ec70'; c.strokeStyle = '#2a6a20'; c.lineWidth = 1;
        c.beginPath(); c.ellipse(0, 0, 5, 2.4, 0, 0, 6.283); c.fill(); c.stroke(); c.restore(); } }); } },
  fumee:{ dur:1.2, sfx:'smoke',
    over(c, x, gy, t){ NORM(c, () => { const u = t/1.2;
      for(let i = 0; i < 12; i++){ const a = i/12*6.283 + capR(i, 1)*.4, d = cE(u*1.5)*(32 + capR(i, 2)*20), r = 8 + cE(u*1.3)*14 + capR(i, 3)*5;
        const px = x + Math.cos(a)*d, py = gy - 10 + Math.sin(a)*d*.4 - u*18, al = (1 - u)*.75;
        c.globalAlpha = Math.max(0, al); c.fillStyle = '#9a9aa8'; c.beginPath(); c.arc(px, py + 2, r, 0, 6.283); c.fill();
        c.fillStyle = '#e4e4ee'; c.beginPath(); c.arc(px - 1, py - 1, r*.85, 0, 6.283); c.fill(); }
      c.globalAlpha = Math.max(0, (1 - u*2.2)*.9); c.fillStyle = '#f2f2f8'; c.beginPath(); c.arc(x, gy - 18, 22*(1 - u*.5), 0, 6.283); c.fill(); }); } },
  confettis:{ dur:1.8, sfx:'pop',
    over(c, x, gy, t){ NORM(c, () => { const cols = ['#ff5a5a', '#ffd23f', '#4fd16a', '#4b9bff', '#d36cff', '#ffffff'];
      for(let i = 0; i < 46; i++){ const vx = (capR(i, 1) - .5)*230, vy = -(150 + capR(i, 2)*170), k = 1 - Math.exp(-2.2*t);
        const px = x + vx*k/2.2*2, py = gy - 20 + vy*k/2.2*2 + 120*t*t, w = 4*Math.abs(Math.cos(t*12 + i));
        c.globalAlpha = Math.max(0, 1 - cC((t - 1.3)/.5)); c.fillStyle = cols[i % cols.length]; c.fillRect(Math.round(px), Math.round(py), Math.max(1, Math.round(w)), 3); } }); } },

  // ---------------- PEU COMMUNS ----------------
  flammes:{ dur:1.6, sfx:'fire', shake:.12,
    _f(c, x, gy, t, front){ const R = 14 + cE(t/.35)*34, fade = 1 - cC((t - 1.15)/.45);
      for(let i = 0; i < 22; i++){ const a = i/22*6.283, s = Math.sin(a); if((s >= 0) !== front) continue;
        const fl = .7 + .3*Math.sin(t*26 + i*3.1), h = (16 + capR(i, 1)*12)*fl*fade*cE(t/.3);
        cFlame(c, x + Math.cos(a)*R, gy + s*R*.42, h, 5 + capR(i, 2)*2, fade); } },
    under(c, x, gy, t){ const R = 14 + cE(t/.35)*34, fade = 1 - cC((t - 1.15)/.45);
      NORM(c, () => { c.globalAlpha = Math.max(0, .35*fade); c.fillStyle = '#2a1408'; c.beginPath(); c.ellipse(x, gy, R, R*.42, 0, 0, 6.283); c.fill(); });
      ADD(c, () => { cRing(c, x, gy, R, 6, '#ff7a2c', .9*fade); cGlow(c, x, gy, R*3, '#ff6a20', .5*fade); });
      ADD(c, () => this._f(c, x, gy, t, false)); },
    over(c, x, gy, t){ ADD(c, () => { this._f(c, x, gy, t, true);
      for(let i = 0; i < 18; i++){ const d = capR(i, 3)*.8, u = (t - d)/.8; if(u <= 0 || u >= 1) continue; const a = capR(i, 4)*6.283, R = 20 + capR(i, 5)*30;
        cGlow(c, x + Math.cos(a)*R + Math.sin(u*9 + i)*4, gy + Math.sin(a)*R*.42 - u*70, 5, '#ffb040', 1 - u); } }); } },
  vague:{ dur:1.5, sfx:'splash', shake:.1,
    under(c, x, gy, t){ for(const d of [0, .22]){ const u = (t - d)/1.1; if(u <= 0 || u >= 1) continue; const R = 10 + cE(u)*70;
      NORM(c, () => { cRing(c, x, gy, R, 9*(1 - u) + 2, '#2f7fd0', (1 - u)*.9); cRing(c, x, gy - 2, R - 3, 3*(1 - u) + 1, '#e8f6ff', (1 - u)); }); } },
    over(c, x, gy, t){ NORM(c, () => {
      for(let i = 0; i < 7; i++){ const a = i/7*6.283 + .3, R = 30, h = cBell(t/.7)*(26 + capR(i, 1)*14); if(h <= 1) continue;
        const px = x + Math.cos(a)*R, py = gy + Math.sin(a)*R*.42, g = c.createLinearGradient(0, py, 0, py - h); g.addColorStop(0, 'rgba(60,140,230,.9)'); g.addColorStop(1, 'rgba(230,248,255,.95)');
        c.globalAlpha = Math.max(0, 1); c.fillStyle = g; c.beginPath(); c.ellipse(px, py - h/2, 4 + h*.08, h/2, 0, 0, 6.283); c.fill(); }
      for(let i = 0; i < 30; i++){ const a = capR(i, 2)*6.283, v = 70 + capR(i, 3)*90, up = 150 + capR(i, 4)*120, tt = t - capR(i, 5)*.2; if(tt <= 0) continue;
        const px = x + Math.cos(a)*v*tt, py = gy + Math.sin(a)*v*tt*.42 - up*tt + 380*tt*tt; if(py > gy + 20) continue;
        c.globalAlpha = Math.max(0, 1 - cC(tt/1.1)); c.fillStyle = i % 3 ? '#8fd0ff' : '#ffffff'; c.beginPath(); c.arc(px, py, 2 + capR(i, 6)*1.5, 0, 6.283); c.fill(); } }); } },
  eclair:{ dur:1.2, sfx:'thunder', flash:.35, shake:.25,
    under(c, x, gy, t){ ADD(c, () => { cGlow(c, x, gy, 140, '#ffe24a', cBell(t/1)*.5); cRing(c, x, gy, 16 + cE(t/.5)*40, 3, '#fff6a0', 1 - t/.7); }); },
    over(c, x, gy, t){ ADD(c, () => {
      [[-.4, 0], [.35, .12], [1.57, .24]].forEach(([ang, d], k) => { const u = (t - d)/.28; if(u < 0 || u > 1) return;
        const px = x + Math.cos(ang + Math.PI)*34*(k === 2 ? 0 : 1), py = gy + (k === 2 ? 14 : Math.sin(ang)*14), seed = k*13 + Math.floor(t*20);
        cBolt(c, px + (capR(k, 3) - .5)*40, py - 190, px, py, seed, 3, '#ffe24a', 1 - u); cGlow(c, px, py, 70, '#fff6a0', (1 - u)); cRing(c, px, py, 6 + u*26, 2, '#ffffff', 1 - u); });
      if(t < 1){ for(let i = 0; i < 4; i++){ const a = capR(i, Math.floor(t*14))*6.283, a2 = a + .9, R = 24, by = gy - 24;
        cBolt(c, x + Math.cos(a)*R, by + Math.sin(a)*R*.8, x + Math.cos(a2)*R, by + Math.sin(a2)*R*.8, i + Math.floor(t*14)*5, 1, '#fff6a0', (1 - t)*.9); } } }); } },
  blizzard:{ dur:1.7, sfx:'ice', shake:.1,
    under(c, x, gy, t){ ADD(c, () => { const f = 1 - cC((t - 1.2)/.5); cRing(c, x, gy, 10 + cE(t/.4)*42, 4, '#bfefff', .8*f); cGlow(c, x, gy, 130, '#9fe3ff', .45*f); }); },
    over(c, x, gy, t){ NORM(c, () => {
      for(let i = 0; i < 11; i++){ const a = i/11*6.283 + capR(i, 1)*.3, R = 30 + capR(i, 2)*12, d = capR(i, 3)*.2, g = cE((t - d)/.22), br = cC((t - 1.1 - capR(i, 4)*.2)/.35);
        if(g <= 0) continue; const px = x + Math.cos(a)*R, py = gy + Math.sin(a)*R*.42, h = (18 + capR(i, 5)*14)*g, w = 4 + capR(i, 6)*3, lean = Math.cos(a)*6;
        if(br > 0){ for(let s = 0; s < 4; s++){ const sa = capR(i, s + 10)*6.283; c.globalAlpha = Math.max(0, 1 - br); c.fillStyle = '#e8f8ff'; c.fillRect(Math.round(px + Math.cos(sa)*br*30), Math.round(py - h/2 + Math.sin(sa)*br*24 + br*br*20), 2, 2); } continue; }
        c.globalAlpha = Math.max(0, 1); c.strokeStyle = '#3a6a90'; c.lineWidth = 1;
        c.fillStyle = '#9fd8f8'; c.beginPath(); c.moveTo(px - w, py); c.lineTo(px + lean, py - h); c.lineTo(px, py + 1); c.closePath(); c.fill(); c.stroke();
        c.fillStyle = '#eaf8ff'; c.beginPath(); c.moveTo(px, py + 1); c.lineTo(px + lean, py - h); c.lineTo(px + w, py); c.closePath(); c.fill(); c.stroke(); }
      for(let i = 0; i < 24; i++){ const u = cC(t/1.5), an = i/24*6.283 + t*3, rad = (70 + capR(i, 7)*30)*(1 - u*.8);
        c.globalAlpha = Math.max(0, (1 - u)*.9); c.fillStyle = '#ffffff'; const px = x + Math.cos(an)*rad, py = gy - 30 + Math.sin(an)*rad*.45 - capR(i, 8)*30;
        c.fillRect(Math.round(px - 1), Math.round(py), 3, 1); c.fillRect(Math.round(px), Math.round(py - 1), 1, 3); } }); } },

  // ---------------- RARES ----------------
  psy:{ dur:1.8, sfx:'psy', flash:.12,
    under(c, x, gy, t){ ADD(c, () => { for(let k = 0; k < 4; k++){ const u = (t - k*.22)/.9; if(u <= 0 || u >= 1) continue;
      cRing(c, x, gy, 8 + cE(u)*70, 4*(1 - u) + 1, k % 2 ? '#c070ff' : '#ff70c8', 1 - u); } cGlow(c, x, gy, 120, '#ff70c8', cBell(t/1.6)*.5); }); },
    over(c, x, gy, t){ ADD(c, () => { const by = gy - 24, conv = cC((t - 1.15)/.35);
      c.globalAlpha = Math.max(0, cBell(t/1.5)*.6); c.strokeStyle = '#ffa0e0'; c.lineWidth = 1.5; c.beginPath();
      for(let i = 0; i <= 40; i++){ const a = i/40*6.283, r = 30 + Math.sin(a*6 + t*14)*3; c.lineTo(x + Math.cos(a)*r, by + Math.sin(a)*r*.9); } c.stroke();
      for(let i = 0; i < 6; i++){ const a = i/6*6.283 + t*5, R = 34*(1 - conv), px = x + Math.cos(a)*R, py = by + Math.sin(a)*R*.4 - Math.sin(t*3 + i)*6;
        for(let k = 1; k <= 4; k++){ const a2 = a - k*.18; cGlow(c, x + Math.cos(a2)*R, by + Math.sin(a2)*R*.4, 10 - k*1.5, '#ff70c8', (1 - conv)*.35); }
        cGlow(c, px, py, 18, i % 2 ? '#c070ff' : '#ff70c8', 1 - conv*.5); cGlow(c, px, py, 6, '#ffffff', 1 - conv*.5); }
      if(conv > 0){ cGlow(c, x, by, 110*cBell(conv), '#ff9ae0', cBell(conv)); cRing(c, x, by, conv*60, 3, '#ffffff', 1 - conv, .9); } }); } },
  tenebres:{ dur:1.9, sfx:'dark', shake:.15,
    under(c, x, gy, t){ const g = cE(t/.4), f = 1 - cC((t - 1.4)/.5);
      NORM(c, () => { const R = 52*g, gr = c.createRadialGradient(x, gy, 0, x, gy, R); gr.addColorStop(0, 'rgba(10,0,20,.95)'); gr.addColorStop(.7, 'rgba(40,10,70,.6)'); gr.addColorStop(1, 'rgba(40,10,70,0)');
        c.globalAlpha = Math.max(0, f); c.fillStyle = gr; c.beginPath(); c.ellipse(x, gy, R, R*.42, 0, 0, 6.283); c.fill(); });
      ADD(c, () => { for(let k = 0; k < 4; k++){ c.globalAlpha = Math.max(0, .8*f); c.strokeStyle = '#9a5af0'; c.lineWidth = 2; c.beginPath();
        for(let i = 0; i <= 20; i++){ const u = i/20, a = k*1.571 - t*5 + u*3.2, r = 4 + u*46*g; c.lineTo(x + Math.cos(a)*r, gy + Math.sin(a)*r*.42); } c.stroke(); } }); },
    over(c, x, gy, t){ NORM(c, () => { const f = 1 - cC((t - 1.3)/.5);
      for(let i = 0; i < 7; i++){ const a = i/7*6.283 + .4, R = 30, h = cBell(t/1.4)*(44 + capR(i, 1)*24); if(h < 2) continue;
        const bx = x + Math.cos(a)*R, by2 = gy + Math.sin(a)*R*.42; c.globalAlpha = Math.max(0, .85*f); c.strokeStyle = '#1a0a2a'; c.lineWidth = 4; c.lineCap = 'round'; c.beginPath(); c.moveTo(bx, by2);
        for(let k = 1; k <= 8; k++){ const u = k/8; c.lineTo(bx + Math.sin(u*6 + t*8 + i)*6*u, by2 - h*u); } c.stroke();
        c.strokeStyle = '#7a3ad0'; c.lineWidth = 1.5; c.stroke(); } });
      ADD(c, () => { for(let i = 0; i < 16; i++){ const d = capR(i, 2)*1.2, u = (t - d)/.7; if(u <= 0 || u >= 1) continue; const a = capR(i, 3)*6.283;
        cGlow(c, x + Math.cos(a)*(20 + u*20), gy - 10 + Math.sin(a)*8 - u*60, 7, '#b07aff', 1 - u); }
        const u2 = cC((t - 1.35)/.4); if(u2 > 0 && u2 < 1) cRing(c, x, gy - 20, 10 + u2*70, 4, '#b07aff', 1 - u2, .8); }); } },
  dragon:{ dur:1.9, sfx:'dragon', flash:.2, shake:.35,
    _h(c, x, gy, t, front){ const prog = cE(t/.9), f = 1 - cC((t - 1.1)/.25);
      for(let k = 0; k < 2; k++){ let prev = null;
        for(let i = 0; i <= 36; i++){ const u = i/36*prog, an = u*12.6 + k*Math.PI + t*4, R = 30 - u*8, px = x + Math.cos(an)*R, py = gy - u*95 + Math.sin(an)*R*.4, fr = Math.sin(an) >= 0;
          if(prev && fr === front){ c.globalAlpha = Math.max(0, f*(.4 + u*.6)); c.strokeStyle = k ? '#c070ff' : '#6a8cff'; c.lineWidth = 7*(1 - u*.5); c.beginPath(); c.moveTo(prev[0], prev[1]); c.lineTo(px, py); c.stroke();
            c.strokeStyle = '#eef0ff'; c.lineWidth = 2; c.stroke(); }
          prev = [px, py]; }
        if(front && prev) cGlow(c, prev[0], prev[1], 26, k ? '#c070ff' : '#6a8cff', f); } },
    under(c, x, gy, t){ ADD(c, () => { c.lineCap = 'round'; this._h(c, x, gy, t, false); cGlow(c, x, gy, 120, '#6a5acd', cBell(t/1.6)*.6); }); },
    over(c, x, gy, t){ ADD(c, () => { c.lineCap = 'round'; this._h(c, x, gy, t, true);
      const u = cC((t - 1.1)/.7); if(u > 0 && u < 1){ cRing(c, x, gy - 30, 10 + cE(u)*110, 8*(1 - u) + 1, '#8fa0ff', 1 - u, .7); cRing(c, x, gy - 30, cE(u)*80, 4*(1 - u), '#e0c0ff', 1 - u, .7); cGlow(c, x, gy - 40, 140*(1 - u), '#c0b0ff', (1 - u)*.9);
        for(let i = 0; i < 14; i++){ const a = i/14*6.283, d = cE(u)*70; c.save(); c.globalAlpha = Math.max(0, 1 - u); c.translate(x + Math.cos(a)*d, gy - 30 + Math.sin(a)*d*.7); c.rotate(.785); c.fillStyle = i % 2 ? '#a0b0ff' : '#e0d0ff'; c.fillRect(-2.5, -2.5, 5, 5); c.restore(); } } }); } },
  brillant:{ dur:1.6, sfx:'shiny',
    over(c, x, gy, t){ ADD(c, () => { const by = gy - 26;
      [[-14, -12, 0], [16, -2, .22], [-4, 10, .44]].forEach(([dx, dy, d], k) => { const u = (t - d)/.55; if(u <= 0 || u >= 1) return;
        const s = cBell(u)*16, px = x + dx, py = by + dy; cGlow(c, px, py, s*3, '#fff8d0', cBell(u)*.8); cStar4(c, px, py, s, '#ffffff', 1, 0); cStar4(c, px, py, s*.55, k === 1 ? '#bfe8ff' : '#fff2a0', 1, .785);
        for(let i = 0; i < 6; i++){ const a = i/6*6.283 + k, dd = cE(u)*28; cStar4(c, px + Math.cos(a)*dd, py + Math.sin(a)*dd, 3.5*(1 - u), '#ffffff', 1 - u, 0); } });
      for(let i = 0; i < 18; i++){ const tw = Math.sin(t*18 + i*2.7); if(tw < .3) continue; const a = capR(i, 1)*6.283, R = 10 + capR(i, 2)*36;
        cStar4(c, x + Math.cos(a)*R, by + Math.sin(a)*R*.8, 2.5*tw, '#ffffff', (1 - cC((t - 1.1)/.5)), 0); } }); } },

  // ---------------- ULTRA RARES ----------------
  arcenciel:{ dur:2.3, sfx:'rainbow', flash:.5, shake:.4,
    under(c, x, gy, t){ ADD(c, () => {
      for(let k = 0; k < 7; k++){ const u = (t - .25 - k*.07)/1.1; if(u <= 0 || u >= 1) continue; cRing(c, x, gy, 10 + cE(u)*(120 - k*6), 5*(1 - u) + 1, HUE(k*50, 60), 1 - u); }
      cGlow(c, x, gy, 180, '#ffffff', cBell(t/1.5)*.7); }); },
    over(c, x, gy, t){ ADD(c, () => { const pil = cBell(cC(t/1.3)), w = 26*pil*(1 + .1*Math.sin(t*30));
      if(pil > 0) for(let i = 0; i < 13; i++){ const off = (i - 6)/6*w; c.globalAlpha = Math.max(0, pil*.55*(1 - Math.abs(i - 6)/7)); c.fillStyle = HUE(t*240 + i*28, 62); c.fillRect(Math.round(x + off - 2), gy - 300, 4, 300); }
      if(pil > 0){ c.globalAlpha = Math.max(0, pil); c.fillStyle = '#ffffff'; c.fillRect(Math.round(x - w*.18), gy - 300, Math.max(1, Math.round(w*.36)), 300); cGlow(c, x, gy - 10, 120*pil, '#ffffff', pil); }
      const sh = cC((t - .3)/.9); if(sh > 0 && sh < 1) for(let k = 0; k < 3; k++) cRing(c, x, gy - 20, cE(sh)*(150 - k*18), 3, HUE(k*120 + t*200, 65), 1 - sh, .55);
      for(let i = 0; i < 30; i++){ const d = capR(i, 1)*1.4, u = (t - .3 - d)/.8; if(u <= 0 || u >= 1) continue; const a = capR(i, 2)*6.283, R = 16 + capR(i, 3)*60;
        cStar4(c, x + Math.cos(a)*R, gy - 20 + Math.sin(a)*R*.5 - u*50, 4*cBell(u) + 1, HUE(i*37 + t*300, 70), 1 - u, u*3); } }); } },
  legende:{ dur:2.5, sfx:'legend', flash:.55, shake:.5,
    under(c, x, gy, t){ const g = cE(t/.45), f = 1 - cC((t - 1.9)/.6); ADD(c, () => {
      cGlow(c, x, gy, 200*g, '#ffcc40', .55*f);
      cRing(c, x, gy, 62*g, 3, '#ffd860', f); cRing(c, x, gy, 52*g, 1.5, '#fff0b0', f); cRing(c, x, gy, 30*g, 2, '#ffd860', f);
      c.globalAlpha = Math.max(0, f); c.strokeStyle = '#ffe080'; c.lineWidth = 1.5;
      for(const [dir, n, R] of [[1, 3, 50], [-1, 3, 50]]){ c.beginPath(); for(let i = 0; i <= n; i++){ const a = i/n*6.283 + dir*t*1.6 + (dir < 0 ? Math.PI/3 : 0); c.lineTo(x + Math.cos(a)*R*g, gy + Math.sin(a)*R*g*.42); } c.stroke(); }
      for(let i = 0; i < 16; i++){ const a = i/16*6.283 - t*1.2; c.fillStyle = '#fff0b0'; c.fillRect(Math.round(x + Math.cos(a)*57*g - 1), Math.round(gy + Math.sin(a)*57*g*.42 - 1), 3, 2); } }); },
    over(c, x, gy, t){ ADD(c, () => { const pil = cBell(cC((t - .15)/1.3)), w = 22*pil;
      if(pil > 0){ const g = c.createLinearGradient(x - w, 0, x + w, 0); g.addColorStop(0, 'rgba(255,200,60,0)'); g.addColorStop(.5, 'rgba(255,240,180,1)'); g.addColorStop(1, 'rgba(255,200,60,0)');
        c.globalAlpha = Math.max(0, pil); c.fillStyle = g; c.fillRect(x - w, gy - 300, w*2, 300); cGlow(c, x, gy - 20, 140*pil, '#ffd860', pil); }
      if(t > .4 && t < 1.2) for(let i = 0; i < 6; i++){ const a = i/6*6.283 + t*2, R = 46, px = x + Math.cos(a)*R, py = gy + Math.sin(a)*R*.42;
        cBolt(c, px, py, px + Math.cos(a)*6, py - 60, i*7 + Math.floor(t*18), 1.5, '#ffe060', (1 - cC((t - .9)/.3))*.9); }
      const sh = cC((t - .5)/1); if(sh > 0 && sh < 1){ cRing(c, x, gy - 10, cE(sh)*170, 10*(1 - sh) + 1, '#ffd860', 1 - sh, .5); cRing(c, x, gy - 10, cE(sh)*130, 4*(1 - sh), '#ffffff', 1 - sh, .5); }
      for(let i = 0; i < 26; i++){ const d = capR(i, 1)*1.6, u = (t - .4 - d)/.9; if(u <= 0 || u >= 1) continue; const a = capR(i, 2)*6.283, R = 20 + capR(i, 3)*50;
        cGlow(c, x + Math.cos(a)*R, gy + Math.sin(a)*R*.42 - u*90, 8, '#ffd860', 1 - u); cStar4(c, x + Math.cos(a)*R, gy + Math.sin(a)*R*.42 - u*90, 2.5, '#fff8d0', 1 - u, 0); } }); } }
};

// ---------- sons ----------
function capSfx(kind){
  if(typeof AU === 'undefined' || !AU.ctx) return;
  const arp = (fr, st, v, ty) => fr.forEach((f, i) => tone(f, .22, ty || 'triangle', v, 0, i*st));
  switch(kind){
    case 'sparkle': arp([1320, 1760, 2093], .06, .05); break;
    case 'bubble': for(let i = 0; i < 5; i++) tone(500 + i*140, .08, 'sine', .06, 600, i*.09); break;
    case 'leaves': noise(.6, .12, 3000, 6000, 'bandpass'); break;
    case 'smoke': noise(.5, .25, 1200, 200, 'lowpass'); break;
    case 'pop': noise(.08, .3, 4000, 900, 'highpass'); arp([880, 1100, 1320], .05, .05, 'square'); break;
    case 'fire': noise(.9, .3, 600, 2400, 'bandpass'); noise(.6, .2, 300, 80, 'lowpass', .05); break;
    case 'splash': noise(.7, .3, 1800, 300, 'lowpass'); noise(.3, .15, 5000, 1500, 'highpass', .1); break;
    case 'thunder': noise(.15, .45, 8000, 2000, 'highpass'); noise(.9, .45, 900, 60, 'lowpass', .05); tone(60, .6, 'sawtooth', .12, -20); break;
    case 'ice': for(let i = 0; i < 6; i++) tone(2400 + i*300, .12, 'sine', .04, -800, i*.05); noise(.4, .15, 7000, 3000, 'highpass'); break;
    case 'psy': tone(440, .8, 'sine', .08, 440); tone(660, .8, 'sine', .06, -220, .1); break;
    case 'dark': tone(110, 1, 'sawtooth', .07, -50); noise(1, .15, 400, 100, 'lowpass'); break;
    case 'dragon': tone(90, .9, 'sawtooth', .12, 60, .1); noise(.9, .25, 700, 150, 'lowpass', 1.1); break;
    case 'shiny': arp([1568, 2093, 2637, 3136], .09, .05, 'sine'); arp([1568, 2093, 2637, 3136], .09, .03, 'sine'); break;
    case 'rainbow': arp([523, 659, 784, 1047, 1319, 1568, 2093], .07, .06); noise(1.3, .25, 2500, 200, 'lowpass', .25); tone(65, 1, 'sine', .3, -20, .25); break;
    case 'legend': tone(65, 1.6, 'sawtooth', .1, 30); arp([392, 523, 784, 1047, 1568], .12, .07, 'square'); noise(1.2, .35, 1500, 80, 'lowpass', .5); tone(55, 1.2, 'sine', .35, -15, .5); break;
  }
}

// ============================================================
//  ICÔNE (32×32) : petite Pokéball entrouverte + halo + symbole de l'effet
// ============================================================
const CAP_ICON = {};
function capSym(c, sym, x, y, col){
  c.save(); c.translate(x, y); c.fillStyle = col; c.strokeStyle = '#14101c'; c.lineWidth = 1;
  const P = pts => { c.beginPath(); pts.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill(); c.stroke(); };
  switch(sym){
    case 'star': case 'sparkle': P([[0,-5],[1.3,-1.3],[5,0],[1.3,1.3],[0,5],[-1.3,1.3],[-5,0],[-1.3,-1.3]]); break;
    case 'bubble': c.beginPath(); c.arc(0, 0, 4, 0, 6.283); c.fill(); c.stroke(); c.fillStyle = '#fff'; c.fillRect(-2, -2, 2, 2); break;
    case 'leaf': c.beginPath(); c.ellipse(0, 0, 5, 2.6, -.6, 0, 6.283); c.fill(); c.stroke(); break;
    case 'cloud': c.beginPath(); c.arc(-2, 1, 3, 0, 6.283); c.arc(2, 0, 3.5, 0, 6.283); c.fill(); c.stroke(); break;
    case 'confetti': [['#ff5a5a', -4, -3], ['#4fd16a', 1, -4], ['#4b9bff', -2, 2], ['#ffd23f', 2, 1]].forEach(([k, a, b]) => { c.fillStyle = k; c.fillRect(a, b, 3, 2); }); break;
    case 'flame': P([[-4,4],[-3,-1],[-1,1],[0,-5],[2,0],[3,-2],[4,4]]); break;
    case 'wave': P([[-5,4],[-5,0],[-2,-4],[2,-4],[0,-2],[1,0],[5,0],[5,4]]); break;
    case 'bolt': P([[-1,-5],[3,-5],[1,-1],[4,-1],[-2,5],[0,0],[-3,0]]); break;
    case 'snow': c.strokeStyle = col; c.lineWidth = 1.6; for(let i = 0; i < 3; i++){ const a = i*1.047; c.beginPath(); c.moveTo(Math.cos(a)*5, Math.sin(a)*5); c.lineTo(-Math.cos(a)*5, -Math.sin(a)*5); c.stroke(); } break;
    case 'spiral': c.strokeStyle = col; c.lineWidth = 1.6; c.beginPath(); for(let i = 0; i < 30; i++){ const a = i*.42, r = i*.17; c.lineTo(Math.cos(a)*r, Math.sin(a)*r); } c.stroke(); break;
    case 'moon': c.beginPath(); c.arc(0, 0, 5, 0, 6.283); c.fill(); c.stroke(); c.globalCompositeOperation = 'destination-out'; c.beginPath(); c.arc(2.5, -1.5, 4, 0, 6.283); c.fill(); break;
    case 'dragon': P([[0,-5],[4,0],[0,5],[-4,0]]); break;
    case 'rainbow': ['#ff5a5a', '#ffd23f', '#4fd16a', '#4b9bff', '#d36cff'].forEach((k, i) => { c.strokeStyle = k; c.lineWidth = 1.3; c.beginPath(); c.arc(0, 3, 6 - i*1.2, Math.PI, 0); c.stroke(); }); break;
    case 'crown': P([[-5,4],[-5,-3],[-2,0],[0,-5],[2,0],[5,-3],[5,4]]); break;
  }
  c.restore();
}
function capIcon(cap){
  if(CAP_ICON[cap.id]) return CAP_ICON[cap.id];
  const cv = document.createElement('canvas'); cv.width = cv.height = 32; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false;
  c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.max(0, .9); c.drawImage(glow(cap.col), -6, -8, 44, 44); c.globalCompositeOperation = 'source-over'; c.globalAlpha = Math.max(0, 1);
  const s = ballSprite(9, .3, -.3, .45, cap.col); c.drawImage(s, Math.round(15 - s.cx), Math.round(16 - s.cy));
  capSym(c, cap.sym, 24, 23, cap.col);
  return CAP_ICON[cap.id] = cv.toDataURL();
}

// ============================================================
//  EN COMBAT
// ============================================================
const CAP_ON = [];                                    // effets en cours { fx, x, gy, t0 }
const capOf = (o, enemy) => {
  if(!G || !o) return null;
  const id = enemy ? o.cap : (G.cfg && G.cfg.caps && G.cfg.caps[o.t]);
  return id && CAPSULE_BY_ID[id] ? CAPSULE_BY_ID[id] : null;
};
capsuleGlow = function(o, enemy){ const c = capOf(o, enemy); return c ? c.col : '#ffffff'; };
function capsuleFire(o, enemy){
  const cap = capOf(o, enemy); if(!cap) return; const F = CAP_FX[cap.fx]; if(!F) return;
  const k = enemy && o.boss ? 1.5 : 1;
  CAP_ON.push({ fx:F, x:o.x, gy:o.y + PB_FEET*k, t0:G.time });
  capSfx(F.sfx);
  if(F.flash) flashScreen(F.flash);
  if(F.shake) G.shake = Math.max(G.shake || 0, F.shake);
}
function capDraw(layer){
  if(!G) return;
  for(let i = CAP_ON.length - 1; i >= 0; i--){
    const e = CAP_ON[i], t = G.time - e.t0; if(t > e.fx.dur){ CAP_ON.splice(i, 1); continue; }
    const fn = e.fx[layer]; if(fn){ ctx.save(); try{ fn.call(e.fx, ctx, e.x, e.gy, t); }finally{ ctx.restore(); } }
  }
}
const _dgCap = drawGround; drawGround = function(){ _dgCap(); capDraw('under'); };
const _dfCap = drawFx; drawFx = function(){ _dfCap(); capDraw('over'); };
// au lancement d'un combat : on récupère les capsules (et les objets tenus) de l'équipe utilisée, quel que soit le mode
const _startCap = start;
start = function(cfg){
  CAP_ON.length = 0;
  const t = cfg && cfg.teamId && Save.team(cfg.teamId);
  if(t){
    if(!cfg.caps){ cfg.caps = {}; cfg.team.forEach(id => { const c = Save.teamCap(t, id); if(c) cfg.caps[id] = c; }); }
    if(!cfg.items){ cfg.items = {}; cfg.team.forEach(id => { const it = Save.teamItem(t, id); if(it) cfg.items[id] = it; }); }
  }
  _startCap(cfg);
};

// ---------- rappel d'un Pokémon ADVERSE (js/ai-swap.js) : version 3D ----------
drawRecallE = function(){
  const R = G && G.erc; if(!R) return;
  const t = G.time - R.t0, dur = .5; if(t > dur){ G.erc = null; return; }
  recallDraw(ctx, { x:R.x, y:R.y, feet:PB_FEET, to:trainerFrom(R, true), mon:mon(R.o, 1), k:2, dir:1 }, t, dur);
};

// ============================================================
//  APERÇU ANIMÉ (magasin, inventaire, éditeur d'équipe)
//  capsulePreview(canvas, idCapsule, idPokémon) : la Pokéball arrive, s'ouvre, l'effet se joue, en boucle.
// ============================================================
function capsulePreview(cv, capId, pid){
  const cap = CAPSULE_BY_ID[capId]; if(!cv || !cap) return;
  const c = cv.getContext('2d'), F = CAP_FX[cap.fx], W2 = cv.width, H2 = cv.height, x = W2/2, y = H2*.62, k = 2, feet = 14*k;
  pid = pid && SPR[pid] ? pid : ORDER.find(id => SPR[id]);
  const T = PB_T, tOpen = T.throw + (T.pop || 0), tShow = tOpen + T.open + T.emerge, cycle = Math.max(tShow + T.leave, tOpen + F.dur) + .9;
  const frameOf = tt => { const S = SPR[pid]; if(!S) return null; const an = 'Idle'; return snFrame(pid, an, 0, frameAt(S, an, tt*48, 1)); };
  const t0 = performance.now();
  const loop = now => {
    if(!cv.isConnected) return;
    const t = ((now - t0)/1000) % cycle;
    c.setTransform(1, 0, 0, 1, 0, 0); c.imageSmoothingEnabled = false;
    const bg = c.createRadialGradient(x, y + feet, 10, x, y + feet, W2*.7); bg.addColorStop(0, '#3a5a3a'); bg.addColorStop(1, '#141c18'); c.fillStyle = bg; c.fillRect(0, 0, W2, H2);
    c.fillStyle = 'rgba(255,255,255,.06)'; c.beginPath(); c.ellipse(x, y + feet, 90, 32, 0, 0, 6.283); c.fill();
    const tf = t - tOpen;
    if(tf >= 0 && tf <= F.dur && F.under){ c.save(); F.under.call(F, c, x, y + feet, tf); c.restore(); }
    const fr = frameOf(t);
    if(fr && t >= tShow){ c.save(); c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + feet, 16, 6, 0, 0, 6.283); c.fill(); c.drawImage(fr, x - fr.width*k/2, y - fr.height*k/2, fr.width*k, fr.height*k); c.restore(); }
    sendOutDraw(c, { x, y, feet, from:{ x:x - 120, y:y + 40, h:20 }, mon:fr, k, glow:cap.col, dir:1 }, t);
    if(tf >= 0 && tf <= F.dur && F.over){ c.save(); F.over.call(F, c, x, y + feet, tf); c.restore(); }
    if(Math.abs(tf) < .02) capSfxPreview(F.sfx);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
let CAP_PREVIEW_SOUND = false, CAP_LAST_SND = 0;     // l'aperçu ne fait du bruit qu'après un toucher (pas en boucle infinie)
function capSfxPreview(s){ if(CAP_PREVIEW_SOUND && performance.now() - CAP_LAST_SND > 500){ CAP_LAST_SND = performance.now(); capSfx(s); } }
// lance les aperçus présents dans l'écran courant : <canvas class='cprev' data-cap='…' data-poke='…'>
function mountCapPreviews(){ document.querySelectorAll('canvas.cprev').forEach(cv => { if(cv.dataset.on) return; cv.dataset.on = 1; capsulePreview(cv, cv.dataset.cap, cv.dataset.poke); cv.onclick = () => { CAP_PREVIEW_SOUND = true; }; }); }
