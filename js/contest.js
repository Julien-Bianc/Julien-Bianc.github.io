// ============================================================
//  contest.js — CONCOURS POKÉMON : sauvegarde, stats, poffins, rubans, déroulement d'un concours, écrans.
//  Données : data/contest.js. Épreuves jouables : js/contest-scenes.js.
//  Écran enregistré : SCREENS.contest (entrée « Concours Pokémon » de data/menu.js).
//  Les stats de concours n'ont aucun effet en combat. Multijoueur : 1 à 4 joueurs sur le même appareil (à tour de rôle),
//  les places libres sont prises par l'ordinateur. (La structure C.cts permet d'ajouter plus tard un mode en ligne.)
// ============================================================

// ---------- sauvegarde : Save.load().contest ----------
const Con = {
  d(){
    const s = Save.load();
    if(!s.contest){ s.contest = { stats:{}, berries:{ ceriz:2, maron:2, pecha:2, fraive:2, willia:2 }, poffins:[], ribbons:{}, cap:{}, wins:{}, played:0 }; Save.save(); }
    return s.contest;
  },
  stat(pid){ const c = this.d(); if(!c.stats[pid]) c.stats[pid] = { cool:0, beauty:0, cute:0, smart:0, tough:0, sheen:0 }; return c.stats[pid]; },
  capId(pid){ const id = this.d().cap[pid]; return id && CAPSULE_BY_ID[id] && Save.itemCount(id) > 0 ? id : null; },
  cap(pid){ const id = this.capId(pid); return id ? CAPSULE_BY_ID[id] : null; },
  ribbons(pid){ return this.d().ribbons[pid] || []; },
  hasRibbon(rid){ return Object.values(this.d().ribbons).some(l => l.includes(rid)); },
  addRibbon(pid, rid){ const r = this.d().ribbons; if(!r[pid]) r[pid] = []; if(!r[pid].includes(rid)) r[pid].push(rid); Save.save(); },
  unlocked(cat, rank){ return rank === 0 || !!this.d().wins[cat + ':' + (rank - 1)]; },
  berry(id){ return this.d().berries[id] || 0; },
  addBerry(id, n){ const b = this.d().berries; b[id] = Math.max(0, (b[id] || 0) + n); Save.save(); },
  save(){ Save.save(); }
};
const ribbonId = (cat, rank) => cat + '-' + rank;
const ribbonName = (cat, rank) => 'Ruban ' + CSTAT[cat].name + ' ' + CONTEST_RANKS[rank].name;
const catColor = cat => CSTAT[cat].col;

// ---------- petit atelier de pixel art : calques à ombrage 3 tons (lumière haut-gauche) + contour sombre automatique ----------
function pxBuilder(W, H){
  const out = mkc(W, H), ox = out.getContext('2d');
  const layer = (fn, col) => {
    const m = mkc(W, H), mx = m.getContext('2d'); mx.fillStyle = '#fff'; fn(mx); const d = mx.getImageData(0, 0, W, H).data, on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && d[(j*W + i)*4 + 3] > 100;
    const Lc = mixHex(col, '#ffffff', .5), Dc = mixHex(col, '#000000', .45);
    for(let j = 0; j < H; j++) for(let i = 0; i < W; i++){ if(!on(i, j)) continue; ox.fillStyle = (!on(i, j - 1) || !on(i - 1, j)) ? Lc : (!on(i, j + 1) || !on(i + 1, j)) ? Dc : col; ox.fillRect(i, j, 1, 1); }
  };
  const finish = () => {
    const d = ox.getImageData(0, 0, W, H).data, f = mkc(W, H), fx = f.getContext('2d'), on = (i, j) => i >= 0 && j >= 0 && i < W && j < H && d[(j*W + i)*4 + 3] > 100;
    fx.drawImage(out, 0, 0); fx.fillStyle = OL;
    for(let j = 0; j < H; j++) for(let i = 0; i < W; i++) if(!on(i, j) && (on(i - 1, j) || on(i + 1, j) || on(i, j - 1) || on(i, j + 1))) fx.fillRect(i, j, 1, 1);
    return f;
  };
  return { layer, finish, ox, W, H };
};
const pxDisc = (cx, cy, r) => mx => cDisc(mx, '#fff', cx, cy, r);
const pxRing = (n, d, r, off, cx, cy) => mx => { for(let i = 0; i < n; i++){ const a = i*6.2832/n + (off || 0); cDisc(mx, '#fff', cx + Math.cos(a)*d, cy + Math.sin(a)*d, r); } };
const pxPoly = pts => mx => cPoly(mx, pts, '#fff');
const pxStar = (cx, cy, R, r) => { const p = []; for(let i = 0; i < 10; i++){ const a = -Math.PI/2 + i*Math.PI/5, k = i % 2 ? r : R; p.push([cx + Math.cos(a)*k, cy + Math.sin(a)*k]); } return p; };
const mirX = (pts, W) => pts.map(([a, b]) => [W - a, b]);

