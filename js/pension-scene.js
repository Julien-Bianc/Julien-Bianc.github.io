// ============================================================
//  pension-scene.js — LE CAMP DE LA PENSION (plein écran, comme les épreuves du concours : conRun / CV / fx de contest-scenes.js)
//    • Phase œuf : l'œuf chauffe dans son nid, tremble de plus en plus, éclot (animation) → un Pokémon au hasard
//    • Phase élevage (Tamagotchi / Nintendogs) : Manger · Plume (jeu) · Câlin · Laver · Dormir · Mini-jeu
//      Jauges Faim / Bonheur / Énergie / Propreté qui baissent en temps réel (js/pension.js)
//    • Évolution : animation complète ; la dernière forme est débloquée pour les combats
//    • Mini-jeu « Attrape-baies » : fais courir ton Pokémon pour attraper les baies (gagne bonheur + argent)
//  Contrôles : souris / doigt ; la plume suit le pointeur, caresse et savon = frotter sur le Pokémon, baie = la glisser sur lui.
// ============================================================
const PANIM = {
  idle:['Idle'], walk:['Walk', 'Hop', 'Idle'], hop:['Hop', 'Walk', 'Idle'], sleep:['Sleep', 'EventSleep', 'Idle'],
  eat:['Eat', 'Strike', 'Hop', 'Idle'], sad:['Hurt', 'Pain', 'Idle'], happy:['Hop', 'Appeal', 'Idle']
};
const HZ = 86;                                   // ligne d'horizon du camp
const PEN_TOOLS = [{ id:'feed', n:'Manger' }, { id:'play', n:'Plume' }, { id:'pet', n:'Câlin' }, { id:'clean', n:'Laver' }, { id:'sleep', n:'Dodo' }, { id:'game', n:'Jeu' }];
const penShort = h => h < 1 ? Math.floor(h*60) + ' min' : h < 24 ? (Math.round(h*10)/10) + ' h' : Math.floor(h/24) + ' j' + (Math.floor(h % 24) ? ' ' + Math.floor(h % 24) + ' h' : '');
const _penImg = {};
function penImgEl(src){ if(!_penImg[src]){ const im = new Image(); im.src = src; _penImg[src] = im; } return _penImg[src]; }
const PEN_HEART = ['.##.##.', '#######', '#######', '.#####.', '..###..', '...#...'];
function penHeart(x, px, py, col, s){ x.fillStyle = col; s = s || 1; PEN_HEART.forEach((r, j) => { for(let i = 0; i < 7; i++) if(r[i] === '#') x.fillRect(Math.round(px + i*s), Math.round(py + j*s), s, s); }); }

// ---------- Pokémon : sprite PMD, ou un « ? » si le sprite manque ----------
function penMonDraw(x, id, list, t, row, px, py, k, o){
  if(penHas(id)){ conMon(x, id, list, t, row, px, py, k, o); return; }
  o = o || {}; if(!o.noShadow){ x.fillStyle = 'rgba(40,20,60,.35)'; x.beginPath(); x.ellipse(px, py + 1, 12*k, 3.5*k, 0, 0, 6.2832); x.fill(); }
  const y = py - (o.lift || 0) - 14*k; cDisc(x, '#14101c', px, y, 11*k); cDisc(x, '#5a5278', px, y, 10*k); cTxt(x, '?', px, y - 6*k, { sz:10*k, al:'center', sh:false });
}
const _penWh = new WeakMap();
function penWhite(cv){ let w = _penWh.get(cv); if(!w){ w = mkc(cv.width, cv.height); const g = w.getContext('2d'); g.drawImage(cv, 0, 0); g.globalCompositeOperation = 'source-in'; g.fillStyle = '#fff'; g.fillRect(0, 0, w.width, w.height); _penWh.set(cv, w); } return w; }
function penMonWhite(x, id, list, t, row, px, py, k, a){
  if(!penHas(id) || a <= 0) return; const f = conFrame(id, list, t, row); x.save(); x.globalAlpha = Math.min(1, a); x.drawImage(penWhite(f.cv), Math.round(px - f.cx*k), Math.round(py - f.bot*k), f.cv.width*k, f.cv.height*k); x.restore();
}
const penRow = (dx, dy) => ((Math.round(Math.atan2(dx, dy)/(Math.PI/4)) % 8) + 8) % 8;     // direction PMD : 0 bas, 2 droite, 4 haut, 6 gauche

