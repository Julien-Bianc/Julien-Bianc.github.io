// ============================================================
//  shop.js — MAGASIN (caisses payées en Pokédollars), animation d'ouverture façon CS2,
//  INVENTAIRE en 2 onglets : Objets (objets tenus, revente) et Classeur (cartes Pokémon, cartes manquantes).
//  Données : data/shop.js (caisses), data/items.js (objets tenus), data/economy.js (prix, gains).
//  Sauvegarde : Save.coins() / Save.addItem() / Save.sell() (js/save.js).
//  Écrans enregistrés : SCREENS.shop, SCREENS.inventory.
// ============================================================
const _shopCache = {};
const mkc = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v)*t).toString(16).padStart(2, '0')).join(''); };

// ---------- porte-monnaie ----------
const walletHtml = () => `<span class='coin' id='wal'><i></i>${money(Save.coins())}</span>`;
const refreshWallet = () => { const w = document.getElementById('wal'); if(w) w.innerHTML = '<i></i>' + money(Save.coins()); };
const coinSfx = () => { if(!AU.ctx) return; tone(1320, .07, 'square', .05); tone(1760, .16, 'square', .05, 0, .07); };

// ---------- sprite de la caisse (40×32) : coffre doré, sangles sombres, cadenas ----------
function crateImg(){
  if(_shopCache.crate) return _shopCache.crate;
  const c = mkc(40, 32), x = c.getContext('2d'), R = (a, b, w, h, col) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  const HL = '#fff0b0', L1 = '#ffd86a', M1 = '#f0a82c', D1 = '#b8701a', D2 = '#7a4512', S = '#9aa7b8';
  R(4, 3, 32, 26, OL);                                   // contour
  R(5, 4, 30, 6, L1); R(5, 4, 30, 1, HL);                // dessus du couvercle
  R(5, 10, 30, 5, M1); R(5, 15, 30, 1, D1);              // façade du couvercle
  R(5, 16, 30, 12, M1); R(5, 25, 30, 3, D1);             // corps
  R(5, 10, 1, 18, L1); R(34, 10, 1, 18, D1);             // arêtes gauche/droite
  [[9, 11], [27, 11]].forEach(([a]) => { R(a, 4, 4, 24, D2); R(a, 4, 1, 24, D1); R(a + 3, 4, 1, 24, OL); });   // sangles
  R(16, 11, 8, 9, OL); R(17, 12, 6, 7, S); R(17, 12, 6, 1, '#d8e0ea'); R(17, 18, 6, 1, '#6c7889'); R(19, 14, 2, 3, OL);   // cadenas
  for(let k = 0; k < 5; k++){ R(20 - k - 1, 21 + k, 2*k + 2, 1, OL); }   // emblème (triangle)
  for(let k = 1; k < 4; k++){ R(20 - k, 22 + k, 2*k, 1, '#e8603c'); }
  [[6, 5], [33, 5], [6, 26], [33, 26]].forEach(([a, b]) => R(a, b, 1, 1, HL));   // rivets
  return _shopCache.crate = c.toDataURL();
}


// ---------- illustration des cartes : une POSE différente selon la rareté, recadrée et centrée ----------
//  C  = au repos (Idle), de face.  PC = en pleine attaque.  R = attaque spéciale / pose de puissance.
//  Pour choisir toi-même la pose d'un Pokémon : dans data/pokemon*.js, ajoute par exemple
//    cards:{ PC:{ anim:'Strike', frame:2, dir:1 }, R:{ anim:'Pose' } }
//  anim = nom d'une animation du dossier (voir AnimData.xml), frame = numéro d'image (défaut : image de frappe ou milieu),
//  dir = direction 0 bas, 1 bas-droite, 2 droite … 7 bas-gauche.
const CARD_POSE = {
  C:  { anims:['Idle'],                                                  dir:0, frame:0 },
  PC: { anims:['Attack', 'Strike', 'MultiScratch', 'QuickStrike', 'Swing'], dir:1, frame:'hit' },
  R:  { anims:['SpAttack', 'Shoot', 'Charge', 'RearUp', 'Twirl'], dir:7, frame:'mid' }
};
const ART_W = 94, ART_H = 78;                                               // taille de la zone d'illustration de la carte
function cardPose(pid, r){
  const S = SPR[pid], P = CARD_POSE[r] || CARD_POSE.C, ov = (S && S.def.cards && S.def.cards[r]) || {};
  if(!S) return null;
  const ok = n => { const a = n && resolveAnim(S, n); return a && S.IM[a] && S.D.anim[a] ? a : null; };
  let an = ok(ov.anim);
  if(!an){
    const used = r === 'R' ? cardPose(pid, 'PC') : null;                    // la rare évite la même animation que la peu commune
    an = P.anims.map(ok).find(a => a && (!used || a !== used.an)) || P.anims.map(ok).find(Boolean) || 'Idle';
  }
  const d = S.D.anim[an], n = d.dur.length, f = ov.frame ?? P.frame;
  let fi = f === 'hit' ? (d.hit ?? Math.floor(n/2)) : f === 'mid' ? Math.floor(n/2) : +f || 0;
  return { an, fi:Math.max(0, Math.min(n - 1, fi)), dir:ov.dir ?? P.dir };
}
// découpe une image d'animation : cadre serré autour des pixels visibles + échelle entière qui tient dans la zone
function poseCrop(S, an, fi, dir){
  const d = S.D.anim[an], im = S.IM[an]; if(!d || !im || !im.naturalWidth) return null;
  const nr = Math.floor(im.naturalHeight/d.fh), row = nr >= 8 ? dir : 0;
  const t = mkc(d.fw, d.fh), x = t.getContext('2d', { willReadFrequently:true });
  x.drawImage(im, fi*d.fw, row*d.fh, d.fw, d.fh, 0, 0, d.fw, d.fh);
  const px = x.getImageData(0, 0, d.fw, d.fh).data;
  let x0 = d.fw, y0 = d.fh, x1 = -1, y1 = -1;
  for(let yy = 0; yy < d.fh; yy++) for(let xx = 0; xx < d.fw; xx++) if(px[(yy*d.fw + xx)*4 + 3] > 0){ if(xx < x0) x0 = xx; if(xx > x1) x1 = xx; if(yy < y0) y0 = yy; if(yy > y1) y1 = yy; }
  if(x1 < 0) return null;
  const w = x1 - x0 + 1, h = y1 - y0 + 1, fit = Math.min(ART_W*.9/w, ART_H*.9/h);
  return { t, x0, y0, w, h, k:fit >= 1 ? Math.floor(fit) : fit };
}
function cardArt(pid, r){
  const key = 'art' + pid + r; if(_shopCache[key]) return _shopCache[key];
  const S = SPR[pid], ps = cardPose(pid, r);
  if(!ps) return _shopCache[key] = spr(pid).toDataURL();
  let c = poseCrop(S, ps.an, ps.fi, ps.dir);
  // garde-fou : si la pose sort plus petite que la pose de repos (effet ou pixel isolé loin du Pokémon), on prend une autre image
  const base = poseCrop(S, 'Idle', 0, 0), want = base ? base.k : 1;
  if(!(S.def.cards && S.def.cards[r] && S.def.cards[r].frame != null) && (!c || c.k < want)){
    const n = S.D.anim[ps.an].dur.length;
    for(let i = 1; i < n && (!c || c.k < want); i++){ const q = poseCrop(S, ps.an, (ps.fi + i) % n, ps.dir); if(q && (!c || q.k > c.k)) c = q; }
  }
  if(!c) return _shopCache[key] = spr(pid).toDataURL();
  const out = mkc(ART_W, ART_H), o = out.getContext('2d'); o.imageSmoothingEnabled = false;
  o.drawImage(c.t, c.x0, c.y0, c.w, c.h, Math.round((ART_W - c.w*c.k)/2), Math.round((ART_H - c.h*c.k)/2), c.w*c.k, c.h*c.k);
  return _shopCache[key] = out.toDataURL();
}

