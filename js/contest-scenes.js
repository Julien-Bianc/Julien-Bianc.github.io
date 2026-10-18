// ============================================================
//  contest-scenes.js — Concours Pokémon : les épreuves JOUABLES, en PLEIN ÉCRAN (comme le combat).
//    sceneStyle  : présentation + capsule Ball + notes des 3 juges
//    sceneDance  : rythme à 4 boutons (Gauche / Saut / Droite / Devant)
//    scenePerf   : 4 appels avec les attaques + jauge de « moment parfait »
//    sceneShow   : démonstration d'un concurrent contrôlé par l'ordinateur
//    sceneCook   : cuisson d'un poffin — on remue la marmite en cercles dans le sens de la flèche
//  Le dessin se fait dans un repère de 320×180 centré à l'écran ; le fond et les bords s'étendent à tout l'écran (CV.l/r/t/b).
//  Le canvas est à la résolution réelle de l'écran : textes nets, sprites en pixel art (pixels nets).
//  Effets : projecteurs, ondes de choc, étincelles, flashs d'appareils photo, tremblements, confettis, applaudissements (audio).
// ============================================================
const CW = 320, CH = 180, CT_COL = ['#e8402c', '#3b8fd9', '#3fbf5a', '#f0b928'];   // couleurs des 4 concurrents
const DANCE_COL = ['#3fbf5a', '#e8402c', '#f0c820', '#4a90e8'];                    // Gauche, Saut, Droite, Devant
const DANCE_NAME = ['Gauche', 'Saut', 'Droite', 'Devant'];
const _cs = {};
const CV = { W:320, H:180, S:1, ox:0, oy:0, l:0, r:320, t:0, b:180, cx:160 };      // repère courant (rempli par conRun)
const BEAM = ['255,120,200', '255,226,122', '120,220,255', '255,255,255', '190,130,255'];
const FX_COLS = CONTEST_STATS.map(s => s.col).concat(['#ffffff', '#ffe27a']);

