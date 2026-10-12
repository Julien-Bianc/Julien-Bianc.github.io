// ============================================================
//  ATTAQUES DES POKÉMON : 'melee' (charge), 'fan' (éventail de projectiles), 'fly' (vol + plongeon)
//  + effets visuels de coups (effect : claws, slash, dragon, quick, slam, ram, impact)
//  Pour ajouter un NOUVEAU TYPE d'attaque : ajoute un `kind` dans data/pokemon.js,
//  une conversion dans pokemon-register.js (toEngineMove) et une fonction ici + un `if` dans cast.
// ============================================================
const AS = 1.5;      // vitesse de lecture des animations d'attaque
const sfx = [];

function resolveAnim(S, n){ if(!n) return null; if(S.IM[n]) return n; const a = S.alias[n]; return a && S.IM[a] ? a : null; }

// ---------- corps à corps ----------
function melee(s, d, m, c, own, sc, ang){
  if(s.rs || s.fl) return;
  const S = SPR[s.t], M = m.mel, an = resolveAnim(S, M.an) || 'Attack', cum = S.CUM[an], tk = 1/(60*AS);
  const ta = M.ta || .14, hf = M.hf || [S.D.anim[an].hit || 3], c0 = cum[hf[0]];
  // La charge suit la direction VISÉE. Si la cible est sur la trajectoire on s'arrête à son contact,
  // sinon on avance peu (coup dans le vide) : il faut viser pour toucher.
  const a = ang ?? Math.atan2(d.y - s.y, d.x - s.x);
  const ux = Math.cos(a), uy = Math.sin(a), along = (d.x - s.x)*ux + (d.y - s.y)*uy, perp = Math.abs(-(d.x - s.x)*uy + (d.y - s.y)*ux);
  const onPath = along > 0 && perp < d.r + s.r + 26;
  const go = Math.min(M.rng || 240, onPath ? Math.max(0, along - (s.r + d.r + 6)) : Math.min(120, M.rng || 240));
  let ex = s.x + Math.cos(a)*go, ey = s.y + Math.sin(a)*go;
  ex = Math.max(30, Math.min(W - 30, ex)); ey = Math.max(44, Math.min(H - 34, ey));
  const hits = hf.map(f => ({ t: ta + (cum[f] - c0)*tk, done:0 })), last = hits[hits.length - 1].t;
  const tr = last + .1, end = Math.max(ta + (S.TOT[an] - c0)*tk, tr + .12);
  s.rs = { an, t0:G.time, sx:s.x, sy:s.y, ex, ey, ta, tk, c0, hits, tr, tb:end - tr, end, m, M, c, own, sc };
}
function rsTick(R, t){ return t < R.ta ? R.c0*(t/R.ta) : R.c0 + (t - R.ta)/R.tk; }