// ---------- icône de ruban : NŒUD PAPILLON (2 grandes boucles + 2 pans en V) + blason doré, comme les rubans de concours des jeux ----------
//   Normal : nœud simple · Super : boucles intérieures + blason + pans centraux · Hyper : + couronne et liserés dorés · Master : boucles arrière, grande couronne à gemme, pans dorés
function ribbonImg(cat, rank, grey){
  const key = 'rb4' + cat + rank + (grey ? 'g' : ''); if(_cs[key]) return _cs[key];
  const W = 44, H = 42, CX = 22, B = pxBuilder(W, H), L = B.layer, ox = B.ox, dot = (c, a, y, w, h) => { ox.fillStyle = c; ox.fillRect(a, y, w || 1, h || 1); };
  const base = grey ? '#5a5672' : catColor(cat), gold = grey ? '#8a86a2' : '#ffd23f', gem = grey ? '#9a96b2' : (rank === 3 ? '#ff4a6a' : '#ff7ac8');
  const lite = (c, k) => mixHex(c, '#ffffff', k), dark = (c, k) => mixHex(c, '#000000', k), M = pts => mirX(pts, W), both = (pts, col) => { L(pxPoly(pts), col); L(pxPoly(M(pts)), col); };
  const line = (x0, y0, x1, y1, col) => { for(let k = 0; k <= 10; k++){ const u = k/10, px = Math.round(x0 + (x1 - x0)*u), py = Math.round(y0 + (y1 - y0)*u); dot(col, px, py); dot(col, W - 1 - px, py); } };
  // pans centraux droits (rang >= 1)
  if(rank >= 1){ const bt = [33, 36, 38, 41][rank]; const t = [[18, 20], [26, 20], [25, bt - 1], [22, bt - 5], [19, bt - 1]]; L(pxPoly(t), dark(base, .12)); for(let y = 24; y < bt - 6; y++) dot(rank >= 2 ? gold : lite(base, .5), CX, y); if(rank >= 2) dot(gold, 19, bt - 2, 7, 1); }
  // boucles arrière (Master)
  if(rank === 3) both([[21, 12], [17, 3], [11, 0], [5, 0], [1, 4], [0, 11], [4, 16], [12, 18]], dark(base, .3));
  // pans en V (sous le nœud)
  const tail = [[20, 19], [13, 22], [7, 29], [4, 38], [10, 36], [16, 31], [21, 25]]; both(tail, dark(base, .12));
  line(19, 23, 8, 35, dark(base, .45));
  if(rank >= 2) line(20, 23, 9, 34, gold);
  // grandes boucles du haut
  const loop = [[21, 15], [17, 7], [11, 3], [5, 3], [1, 7], [1, 14], [4, 19], [10, 21], [17, 20]]; both(loop, base);
  if(rank >= 1){ const inner = [[19, 15], [16, 9], [11, 6], [6, 6], [3, 9], [3, 14], [6, 17], [11, 18]]; both(inner, lite(base, .26)); }
  line(19, 14, 7, 8, dark(base, .4)); line(19, 17, 6, 15, dark(base, .4));
  // nœud / blason
  if(rank === 0){ L(pxDisc(CX, 16, 4.6), dark(base, .1)); L(pxDisc(CX, 16, 2.6), gold); dot('#fff', CX - 1, 15); }
  else {
    L(pxPoly([[17, 11], [27, 11], [28, 16], [26, 21], [22, 23.5], [18, 21], [16, 16]]), gold);
    L(pxPoly([[19, 13], [25, 13], [26, 16], [24, 20], [22, 21.5], [20, 20], [18, 16]]), lite(gold, .28));
    for(let k = 0; k < 4; k++) dot(dark(gold, .45), 20 + (k % 2)*3, 15 + k);                                       // petit motif gravé
    if(rank === 3){ L(pxDisc(CX, 17, 2.6), gem); dot('#fff', CX - 1, 16); } else if(rank === 2){ dot(gem, CX - 1, 16, 2, 2); }
    if(rank >= 2) L(pxPoly(rank === 3 ? [[16, 11], [16, 4], [19, 7.5], [22, 1], [25, 7.5], [28, 4], [28, 11]] : [[17, 11], [17, 6], [19.5, 8.5], [22, 4], [24.5, 8.5], [27, 6], [27, 11]]), gold);
  }
  const f = B.finish(), fx = f.getContext('2d');
  if(rank === 3 && !grey){ fx.fillStyle = gem; fx.fillRect(22, 1, 1, 1); fx.fillRect(16, 4, 1, 1); fx.fillRect(28, 4, 1, 1); }
  if(rank >= 2 && !grey){ fx.fillStyle = '#fff'; [[3, 1], [41, 2], [1, 36], [43, 34]].forEach(([a, b]) => { fx.fillRect(a, b, 1, 1); fx.fillRect(a - 1, b, 3, 1); fx.fillRect(a, b - 1, 1, 3); }); }
  return _cs[key] = f.toDataURL();
}
const ribbonTag = (cat, rank, earned) => `<img class='rbn' src='${ribbonImg(cat, rank, !earned)}' title='${esc(ribbonName(cat, rank))}'>`;