// ---------- carte de collection (format carte Pokémon, en HTML pour de beaux effets holo) ----------
const spriteURL = id => _shopCache['sp' + id] || (_shopCache['sp' + id] = spr(id).toDataURL());
const SYM = { C:'●', PC:'◆', R:'★', UR:'✦' };
function cardHtml(it, s){
  if(it.legend && typeof legendHtml === 'function') return legendHtml(it, s);
  const D = POKEMON[it.poke]; if(!D) return '';
  const c0 = COL[D.types[0]] || '#999', R = RAR[it.r];
  const body = mixHex(c0, '#ffffff', .4), a1 = mixHex(c0, '#ffffff', .15), a2 = mixHex(c0, '#000000', .72);
  const dots = D.types.map(t => `<i class='td' style='background:${COL[t] || '#999'}'></i>`).join('');
  const mv = D.moves.map(m => `<div class='tm'><i class='td' style='background:${m.color || COL[m.type] || '#999'}'></i><span>${esc(m.name)}</span><b>${m.power || '—'}</b></div>`).join('');
  const no = String(ORDER.indexOf(it.poke) + 1).padStart(2, '0') + '/' + String(ORDER.length).padStart(2, '0');
  return `<div class='cw r-${it.r}' data-card='${it.id}' style='--cs:${s}'><div class='tcg'><div class='tin' style='background:${body}'>
    <div class='th'><b>${esc(D.name)}</b><span>PV ${D.hp}${dots}</span></div>
    <div class='ta' style='background:radial-gradient(ellipse at 50% 90%,${a1},${a2})'><img src='${cardArt(it.poke, it.r)}'></div>
    <div class='ti'>${D.types.map(t => TN[t] || t).join('/')} · Vit. ${D.speed}</div>
    <div class='tmv'>${mv}</div>
    <div class='tf'><span>${no}</span><span class='ts' style='color:${R.col}'>${SYM[it.r]}</span></div></div>
    <u class='rb'></u><u class='sh'></u><u class='sp'></u></div></div>`;
}
// carte légendaire pas encore obtenue : cadre doré et silhouette noire du Pokémon (on ne la voit pas encore)
function legShadow(it, size){
  return `<button class='itc cd ${size === 'mini' ? 'mini' : ''} legsh ${size === 'big' ? 'big' : ''}' data-id='${it.id}' style='${rarCss(it.r)}'><span class='lsf'><img src='${cardArt(it.poke, 'R')}'><b>?</b></span><i class='bar'></i></button>`;
}
// image d'un objet (objet tenu → PNG de assets/items/, sinon la caisse)
const imgOf = it => it.kind === 'capsule' ? capIcon(it) : it.kind === 'ball' && typeof ballImg === 'function' ? ballImg(it.ball) : it.img ? 'assets/items/' + it.img + '.png' : crateImg();
// aperçu animé d'une Capsule Ball (js/capsules.js) ; pid = Pokémon de démonstration
const demoPoke = () => STARTERS.find(id => ORDER.includes(id)) || ORDER[0];
const capPrev = (id, w, h, pid) => `<canvas class='cprev' width='${w || 260}' height='${h || 150}' data-cap='${id}' data-poke='${pid || demoPoke()}'></canvas>`;
// visuel d'un objet : carte (échelle s) ou image
const itemVisual = (it, s) => it.kind === 'card' ? cardHtml(it, s) : `<img src='${imgOf(it)}'>`;
const crateNames = it => (it.crates || []).map(id => CRATE[id] && CRATE[id].name).filter(Boolean);
const sellPrice = it => ECONOMY.sell[it.r] || 0;