function updRs(s, d, own){
  const R = s.rs; if(!R) return;
  const t = G.time - R.t0;
  let p = t < R.ta ? t/R.ta : t < R.tr ? 1 : Math.max(0, 1 - (t - R.tr)/R.tb); p = p*p*(3 - 2*p);
  s.x = R.sx + (R.ex - R.sx)*p; s.y = R.sy + (R.ey - R.sy)*p;
  if(own) s.inv = Math.max(s.inv, .05);
  for(const h of R.hits){
    if(h.done || t < h.t) continue; h.done = 1;
    if(Math.hypot(s.x - d.x, s.y - d.y) >= s.r + d.r + 28) continue;   // la cible a esquivé
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
}

// ---------- éventail de projectiles ----------
function fan(s, d, m, c, own, sc, ang){
  const F = m.fan, a = ang ?? Math.atan2(d.y - s.y, d.x - s.x), R = Math.random;
  const sp = (F.speed || 260) * (own ? 1 : (.85 + Math.min(G.wave, 3)*.03) * G.stage.pspeed), dm = m.d * (F.share ?? .5) * (1 + c*.9) * sc;
  const n = F.count || 5, mid = (n - 1)/2;
  s.ann = { an:F.anim || 'Shoot', t0:G.time };
  for(let i = 0; i < n; i++){
    const an = a + (i - mid)*(F.spread || .15) + (R() - .5)*(F.jitter ?? .05), v = sp*(.8 + R()*.4);
    bullets.push({ x:s.x + Math.cos(a)*16, y:s.y + Math.sin(a)*16, vx:Math.cos(an)*v, vy:Math.sin(an)*v,
      r:(F.radius || 5) + (F.radiusJitter ? R()*F.radiusJitter : 0), d:dm, t:m.tp, k:'fan', own,
      life:F.life || 1, hit:0, age:0, status:F.status, home:F.home, col:F.color });
  }
  if(F.exhaust) s.exh = G.time + F.exhaust;      // ralentit le lanceur après l'attaque
}

// ---------- vol + plongeon ----------
function startFly(s, d, m, c, own, sc){
  if(s.rs || s.fl) return;
  const F = m.fly, rise = F.rise || .6, dive = F.dive || .2;
  s.fl = { tx:d.x, ty:d.y, t0:G.time, tA:rise, tD:dive, tot:rise + dive + .2, h:F.height || 70, speed:F.speed || 330, rad:F.radius || 46, m, c, own, sc, done:0, oy:0 };
}
function updFl(s, d, own){
  const F = s.fl; if(!F) return;
  const t = G.time - F.t0;
  if(own) s.inv = Math.max(s.inv, .1); else s.invT = G.time + .1;          // invulnérable en l'air
  if(t < F.tA){
    const a = Math.atan2(F.ty - s.y, F.tx - s.x), v = Math.min(Math.hypot(F.tx - s.x, F.ty - s.y), F.speed*DT);   // vole vers le point visé
    s.x += Math.cos(a)*v; s.y += Math.sin(a)*v; F.oy = -F.h*Math.sin(t/F.tA*Math.PI/2);
  } else if(t < F.tA + F.tD){ F.oy = -F.h*(1 - (t - F.tA)/F.tD); }
  else {
    F.oy = 0;
    if(!F.done){
      F.done = 1; fx.push({ x:s.x, y:s.y, t:.5, mx:.5 }); fx.push({ x:s.x, y:s.y, t:.7, mx:.7 });
      G.shake = Math.max(G.shake, .4); HS = Math.max(HS, .08); crater(s.x, s.y, 22, COL[F.m.tp]);
      for(let i = 0; i < 22; i++) pt.push({ x:s.x, y:s.y, vx:(Math.random() - .5)*300, vy:(Math.random() - .5)*180, g:0, t:.45, c:i%2 ? '#d8d8ff' : '#fff', s:3 });
      if(Math.hypot(s.x - d.x, s.y - d.y) < F.rad + d.r){
        const b = { t:F.m.tp, k:'fly', own }, dm = F.m.d * F.sc * (1 + F.c*.9);
        if(own){ if(hurtE(dm, b)){ s.fl = null; return; } } else { if(hurtP(dm, b)){ s.fl = null; return; } }
      }
    }
    if(t >= F.tot) s.fl = null;
  }
  s.x = Math.max(30, Math.min(W - 30, s.x)); s.y = Math.max(44, Math.min(H - 34, s.y));
}

// ---------- flaque persistante (ex. Bomb Beurk) : zone qui blesse et empoisonne ----------
const pools = [];
function pool(s, d, m, c, own, sc){
  const P = m.pool, dm = m.d * (1 + c*.9) * sc;
  const x = Math.max(30, Math.min(W - 30, d.x)), y = Math.max(44, Math.min(H - 34, d.y));
  s.ann = { an:P.anim || 'Shoot', t0:G.time };
  pools.push({ sx:s.x, sy:s.y, x, y, r:(P.radius || 44)*(1 + c*.3), delay:.4, d0:.4, t:P.duration || 3.5, tick:0, dm, own, tp:m.tp, status:P.status });
}
function updPools(dt){
  for(let i = pools.length - 1; i >= 0; i--){
    const q = pools[i];
    if(q.delay > 0){ q.delay -= dt; continue; }
    q.t -= dt; q.tick -= dt;
    if(q.tick <= 0){
      q.tick = .4; const tg = q.own ? G.e : G.p;
      if(tg.hp > 0 && !(q.own && G.intro > 0) && Math.hypot(tg.x - q.x, tg.y - q.y) < q.r + tg.r*.6){
        const b = { t:q.tp, k:'pool', own:q.own, status:q.status };
        const ko = q.own ? hurtE(q.dm, b) : hurtP(q.dm, b);
        if(ko){ pools.length = 0; return; }
      }
    }
    if(q.t <= 0) pools.splice(i, 1);
  }
}
function drawPools(){
  for(const q of pools){
    const col = COL[q.tp] || '#a050c0';
    if(q.delay > 0){ const k = 1 - q.delay/q.d0, x = q.sx + (q.x - q.sx)*k, y = q.sy + (q.y - q.sy)*k - Math.sin(k*Math.PI)*60;
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, 7, 0, 6.283); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(x - 3, y - 3, 3, 3); continue; }
    const fade = Math.min(1, q.t/.6);
    ctx.globalAlpha = .45*fade; ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(q.x, q.y, q.r, q.r*.62, 0, 0, 6.283); ctx.fill();
    ctx.globalAlpha = .75*fade; ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.stroke();
    for(let j = 0; j < 6; j++){ const a = j*1.05 + G.time*1.5, rr = q.r*.6*((j%3 + 1)/3); ctx.fillStyle = '#fff'; ctx.fillRect(q.x + Math.cos(a)*rr, q.y + Math.sin(a)*rr*.6 - (G.time*14 + j*5)%10, 3, 3); }
    ctx.globalAlpha = 1;
  }
}
const _spwPool = spawn;
spawn = function(){ _spwPool(); pools.length = 0; };