// ---------- sprites de baies : PNG PokéSprite (assets/items/xxx-berry.png) ; s'il manque, dessin pixel art de secours ----------
function berryProc(b){
  const key = 'bp' + b.id; if(_cs[key]) return _cs[key];
  const B = pxBuilder(32, 32), L = B.layer, ox = B.ox, px = (c, a, y, w, h) => { ox.fillStyle = c; ox.fillRect(a, y, w || 1, h || 1); }, leaf = '#58b838', stem = '#7a4a1a';
  if(b.id === 'mepo'){      // Baie Mepo : fruit en cœur, rouge-orangé
    L(mx => { cDisc(mx, '#fff', 12, 17, 7.5); cDisc(mx, '#fff', 20, 17, 7.5); cPoly(mx, [[5, 19], [27, 19], [16, 30]], '#fff'); }, '#e8602c'); px('#a83a14', 15, 13, 2, 14); px('#a83a14', 9, 17, 1, 6); px('#a83a14', 22, 17, 1, 6);
    L(pxPoly([[16, 11], [21, 3], [27, 5], [22, 11]]), leaf); px(stem, 15, 7, 2, 6);
  } else if(b.id === 'wiki'){   // Baie Wiki : ronde, bleu-violet, calice vert
    L(pxDisc(16, 19, 10), '#6a74d8'); px('#aab4ff', 11, 14, 2, 2); px('#4a54a8', 18, 26, 5, 1); px('#4a54a8', 12, 25, 3, 1);
    L(pxPoly([[9, 12], [13, 6], [16, 10], [19, 6], [23, 12], [16, 14]]), leaf); px(stem, 15, 3, 2, 5);
  } else if(b.id === 'kika'){   // Baie Kika : croissant rose
    L(mx => { cDisc(mx, '#fff', 16, 18, 11); mx.globalCompositeOperation = 'destination-out'; cDisc(mx, '#000', 22, 12, 7); }, '#f08ab4'); px('#ffd0e4', 8, 16, 2, 4); px('#c85a8a', 12, 27, 6, 1);
    L(pxPoly([[9, 9], [4, 4], [11, 5], [14, 9]]), leaf);
  } else if(b.id === 'gowav'){  // Baie Gowav : cône vert
    L(mx => { cPoly(mx, [[16, 4], [25, 20], [16, 29], [7, 20]], '#fff'); cDisc(mx, '#fff', 16, 21, 9); }, '#58b858'); for(let k = 0; k < 5; k++) px('#388848', 11 + k*2, 14 + k*3, 1, 3); px('#b0f0b0', 12, 17, 2, 3);
    L(pxPoly([[16, 5], [22, 0], [24, 6], [18, 8]]), '#3a9c4e'); px(stem, 15, 4, 2, 4);
  } else if(b.id === 'papaya'){ // Baie Papaya : ananas jaune quadrillé
    L(mx => { mx.beginPath(); mx.ellipse(16, 20, 9, 10, 0, 0, 6.283); mx.fill(); }, '#e8c82c');
    for(let j = 11; j < 30; j++) for(let i = 7; i < 25; i++){ const e = ((i - 16)/9)**2 + ((j - 20)/10)**2; if(e < .8 && ((i + j) % 6 === 0 || (i - j + 60) % 6 === 0)) px('#b8901c', i, j); }
    L(pxPoly([[16, 11], [11, 3], [16, 6]]), leaf); L(pxPoly([[16, 11], [16, 0], [20, 7]]), '#3a9c4e'); L(pxPoly([[16, 11], [22, 3], [22, 10]]), leaf);
  } else { L(pxDisc(16, 18, 10), b.col); }
  return _cs[key] = B.finish().toDataURL();
}
const berryImgHtml = (b, cls) => `<img class='bimg ${cls || ''}' src='assets/items/${b.sprite}.png' onerror="this.onerror=null;this.src='${berryProc(b)}'" alt=''>`;
const _bel = {};
function berryEl(b){ if(_bel[b.id]) return _bel[b.id]; const im = new Image(); im.onerror = () => { im.onerror = null; im.src = berryProc(b); }; im.src = 'assets/items/' + b.sprite + '.png'; return _bel[b.id] = im; }
// poffin : biscuit ovale glacé (comme dans les jeux), de la couleur de sa saveur principale, parsemé de vermicelles colorés
function poffinImg(p){
  const ent = Object.entries(p.gain || {}).sort((a, b) => b[1] - a[1]), main = ent[0], second = ent[1];
  const col = main ? catColor(main[0]) : '#b8884a', c2 = second ? catColor(second[0]) : null, key = 'pf3' + col + (c2 || ''); if(_cs[key]) return _cs[key];
  const B = pxBuilder(32, 32), L = B.layer, ox = B.ox, rot = -.45, cs = Math.cos(rot), sn = Math.sin(rot);
  const oval = (cx, cy, rx, ry) => mx => { mx.save(); mx.translate(cx, cy); mx.rotate(rot); mx.beginPath(); mx.ellipse(0, 0, rx, ry, 0, 0, 6.2832); mx.fill(); mx.restore(); };
  L(oval(16, 19, 13, 9.6), '#c98a48');                                   // pâte dorée (dessous)
  L(oval(16, 16.4, 12.4, 8.8), col); L(oval(14.2, 13.6, 8.2, 4.2), mixHex(col, '#ffffff', .22));   // glaçage + reflet
  const pal = ['#ffffff', '#ffd23f', '#3fbf5a', '#3b8fd9', '#ff7ac8', '#e8402c'].filter(c => c !== col); if(c2) pal.unshift(c2, c2);
  const dots = [[-8, -1, 0], [-4, -4, 1], [0, -1, 2], [4, -3, 0], [7, 1, 1], [-3, 3, 2], [2, 4, 0], [-7, 3, 1], [5, 5, 2], [-1, -6, 1]];
  dots.forEach(([u, v, k], i) => { const px = Math.round(16 + u*cs - v*sn), py = Math.round(16 + u*sn + v*cs - 1); ox.fillStyle = pal[i % pal.length]; if(k === 0){ ox.fillRect(px, py, 3, 1); } else if(k === 1){ ox.fillRect(px, py, 1, 1); ox.fillRect(px + 1, py + 1, 1, 1); ox.fillRect(px + 2, py + 2, 1, 1); } else { ox.fillRect(px, py, 1, 3); } });
  return _cs[key] = B.finish().toDataURL();
}

