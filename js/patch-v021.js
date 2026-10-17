// ============================================================
//  patch-v021.js — v0.21.0 (rapport de test v0.20)
//    1. Équilibrage : Ectoplasma (niveau 12), Raichu contre Raichu, Électacle jusqu'au bout, Défi Mewtwo un peu plus dur
//       (Tranche-Nuit : data/pokemon.js · caisse de raid + objets Titans : data/raid.js)
//    2. Raids : statistiques de fin de combat (dégâts infligés / reçus, % d'attaques réussies), aussi celles des coéquipiers
//    3. Safari : tes attaques touchent toute la meute ; touche / clique un Pokémon de la meute pour en faire ta CIBLE
//    4. Défi Mewtwo : mode SECRET (3 difficultés gagnées sans perdre un seul Pokémon) → carte LÉGENDAIRE de Mewtwo
// ============================================================

// ---------- 1. équilibrage ----------
const V21 = {
  stage12:{ boss:.7, dmg:.9 },                      // niveau 12 (Ectoplasma en boss)
  mewtwo:{ hp:1.12, dmg:1.1, rate:.93 },            // les 3 difficultés du Défi Mewtwo
  secret:{ hp:2.1, dmg:1.65, speed:1.3, pspeed:1.45, rate:.6, tele:.62, aim:1, boss:3.6, coins:2500 }
};
if(STAGES[11]){ STAGES[11].boss = +(STAGES[11].boss*V21.stage12.boss).toFixed(2); STAGES[11].dmg = +(STAGES[11].dmg*V21.stage12.dmg).toFixed(2); }
BOSS_DIFFS.forEach(D => { const S = D.stage; S.hp = +(S.hp*V21.mewtwo.hp).toFixed(2); S.dmg = +(S.dmg*V21.mewtwo.dmg).toFixed(2); S.rate = +(S.rate*V21.mewtwo.rate).toFixed(2); });

// Paratonnerre contre Paratonnerre (Raichu contre Raichu) : le talent ne joue pas, les deux peuvent se blesser
const sameAbsorb = (att, def) => { const a = att && abilityOf(att), d = def && abilityOf(def); return !!(a && d && a.absorb && d.absorb && a.absorb.type === d.absorb.type); };
const withoutAbsorb = (o, fn) => { const ab = abilityOf(o), sv = ab && ab.absorb; if(sv) ab.absorb = null; try{ return fn(); } finally { if(sv) ab.absorb = sv; } };
hurtE = (prev => function(d, b){ const e = G && G.e; if(e && b && b.own && sameAbsorb(G.p, e)) return withoutAbsorb(e, () => prev(d, b)); return prev(d, b); })(hurtE);
hurtP = (prev => function(d, b){ const p = G && G.p; if(p && b && !b.own && sameAbsorb(G.e, p)) return withoutAbsorb(p, () => prev(d, b)); return prev(d, b); })(hurtP);