// ---------- décor : le ciel suit l'heure réelle ----------
const SKY = [[0, '#0a0f36', '#1c2a66'], [5, '#2a2a6a', '#ff9a7a'], [7, '#6ab4f0', '#ffe0b0'], [12, '#4aa4ec', '#bfe4ff'], [17, '#5aa0e0', '#ffe0a0'], [19, '#ff8a5a', '#ffcf8a'], [21, '#1c1850', '#4a3a7a'], [24, '#0a0f36', '#1c2a66']];
function penSky(){
  const d = new Date(), h = typeof PEN.hour === 'number' ? PEN.hour : d.getHours() + d.getMinutes()/60; let a = SKY[0], b = SKY[1];
  for(let i = 0; i < SKY.length - 1; i++) if(h >= SKY[i][0] && h <= SKY[i + 1][0]){ a = SKY[i]; b = SKY[i + 1]; break; }
  const u = (h - a[0])/((b[0] - a[0]) || 1); return { top:mixHex(a[1], b[1], u), bot:mixHex(a[2], b[2], u), h, night:h < 5.5 || h > 20.5, dusk:(h > 18 && h <= 20.5) || (h >= 5 && h <= 7) };
}
function penCampStatic(){
  const key = `pcamp${CV.W | 0}_${CV.H | 0}`; if(_cs[key]) return _cs[key];
  const M = 14, c = mkc(Math.ceil(CV.W) + M*2, Math.ceil(CV.H) + M*2), x = c.getContext('2d'); x.translate(CV.ox + M, CV.oy + M);
  const l = CV.l - M, r = CV.r + M, b = CV.b + M, R = (col, a, y, w, h) => { x.fillStyle = col; x.fillRect(Math.round(a), Math.round(y), Math.round(w), Math.round(h)); };
  let seed = 7; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647;
  // collines lointaines
  x.fillStyle = '#7ec0a0'; x.beginPath(); x.moveTo(l, HZ); for(let px = l; px <= r; px += 6) x.lineTo(px, HZ - 14 - Math.sin(px*.021)*8 - Math.sin(px*.07)*3); x.lineTo(r, HZ); x.fill();
  x.fillStyle = '#5ab06a'; x.beginPath(); x.moveTo(l, HZ); for(let px = l; px <= r; px += 6) x.lineTo(px, HZ - 6 - Math.sin(px*.03 + 2)*6); x.lineTo(r, HZ); x.fill();
  // arbres
  [[CV.l + 14, 70], [CV.l + 60, 76], [CV.r - 24, 68], [CV.r - 74, 76], [CV.cx - 30, 79]].forEach(([tx, ty], i) => { R('#6a4222', tx - 2, ty, 4, HZ - ty); for(let k = 0; k < 4; k++) cDisc(x, ['#2e8a3a', '#3fa84a', '#56c25a', '#7ada6a'][k], tx - 3 + k*2, ty - 8 - k*2 + (i % 2)*2, 12 - k*2); });
  // prairie rayée, chemin de terre, fleurs et touffes
  const g = x.createLinearGradient(0, HZ, 0, b); g.addColorStop(0, '#6cc254'); g.addColorStop(1, '#3a9438'); x.fillStyle = g; x.fillRect(l, HZ, r - l, b - HZ);
  for(let yy = HZ + 4, s = 6, k = 0; yy < b; yy += s, s *= 1.22, k++) if(k % 2) R('rgba(255,255,255,.06)', l, yy, r - l, s);
  x.fillStyle = '#c8955a'; x.beginPath(); x.ellipse(CV.cx + 10, 124, 100, 24, 0, 0, 6.2832); x.fill(); x.fillStyle = '#d8a86a'; x.beginPath(); x.ellipse(CV.cx + 10, 122, 94, 20, 0, 0, 6.2832); x.fill();
  for(let i = 0; i < 70; i++){ const px = l + rnd()*(r - l), py = HZ + 6 + rnd()*(b - HZ - 6), k = rnd(); if((px - CV.cx - 10)**2/100**2 + (py - 123)**2/24**2 < 1) continue;
    if(k < .45){ R('#2e8a3a', px, py, 1, 3); R('#2e8a3a', px + 2, py + 1, 1, 2); } else if(k < .7){ R(['#ff7ac8', '#ffd23f', '#fff', '#8ab8ff'][i % 4], px, py, 2, 2); R('#3fa84a', px, py + 2, 1, 2); } }
  // barrière au loin
  for(let px = l; px < r; px += 22){ R('#e8d8b0', px, HZ - 3, 3, 8); R('#b89a60', px + 2, HZ - 3, 1, 8); } R('#e8d8b0', l, HZ - 1, r - l, 2); R('#b89a60', l, HZ + 1, r - l, 1); R('#e8d8b0', l, HZ + 3, r - l, 2);
  return _cs[key] = c;
}
function penDrawCamp(x, t, P, sleepDim){
  const s = penSky(), g = x.createLinearGradient(0, CV.t - 14, 0, HZ); g.addColorStop(0, s.top); g.addColorStop(1, s.bot); x.fillStyle = g; x.fillRect(CV.l - 14, CV.t - 14, CV.W + 28, HZ - CV.t + 14);
  if(s.night){ for(let i = 0; i < 40; i++){ const px = CV.l + ((i*53) % 997)/997*CV.W, py = CV.t + ((i*89) % 61)/61*(HZ - CV.t - 10); x.fillStyle = `rgba(255,255,230,${.4 + .5*Math.sin(t*2 + i)})`; x.fillRect(px | 0, py | 0, 1 + (i % 3 === 0), 1); } cDisc(x, '#f0f0d8', CV.r - 60, CV.t + 40, 9); cDisc(x, s.top, CV.r - 56, CV.t + 38, 8); }
  else { const sx = CV.l + (s.h - 6)/14*CV.W; cDisc(x, 'rgba(255,240,160,.35)', sx, CV.t + 40 - Math.sin((s.h - 6)/14*3.14)*20, 16); cDisc(x, '#fff3a0', sx, CV.t + 40 - Math.sin((s.h - 6)/14*3.14)*20, 9); }
  for(let i = 0; i < 4; i++){ const cx = ((i*97 + t*(5 + i*2)) % (CV.W + 80)) + CV.l - 40, cy = CV.t + 28 + i*14; x.fillStyle = s.night ? 'rgba(120,120,190,.5)' : 'rgba(255,255,255,.85)'; [[0, 0, 12], [12, -3, 10], [22, 0, 11], [-10, 2, 8]].forEach(([dx, dy, rr]) => cDisc(x, x.fillStyle, cx + dx, cy + dy, rr*.55)); }
  x.drawImage(penCampStatic(), CV.l - 14, CV.t - 14);
  if(s.dusk){ x.fillStyle = 'rgba(255,140,80,.1)'; x.fillRect(CV.l, CV.t, CV.W, CV.H); } if(s.night){ x.fillStyle = 'rgba(10,10,60,.28)'; x.fillRect(CV.l, CV.t, CV.W, CV.H); }
  // objets de confort achetés
  const it = P.items || {}, ic = (id, px, py, k) => { const im = penImgEl(penIcon(id)); if(im.complete) x.drawImage(im, Math.round(px - 16*k), Math.round(py - 28*k), 32*k, 32*k); };
  if(it.plant) ic('plant', CV.r - 30, 98, 1.5); if(it.toys) ic('toys', CV.r - 104, 100, 1.4); if(it.soap) ic('soap', CV.r - 28, 122, 1.3); if(it.bowl) ic('bowl', CV.r - 78, 126, 1.5); if(it.bed) ic('bed', CV.l + 128, 128, 1.7);
}
function penBarn(x, t, P){
  const key = `pbarn${CV.W | 0}_${CV.H | 0}`;
  if(!_cs[key]){
    const M = 14, c = mkc(Math.ceil(CV.W) + M*2, Math.ceil(CV.H) + M*2), g = c.getContext('2d'); g.translate(CV.ox + M, CV.oy + M);
    const l = CV.l - M, r = CV.r + M, t0 = CV.t - M, b = CV.b + M, R = (col, a, y, w, h) => { g.fillStyle = col; g.fillRect(Math.round(a), Math.round(y), Math.round(w), Math.round(h)); };
    for(let px = l; px < r; px += 18){ R(Math.round((px - l)/18) % 2 ? '#b07a44' : '#a06c3a', px, t0, 18, 112 - t0); R('rgba(0,0,0,.25)', px, t0, 1, 112 - t0); R('rgba(255,220,160,.12)', px + 2, t0, 2, 112 - t0); }
    for(let yy = t0 + 12; yy < 112; yy += 30) R('rgba(60,30,10,.3)', l, yy, r - l, 2);
    R('#5a3a1a', l, 108, r - l, 6); R('#7a5028', l, 108, r - l, 2);
    const fg = g.createLinearGradient(0, 112, 0, b); fg.addColorStop(0, '#e8c66a'); fg.addColorStop(1, '#b8883a'); g.fillStyle = fg; g.fillRect(l, 112, r - l, b - 112);
    let seed = 11; const rnd = () => (seed = (seed*16807) % 2147483647)/2147483647; for(let i = 0; i < 160; i++){ const px = l + rnd()*(r - l), py = 114 + rnd()*(b - 114); R(rnd() < .5 ? '#f6dc8a' : '#a8782c', px, py, 5, 1); }
    R('#14101c', CV.l + 18, 24, 56, 50); R('#8ad0ff', CV.l + 20, 26, 52, 46); R('#14101c', CV.l + 45, 26, 2, 46); R('#14101c', CV.l + 20, 48, 52, 2); R('#e8f6ff', CV.l + 22, 28, 20, 8);
    _cs[key] = c;
  }
  x.drawImage(_cs[key], CV.l - 14, CV.t - 14);
  x.save(); x.globalCompositeOperation = 'lighter'; x.fillStyle = 'rgba(255,240,180,.12)'; x.beginPath(); x.moveTo(CV.l + 20, 26); x.lineTo(CV.l + 72, 26); x.lineTo(CV.cx + 40, 150); x.lineTo(CV.cx - 60, 150); x.closePath(); x.fill(); x.restore();
  if(P.items.incubator){ x.fillStyle = '#14101c'; x.fillRect(CV.cx - 1, CV.t, 2, 36); cDisc(x, '#ffd23f', CV.cx, 40, 9); cDisc(x, '#fff6b8', CV.cx - 2, 38, 4); x.save(); x.globalCompositeOperation = 'lighter'; const gg = x.createRadialGradient(CV.cx, 46, 4, CV.cx, 100, 90); gg.addColorStop(0, 'rgba(255,200,80,.45)'); gg.addColorStop(1, 'rgba(255,200,80,0)'); x.fillStyle = gg; x.fillRect(CV.cx - 100, 30, 200, 130); x.restore(); }
}