// ---------- stats ----------
const statSum = s => CONTEST_STATS.reduce((a, t) => a + s[t.id], 0);
function radarSvg(s, size){
  const R = size/2 - 24, c = size/2, pt = (i, v) => { const a = -Math.PI/2 + i*2*Math.PI/5; return [c + Math.cos(a)*R*v, c + Math.sin(a)*R*v]; };
  const ring = v => CONTEST_STATS.map((_, i) => pt(i, v).join(',')).join(' '), poly = CONTEST_STATS.map((t, i) => pt(i, Math.max(.04, s[t.id]/STAT_MAX)).join(',')).join(' ');
  return `<svg class='radar' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${[.25, .5, .75, 1].map(v => `<polygon points='${ring(v)}' fill='none' stroke='#fff3' stroke-width='1'/>`).join('')}
    <polygon points='${poly}' fill='#ffd23f66' stroke='#ffd23f' stroke-width='2'/>
    ${CONTEST_STATS.map((t, i) => { const [a, b] = pt(i, 1.17); return `<text x='${a}' y='${b + 3}' fill='${t.col}' font-size='8' font-weight='700' text-anchor='middle'>${t.name.slice(0, 5)}</text>`; }).join('')}</svg>`;
}
const statBar = (t, v) => `<div class='sbar'><span style='color:${t.col}'>${t.name}</span><i><u style='width:${v/STAT_MAX*100}%;background:${t.col}'></u></i><b>${v}</b></div>`;

// ---------- poffins ----------
function makePoffin(ids, q){
  const S = {}; CONTEST_STATS.forEach(t => S[t.id] = 0); ids.forEach(id => Object.entries(BERRY[id].fl).forEach(([k, v]) => S[k] += v));
  const tot = Object.values(S).reduce((a, b) => a + b, 0), gain = {}, mul = .5 + .7*q;
  CONTEST_STATS.forEach(t => { const v = Math.max(0, S[t.id] - .5*(tot - S[t.id]))*mul/4; if(v >= 1) gain[t.id] = Math.round(v); });
  const lisse = Math.max(8, Math.round(ids.reduce((a, id) => a + BERRY[id].lisse, 0)/ids.length*(1.3 - .6*q)));
  const main = Object.entries(gain).sort((a, b) => b[1] - a[1]);
  const name = !main.length ? 'Poffin raté' : main.length === 1 ? 'Poffin ' + CSTAT[main[0][0]].flavor : 'Poffin ' + CSTAT[main[0][0]].flavor + '-' + CSTAT[main[1][0]].flavor;
  return { name, gain, lisse, sheen:Math.max(1, Math.round(lisse/2.5)), q:Math.round(q*100) };
}
const poffinTxt = p => Object.entries(p.gain).map(([k, v]) => `<span style='color:${catColor(k)}'>${CSTAT[k].name} +${v}</span>`).join(' ') || '<i>Rien…</i>';
function eatPoffin(pid, i){
  const d = Con.d(), p = d.poffins[i], s = Con.stat(pid); if(!p) return 'Plus de poffin.';
  if(s.sheen >= SHEEN_MAX) return NAME[pid] + ' n\'a plus faim (éclat au maximum).';
  Object.entries(p.gain).forEach(([k, v]) => s[k] = Math.min(STAT_MAX, s[k] + v)); s.sheen = Math.min(SHEEN_MAX, s.sheen + p.sheen);
  d.poffins.splice(i, 1); Save.save(); return NAME[pid] + ' a mangé : ' + p.name + ' !';
}

// ---------- adversaires, notes ----------
const pickFrom = a => a[Math.floor(Math.random()*a.length)];
const myMons = () => ORDER.filter(id => typeof Owned === 'undefined' || Owned.has(id));      // seulement tes Pokémon débloqués
function aiContestant(C, used){
  const R = CONTEST_RANKS[C.rank], pool = ORDER.filter(id => !used.includes(id)), pid = pickFrom(pool.length ? pool : ORDER);
  const rnd = (a, b) => a + Math.random()*(b - a), stats = {}; CONTEST_STATS.forEach(t => stats[t.id] = Math.round(t.id === C.cat ? rnd(R.ai[0], R.ai[1]) : rnd(0, R.ai[1]*.5)));
  const rar = [['C'], ['C', 'PC'], ['PC', 'R'], ['R', 'UR']][C.rank], caps = CAPSULES.filter(c => rar.includes(c.r));
  return { pid, name:NAME[pid] || pid, human:-1, stats, cap:Math.random() < .35 + C.rank*.2 ? pickFrom(caps) : null, style:0, dance:0, perf:0, total:0 };
}
function styleCalc(C, ct){
  const s = ct.stats, cs = s[C.cat], others = (statSum(s) - cs)/4, cap = ct.cap ? CAP_STYLE[ct.cap.r] || 0 : 0;
  const typ = POKEMON[ct.pid].types.some(t => catOf(t) === C.cat) ? 6 : 0, base = 15 + cs/STAT_MAX*45 + others/STAT_MAX*10 + cap + typ;
  const j = [0, 1, 2].map(() => clamp(base*(.88 + Math.random()*.24) + Math.random()*5, 0, 100)), score = Math.round(clamp(j.reduce((a, b) => a + b, 0)/3, 0, 100));
  return { score, judges:j.map(v => clamp(Math.round(v/20), 1, 5)) };
}
function danceScore(C, ct, acc, maxCombo, N){ return Math.round(clamp(acc*80 + (maxCombo/N)*14 + ct.stats[C.cat]/STAT_MAX*6, 0, 100)); }
function appealCalc(C, ct){
  return (m, prevCat, q, volt) => {
    const cat = catOf(m.type), base = 5 + Math.min(m.power || 0, 30)/3, match = cat === C.cat, mul = .6 + .8*ct.stats[cat]/STAT_MAX;
    const combo = prevCat == null ? 1 : prevCat !== cat ? 1.2 : .7, sup = volt >= 3;
    const pts = Math.round(base*(match ? 1.5 : 1)*mul*combo*[.8, 1.1, 1.3][q]*(sup ? 1.8 : 1)*10)/10;
    return { pts, cat, match, combo, sup, volt:sup ? 0 : volt + 1 + (match ? 1 : 0) };
  };
}
function aiPerf(C, ct){
  const calc = appealCalc(C, ct), mv = POKEMON[ct.pid].moves; let prev = null, volt = 0, sum = 0; const pq = [.25, .45, .6, .75][C.rank];
  for(let i = 0; i < 4; i++){
    const q = Math.random() < pq ? 2 : Math.random() < .6 ? 1 : 0; let best = null;
    mv.forEach(m => { const r = calc(m, prev, 1, volt); if(!best || r.pts > best.r.pts) best = { m, r }; }); if(Math.random() < .15) best.m = pickFrom(mv);
    const r = calc(best.m, prev, q, volt); sum += r.pts; prev = r.cat; volt = r.volt;
  }
  return Math.round(Math.min(100, sum*1.15));
}
function aiScore(C, ct, kind){
  if(kind === 'style') return styleCalc(C, ct).score;
  if(kind === 'dance'){ const acc = clamp(.45 + C.rank*.09 + (Math.random() - .5)*.25, .3, .97); return danceScore(C, ct, acc, Math.round(acc*acc*C.chartN), C.chartN); }
  return aiPerf(C, ct);
}
const recompute = ct => { ct.total = ct.style*WEIGHT.style + ct.dance*WEIGHT.dance + ct.perf*WEIGHT.perf; };