// ---------- petits outils de dessin ----------
const cRect = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
function cDisc(x, c, cx, cy, r){ x.fillStyle = c; for(let dy = -r; dy <= r; dy++){ const w = Math.round(Math.sqrt(r*r - dy*dy)); x.fillRect(Math.round(cx - w), Math.round(cy + dy), w*2 + 1, 1); } }
function ctRing(x, c, cx, cy, r, t){ x.strokeStyle = c; x.lineWidth = t || 1; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.stroke(); }
function cPoly(x, pts, col){      // polygone plein sans anti-crénelage
  const y0 = Math.floor(Math.min(...pts.map(p => p[1]))), y1 = Math.ceil(Math.max(...pts.map(p => p[1]))); x.fillStyle = col;
  for(let y = y0; y < y1; y++){ const yy = y + .5, xs = [];
    for(let i = 0; i < pts.length; i++){ const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % pts.length]; if((ay <= yy && by > yy) || (by <= yy && ay > yy)) xs.push(ax + (yy - ay)/(by - ay)*(bx - ax)); }
    xs.sort((m, n) => m - n); for(let k = 0; k + 1 < xs.length; k += 2){ const a = Math.round(xs[k]), b = Math.round(xs[k + 1]); if(b > a) x.fillRect(a, y, b - a, 1); } }
}
function cTxt(x, s, tx, ty, o){      // texte net : contour sombre + remplissage (police un peu plus grande qu'avant pour la lisibilité)
  o = o || {}; const sz = (o.sz || 8)*1.14; x.font = `bold ${sz}px ${CV.font || '"Courier New",monospace'}`; x.textAlign = o.al || 'left'; x.textBaseline = 'top';
  if(o.sh !== false){ x.lineWidth = Math.max(1.6, sz/4); x.lineJoin = 'round'; x.strokeStyle = '#14101c'; x.strokeText(s, tx, ty); }
  x.fillStyle = o.col || '#fff'; x.fillText(s, tx, ty);
}
function cPanel(x, a, b, w, h, col){ cRect(x, '#14101c', a - 1, b - 1, w + 2, h + 2); cRect(x, col || '#fff', a, b, w, h); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snd = (f, d, t, v, s, dl) => { if(typeof AU !== 'undefined' && AU.ctx) tone(f, d, t || 'square', v || .08, s || 0, dl || 0); };
const hit = (px, py, bx, by, r) => (px - bx)*(px - bx) + (py - by)*(py - by) <= r*r;

// ---------- sons : applaudissements, roulement de tambour ----------
function cheer(level){      // level 0..1 : plus c'est haut, plus la salle est longue et enthousiaste
  if(typeof AU === 'undefined' || !AU.ctx) return; level = clamp(level, 0, 1);
  const n = 16 + Math.round(level*60), dur = .9 + level*2.4;
  for(let i = 0; i < n; i++) noise(.04 + Math.random()*.07, .03 + level*.05, 1400 + Math.random()*3200, 700, 'highpass', Math.random()*dur);
  noise(dur, .03 + level*.05, 3200, 900, 'highpass', 0);
  if(level > .55){ [0, .16, .32].forEach((d, i) => tone(500 + i*130, .5, 'triangle', .05, 160, d)); noise(.6, .06, 5000, 1500, 'highpass', .1); }
  if(level > .8){ tone(70, .7, 'sine', .22, -25, .05); [0, .25, .5].forEach(d => noise(.35, .12, 8000, 1500, 'highpass', d + .15)); }
}
function drumroll(sec){ if(typeof AU === 'undefined' || !AU.ctx) return; for(let i = 0; i < sec*16; i++) noise(.05, .05 + i/(sec*16)*.09, 900, 400, 'lowpass', i/16); }

// ---------- effets : particules, ondes de choc, mots flottants, tremblement et flash d'écran ----------
function fxInit(sc){ sc.P = []; sc.R = []; sc.Wd = []; sc.shake = 0; sc.flash = 0; sc.flashCol = '255,255,255'; if(sc.en == null) sc.en = .3; sc.pulse = 0; sc.cam = []; }
function fxBurst(sc, x0, y0, n, cols, v, o){
  o = o || {}; cols = cols || FX_COLS;
  for(let i = 0; i < n; i++){ const a = Math.random()*6.2832, sp = (o.min || 20) + Math.random()*v; sc.P.push({ x:x0, y:y0, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp*(o.flat || .8) - (o.up || 20), g:o.g == null ? 90 : o.g, life:(o.life || .9)*(.6 + Math.random()*.8), t:0, c:cols[(Math.random()*cols.length) | 0], s:Math.random() < .35 ? 2 : 1 }); }
}
function fxRing(sc, x0, y0, col, max, w, f){ sc.R.push({ x:x0, y:y0, t:0, col, max:max || 70, w:w || 3, f:f == null ? .35 : f }); }
function fxWord(sc, s, x0, y0, col, sz){ sc.Wd.push({ s, x:x0, y:y0, t:0, col:col || '#ffe27a', sz:sz || 12 }); }
function ctKick(sc, shake, flash, col){ sc.shake = Math.max(sc.shake, shake || 0); if(flash){ sc.flash = Math.max(sc.flash, flash); sc.flashCol = col || '255,255,255'; } }
function fxDraw(x, sc, dt){
  for(let i = sc.R.length - 1; i >= 0; i--){ const r = sc.R[i]; r.t += dt; const u = r.t/.6; if(u >= 1){ sc.R.splice(i, 1); continue; }
    x.globalAlpha = 1 - u; x.strokeStyle = r.col; x.lineWidth = r.w*(1 - u) + 1; x.beginPath(); x.ellipse(r.x, r.y, r.max*u, r.max*u*r.f, 0, 0, 6.2832); x.stroke(); }
  x.globalAlpha = 1; x.save(); x.globalCompositeOperation = 'lighter';
  for(let i = sc.P.length - 1; i >= 0; i--){ const p = sc.P[i]; p.t += dt; if(p.t > p.life){ sc.P.splice(i, 1); continue; } p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    x.globalAlpha = Math.min(1, (p.life - p.t)*2.5); x.fillStyle = p.c; x.fillRect(Math.round(p.x), Math.round(p.y), p.s + 1, p.s + 1); if(p.s > 1){ x.fillRect(Math.round(p.x) - 1, Math.round(p.y), 4, 1); x.fillRect(Math.round(p.x), Math.round(p.y) - 1, 1, 4); } }
  x.restore(); x.globalAlpha = 1;
  for(let i = sc.Wd.length - 1; i >= 0; i--){ const w = sc.Wd[i]; w.t += dt; if(w.t > 1.5){ sc.Wd.splice(i, 1); continue; }
    const pop = 1 + Math.max(0, .7 - w.t*3.5); x.save(); x.translate(w.x, w.y - w.t*10); x.scale(pop, pop); x.globalAlpha = Math.min(1, (1.5 - w.t)*2.5); cTxt(x, w.s, 0, -w.sz/2, { sz:w.sz, al:'center', col:w.col }); x.restore(); }
  x.globalAlpha = 1;
}

// ---------- décor de la scène (mis en cache, s'étend à tout l'écran) ----------
function stageBg(footY){
  const key = `bg${footY}_${CV.W | 0}_${CV.H | 0}`; if(_cs[key]) return _cs[key];
  const M = 14, W = Math.ceil(CV.W) + M*2, H = Math.ceil(CV.H) + M*2, c = mkc(W, H), x = c.getContext('2d'); x.translate(CV.ox + M, CV.oy + M);
  const l = CV.l - M, r = CV.r + M, t = CV.t - M, b = CV.b + M, fy = footY - 20, R = (col, a, y, w, h) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(y), Math.round(w), Math.round(h)); };
  const g = x.createLinearGradient(0, t, 0, fy); g.addColorStop(0, '#1a1048'); g.addColorStop(.6, '#46228a'); g.addColorStop(1, '#8a42b0'); x.fillStyle = g; x.fillRect(l, t, r - l, fy - t);
  for(let px = l; px < r; px += 16) R(Math.round((px - l)/16) % 2 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.1)', px, t, 16, fy - t);
  for(let py = Math.max(CV.t, 12), rr = 0; py < fy - 6; py += 14, rr++) for(let px = l + (rr % 2 ? 8 : 0); px < r; px += 16){ R('rgba(255,255,255,.07)', px, py, 1, 3); R('rgba(255,255,255,.07)', px - 1, py + 1, 3, 1); }
  const g2 = x.createLinearGradient(0, fy, 0, b); g2.addColorStop(0, '#f8e6a4'); g2.addColorStop(.5, '#e2b85a'); g2.addColorStop(1, '#a8702e'); x.fillStyle = g2; x.fillRect(l, fy, r - l, b - fy);
  x.strokeStyle = 'rgba(100,50,10,.22)'; x.lineWidth = 1; for(let k = -20; k <= 20; k++){ x.beginPath(); x.moveTo(CV.cx + k*18, fy); x.lineTo(CV.cx + k*50, b); x.stroke(); }
  for(let yy = fy + 7, s = 7; yy < b; yy += s, s *= 1.16) R('rgba(100,50,10,.26)', l, yy, r - l, 1);
  R('#14101c', l, fy, r - l, 1); R('#3b4fb8', l, fy - 4, r - l, 4); R('#6b82f0', l, fy - 4, r - l, 1);
  [CV.l, CV.r - 28].forEach((sx, i) => { for(let k = 0; k < 28; k += 4){ R(k % 8 ? '#e8628a' : '#b02a62', sx + k, CV.t, 4, fy - 4 - CV.t); R('rgba(255,255,255,.12)', sx + k + 1, CV.t, 1, fy - 4 - CV.t); } R('#14101c', sx + (i ? 0 : 27), CV.t, 1, fy - 4 - CV.t); });
  const vg = x.createLinearGradient(0, CV.t, 0, CV.t + 14); vg.addColorStop(0, '#ff9ec0'); vg.addColorStop(1, '#e8628a'); x.fillStyle = vg; x.fillRect(l, CV.t - 4, r - l, 18);
  for(let px = l; px < r; px += 20){ cDisc(x, '#e8628a', px + 10, CV.t + 14, 10); cDisc(x, '#ff8fb0', px + 10, CV.t + 13, 6); R('#fff3b0', px + 9, CV.t + 22, 2, 2); }
  R('#14101c', l, CV.t - 4, r - l, 1);
  return _cs[key] = c;
}
function drawStage(x, t, footY, sc){
  const en = sc ? sc.en : .3, pulse = sc ? sc.pulse : 0;
  x.drawImage(stageBg(footY), CV.l - 14, CV.t - 14);
  x.save(); x.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 5; i++){ const sx = CV.l + (i + .5)*CV.W/5, tx = CV.cx + Math.sin(t*.9 + i*1.9)*(70 + en*50), col = BEAM[(i + Math.floor(t/1.6)) % BEAM.length], a = .045 + en*.08 + pulse*.07;
    x.fillStyle = `rgba(${col},${a})`; x.beginPath(); x.moveTo(sx - 4, CV.t + 14); x.lineTo(sx + 4, CV.t + 14); x.lineTo(tx + 38, footY + 6); x.lineTo(tx - 38, footY + 6); x.closePath(); x.fill();
    x.fillStyle = `rgba(${col},${a*1.6})`; x.beginPath(); x.ellipse(tx, footY + 6, 38, 6, 0, 0, 6.2832); x.fill(); }
  if(pulse > 0){ x.fillStyle = `rgba(255,210,255,${pulse*.07})`; x.fillRect(CV.l, CV.t, CV.W, CV.H); }
  x.restore();
}
function drawSpot(x, px, footY, t, strength){       // cône de lumière sur le Pokémon + halo au sol + éclat de lentille
  x.save(); x.globalCompositeOperation = 'lighter'; const a = (.16 + .05*Math.sin(t*3))*(strength == null ? 1 : strength);
  const g = x.createLinearGradient(0, CV.t + 12, 0, footY); g.addColorStop(0, `rgba(255,246,200,${a*1.4})`); g.addColorStop(1, `rgba(255,236,170,${a*.5})`); x.fillStyle = g;
  x.beginPath(); x.moveTo(px - 6, CV.t + 12); x.lineTo(px + 6, CV.t + 12); x.lineTo(px + 46, footY + 4); x.lineTo(px - 46, footY + 4); x.closePath(); x.fill();
  x.fillStyle = `rgba(255,240,190,${a*2})`; x.beginPath(); x.ellipse(px, footY + 3, 46, 7, 0, 0, 6.2832); x.fill();
  const fg = x.createRadialGradient(px, CV.t + 12, 0, px, CV.t + 12, 16); fg.addColorStop(0, 'rgba(255,255,255,.7)'); fg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = fg; x.fillRect(px - 16, CV.t - 4, 32, 32);
  x.restore();
}
// public au premier plan : silhouettes qui rebondissent, bâtons lumineux, flashs d'appareils photo
function crowdImg(row){
  const key = `cr${row}_${CV.W | 0}`; if(_cs[key]) return _cs[key];
  const r = row ? 16 : 11, c = mkc(Math.ceil(CV.W) + 60, 60), x = c.getContext('2d'), col = row ? '#0b0418' : '#2a1448';
  for(let px = row ? 0 : 8; px < c.width; px += r*2.05){ const hy = 18 + ((px*7) % 5);
    x.fillStyle = col; x.beginPath(); x.arc(px, hy, r, 0, 6.2832); x.fill(); x.beginPath(); x.ellipse(px, hy + r*1.9, r*1.45, r*1.2, 0, Math.PI, 6.2832); x.fill(); x.fillRect(px - r*1.45, hy + r*1.9, r*2.9, 40);
    x.strokeStyle = row ? 'rgba(255,170,230,.3)' : 'rgba(255,140,220,.45)'; x.lineWidth = 1.5; x.beginPath(); x.arc(px, hy, r, Math.PI*1.1, Math.PI*1.9); x.stroke(); }
  return _cs[key] = c;
}
function ctDrawCrowd(x, t, sc, dt){
  const en = sc.en, b1 = Math.sin(t*(3 + en*3))*(1 + en*3), b2 = Math.sin(t*(3 + en*3) + 1.6)*(2 + en*4), bottom = CV.b;
  x.drawImage(crowdImg(0), CV.l - 30, Math.round(bottom - 34 + b1));
  x.save(); x.globalCompositeOperation = 'lighter';
  for(let i = 0, n = Math.ceil(CV.W/24); i < n; i++){ const sx = CV.l + 12 + i*24 + (i % 3)*3, sy = bottom - 20 + (i % 3)*3, sw = Math.sin(t*(4 + en*3) + i)*(8 + en*6), col = ['#ff5a8a', '#5ab8ff', '#7aff9a', '#ffd23f', '#c06eff'][i % 5];
    x.strokeStyle = col; x.lineWidth = 2; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + sw, sy - 15); x.stroke(); const gg = x.createRadialGradient(sx + sw, sy - 15, 0, sx + sw, sy - 15, 9); gg.addColorStop(0, col); gg.addColorStop(1, 'rgba(0,0,0,0)'); x.globalAlpha = .6; x.fillStyle = gg; x.fillRect(sx + sw - 9, sy - 24, 18, 18); x.globalAlpha = 1; }
  x.restore();
  x.drawImage(crowdImg(1), CV.l - 30, Math.round(bottom - 20 + b2));
  if(Math.random() < dt*(2 + en*14)) sc.cam.push({ x:CV.l + 10 + Math.random()*(CV.W - 20), y:bottom - 26 + Math.random()*22, t:0 });
  for(let i = sc.cam.length - 1; i >= 0; i--){ const f = sc.cam[i]; f.t += dt; if(f.t < 0) continue; if(f.t > .16){ sc.cam.splice(i, 1); continue; } x.fillStyle = '#fff'; x.fillRect(Math.round(f.x) - 4, Math.round(f.y), 9, 1); x.fillRect(Math.round(f.x), Math.round(f.y) - 4, 1, 9); x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(Math.round(f.x) - 1, Math.round(f.y) - 1, 3, 3); }
}