// ---------- cartes de la grille / de la bande ----------
const rarCss = r => `--rc:${RAR[r].col}`;
function itemCard(it, o){
  o = o || {};
  const cd = it.kind === 'card' ? 'cd ' : '';
  if(o.locked) return `<button class='itc ${cd}locked ${o.cls || ''}' data-id='${it.id}' style='${rarCss(it.r)}'><span class='q'>?</span><i class='bar'></i></button>`;
  return `<button class='itc ${cd}r-${it.r} ${o.cls || ''}' data-id='${it.id}' title="${esc(it.name)}" style='${rarCss(it.r)}'>${itemVisual(it, o.s || .4)}${o.n > 1 ? `<span class='cnt'>×${o.n}</span>` : ''}<i class='bar'></i></button>`;
}
const pctTxt = p => { const v = p*100; return (v >= 10 || v % 1 === 0 ? v.toFixed(v % 1 === 0 ? 0 : 1) : v.toFixed(v < 1 ? 2 : 1)).replace('.', ',') + ' %'; };
const rateChips = c => { const o = crateOdds(c); return RARITY.filter(r => o[r.id] > 0).map(r => `<span class='tag' style='background:${r.col};color:#fff'>${r.label} ${pctTxt(o[r.id])}</span>`).join(' '); };

// ---------- sons : de plus en plus spectaculaires avec la rareté ----------
const shopTick = () => { if(!AU.ctx) return; tone(1400, .025, 'square', .05); tone(520, .04, 'triangle', .07, -120); };
function shopSuspense(r){
  if(AU.ctx && r === 'S'){                                                     // secret : grondement qui monte + battements de cœur
    tone(70, 3.1, 'sawtooth', .07, 260); tone(105, 3.1, 'sawtooth', .04, 400, .2); noise(3, .12, 300, 3000, 'bandpass');
    [0, .55, 1.05, 1.5, 1.9, 2.25, 2.55, 2.8, 3].forEach((d, i) => { tone(58, .14, 'sine', .4, -20, d); tone(52, .12, 'sine', .3, -20, d + .12); });
    return;
  }
  if(!AU.ctx || r === 'C') return; tone(180, r === 'UR' ? 1.6 : .9, 'sawtooth', .04, r === 'UR' ? 900 : 400); }
function shopReveal(r){
  if(!AU.ctx) return;
  const arp = (fr, step, v) => fr.forEach((f, i) => { tone(f, .24, 'square', v, 0, i*step); tone(f/2, .24, 'triangle', v*1.2, 0, i*step); });
  if(r === 'C'){ arp([660, 880], .09, .07); }
  else if(r === 'PC'){ arp([660, 880, 1100], .09, .08); noise(.25, .1, 6000, 2000, 'highpass', .1); }
  else if(r === 'R'){ arp([523, 659, 784, 1047, 1319], .08, .09); noise(.6, .2, 7000, 1200, 'highpass', .05); tone(110, .4, 'sine', .25, -40); }
  else if(r === 'S'){                                                         // secret : accord triomphal + carillon + souffle
    tone(55, 1.6, 'sine', .55, -20); noise(1.6, .4, 4000, 120, 'lowpass');
    [[523, 659, 784], [587, 740, 880], [659, 831, 988, 1319]].forEach((ch, k) => ch.forEach(f => { tone(f, .9, 'triangle', .07, 0, .25 + k*.32); tone(f*2, .5, 'sine', .03, 0, .25 + k*.32); }));
    arp([1319, 1568, 1976, 2637, 3136, 3951], .06, .05); [0, .4, .8, 1.2].forEach(d => noise(.5, .2, 9000, 2500, 'highpass', d + .3));
  }
  else { arp([392, 523, 659, 784, 1047, 1319, 1568, 2093], .07, .1); noise(1.1, .3, 3000, 150, 'lowpass'); tone(70, .9, 'sine', .45, -30); tone(98, .8, 'sawtooth', .1, 60, .1); [0, .3, .6].forEach(d => noise(.4, .22, 8000, 1500, 'highpass', d + .1)); }
}