// Corps à corps de TON Pokémon : il part toujours jusqu'au bout de la portée et s'arrête seulement s'il PERCUTE
// vraiment l'adversaire en chemin (avant : il s'arrêtait là où l'adversaire était au moment du lancer → parfois trop court)
updRs = function(s, d, own){
  const R = s.rs; if(!R) return;
  const t = G.time - R.t0;
  let p = t < R.ta ? t/R.ta : t < R.tr ? 1 : Math.max(0, 1 - (t - R.tr)/R.tb); p = p*p*(3 - 2*p);
  if(R.stop != null) p = Math.min(p, R.stop);
  s.x = R.sx + (R.ex - R.sx)*p; s.y = R.sy + (R.ey - R.sy)*p;
  if(own && R.stop == null && t < R.ta && d && d.hp > 0 && !d.hid && Math.hypot(s.x - d.x, s.y - d.y) < s.r + d.r + 6) R.stop = p;   // percuté : on s'arrête ici
  if(own) s.inv = Math.max(s.inv, .05);
  for(const h of R.hits){
    if(h.done || t < h.t) continue; h.done = 1;
    if(own) rsHitAdds(s, R);                                                              // Safari : la meute aussi
    if(Math.hypot(s.x - d.x, s.y - d.y) >= s.r + d.r + 28) continue;                      // la cible a esquivé
    const M = R.M, b = { t:R.m.tp, k:R.m.k, own, status:M.status };
    let dm = R.m.d * R.sc * (1 + R.c*.9);
    const ab = abilityOf(s), cr = M.crit ? M.crit + ((ab && ab.critBonus) || 0) : 0;
    if(cr && Math.random() < cr){ dm *= 1.6; b.crit = 1; dmgTxt(d.x, d.y - 64, 'CRITIQUE !', '#ffd23f'); }
    sfx.push({ x:d.x, y:d.y, k:M.fx, tp:R.m.tp, born:performance.now(), dur:280, a:Math.atan2(d.y - s.y, d.x - s.x) });
    if(M.inv){ if(own) s.inv = Math.max(s.inv, M.inv); else s.invT = G.time + M.inv; }
    const ko = own ? hurtE(dm, b) : hurtP(dm, b);
    if(M.kb && !ko){ const a = Math.atan2(d.y - s.y, d.x - s.x); d.x = Math.max(30, Math.min(W - 30, d.x + Math.cos(a)*M.kb)); d.y = Math.max(44, Math.min(H - 34, d.y + Math.sin(a)*M.kb)); }
    if(M.recoil){ const lost = Math.max(1, Math.round(dm*M.recoil)); s.hp -= lost; dmgTxt(s.x, s.y - 48, '-' + lost*10 + ' contrecoup', '#ff9a8a'); }
    if(ko){ s.rs = null; return; }
  }
  if(t >= R.end){ s.rs = null; s.x = R.sx; s.y = R.sy; }
};
const _meleeV21 = melee;
melee = function(s, d, m, c, own, sc, ang){
  const r = _meleeV21(s, d, m, c, own, sc, ang);
  const R = s.rs;
  if(own && R && R.t0 === G.time){                                                       // le joueur : toujours la portée complète
    const a = ang ?? Math.atan2(d.y - s.y, d.x - s.x), rng = (m.mel && m.mel.rng) || 240;
    R.ex = Math.max(30, Math.min(W - 30, s.x + Math.cos(a)*rng)); R.ey = Math.max(44, Math.min(H - 34, s.y + Math.sin(a)*rng));
  }
  return r;
};

// ---------- 2. raids : statistiques ----------
const RST = { others:{} };
const raidSt = () => G && G.raid && (G.raid.st = G.raid.st || { dealt:0, taken:0, shots:0, hits:0, pend:[] });
fire = (prev => function(m, c, i){ const S = isRaid() && raidSt(); if(S){ S.shots++; S.pend.push(G.time); } return prev(m, c, i); })(fire);
hurtE = (prev => function(d, b){
  const e = G && G.e, h = e && e.hp, r = prev(d, b), S = isRaid() && b && b.own && raidSt();
  if(S && e && e.hp < h){ S.dealt += h - Math.max(0, e.hp); S.pend = S.pend.filter(t => G.time - t < 1.6); if(S.pend.length){ S.pend.shift(); S.hits++; } }
  return r;
})(hurtE);
hurtP = (prev => function(d, b){ const p = G && G.p, h = p && p.hp, r = prev(d, b), S = isRaid() && raidSt(); if(S && p && p.hp < h) S.taken += h - Math.max(0, p.hp); return r; })(hurtP);
const stPack = (pseudo, S) => ({ p:pseudo, d:Math.round(S.dealt*10), t:Math.round(S.taken*10), sh:S.shots, h:Math.min(S.hits, S.shots) });
function raidStatsHtml(){
  const rows = Object.values(RST.others), me = RST.me; if(!me) return '';
  const pct = x => x.sh ? Math.round(x.h/x.sh*100) + ' %' : '—';
  const L = [me, ...rows];
  return `<table class='rstat'><tr><th>Joueur</th><th>Dégâts infligés</th><th>Dégâts reçus</th><th>Attaques réussies</th></tr>${L.map((x, i) => `<tr class='${i ? '' : 'me'}'><td>${esc(x.p)}</td><td>${x.d}</td><td>${x.t}</td><td>${pct(x)} <small>(${x.h}/${x.sh})</small></td></tr>`).join('')}</table>
    ${G && G.raid && G.raid.net && rows.length < (G.raid.n || 1) - 1 ? `<p class='hint rstw'>En attente des statistiques de tes coéquipiers…</p>` : ''}`;
}
function raidStatsShow(){ const box = document.getElementById('rstbox'); if(box) box.innerHTML = raidStatsHtml(); }
raidEndScreen = (prev => function(win, R){
  const S = (R && R.st) || { dealt:0, taken:0, shots:0, hits:0 }, M = typeof RNET !== 'undefined' && RNET.m;
  const pseudo = R && R.net && M ? M.me.pseudo : 'Toi';
  RST.me = stPack(pseudo, S);
  if(R && R.net && M){ const pk = { id:M.me.id, ...RST.me }; [0, 700, 1800].forEach(ms => setTimeout(() => { try{ rsend('st', pk); }catch(e){} }, ms)); }
  else RST.others = {};
  prev(win, R);
  const h = document.querySelector('#menu h1');
  if(h){ const x = document.querySelector('#menu .rtries') || h; x.insertAdjacentHTML('afterend', `<div id='rstbox'>${raidStatsHtml()}</div>`); }
})(raidEndScreen);
rnStart = (prev => function(M, list, boss){ RST.others = {}; RST.me = null; return prev(M, list, boss); })(rnStart);
rnMsg = (prev => function(M, k, d){
  if(k === 'st'){ if(d && M && d.id !== M.me.id){ RST.others[d.id] = d; raidStatsShow(); } return; }
  return prev(M, k, d);
})(rnMsg);