// ---------- petits dessins d'interface ----------
function penBubble(x, px, py, ch, col){      // bulle comme dans le jeu (! ou ?)
  cRect(x, '#14101c', px - 8, py - 15, 16, 15); cRect(x, '#fff', px - 7, py - 14, 14, 13); cPoly(x, [[px - 3, py - 1], [px + 3, py - 1], [px, py + 4]], '#14101c'); cPoly(x, [[px - 2, py - 1], [px + 2, py - 1], [px, py + 3]], '#fff');
  cTxt(x, ch, px, py - 14, { sz:10, al:'center', col, sh:false });
}
function penGlyph(x, id, cx, cy){
  if(id === 'feed'){ cDisc(x, '#14101c', cx, cy + 1, 5); cDisc(x, '#e8402c', cx, cy + 1, 4); cRect(x, '#3fbf5a', cx - 1, cy - 5, 3, 2); cRect(x, '#fff', cx - 2, cy - 1, 1, 1); }
  else if(id === 'play'){ cRect(x, '#e8c050', cx - 4, cy + 4, 8, 1); for(let k = 0; k < 7; k++) cRect(x, '#e8c050', cx + 4 - k - 1, cy + 4 - k*.9, 1, 1); cPoly(x, [[cx - 4, cy - 4], [cx + 1, cy - 6], [cx + 3, cy - 2], [cx - 1, cy + 1]], '#fff'); cDisc(x, '#b88a2a', cx - 5, cy + 3, 1.5); }
  else if(id === 'pet') penHeart(x, cx - 3.5, cy - 3, '#ff5a8a', 1);
  else if(id === 'clean'){ cRing(x, '#8ae8ff', cx - 2, cy, 3, 1); cRing(x, '#8ae8ff', cx + 3, cy - 2, 2, 1); cRing(x, '#8ae8ff', cx + 2, cy + 3, 1.5, 1); }
  else if(id === 'sleep'){ cDisc(x, '#ffe27a', cx, cy, 5); cDisc(x, '#3a2a6a', cx + 2, cy - 1, 4); cTxt(x, 'z', cx + 3, cy - 7, { sz:6, sh:false, col:'#fff' }); }
  else { cRect(x, '#14101c', cx - 6, cy - 3, 12, 7); cRect(x, '#6a7ad8', cx - 5, cy - 2, 10, 5); cRect(x, '#fff', cx - 4, cy - 1, 1, 3); cRect(x, '#fff', cx - 5, cy, 3, 1); cDisc(x, '#ffd23f', cx + 2, cy, 1); cDisc(x, '#ff5a8a', cx + 4, cy + 1, 1); }
}
function penFeather(x, tx, ty, t, sway){      // plume à grelot : bâton qui part du bas de l'écran jusqu'au pointeur
  const bx = CV.r - 36, by = CV.b - 38; x.save(); x.lineCap = 'round'; x.strokeStyle = '#14101c'; x.lineWidth = 4; x.beginPath(); x.moveTo(bx, by); x.lineTo(tx, ty); x.stroke(); x.strokeStyle = '#f0d060'; x.lineWidth = 2; x.beginPath(); x.moveTo(bx, by); x.lineTo(tx, ty); x.stroke(); x.restore();
  const a = Math.sin(t*(sway ? 14 : 3))*(sway ? .35 : .1) - .3; x.save(); x.translate(tx, ty); x.rotate(a);
  [['#14101c', 1.12], ['#f4f6ff', 1]].forEach(([c, s]) => { cPoly(x, [[0, 2*s], [-9*s, -11*s], [-3*s, -19*s], [3*s, -17*s], [8*s, -9*s]], c); });
  cPoly(x, [[0, 0], [-4, -9], [-1, -14], [2, -9]], '#d8dcf0'); cDisc(x, '#14101c', 0, 4, 4); cDisc(x, '#c8982a', 0, 4, 3); cRect(x, '#fff3a0', -1, 3, 1, 1); x.restore();
}
function penHand(x, px, py){ cDisc(x, '#14101c', px, py, 7); cDisc(x, '#ffe0c0', px, py, 6); for(let k = -2; k <= 2; k++){ cRect(x, '#14101c', px + k*3 - 1, py - 11 + Math.abs(k), 3, 6); cRect(x, '#ffe0c0', px + k*3, py - 10 + Math.abs(k), 1, 5); } }
function penSponge(x, px, py){ cRect(x, '#14101c', px - 8, py - 6, 16, 12); cRect(x, '#f0d84a', px - 7, py - 5, 14, 10); cRect(x, '#a8d83a', px - 7, py + 2, 14, 3); for(let k = 0; k < 4; k++) cRect(x, '#c0a820', px - 5 + k*3, py - 3 + (k % 2)*3, 1, 1); }

