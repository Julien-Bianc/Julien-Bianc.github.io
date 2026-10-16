// ============================================================
//  contest-scenes.js — Concours Pokémon : les épreuves JOUABLES (dessinées en pixel art dans un canvas 320×180).
//    sceneStyle  : présentation + capsule Ball + notes des 3 juges
//    sceneDance  : rythme à 4 boutons (Gauche / Saut / Droite / Devant)
//    scenePerf   : 4 appels avec les attaques + jauge de « moment parfait »
//    sceneShow   : courte démonstration d'un concurrent contrôlé par l'ordinateur
//    sceneCook   : cuisson d'un poffin (remuer en rythme)
//  La logique de score est dans js/contest.js. Entrée / souris / tactile / clavier (flèches, ZQSD, 1-2-3, espace).
// ============================================================
const CW = 320, CH = 180, CT_COL = ['#e8402c', '#3b8fd9', '#3fbf5a', '#f0b928'];   // couleurs des 4 concurrents
const DANCE_COL = ['#3fbf5a', '#e8402c', '#f0c820', '#4a90e8'];                    // Gauche, Saut, Droite, Devant
const DANCE_NAME = ['Gauche', 'Saut', 'Droite', 'Devant'];
const _cs = {};

// ---------- petits outils de dessin (pixels nets) ----------
const cRect = (x, c, a, b, w, h) => { x.fillStyle = c; x.fillRect(Math.round(a), Math.round(b), Math.round(w), Math.round(h)); };
function cDisc(x, c, cx, cy, r){ x.fillStyle = c; for(let dy = -r; dy <= r; dy++){ const w = Math.round(Math.sqrt(r*r - dy*dy)); x.fillRect(Math.round(cx - w), Math.round(cy + dy), w*2 + 1, 1); } }
function cRing(x, c, cx, cy, r, t){ x.strokeStyle = c; x.lineWidth = t || 1; x.beginPath(); x.arc(cx, cy, r, 0, 6.2832); x.stroke(); }
function cTxt(x, s, tx, ty, o){
  o = o || {}; x.font = `bold ${o.sz || 8}px "Courier New",monospace`; x.textAlign = o.al || 'left'; x.textBaseline = 'top';
  if(o.sh !== false){ x.fillStyle = '#14101c'; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([a, b]) => x.fillText(s, tx + a, ty + b)); }
  x.fillStyle = o.col || '#fff'; x.fillText(s, tx, ty);
}
function cPanel(x, a, b, w, h, col){ cRect(x, '#14101c', a - 1, b - 1, w + 2, h + 2); cRect(x, col || '#fff', a, b, w, h); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const snd = (f, d, t, v, s, dl) => { if(typeof AU !== 'undefined' && AU.ctx) tone(f, d, t || 'square', v || .08, s || 0, dl || 0); };

// ---------- décor de la scène (mis en cache) ----------
function stageBg(footY){
  const k = 'bg' + footY; if(_cs[k]) return _cs[k];
  const c = mkc(CW, CH), x = c.getContext('2d'), fy = footY - 20;
  const g = x.createLinearGradient(0, 0, 0, fy); g.addColorStop(0, '#2b1d5e'); g.addColorStop(1, '#7a42a8'); x.fillStyle = g; x.fillRect(0, 0, CW, CH);
  for(let i = 0; i < CW; i += 16){ cRect(x, i % 32 ? 'rgba(255,255,255,.05)' : 'rgba(0,0,0,.1)', i, 0, 16, fy); }
  const g2 = x.createLinearGradient(0, fy, 0, CH); g2.addColorStop(0, '#f8e6a4'); g2.addColorStop(1, '#d6ae52'); x.fillStyle = g2; x.fillRect(0, fy, CW, CH - fy);
  for(let yy = fy + 7; yy < CH; yy += 8) cRect(x, 'rgba(120,70,20,.2)', 0, yy, CW, 1);
  cRect(x, '#14101c', 0, fy, CW, 1); cRect(x, '#3b4fb8', 0, fy - 4, CW, 4); cRect(x, '#6b82f0', 0, fy - 4, CW, 1);   // rebord de scène bleu
  cRect(x, '#e8628a', 0, 0, CW, 12); cRect(x, '#ff9ec0', 0, 0, CW, 2);                                                  // lambrequin rose
  for(let i = 0; i < CW; i += 20){ cDisc(x, '#e8628a', i + 10, 12, 10); cDisc(x, '#ff8fb0', i + 10, 11, 6); }
  for(let i = 0; i < CW; i += 20) cRect(x, '#fff3b0', i + 9, 20, 2, 2);                                                 // petites ampoules
  [0, CW - 24].forEach(sx => { cRect(x, '#c43a6a', sx, 0, 24, fy - 4); for(let i = 0; i < 24; i += 6) cRect(x, i % 12 ? '#e8628a' : '#a02a52', sx + i, 8, 3, fy - 12); cRect(x, '#14101c', sx ? sx : 23, 0, 1, fy - 4); });
  if(footY >= 110){ cRect(x, '#1a1030', 0, CH - 14, CW, 14); for(let i = 0; i < CW; i += 11) cDisc(x, '#0e0a1c', i + 5 + (i * 7 % 5), CH - 8 + (i * 3 % 4), 5); }
  return _cs[k] = c;
}
function drawStage(x, t, footY, glow){
  x.drawImage(stageBg(footY), 0, 0);
  const a = .1 + .05*Math.sin(t*2) + (glow || 0)*.15;                                 // projecteurs
  [[70, 0], [160, 0], [250, 0]].forEach(([sx], i) => { x.fillStyle = `rgba(255,240,170,${a})`; x.beginPath(); x.moveTo(sx - 4, 12); x.lineTo(sx + 4, 12); x.lineTo(sx + 34*Math.sin(t + i) + (i - 1)*20 + 20, footY); x.lineTo(sx - 34 + (i - 1)*20, footY); x.fill(); });
  if(footY < 110) return;                                                              // public qui sautille
  for(let i = 0; i < CW; i += 11) cDisc(x, '#0e0a1c', i + 5 + (i * 7 % 5), CH - 8 + (i * 3 % 4) - Math.max(0, Math.sin(t*5 + i))*(glow ? 3 : 1), 5);
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
  x.fillStyle = 'rgba(40,20,60,.35)'; x.beginPath(); x.ellipse(Math.round(px), Math.round(py) + 1, 13*sc*(o.sh || 1), 3.5*sc*(o.sh || 1), 0, 0, 6.2832); x.fill();   // ombre
  x.save(); x.translate(Math.round(px), Math.round(py - (o.lift || 0))); if(o.sx) x.scale(o.sx, 1); if(o.alpha != null) x.globalAlpha = o.alpha;
  x.drawImage(f.cv, Math.round(-f.cx*sc), Math.round(-f.bot*sc), w, h); x.restore();
}
const ANIM = { idle:['Idle'], hop:['Hop', 'Walk', 'Idle'], walk:['Walk', 'Hop', 'Idle'], atk:['Attack', 'Strike', 'Swing', 'Shoot', 'Charge', 'Hop', 'Idle'], hurt:['Hurt', 'Pain', 'Idle'] };

// ---------- particules de la capsule Ball (couleur et ampleur selon la rareté) ----------
function capBurst(P, cap, cx, cy){
  const n = { C:26, PC:50, R:90, UR:160 }[cap.r] || 20;
  for(let i = 0; i < n; i++){ const a = Math.random()*6.283, v = 20 + Math.random()*(cap.r === 'UR' ? 120 : 80); P.push({ x:cx, y:cy - 14, vx:Math.cos(a)*v, vy:Math.sin(a)*v - 25, life:.9 + Math.random()*.8, t:0, col:Math.random() < .3 ? '#fff' : cap.col, sh:Math.random() < .4 ? 1 : 0 }); }
}
function updDrawP(x, P, dt){
  for(let i = P.length - 1; i >= 0; i--){
    const p = P[i]; p.t += dt; if(p.t > p.life){ P.splice(i, 1); continue; }
    p.vy += 60*dt; p.x += p.vx*dt; p.y += p.vy*dt; x.globalAlpha = Math.min(1, (p.life - p.t)*3);
    if(p.sh){ cRect(x, p.col, p.x - 1, p.y, 3, 1); cRect(x, p.col, p.x, p.y - 1, 1, 3); } else cRect(x, p.col, p.x, p.y, 2, 2);
  }
  x.globalAlpha = 1;
}

// ---------- tableau des concurrents (en haut à droite, comme dans les jeux) ----------
function drawBoard(x, C, cur){
  const order = C.cts.map((c, i) => i).sort((a, b) => C.cts[b].total - C.cts[a].total);
  order.forEach((i, rk) => {
    const c = C.cts[i], y = 16 + rk*14, on = i === cur;
    cRect(x, '#14101c', 226, y - 1, 92, 14); cRect(x, CT_COL[i], 227, y, 90, 12); cRect(x, 'rgba(255,255,255,.28)', 227, y, 90, 4);
    cTxt(x, String(rk + 1), 230, y + 2, { sz:7 });
    cTxt(x, (c.human >= 0 ? 'J' + (c.human + 1) + ' ' : '') + c.name.slice(0, 8), 240, y + 2, { sz:7 });
    cTxt(x, String(Math.round(c.total)), 314, y + 2, { sz:7, al:'right' });
    if(on) cTxt(x, '▶', 218, y + 2, { sz:7, col:'#ffd23f' });
  });
}
function banner(x, title, C){
  cPanel(x, 6, 16, 150, 14, '#ff8fc0'); cDisc(x, CSTAT[C.cat].col, 14, 23, 4);
  cTxt(x, title, 22, 19, { sz:7, col:'#fff' });
  cTxt(x, CONTEST_RANKS[C.rank].name + ' · ' + CSTAT[C.cat].name, 6, 32, { sz:7, col:'#ffe27a' });
}

// ---------- moteur de scène : crée le canvas, relaie souris / tactile / clavier, boucle d'animation ----------
function conRun(sc){
  menu(`<div class='cwrap'><canvas id='ccv' width='${CW}' height='${CH}'></canvas></div>`);
  const cv = document.getElementById('ccv'), x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  let last = performance.now(); sc.t = 0;
  cv.onpointerdown = e => { e.preventDefault(); if(sc.down) sc.down(e.offsetX/cv.clientWidth*CW, e.offsetY/cv.clientHeight*CH); };
  const kd = e => { if(!cv.isConnected){ removeEventListener('keydown', kd); return; } if(e.repeat) return; if(sc.key && sc.key(e.key.toLowerCase())) e.preventDefault(); };
  addEventListener('keydown', kd);
  const frame = now => {
    if(!cv.isConnected){ removeEventListener('keydown', kd); return; }
    const dt = Math.min(.05, (now - last)/1000); last = now; sc.t += dt;
    if(sc.update) sc.update(dt); sc.draw(x, dt);
    if(sc.finished){ removeEventListener('keydown', kd); return; }
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  return sc;
}
const hit = (px, py, bx, by, r) => (px - bx)*(px - bx) + (py - by)*(py - by) <= r*r;

// ============================================================
//  ÉPREUVE 1 — STYLE
//   res = { score, judges:[1..5 ×3] } calculé par js/contest.js (styleCalc)
// ============================================================
function sceneStyle(C, ct, idx, res, done){
  const P = []; let ph = 'ready', tt = 0, shown = 0, flash = 0;
  const sc = {
    key(k){ if(ph === 'ready' && (k === ' ' || k === 'enter')){ go(); return true; } },
    down(){ if(ph === 'ready') go(); },
    update(dt){
      tt += dt;
      if(ph === 'enter'){
        if(tt > .5 && !sc.fx){ sc.fx = 1; flash = 1; if(ct.cap) capBurst(P, ct.cap, 110, 118); snd(880, .3, 'triangle', .1); snd(1320, .4, 'triangle', .08, 0, .08); }
        const need = Math.floor((tt - 1.5)/.55) + 1; if(need > shown && shown < 3){ shown++; snd(520 + shown*130, .2, 'square', .09); }
        if(tt > 4.2){ ph = 'end'; sc.finished = true; done(res); }
      }
      flash = Math.max(0, flash - dt*2);
    },
    draw(x, dt){
      drawStage(x, sc.t, 118, ph === 'enter' ? 1 : 0);
      const hop = ph === 'enter' && tt > .5 && tt < 1.4 ? Math.abs(Math.sin((tt - .5)*3.5))*10 : 0;
      conMon(x, ct.pid, ph === 'enter' && tt > .5 ? ANIM.hop : ANIM.idle, sc.t, 0, 110, 118, 2, { lift:hop });
      updDrawP(x, P, dt);
      if(flash > 0){ x.fillStyle = `rgba(255,255,255,${flash*.6})`; x.fillRect(0, 0, CW, CH); }
      banner(x, 'ÉPREUVE DE STYLE', C); drawBoard(x, C, idx);
      if(ct.cap){ cPanel(x, 6, 128, 96, 30, '#2a2146'); const im = _capImg(ct.cap); if(im) x.drawImage(im, 10, 132, 22, 22); cTxt(x, ct.cap.name.replace('Capsule ', '').slice(0, 11), 36, 134, { sz:7, col:ct.cap.col }); cTxt(x, '+' + (CAP_STYLE[ct.cap.r] || 0) + ' style', 36, 145, { sz:7, col:'#ffe27a' }); }
      else { cPanel(x, 6, 128, 96, 18, '#2a2146'); cTxt(x, 'Aucune capsule', 12, 133, { sz:7, col:'#aab' }); }
      if(ph === 'ready'){ if(Math.sin(sc.t*6) > -.3) cTxt(x, 'Touche pour présenter !', 160, 158, { sz:9, al:'center', col:'#fff3a0' }); }
      if(ph === 'enter'){
        for(let j = 0; j < 3; j++){ if(j >= shown) continue; const bx = 226, by = 80 + j*20; cPanel(x, bx, by, 92, 17, '#fff'); cTxt(x, 'Juge ' + (j + 1), bx + 4, by + 5, { sz:7, col:'#14101c', sh:false }); for(let s = 0; s < 5; s++) cTxt(x, '★', bx + 38 + s*10, by + 3, { sz:9, col:s < res.judges[j] ? '#f0b928' : '#cfcfd8', sh:false }); }
        if(shown >= 3){ cTxt(x, 'STYLE', 160, 28 + 8, { sz:8, al:'center', col:'#ffe27a' }); cTxt(x, String(res.score), 160, 46, { sz:20, al:'center', col:'#fff' }); }
      }
    }
  };
  function go(){ ph = 'enter'; tt = 0; snd(440, .15, 'square', .08); }
  return conRun(sc);
}
const _capc = {};
function _capImg(cap){ if(_capc[cap.id]) return _capc[cap.id].complete ? _capc[cap.id] : null; try{ const im = new Image(); im.src = capIcon(cap); _capc[cap.id] = im; }catch(e){ _capc[cap.id] = { complete:false }; } return null; }

// ============================================================
//  ÉPREUVE 2 — RYTHME (danse)
//   done(res) avec res = { N, perfect, good, bad, miss, maxCombo, acc }
// ============================================================
const BTN = [{ x:118, y:142 }, { x:160, y:120 }, { x:202, y:142 }, { x:160, y:164 }];   // Gauche, Saut, Droite, Devant
function buildChart(rank){
  const R = CONTEST_RANKS[rank], beat = 60/R.bpm, notes = []; let t = 2.6, last = -1, rep = 0;
  for(let i = 0; i < R.notes; i++){
    let l = Math.floor(Math.random()*4); if(l === last && ++rep >= 2){ l = (l + 1 + Math.floor(Math.random()*3)) % 4; rep = 0; } if(l !== last) rep = 0; last = l;
    notes.push({ t, lane:l, st:0 });
    t += rank >= 1 && Math.random() < .25 + rank*.08 ? beat/2 : beat;
  }
  return { notes, beat, end:t + 1 };
}
function sceneDance(C, ct, idx, done){
  const ch = buildChart(C.rank), N = ch.notes.length, TR = 1.5, HX = 64, SX = 330, st = { perfect:0, good:0, bad:0, miss:0 };
  let combo = 0, maxCombo = 0, lastJ = '', jT = -9, dirLane = -1, dirT = -9, ring = [], lastBeat = -1, started = false;
  const sc = {
    key(k){ const l = { arrowleft:0, q:0, a:0, arrowup:1, z:1, w:1, ' ':1, arrowright:2, d:2, arrowdown:3, s:3 }[k]; if(l != null){ press(l); return true; } },
    down(a, b){ BTN.forEach((p, i) => { if(hit(a, b, p.x, p.y, 17)) press(i); }); },
    update(){
      const t = sc.t;
      if(Math.floor(t/ch.beat) !== lastBeat){ lastBeat = Math.floor(t/ch.beat); if(t > .8) snd(lastBeat % 4 === 0 ? 110 : 82, .09, 'triangle', .1); }
      ch.notes.forEach(n => { if(!n.st && t > n.t + .22){ n.st = -1; st.miss++; combo = 0; lastJ = 'Raté'; jT = t; } });
      if(t > ch.end){ sc.finished = true; const sum = st.perfect + st.good*.7 + st.bad*.35; done({ N, ...st, maxCombo, acc:sum/N }); }
    },
    draw(x){
      const t = sc.t; drawStage(x, t, 90, 0);
      // danseur : la direction suit la dernière touche
      const since = t - dirT, act = since < .35, l = dirLane;
      const row = act ? [6, 0, 2, 0][l] : 0, ox = act ? [-14, 0, 14, 0][l]*Math.sin(since/.35*3.14) : 0, lift = act && l === 1 ? Math.sin(since/.35*3.14)*10 : 0, sc2 = act && l === 3 ? 2.3 : 2;
      conMon(x, ct.pid, act ? ANIM.hop : ANIM.idle, t, row, 130 + ox, 90, sc2, { lift });
      if(t - jT < .8 && lastJ){ const c = lastJ === 'Parfait !' ? '#ffe27a' : lastJ === 'Bien' ? '#9fe8ff' : '#ff8a8a'; cTxt(x, lastJ, 130, 24 - (t - jT)*8, { sz:9, al:'center', col:c }); }
      if(combo >= 2) cTxt(x, combo + ' combo', 6, 38, { sz:8, col:'#ffe27a' });
      banner(x, 'ÉPREUVE DE RYTHME', C); drawBoard(x, C, idx);
      // panneau du bas
      x.fillStyle = '#ff9ad8'; x.fillRect(0, 94, CW, 86); for(let yy = 94; yy < 180; yy += 8) for(let xx = (yy/8 % 2)*8; xx < CW; xx += 16) cRect(x, '#ff7cc4', xx, yy, 8, 8);
      cRect(x, '#14101c', 0, 94, CW, 1);
      // piste
      cRect(x, '#14101c', 0, 97, CW, 22); cRect(x, '#1b3b7a', 0, 98, CW, 20); cRect(x, '#2f63c0', 0, 98, CW, 2); cRect(x, '#fff', 0, 108, CW, 1); cRect(x, 'rgba(255,255,255,.25)', 0, 117, CW, 1);
      cDisc(x, 'rgba(255,255,255,.18)', HX, 108, 11); cRing(x, '#fff', HX, 108, 10, 1.5);
      ch.notes.forEach(n => {
        if(n.st) return; const nx = HX + (n.t - t)*(SX - HX)/TR; if(nx > CW + 8) return;
        cDisc(x, '#14101c', nx, 108, 8); cDisc(x, DANCE_COL[n.lane], nx, 108, 7); cRect(x, 'rgba(255,255,255,.35)', nx - 4, 103, 8, 2); arrow(x, n.lane, nx, 108, 3, '#fff');
      });
      ring = ring.filter(r => t - r.t < .4); ring.forEach(r => cRing(x, r.c, HX, 108, 10 + (t - r.t)*50, 2));
      BTN.forEach((p, i) => {
        const pr = t - btnT[i] < .12; cDisc(x, '#14101c', p.x, p.y + 2, 16); cDisc(x, '#16315e', p.x, p.y + 2, 15);
        cDisc(x, '#14101c', p.x, p.y + (pr ? 2 : 0), 16); cDisc(x, DANCE_COL[i], p.x, p.y + (pr ? 2 : 0), 14); cRect(x, 'rgba(255,255,255,.3)', p.x - 8, p.y - 9 + (pr ? 2 : 0), 16, 3);
        arrow(x, i, p.x, p.y + (pr ? 2 : 0) - 3, 5, '#fff'); cTxt(x, DANCE_NAME[i], p.x, p.y + 4 + (pr ? 2 : 0), { sz:6, al:'center' });
      });
      if(t < 2) cTxt(x, 'Appuie en rythme !', 160, 102 - 1, { sz:7, al:'center', col:'#ffe27a' });
    }
  };
  const btnT = [-9, -9, -9, -9];
  function arrow(x, l, cx, cy, s, col){ x.fillStyle = col; x.beginPath(); if(l === 0){ x.moveTo(cx - s, cy); x.lineTo(cx + s*.6, cy - s); x.lineTo(cx + s*.6, cy + s); } else if(l === 2){ x.moveTo(cx + s, cy); x.lineTo(cx - s*.6, cy - s); x.lineTo(cx - s*.6, cy + s); } else if(l === 1){ x.moveTo(cx, cy - s); x.lineTo(cx - s, cy + s*.6); x.lineTo(cx + s, cy + s*.6); } else { x.moveTo(cx, cy + s); x.lineTo(cx - s, cy - s*.6); x.lineTo(cx + s, cy - s*.6); } x.fill(); }
  function press(l){
    const t = sc.t; btnT[l] = t; dirLane = l; dirT = t;
    let best = null; ch.notes.forEach(n => { if(!n.st && n.lane === l && Math.abs(n.t - t) <= .22 && (!best || Math.abs(n.t - t) < Math.abs(best.t - t))) best = n; });
    if(!best){ snd(150, .08, 'sawtooth', .05); return; }
    const d = Math.abs(best.t - t);
    if(d < .075){ best.st = 1; st.perfect++; combo++; lastJ = 'Parfait !'; ring.push({ t, c:'#ffe27a' }); snd([330, 440, 523, 659][l], .16, 'square', .1); snd([330, 440, 523, 659][l]*2, .2, 'triangle', .06); }
    else if(d < .14){ best.st = 2; st.good++; combo++; lastJ = 'Bien'; ring.push({ t, c:'#9fe8ff' }); snd([330, 440, 523, 659][l], .14, 'square', .08); }
    else { best.st = 3; st.bad++; combo = 0; lastJ = 'Raté'; snd(180, .12, 'sawtooth', .06); }
    maxCombo = Math.max(maxCombo, combo); jT = t;
  }
  return conRun(sc);
}

// ============================================================
//  ÉPREUVE 3 — PRESTATIONS (4 appels). calc(move, prevCat, quality, volt) → { pts, cat } (js/contest.js)
//   done({ pts:[...], sum })
// ============================================================
function scenePerf(C, ct, idx, calc, done){
  const mv = POKEMON[ct.pid].moves, TURNS = 4, log = []; let turn = 0, ph = 'pick', pm = null, mk = 0, mdir = 1, qual = 0, tt = 0, prevCat = null, volt = 0, sum = 0, pop = null, cur = 0;
  const sc = {
    key(k){ const n = { 1:0, 2:1, 3:2, '&':0, 'é':1, '"':2 }[k]; if(ph === 'pick' && n != null && mv[n]){ pick(n); return true; } if(ph === 'time' && (k === ' ' || k === 'enter')){ stop(); return true; } },
    down(a, b){ if(ph === 'pick'){ mv.forEach((m, i) => { const bx = 6 + i*104; if(a >= bx && a <= bx + 100 && b >= 128 && b <= 172) pick(i); }); } else if(ph === 'time') stop(); },
    update(dt){
      tt += dt;
      if(ph === 'time'){ mk += mdir*dt*1.5; if(mk > 1){ mk = 1; mdir = -1; } if(mk < 0){ mk = 0; mdir = 1; } }
      if(ph === 'play' && tt > 1.5){ turn++; if(turn >= TURNS){ ph = 'end'; tt = 0; } else { ph = 'pick'; pm = null; } }
      if(ph === 'end' && tt > 1.6){ sc.finished = true; done({ pts:log, sum }); }
    },
    draw(x, dt){
      drawStage(x, sc.t, 112, volt >= 3 ? 1 : 0);
      const atk = ph === 'play' && tt < 1;
      conMon(x, ct.pid, atk ? ANIM.atk : ANIM.idle, sc.t, 0, 110, 112, 2, { lift:atk ? Math.sin(tt*3.14)*6 : 0 });
      banner(x, 'ÉPREUVE DE PRESTATIONS', C); drawBoard(x, C, idx);
      cTxt(x, 'Appel ' + Math.min(turn + 1, TURNS) + '/' + TURNS, 6, 44, { sz:7, col:'#ffe27a' });
      // jauge d'enthousiasme (voltage)
      cTxt(x, 'Ambiance', 6, 54, { sz:7 }); for(let i = 0; i < 3; i++){ cPanel(x, 50 + i*12, 54, 10, 7, i < volt ? '#ffd23f' : '#3a3258'); } if(volt >= 3 && Math.sin(sc.t*10) > 0) cTxt(x, 'SUPER MOMENT !', 6, 64, { sz:7, col:'#ffd23f' });
      cTxt(x, 'Total ' + (Math.round(sum*10)/10), 226, 78, { sz:8, col:'#fff' });
      if(ph === 'pick'){
        mv.forEach((m, i) => {
          const bx = 6 + i*104, cat = catOf(m.type), cc = CSTAT[cat].col, base = 5 + Math.min(m.power || 0, 30)/3;
          cPanel(x, bx, 128, 100, 44, cc); cRect(x, 'rgba(255,255,255,.28)', bx, 128, 100, 8); cRect(x, 'rgba(0,0,0,.25)', bx, 160, 100, 12);
          cTxt(x, String(i + 1) + ' ' + m.name.slice(0, 13), bx + 4, 131, { sz:7 });
          cTxt(x, CSTAT[cat].name, bx + 4, 144, { sz:7, col:'#14101c', sh:false }); if(cat === C.cat) cTxt(x, '★ idéal', bx + 62, 144, { sz:7, col:'#fff7b0' });
          let h = ''; for(let k = 0; k < Math.round(base/3); k++) h += '♥'; cTxt(x, h, bx + 4, 161, { sz:7, col:'#ffd0e0' });
        });
        cTxt(x, 'Choisis ton attaque', 160, 116, { sz:8, al:'center', col:'#fff3a0' });
      }
      if(ph === 'time'){
        cPanel(x, 60, 138, 200, 14, '#2a2146'); cRect(x, '#3fbf5a', 130, 139, 60, 12); cRect(x, '#ffd23f', 150, 139, 20, 12); cRect(x, '#14101c', 60 + 200*mk - 1, 134, 3, 22);
        cTxt(x, 'Touche au bon moment !', 160, 122, { sz:8, al:'center', col:'#fff3a0' }); cTxt(x, pm.name, 160, 158, { sz:8, al:'center' });
      }
      if(pop && (ph === 'play' || ph === 'end')){ const a = Math.min(1, tt*3); cTxt(x, '+' + pop.pts, 110, 56 - tt*10, { sz:14, al:'center', col:pop.q === 2 ? '#ffe27a' : '#fff' }); cTxt(x, pop.txt, 110, 74 - tt*10, { sz:7, al:'center', col:'#ffd0e0' }); }
      if(ph === 'end'){ cTxt(x, 'PRESTATIONS', 160, 100, { sz:8, al:'center', col:'#ffe27a' }); cTxt(x, String(Math.min(100, Math.round(sum*1.15))), 160, 112, { sz:20, al:'center' }); }
    }
  };
  function pick(i){ pm = mv[i]; ph = 'time'; mk = 0; mdir = 1; tt = 0; snd(520, .08, 'square', .08); }
  function stop(){
    qual = Math.abs(mk - .5) < .06 ? 2 : Math.abs(mk - .5) < .18 ? 1 : 0;
    const r = calc(pm, prevCat, qual, volt); sum += r.pts; log.push(r.pts); prevCat = r.cat; volt = r.volt;
    pop = { pts:r.pts, q:qual, txt:[qual === 2 ? 'Parfait !' : qual === 1 ? 'Bien' : 'Raté', r.match ? 'Catégorie idéale' : '', r.combo > 1 ? 'Enchaînement' : r.combo < 1 ? 'Répétition' : '', r.sup ? 'Super moment !' : ''].filter(Boolean).join(' · ') };
    ph = 'play'; tt = 0; snd(qual === 2 ? 880 : 520, .25, 'triangle', .1); if(qual === 2) snd(1320, .3, 'triangle', .08, 0, .1);
  }
  return conRun(sc);
}

// ============================================================
//  DÉMONSTRATION d'un concurrent contrôlé par l'ordinateur (kind = style | dance | perf)
// ============================================================
function sceneShow(C, ct, idx, kind, score, done){
  const P = []; let fx = 0;
  const sc = {
    update(dt){ if(sc.t > .4 && !fx){ fx = 1; if(kind === 'style' && ct.cap) capBurst(P, ct.cap, 110, 118); snd(660, .2, 'triangle', .06); } if(sc.t > 2.4){ sc.finished = true; done(); } },
    draw(x, dt){
      const t = sc.t; drawStage(x, t, 118, 0);
      const list = kind === 'perf' ? (Math.floor(t*1.5) % 2 ? ANIM.atk : ANIM.idle) : kind === 'dance' ? ANIM.hop : ANIM.idle;
      const row = kind === 'dance' ? [0, 2, 0, 6][Math.floor(t*3) % 4] : 0;
      conMon(x, ct.pid, list, t, row, 110 + (kind === 'dance' ? Math.sin(t*6)*10 : 0), 118, 2, { lift:kind !== 'style' ? Math.abs(Math.sin(t*4))*5 : 0 });
      updDrawP(x, P, dt); banner(x, kind === 'style' ? 'ÉPREUVE DE STYLE' : kind === 'dance' ? 'ÉPREUVE DE RYTHME' : 'ÉPREUVE DE PRESTATIONS', C);
      drawBoard(x, C, idx); cTxt(x, ct.name, 110, 128, { sz:8, al:'center' });
      if(t > 1.4){ cTxt(x, '+' + Math.round(score), 110, 46 - (t - 1.4)*6, { sz:14, al:'center', col:'#ffe27a' }); }
    }
  };
  return conRun(sc);
}

// ============================================================
//  CUISSON D'UN POFFIN : remue en rythme (touche quand l'aiguille passe dans la zone claire)
//   done(q) avec q de 0 à 1
// ============================================================
function sceneCook(berryIds, done){
  const STEPS = 6; let step = 0, ang = 0, spd = 3, zone = rndA(), zw = .7, qs = [], msg = '', mT = -9, bub = [], ph = 'go', tt = 0;
  function rndA(){ return Math.random()*6.283; }
  const cols = berryIds.map(id => BERRY[id].col);
  const sc = {
    key(k){ if(k === ' ' || k === 'enter'){ tap(); return true; } }, down(){ tap(); },
    update(dt){
      tt += dt; if(ph === 'go'){ ang += spd*dt; } if(Math.random() < dt*10) bub.push({ x:130 + Math.random()*60, y:112, t:0, c:cols[Math.floor(Math.random()*cols.length)] });
      bub.forEach(b => { b.t += dt; b.y -= 22*dt; }); bub = bub.filter(b => b.t < 1.4);
      if(ph === 'end' && tt > 1.6){ sc.finished = true; done(qs.reduce((a, b) => a + b, 0)/STEPS); }
    },
    draw(x){
      cRect(x, '#2a1d3a', 0, 0, CW, CH); cRect(x, '#3a2850', 0, 120, CW, 60);
      for(let i = 0; i < 6; i++){ const fl = (sc.t*8 + i*3) % 10; cRect(x, i % 2 ? '#ff8a3c' : '#ffd23f', 118 + i*14, 142 - fl*.4, 8, 8 + fl*.6); }
      cRect(x, '#14101c', 104, 98, 112, 44); cRect(x, '#5b5f78', 106, 100, 108, 40); cRect(x, '#8a8fa8', 106, 100, 108, 6);
      cRect(x, '#14101c', 112, 94, 96, 14); cRect(x, cols.length ? mixHex(cols[0], '#000000', .15) : '#7a4a2a', 114, 96, 92, 10);
      bub.forEach(b => cDisc(x, b.c, b.x, b.y, 2 + b.t*2));
      cTxt(x, 'Cuisine du Poffin', 160, 8, { sz:10, al:'center', col:'#ffe27a' });
      // cercle de remuage
      const cx = 160, cy = 56, r = 30;
      cDisc(x, '#14101c', cx, cy, r + 4); cDisc(x, '#3b3560', cx, cy, r + 2);
      x.strokeStyle = '#ffe27a'; x.lineWidth = 7; x.beginPath(); x.arc(cx, cy, r - 3, zone - zw/2, zone + zw/2); x.stroke();
      x.strokeStyle = '#fff6b8'; x.lineWidth = 3; x.beginPath(); x.arc(cx, cy, r - 3, zone - zw/6, zone + zw/6); x.stroke();
      const ax = cx + Math.cos(ang)*(r - 2), ay = cy + Math.sin(ang)*(r - 2); x.strokeStyle = '#14101c'; x.lineWidth = 5; x.beginPath(); x.moveTo(cx, cy); x.lineTo(ax, ay); x.stroke();
      x.strokeStyle = '#fff'; x.lineWidth = 2; x.beginPath(); x.moveTo(cx, cy); x.lineTo(ax, ay); x.stroke(); cDisc(x, '#ff7a3c', ax, ay, 3);
      for(let i = 0; i < STEPS; i++) cDisc(x, i < qs.length ? (qs[i] > .7 ? '#ffe27a' : qs[i] > .3 ? '#9fe8ff' : '#ff6a6a') : '#3a3258', 100 + i*24, 100 - 20, 4);
      if(sc.t - mT < .7 && msg) cTxt(x, msg, 160, 92 - (sc.t - mT)*10, { sz:9, al:'center', col:'#ffe27a' });
      cTxt(x, ph === 'go' ? 'Touche quand l\'aiguille est dans la zone claire' : 'Poffin prêt !', 160, 163, { sz:7, al:'center', col:'#fff3a0' });
    }
  };
  function tap(){
    if(ph !== 'go') return;
    const d = Math.abs(((ang - zone) % 6.283 + 9.425) % 6.283 - 3.1416), q = d < zw/6 ? 1 : d < zw/2 ? .6 : .1;
    qs.push(q); msg = q > .9 ? 'Parfait !' : q > .5 ? 'Bien' : 'Raté'; mT = sc.t; snd(q > .5 ? 600 + step*70 : 150, .15, q > .5 ? 'triangle' : 'sawtooth', .09);
    step++; spd = 3 + step*.55; zone = rndA(); zw = Math.max(.42, .7 - step*.04);
    if(step >= STEPS){ ph = 'end'; tt = 0; snd(880, .4, 'triangle', .1); }
  }
  return conRun(sc);
}