// ---------- confettis (canvas demi-résolution = gros pixels, comme le reste du jeu) ----------
const CONF = {
  C:  { waves:[[0, 22]],                                  cols:['#4b69ff', '#9fb4ff', '#ffffff'],                         v:[90, 230],  sz:[2, 3], fl:0 },
  PC: { waves:[[0, 55]],                                  cols:['#8847ff', '#c9a8ff', '#ffffff'],                         v:[120, 320], sz:[2, 4], fl:.25 },
  R:  { waves:[[0, 90], [.3, 80]],                        cols:['#d32ce6', '#ff9af0', '#ffe27a', '#ffffff'],              v:[150, 400], sz:[2, 4], fl:.5 },
  UR: { waves:[[0, 150], [.25, 150], [.55, 150], [.9, 170]], rain:2.6, cols:['#eb4b4b', '#ff7b7b', '#b01e1e', '#ffd0d0', '#ffb43c'], v:[200, 700], sz:[2, 5], fl:.95 },
  S:  { waves:[[0, 220], [.2, 200], [.45, 200], [.75, 220], [1.1, 240], [1.6, 200]], rain:5, cols:['#ffd23f', '#fff2b0', '#ffb400', '#ffffff', '#ffe27a', '#c88a10'], v:[250, 820], sz:[2, 6], fl:1 }
};
function shopConfetti(r){
  const m = document.getElementById('menu'), cf = CONF[r]; if(!m || !cf) return;
  const cv = document.createElement('canvas'); cv.className = 'cfx'; cv.width = Math.ceil(m.clientWidth/2); cv.height = Math.ceil(m.clientHeight/2); m.appendChild(cv);
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, P = [], rnd = (a, b) => a + Math.random()*(b - a), pick = a => a[Math.floor(Math.random()*a.length)];
  const waves = cf.waves.map(w => ({ t:w[0], n:w[1], done:false }));
  const piece = (px, py, vx, vy) => P.push({ x:px, y:py, vx, vy, w:Math.round(rnd(cf.sz[0], cf.sz[1])), h:Math.round(rnd(cf.sz[0], cf.sz[1])), c:pick(cf.cols), ph:rnd(0, 6.28), vph:rnd(6, 14) });
  let t0 = performance.now(), prev = t0, rainAcc = 0;
  const frame = now => {
    if(!cv.isConnected) return;
    const dt = Math.min(.05, (now - prev)/1000), t = (now - t0)/1000; prev = now;
    waves.forEach(w => { if(!w.done && t >= w.t){ w.done = true; for(let i = 0; i < w.n; i++){ const a = rnd(0, 6.283), v = rnd(cf.v[0], cf.v[1])/2; piece(W/2, H*.5, Math.cos(a)*v*1.3, Math.sin(a)*v - v*.35); } } });
    if(cf.rain && t < cf.rain){ rainAcc += dt*70; while(rainAcc >= 1){ rainAcc--; piece(rnd(0, W), -4, rnd(-12, 12), rnd(20, 70)); } }
    x.clearRect(0, 0, W, H);
    if(cf.fl && t < .45){ x.fillStyle = r === 'UR' ? `rgba(255,60,60,${cf.fl*(1 - t/.45)})` : r === 'S' ? `rgba(255,214,90,${cf.fl*(1 - t/.45)})` : `rgba(255,255,255,${cf.fl*(1 - t/.45)*.5})`; x.fillRect(0, 0, W, H); }
    for(let i = P.length - 1; i >= 0; i--){
      const q = P[i]; q.vy += 260*dt; q.vx *= 1 - .9*dt; q.vy *= 1 - .25*dt; q.x += q.vx*dt; q.y += q.vy*dt; q.ph += q.vph*dt;
      if(q.y > H + 6){ P.splice(i, 1); continue; }
      x.fillStyle = q.c; x.fillRect(Math.round(q.x), Math.round(q.y), Math.max(1, Math.round(q.w*Math.abs(Math.cos(q.ph)))), q.h);   // « bascule » du confetti
    }
    if(P.length || t < (cf.rain || 0) || waves.some(w => !w.done)) requestAnimationFrame(frame); else cv.remove();
  };
  requestAnimationFrame(frame);
}


// ---------- SECRET : avant la révélation, l'écran plonge dans le noir, une faille dorée s'ouvre et explose ----------
function secretIntro(done){
  const app = document.getElementById('app'), d = document.createElement('div'); d.id = 'secretfx';
  d.innerHTML = `<div class='sf-crack'></div><div class='sf-core'></div><div class='sf-txt'>???</div><canvas class='sf-cv'></canvas>`;
  app.appendChild(d); app.classList.add('quake2');
  const cv = d.querySelector('canvas'); cv.width = Math.ceil(app.clientWidth/2); cv.height = Math.ceil(app.clientHeight/2);
  const x = cv.getContext('2d'), W = cv.width, H = cv.height, t0 = performance.now(), cols = ['#ffd23f', '#fff2b0', '#ffb400', '#ffffff'];
  const P = Array.from({ length:160 }, (_, i) => ({ a:Math.random()*6.283, v:40 + Math.random()*260, s:1 + Math.random()*3, c:cols[i % 4], d:Math.random()*.4 }));
  if(AU.ctx){ tone(40, 1.2, 'sawtooth', .1, 400); noise(1.2, .2, 200, 4000, 'bandpass'); }
  const f = now => {
    if(!d.isConnected) return; const t = (now - t0)/1000; x.clearRect(0, 0, W, H);
    if(t < 1.15){                                                              // particules aspirées vers le centre
      x.globalCompositeOperation = 'lighter';
      P.forEach(p => { const k = Math.max(0, 1 - Math.max(0, t - p.d)/.9), r = 20 + p.v*k*1.4; x.globalAlpha = (1 - k)*.9; x.fillStyle = p.c; x.fillRect(W/2 + Math.cos(p.a + t*2)*r, H/2 + Math.sin(p.a + t*2)*r*.7, p.s, p.s); });
      requestAnimationFrame(f);
    } else if(!d.dataset.boom){
      d.dataset.boom = 1; d.classList.add('boom'); app.classList.remove('quake2');
      if(AU.ctx){ noise(.5, .45, 6000, 200, 'lowpass'); tone(65, .7, 'sine', .5, -30); }
      setTimeout(() => { d.remove(); done(); }, 260);
    }
  };
  requestAnimationFrame(f);
}