// ---------- sprite animé d'un Pokémon (images PMD, 8 directions, recadré et posé sur le sol) ----------
const _cfr = {};
function conFrame(pid, list, sec, row){
  const S = typeof SPR !== 'undefined' && SPR[pid];
  const an = S && list.find(a => S.IM[a] && S.IM[a].complete && S.IM[a].naturalWidth && S.D.anim[a]);
  if(!an){ const c = spr(pid), k = 'f' + pid; return _cfr[k] || (_cfr[k] = { cv:c, cx:c.width/2, bot:c.height*.85 }); }
  const d = S.D.anim[an], im = S.IM[an], nf = Math.max(1, d.dur.length), tot = d.dur.reduce((p, q) => p + q, 0) || 1;
  let tk = (sec*60) % tot, fi = 0; while(fi < nf - 1 && tk >= d.dur[fi]){ tk -= d.dur[fi]; fi++; }
  const r = Math.floor(im.naturalHeight/d.fh) >= 8 ? row : 0, key = pid + an + fi + r; if(_cfr[key]) return _cfr[key];
  const c = mkc(d.fw, d.fh), x = c.getContext('2d'); x.drawImage(im, fi*d.fw, r*d.fh, d.fw, d.fh, 0, 0, d.fw, d.fh);
  let o = { cv:c, cx:d.fw/2, bot:d.fh*.85 };
  try{
    const dt = x.getImageData(0, 0, d.fw, d.fh).data; let x0 = d.fw, x1 = -1, y1 = -1;
    for(let y = 0; y < d.fh; y++) for(let i = 0; i < d.fw; i++) if(dt[(y*d.fw + i)*4 + 3] > 8){ if(i < x0) x0 = i; if(i > x1) x1 = i; y1 = y; }
    if(x1 >= 0) o = { cv:c, cx:(x0 + x1 + 1)/2, bot:y1 + 1 };
  }catch(e){}
  return _cfr[key] = o;
}
// dessine le Pokémon (pieds en (px,py)) ; sc = échelle, flip = miroir
function conMon(x, pid, list, sec, row, px, py, sc, o){
  o = o || {}; const f = conFrame(pid, list, sec, row), w = f.cv.width*sc, h = f.cv.height*sc;
  if(!o.noShadow){ x.fillStyle = 'rgba(40,20,60,.35)'; x.beginPath(); x.ellipse(Math.round(px), Math.round(py) + 1, 13*sc*(o.sh || 1), 3.5*sc*(o.sh || 1), 0, 0, 6.2832); x.fill(); }   // ombre
  x.save(); x.translate(Math.round(px), Math.round(py - (o.lift || 0))); if(o.sx) x.scale(o.sx, 1); if(o.alpha != null) x.globalAlpha = o.alpha;
  x.drawImage(f.cv, Math.round(-f.cx*sc), Math.round(-f.bot*sc), w, h); x.restore();
}
const ANIM = { idle:['Idle'], hop:['Hop', 'Walk', 'Idle'], walk:['Walk', 'Hop', 'Idle'], atk:['Attack', 'Strike', 'Swing', 'Shoot', 'Charge', 'Hop', 'Idle'], hurt:['Hurt', 'Pain', 'Idle'] };
const _capc = {};
function _capImg(cap){ if(_capc[cap.id]) return _capc[cap.id].complete ? _capc[cap.id] : null; try{ const im = new Image(); im.src = capIcon(cap); _capc[cap.id] = im; }catch(e){ _capc[cap.id] = { complete:false }; } return null; }
function capBurst(sc, cap, cx, cy){      // explosion de la capsule Ball : plus la rareté est haute, plus c'est grand
  const n = { C:30, PC:60, R:110, UR:190 }[cap.r] || 24;
  fxBurst(sc, cx, cy, n, [cap.col, cap.col, '#ffffff', '#ffe27a'], cap.r === 'UR' ? 150 : 100, { life:1.1 });
  fxRing(sc, cx, cy + 14, cap.col, 60 + (cap.r === 'UR' ? 50 : cap.r === 'R' ? 30 : 0), 4); if(cap.r !== 'C') fxRing(sc, cx, cy + 14, '#ffffff', 90, 2);
  if(cap.r === 'R' || cap.r === 'UR') fxRing(sc, cx, cy + 14, cap.col, 130, 3);
}

// ---------- tableau des concurrents, bandeau de l'épreuve ----------
function drawBoard(x, C, cur){
  const order = C.cts.map((c, i) => i).sort((a, b) => C.cts[b].total - C.cts[a].total), bx = CV.r - 104, by = CV.t + 16;
  order.forEach((i, rk) => {
    const c = C.cts[i], y = by + rk*16, on = i === cur;
    cRect(x, '#14101c', bx - 1, y - 1, 104, 16); cRect(x, CT_COL[i], bx, y, 102, 14); cRect(x, 'rgba(255,255,255,.28)', bx, y, 102, 5);
    cTxt(x, String(rk + 1), bx + 4, y + 2, { sz:8 });
    cTxt(x, (c.human >= 0 ? 'J' + (c.human + 1) + ' ' : '') + c.name.slice(0, 9), bx + 15, y + 2, { sz:8 });
    cTxt(x, String(Math.round(c.total)), bx + 99, y + 2, { sz:8, al:'right' });
    if(on) cTxt(x, '▶', bx - 10, y + 2, { sz:8, col:'#ffd23f' });
  });
}
function banner(x, title, C){
  const bx = CV.l + 8, by = CV.t + 16; cPanel(x, bx, by, 168, 16, '#ff8fc0'); cDisc(x, CSTAT[C.cat].col, bx + 9, by + 8, 4);
  cTxt(x, title, bx + 18, by + 3, { sz:8 }); cTxt(x, CONTEST_RANKS[C.rank].name + ' · ' + CSTAT[C.cat].name, bx, by + 19, { sz:8, col:'#ffe27a' });
}
const perfX = () => (CV.l + CV.r - 110)/2;            // le Pokémon est au centre de la zone libre à gauche du tableau