// ---------- 3. safari : toute la meute + choix de la cible ----------
const inRooms = () => G && G.cfg && G.cfg.rooms && G.rm && !G.over;
function hitAdd(a, dm, tp){
  const x = typeMult(tp, a.t), v = Math.max(1, dm*x); a.hp -= v; a.hitT = .2;
  dmgTxt(a.x + R_(-6, 6), a.y - 34, String(Math.round(v*10)), x > 1 ? '#ffe27a' : '#ffffff');
  vp({ x:a.x, y:a.y - 8, life:.25, s:4, s1:22, kind:'ring', col:COL[tp] || '#fff' });
}
function rsHitAdds(s, R){
  if(!inRooms()) return;
  const dm = R.m.d*R.sc*(1 + R.c*.9);
  G.rm.adds.forEach(a => { if(a.hp > 0 && Math.hypot(s.x - a.x, s.y - a.y) < s.r + a.r + 28) hitAdd(a, dm, R.m.tp); });
}
step = (prev => function(dt){
  prev(dt);
  if(!inRooms() || !G.rm.adds.length) return;
  for(const z of ZONES) if(z.own && z.done && !z._ad){ z._ad = 1; G.rm.adds.forEach(a => { if(a.hp > 0 && Math.hypot(a.x - z.x, a.y - z.y) < z.R + a.r*.6) hitAdd(a, z.dm, z.tp); }); }
  for(const q of BEAMS) if(q.own && q.done && !q._ad){ q._ad = 1; G.rm.adds.forEach(a => { const dx = a.x - q.x, dy = a.y - q.y, al = dx*Math.cos(q.a) + dy*Math.sin(q.a), pd = Math.abs(-dx*Math.sin(q.a) + dy*Math.cos(q.a));
    if(a.hp > 0 && al > 0 && al < q.len && pd < a.r + q.w/2 + 4) hitAdd(a, q.dm, q.tp); }); }
})(step);
// toucher / cliquer un Pokémon de la meute : il devient la CIBLE (le meneur que visent tes attaques automatiques)
function sfPickAt(ev){
  if(!inRooms() || !G.rm.adds.length || !G.e || G.e.hp <= 0 || G.e.hid || G.cap || G.ballFly || G.intro > 0) return false;
  const r = cv.getBoundingClientRect(), s = Math.min(r.width/VW, r.height/VH), ox = r.left + (r.width - VW*s)/2, oy = r.top + (r.height - VH*s)/2;
  const wx = (ev.clientX - ox)/s + CAM.x, wy = (ev.clientY - oy)/s + CAM.y;
  let best = null, bd = 34;
  G.rm.adds.forEach(a => { const d = Math.hypot(a.x - wx, a.y - 12 - wy); if(a.hp > 0 && d < bd){ bd = d; best = a; } });
  if(!best) return false;
  const e = G.e, keys = ['x', 'y', 'hp', 'max', 'st', 'stT'];                             // même espèce dans une salle : on échange les « corps »
  keys.forEach(k => { const v = e[k]; e[k] = best[k]; best[k] = v; });
  e.lx = e.x; e.ly = e.y; e.tele = 0; e.rs = null; e.fl = null; e.kb = null; e.next = Math.max(e.next || 0, .5); best.tele = 0; best.next = 1;
  G.sfPick = { t0:G.time }; playSfx('select');
  for(let k = 0; k < 3; k++) vp({ x:e.x, y:e.y - 4, life:.35 + k*.1, s:6, s1:40 + k*14, kind:'ring', col:'#ffe070' });
  return true;
}
addEventListener('pointerdown', ev => {
  if(ev.pointerType === 'mouse') return;                                                  // la souris est gérée dans patch-v0172.js
  if(sfPickAt(ev)){ ev.stopImmediatePropagation(); ev.preventDefault(); }
}, true);
// repère au-dessus de la cible
drawBullets = (prev => function(){
  prev();
  if(!inRooms() || !G.e || G.e.hp <= 0 || G.e.hid) return;
  const e = G.e, bob = Math.sin(G.time*5)*2, y = e.y - 46 + bob;
  ctx.save(); ctx.fillStyle = '#ffe070'; ctx.strokeStyle = '#3a2400'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(e.x - 5, y - 6); ctx.lineTo(e.x + 5, y - 6); ctx.lineTo(e.x, y); ctx.closePath(); ctx.fill(); ctx.stroke();
  if(G.sfPick && G.time - G.sfPick.t0 < 1){ ctx.globalAlpha = 1 - (G.time - G.sfPick.t0); htext('CIBLE', e.x, y - 10, 8, '#ffe070', 'center'); }
  ctx.restore();
})(drawBullets);

