// ============================================================
//  cathedrale.js — nouvelle arène « Cathédrale »
//    Sol de marbre en losanges, rosace incrustée, allée de tapis rouge, bancs avec fidèles, vitraux en ogive et rosace.
//    La lumière des vitraux se projette en couleurs sur le sol (et teinte les Pokémon qui passent dedans),
//    elle respire doucement comme si des nuages passaient ; rayons de lumière et poussière dans l'air, cierges qui vacillent.
// ============================================================
(function(){
if(/arenes=old/.test(location.search) || !window.V6K) return;
const { mk, RGB, cl, pix, vor, inField, P, DV, T, vis, person, SKIN, HAIR, CX, CY } = V6K;
const GLASS = ['#ff3a5a', '#3a72ff', '#34d27a', '#ffc232', '#b45aff', '#ff8a3a'];
const WINS = [56, 112, 168, 224, 416, 472, 528, 584];            // vitraux en ogive du mur du fond
const IDX = ARENAS.length;

function paint(a, R, D){
  paintField(a, ['#25232e', '#2f2c3a', '#3a3746', '#454152', '#524d60', '#5e5970', '#1a1820', '#6e6880', '#827c94', '#5a546a',
                 '#7a1424', '#9a1c30', '#b82a3c', '#e0b040', '#8a6a24', '#3a3444', '#4a4256'], (x, y) => {
    if(!inField(x, y)) return 15;
    const d = Math.hypot(x - CX, (y - CY)*1.15);
    // allée centrale (tapis rouge) du bas jusqu'au chœur
    if(Math.abs(x - CX) <= 11 && d > 66){ const v = Math.abs(x - CX); if(v >= 10) return 14; if(v >= 8) return 13; if(v === 7) return 10;
      const k = (Math.abs(((y + 4) % 12) - 6) + v); if(k === 4) return 13; return v < 2 ? 12 : 11; }
    // rosace incrustée au centre
    if(d < 66){ if(d > 64) return 6; if(d > 62) return 13; if(d > 60) return 14;
      const an = Math.atan2((y - CY)*1.15, x - CX), sec = ((an + Math.PI)/(Math.PI*2)*16), f = sec % 1, petal = Math.abs(f - .5)*2;
      if(d > 44){ return (Math.abs(f - .5) < .06) ? 13 : ((sec | 0) & 1 ? 8 : 7); }
      if(d > 42) return 13;
      if(d > 18){ const r = (d - 18)/24; return petal < 1 - r*.85 ? ((sec | 0) & 1 ? 9 : 8) : 3; }
      if(d > 16) return 13; return d < 6 ? 13 : 4; }
    // marbre en losanges (noir / gris) + fines lignes + veines
    const u = (x + y)/18, v = (x - y)/18, fu = u - Math.floor(u), fv = v - Math.floor(v), ck = (Math.floor(u) + Math.floor(v)) & 1;
    if(fu < .06 || fv < .06) return 6;
    if(Math.abs(vn(x, y, 14, 91) - .5) < .012) return ck ? 3 : 5;
    let i = ck ? 1 : 4; if(fu < .14 || fv < .14) i++; else if(fu > .9 || fv > .9) i--; if(vn(x, y, 9, 92) > .68 && bay(x, y) > .5) i++; return cl(i, 0, 5); });
  // --- mur du fond : pierre, ogives à vitraux, rosace, colonnettes ---
  rc(a, 0, 0, PW, FY0, '#2e2a38'); for(let y = 0; y < FY0; y += 4) for(let x = (y/4 & 1)*7; x < PW; x += 14){ rc(a, x, y, 13, 3, '#3a3546'); rc(a, x, y, 13, 1, '#484256'); }
  const pane = (i, j, w) => GLASS[(i*3 + j*5 + w) % GLASS.length];
  WINS.forEach((wx, w) => { for(let j = 0; j < 22; j++) for(let i = 0; i < 11; i++){ const ax = i - 5, ay = 5 - j; if(ay > 0 && ax*ax + ay*ay*1.4 > 34) continue;
      const lead = i % 4 === 1 || j % 5 === 3 || i === 0 || i === 10; px(a, wx - 5 + i, 1 + j, lead ? '#14101a' : shade(pane(i >> 2, (j/5) | 0, w), (i + j) % 3 ? -.1 : .15)); }
    rc(a, wx - 6, 23, 13, 1, '#8a7a9a'); rc(a, wx - 7, 0, 1, 24, '#5a5268'); rc(a, wx + 6, 0, 1, 24, '#1e1a26'); });
  for(let y = -12; y <= 12; y++) for(let x = -12; x <= 12; x++){ const d = Math.hypot(x, y); if(d > 12.5) continue;
    const an = Math.atan2(y, x), sec = ((an + Math.PI)/(Math.PI*2)*12) | 0, lead = d > 11.5 || Math.abs(d - 6) < .6 || d < 1.5 || Math.abs(((an + Math.PI)/(Math.PI*2)*12) % 1 - .5) > .44;
    px(a, CX + x, 12 + y, lead ? '#14101a' : d < 6 ? '#ffc232' : GLASS[sec % GLASS.length]); }
  for(let x = 8; x < PW; x += 28){ if(WINS.some(w => Math.abs(w - x) < 9) || Math.abs(x - CX) < 16) continue; rc(a, x - 2, 0, 4, FY0, '#cfc6b4'); rc(a, x - 2, 0, 1, FY0, '#e8e0cc'); rc(a, x + 1, 0, 1, FY0, '#8a8070'); }
  rc(a, 0, FY0 - 3, PW, 2, '#cfc6b4'); rc(a, 0, FY0 - 3, PW, 1, '#efe8d8'); rc(a, 0, FY0 - 1, PW, 1, '#6a6070');
  // côtés : piliers de pierre ; bas : bancs (les fidèles sont animés)
  [0, PW - FX0].forEach(x0 => { rc(a, x0, FY0, FX0, FY1 - FY0, '#3a3546'); for(let y = FY0; y < FY1; y += 30){ rc(a, x0 + 3, y, 8, 30, '#cfc6b4'); rc(a, x0 + 3, y, 2, 30, '#e8e0cc'); rc(a, x0 + 9, y, 2, 30, '#8a8070'); rc(a, x0 + 2, y, 10, 3, '#e0b040'); } });
  rc(a, 0, FY1, PW, PH - FY1, '#1e1a24'); for(let x = 2; x < PW; x += 60){ if(Math.abs(x + 28 - CX) < 30) continue; rc(a, x, FY1 + 9, 56, 6, '#5a3420'); rc(a, x, FY1 + 9, 56, 1, '#8a5a34'); }
  fieldShade(a);
  // --- projections des vitraux sur le sol : un calque par vitrail (pour qu'ils respirent séparément) ---
  D.glass = WINS.map((wx, w) => { const x0 = wx - 4, y0 = FY0 + 30, H = 120, c = pix(150, H + 4, (X, Y) => {
      const y = y0 + Y, s = Y/H, shift = Y*.55, half = 7 + Y*.08, u = (X + x0 - 10 - (wx + shift - half))/(half*2); if(u < 0 || u >= 1) return null;
      const vv = 1 - s, fi = u*3, fj = vv*5, lead = (fi % 1) < .1 || (fj % 1) < .1; if(lead) return null;
      const al = Math.min(1, Math.sin(s*Math.PI)*1.3)*(.6 + .4*(1 - s)), e = Math.min(u, 1 - u) < .08 ? .6 : 1;
      const c = RGB(GLASS[((fi | 0)*3 + (fj | 0)*5 + w) % GLASS.length]); return [c[0], c[1], c[2], Math.round(255*al*e)]; });
    return { c, x:x0 - 10, y:y0, w }; });
  D.rose = pix(PW, PH, (x, y) => { const dx = x - CX - 18, dy = (y - CY - 6)*1.5, d = Math.hypot(dx, dy); if(d > 74) return null;
    const an = Math.atan2(dy, dx), f = (an + Math.PI)/(Math.PI*2)*12, lead = Math.abs(d - 36) < 2 || (f % 1) < .08 || d < 6; if(lead) return null;
    const c = RGB(d < 36 ? '#ffc232' : GLASS[(f | 0) % GLASS.length]); return [c[0], c[1], c[2], Math.round(255*Math.min(1, (1 - d/78)*1.6))]; }, CX - 60, CY - 56, CX + 100, CY + 64);
  // fidèles sur les bancs
  D.people = []; const C = ['#3a3a5a', '#5a2a3a', '#2a4a5a', '#e8e0d0', '#6a5a3a', '#4a3a6a', '#7a1a2a'];
  for(let x = 6; x < PW - 10; x += 7) if(Math.abs(x + 3 - CX) > 34) D.people.push({ x:x + ((R()*2) | 0), y:FY1 + 3, sk:SKIN[(R()*SKIN.length) | 0], hr:HAIR[(R()*HAIR.length) | 0], sh:C[(R()*C.length) | 0], hs:(R()*4) | 0, o:R()*20, w:R() < .1 });
}
function ground(D){
  const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  D.glass.forEach(g => { if(!vis(g.x + 70, g.y + 60, 200)) return; ctx.globalAlpha = .5 + .22*Math.sin(t*.45 + g.w*1.3) + .08*Math.sin(t*1.7 + g.w);
    ctx.drawImage(g.c, g.x*2, g.y*2, g.c.width*2, g.c.height*2); });
  ctx.globalAlpha = .55 + .15*Math.sin(t*.35); DV(D.rose); ctx.restore();
}
function top(D){
  const t = T(); ctx.save(); ctx.globalCompositeOperation = 'lighter';
  WINS.forEach((wx, w) => { const al = .045 + .025*Math.sin(t*.45 + w*1.3); for(let y = FY0 - 2; y < FY0 + 120; y += 2){ const s = (y - FY0)*.55, hw = 6 + (y - FY0)*.08;
    ctx.fillStyle = `rgba(255,236,200,${al*(1 - (y - FY0)/130)})`; ctx.fillRect(Math.round(wx - hw + s)*2, y*2, Math.round(hw*2)*2, 4); } });
  ctx.restore();
  for(let i = 0; i < 46; i++){ const w = i % WINS.length, u = (t*.04 + hash(i, 1, 3)) % 1, yy = FY0 + u*120, x = WINS[w] + (yy - FY0)*.55 - 6 + hash(i, 2, 3)*12 + Math.sin(t*.8 + i)*2;
    if(!vis(x, yy)) continue; ctx.globalAlpha = Math.sin(u*3.14)*.85; P(x, yy, 1, 1, i % 3 ? '#fff4dc' : GLASS[i % 6]); }
  ctx.globalAlpha = 1;
}
function crowd(D){
  const t = T(), cheer = G && G.e && G.e.hp <= 0 && G.wait > 0;
  for(const q of D.people){ if(!vis(q.x, q.y, 30)) continue; const pose = cheer ? 1 : q.w && Math.sin(t*4 + q.o) > .3 ? 2 : 0, j = cheer ? Math.round(Math.abs(Math.sin(t*10 + q.o))*2) : 0;
    ctx.drawImage(person(q.sk, q.hr, q.sh, q.hs, pose), (q.x - 2)*2, (q.y - 2 - j)*2, 22, 30); }
  for(let x = 2; x < PW; x += 60){ if(Math.abs(x + 28 - CX) < 30 || !vis(x + 28, FY1 + 8, 80)) continue; P(x, FY1 + 8, 56, 4, '#6e4228'); P(x, FY1 + 8, 56, 1, '#a8703c'); P(x, FY1 + 11, 56, 1, '#3e2414'); }
  // cierges sur le mur du fond (flammes vacillantes)
  for(let x = 8; x < PW; x += 28){ if(WINS.some(w => Math.abs(w - x) < 9) || Math.abs(x - CX) < 16 || !vis(x, 20)) continue; const f = Math.floor(t*9 + x)%3;
    P(x - 1, 19, 3, 4, '#f4ecd8'); P(x - 1, 19, 1, 4, '#ffffff'); P(x - 2, 23, 5, 1, '#e0b040'); P(x, 16 - (f & 1), 1, 3, '#ffb040'); P(x, 16 - (f & 1), 1, 1, '#fff0a0'); }
}
function lights(L){
  const t = T();
  D.glass.forEach(g => { const al = .2 + .12*Math.sin(t*.45 + g.w*1.3); for(let k = 0; k < 3; k++){ const s = .3 + k*.25, Y = g.y + s*120, X = WINS[g.w] + s*120*.55;
    L(X*2, Y*2, 46, GLASS[(k*5 + g.w) % GLASS.length], al); } });
  for(let k = 0; k < 6; k++){ const an = k*1.047 + .3; L((CX + 18 + Math.cos(an)*44)*2, (CY + 6 + Math.sin(an)*30)*2, 60, GLASS[k], .2 + .06*Math.sin(t*.35)); }
  L(CX*2, 24, 70, '#ffc232', .5);
  for(let x = 8; x < PW; x += 28){ if(WINS.some(w => Math.abs(w - x) < 9) || Math.abs(x - CX) < 16) continue; L(x*2, 34, 44, '#ffb060', .5 + .1*Math.sin(t*11 + x)); }
  for(const r of rocks) if(r.k === 'cand' && r.hp > 0) L(r.x, r.y - 56, 70, '#ffb060', .55 + .1*Math.sin(t*12 + r.x));
}
const D = { name:'Cathédrale', paint, ground, top, lights, crowdFn:crowd, amb:.3, refl:.2 };
ARENAS.push({ name:'Cathédrale', fx:{ k:'mote', c:'#fff4dc', n:0, s:2 }, v6:D,
  obst: sym([['statue', 'gold', .5, .5], ['pillar', 'marb', .3, .22], ['pillar', 'marb', .3, .78], ['cand', 'gold', .15, .5], ['cand', 'gold', .42, .3], ['rock', 'marb', .2, .75]]),
  paint(a, R){ paint(a, R, D); } });
AMBIENT[IDX] = D.amb; REFLECT[IDX] = D.refl; window.CATHEDRALE = IDX;
// où on la trouve : dernier niveau Solo (« Ligue des maîtres ») et dans la rotation de la Tour de Combat
if(typeof STAGES !== 'undefined'){ const S = STAGES.find(s => s.name === 'Ligue des maîtres'); if(S) S.arena = IDX; }
if(typeof TW !== 'undefined' && TW.arenas && !TW.arenas.includes(IDX)) TW.arenas.push(IDX);
})();