// ============================================================
//  LE CAMP
// ============================================================
function scenePension(){
  const P = Pen.d(); penTick(P);
  if(!P.egg && !P.mon){ showPension(); return; }
  penLoadAll().then(run);
  function run(){
    let mode = P.egg ? 'egg' : 'camp', tool = 'free', cine = null, tickT = 0, saveT = 0, toasts = [], hearts = [], bubbles = [], ptr = { down:false, x:0, y:0, lx:0, ly:0 }, drag = null, toy = null, rub = 0, rubE = 0, playAcc = 0, dirt = [], yawnT = 4, emoT = 5, exitMsg = null, hatchRes = null, evoRes = null;
    const mon = { x:CV.cx + 20, y:112, tx:CV.cx + 20, ty:112, row:0, st:'idle', wT:1, hopT:0, eatT:0, face:0, moving:false, emo:null, pet:0 };
    const bedPos = () => ({ x:CV.l + 128, y:122 });
    const fid = () => Pen.form(P.mon);
    for(let i = 0; i < 9; i++) dirt.push({ x:CV.l + 100 + Math.random()*(CV.W - 200), y:96 + Math.random()*28, r:3 + Math.random()*3 });
    const toast = (s, c) => toasts.push({ s, t:0, c:c || '#fff' });
    const regionX = () => [CV.l + 98, CV.r - 52];
    const sc = {
      en:.3, enT:.3,
      // ---------- rectangles d'interface ----------
      ui(){
        const r = [{ id:'exit', x:CV.r - 40, y:CV.t + 6, w:34, h:14 }, { id:'shop', x:CV.r - 92, y:CV.t + 6, w:48, h:14 }];
        if(mode === 'camp') PEN_TOOLS.forEach((b, i) => r.push({ id:b.id, x:CV.cx - 148 + i*50, y:CV.b - 46, w:46, h:28 }));
        return r;
      },
      down(a, b){
        ptr.down = true; ptr.x = ptr.lx = a; ptr.y = ptr.ly = b;
        if(cine){ if(cine.kind === 'final' && cine.t > .8) leave(exitMsg); if(cine.kind === 'hatch' && cine.t > 5.2) cine.skip = true; return; }
        for(const r of sc.ui()) if(a >= r.x && a <= r.x + r.w && b >= r.y && b <= r.y + r.h){ ptr.down = false; return press(r.id); }
        if(mode === 'camp' && tool === 'feed'){ const t = trayRects().find(r => a >= r.x && a <= r.x + r.w && b >= r.y && b <= r.y + r.h); if(t){ drag = { f:t.f, x:a, y:b, sx:a, sy:b }; return; } }
        if(tool === 'play'){ toy = { x:a, y:b }; }
      },
      move(a, b){
        const dx = a - ptr.lx, dy = b - ptr.ly, d = Math.hypot(dx, dy); ptr.x = a; ptr.y = b;
        if(!ptr.down || cine) { ptr.lx = a; ptr.ly = b; return; }
        if(drag){ drag.x = a; drag.y = b; }
        else if(mode === 'egg'){ if(Math.hypot(a - CV.cx, b - 112) < 46){ rubE += d; if(Math.random() < .3) fxBurst(sc, CV.cx + (Math.random() - .5)*50, 100 + Math.random()*20, 1, ['#ffd23f'], 20, { life:.5, g:-10 }); if(rubE > 260){ rubE = 0; warm(); } } }
        else if(mode === 'camp' && P.mon && !P.mon.sleeping){
          const near = Math.hypot(a - mon.x, b - (mon.y - 22)) < 34;
          if(tool === 'play') toy = { x:a, y:b };
          else if(tool === 'pet' && near){ rub += d; mon.pet = .4; if(rub > 22){ rub = 0; const m = P.mon; m.joy = penClamp(m.joy + 1.1*(P.items.toys ? 1.3 : 1)); m.energy = penClamp(m.energy - .1); hearts.push({ x:mon.x + (Math.random() - .5)*20, y:mon.y - 36, t:0 }); snd(880 + Math.random()*300, .06, 'triangle', .04); } }
          else if(tool === 'clean' && near){ rub += d; mon.pet = .4; if(rub > 12){ rub = 0; const m = P.mon; m.clean = penClamp(m.clean + 1.6*(P.items.soap ? 2 : 1)); m.joy = penClamp(m.joy + .12); sc.P.length < 60 && fxBurst(sc, mon.x + (Math.random() - .5)*30, mon.y - 20, 4, ['#bff4ff', '#fff'], 30, { life:.7, g:-20 }); snd(1200 + Math.random()*500, .04, 'sine', .03); noise(.05, .03, 4000, 3000, 'highpass'); } }
        }
        ptr.lx = a; ptr.ly = b;
      },
      up(){
        ptr.down = false; if(drag){ const d = drag; drag = null; const moved = Math.hypot(d.x - d.sx, d.y - d.sy); if(moved < 8 || Math.hypot(d.x - mon.x, d.y - (mon.y - 20)) < 44) giveFood(d.f); }
        if(tool === 'play') toy = null;
      },
      key(k){ if(k === 'escape'){ leave(); return true; } },
      update(dt){
        tickT += dt; saveT += dt;
        if(tickT >= 1){ tickT = 0; penTick(P); if(!cine) checkEvents(); }
        if(saveT > 5){ saveT = 0; Pen.save(); }
        toasts.forEach(o => o.t += dt); toasts = toasts.filter(o => o.t < 3.2);
        hearts.forEach(h => { h.t += dt; h.y -= 16*dt; }); hearts = hearts.filter(h => h.t < 1.4);
        if(cine) return cineUpdate(dt);
        if(mode === 'camp' && P.mon) campUpdate(dt);
        if(mode === 'egg') eggUpdate(dt);
      },
      draw(x, dt){
        const t = sc.t;
        if(mode === 'egg' || (cine && cine.kind === 'hatch')) drawEgg(x, t);
        else { penDrawCamp(x, t, P); if(cine && (cine.kind === 'evo' || cine.kind === 'final')) drawEvo(x, t); else drawCamp(x, t, dt); }
        hearts.forEach(h => { x.globalAlpha = Math.max(0, 1.4 - h.t); penHeart(x, h.x, h.y, '#ff5a8a', 1.4); }); x.globalAlpha = 1;
        drawUI(x, t);
      }
    };
    // ---------- actions ----------
    function press(id){
      if(id === 'exit') return leave(); if(id === 'shop') return leave(null, true);
      if(mode !== 'camp') return;
      if(id === 'game'){ if(!P.mon.sleeping){ if(P.mon.energy < 12) return toast('Il est trop fatigué pour jouer…', '#ffb0a0'); sc.finished = true; Pen.save(); return scenePenCatch(() => scenePension()); } return toast('Chut, il dort…'); }
      if(id === 'sleep'){ const m = P.mon; if(m.sleeping){ m.sleeping = false; toast('Tu le réveilles doucement.'); } else { m.sleeping = true; toast('Bonne nuit !'); } Pen.save(); tool = 'free'; return; }
      if(P.mon.sleeping) return toast('Il dort : réveille-le d\'abord (Dodo).');
      tool = tool === id ? 'free' : id; toy = null; drag = null; rub = 0;
    }
    function leave(msg, toShop){ sc.finished = true; Pen.save(); if(toShop) showPenShop(); else showPension(msg); }
    function trayRects(){
      const list = PEN_FOODS.filter(f => (P.food[f.id] || 0) > 0), w = 34, gap = 4, x0 = CV.cx - (list.length*(w + gap) - gap)/2;
      return list.map((f, i) => ({ f:f.id, x:x0 + i*(w + gap), y:CV.b - 90, w, h:32 }));
    }
    function giveFood(fidn){
      const r = penFeed(P, fidn); const f = PEN_FOOD[fidn];
      if(r === 'full') return toast('Il n\'a plus faim !', '#ffd0a0'); if(r === 'sleep') return toast('Il dort…'); if(r === 'none') return;
      mon.eatT = 1.3; mon.st = 'eat'; mon.emo = { t:0, ch:'♥', col:'#ff5a8a' }; for(let i = 0; i < 3; i++) noise(.06, .09, 2500, 800, 'lowpass', i*.18); snd(660, .1, 'triangle', .06, 0, .5);
      if(r === 'fav'){ for(let i = 0; i < 5; i++) hearts.push({ x:mon.x + (Math.random() - .5)*30, y:mon.y - 34 - Math.random()*10, t:-i*.08 }); toast('C\'est sa baie préférée !', '#ffb0d0'); sc.enT = 1; }
      fxBurst(sc, mon.x, mon.y - 24, 8, ['#ffd23f', '#fff', '#ff9a3c'], 40, { life:.6 });
    }
    function warm(){ const e = P.egg, max = penHatchTotal(P)*PEN.warmMax; if(e.bonus < max){ e.bonus = Math.min(max, e.bonus + .5/60*PEN.speed); toast('L\'œuf se réchauffe… (−30 s)', '#ffe0a0'); snd(500, .15, 'sine', .05, 100); fxBurst(sc, CV.cx, 100, 6, ['#ffd23f', '#ff9a3c'], 30, { life:.6, g:-10 }); } else toast('L\'œuf est déjà bien chaud !', '#ffd0a0'); }
    function checkEvents(){
      if(mode === 'egg' && P.egg && penEggLeft(P) <= 0){ startHatch(); return; }
      if(mode === 'camp' && P.mon){
        const m = P.mon; if(m.collapsed){ m.collapsed = false; toast('Épuisé, il s\'est endormi…', '#ffb0a0'); } if(m.woke){ m.woke = false; toast('Il s\'est réveillé en pleine forme !', '#c0ffc0'); }
        const ev = penEvoState(P); if(ev && ev.ready){ if(m.sleeping){ m.sleeping = false; } startEvo(); }
      }
    }
    // ---------- éclosion ----------
    function startHatch(){ mode = 'hatchwait'; cine = { kind:'hatch', t:0, res:null, shells:false }; snd(300, .3, 'triangle', .08); sc.enT = .6; }
    function startEvo(){ const from = fid(); cine = { kind:'evo', t:0, from, to:null, done:false }; tool = 'free'; drag = null; toy = null; snd(440, .6, 'triangle', .08, 600); sc.enT = .8; }
    function cineUpdate(dt){
      const c = cine; c.t += dt;
      if(c.kind === 'hatch'){
        if(c.t > 1.1 && Math.floor((c.t - dt)*6) !== Math.floor(c.t*6) && c.t < 3.4){ snd(220 + Math.random()*80, .06, 'square', .06); kick(sc, .25); }
        if(c.t > 1.6 && !c.f1){ c.f1 = 1; kick(sc, .5, .5); snd(900, .1, 'square', .08); }
        if(c.t > 2.4 && !c.f2){ c.f2 = 1; kick(sc, .8, .8); }
        if(c.t > 3.4 && !c.res){ c.res = penHatch(P); const id = Pen.form(c.res); fxBurst(sc, CV.cx, 100, 50, ['#fff', '#f0e8c8', '#c8b890', '#ffd23f'], 130, { life:1.3 }); fxRing(sc, CV.cx, 122, '#ffffff', 120, 4); kick(sc, 1, 1, '255,255,255'); cheer(.5); [523, 659, 784, 1047].forEach((f, i) => snd(f, .25, 'triangle', .09, 0, i*.1)); mon.x = CV.cx; mon.y = 120; mon.tx = mon.x; mon.ty = mon.y; }
        if((c.t > 7.5 || c.skip) && c.res){ cine = null; mode = 'camp'; hatchRes = null; toast(PEN_FORMS[fid()].name + ' est arrivé à la pension !'); }
      } else if(c.kind === 'evo'){
        if(c.t > 2.4 && !c.done){ c.done = true; const r = penEvolve(P); c.to = r.id; c.final = r.final; c.line = r.line; kick(sc, 1, 1, '255,255,255'); fxRing(sc, CV.cx, 124, '#ffffff', 140, 5); fxRing(sc, CV.cx, 124, '#ffd23f', 90, 3); fxBurst(sc, CV.cx, 96, 80, null, 150, { life:1.4 }); cheer(c.final ? 1 : .7); [523, 659, 784, 1047, 1319].forEach((f, i) => snd(f, .3, 'triangle', .1, 0, i*.1)); sc.enT = 1; }
        if(c.t > 5.2){ if(c.final){ cine = { kind:'final', t:0, to:c.to, from:c.from, line:c.line }; exitMsg = PEN_FORMS[c.to].name + ' est maintenant disponible pour les combats !'; Owned.add(c.to); penFinishFinal(P); fxBurst(sc, CV.cx, 90, 90, null, 160, { life:1.6 }); kick(sc, .6, .6, '255,220,120'); } else { cine = null; toast(PEN_FORMS[c.to].name + ' est ravi de sa nouvelle forme !', '#c0ffc0'); mon.emo = { t:0, ch:'♥', col:'#ff5a8a' }; } }
      } else if(c.kind === 'final'){ if(c.t > 1 && Math.floor((c.t - dt)*2) !== Math.floor(c.t*2) && c.t < 4) fxBurst(sc, CV.l + 30 + Math.random()*(CV.W - 60), 40 + Math.random()*60, 24, null, 100, { life:1.2 }); }
    }
    // ---------- comportement du Pokémon ----------
    function eggUpdate(dt){ const pct = penEggPct(P); if(pct > .7 && Math.random() < dt*(pct - .6)*2.2) snd(300 + Math.random()*60, .04, 'square', .05); }
    function campUpdate(dt){
      const m = P.mon, [x0, x1] = regionX(); mon.hopT = Math.max(0, mon.hopT - dt); mon.eatT = Math.max(0, mon.eatT - dt); mon.pet = Math.max(0, mon.pet - dt);
      if(mon.emo){ mon.emo.t += dt; if(mon.emo.t > 2.2) mon.emo = null; }
      let sp = 0;
      if(m.sleeping){ const b = bedPos(); mon.tx = P.items.bed ? b.x : CV.cx; mon.ty = P.items.bed ? b.y : 116; sp = 40; if(Math.hypot(mon.tx - mon.x, mon.ty - mon.y) < 3) sp = 0; mon.st = sp ? 'walk' : 'sleep'; if(!sp && Math.random() < dt*1.2) bubbles.push({ x:mon.x + 10, y:mon.y - 30, t:0 }); }
      else if(toy && tool === 'play'){
        const tx = Math.max(x0, Math.min(x1, toy.x)), ty = Math.max(98, Math.min(120, toy.y + 16)), d = Math.hypot(tx - mon.x, ty - mon.y);
        mon.tx = tx; mon.ty = ty; sp = d > 6 ? Math.min(110, 30 + d*1.4) : 0; mon.st = sp ? 'walk' : 'hop'; if(!sp) mon.hopT = .2;
        if(Math.hypot(toy.x - mon.x, toy.y - (mon.y - 24)) < 52){ playAcc += dt; if(!mon.emo || mon.emo.ch !== '!') mon.emo = { t:0, ch:'!', col:'#e8402c' }; if(playAcc > 3){ playAcc = 0; m.joy = penClamp(m.joy + 4.5*(P.items.toys ? 1.3 : 1)); m.energy = penClamp(m.energy - 2); m.hunger = penClamp(m.hunger - 1.2); m.clean = penClamp(m.clean - .8); hearts.push({ x:mon.x, y:mon.y - 38, t:0 }); snd(784, .08, 'triangle', .05); snd(1047, .1, 'triangle', .05, 0, .07); } }
        else if(!mon.emo) mon.emo = { t:0, ch:'?', col:'#2a6ae8' };
      }
      else if(mon.eatT > 0){ sp = 0; mon.st = 'eat'; }
      else if(mon.pet > 0){ sp = 0; mon.st = 'happy'; mon.row = penRow(ptr.x - mon.x, ptr.y - mon.y); }
      else {
        mon.wT -= dt; const d0 = Math.hypot(mon.tx - mon.x, mon.ty - mon.y);
        if(mon.wT <= 0){ mon.wT = 2.5 + Math.random()*4; if(Math.random() < (m.energy < 25 ? .15 : .75)){ mon.tx = x0 + Math.random()*(x1 - x0); mon.ty = 98 + Math.random()*22; } }
        sp = d0 > 3 ? (m.energy < 25 ? 14 : 26) : 0; mon.st = sp ? 'walk' : (m.joy > 75 && mon.hopT > 0 ? 'hop' : 'idle');
        if(!sp && m.joy > 75 && Math.random() < dt*.35) mon.hopT = .9;
      }
      if(sp){ const dx = mon.tx - mon.x, dy = mon.ty - mon.y, d = Math.hypot(dx, dy) || 1, st = Math.min(d, sp*dt); mon.x += dx/d*st; mon.y += dy/d*st; mon.row = penRow(dx, dy); mon.moving = true; } else mon.moving = false;
      // émotions
      emoT -= dt; if(emoT <= 0 && !mon.emo){ emoT = 6 + Math.random()*6; const md = penMood(m); if(md === 'hungry') mon.emo = { t:0, ch:'!', col:'#e8402c' }; else if(md === 'tired') mon.emo = { t:0, ch:'…', col:'#6a6a8a' }; else if(md === 'dirty') mon.emo = { t:0, ch:'?', col:'#2a6ae8' }; else if(md === 'happy') mon.emo = { t:0, ch:'♥', col:'#ff5a8a' }; else if(md === 'sad') mon.emo = { t:0, ch:'…', col:'#2a6ae8' }; }
      bubbles.forEach(b => { b.t += dt; b.y -= 10*dt; b.x += Math.sin(b.t*3)*4*dt; }); bubbles = bubbles.filter(b => b.t < 2);
      sc.enT = penMood(m) === 'happy' ? .8 : .25;
    }
    // ---------- dessin : camp ----------
    function drawCamp(x, t, dt){
      const m = P.mon; if(!m) return; const id = fid();
      dirt.forEach((d, i) => { if(m.clean < 100 - i*(100/9) - 8){ cDisc(x, '#7a5a2a', d.x, d.y, d.r); cDisc(x, '#9a7a3a', d.x - 1, d.y - 1, d.r - 1.5); if(i % 2) cTxt(x, '~', d.x + 5, d.y - 12 + Math.sin(t*3 + i)*2, { sz:7, col:'#5a6a2a', sh:false }); } });
      const k = 2.7 + (mon.y - 96)/40*.7, sleeping = m.sleeping && mon.st === 'sleep';
      const list = mon.st === 'eat' ? PANIM.eat : mon.st === 'sleep' ? PANIM.sleep : mon.st === 'walk' ? PANIM.walk : mon.st === 'hop' || mon.st === 'happy' ? PANIM.hop : (penMood(m) === 'sad' ? PANIM.idle : PANIM.idle);
      const lift = (mon.st === 'hop' || mon.st === 'happy') ? Math.abs(Math.sin(t*9))*7 : 0;
      penMonDraw(x, id, list, t, sleeping ? 0 : mon.row, mon.x, mon.y, k, { lift });
      if(m.clean < 50){ x.fillStyle = 'rgba(100,70,30,.55)'; for(let i = 0; i < 9; i++){ x.fillRect(Math.round(mon.x - 16 + ((i*37) % 33)), Math.round(mon.y - 4 - ((i*53) % 28)*k/2.7), 2, 2); } }
      if(m.clean < 25){ for(let i = 0; i < 3; i++) cTxt(x, '~', mon.x - 14 + i*12 + Math.sin(t*4 + i)*3, mon.y - 46*k/2.7 - Math.abs(Math.sin(t*3 + i))*5, { sz:8, col:'#6a8a2a' }); }
      if(mon.emo && !m.sleeping) penBubble(x, mon.x + 14, mon.y - 34*k/2.7 - 6, mon.emo.ch, mon.emo.col);
      bubbles.forEach(b => { x.globalAlpha = Math.max(0, 1.6 - b.t); cTxt(x, 'Z', b.x, b.y, { sz:8 + b.t*3, col:'#d8e8ff' }); }); x.globalAlpha = 1;
      if(m.sleeping){ x.fillStyle = 'rgba(8,8,50,.42)'; x.fillRect(CV.l, CV.t, CV.W, CV.H); }
      if(drag){ const im = penImgEl('assets/items/' + PEN_FOOD[drag.f].img + '.png'); if(im.complete) x.drawImage(im, drag.x - 14, drag.y - 14, 28, 28); }
      if(tool === 'play'){ const tx = toy ? toy.x : CV.r - 70 + Math.sin(t*1.7)*18, ty = toy ? toy.y : CV.b - 80 + Math.cos(t*2.2)*8; penFeather(x, tx, ty, t, !!toy); }
      if((tool === 'pet' || tool === 'clean') && ptr.down === false && !m.sleeping){ /* curseur affiché seulement pointeur levé : indice */ }
      if(tool === 'pet' && !m.sleeping) penHand(x, ptr.down ? ptr.x : CV.cx + 70, ptr.down ? ptr.y : 150 - 30);
      if(tool === 'clean' && !m.sleeping) penSponge(x, ptr.down ? ptr.x : CV.cx + 70, ptr.down ? ptr.y : 120);
      if(tool === 'feed'){
        const tr = trayRects(); cRect(x, 'rgba(20,10,40,.6)', CV.cx - 130, CV.b - 94, 260, 40);
        if(!tr.length) cTxt(x, 'Aucune baie : passe par la Boutique !', CV.cx, CV.b - 80, { sz:8, al:'center', col:'#ffd0a0' });
        tr.forEach(r => { if(drag && drag.f === r.f) return; cPanel(x, r.x, r.y, r.w, r.h, '#3a2a5a'); const im = penImgEl('assets/items/' + PEN_FOOD[r.f].img + '.png'); if(im.complete) x.drawImage(im, r.x + 3, r.y + 1, 28, 28); cTxt(x, '×' + P.food[r.f], r.x + r.w - 3, r.y + r.h - 9, { sz:7, al:'right' }); });
      }
    }
    // ---------- dessin : œuf & éclosion ----------
    function drawEgg(x, t){
      penBarn(x, t, P);
      const hatching = cine && cine.kind === 'hatch', pct = P.egg ? penEggPct(P) : 1, ct = hatching ? cine.t : 0;
      const amp = hatching ? (ct < 3.4 ? .1 + ct*.06 : 0) : Math.pow(Math.max(0, (pct - .6)/.4), 2)*.2, wob = Math.sin(t*(hatching ? 34 : 18))*amp*(Math.sin(t*3) > .2 || hatching ? 1 : 0.15), bob = Math.sin(t*1.6)*(hatching ? 0 : 1.2);
      // nid de paille
      x.fillStyle = '#8a5a20'; x.beginPath(); x.ellipse(CV.cx, 134, 50, 11, 0, 0, 6.2832); x.fill(); x.fillStyle = '#e8c050'; x.beginPath(); x.ellipse(CV.cx, 131, 46, 9, 0, 0, 6.2832); x.fill(); for(let i = 0; i < 26; i++){ cRect(x, '#b8882a', CV.cx - 44 + i*3.4, 128 + (i % 3)*3, 4, 1); }
      const im = penImgEl('assets/items/' + PEN.egg + '.png');
      if(!(hatching && ct > 3.4) && im.complete){
        x.save(); x.translate(CV.cx, 132 + bob); x.rotate(wob); x.imageSmoothingEnabled = false; const w = 32*2.8;
        if(hatching && ct > 1.3){ x.globalAlpha = 1; }
        x.drawImage(im, -w/2, -w + 6, w, w);
        if((pct > .85 && !hatching) || (hatching && ct > .6)){ x.strokeStyle = '#14101c'; x.lineWidth = 1.2; const n = hatching ? Math.min(5, 1 + Math.floor(ct*2)) : Math.min(3, Math.floor((pct - .85)*20)); for(let i = 0; i < n; i++){ x.beginPath(); x.moveTo(-12 + i*10, -w/2 - 8 + i*3); x.lineTo(-8 + i*10, -w/2 - 2 + i*3); x.lineTo(-13 + i*10, -w/2 + 4 + i*3); x.lineTo(-9 + i*10, -w/2 + 10 + i*3); x.stroke(); } }
        if(hatching && ct > 1.2){ x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = Math.min(.8, (ct - 1.2)*.5); x.drawImage(im, -w/2, -w + 6, w, w); x.restore(); }
        x.restore();
      }
      if(hatching && ct > 1.4 && ct <= 3.4){ x.save(); x.globalCompositeOperation = 'lighter'; const a = (ct - 1.4)/2, gg = x.createRadialGradient(CV.cx, 110, 4, CV.cx, 110, 30 + a*70); gg.addColorStop(0, `rgba(255,255,255,${.5*a})`); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(CV.cx - 110, 10, 220, 160); x.restore(); }
      if(hatching && cine.res && ct > 3.4){ const id = Pen.form(cine.res), u = Math.min(1, (ct - 3.4)*2.5), k = 3.2*(.4 + .6*(1 - Math.pow(1 - u, 3))); penMonDraw(x, id, PANIM.hop, t, 0, CV.cx, 126, k, { lift:Math.abs(Math.sin(t*6))*(ct < 5 ? 8 : 0) });
        if(ct > 4.2){ cTxt(x, 'Félicitations !', CV.cx, 24, { sz:9, al:'center', col:'#ffe27a' }); cTxt(x, PEN_FORMS[id].name + ' est né !', CV.cx, 36, { sz:15, al:'center' }); if(ct > 5.2) cTxt(x, 'Touche pour continuer', CV.cx, 58, { sz:7, al:'center', col:'#ffe0a0' }); } }
      if(!hatching && P.egg){
        cPanel(x, CV.l + 8, CV.t + 8, 118, 40, '#2a2146'); cTxt(x, 'Œuf Mystère', CV.l + 14, CV.t + 12, { sz:9, col:'#ffe27a' });
        cRect(x, '#14101c', CV.l + 13, CV.t + 24, 102, 8); cRect(x, '#ffd23f', CV.l + 14, CV.t + 25, 100*pct, 6); cRect(x, 'rgba(255,255,255,.35)', CV.l + 14, CV.t + 25, 100*pct, 2);
        cTxt(x, Math.round(pct*100) + ' % · ' + penFmt(penEggLeft(P)), CV.l + 14, CV.t + 35, { sz:7 });
        cTxt(x, 'Frotte l\'œuf pour le réchauffer', CV.cx, CV.b - 52, { sz:8, al:'center', col:'#fff3d0' });
        if(pct > .75) cTxt(x, 'Il bouge de plus en plus…', CV.cx, CV.b - 40, { sz:8, al:'center', col:'#ffe27a' });
      }
    }
    // ---------- dessin : évolution ----------
    function drawEvo(x, t){
      const c = cine; x.fillStyle = 'rgba(10,6,40,.62)'; x.fillRect(CV.l, CV.t, CV.W, CV.H); drawSpotLite(x);
      const showTo = c.kind === 'final' || (c.kind === 'evo' && c.done), id = showTo ? c.to : c.from, k = 3.1, py = 138;
      if(c.kind === 'evo' && !c.done){ const a = Math.pow(c.t/2.4, 2); penMonDraw(x, id, PANIM.hop, t, 0, CV.cx + Math.sin(t*40)*a*2, py, k, { lift:Math.abs(Math.sin(t*5*(1 + a*3)))*8 }); penMonWhite(x, id, PANIM.hop, t, 0, CV.cx + Math.sin(t*40)*a*2, py, k, a*(.5 + .5*Math.sin(t*16)) ); x.save(); x.globalCompositeOperation = 'lighter'; const gg = x.createRadialGradient(CV.cx, py - 40, 4, CV.cx, py - 40, 30 + a*80); gg.addColorStop(0, `rgba(255,255,255,${.6*a})`); gg.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gg; x.fillRect(CV.cx - 120, py - 150, 240, 200); x.restore(); cTxt(x, 'Quoi ? ' + PEN_FORMS[c.from].name + ' évolue !', CV.cx, 30, { sz:12, al:'center' }); }
      else { const u = Math.min(1, ((c.kind === 'evo' ? c.t - 2.4 : 3) )*1.4), kk = k*(.5 + .5*(1 - Math.pow(1 - u, 3))); penMonDraw(x, id, PANIM.hop, t, 0, CV.cx, py, kk, { lift:Math.abs(Math.sin(t*6))*(c.kind === 'evo' ? 8 : 4) }); if(u < 1) penMonWhite(x, id, PANIM.hop, t, 0, CV.cx, py, kk, 1 - u);
        if(c.kind === 'evo'){ cTxt(x, PEN_FORMS[c.from].name + ' est devenu', CV.cx, 24, { sz:9, al:'center', col:'#ffe27a' }); cTxt(x, PEN_FORMS[c.to].name + ' !', CV.cx, 36, { sz:16, al:'center' }); }
        else { cTxt(x, 'DERNIÈRE ÉVOLUTION !', CV.cx, 18, { sz:12, al:'center', col:'#ffe27a' }); cTxt(x, PEN_FORMS[c.to].name + ' est maintenant', CV.cx, 36, { sz:10, al:'center' }); cTxt(x, 'disponible pour les combats !', CV.cx, 48, { sz:10, al:'center', col:'#9fe8ff' }); if(c.t > .8 && Math.sin(t*5) > -.2) cTxt(x, 'Touche pour continuer', CV.cx, CV.b - 22, { sz:8, al:'center', col:'#fff3a0' }); } }
    }
    function drawSpotLite(x){ x.save(); x.globalCompositeOperation = 'lighter'; const g = x.createLinearGradient(0, CV.t, 0, 140); g.addColorStop(0, 'rgba(255,240,200,.3)'); g.addColorStop(1, 'rgba(255,240,200,.08)'); x.fillStyle = g; x.beginPath(); x.moveTo(CV.cx - 8, CV.t); x.lineTo(CV.cx + 8, CV.t); x.lineTo(CV.cx + 70, 140); x.lineTo(CV.cx - 70, 140); x.closePath(); x.fill(); x.restore(); }
    // ---------- interface ----------
    function gauge(x, px, py, label, v, col, w){ const low = v < 25 && Math.sin(sc.t*8) > 0; cTxt(x, label, px, py, { sz:6.5 }); cRect(x, low ? '#ff5a4a' : '#14101c', px + 34, py + 1, w + 2, 8); cRect(x, '#3a3258', px + 35, py + 2, w, 6); cRect(x, col, px + 35, py + 2, w*v/100, 6); cRect(x, 'rgba(255,255,255,.35)', px + 35, py + 2, w*v/100, 2); }
    function drawUI(x, t){
      // boutons du haut
      [['shop', 'Boutique'], ['exit', 'Quitter']].forEach(([id, n]) => { const r = sc.ui().find(q => q.id === id); cPanel(x, r.x, r.y, r.w, r.h, '#4a3a7a'); cRect(x, 'rgba(255,255,255,.2)', r.x, r.y, r.w, 4); cTxt(x, n, r.x + r.w/2, r.y + 3, { sz:7, al:'center' }); });
      if(mode === 'camp' && P.mon && !(cine && cine.kind !== 'final' && false)){
        const m = P.mon, id = fid(), px0 = CV.l + 6, py0 = CV.t + 6; cPanel(x, px0, py0, 112, 104, '#241a44'); cRect(x, 'rgba(255,255,255,.1)', px0, py0, 112, 3);
        cTxt(x, PEN_FORMS[id].name, px0 + 6, py0 + 4, { sz:9, col:'#ffe27a' }); cTxt(x, 'Forme ' + (m.stage + 1) + '/3', px0 + 70, py0 + 6, { sz:6.5, col:'#bbc' });
        gauge(x, px0 + 5, py0 + 19, 'Faim', m.hunger, '#ff9a3c', 60); gauge(x, px0 + 5, py0 + 31, 'Joie', m.joy, '#ff7ac8', 60); gauge(x, px0 + 5, py0 + 43, 'Énergie', m.energy, '#ffd23f', 60); gauge(x, px0 + 5, py0 + 55, 'Propre', m.clean, '#5ad8ff', 60);
        const ev = penEvoState(P); if(ev){ cTxt(x, 'Évolution', px0 + 6, py0 + 69, { sz:6.5, col:'#9fe8ff' }); cTxt(x, 'Âge ' + (ev.ageOK ? '✓' : penShort(m.age) + ' / ' + penShort(ev.age)), px0 + 6, py0 + 78, { sz:6.5, col:ev.ageOK ? '#9aff9a' : '#fff' }); cTxt(x, 'Joie ' + (ev.joyOK ? '✓' : Math.round(m.joy) + ' / ' + ev.joy + ' %'), px0 + 6, py0 + 88, { sz:6.5, col:ev.joyOK ? '#9aff9a' : '#fff' }); } else cTxt(x, 'Dernière forme !', px0 + 6, py0 + 72, { sz:7, col:'#9aff9a' });
        cRect(x, 'rgba(20,10,40,.66)', CV.l, CV.b - 50, CV.W, 50);
        sc.ui().filter(r => PEN_TOOLS.some(b => b.id === r.id)).forEach(r => { const on = tool === r.id || (r.id === 'sleep' && m.sleeping); cPanel(x, r.x, r.y, r.w, r.h, on ? '#ffd23f' : '#4a3a7a'); cRect(x, on ? 'rgba(255,255,255,.5)' : 'rgba(255,255,255,.18)', r.x, r.y, r.w, 5); penGlyph(x, r.id, r.x + r.w/2, r.y + 11); cTxt(x, r.id === 'sleep' && m.sleeping ? 'Réveil' : PEN_TOOLS.find(b => b.id === r.id).n, r.x + r.w/2, r.y + 18, { sz:7, al:'center', col:on ? '#14101c' : '#fff', sh:!on }); });
        const hint = { feed:'Touche ou glisse une baie sur lui', play:'Agite la plume : il court après !', pet:'Frotte-le doucement pour le câliner', clean:'Frotte-le pour le laver', free:PEN_MOOD_TXT[penMood(m)] }[m.sleeping ? 'free' : tool]; cTxt(x, hint, CV.cx, CV.b - 62 - (tool === 'feed' ? 40 : 0), { sz:8, al:'center', col:'#fff3d0' });
      }
      toasts.forEach((o, i) => { const a = Math.min(1, (3.2 - o.t)*2, o.t*5); x.globalAlpha = Math.max(0, a); const ty = CV.b - 64 - i*17; /* v0.26 : en bas, plus sur le panneau de stats */ cPanel(x, CV.cx - 100, ty, 200, 14, '#2a2146'); cTxt(x, o.s, CV.cx, ty + 3, { sz:8, al:'center', col:o.c }); x.globalAlpha = 1; });
    }
    sc.pen = 1; conRun(sc);
  }
}