// ============================================================
//  ÉCRAN MAGASIN
// ============================================================
function showShop(){
  shopBuild();
  const have = Save.coins();
  menu(`<div class='hd'><h1>Magasin</h1>${walletHtml()}</div><div class='mlist shoplist'>${SHOP.map(o => {
      const c = CRATE[o.crate], ok = have >= c.price;
      return `<button class='mbtn offer' data-o='${o.id}'><img class='cr' src='${crateImg()}'><b>${esc(o.label)}</b><small>${esc(o.desc || '')}</small><span class='tag ${ok ? '' : 'bad'}'>${c.price ? money(c.price) : 'Gratuit'}</span></button>`;
    }).join('')}</div>
    <p class='hint'>Gagne des ${ECONOMY.name} en remportant des niveaux Solo (bonus au premier passage).</p>
    <div class='row'><button class='btn2' id='inv'>Inventaire</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-o]', el => showCrate(SHOP.find(o => o.id === el.dataset.o).crate));
  document.getElementById('inv').onclick = () => showInventory({ back:showShop });
  document.getElementById('back').onclick = showMain;
}

// ---------- aperçu d'une caisse : emplacements, chances, contenu possible ----------
function showCrate(id){
  shopBuild();
  const c = CRATE[id], have = Save.coins(), ok = have >= c.price;
  const slots = c.slots.filter(s => s.pool.length).sort((a, b) => RANK[b.r] - RANK[a.r]);
  menu(`<div class='hd'><h1>${esc(c.name)}</h1>${walletHtml()}</div>
    <div class='crv'><div class='crl'><img class='cr big' src='${crateImg()}'><div class='crates'>${rateChips(c)}</div></div>
    <div class='crr scroll'>${slots.map(s => `<div class='slt' style='${rarCss(s.r)}'>
      <div class='slh'><b>${esc(s.label)}</b><span>${pctTxt(slotPct(c, s))}</span></div>
      <div class='igrid slp'>${s.hidden || (RAR[s.r] && RAR[s.r].hidden) ? `<span class='secret-q'>?</span><small class='secret-t'>Contenu secret… À toi de le découvrir.</small>`
        : s.pool.slice().sort((a, b) => (a.name > b.name) - (a.name < b.name)).map(it => it.legend && !(Save.itemCount(it.id) > 0) ? legShadow(it, 'mini') : itemCard(it, { s:.3, cls:'mini' })).join('')}</div></div>`).join('')}</div></div>
    <div class='row'><button class='btn' id='op' ${ok ? '' : 'disabled'}>${c.price ? 'Ouvrir — ' + money(c.price) : 'Ouvrir — Gratuit'}</button><button class='btn2' id='back'>Retour</button></div>
    ${ok ? '' : `<p class='hint bad'>Il te manque ${money(c.price - have)} : remporte des niveaux en Solo !</p>`}`);
  bindAll('.slp .itc', el => showItemPeek(el.dataset.id, () => showCrate(id)));
  document.getElementById('op').onclick = () => openCrate(id);
  document.getElementById('back').onclick = showShop;
}
// petite fiche d'un objet vu depuis l'aperçu d'une caisse
function showItemPeek(itemId, back){
  const it = ITEM[itemId]; if(!it) return back();
  const n = Save.itemCount(it.id);
  if(it.legend && !n){                                                           // carte légendaire pas encore obtenue : seulement son ombre
    menu(`<div class='peek' style='${rarCss(it.r)}'><div class='pkv'>${legShadow(it, 'big')}</div>
      <div class='rvt'><b class='rn' style='color:${RAR[it.r].col}'>Carte Légendaire ???</b><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span>
      <p>Une carte légendaire animée… Qui se cache dans l'ombre ? Ouvre des caisses pour le découvrir.</p>
      <div class='row'><button class='btn2' id='back'>Retour</button></div></div></div>`);
    document.getElementById('back').onclick = back; return;
  }
  menu(`<div class='peek' style='${rarCss(it.r)}'><div class='pkv r-${it.r}'>${it.kind === 'card' ? cardHtml(it, 1) : it.kind === 'capsule' ? capPrev(it.id) : `<img class='ric' src='${imgOf(it)}'>`}</div>
    <div class='rvt'><b class='rn' style='color:${RAR[it.r].col}'>${esc(it.name)}</b><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span>
    ${it.desc ? `<p>${esc(it.desc)}</p>` : ''}<p>${n ? 'Possédé : ×' + n : 'Pas encore obtenu'}</p>
    <div class='row'><button class='btn2' id='back'>Retour</button></div></div></div>`);
  mountCapPreviews();
  document.getElementById('back').onclick = back;
}

// ============================================================
//  OUVERTURE DE LA CAISSE (animation façon CS2)
//  Une bande défile vers la gauche, ralentit, et s'arrête sous la ligne jaune : l'objet sous la ligne est gagné.
//  Le paiement et le tirage sont faits AVANT l'animation et l'objet est ajouté tout de suite (quitter ne fait rien perdre).
// ============================================================
const SHOP_CW = 72, SHOP_DUR = 6500, SUSPENSE = { C:500, PC:900, R:1300, UR:2000, S:3200 };
function openCrate(id){
  shopBuild();
  const c = CRATE[id]; if(!c) return;
  if(c.price && !Save.spend(c.price)) return showCrate(id);
  if(c.price) coinSfx();
  const win = rollItem(c), gid = win.give ? win.give.id : win.id, isNew = Save.itemCount(gid) === 0, n = Save.addItem(gid, win.give ? win.give.n : 1); Save.countOpen();   // lot de Balls : va dans l'inventaire Safari
  const N = 54, wi = 42 + Math.floor(Math.random()*6);                       // position de l'objet gagnant dans la bande
  const filler = () => { let it; for(let k = 0; k < 20; k++){ it = rollItem(c); if(!(RAR[it.r] && RAR[it.r].hidden) && !(it.legend && !(Save.itemCount(it.id) > (it === win ? 1 : 0)))) break; } return it; };   // jamais d'objet secret en décor
  const strip = Array.from({ length:N }, (_, i) => i === wi ? win : filler());

  menu(`<h1>Ouverture de la caisse</h1><small class='sub'>${esc(c.name)} · ${c.price ? '−' + money(c.price) : 'gratuite'}</small>
    <div class='sview' id='sv' style='${rarCss(win.r)}'><div class='strip' id='st'>${strip.map((it, i) => itemCard(it, { s:.5, cls:'sc' + (i === wi ? ' win' : '') })).join('')}</div><div class='sline'></div></div>
    <div class='row' id='act'><button class='btn2' id='skip'>Passer</button></div>`);

  const sv = document.getElementById('sv'), st = document.getElementById('st'), vw = sv.offsetWidth || 480;
  const target = wi*SHOP_CW + SHOP_CW*(.12 + Math.random()*.76) - vw/2;      // la ligne tombe n'importe où dans la carte gagnante
  let t0 = performance.now(), lastIdx = -1, done = false, skip = false;
  document.getElementById('skip').onclick = () => { skip = true; };

  const finish = () => {
    done = true; st.style.transform = `translate3d(${-target}px,0,0)`; sv.classList.add('done', 'z-' + win.r);
    if(win.r === 'S'){ const a = document.getElementById('app'); a.classList.add('quake'); setTimeout(() => a.classList.remove('quake'), SUSPENSE.S); st.querySelector('.win').classList.add('secret-win'); }
    document.getElementById('act').innerHTML = '';
    shopSuspense(win.r);
    setTimeout(() => { if(sv.isConnected) showReveal(win, isNew, id); }, SUSPENSE[win.r] || 600);
  };
  const frame = now => {
    if(!st.isConnected || done) return;                                       // écran quitté : on arrête
    const t = skip ? 1 : Math.min(1, (now - t0)/SHOP_DUR);
    const e = 1 - Math.pow(1 - t, 4), x = target*e;                          // départ rapide, longue décélération
    st.style.transform = `translate3d(${-x}px,0,0)`;
    const idx = Math.floor((x + vw/2)/SHOP_CW); if(idx !== lastIdx){ lastIdx = idx; if(!skip) shopTick(); }
    if(t >= 1) finish(); else requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- révélation : grande carte + confettis selon la rareté, revente rapide d'un doublon ----------
function showReveal(win, isNew, id){
  if(win.r === 'S' && !showReveal.intro){ showReveal.intro = true; return secretIntro(() => { showReveal(win, isNew, id); showReveal.intro = false; }); }
  const R = RAR[win.r], c = CRATE[id], shake = win.r === 'S' ? 'shk3' : win.r === 'UR' ? 'shk2' : win.r === 'R' ? 'shk1' : '';
  const status = () => { if(win.give) return 'Dans ton sac : ×' + Save.itemCount(win.give.id); const n = Save.itemCount(win.id); return isNew && n === 1 ? 'Nouveau !' : 'Possédé · ×' + n; };
  menu(`<div class='rv r-${win.r} ${shake}' style='${rarCss(win.r)}'>
    <div class='rvc'><div class='rays'></div>${win.r === 'S' ? `<div class='rays r2'></div><div class='srings'><i></i><i></i><i></i></div>` : ''}${win.kind === 'card' ? cardHtml(win, 1.3) : win.kind === 'capsule' ? capPrev(win.id, 280, 170) : `<img class='ric' src='${imgOf(win)}'>`}</div>
    <div class='rvt'><small>${esc(c.name)}</small><b class='rn' style='color:${R.col}'>${esc(win.name)}</b>
      ${win.r === 'S' ? `<div class='sstamp'>SECRET</div>` : ''}
      <div><span class='tag' style='background:${R.col};color:${win.r === 'S' ? '#3a2400' : '#fff'}'>${R.label}</span> ${win.kind === 'held' ? `<span class='tag'>Objet tenu</span>` : win.kind === 'capsule' ? `<span class='tag'>Capsule Ball</span>` : win.legend ? `<span class='tag legtag'>Carte Légendaire</span>` : ''}</div>
      ${win.desc ? `<p class='idesc'>${esc(win.desc)}</p>` : ''}
      <p id='rst'>${status()}</p>
      ${win.use ? `<div class='row left'><button class='btn' id='useit'>✦ Utiliser maintenant</button></div>` : ''}${win.legend ? `<p class='hint'>Touche la carte pour la voir en grand.</p>` : ''}
      <div class='row'><button class='btn' id='again'>Rouvrir${c.price ? ' — ' + money(c.price) : ''}</button><button class='btn2' id='sell'></button></div>
      <div class='row'><button class='btn2' id='inv'>Inventaire</button><button class='btn2' id='cl'>Fermer</button>${walletHtml()}</div></div></div>`);
  shopReveal(win.r); shopConfetti(win.r); mountCapPreviews();
  const sb = document.getElementById('sell'), ag = document.getElementById('again');
  const upd = () => {
    const s = win.give ? 0 : Save.sellable(win.id); sb.style.display = win.give ? 'none' : ''; sb.disabled = !s; sb.textContent = s ? `Vendre le doublon (+${money(sellPrice(win))})` : 'Pas de doublon';
    ag.disabled = Save.coins() < c.price; document.getElementById('rst').textContent = status(); refreshWallet();
  };
  upd();
  sb.onclick = () => { if(Save.sell(win.id, 1, sellPrice(win))){ coinSfx(); upd(); } };
  ag.onclick = () => openCrate(id);
  const ui = document.getElementById('useit'); if(ui) ui.onclick = () => useSpecial(win, () => showCrate(id));
  document.getElementById('inv').onclick = () => showInventory({ tab:win.kind === 'card' ? 'binder' : 'items', sel:win.id, back:() => showCrate(id) });
  document.getElementById('cl').onclick = () => showCrate(id);
}

// ============================================================
//  INVENTAIRE — 2 onglets
//    Objets   : tous les objets tenus du jeu (ceux qu'on n'a pas encore sont cachés « ? »), détail, revente des doublons
//    Classeur : une page par Pokémon avec ses 3 cartes (commune, peu commune, rare) ; les cartes manquantes en silhouette
//  o = { tab:'items'|'binder', sel:idObjet, back:fonction, filter:'all'|'have'|'miss' }
// ============================================================
function showInventory(o){
  shopBuild();
  o = Object.assign({ tab:'items', sel:null, back:showMain, filter:'all' }, o && typeof o === 'object' ? o : {});
  if(typeof o.back !== 'function') o.back = showMain;
  const inv = Save.inv(), all = Object.values(ITEM);
  const cards = all.filter(it => it.kind === 'card'), caps = all.filter(it => it.kind === 'capsule');
  const helds = all.filter(it => it.kind === 'held' || (it.kind === 'special' && !(RAR[it.r] && RAR[it.r].hidden && !(inv[it.id] > 0))));   // un objet secret n'apparaît qu'une fois obtenu
  const nHave = list => list.filter(it => inv[it.id] > 0).length;
  const tabs = `<div class='tabs'><button class='btn2 ${o.tab === 'items' ? 'on' : ''}' data-tab='items'>Objets ${nHave(helds)}/${helds.length}</button><button class='btn2 ${o.tab === 'caps' ? 'on' : ''}' data-tab='caps'>Capsules ${nHave(caps)}/${caps.length}</button><button class='btn2 ${o.tab === 'binder' ? 'on' : ''}' data-tab='binder'>Classeur ${nHave(cards)}/${cards.length}</button></div>`;
  const body = o.tab === 'binder' ? binderBody(o, inv) : itemsBody(o, inv, o.tab === 'caps' ? caps : helds);
  menu(`<div class='hd'><h1>Inventaire</h1>${tabs}${walletHtml()}</div>${body}<div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-tab]', el => showInventory({ ...o, tab:el.dataset.tab, sel:null }));
  bindAll('[data-f]', el => showInventory({ ...o, filter:el.dataset.f }));
  bindAll('.invw [data-id]', el => showInventory({ ...o, sel:el.dataset.id }));
  const sel = o.sel && ITEM[o.sel];
  const ui = document.getElementById('useit'); if(ui) ui.onclick = () => useSpecial(sel, () => showInventory(o));
  const s1 = document.getElementById('s1'), sa = document.getElementById('sa');
  if(s1) s1.onclick = () => { if(Save.sell(sel.id, 1, sellPrice(sel))){ coinSfx(); showInventory(o); } };
  if(sa) sa.onclick = () => { if(Save.sell(sel.id, Save.sellable(sel.id), sellPrice(sel))){ coinSfx(); showInventory(o); } };
  const fs = document.querySelector('.invw .foc'); if(fs) fs.scrollIntoView({ block:'nearest' });
  mountCapPreviews();
  document.getElementById('back').onclick = o.back;
}