// ============================================================
//  DÉROULEMENT D'UN CONCOURS
// ============================================================
function startContest(cat, rank, picks){
  const C = { cat, rank, cts:[], rounds:['style', 'dance', 'perf'], ri:0, ci:0, shown:{}, humans:picks.length, chartN:CONTEST_RANKS[rank].notes };
  picks.forEach((pid, h) => C.cts.push({ pid, name:NAME[pid] || pid, human:h, stats:{ ...Con.stat(pid) }, cap:Con.cap(pid), style:0, dance:0, perf:0, total:0 }));
  while(C.cts.length < 4) C.cts.push(aiContestant(C, C.cts.map(c => c.pid)));
  Con.d().played++; Save.save();
  contestStep(C);
}
const ROUND_INFO = {
  style:{ title:'Épreuve de Style', txt:'Les 3 juges notent le style de ton Pokémon : sa statistique de la catégorie, sa <b>capsule Ball</b> (plus elle est rare, plus elle rapporte) et son type.' },
  dance:{ title:'Épreuve de Rythme', txt:'Appuie sur <b>Gauche / Saut / Droite / Devant</b> quand la note passe sur le cercle (tactile, flèches ou ZQSD). Plus tu es précis, plus ta note est haute.' },
  perf: { title:'Épreuve de Prestations', txt:'4 appels : choisis une attaque (la catégorie idéale vaut plus), puis arrête la jauge au bon moment. Varier les catégories et remplir l\'<b>Ambiance</b> donne un SUPER MOMENT.' }
};
function contestStep(C){
  if(C.ri >= 3) return contestEnd(C);
  const kind = C.rounds[C.ri], ct = C.cts[C.ci];
  if(C.ci === 0 && !C.shown[kind]){ C.shown[kind] = 1; return roundIntro(C, kind, () => contestStep(C)); }
  const next = () => { C.ci++; if(C.ci >= 4){ C.ci = 0; C.ri++; roundStandings(C); } else contestStep(C); };
  const play = () => {
    if(ct.human < 0){ const sc = aiScore(C, ct, kind); ct[kind] = sc; recompute(ct); return sceneShow(C, ct, C.ci, kind, sc, next); }
    if(kind === 'style'){ const r = styleCalc(C, ct); return sceneStyle(C, ct, C.ci, r, res => { ct.style = res.score; recompute(ct); next(); }); }
    if(kind === 'dance') return sceneDance(C, ct, C.ci, r => { ct.dance = danceScore(C, ct, r.acc, r.maxCombo, r.N); recompute(ct); next(); });
    return scenePerf(C, ct, C.ci, appealCalc(C, ct), r => { ct.perf = Math.round(Math.min(100, r.sum*1.15)); recompute(ct); next(); });
  };
  if(ct.human >= 0 && C.humans > 1) turnCard(C, ct, kind, play); else play();
}
function roundIntro(C, kind, go){
  const I = ROUND_INFO[kind];
  menu(`<h1>${I.title}</h1><div class='cin'><div class='cinh'>${ribbonTag(C.cat, C.rank, true)}<div><b style='color:${catColor(C.cat)}'>${CSTAT[C.cat].name}</b> · ${CONTEST_RANKS[C.rank].name}<br><small>Épreuve ${C.ri + 1} sur 3</small></div></div><p>${I.txt}</p></div>${standingsHtml(C)}<div class='row'><button class='btn' id='go'>Commencer</button></div>`);
  document.getElementById('go').onclick = go;
}
function turnCard(C, ct, kind, go){
  menu(`<h1>Joueur ${ct.human + 1}</h1><div class='cin'><div class='cinh'>${thumb(ct.pid)}<div><b>${esc(ct.name)}</b><br><small>${ROUND_INFO[kind].title}</small></div></div><p>Passe l'appareil au joueur ${ct.human + 1}, puis appuie sur « Prêt ».</p></div><div class='row'><button class='btn' id='go'>Prêt</button></div>`);
  document.getElementById('go').onclick = go;
}
function standingsHtml(C){
  const o = C.cts.map((c, i) => i).sort((a, b) => C.cts[b].total - C.cts[a].total);
  return `<table class='ctab'><tr><th></th><th></th><th>Style</th><th>Rythme</th><th>Prest.</th><th>Total</th></tr>${o.map((i, rk) => { const c = C.cts[i]; return `<tr style='--cc:${CT_COL[i]}'><td>${rk + 1}</td><td class='nm'>${thumb(c.pid)} ${esc(c.name)}${c.human >= 0 ? ' <span class="tag">J' + (c.human + 1) + '</span>' : ''}</td><td>${Math.round(c.style) || '–'}</td><td>${Math.round(c.dance) || '–'}</td><td>${Math.round(c.perf) || '–'}</td><td><b>${Math.round(c.total)}</b></td></tr>`; }).join('')}</table>`;
}
function roundStandings(C){
  if(C.ri >= 3) return contestEnd(C);
  menu(`<h1>Classement provisoire</h1>${standingsHtml(C)}<div class='row'><button class='btn' id='go'>Épreuve suivante</button></div>`);
  document.getElementById('go').onclick = () => contestStep(C);
}

