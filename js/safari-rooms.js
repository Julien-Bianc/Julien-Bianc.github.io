// ============================================================
//  safari-rooms.js — SAFARI EN PLUSIEURS SALLES (v0.14) — réglages : data/safari-rooms.js
//    • Chaque salle : plusieurs Pokémon sauvages en même temps. Celui marqué (le « meneur ») utilise toutes
//      ses attaques ; les autres tournent autour de toi et tirent à distance. Quand le meneur tombe,
//      le suivant prend sa place (avec les PV qu'il lui reste).
//    • Tes projectiles touchent tous les Pokémon de la salle ; le corps à corps et les zones touchent le meneur.
//    • Dernière salle : le Pokémon à capturer (lui seul peut être capturé).
// ============================================================
// ---------- les Pokémon « sauvages seulement » ne vont pas dans le roster ----------
const _regRooms = registerPokemon;
registerPokemon = function(id){
  const r = _regRooms(id);
  if(POKEMON[id] && POKEMON[id].wildOnly){ const i = ORDER.indexOf(id); if(i >= 0) ORDER.splice(i, 1); }
  return r;
};
function roomsFor(pid){
  const R = (SAFARI_ROOMS[pid] || []).filter(r => POKEMON[r.pokemon] && SPR[r.pokemon] && HERO[r.pokemon]);
  return R.length > 1 && R[R.length - 1].pokemon === pid ? R : null;
}
// ---------- lancement ----------
const _startSafariR = startSafari;
startSafari = function(team, z, pid){
  const R = roomsFor(pid); if(!R) return _startSafariR(team, z, pid);
  if(!team || !pid || Owned.has(pid) || Save.itemCount(z.ticket.id) < 1 || ballsLeft() < 1) return showSafari({ zone:z.id });
  Save.addItem(z.ticket.id, -1); Save.lastTeam = team.id;
  const M = mapOf(pid), stage = { ...z.stage, arena:M.idx };
  start({ mode:'safari', zone:z.id, target:pid, rooms:R, team:team.members.slice(), size:team.size, teamId:team.id, stage, arena:M.idx, enemies:R.flatMap(r => Array(r.count).fill(r.pokemon)) });
  G.safari = { ball:SAFARI.balls.find(b => Save.itemCount(b.id) > 0).id, cd:0, warned:false };
};
function rmState(){
  if(!G.rm){ const st = []; let n = 0; G.cfg.rooms.forEach(r => { st.push(n); n += r.count; }); G.rm = { starts:st, ri:-1, adds:[], dead:new Set(), banner:null }; }
  return G.rm;
}
const roomOf = idx => { const S = G.rm; let r = 0; S.starts.forEach((s, i) => { if(idx >= s) r = i; }); return r; };
function mkAdd(R, idx, k){
  const t = R.pokemon, S = G.stage, hp = Math.round(HERO[t].hp*S.hp*R.hp*(1 + .05*idx)), a = k*2.1 + Math.random()*.5;
  return { t, idx, x:clX(G.e.x + Math.cos(a)*90), y:clY(G.e.y + Math.sin(a)*70), hp, max:hp, r:22, next:1.4 + k*.8, tele:0, tm:1, ph:a, st:null, stT:0, hitT:0, ann:null };
}
// ---------- entrée d'un Pokémon : nouvelle salle ou relève par un membre de la meute ----------
const _spawnRooms = spawn;
spawn = function(){
  if(!(G && G.cfg && G.cfg.rooms)) return _spawnRooms();
  const S = rmState();
  while(S.dead.has(G.wave)) G.wave++;
  if(G.wave >= G.et.length){ G.over = 1; battleEnd(true); return; }
  const idx = G.wave, ri = roomOf(idx), R = G.cfg.rooms[ri], add = S.adds.find(a => a.idx === idx);
  _spawnRooms();
  const e = G.e; e.ridx = idx; e.rdmg = R.dmg;
  e.hp = e.max = Math.max(1, Math.round(e.max*R.hp));
  if(add){                                                          // relève : il était déjà dans la salle
    S.adds = S.adds.filter(a => a !== add);
    Object.assign(e, { x:add.x, y:add.y, hp:add.hp, max:add.max, st:add.st, stT:add.stT, hid:false, next:.6 });
    G.em = null; G.intro = 0;
  } else if(ri !== S.ri){                                           // nouvelle salle
    S.ri = ri; S.banner = { t0:G.time, s:R.label, n:ri + 1, of:G.cfg.rooms.length };
    for(let k = 1; k < R.count; k++){ const ai = S.starts[ri] + k; if(!S.dead.has(ai)) S.adds.push(mkAdd(R, ai, k)); }
    G.intro = Math.min(G.intro, 1);
    if(ri > 0){ flashScreen(.25); G.shake = Math.max(G.shake, .3); }
  }
};
// le meneur frappe selon la salle
const _eFireRooms = eFire;
eFire = function(){
  const e = G.e; if(!(G.cfg && G.cfg.rooms && e && e.rdmg)) return _eFireRooms();
  const d0 = G.stage.dmg; G.stage.dmg = d0*e.rdmg; try{ return _eFireRooms(); } finally { G.stage.dmg = d0; }
};
// ---------- la meute ----------
function addMoves(t){ return (MV[t] || []).map((m, i) => m.fan ? i : -1).filter(i => i >= 0); }
function updAdds(dt){
  const S = G.rm, p = G.p, R = G.cfg.rooms[S.ri] || {}, frozen = G.intro > 0 || G.endAt || G.sw;
  S.adds.forEach((a, k) => {
    if(a.hitT > 0) a.hitT -= dt;
    if(a.st){ a.stT -= dt; if(a.st === 'burn' || a.st === 'psn') a.hp -= 3*dt; if(a.stT <= 0) a.st = null; }
    if(frozen) return;
    // tourne autour de toi à distance, en évitant les autres
    const ang = a.ph + G.time*.35, dist = 190 + Math.sin(G.time*.8 + a.ph)*40;
    let tx = p.x + Math.cos(ang)*dist, ty = p.y + Math.sin(ang)*dist*.75;
    for(const o of [G.e, ...S.adds]) if(o && o !== a && o.hp > 0){ const dx = a.x - o.x, dy = a.y - o.y, d = Math.hypot(dx, dy) || 1; if(d < 60){ tx += dx/d*40; ty += dy/d*40; } }
    const sp = (HERO[a.t].sp || 180)*.55*(G.stage.speed || 1)*(a.st === 'par' ? .5 : 1), dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
    if(d > 4){ a.x = clX(a.x + dx/d*Math.min(d, sp*dt)); a.y = clY(a.y + dy/d*Math.min(d, sp*dt)); }
    // attaque à distance avec signal
    const pats = addMoves(a.t); if(!pats.length || a.st === 'frz' || a.st === 'slp') return;
    if(a.tele > 0){ a.tele -= dt; if(a.tele <= 0){ const m = MV[a.t][a.pat]; a.ann = { an:'Shoot', t0:G.time };
        cast(a, { x:p.x, y:p.y, r:p.r }, m, 0, 0, G.stage.dmg*(R.dmg || 1)*.85); a.next = (1.7 + Math.random()*1.2)*(G.stage.rate || 1); } return; }
    a.next -= dt; if(a.next <= 0){ a.pat = pats[Math.floor(Math.random()*pats.length)]; a.tele = a.tm = .6*(G.stage.tele || 1); }
  });
  // tes projectiles touchent toute la meute
  for(let i = bullets.length - 1; i >= 0; i--){
    const b = bullets[i]; if(!b.own) continue;
    for(const a of S.adds){
      if(a.hp <= 0 || (b.hitA && b.hitA.includes(a)) || Math.hypot(b.x - a.x, b.y - a.y) > b.r + a.r) continue;
      const x = typeMult(b.t, a.t), dm = Math.max(1, b.d*x); a.hp -= dm; a.hitT = .2;
      dmgTxt(a.x + R_(-6, 6), a.y - 34, String(Math.round(dm*10)), x > 1 ? '#ffe27a' : '#ffffff'); vp({ x:a.x, y:a.y - 8, life:.25, s:4, s1:22, kind:'ring', col:COL[b.t] || '#fff' });
      if(typeof playSfx === 'function') playSfx('hit:' + b.t);
      if(b.pierce){ (b.hitA = b.hitA || []).push(a); } else { bullets.splice(i, 1); }
      break;
    }
  }
  // K.O. dans la meute
  for(const a of S.adds.slice()) if(a.hp <= 0){
    S.adds = S.adds.filter(x => x !== a); S.dead.add(a.idx);
    dmgTxt(a.x, a.y - 40, 'K.O.', '#ffd23f'); G.shake = Math.max(G.shake, .25); flashScreen(.08);
    burst(14, (i, q) => vp({ x:a.x, y:a.y, vx:Math.cos(q)*R_(60, 180), vy:Math.sin(q)*R_(60, 180), life:R_(.3, .6), s:R_(4, 7), s1:2, kind:'star', col:'#fff2a0', rot:q }));
  }
}
const _stepRooms = step;
step = function(dt){
  _stepRooms(dt);
  if(!G || G.over || G.paused || !G.cfg || !G.cfg.rooms || !G.rm) return;
  updAdds(dt);
  // la relève dans la même salle arrive vite
  if(G.wait > .7 && G.e && G.e.hp <= 0){ let n = G.wave + 1; while(G.rm.dead.has(n)) n++; if(n < G.et.length && roomOf(n) === G.rm.ri) G.wait = .7; }
};
// ---------- dessin ----------
function drawAdds(){
  if(!G || !G.rm || !G.rm.adds.length) return;
  const p = G.p;
  for(const a of G.rm.adds){
    const fr = mon(a, 1), k = 2; animOf(a, p.x, p.y, 1);
    ctx.save(); ctx.translate(Math.round(a.x), Math.round(a.y));
    ctx.fillStyle = '#0003'; ctx.strokeStyle = '#ff9a6aa0'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, (fr.sy ?? 14)*k, (fr.sw ?? 11)*k, (fr.sh ?? 5)*k, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    if(a.hitT > 0) ctx.translate((Math.random() - .5)*4, 0);
    ctx.drawImage(a.hitT > .1 && typeof flash === 'function' ? flash(fr) : fr, -fr.width*k/2, -fr.height*k/2, fr.width*k, fr.height*k);
    ctx.restore();
    if(a.tele > 0){ const u = 1 - a.tele/a.tm; ctx.strokeStyle = '#ff3b3b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(a.x, a.y, a.r + 3 + u*14, 0, 6.283); ctx.stroke(); }
    const w = 34, f = Math.max(0, a.hp/a.max); ctx.fillStyle = '#0a0614cc'; ctx.fillRect(a.x - w/2 - 1, a.y - 46, w + 2, 5); ctx.fillStyle = f < .3 ? '#e8503c' : '#46d468'; ctx.fillRect(a.x - w/2, a.y - 45, w*f, 3);
  }
}
const _dbRooms = drawBullets; drawBullets = function(){ _dbRooms(); drawAdds(); };
const _dsfRooms = drawScreenFx;
drawScreenFx = function(){
  _dsfRooms();
  const B = G && G.rm && G.rm.banner; if(!B) return; const t = G.time - B.t0; if(t > 2.4){ G.rm.banner = null; return; }
  const a = Math.min(1, t*4, (2.4 - t)*3), y = VH/2 - 26;
  ctx.save(); ctx.globalAlpha = a; ctx.fillStyle = 'rgba(12,6,24,.85)'; ctx.fillRect(0, y, VW, 52);
  ctx.fillStyle = '#ffd23f'; ctx.fillRect(0, y, VW, 2); ctx.fillRect(0, y + 50, VW, 2);
  htext(`SALLE ${B.n}/${B.of}`, VW/2, y + 18, 11, '#ffb070', 'center'); htext(B.s, VW/2 + (1 - Math.min(1, t*3))*-40, y + 40, 16, '#fff6e0', 'center');
  ctx.restore();
};
// Pokéballs de l'adversaire : les membres de la meute déjà K.O. sont grisés
const _pipsRooms = hudEnemyPips;
hudEnemyPips = function(){ if(!(G.cfg && G.cfg.rooms && G.rm)) return _pipsRooms(); return G.et.map((_, i) => G.rm.dead.has(i) || i < G.wave ? 2 : i === G.wave ? 1 : 0); };
// ---------- écran Safari : indique les salles ----------
const _showSafariR = showSafari;
showSafari = function(sel){
  _showSafariR(sel);
  const f = document.querySelector('.sf-ed .card.foc'), right = document.querySelector('.sf-ed .right'); if(!f || !right) return;
  const R = roomsFor(f.dataset.pid); if(!R) return;
  right.insertAdjacentHTML('afterbegin', `<div class='sf-rooms'><b>🔥 Safari en ${R.length} salles</b>${R.map((r, i) => `<span>${i + 1}. ${esc(NAME[r.pokemon] || r.pokemon)}${r.count > 1 ? ' ×' + r.count : ''}${i === R.length - 1 ? ' — à capturer' : ''}</span>`).join('')}</div>`);
};
SCREENS.safari = showSafari;
document.head.insertAdjacentHTML('beforeend', `<style>
.sf-rooms{display:flex;flex-direction:column;gap:1px;background:rgba(255,120,60,.12);border:1px solid rgba(255,140,80,.45);border-radius:6px;padding:4px 8px;margin-bottom:4px;font-size:11px}
.sf-rooms b{color:#ffb070}
</style>`);