// ---------- moteur de scène : plein écran, souris / tactile / clavier, boucle d'animation ----------
const _menuCS = menu;
menu = function(h){ const m = document.getElementById('menu'); if(m){ m.classList.remove('cfull'); m.querySelectorAll('#ccv').forEach(e => e.remove()); } return _menuCS(h); };
function conRun(sc){
  CV.font = sc.pen ? '"Pixelify Sans","Courier New",monospace' : null;     // v0.21.5 : la Pension utilise la police du jeu
  menu(`<div class='cwrap'></div>`);
  const m = document.getElementById('menu'), cv = document.createElement('canvas'); cv.id = 'ccv'; cv.className = 'cfull'; m.appendChild(cv); m.classList.add('cfull');
  const w = m.clientWidth || 800, h = m.clientHeight || 360, dpr = Math.min(window.devicePixelRatio || 1, 2); let pw = Math.round(w*dpr), ph = Math.round(h*dpr); const cap = Math.min(1, 1700/pw); pw = Math.round(pw*cap); ph = Math.round(ph*cap);
  cv.width = pw; cv.height = ph;
  const S = Math.min(pw/CW, ph/CH), LW = pw/S, LH = ph/S; CV.W = LW; CV.H = LH; CV.S = S; CV.ox = (LW - CW)/2; CV.oy = (LH - CH)/2; CV.l = -CV.ox; CV.r = LW - CV.ox; CV.t = -CV.oy; CV.b = LH - CV.oy; CV.cx = CW/2;
  const x = cv.getContext('2d'); fxInit(sc); sc.t = 0; let last = performance.now();
  const lp = e => [e.offsetX/cv.clientWidth*LW - CV.ox, e.offsetY/cv.clientHeight*LH - CV.oy];
  cv.onpointerdown = e => { e.preventDefault(); try{ cv.setPointerCapture(e.pointerId); }catch(_){} const [a, b] = lp(e); if(sc.down) sc.down(a, b); };
  cv.onpointermove = e => { if(sc.move){ const [a, b] = lp(e); sc.move(a, b); } };
  cv.onpointerup = cv.onpointercancel = () => { if(sc.up) sc.up(); };
  const kd = e => { if(!cv.isConnected){ removeEventListener('keydown', kd); removeEventListener('keyup', ku); return; } if(e.repeat) return; if(sc.key && sc.key(e.key.toLowerCase())) e.preventDefault(); };
  const ku = e => { if(sc.keyup) sc.keyup(e.key.toLowerCase()); };
  addEventListener('keydown', kd); addEventListener('keyup', ku);
  const frame = now => {
    if(!cv.isConnected){ removeEventListener('keydown', kd); removeEventListener('keyup', ku); return; }
    const dt = Math.min(.05, (now - last)/1000); last = now; sc.t += dt;
    if(sc.update) sc.update(dt);
    sc.shake = Math.max(0, sc.shake - dt*2.2); sc.flash = Math.max(0, sc.flash - dt*2.6); sc.pulse = Math.max(0, sc.pulse - dt*4); sc.en += ((sc.enT == null ? sc.en : sc.enT) - sc.en)*Math.min(1, dt*1.5);
    x.setTransform(1, 0, 0, 1, 0, 0); x.imageSmoothingEnabled = false; x.fillStyle = '#000'; x.fillRect(0, 0, pw, ph);
    x.save(); const sh = sc.shake*sc.shake*8; x.setTransform(S, 0, 0, S, CV.ox*S + (Math.random() - .5)*sh*S, CV.oy*S + (Math.random() - .5)*sh*S);
    sc.draw(x, dt); fxDraw(x, sc, dt); x.restore();
    if(sc.flash > 0){ x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = `rgba(${sc.flashCol},${Math.min(.85, sc.flash)})`; x.fillRect(0, 0, pw, ph); }
    if(sc.finished){ removeEventListener('keydown', kd); removeEventListener('keyup', ku); return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return sc;
}

// ============================================================
//  ÉPREUVE 1 — STYLE     res = { score, judges:[1..5 ×3] } (calculé par js/contest.js)
// ============================================================
function sceneStyle(C, ct, idx, res, done){
  let ph = 'ready', tt = 0, shown = 0, fx1 = 0, cnt = 0, fin = 0;
  const word = res.score >= 80 ? 'MAGNIFIQUE !' : res.score >= 60 ? 'BRAVO !' : res.score >= 40 ? 'PAS MAL' : 'COURAGE';
  const sc = {
    en:.25, enT:.25,
    key(k){ if(ph === 'ready' && (k === ' ' || k === 'enter')){ go(); return true; } }, down(){ if(ph === 'ready') go(); },
    update(dt){
      if(ph !== 'enter') return; tt += dt; const px = perfX();
      if(tt > .9 && !fx1){ fx1 = 1; ctKick(sc, .9, .9, '255,255,255'); sc.pulse = 1; sc.enT = .7; if(ct.cap) capBurst(sc, ct.cap, px, 118); else fxBurst(sc, px, 100, 30, null, 90); snd(880, .3, 'triangle', .1); snd(1320, .4, 'triangle', .08, 0, .08); noise(.5, .15, 6000, 1500, 'highpass', 0); }
      const need = Math.floor((tt - 1.8)/.7) + 1; if(need > shown && shown < 3){ shown++; const st = res.judges[shown - 1]; snd(520 + st*110, .22, 'square', .09); snd(1040 + st*110, .3, 'triangle', .06, 0, .05); ctKick(sc, .15 + st*.06, st >= 4 ? .25 : 0, '255,230,150'); fxBurst(sc, CV.r - 58, CV.t + 100 + (shown - 1)*22, 6 + st*4, ['#ffd23f', '#fff'], 60); sc.en = Math.min(1, sc.en + .12); for(let i = 0; i < st*3; i++) sc.cam.push({ x:CV.l + 10 + Math.random()*(CV.W - 20), y:CV.b - 26 + Math.random()*22, t:-Math.random()*.2 }); }
      if(tt > 4.0 && !fin){ fin = 1; cheer(res.score/100); sc.enT = .4 + res.score/100*.6; if(res.score >= 60){ ctKick(sc, .5, .5, '255,220,120'); for(let k = 0; k < 5; k++) setTimeout(() => fxBurst(sc, CV.l + 40 + Math.random()*(CV.W - 80), CV.t + 30 + Math.random()*60, 40, null, 110, { life:1.3 }), k*220); } fxWord(sc, word, px, 142, res.score >= 60 ? '#ffe27a' : '#ffffff', 16); }
      if(tt > 3.6 && cnt < res.score){ cnt = Math.min(res.score, cnt + dt*70); if(Math.floor(cnt) % 3 === 0) snd(700 + cnt*6, .03, 'square', .04); }
      if(tt > 6.0){ sc.finished = true; done(res); }
    },
    draw(x, dt){
      const px = perfX(), t = sc.t; drawStage(x, t, 124, sc); drawSpot(x, px, 124, t, ph === 'enter' ? 1 : .8);
      const hop = ph === 'enter' && tt > .9 && tt < 1.8 ? Math.abs(Math.sin((tt - .9)*3.5))*10 : 0;
      conMon(x, ct.pid, ph === 'enter' && tt > .9 ? ANIM.hop : ANIM.idle, t, 0, px, 124, 2.5, { lift:hop });
      if(ph === 'enter' && tt < .9){ x.fillStyle = `rgba(0,0,0,${.35*(1 - tt/.9)})`; x.fillRect(CV.l, CV.t, CV.W, CV.H); cTxt(x, '. . .', px, CV.t + 70, { sz:14, al:'center', col:'#fff3a0' }); }
      ctDrawCrowd(x, t, sc, dt); banner(x, 'ÉPREUVE DE STYLE', C); drawBoard(x, C, idx);
      const bx = CV.l + 8, by = CV.t + 50;
      if(ct.cap){ cPanel(x, bx, by, 112, 32, '#2a2146'); const im = _capImg(ct.cap); if(im) x.drawImage(im, bx + 4, by + 5, 22, 22); cTxt(x, ct.cap.name.replace('Capsule ', '').slice(0, 12), bx + 30, by + 5, { sz:8, col:ct.cap.col }); cTxt(x, '+' + (CAP_STYLE[ct.cap.r] || 0) + ' style', bx + 30, by + 18, { sz:8, col:'#ffe27a' }); }
      else { cPanel(x, bx, by, 112, 18, '#2a2146'); cTxt(x, 'Aucune capsule', bx + 6, by + 5, { sz:8, col:'#bbc' }); }
      if(ph === 'ready' && Math.sin(t*6) > -.3) cTxt(x, 'Touche pour présenter !', px, CV.b - 40, { sz:10, al:'center', col:'#fff3a0' });
      if(ph === 'enter'){
        for(let j = 0; j < 3; j++){ if(j >= shown) continue; const bx2 = CV.r - 104, by2 = CV.t + 88 + j*22, u = clamp((tt - 1.8 - j*.7)*4, 0, 1); x.save(); x.translate(0, (1 - u)*-8); x.globalAlpha = u; cPanel(x, bx2, by2, 102, 19, '#fff'); cTxt(x, 'Juge ' + (j + 1), bx2 + 4, by2 + 5, { sz:8, col:'#14101c', sh:false });
          for(let s = 0; s < 5; s++){ const on = s < res.judges[j]; cTxt(x, '★', bx2 + 44 + s*11, by2 + 3, { sz:11, col:on ? '#f0b928' : '#cfcfd8', sh:false }); } x.restore(); }
        if(tt > 3.6){ cTxt(x, 'STYLE', px + 74, 76, { sz:9, al:'center', col:'#ffe27a' }); cTxt(x, String(Math.floor(cnt)), px + 74, 87, { sz:24, al:'center' }); }
      }
    }
  };
  function go(){ ph = 'enter'; tt = 0; snd(440, .15, 'square', .08); drumroll(.9); sc.enT = .2; }
  return conRun(sc);
}

// ============================================================
//  ÉPREUVE 2 — RYTHME     done(res) avec res = { N, perfect, good, bad, miss, maxCombo, acc }
// ============================================================
function buildChart(rank){
  const R = CONTEST_RANKS[rank], beat = 60/R.bpm, notes = []; let t = 2.6, last = -1, rep = 0;
  for(let i = 0; i < R.notes; i++){
    let l = Math.floor(Math.random()*4); if(l === last && ++rep >= 2){ l = (l + 1 + Math.floor(Math.random()*3)) % 4; rep = 0; } if(l !== last) rep = 0; last = l;
    notes.push({ t, lane:l, st:0 });
    t += rank >= 1 && Math.random() < .25 + rank*.08 ? beat/2 : beat;
  }
  return { notes, beat, end:t + 1.6 };
}
function sceneDance(C, ct, idx, done){
  const ch = buildChart(C.rank), N = ch.notes.length, TR = 1.5, HX = 64, st = { perfect:0, good:0, bad:0, miss:0 }, btnT = [-9, -9, -9, -9];
  let combo = 0, maxCombo = 0, lastJ = '', jT = -9, dirLane = -1, dirT = -9, ring = [], lastBeat = -1, finished = false, endT = 0;
  const BTN = () => [{ x:CV.cx - 42, y:142 }, { x:CV.cx, y:120 }, { x:CV.cx + 42, y:142 }, { x:CV.cx, y:162 }];
  const sc = {
    en:.4, enT:.4,
    key(k){ const l = { arrowleft:0, q:0, a:0, arrowup:1, z:1, w:1, ' ':1, arrowright:2, d:2, arrowdown:3, s:3 }[k]; if(l != null){ press(l); return true; } },
    down(a, b){ BTN().forEach((p, i) => { if(hit(a, b, p.x, p.y, 18)) press(i); }); },
    update(){
      const t = sc.t;
      if(Math.floor(t/ch.beat) !== lastBeat){ lastBeat = Math.floor(t/ch.beat); sc.pulse = Math.max(sc.pulse, .6 + (combo >= 8 ? .3 : 0)); if(t > .8) snd(lastBeat % 4 === 0 ? 110 : 82, .09, 'triangle', .1); }
      ch.notes.forEach(n => { if(!n.st && t > n.t + .22){ n.st = -1; st.miss++; combo = 0; lastJ = 'Raté'; jT = t; sc.enT = Math.max(.25, sc.enT - .06); } });
      if(!finished && t > ch.end - 1.2){ finished = true; endT = t; const sum = st.perfect + st.good*.7 + st.bad*.35, acc = sum/N; cheer(acc); ctKick(sc, acc > .7 ? .6 : .2, acc > .7 ? .5 : 0, '255,220,120'); sc.enT = .3 + acc*.7; fxWord(sc, acc > .9 ? 'PARFAIT !' : acc > .7 ? 'EXCELLENT !' : acc > .45 ? 'BIEN JOUÉ' : 'COURAGE', CV.cx, 60, '#ffe27a', 16); if(acc > .7) for(let k = 0; k < 5; k++) setTimeout(() => fxBurst(sc, CV.l + 40 + Math.random()*(CV.W - 80), 20 + Math.random()*60, 40, null, 110, { life:1.3 }), k*200); }
      if(finished && t > endT + 1.8){ sc.finished = true; const sum = st.perfect + st.good*.7 + st.bad*.35; done({ N, ...st, maxCombo, acc:sum/N }); }
    },
    draw(x, dt){
      const t = sc.t, footY = 90; drawStage(x, t, footY, sc);
      const since = t - dirT, act = since < .35, l = dirLane, px = CV.cx - 20;
      drawSpot(x, px, footY, t, .8 + sc.en*.4);
      const row = act ? [6, 0, 2, 0][l] : 0, ox = act ? [-14, 0, 14, 0][l]*Math.sin(since/.35*3.14) : 0, lift = act && l === 1 ? Math.sin(since/.35*3.14)*10 : 0, k2 = act && l === 3 ? 2.3 : 2;
      conMon(x, ct.pid, act ? ANIM.hop : ANIM.idle, t, row, px + ox, footY, k2, { lift });
      if(t - jT < .8 && lastJ){ const c = lastJ === 'Parfait !' ? '#ffe27a' : lastJ === 'Bien' ? '#9fe8ff' : '#ff8a8a'; cTxt(x, lastJ, px + 52, 52 - (t - jT)*8, { sz:12, al:'center', col:c }); }
      if(combo >= 2){ const pp = 1 + Math.max(0, .5 - (t - jT)*3); x.save(); x.translate(CV.l + 12, CV.t + 48); x.scale(pp, pp); cTxt(x, combo + ' combo', 0, 0, { sz:10, col:combo >= 8 ? '#ff9af0' : '#ffe27a' }); x.restore(); if(combo >= 8) cTxt(x, 'FEVER !', CV.l + 12, CV.t + 60, { sz:9, col:Math.sin(t*14) > 0 ? '#fff' : '#ffd23f' }); }
      banner(x, 'ÉPREUVE DE RYTHME', C); drawBoard(x, C, idx);
      x.fillStyle = '#ff9ad8'; x.fillRect(CV.l, 94, CV.W, CV.b - 94); for(let yy = 94; yy < CV.b; yy += 8) for(let xx = CV.l + ((yy/8 | 0) % 2)*8; xx < CV.r; xx += 16) cRect(x, '#ff7cc4', xx, yy, 8, 8);
      cRect(x, '#14101c', CV.l, 94, CV.W, 1);
      cRect(x, '#14101c', CV.l, 97, CV.W, 22); cRect(x, '#1b3b7a', CV.l, 98, CV.W, 20); cRect(x, '#2f63c0', CV.l, 98, CV.W, 2); cRect(x, '#fff', CV.l, 108, CV.W, 1); cRect(x, 'rgba(255,255,255,.25)', CV.l, 117, CV.W, 1);
      const hx = HX + (CV.cx - 160) - 20; cDisc(x, 'rgba(255,255,255,.18)', hx, 108, 11); ctRing(x, '#fff', hx, 108, 10, 1.5);
      if(combo >= 8){ x.save(); x.globalCompositeOperation = 'lighter'; ctRing(x, `rgba(255,150,240,${.5 + .4*Math.sin(t*12)})`, hx, 108, 14, 3); x.restore(); }
      const SX = CV.r + 12;
      ch.notes.forEach(n => { if(n.st) return; const nx = hx + (n.t - t)*(SX - hx)/TR; if(nx > CV.r + 10) return;
        cDisc(x, '#14101c', nx, 108, 8); cDisc(x, DANCE_COL[n.lane], nx, 108, 7); cRect(x, 'rgba(255,255,255,.35)', nx - 4, 103, 8, 2); arrow(x, n.lane, nx, 108, 3, '#fff'); });
      ring = ring.filter(r => t - r.t < .4); ring.forEach(r => ctRing(x, r.c, hx, 108, 10 + (t - r.t)*50, 2));
      BTN().forEach((p, i) => {
        const pr = t - btnT[i] < .12, dy = pr ? 2 : 0; cDisc(x, '#14101c', p.x, p.y + 2, 17); cDisc(x, '#16315e', p.x, p.y + 2, 16);
        cDisc(x, '#14101c', p.x, p.y + dy, 17); cDisc(x, DANCE_COL[i], p.x, p.y + dy, 15); cRect(x, 'rgba(255,255,255,.3)', p.x - 9, p.y - 10 + dy, 18, 3);
        if(pr){ x.save(); x.globalCompositeOperation = 'lighter'; cDisc(x, 'rgba(255,255,255,.35)', p.x, p.y + dy, 15); x.restore(); }
        arrow(x, i, p.x, p.y + dy - 3, 5, '#fff'); cTxt(x, DANCE_NAME[i], p.x, p.y + 3 + dy, { sz:6, al:'center' });
      });
      if(t < 2) cTxt(x, 'Appuie en rythme !', CV.cx, 99, { sz:8, al:'center', col:'#ffe27a' });
    }
  };
  function arrow(x, l, cx, cy, s, col){ x.fillStyle = col; x.beginPath(); if(l === 0){ x.moveTo(cx - s, cy); x.lineTo(cx + s*.6, cy - s); x.lineTo(cx + s*.6, cy + s); } else if(l === 2){ x.moveTo(cx + s, cy); x.lineTo(cx - s*.6, cy - s); x.lineTo(cx - s*.6, cy + s); } else if(l === 1){ x.moveTo(cx, cy - s); x.lineTo(cx - s, cy + s*.6); x.lineTo(cx + s, cy + s*.6); } else { x.moveTo(cx, cy + s); x.lineTo(cx - s, cy - s*.6); x.lineTo(cx + s, cy - s*.6); } x.fill(); }
  function press(l){
    const t = sc.t; btnT[l] = t; dirLane = l; dirT = t; const hx = HX + (CV.cx - 160) - 20, px = CV.cx - 20;
    let best = null; ch.notes.forEach(n => { if(!n.st && n.lane === l && Math.abs(n.t - t) <= .22 && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n; });
    if(!best){ snd(150, .08, 'sawtooth', .05); return; }
    const d = Math.abs(best.t - t), tone0 = [330, 440, 523, 659][l];
    if(d < .075){ best.st = 1; st.perfect++; combo++; lastJ = 'Parfait !'; ring.push({ t, c:'#ffe27a' }); snd(tone0, .16, 'square', .1); snd(tone0*2, .2, 'triangle', .06);
      fxRing(sc, px, 92, DANCE_COL[l], 60, 3); fxBurst(sc, hx, 108, 10, [DANCE_COL[l], '#fff'], 60, { life:.6 }); ctKick(sc, .22); sc.enT = Math.min(1, sc.enT + .03); }
    else if(d < .14){ best.st = 2; st.good++; combo++; lastJ = 'Bien'; ring.push({ t, c:'#9fe8ff' }); snd(tone0, .14, 'square', .08); fxBurst(sc, hx, 108, 5, [DANCE_COL[l]], 40, { life:.5 }); }
    else { best.st = 3; st.bad++; combo = 0; lastJ = 'Raté'; snd(180, .12, 'sawtooth', .06); }
    if(combo && combo % 5 === 0){ fxWord(sc, 'COMBO x' + combo, px, 50, '#ff9af0', 13); ctKick(sc, .5, .45, '255,170,240'); cheer(.25 + Math.min(.4, combo/50)); fxBurst(sc, px, 70, 40, null, 110, { life:1.1 }); }
    maxCombo = Math.max(maxCombo, combo); jT = t;
  }
  return conRun(sc);
}

// ============================================================
//  ÉPREUVE 3 — PRESTATIONS (4 appels). calc(move, prevCat, quality, volt) → { pts, cat, match, combo, sup, volt }
// ============================================================
function scenePerf(C, ct, idx, calc, done){
  const mv = POKEMON[ct.pid].moves, TURNS = 4, log = []; let turn = 0, ph = 'pick', pm = null, mk = 0, mdir = 1, qual = 0, tt = 0, prevCat = null, volt = 0, sum = 0, pop = null, endDone = false;
  const sc = {
    en:.3, enT:.3,
    key(k){ const n = { 1:0, 2:1, 3:2, '&':0, 'é':1, '"':2 }[k]; if(ph === 'pick' && n != null && mv[n]){ pick(n); return true; } if(ph === 'time' && (k === ' ' || k === 'enter')){ stop(); return true; } },
    down(a, b){ if(ph === 'pick'){ mv.forEach((m, i) => { const bx = CV.cx - 156 + i*106; if(a >= bx && a <= bx + 102 && b >= CV.b - 54 && b <= CV.b - 6) pick(i); }); } else if(ph === 'time') stop(); },
    update(dt){
      tt += dt;
      if(ph === 'time'){ mk += mdir*dt*1.5; if(mk > 1){ mk = 1; mdir = -1; } if(mk < 0){ mk = 0; mdir = 1; } }
      if(ph === 'play' && tt > 1.7){ turn++; if(turn >= TURNS){ ph = 'end'; tt = 0; } else { ph = 'pick'; pm = null; } }
      if(ph === 'end' && !endDone){ endDone = true; const sc100 = Math.min(100, sum*1.15); cheer(sc100/100); sc.enT = .4 + sc100/100*.6; ctKick(sc, .5, .5, '255,220,120'); fxWord(sc, sc100 >= 80 ? 'MAGNIFIQUE !' : sc100 >= 55 ? 'BRAVO !' : 'BIEN TENTÉ', perfX(), 140, '#ffe27a', 16); if(sc100 >= 55) for(let k = 0; k < 5; k++) setTimeout(() => fxBurst(sc, CV.l + 40 + Math.random()*(CV.W - 80), CV.t + 30 + Math.random()*60, 40, null, 110, { life:1.3 }), k*200); }
      if(ph === 'end' && tt > 2.4){ sc.finished = true; done({ pts:log, sum }); }
    },
    draw(x, dt){
      const px = perfX(), t = sc.t, foot = 122; drawStage(x, t, foot, sc); drawSpot(x, px, foot, t, volt >= 3 ? 1.5 : 1);
      const atk = ph === 'play' && tt < 1;
      if(volt >= 3){ x.save(); x.globalCompositeOperation = 'lighter'; const gg = x.createRadialGradient(px, foot - 36, 6, px, foot - 36, 80); gg.addColorStop(0, 'rgba(255,220,120,.45)'); gg.addColorStop(1, 'rgba(255,220,120,0)'); x.fillStyle = gg; x.fillRect(px - 70, foot - 100, 140, 140); x.restore(); }
      if(atk){ x.save(); x.globalCompositeOperation = 'lighter'; x.strokeStyle = `rgba(255,255,255,${.5*(1 - tt)})`; x.lineWidth = 1; for(let k = 0; k < 18; k++){ const a = k/18*6.2832 + .1, r0 = 22 + tt*30, r1 = r0 + 20 + tt*30; x.beginPath(); x.moveTo(px + Math.cos(a)*r0, foot - 30 + Math.sin(a)*r0*.8); x.lineTo(px + Math.cos(a)*r1, foot - 30 + Math.sin(a)*r1*.8); x.stroke(); } x.restore(); }
      conMon(x, ct.pid, atk ? ANIM.atk : ANIM.idle, t, 0, px, foot, 2.5, { lift:atk ? Math.sin(tt*3.14)*6 : 0 });
      ctDrawCrowd(x, t, sc, dt); banner(x, 'ÉPREUVE DE PRESTATIONS', C); drawBoard(x, C, idx);
      cTxt(x, 'Appel ' + Math.min(turn + 1, TURNS) + '/' + TURNS, CV.l + 8, CV.t + 52, { sz:8, col:'#ffe27a' });
      cTxt(x, 'Ambiance', CV.l + 8, CV.t + 63, { sz:8 }); for(let i = 0; i < 3; i++) cPanel(x, CV.l + 58 + i*12, CV.t + 64, 10, 8, i < volt ? '#ffd23f' : '#3a3258');
      if(volt >= 3 && Math.sin(t*10) > 0) cTxt(x, 'SUPER MOMENT !', CV.l + 8, CV.t + 75, { sz:8, col:'#ffd23f' });
      cTxt(x, 'Total ' + (Math.round(sum*10)/10), CV.r - 104, CV.t + 84, { sz:9 });
      if(ph === 'pick'){
        mv.forEach((m, i) => {
          const bx = CV.cx - 156 + i*106, by = CV.b - 54, cat = catOf(m.type), cc = CSTAT[cat].col, base = 5 + Math.min(m.power || 0, 30)/3;
          cPanel(x, bx, by, 102, 48, cc); cRect(x, 'rgba(255,255,255,.28)', bx, by, 102, 9); cRect(x, 'rgba(0,0,0,.25)', bx, by + 35, 102, 13);
          cTxt(x, (i + 1) + ' ' + m.name.slice(0, 12), bx + 4, by + 2, { sz:8 });
          cTxt(x, CSTAT[cat].name, bx + 4, by + 15, { sz:8, col:'#14101c', sh:false }); if(cat === C.cat) cTxt(x, '★ idéal', bx + 60, by + 15, { sz:8, col:'#fff7b0' });
          let h = ''; for(let k = 0; k < Math.round(base/3); k++) h += '♥'; cTxt(x, h, bx + 4, by + 36, { sz:8, col:'#ffd0e0' });
        });
        cTxt(x, 'Choisis ton attaque', px, CV.t + 40, { sz:10, al:'center', col:'#fff3a0' });
      }
      if(ph === 'time'){
        const bx = CV.cx - 100, by = CV.b - 40; cPanel(x, bx, by, 200, 15, '#2a2146'); cRect(x, '#3fbf5a', bx + 70, by + 1, 60, 13); cRect(x, '#ffd23f', bx + 90, by + 1, 20, 13); cRect(x, '#14101c', bx + 200*mk - 1, by - 4, 3, 23);
        cRect(x, '#fff', bx + 200*mk, by - 3, 1, 21);
        cTxt(x, 'Touche au bon moment !', CV.cx, by - 17, { sz:9, al:'center', col:'#fff3a0' }); cTxt(x, pm.name, CV.cx, by + 19, { sz:9, al:'center' });
      }
      if(pop && (ph === 'play' || ph === 'end')){ cTxt(x, '+' + pop.pts, px, foot - 84 - tt*10, { sz:16, al:'center', col:pop.q === 2 ? '#ffe27a' : '#fff' }); cTxt(x, pop.txt, px, foot - 64 - tt*10, { sz:8, al:'center', col:'#ffd0e0' }); }
      if(ph === 'end'){ cTxt(x, 'PRESTATIONS', px, CV.t + 36, { sz:9, al:'center', col:'#ffe27a' }); cTxt(x, String(Math.min(100, Math.round(sum*1.15))), px, CV.t + 47, { sz:22, al:'center' }); }
    }
  };
  function pick(i){ pm = mv[i]; ph = 'time'; mk = 0; mdir = 1; tt = 0; snd(520, .08, 'square', .08); }
  function stop(){
    qual = Math.abs(mk - .5) < .06 ? 2 : Math.abs(mk - .5) < .18 ? 1 : 0;
    const r = calc(pm, prevCat, qual, volt); sum += r.pts; log.push(r.pts); prevCat = r.cat; volt = r.volt;
    pop = { pts:r.pts, q:qual, txt:[qual === 2 ? 'Parfait !' : qual === 1 ? 'Bien' : 'Raté', r.match ? 'Catégorie idéale' : '', r.combo > 1 ? 'Enchaînement' : r.combo < 1 ? 'Répétition' : '', r.sup ? 'Super moment !' : ''].filter(Boolean).join(' · ') };
    ph = 'play'; tt = 0; const px = perfX(), col = CSTAT[r.cat].col;
    snd(qual === 2 ? 880 : 520, .25, 'triangle', .1); if(qual === 2) snd(1320, .3, 'triangle', .08, 0, .1); noise(.25, .12, 4000, 800, 'highpass', 0);
    fxRing(sc, px, 122, col, 90, 4); fxRing(sc, px, 122, '#ffffff', 60, 2); fxBurst(sc, px, 92, 20 + qual*16, [col, '#fff', '#ffe27a'], 100, { life:.9 });
    ctKick(sc, .3 + qual*.25, qual === 2 ? .5 : .2, '255,255,255'); sc.enT = clamp(sc.enT + .08 + qual*.08, .2, 1); sc.pulse = 1; cheer(.15 + qual*.2 + (r.sup ? .4 : 0));
    if(r.sup){ ctKick(sc, 1, .9, '255,220,120'); for(let k = 0; k < 6; k++) setTimeout(() => fxBurst(sc, CV.l + 30 + Math.random()*(CV.W - 60), CV.t + 30 + Math.random()*70, 40, null, 120, { life:1.2 }), k*150); fxWord(sc, 'SUPER MOMENT !', px, 50, '#ffd23f', 15); }
  }
  return conRun(sc);
}

// ============================================================
//  DÉMONSTRATION d'un concurrent contrôlé par l'ordinateur (kind = style | dance | perf)
// ============================================================
function sceneShow(C, ct, idx, kind, score, done){
  let fx = 0, fin = 0;
  const sc = {
    en:.3, enT:.3 + score/100*.5,
    update(){
      const px = perfX();
      if(sc.t > .4 && !fx){ fx = 1; if(kind === 'style' && ct.cap) capBurst(sc, ct.cap, px, 118); else fxBurst(sc, px, 96, 20, null, 80); snd(660, .2, 'triangle', .06); ctKick(sc, .3, .3); sc.pulse = 1; }
      if(sc.t > 1.6 && !fin){ fin = 1; cheer(score/100*.9); fxWord(sc, '+' + Math.round(score), px, 60, '#ffe27a', 16); if(score >= 60) ctKick(sc, .4, .3, '255,220,120'); }
      if(sc.t > 3.0){ sc.finished = true; done(); }
    },
    draw(x, dt){
      const t = sc.t, px = perfX(); drawStage(x, t, 124, sc); drawSpot(x, px, 124, t, .9);
      const list = kind === 'perf' ? (Math.floor(t*1.5) % 2 ? ANIM.atk : ANIM.idle) : kind === 'dance' ? ANIM.hop : ANIM.idle, row = kind === 'dance' ? [0, 2, 0, 6][Math.floor(t*3) % 4] : 0;
      conMon(x, ct.pid, list, t, row, px + (kind === 'dance' ? Math.sin(t*6)*10 : 0), 124, 2.5, { lift:kind !== 'style' ? Math.abs(Math.sin(t*4))*5 : 0 });
      ctDrawCrowd(x, t, sc, dt); banner(x, kind === 'style' ? 'ÉPREUVE DE STYLE' : kind === 'dance' ? 'ÉPREUVE DE RYTHME' : 'ÉPREUVE DE PRESTATIONS', C); drawBoard(x, C, idx); cTxt(x, ct.name, px, 132, { sz:9, al:'center' });
    }
  };
  return conRun(sc);
}

// ============================================================
//  CUISSON D'UN POFFIN (comme dans les jeux) : vue de dessus de la marmite, on remue en CERCLES dans le sens de la flèche.
//   Souris / doigt : fais tourner le pointeur autour de la marmite à la bonne vitesse (flèche verte = bon rythme).
//   Clavier : maintiens Espace (relâche pour ralentir).   done(q) avec q de 0 à 1
// ============================================================
function sceneCook(berryIds, done){
  const DUR = 10, CXp = 160, CYp = 82, R = 54, GO = [2.9, 5.1];   // v0.21.2 : zone verte plus étroite et qui bouge
  const berries = berryIds.map((id, i) => ({ b:BERRY[id], im:berryEl(BERRY[id]), t0:.6 + i*.6, in:false }));
  let ph = 'intro', tt = 0, ang = -Math.PI/2, om = 0, lastA = null, lastT = 0, down = false, held = false, good = 0, elapsed = 0, msg = '', q = 0, poff = null, sw = 0, bub = 0;
  const avgCol = () => { const ins = berries.filter(b => b.in); if(!ins.length) return '#fff0a8'; let r = 0, g = 0, b = 0; ins.forEach(e => { const h = e.b.col; r += parseInt(h.slice(1, 3), 16); g += parseInt(h.slice(3, 5), 16); b += parseInt(h.slice(5, 7), 16); }); const n = ins.length; return mixHex('#fff0a8', '#' + [r/n, g/n, b/n].map(v => Math.round(v).toString(16).padStart(2, '0')).join(''), .3*ins.length/berries.length + .06); };
  const sc = {
    en:.3, enT:.3,
    key(k){ if(k === ' ' || k === 'enter'){ if(ph === 'result' && tt > 1) return end(); held = true; return true; } },
    keyup(k){ if(k === ' ' || k === 'enter') held = false; },
    down(a, b){ if(ph === 'result' && tt > 1) return end(); down = true; lastA = Math.atan2(b - CYp, a - CXp); lastT = sc.t; },
    move(a, b){
      if(!down || ph !== 'stir') return; const dx = a - CXp, dy = b - CYp; if(dx*dx + dy*dy < 100) return;
      const an = Math.atan2(dy, dx); let da = an - lastA; if(da > Math.PI) da -= 6.2832; if(da < -Math.PI) da += 6.2832; const dt = Math.max(.008, sc.t - lastT);
      om = om*.55 + (da/dt)*.45; ang += da; lastA = an; lastT = sc.t;
    },
    up(){ down = false; },
    update(dt){
      tt += dt;
      if(ph === 'intro'){ berries.forEach(b => { if(!b.in && tt > b.t0 + .5){ b.in = true; fxRing(sc, CXp, CYp + 4, b.b.col, 50, 3, .8); fxBurst(sc, CXp, CYp, 12, [b.b.col, '#fff'], 50, { life:.6, g:60 }); snd(300 + Math.random()*120, .12, 'sine', .09, 200); noise(.12, .08, 1500, 500, 'lowpass'); } }); if(berries.every(b => b.in) && tt > berries[berries.length - 1].t0 + .9){ ph = 'stir'; tt = 0; msg = 'Tourne dans le sens de la flèche !'; } return; }
      if(ph === 'stir'){
        if(held){ om += (om < 8 ? 5 : 0)*dt; ang += om*dt; } else if(!down){ om *= Math.max(0, 1 - dt*3.2); ang += om*dt; } else if(sc.t - lastT > .12){ om *= Math.max(0, 1 - dt*6); }
        elapsed += dt; { const c = 4 + Math.sin(elapsed*.85)*1.5 + Math.sin(elapsed*2.1 + 1)*.45, hw = 1.15 - elapsed*.03; GO[0] = c - hw; GO[1] = c + hw; }
        const inBand = om > GO[0] && om < GO[1];
        if(inBand){ good += dt; msg = 'Parfait ! Continue comme ça !'; if(Math.random() < dt*12) fxBurst(sc, CXp + Math.cos(ang)*32, CYp + Math.sin(ang)*32, 3, ['#7aff9a', '#fff'], 30, { life:.5, g:20 }); }
        else if(om >= GO[1]){ msg = 'Ralentis un peu !'; if(Math.random() < dt*20) fxBurst(sc, CXp + Math.cos(ang)*R, CYp + Math.sin(ang)*R, 2, ['#fff0a8'], 70, { life:.5 }); }
        else if(om < -1){ msg = 'Dans le sens de la flèche !'; } else { msg = elapsed < 1.5 ? 'Tourne dans le sens de la flèche !' : 'Plus vite !'; }
        sw += Math.abs(om)*dt; if(sw > .9){ sw = 0; noise(.09, .05 + Math.min(.05, Math.abs(om)*.01), 1800, 600, 'bandpass'); }
        bub += dt; if(bub > .35){ bub = 0; snd(200 + Math.random()*200, .08, 'sine', .04, 150); }
        if(elapsed >= DUR){ q = clamp(good/(DUR*.8), 0, 1); poff = makePoffin(berryIds, q); ph = 'result'; tt = 0; ctKick(sc, .5, .6, '255,240,200'); cheer(.3 + q*.5); fxBurst(sc, CV.cx, 90, 40, null, 120, { life:1.2 }); [523, 659, 784, 1047].forEach((f, i) => snd(f, .25, 'triangle', .09, 0, i*.1)); }
      }
      if(ph === 'result' && tt > 4) end();
    },
    draw(x, dt){
      const t = sc.t;
      const kk = `cgi${CV.W | 0}_${CV.H | 0}`; if(!_cs[kk]){ const c = mkc(Math.ceil(CV.W) + 24, Math.ceil(CV.H) + 24), g = c.getContext('2d'); for(let yy = 0; yy < c.height; yy += 12) for(let xx = 0; xx < c.width; xx += 12){ g.fillStyle = ((xx/12 | 0) + (yy/12 | 0)) % 2 ? '#f6c25e' : '#f0a640'; g.fillRect(xx, yy, 12, 12); g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(xx, yy, 12, 1); g.fillRect(xx, yy, 1, 12); } _cs[kk] = c; }
      x.drawImage(_cs[kk], CV.l - 12, CV.t - 12);
      [[-150, 34, '#ffc02c'], [-150, 92, '#ffd24c'], [104, 34, '#e8502c'], [104, 92, '#f26a3a']].forEach(([dx, dy, col]) => { const a = CV.cx + dx, b = dy; cRect(x, '#14101c', a - 1, b - 1, 48, 52); cRect(x, col, a, b, 46, 50); cRect(x, 'rgba(255,255,255,.28)', a, b, 46, 5); cRect(x, 'rgba(0,0,0,.18)', a, b + 44, 46, 6); cRect(x, 'rgba(0,0,0,.12)', a + 21, b, 4, 50); });
      cRect(x, '#14101c', CXp - 74, 8, 148, 142); cRect(x, '#e8a850', CXp - 72, 10, 144, 138); cRect(x, '#fdeaa8', CXp - 68, 14, 136, 130); cRect(x, 'rgba(255,255,255,.3)', CXp - 68, 14, 136, 4);
      const prog = ph === 'intro' ? 0 : ph === 'stir' ? elapsed/DUR : 1;
      for(let i = 0; i < 28; i++){ const a = i/28*6.2832 - Math.PI/2, bx = CXp + Math.cos(a)*(R + 3), by = CYp + Math.sin(a)*(R + 3), lit = i/28 < prog; cDisc(x, '#c87810', bx, by, 6); cDisc(x, lit ? '#ffe27a' : '#ffa820', bx, by, 5); cDisc(x, ['#ff7a8a', '#7aa8ff', '#7ade8a'][i % 3], bx, by, 2); }
      cDisc(x, '#c87810', CXp, CYp, R + 1); cDisc(x, '#ffa820', CXp, CYp, R - 1); cDisc(x, '#fff0d8', CXp, CYp, R - 8); cDisc(x, '#e8c8a0', CXp, CYp, R - 11);
      const bc = avgCol(); cDisc(x, bc, CXp, CYp, R - 12); cDisc(x, mixHex(bc, '#ffffff', .25), CXp - 4, CYp - 5, R - 24);
      x.save(); x.beginPath(); x.arc(CXp, CYp, R - 13, 0, 6.2832); x.clip(); x.strokeStyle = 'rgba(255,255,255,.4)'; x.lineWidth = 2;
      for(let k = 0; k < 3; k++){ x.beginPath(); for(let a = 0; a < 5; a += .2){ const rr = 8 + k*10 + a*3, aa = ang*.8 + a + k*2.1, px = CXp + Math.cos(aa)*rr, py = CYp + Math.sin(aa)*rr; a ? x.lineTo(px, py) : x.moveTo(px, py); } x.stroke(); }
      for(let k = 0; k < 6; k++){ const a = t*1.3 + k*1.05, rr = 12 + (k % 3)*14 + Math.sin(t*2 + k)*3, pp = (Math.sin(t*3 + k*2) + 1)/2; cDisc(x, `rgba(255,255,255,${.15 + pp*.3})`, CXp + Math.cos(a)*rr, CYp + Math.sin(a)*rr, 1 + pp*2); }
      x.restore();
      if(ph === 'stir' || ph === 'intro'){
        const col = ph === 'intro' ? '#7aff9a' : om > GO[1] ? '#ff6a5a' : om > GO[0] ? '#46d86a' : '#ffd23f', e = ang + .3 + t*(ph === 'intro' ? 3 : 0), s0 = e - 1.5, r2 = 34;
        x.save(); x.lineCap = 'round'; x.strokeStyle = '#14101c'; x.lineWidth = 8; x.beginPath(); x.arc(CXp, CYp, r2, s0, e); x.stroke(); x.strokeStyle = col; x.lineWidth = 5; x.beginPath(); x.arc(CXp, CYp, r2, s0, e); x.stroke(); x.restore();
        const tx = CXp + Math.cos(e)*r2, ty = CYp + Math.sin(e)*r2, tg = [-Math.sin(e), Math.cos(e)], nr = [Math.cos(e), Math.sin(e)];
        cPoly(x, [[tx + tg[0]*12, ty + tg[1]*12], [tx + nr[0]*9, ty + nr[1]*9], [tx - nr[0]*9, ty - nr[1]*9]], '#14101c'); cPoly(x, [[tx + tg[0]*10, ty + tg[1]*10], [tx + nr[0]*7, ty + nr[1]*7], [tx - nr[0]*7, ty - nr[1]*7]], col);
      }
      const hx = CXp + Math.cos(ang)*(R + 12), hy = CYp + Math.sin(ang)*(R + 12), sx2 = CXp + Math.cos(ang)*20, sy2 = CYp + Math.sin(ang)*20;
      x.save(); x.lineCap = 'round'; x.strokeStyle = '#14101c'; x.lineWidth = 7; x.beginPath(); x.moveTo(sx2, sy2); x.lineTo(hx, hy); x.stroke(); x.strokeStyle = '#a8703a'; x.lineWidth = 4; x.beginPath(); x.moveTo(sx2, sy2); x.lineTo(hx, hy); x.stroke(); x.restore();
      x.save(); x.translate(sx2, sy2); x.rotate(ang); x.fillStyle = '#14101c'; x.beginPath(); x.ellipse(0, 0, 11, 8, 0, 0, 6.2832); x.fill(); x.fillStyle = '#c8924c'; x.beginPath(); x.ellipse(0, 0, 9, 6, 0, 0, 6.2832); x.fill(); x.fillStyle = 'rgba(255,255,255,.3)'; x.beginPath(); x.ellipse(-2, -2, 5, 2, 0, 0, 6.2832); x.fill(); x.restore();
      berries.forEach((b, i) => { if(b.in || !b.im.complete || !b.im.width) return; const u = clamp((tt - b.t0)/.5, 0, 1), px2 = CXp - (berries.length - 1)*14 + i*28, py2 = 4 + (CYp - 4)*u*u + (u === 0 ? Math.sin(t*4 + i)*1.5 : 0); x.drawImage(b.im, Math.round(px2 - 12), Math.round(py2 - 12), 24, 24); });
      const gx = CXp - 66, gy = 168; cPanel(x, gx, gy, 132, 6, '#2a2146'); cRect(x, '#46d86a', gx + 132*GO[0]/8, gy, 132*(GO[1] - GO[0])/8, 6); cRect(x, '#fff', gx + 132*clamp(om/8, 0, 1) - 1, gy - 3, 3, 12);
      if(ph === 'stir' || ph === 'intro'){ cPanel(x, CXp - 112, 151, 224, 14, '#fff3d8'); cTxt(x, ph === 'intro' ? 'Les baies tombent dans la marmite…' : msg, CXp, 153, { sz:8, al:'center', col:om > GO[1] ? '#d83020' : '#7a4a10', sh:false }); }
      if(ph === 'result' && poff){
        x.fillStyle = 'rgba(40,20,0,.55)'; x.fillRect(CV.l, CV.t, CV.W, CV.H);
        const pw = 170, px3 = CV.cx - pw/2, py3 = 14, u = clamp(tt*3, 0, 1), s = .6 + .4*(1 - Math.pow(1 - u, 3)); x.save(); x.translate(CV.cx, 90); x.scale(s, s); x.translate(-CV.cx, -90);
        cRect(x, '#14101c', px3 - 2, py3 - 2, pw + 4, 148); cRect(x, '#fff3d8', px3, py3, pw, 144); cRect(x, '#e8502c', px3, py3, pw, 16); cTxt(x, 'RÉSULTAT', CV.cx, py3 + 2, { sz:9, al:'center' });
        const im = poffImgEl(poff); if(im && im.complete) x.drawImage(im, CV.cx - 32, py3 + 24, 64, 64);
        x.save(); x.globalCompositeOperation = 'lighter'; for(let k = 0; k < 6; k++){ const a = t*2 + k*1.05, rr = 38 + Math.sin(t*3 + k)*4; x.fillStyle = 'rgba(255,240,160,.8)'; x.fillRect(Math.round(CV.cx + Math.cos(a)*rr), Math.round(py3 + 56 + Math.sin(a)*rr*.6), 2, 2); } x.restore();
        cTxt(x, poff.name, CV.cx, py3 + 92, { sz:9, al:'center', col:'#7a4a10', sh:false });
        Object.entries(poff.gain).forEach(([k, v], i) => cTxt(x, CSTAT[k].name + ' +' + v, CV.cx, py3 + 105 + i*10, { sz:8, al:'center', col:CSTAT[k].col, sh:false }));
        let stars = ''; for(let k = 0; k < 5; k++) stars += k < Math.round(q*5) ? '★' : '☆'; cTxt(x, stars + ' ' + poff.q + ' %', CV.cx, py3 + 129, { sz:8, al:'center', col:'#e89a10', sh:false });
        x.restore();
      }
    }
  };
  function end(){ if(sc.finished) return true; sc.finished = true; done(q); return true; }
  return conRun(sc);
}
const _pfEl = {};
function poffImgEl(p){ const u = poffinImg(p); if(!_pfEl[u]){ const im = new Image(); im.src = u; _pfEl[u] = im; } return _pfEl[u]; }