function contestEnd(C){
  const o = C.cts.map((c, i) => i).sort((a, b) => C.cts[b].total - C.cts[a].total), R = CONTEST_RANKS[C.rank], wid = ribbonId(C.cat, C.rank), first = !Con.d().wins[C.cat + ':' + C.rank];
  const lines = []; let gain = 0, won = false, newRibbon = false;
  o.forEach((i, rk) => {
    const c = C.cts[i]; if(c.human < 0) return;
    let g = Math.round(R.prize*PRIZE_SHARE[rk]*(first || rk > 0 ? 1 : .5)/5)*5; if(rk === 0 && !first) g = Math.round(R.prize*.5/5)*5;
    gain += g; lines.push(`Joueur ${c.human + 1} — ${rk + 1}${rk ? 'e' : 'er'} : ${g ? '+' + money(g) : 'aucun gain'}`);
    if(rk === 0){ won = true; if(!Con.ribbons(c.pid).includes(wid)){ Con.addRibbon(c.pid, wid); newRibbon = true; } }
  });
  if(won){ Con.d().wins[C.cat + ':' + C.rank] = 1; }
  if(gain) Save.addCoins(gain); Save.save();
  const top = C.cts[o[0]], humanTop = o.find(i => C.cts[i].human >= 0) === o[0];
  menu(`<h1>Résultats</h1><div class='cres'>
    <div class='cpod'>${o.map((i, rk) => { const c = C.cts[i]; return `<div class='cp r${rk}' style='--cc:${CT_COL[i]}'><span class='pl'>${rk + 1}</span>${thumb(c.pid)}<b>${esc(c.name)}</b><small>${c.human >= 0 ? 'Joueur ' + (c.human + 1) : 'Ordinateur'}</small><i>${Math.round(c.total)} pts</i></div>`; }).join('')}</div>
    <div class='cprize'>${won ? `<div class='cribw'><img class='rbn big' src='${ribbonImg(C.cat, C.rank)}'><div><b style='color:${catColor(C.cat)}'>${esc(ribbonName(C.cat, C.rank))}</b><br><small>${newRibbon ? 'Nouveau ruban pour ' + esc(top.name) + ' !' : 'Déjà obtenu par ' + esc(top.name)}</small></div></div>` : `<p>${esc(top.name)} remporte le ruban… pas cette fois !</p>`}
    ${lines.map(l => `<p>${l}</p>`).join('')}</div></div>
    <div class='row'><button class='btn' id='again'>Rejouer</button><button class='btn2' id='hub'>Retour</button></div>`);
  if(humanTop && typeof shopConfetti === 'function'){ shopReveal && shopReveal(C.rank >= 2 ? 'R' : 'PC'); shopConfetti(C.rank >= 3 ? 'UR' : C.rank >= 2 ? 'R' : 'PC'); }
  document.getElementById('again').onclick = () => showContestPlay();
  document.getElementById('hub').onclick = showContest;
}