// ---------- 4. Défi Mewtwo : mode SECRET ----------
const SECRET_DIFF = { id:'secret', label:'SECRET', col:'#ffd23f', coins:V21.secret.coins, card:'L',
  stage:{ name:'Défi : Mewtwo — SECRET', level:7, arena:4, hp:V21.secret.hp, dmg:V21.secret.dmg, speed:V21.secret.speed, pspeed:V21.secret.pspeed, rate:V21.secret.rate, tele:V21.secret.tele, aim:V21.secret.aim, boss:V21.secret.boss },
  ai:{ rage:{ below:.8, rate:.42, label:'MEWTWO LIBÈRE SA PUISSANCE !' }, dodge:{ range:110, cd:1.8 } } };
const BASE_DIFFS = BOSS_DIFFS.slice();
if(!RAR.L) RAR.L = { ...RAR.UR, id:'L', label:'Légendaire', col:'#ffd23f' };   // affichage de la récompense du mode SECRET
CARD_FEM.L = 'LÉGENDAIRE';
const MwPerfect = {
  all(){ const d = Save.load(); if(!d.mwPerfect) d.mwPerfect = {}; return d.mwPerfect; },
  has(id){ return !!this.all()[id]; },
  unlocked(){ return BASE_DIFFS.every(D => this.has(D.id)); }
};
const MW_LEGEND = 'card:mewtwo:L';
shopBuild = (prev => function(){
  prev();
  if(POKEMON.mewtwo && !ITEM[MW_LEGEND]) ITEM[MW_LEGEND] = { id:MW_LEGEND, kind:'card', legend:true, theme:'labo', poke:'mewtwo', name:'Carte Légendaire Mewtwo — Édition limitée', r:'UR', crates:['boss:mewtwo:secret'], limited:true, diff:'Secret' };
  CRATE['boss:mewtwo:secret'] = CRATE['boss:mewtwo:secret'] || { name:'Défi : Mewtwo — mode SECRET (1re victoire)' };
})(shopBuild);
function syncSecret(){ const on = MwPerfect.unlocked(), i = BOSS_DIFFS.indexOf(SECRET_DIFF); if(on && i < 0) BOSS_DIFFS.push(SECRET_DIFF); if(!on && i >= 0) BOSS_DIFFS.splice(i, 1); }
showBossDefi = (prev => function(sel){
  syncSecret();
  if(sel && sel.diff === 'secret' && !MwPerfect.unlocked()) sel = { ...sel, diff:'extreme' };
  prev(sel);
  const row = document.querySelector('#menu [data-diff]'); if(!row) return;
  const box = row.parentElement;
  if(!MwPerfect.unlocked()){
    const n = BASE_DIFFS.filter(D => MwPerfect.has(D.id)).length;
    box.insertAdjacentHTML('beforeend', `<button class='btn2 mwsec lock' title='Gagne les 3 difficultés sans perdre un seul Pokémon'>🔒 ??? <small>${n}/3 sans K.O.</small></button>`);
  } else { const b = box.querySelector("[data-diff='secret']"); if(b) b.classList.add('mwsec'); }
  BASE_DIFFS.forEach(D => { const b = box.querySelector(`[data-diff='${D.id}']`); if(b && MwPerfect.has(D.id)) b.insertAdjacentHTML('beforeend', ` <i class='mwpf' title='Gagné sans perdre un Pokémon'>★</i>`); });
  const cur = Save.load().bossDiff;
  if(cur === 'secret' && MwPerfect.unlocked()){ const r = document.querySelector('#menu .right, #menu .scroll.right'); if(r) r.insertAdjacentHTML('afterbegin', `<p class='mwst'>✦ MODE SECRET ✦ — Mewtwo libère toute sa puissance. Récompense : la <b>carte LÉGENDAIRE de Mewtwo</b> (édition limitée).</p>`); }
})(showBossDefi);
SCREENS.boss = (...a) => showBossDefi(...a);
battleEnd = (prev => function(win){
  const c = G && G.cfg; if(!c || c.mode !== 'boss' || !c.diff) return prev(win);
  const perfect = win && G.team.every(m => m.hp > 0), wasLocked = !MwPerfect.unlocked();
  if(perfect && c.diff !== 'secret'){ MwPerfect.all()[c.diff] = 1; Save.save(); }
  syncSecret();
  const r = prev(win);                                     // écran de boss-defi.js (la carte « L » = la carte légendaire)
  if(!win) return r;
  const h = document.querySelector('#menu h1'); if(!h) return r;
  if(c.diff === 'secret'){
    h.innerHTML = h.innerHTML.replace('Mewtwo est vaincu !', '✦ Mewtwo est vaincu ! ✦');
    const p = document.querySelector('#menu .bwin p'); if(p) p.innerHTML = `<b>Carte LÉGENDAIRE !</b><br>Mewtwo — édition limitée<br><small>Touche la carte pour la voir en grand.</small>`;
  } else h.insertAdjacentHTML('afterend', perfect ? `<p class='mwpfm'>★ Sans perdre un seul Pokémon !${wasLocked && MwPerfect.unlocked() ? ' <b>Le mode SECRET est débloqué…</b>' : ''}</p>` : `<p class='hint'>Astuce : gagne sans perdre un seul Pokémon pour approcher du secret…</p>`);
  return r;
})(battleEnd);
startBoss = (prev => function(team, diff){ syncSecret(); if(diff === 'secret' && !MwPerfect.unlocked()) diff = 'extreme'; return prev(team, diff); })(startBoss);