// boutons de revente (on garde toujours 1 exemplaire)
function sellRow(it){
  const s = Save.sellable(it.id), p = sellPrice(it);
  if(!s) return `<p class='hint'>Revente : ${money(p)} par doublon (tu gardes toujours 1 exemplaire).</p>`;
  return `<div class='row left'><button class='btn2' id='s1'>Vendre 1 (+${money(p)})</button>${s > 1 ? `<button class='btn2' id='sa'>Vendre les ${s} doublons (+${money(p*s)})</button>` : ''}</div>`;
}
const whereTxt = it => { const w = crateNames(it); return w.length ? 'Trouvable dans : ' + w.map(esc).join(', ') : 'Pas encore disponible dans une caisse'; };

// ---------- onglet Objets ----------
function itemsBody(o, inv, helds){
  const isCap = o.tab === 'caps', order = isCap ? CAPSULES : HELD;
  const list = helds.slice().sort((a, b) => byRarity(a, b) || order.findIndex(h => h.id === a.id) - order.findIndex(h => h.id === b.id));
  const sp = it => it.kind === 'special' ? `${it.use ? `<div class='row left'><button class='btn' id='useit'>✦ Utiliser</button></div>` : ''}${it.id === 'oeuf-mystere' ? `<p class='hint'>Garde-le précieusement…</p>` : ''}` : '';
  const it = o.sel && ITEM[o.sel] && list.includes(ITEM[o.sel]) ? ITEM[o.sel] : null;
  let detail = isCap
    ? `<p>Les <b>Capsules Ball</b> changent l'arrivée de ton Pokémon dans l'arène (effet quand la Pokéball s'ouvre). Purement visuelles.</p><p>Équipe-les dans <b>Mes équipes</b> : une capsule par Pokémon, la même peut servir à plusieurs.</p>`
    : `<p>Touche un objet pour voir son effet.</p><p>Les objets tenus s'équipent dans <b>Mes équipes</b> (un objet par Pokémon).</p><p>Caisses ouvertes : ${Save.opened()}</p>`;
  if(it && inv[it.id] > 0){
    const hold = isCap ? Save.capHolders(it.id) : Save.holders(it.id);
    detail = `<div class='dh big ${it.kind === 'special' ? 'spc ' + it.id : ''}'><img src='${imgOf(it)}'><div><b style='color:${RAR[it.r].col}'>${esc(it.name)}</b><br><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span></div></div>
      ${isCap ? capPrev(it.id, 240, 140) : ''}<p class='idesc'>${esc(it.desc || '')}</p><p>Possédé : ×${inv[it.id]}</p>${sp(it)}
      <p ${it.kind === 'special' ? "style='display:none'" : ''}>${hold.length ? (isCap ? 'Équipée sur : ' : 'Porté par : ') + hold.map(h => esc(NAME[h.pid] || h.pid) + ' (' + esc(h.team.name) + ')').join(', ') : (isCap ? 'Équipée sur aucun Pokémon' : 'Porté par personne')}</p>
      <p class='hint'>${whereTxt(it)}</p>${sellRow(it)}`;
  } else if(it){
    detail = `<div class='dh big'><span class='qbig' style='${rarCss(it.r)}'>?</span><div><b>${isCap ? 'Capsule inconnue' : 'Objet inconnu'}</b><br><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span></div></div><p class='hint'>${whereTxt(it)}</p>`;
  }
  return `<div class='edit invw'><div class='scroll left igrid'>${list.map(x => inv[x.id] > 0 ? itemCard(x, { n:inv[x.id], cls:x.id === o.sel ? 'foc' : '' }) : itemCard(x, { locked:true, cls:x.id === o.sel ? 'foc' : '' })).join('')}</div>
    <div class='scroll right'>${detail}</div></div>`;
}