// ============================================================
//  ÉCRANS
// ============================================================
function showContest(){
  const c = Con.d();
  menu(`<div class='hd'><h1>Concours Pokémon</h1>${walletHtml()}</div><div class='mlist'>
    <button class='mbtn' id='cp'><b>Participer</b><small>Style · Rythme · Prestations</small></button>
    <button class='mbtn' id='cm'><b>Mes Pokémon</b><small>Stats, capsule, poffins</small></button>
    <button class='mbtn' id='cc'><b>Cuisine à Poffin</b><small>${Object.values(c.berries).reduce((a, b) => a + b, 0)} baies · ${c.poffins.length} poffins</small></button>
    <button class='mbtn' id='cb'><b>Marché aux baies</b><small>Achète des baies</small></button>
    <button class='mbtn' id='cr'><b>Rubans</b><small>${Object.values(c.wins).length}/${CONTEST_STATS.length*CONTEST_RANKS.length} concours gagnés</small></button>
  </div><div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('cp').onclick = () => showContestPlay();
  document.getElementById('cm').onclick = () => showContestMons();
  document.getElementById('cc').onclick = () => showCook();
  document.getElementById('cb').onclick = () => showMarket();
  document.getElementById('cr').onclick = () => showRibbons();
  document.getElementById('back').onclick = showMain;
}

let CON_HUM = 1;
function showContestPlay(){
  menu(`<div class='hd'><h1>Choisis un concours</h1>${walletHtml()}</div>
    <div class='row cplay'>Joueurs : ${[1, 2, 3, 4].map(n => `<button class='btn2 ${n === CON_HUM ? 'on' : ''}' data-h='${n}'>${n}</button>`).join('')}<small>(à tour de rôle sur cet appareil ; l'ordinateur complète)</small></div>
    <div class='scroll ccats'>${CONTEST_STATS.map(s => `<div class='ccat' style='--cc:${s.col}'><b>${s.name}</b>${CONTEST_RANKS.map(r => { const ok = Con.unlocked(s.id, r.id), win = Con.d().wins[s.id + ':' + r.id]; return `<button class='crk ${ok ? '' : 'lock'}' data-c='${s.id}' data-r='${r.id}' ${ok ? '' : 'disabled'}>${ribbonTag(s.id, r.id, win)}<span>${r.name}</span><small>${ok ? '+' + money(r.prize) : 'verrouillé'}</small></button>`; }).join('')}</div>`).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-h]', el => { CON_HUM = +el.dataset.h; showContestPlay(); });
  bindAll('[data-c]', el => pickContestMon(el.dataset.c, +el.dataset.r, [], 0));
  document.getElementById('back').onclick = showContest;
}
function pickContestMon(cat, rank, picks, k){
  if(k >= CON_HUM) return startContest(cat, rank, picks);
  menu(`<h1>${CON_HUM > 1 ? 'Joueur ' + (k + 1) + ' : ' : ''}Choisis ton Pokémon</h1><small class='sub'>${esc(ribbonName(cat, rank))} — stat utile : <b style='color:${catColor(cat)}'>${CSTAT[cat].name}</b></small>
    <div class='scroll igrid cmons'>${myMons().map(id => { const s = Con.stat(id), cap = Con.cap(id); return `<button class='cm' data-id='${id}'>${thumb(id)}<b>${esc(NAME[id] || id)}</b><i><u style='width:${s[cat]/STAT_MAX*100}%;background:${catColor(cat)}'></u></i>${cap ? `<img class='cmc' src='${capIcon(cap)}'>` : ''}</button>`; }).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('.cm', el => pickContestMon(cat, rank, picks.concat(el.dataset.id), k + 1));
  document.getElementById('back').onclick = showContestPlay;
}

// ---------- Mes Pokémon ----------
function showContestMons(){
  menu(`<h1>Mes Pokémon</h1><div class='scroll igrid cmons'>${myMons().map(id => { const s = Con.stat(id); return `<button class='cm' data-id='${id}'>${thumb(id)}<b>${esc(NAME[id] || id)}</b><i><u style='width:${s.sheen/SHEEN_MAX*100}%;background:#ffd23f'></u></i><small>${Con.ribbons(id).length} ruban(s)</small></button>`; }).join('')}</div><div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('.cm', el => showContestMon(el.dataset.id));
  document.getElementById('back').onclick = showContest;
}
function showContestMon(pid, tab, msg){
  tab = tab || 'stats';
  const s = Con.stat(pid), c = Con.d(), cap = Con.cap(pid), owned = CAPSULES.filter(x => Save.itemCount(x.id) > 0);
  const body = {
    stats:() => CONTEST_STATS.map(t => statBar(t, s[t.id])).join('') + statBar({ name:'Éclat', col:'#ffd23f' }, s.sheen) + `<p class='mini'>L'éclat augmente quand il mange des poffins ; à 255 il n'a plus faim. Ces stats servent uniquement aux concours.</p>`,
    cap:() => `<p class='mini'>Capsule Ball (compte dans la note de Style : C +${CAP_STYLE.C}, PC +${CAP_STYLE.PC}, R +${CAP_STYLE.R}, UR +${CAP_STYLE.UR}) :</p><div class='row capsel'><button class='btn2 ${cap ? '' : 'on'}' data-cap=''>Aucune</button>${owned.map(x => `<button class='btn2 ${cap && cap.id === x.id ? 'on' : ''}' data-cap='${x.id}' title='${esc(x.name)}'><img src='${capIcon(x)}' class='cmc'></button>`).join('')}</div>${cap ? `<p class='mini'><b style='color:${cap.col}'>${esc(cap.name)}</b> — ${esc(cap.desc)}</p>` : ''}`,
    pof:() => `<p class='mini'>Donner un poffin (${c.poffins.length}) ${msg ? '<br><b>' + esc(msg) + '</b>' : ''}</p><div class='poflist'>${c.poffins.map((p, i) => `<button class='btn2 pof' data-p='${i}'><img class='bimg s' src='${poffinImg(p)}'> <b>${p.name}</b> ${poffinTxt(p)} <small>éclat +${p.sheen}</small></button>`).join('') || '<small>Aucun poffin : va à la Cuisine.</small>'}</div>`,
    rib:() => `<p class='mini'>Rubans remportés :</p><div class='row'>${Con.ribbons(pid).map(r => { const [ct, rk] = r.split('-'); return ribbonTag(ct, +rk, true); }).join('') || '<small>Aucun</small>'}</div>`
  };
  menu(`<h1>${esc(NAME[pid] || pid)}</h1><div class='ctabs'>${[['stats', 'Stats'], ['cap', 'Capsule'], ['pof', 'Poffins'], ['rib', 'Rubans']].map(([k, n]) => `<button class='btn2 ${tab === k ? 'on' : ''}' data-t='${k}'>${n}</button>`).join('')}</div>
    <div class='cdet'><div class='cl'><img class='big' src='${spr(pid).toDataURL()}'>${radarSvg(s, 156)}</div><div class='cr'>${body[tab]()}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-t]', el => showContestMon(pid, el.dataset.t));
  bindAll('[data-cap]', el => { c.cap[pid] = el.dataset.cap || null; Save.save(); showContestMon(pid, 'cap'); });
  bindAll('[data-p]', el => { const m = eatPoffin(pid, +el.dataset.p); showContestMon(pid, 'pof', m); });
  document.getElementById('back').onclick = showContestMons;
}

// ---------- Marché aux baies ----------
function showMarket(msg){
  menu(`<div class='hd'><h1>Marché aux baies</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='scroll igrid cberr'>${BERRIES.map(b => `<div class='berry'>${berryImgHtml(b)}<b>${b.name}</b><span class='fl'>${Object.entries(b.fl).map(([k, v]) => `<i style='color:${catColor(k)}'>${CSTAT[k].flavor} ${v}</i>`).join(' ')}</span><small>Lisse ${b.lisse} · en stock : ${Con.berry(b.id)}</small><button class='btn2' data-b='${b.id}'>Acheter ${money(b.price)}</button></div>`).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-b]', el => { const b = BERRY[el.dataset.b]; if(Save.spend(b.price)){ Con.addBerry(b.id, 1); showMarket('+1 ' + b.name); } else showMarket('Pas assez de Pokédollars.'); });
  document.getElementById('back').onclick = showContest;
}

// ---------- Cuisine à poffin ----------
let COOK_SEL = [];
function showCook(msg){
  const sel = COOK_SEL.filter(id => Con.berry(id) > COOK_SEL.filter(x => x === id).length - 1);
  COOK_SEL = sel;
  const prev = sel.length ? makePoffin(sel, .8) : null;
  menu(`<h1>Cuisine à Poffin</h1>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='cook'><div class='scroll igrid cberr s'>${BERRIES.filter(b => Con.berry(b.id) > 0).map(b => `<button class='berry sm' data-b='${b.id}'>${berryImgHtml(b, 'm')}<b>${b.name.replace('Baie ', '')}</b><small>×${Con.berry(b.id) - COOK_SEL.filter(x => x === b.id).length}</small><span class='fl'>${Object.keys(b.fl).map(k => `<i style='color:${catColor(k)}'>${CSTAT[k].flavor}</i>`).join(' ')}</span></button>`).join('') || '<p>Aucune baie : va au marché.</p>'}</div>
    <div class='pot'><p class='mini'>Dans la marmite (${sel.length}/${POFFIN_MAX_BERRIES}) :</p><div class='row'>${sel.map((id, i) => `<button class='btn2' data-r='${i}'>${berryImgHtml(BERRY[id], 's')} ${BERRY[id].name.replace('Baie ', '')} ✕</button>`).join('') || '<small>Choisis 1 à 4 baies</small>'}</div>
    <p class='mini'>${prev ? 'Aperçu : ' + poffinTxt(prev) + '<br><small>Plus tu mélanges de saveurs, plus le résultat est faible. Une cuisson réussie donne un poffin plus fort et plus lisse (moins d\'éclat consommé).</small>' : ''}</p>
    <div class='row'><button class='btn' id='go' ${sel.length ? '' : 'disabled'}>Cuisiner</button></div></div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-b]', el => { if(COOK_SEL.length < POFFIN_MAX_BERRIES) COOK_SEL.push(el.dataset.b); showCook(); });
  bindAll('[data-r]', el => { COOK_SEL.splice(+el.dataset.r, 1); showCook(); });
  document.getElementById('back').onclick = showContest;
  const go = document.getElementById('go');
  go.onclick = () => {
    if(!sel.length) return;
    if(Con.d().poffins.length >= POFFIN_STOCK){ showCook('Stock de poffins plein : donne-en à tes Pokémon.'); return; }
    sel.forEach(id => Con.addBerry(id, -1));
    sceneCook(sel, q => { const p = makePoffin(sel, q); Con.d().poffins.push(p); Save.save(); COOK_SEL = []; showPoffinDone(p); });
  };
}
function showPoffinDone(p){
  menu(`<h1>Poffin prêt !</h1><div class='cin'><div class='cinh'><img class='bimg' src='${poffinImg(p)}'><div><b>${p.name}</b><br>${poffinTxt(p)}<br><small>Qualité ${p.q} % · lisse ${p.lisse} · éclat +${p.sheen}</small></div></div></div>
    <div class='row'><button class='btn' id='a'>Cuisiner encore</button><button class='btn2' id='m'>Donner à un Pokémon</button><button class='btn2' id='b'>Retour</button></div>`);
  document.getElementById('a').onclick = () => showCook(); document.getElementById('m').onclick = () => showContestMons(); document.getElementById('b').onclick = showContest;
}

// ---------- Rubans ----------
function showRibbons(){
  menu(`<h1>Rubans</h1><div class='scroll ccats'>${CONTEST_STATS.map(s => `<div class='ccat' style='--cc:${s.col}'><b>${s.name}</b>${CONTEST_RANKS.map(r => { const rid = ribbonId(s.id, r.id), who = Object.entries(Con.d().ribbons).filter(([, l]) => l.includes(rid)).map(([p]) => NAME[p] || p); return `<div class='crk'>${ribbonTag(s.id, r.id, who.length)}<span>${r.name}</span><small>${who.length ? esc(who.join(', ')) : '—'}</small></div>`; }).join('')}</div>`).join('')}</div><div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('back').onclick = showContest;
}

SCREENS.contest = showContest;