// ---------- carte légendaire de Mewtwo : décor « Laboratoire » ----------
function legBgLabo(c, t, fire, T){
  const W = 120;
  // mur du labo : panneaux métalliques + écrans
  c.fillStyle = '#0e1424'; c.fillRect(0, 0, W, 130);
  for(let x = 0; x < W; x += 20){ c.fillStyle = x % 40 ? '#121a2e' : '#0c1220'; c.fillRect(x, 0, 20, 128); c.fillStyle = 'rgba(120,160,220,.08)'; c.fillRect(x, 0, 1, 128); }
  [[8, 18], [92, 22]].forEach(([sx, sy], i) => { c.fillStyle = '#05080f'; c.fillRect(sx, sy, 20, 14); const on = Math.sin(t*3 + i) > -.4;
    c.fillStyle = on ? 'rgba(90,255,160,.7)' : 'rgba(90,255,160,.25)'; for(let k = 0; k < 4; k++) c.fillRect(sx + 2, sy + 2 + k*3, 6 + ((t*10 + k*7 + i*5) % 10), 1); });
  // grand caisson de clonage brisé, derrière Mewtwo
  const tx = 60, ty = 76;
  c.fillStyle = 'rgba(80,220,160,.10)'; c.fillRect(tx - 22, ty - 52, 44, 80);
  const g = c.createLinearGradient(0, ty + 8, 0, ty + 28); g.addColorStop(0, 'rgba(60,255,170,.45)'); g.addColorStop(1, 'rgba(20,120,90,.6)'); c.fillStyle = g; c.fillRect(tx - 22, ty + 8, 44, 20);   // liquide restant
  for(let i = 0; i < 6; i++){ const by = ty + 26 - ((t*14 + i*9) % 18); c.fillStyle = 'rgba(180,255,220,.6)'; c.fillRect(tx - 18 + i*7, by, 1.5, 1.5); }               // bulles
  c.strokeStyle = '#3a4a66'; c.lineWidth = 2; c.strokeRect(tx - 22, ty - 52, 44, 80);
  c.fillStyle = '#2a3448'; c.fillRect(tx - 26, ty - 58, 52, 7); c.fillRect(tx - 26, ty + 27, 52, 6);
  c.strokeStyle = 'rgba(200,240,255,.55)'; c.lineWidth = .8; c.beginPath();                                                        // fissures du verre
  [[tx - 8, ty - 30, tx - 18, ty - 44], [tx - 8, ty - 30, tx + 4, ty - 48], [tx - 8, ty - 30, tx - 20, ty - 18], [tx - 8, ty - 30, tx + 14, ty - 22]].forEach(([a, b, x2, y2]) => { c.moveTo(a, b); c.lineTo(x2, y2); }); c.stroke();
  // câbles qui pendent + étincelles
  c.strokeStyle = '#05080f'; c.lineWidth = 1.6; [[10, 0, 24, 60], [112, 0, 98, 54]].forEach(([x0, y0, x1, y1], i) => { c.beginPath(); c.moveTo(x0, y0); c.quadraticCurveTo((x0 + x1)/2 + Math.sin(t + i)*3, y1 - 6, x1, y1); c.stroke();
    if(Math.sin(t*7 + i*3) > .7){ c.fillStyle = '#ffffa0'; c.fillRect(x1 - 1, y1 - 1, 2, 2); c.fillStyle = 'rgba(255,255,160,.5)'; c.fillRect(x1 - 3, y1 + 1, 1, 1); c.fillRect(x1 + 2, y1 + 2, 1, 1); } });
  // aura psychique violette au sol
  const a = c.createRadialGradient(60, 128, 4, 60, 128, 60); a.addColorStop(0, `rgba(190,110,255,${.45 + .15*Math.sin(t*2) + fire*.3})`); a.addColorStop(1, 'rgba(120,40,200,0)');
  c.fillStyle = a; c.fillRect(0, 70, W, 70);
  // sol carrelé
  const gr = c.createLinearGradient(0, 124, 0, 180); gr.addColorStop(0, '#1c2438'); gr.addColorStop(1, '#070a12'); c.fillStyle = gr; c.fillRect(0, 126, W, 60);
  c.strokeStyle = 'rgba(140,170,230,.12)'; c.lineWidth = .6; for(let x = -40; x < 160; x += 14){ c.beginPath(); c.moveTo(60 + (x - 60)*.4, 126); c.lineTo(x, 180); c.stroke(); }
}
function legFgLabo(c, t, fire, T){
  const W = 120, H = 180;
  // débris (verre, métal) qui lévitent sous la télékinésie
  for(let i = 0; i < 9; i++){ const x = 8 + lgR(i, 31)*104 + Math.sin(t*.9 + i)*3, y = 40 + lgR(i, 32)*90 + Math.sin(t*1.3 + i*2)*5, r = t*(.6 + lgR(i, 33)) + i;
    c.save(); c.translate(x, y); c.rotate(r); c.globalAlpha = .85; c.fillStyle = i % 3 ? 'rgba(200,240,255,.55)' : '#5a6a88';
    c.beginPath(); c.moveTo(-2.5, -1.5); c.lineTo(2.5, -2); c.lineTo(1.5, 2); c.closePath(); c.fill();
    c.strokeStyle = 'rgba(200,130,255,.7)'; c.lineWidth = .5; c.stroke(); c.restore(); }
  // étincelles psychiques
  c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 24; i++){ const sp = 6 + lgR(i, 34)*10, y = 176 - ((t*sp + lgR(i, 35)*176) % 176), x = 6 + lgR(i, 36)*108 + Math.sin(t*1.4 + i)*4;
    c.globalAlpha = .55*Math.min(1, (176 - y)/30); c.fillStyle = i % 3 ? '#c890ff' : '#ffe0ff'; c.fillRect(x, y, 1, 1); }
  c.globalCompositeOperation = 'source-over';
  if(fire > 0){ c.globalAlpha = fire*.12; c.fillStyle = '#8a3ae8'; c.fillRect(0, 0, W, H); }
  c.globalAlpha = 1;
}
function legAtkPsyBall(c, mx, my, t, fire){                                        // Psykoud'Boul : la boule se charge puis le rayon part
  const grow = Math.min(1, fire*1.6), beam = Math.max(0, (fire - .5)/.5), r = 3 + grow*7;
  c.save(); c.globalCompositeOperation = 'lighter';
  for(let i = 0; i < 20; i++){ const a = i/20*6.283 - t*7, d = r + 6 - grow*3; c.globalAlpha = fire*.8; c.fillStyle = i % 2 ? '#e0b0ff' : '#8a3ae8'; c.fillRect(mx + Math.cos(a)*d, my + Math.sin(a)*d, 1.2, 1.2); }
  let g = c.createRadialGradient(mx, my, 0, mx, my, r*2.6); g.addColorStop(0, 'rgba(255,230,255,.95)'); g.addColorStop(.4, 'rgba(190,110,255,.8)'); g.addColorStop(1, 'rgba(110,30,200,0)');
  c.globalAlpha = fire; c.fillStyle = g; c.beginPath(); c.arc(mx, my, r*2.6, 0, 6.283); c.fill();
  if(beam > 0){ const L = 90*beam, w = 4 + 3*Math.sin(t*30); g = c.createLinearGradient(mx, my, mx - L, my - L*.25); g.addColorStop(0, 'rgba(255,240,255,.95)'); g.addColorStop(1, 'rgba(160,80,255,0)');
    c.strokeStyle = g; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(mx, my); c.lineTo(mx - L, my - L*.25); c.stroke(); }
  c.restore();
}
if(typeof LEGEND_THEMES !== 'undefined') LEGEND_THEMES.labo = {
  sky:['#05060e', '#0e1424', '#1a1838', '#2a1a4a'], rim:'#c070ff', rimTint:'#a050ff', glare:.1, shadow:'#05060e', mouth:[.3, .35],
  ribbon:['#2a0a40', '#ffd23f', '#2a0a40'], panel:'rgba(10,8,24,.8)', bg:legBgLabo, fg:legFgLabo, atk:legAtkPsyBall
};

document.head.insertAdjacentHTML('beforeend', `<style>
.rstat{border-collapse:collapse;font-size:10px;margin:2px auto 4px;min-width:300px}.rstat th{font-size:8px;opacity:.75;font-weight:400;padding:1px 6px}
.rstat td{padding:2px 6px;text-align:center;border-bottom:1px solid #fff2}.rstat td:first-child{text-align:left}.rstat tr.me td{color:#ffe9a0}.rstat small{opacity:.6}
.rstw{font-size:9px!important;margin:0}
.btn2.mwsec{border-color:#ffd23f!important;background:linear-gradient(90deg,#2a1a00,#5a3a00);color:#ffe9a0;box-shadow:0 0 10px rgba(255,210,63,.35)}
.btn2.mwsec.lock{opacity:.75;filter:grayscale(.4);cursor:default}.btn2.mwsec small{font-size:8px;opacity:.8}
.mwpf{font-style:normal;color:#ffd23f}.mwst{color:#ffe9a0;font-size:11px;border:1px solid #ffd23f88;border-radius:6px;padding:3px 6px;background:rgba(60,40,0,.4)}
.mwpfm{color:#ffd23f;font-size:12px}
</style>`);