// ============================================================
//  MINI-JEU « ATTRAPE-BAIES » : déplace ton Pokémon (doigt / souris / flèches) pour attraper les baies, évite les cailloux.
//  Récompense : bonheur + Pokédollars selon le score.   onEnd() quand on quitte l'écran de résultat.
// ============================================================
function scenePenCatch(onEnd){
  const P = Pen.d(), m = P.mon, id = Pen.form(m); let tx = CV.cx, mx = CV.cx, items = [], score = 0, time = 25, spawn = .6, stun = 0, combo = 0, phase = 'play', res = null, t0 = 0, face = 0, pop = [];
  const TYPES = [{ n:'oran', pts:1, w:6, img:'oran-berry' }, { n:'sitrus', pts:2, w:3, img:'sitrus-berry' }, { n:'lum', pts:5, w:1, img:'lum-berry' }, { n:'rock', pts:-3, w:3 }];
  const pick = () => { let s = TYPES.reduce((a, b) => a + b.w, 0)*Math.random(); for(const q of TYPES){ s -= q.w; if(s <= 0) return q; } return TYPES[0]; };
  const sc = {
    en:.3, enT:.3,
    down(a, b){ if(phase === 'end'){ if(t0 > .8) end(); return; } tx = a; },
    move(a){ if(phase === 'play') tx = a; },
    key(k){ if(phase !== 'play'){ if(t0 > .8) end(); return true; } if(k === 'arrowleft' || k === 'q' || k === 'a'){ tx -= 26; return true; } if(k === 'arrowright' || k === 'd'){ tx += 26; return true; } },
    update(dt){
      if(phase === 'end'){ t0 += dt; return; }
      time -= dt; spawn -= dt; stun = Math.max(0, stun - dt);
      if(spawn <= 0){ spawn = Math.max(.28, .75 - (25 - time)*.02); const q = pick(); items.push({ ...q, x:CV.l + 30 + Math.random()*(CV.W - 60), y:CV.t - 6, vy:55 + Math.random()*35 + (25 - time)*2.5, rot:Math.random()*6 }); }
      tx = Math.max(CV.l + 24, Math.min(CV.r - 24, tx)); if(!stun){ const d = tx - mx; mx += Math.sign(d)*Math.min(Math.abs(d), 150*dt); if(Math.abs(d) > 1) face = d > 0 ? 2 : 6; }
      items.forEach(it => { it.y += it.vy*dt; it.rot += dt*3; if(it.y > 120 && it.y < 140 && Math.abs(it.x - mx) < 20 && !it.got){ it.got = 1; if(it.n === 'rock'){ score = Math.max(0, score + it.pts); stun = .8; combo = 0; kick(sc, .5, .3, '255,120,100'); snd(140, .2, 'sawtooth', .08); fxBurst(sc, it.x, 120, 12, ['#aaa', '#fff'], 60, { life:.5 }); pop.push({ s:'Aïe !', x:it.x, y:110, t:0, c:'#ff9a8a' }); } else { combo++; const g = it.pts + (combo >= 5 ? 1 : 0); score += g; snd(700 + combo*40, .08, 'triangle', .06); snd(1000 + combo*40, .1, 'triangle', .05, 0, .06); fxBurst(sc, it.x, 118, 8 + it.pts*3, ['#ffd23f', '#fff', '#ff9a3c'], 50, { life:.6 }); pop.push({ s:'+' + g, x:it.x, y:108, t:0, c:it.n === 'lum' ? '#9fe8ff' : '#fff3a0' }); if(combo % 5 === 0){ fxWord(sc, 'COMBO x' + combo, CV.cx, 60, '#ff9af0', 12); kick(sc, .3, .2, '255,200,240'); } } } });
      items = items.filter(it => !it.got && it.y < CV.b + 10); pop.forEach(p => { p.t += dt; p.y -= 20*dt; }); pop = pop.filter(p => p.t < .9);
      if(time <= 0){ phase = 'end'; t0 = 0; const coins = Math.round(score*3*.65), joy = Math.min(30, 4 + score*1.2); res = { coins, joy }; Save.addCoins(coins); m.joy = penClamp(m.joy + joy); m.energy = penClamp(m.energy - 6); m.hunger = penClamp(m.hunger - 4); m.clean = penClamp(m.clean - 3); Pen.save(); cheer(Math.min(1, score/25)); kick(sc, .4, .4, '255,230,150'); fxBurst(sc, CV.cx, 70, 40, null, 110, { life:1.2 }); }
    },
    draw(x, dt){
      const t = sc.t; penDrawCamp(x, t, P);
      items.forEach(it => { if(it.n === 'rock'){ cDisc(x, '#14101c', it.x, it.y, 8); cDisc(x, '#8a8a9a', it.x, it.y, 7); cDisc(x, '#b8b8c8', it.x - 2, it.y - 2, 3); } else { const im = penImgEl('assets/items/' + it.img + '.png'); if(im.complete) x.drawImage(im, it.x - 14, it.y - 14, 28, 28); } });
      penMonDraw(x, id, stun ? PANIM.sad : Math.abs(tx - mx) > 2 ? PANIM.walk : PANIM.idle, t, face, mx, 134, 3);
      if(stun) cTxt(x, '✦', mx, 92 + Math.sin(t*20)*2, { sz:12, al:'center', col:'#ffe27a' });
      pop.forEach(p => { x.globalAlpha = Math.max(0, 1 - p.t); cTxt(x, p.s, p.x, p.y, { sz:11, al:'center', col:p.c }); }); x.globalAlpha = 1;
      cPanel(x, CV.l + 8, CV.t + 8, 96, 30, '#241a44'); cTxt(x, 'Score ' + score, CV.l + 14, CV.t + 11, { sz:10, col:'#ffe27a' }); cTxt(x, Math.ceil(Math.max(0, time)) + ' s', CV.l + 14, CV.t + 24, { sz:8 }); if(combo >= 3) cTxt(x, 'x' + combo, CV.l + 80, CV.t + 24, { sz:8, col:'#ff9af0' });
      if(time > 20) cTxt(x, 'Glisse pour attraper les baies !', CV.cx, CV.t + 50, { sz:9, al:'center', col:'#fff3d0' });
      if(phase === 'end' && res){ x.fillStyle = 'rgba(10,6,40,.62)'; x.fillRect(CV.l, CV.t, CV.W, CV.H); cPanel(x, CV.cx - 90, 42, 180, 90, '#fff3d8'); cRect(x, '#e8502c', CV.cx - 90, 42, 180, 16); cTxt(x, 'ATTRAPE-BAIES', CV.cx, 44, { sz:9, al:'center' });
        cTxt(x, 'Score : ' + score, CV.cx, 66, { sz:13, al:'center', col:'#7a4a10', sh:false }); cTxt(x, '+' + res.coins + ' Pokédollars', CV.cx, 86, { sz:9, al:'center', col:'#b8860b', sh:false }); cTxt(x, 'Bonheur +' + Math.round(res.joy), CV.cx, 98, { sz:9, al:'center', col:'#d83a8a', sh:false }); if(t0 > .8) cTxt(x, 'Touche pour continuer', CV.cx, 118, { sz:7, al:'center', col:'#7a4a10', sh:false }); }
    }
  };
  function end(){ sc.finished = true; onEnd(); }
  sc.pen = 1; conRun(sc);
}