// ---------- branchement sur le moteur ----------
const _cast = cast;
cast = function(s, d, m, c, own, sc, ang){
  const ab = abilityOf(s);
  if(ab && ab.lowHp && s.hp < s.max*ab.lowHp.below && m.tp === ab.lowHp.type){
    sc *= ab.lowHp.mult;
    if(!s.lowHpShown){ s.lowHpShown = 1; dmgTxt(s.x, s.y - 56, ab.lowHp.label || ab.name.toUpperCase() + ' !', '#ff8a3c'); }
  }
  const PK = POKEMON[s.t];
  if(PK && m.tp && PK.types.includes(m.tp)) sc *= 1.3;     // STAB : bonus si l'attaque est du type du Pokémon
  if(m.mel) return melee(s, d, m, c, own, sc, ang);
  if(m.fan) return fan(s, d, m, c, own, sc, ang);
  if(m.pool) return pool(s, d, m, c, own, sc);
  if(m.fly) return startFly(s, d, m, c, own, sc);
  return _cast(s, d, m, c, own, sc, ang);
};

function applyStatus(o, kind){
  if(o.st) return;
  if(kind === 'burn'){ o.st = 'burn'; o.stT = 4; dmgTxt(o.x, o.y - 50, 'BRÛLÉ', '#ff8a5a'); }
  else if(kind === 'par'){ o.st = 'par'; o.stT = 2; dmgTxt(o.x, o.y - 50, 'PARALYSÉ', '#ffe24a'); }
  else if(kind === 'poison'){ o.st = 'psn'; o.stT = 5; dmgTxt(o.x, o.y - 50, 'EMPOISONNÉ', '#c070e0'); }
  else if(kind === 'slow'){ o.st = 'par'; o.stT = 2.5; dmgTxt(o.x, o.y - 50, 'RALENTI', '#9fe3ff'); }   // ralentit (même effet que la paralysie)
}
const _ss = setSt;
setSt = function(o, t, k, b){
  const st = b && b.status;
  if(st && !o.st && Math.random() < (st.chance ?? 1)){ applyStatus(o, st.kind); return; }
  _ss(o, t, k, b);
};