// ---------- onglet Classeur ----------
function binderBody(o, inv){
  const owned = id => inv[id] > 0;
  const show = id => o.filter === 'all' || (o.filter === 'have') === owned(id);
  const rows = ORDER.filter(pid => CARD_RARITIES.some(r => show(`card:${pid}:${r}`)) || (ITEM[`card:${pid}:L`] && owned(`card:${pid}:L`) && show(`card:${pid}:L`)));
  const pocket = (pid, r) => {
    const id = `card:${pid}:${r}`, it = ITEM[id], f = id === o.sel ? ' foc' : '';
    if(!show(id)) return `<span class='pk off'></span>`;
    if(owned(id)) return `<button class='pk r-${r}${f}' data-id='${id}' style='${rarCss(r)}'>${cardHtml(it, .4)}${inv[id] > 1 ? `<span class='cnt'>×${inv[id]}</span>` : ''}</button>`;
    return `<button class='pk miss${f}' data-id='${id}' style='${rarCss(r)}'><img src='${cardArt(pid, r)}'><span class='sym'>${SYM[r]}</span></button>`;
  };
  const legOf = pid => ITEM[`card:${pid}:L`];
  const legPocket = pid => {
    const L = legOf(pid); if(!L || !show(L.id) || !owned(L.id)) return '';                    // la carte légendaire reste secrète tant qu'elle n'est pas obtenue
    const f = L.id === o.sel ? ' foc' : '';
    return `<div class='bpl'><span>✦ Légendaire</span>${owned(L.id) ? `<button class='pk leg r-UR${f}' data-id='${L.id}'>${cardHtml(L, .4)}${inv[L.id] > 1 ? `<span class='cnt'>×${inv[L.id]}</span>` : ''}</button>`
      : `<button class='pk miss legm${f}' data-id='${L.id}' style='${rarCss('UR')}'><img src='${cardArt(pid, 'R')}'><span class='sym'>✦</span></button>`}</div>`;
  };
  const it = o.sel && ITEM[o.sel] && ITEM[o.sel].kind === 'card' ? ITEM[o.sel] : null;
  let detail = `<p>Ton classeur : une page par Pokémon, avec ses cartes <b style='color:${RAR.C.col}'>commune</b>, <b style='color:${RAR.PC.col}'>peu commune</b> et <b style='color:${RAR.R.col}'>rare</b>.</p><p>Les cartes manquantes apparaissent en silhouette.</p><p class='hint'>Échanges entre joueurs : bientôt.</p>`;
  if(it && owned(it.id)) detail = `<div class='bdv'>${cardHtml(it, it.legend ? .9 : .85)}<div><b style='color:${RAR[it.r].col}'>${esc(it.name)}</b><br><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span>
      <p>Possédée : ×${inv[it.id]}</p><p class='hint'>${whereTxt(it)}</p></div></div>${sellRow(it)}<div class='row left'><button class='btn2' disabled>Échanger — bientôt</button></div>`;
  else if(it) detail = `<div class='bdv'><div class='pk miss big' style='${rarCss(it.r)}'><img src='${cardArt(it.poke, it.legend ? 'R' : it.r)}'><span class='sym'>${SYM[it.r]}</span></div><div><b>${esc(it.name)}</b><br><span class='tag' style='background:${RAR[it.r].col};color:#fff'>${RAR[it.r].label}</span>
      <p>Pas encore obtenue</p><p class='hint'>${whereTxt(it)}</p></div></div>`;
  return `<div class='row'>${[['all', 'Toutes'], ['have', 'Possédées'], ['miss', 'Manquantes']].map(([k, l]) => `<button class='btn2 sm ${o.filter === k ? 'on' : ''}' data-f='${k}'>${l}</button>`).join('')}</div>
    <div class='edit invw bnd'><div class='scroll left'><div class='bgrid'>${rows.length ? rows.map(pid => `<div class='bpg'><div class='bn'><span>#${String(ORDER.indexOf(pid) + 1).padStart(2, '0')}</span> ${esc(NAME[pid])} <em>${CARD_RARITIES.filter(r => owned(`card:${pid}:${r}`)).length}/${CARD_RARITIES.length}</em></div><div class='bpk'>${CARD_RARITIES.map(r => pocket(pid, r)).join('')}</div>${legPocket(pid)}</div>`).join('') : '<p>Aucune carte ici.</p>'}</div></div>
    <div class='scroll right'>${detail}</div></div>`;
}

SCREENS.shop = showShop;
SCREENS.inventory = () => showInventory();