const _step = step;
step = function(dt){
  if(HS > 0) return _step(dt);
  const p0 = G.p, x0 = p0.x, y0 = p0.y;
  _step(dt);
  if(!G || G.over) return;
  if(p0 === G.p && dt > 0){ p0.vx = (p0.x - x0)/dt; p0.vy = (p0.y - y0)/dt; }   // vitesse du joueur (pour la visée de l'ennemi)
  for(const c of G.team) if(c !== G.p){ c.rs = null; c.fl = null; }
  if(G.e.hp <= 0){ G.e.rs = null; G.e.fl = null; }
  updRs(G.p, G.e, 1); updFl(G.p, G.e, 1); updRs(G.e, G.p, 0); updFl(G.e, G.p, 0); updPools(dt);
};

// ---------- effets visuels des coups ----------
function drawSfx(){
  const n = performance.now();
  for(let i = sfx.length - 1; i >= 0; i--){
    const f = sfx[i], k = (n - f.born)/f.dur; if(k >= 1){ sfx.splice(i, 1); continue; }
    const col = COL[f.tp] || '#fff', q = Math.min(1, k*3);
    ctx.save(); ctx.translate(f.x, f.y); ctx.globalAlpha = 1 - k; ctx.lineCap = 'round';
    if(f.k === 'claws' || f.k === 'dragon'){
      ctx.strokeStyle = f.k === 'dragon' ? '#9a8aff' : '#fff';
      for(let j = 0; j < 3; j++){ ctx.lineWidth = 4*(1 - k) + 1; ctx.beginPath(); ctx.moveTo(-22 + j*12, -26); ctx.lineTo(-22 + j*12 + q*30, -26 + q*52); ctx.stroke(); }
      if(f.k === 'dragon'){ ctx.fillStyle = '#ff9a3c'; for(let j = 0; j < 6; j++) ctx.fillRect(Math.cos(j)*k*34, Math.sin(j*2)*k*34, 3, 3); }
    } else if(f.k === 'slash'){
      ctx.strokeStyle = '#d8b8ff'; ctx.lineWidth = 7*(1 - k) + 1; ctx.beginPath(); ctx.arc(0, 0, 30, -2.4 + k*.6, -.7 + k*.9); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 30, -2.4 + k*.6, -.7 + k*.9); ctx.stroke();
    } else if(f.k === 'quick'){
      ctx.rotate(f.a); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
      for(let j = -1; j <= 1; j++){ ctx.beginPath(); ctx.moveTo(-40*q, j*8); ctx.lineTo(10, j*8); ctx.stroke(); }
    } else if(f.k === 'slam'){
      ctx.strokeStyle = '#f2d9a0'; ctx.lineWidth = 6*(1 - k) + 1; ctx.beginPath(); ctx.ellipse(0, 6, 10 + k*54, 6 + k*24, 0, 0, 6.283); ctx.stroke();
    } else {   // 'ram' et effet générique : éclat de la couleur du type
      ctx.strokeStyle = f.k === 'ram' ? '#ffe08a' : col; ctx.lineWidth = 3;
      for(let j = 0; j < 8; j++){ const a = j*.785; ctx.beginPath(); ctx.moveTo(Math.cos(a)*8, Math.sin(a)*8); ctx.lineTo(Math.cos(a)*(14 + k*34), Math.sin(a)*(14 + k*34)); ctx.stroke(); }
    }
    ctx.restore();
  }
}
const _db = drawBullets;
drawBullets = function(){ _db(); drawPools(); drawSfx(); };
