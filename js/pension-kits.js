// ============================================================
//  pension-kits.js — KITS DE COMBAT des Pokémon de la Pension (v0.21.5) + correctif Carchacrok
//  12 nouveaux types d'attaque (kind) et 4 talents uniques. Les réglages de chaque attaque sont dans POKEMON[id].moves ci-dessous.
//
//   DRACOLOSSE  · Multiécaille : à PV max, les dégâts reçus sont divisés par 2
//      breath   Draco-Souffle   souffle continu en cône qui suit la cible (paralysie)
//      xspeed   Vitesse Extrême 3 ruées en zigzag à travers l'adversaire (invulnérable)
//      tornado  Ouragan         une tornade avance vers l'adversaire et l'ASPIRE
//   TARTARD     · Élan Combatif : chaque coup porté donne +7 % de dégâts (5 max) ; perdu quand il est touché
//      spiral   Hydro-Spirale   deux colonnes de gouttes qui s'enroulent en tire-bouchon vers la cible
//      uppercut Dynamopoing     ruée + uppercut : projette l'adversaire et le rend confus
//      whirl    Siphon          tourbillon au sol qui aspire puis jaillit en geyser
//   TOGEKISS    · Air Veinard : 20 % de chances d'esquiver complètement une attaque
//      crescent Lame d'Air      deux lames en croissant qui se croisent sur la cible (peut l'apeurer)
//      nova     Éclat Magique   10 étoiles qui flottent autour de lui puis foncent sur la cible
//      skydive  Piqué Céleste   grande boucle à travers l'adversaire, laisse une traînée arc-en-ciel qui blesse
//   AZUMARILL   · Coloforce : attaques de contact ×1,35
//      bubbles  Bulles Rebond   grosses bulles qui rebondissent sur les murs (ralentit)
//      roll     Roulade Aqua    roule en boule d'eau et rebondit sur les murs
//      hug      Câlinerie       bond sur l'adversaire, 3 coups de cœur, son attaque −25 % pendant 5 s
// ============================================================
const PK_KINDS = ['breath', 'xspeed', 'tornado', 'spiral', 'uppercut', 'whirl', 'crescent', 'nova', 'skydive', 'bubbles', 'roll', 'hug'];
PK_KINDS.forEach(k => { if(!PLUS_KINDS.includes(k)) PLUS_KINDS.push(k); });
if(!POINT_KINDS.includes('whirl')) POINT_KINDS.push('whirl');

// ---------------------------------------------------------------- fiches de combat
if(POKEMON.dracolosse) Object.assign(POKEMON.dracolosse, {
  ability:{ name:'Multiécaille', desc:'À PV max, les dégâts reçus sont divisés par 2.', pk:'multiscale' },
  moves:[
    { name:'Draco-Souffle', type:'dragon', kind:'breath', power:16, cooldown:1.6, time:.85, length:250, arc:.42, tick:.1, turn:2.4, anim:'Attack', status:{ kind:'par', chance:.3 } },
    { name:'Vitesse Extrême', type:'normal', kind:'xspeed', power:9, cooldown:2.6, legs:3, leg:.12, over:70, anim:'Attack' },
    { name:'Ouragan', type:'vol', kind:'tornado', power:7, cooldown:7, time:3.2, speed:120, radius:58, pull:150, reach:190, tick:.25, anim:'Charge', big:true }
  ]
});
if(POKEMON.tartard) Object.assign(POKEMON.tartard, {
  ability:{ name:'Élan Combatif', desc:'Chaque coup porté : +7 % de dégâts (5 max). Perdu quand il est touché.', pk:'momentum' },
  moves:[
    { name:'Hydro-Spirale', type:'eau', kind:'spiral', power:14, cooldown:1.5, count:12, arms:2, speed:330, spin:2.6, amp:30, life:1.3, anim:'Attack' },
    { name:'Dynamopoing', type:'combat', kind:'uppercut', power:24, cooldown:3.6, range:210, rush:.16, knock:150, anim:'Attack', status:{ kind:'confuse', chance:1 } },
    { name:'Siphon', type:'eau', kind:'whirl', power:10, cooldown:6.5, time:2.6, radius:72, pull:110, tick:.3, burst:1.6, anim:'Charge', big:true }
  ]
});
if(POKEMON.togekiss) Object.assign(POKEMON.togekiss, {
  ability:{ name:'Air Veinard', desc:'20 % de chances d\'esquiver complètement une attaque.', pk:'luck' },
  moves:[
    { name:'Lame d\'Air', type:'vol', kind:'crescent', power:13, cooldown:1.3, time:.55, bend:110, flinch:.3, anim:'Attack' },
    { name:'Éclat Magique', type:'fee', kind:'nova', power:16, cooldown:2.8, count:10, ring:44, hover:.45, speed:420, anim:'Charge' },
    { name:'Piqué Céleste', type:'fee', kind:'skydive', power:22, cooldown:5.5, time:.7, loop:130, trail:2.2, trailShare:.12, anim:'Attack', big:true }
  ]
});
if(POKEMON.azumarill) Object.assign(POKEMON.azumarill, {
  ability:{ name:'Coloforce', desc:'Ses attaques de contact font 35 % de dégâts en plus.', pk:'hugepower' },
  moves:[
    { name:'Bulles Rebond', type:'eau', kind:'bubbles', power:12, cooldown:1.8, count:3, speed:190, life:4, radius:14, anim:'Attack', status:{ kind:'slow', chance:.6 } },
    { name:'Roulade Aqua', type:'eau', kind:'roll', power:13, cooldown:3.4, time:1.2, speed:430, bounces:3, anim:'Attack' },
    { name:'Câlinerie', type:'fee', kind:'hug', power:24, cooldown:4.5, leap:.32, hits:3, gap:.13, debuff:.25, debuffTime:5, range:260, anim:'Attack', big:true }
  ]
});
const PK_CONTACT = ['melee', 'uppercut', 'roll', 'hug', 'xspeed'];

// ---------------------------------------------------------------- état
const PKB = [], PKZ = [], PKT = [];     // projectiles, zones (tornade, siphon, traînées), textes
const pkFoe = own => own ? G.e : G.p;
const pkOk = o => o && o.hp > 0 && !o.hid && !o.fl;
const pkHit = (own, dm, tp, k, st) => hurtSide(own, dm, { t:tp, k, own, status:st });
function pkClear(o){ if(o){ o.mx = null; o.brth = null; } }
function pkAnim(s, an){ s.ann = { an:an || 'Attack', t0:G.time }; }

// ---------------------------------------------------------------- lancement
castPlus = (prev => function(s, d, m, c, own, sc, ang){
  if(!PK_KINDS.includes(m.k)) return prev(s, d, m, c, own, sc, ang);
  if(s.mx || s.brth) return true;
  const O = m.opt || {}, a = ang ?? Math.atan2(d.y - s.y, d.x - s.x), dm = dmgOf(m, c, sc), tp = m.tp, col = lcol(tp), T = pkFoe(own);
  pkAnim(s, O.anim);
  switch(m.k){
    case 'breath': s.brth = { t0:G.time, dur:O.time*(1 + c*.4), a, len:O.length*(1 + c*.2), arc:O.arc, tick:O.tick, nt:0, dm:dm*O.tick/O.time, own, tp, turn:O.turn, st:O.status }; return true;
    case 'xspeed': { const legs = O.legs + (c > .6 ? 1 : 0); s.mx = { k:'xs', i:-1, legs, leg:O.leg, over:O.over, own, dm:dm*.5, tp, t0:G.time, trail:[] }; pkNextLeg(s); return true; }
    case 'tornado': PKZ.push({ k:'tor', x:s.x + Math.cos(a)*40, y:s.y + Math.sin(a)*40, a, t:0, dur:O.time*(1 + c*.3), sp:O.speed, R:O.radius*(1 + c*.2), pull:O.pull, reach:O.reach, tick:O.tick, nt:0, dm:dm*O.tick/.65, own, tp, col }); G.shake = Math.max(G.shake, .2); return true;
    case 'spiral': { const n = O.count + Math.round(c*4); for(let i = 0; i < n; i++){ const arm = i % O.arms, k = Math.floor(i/O.arms);
        PKB.push({ k:'drop', x:s.x, y:s.y, ox:s.x, oy:s.y, a, r:0, sp:O.speed, ph:arm*Math.PI*2/O.arms, spin:O.spin, amp:O.amp || 30, t:-k*.07, life:O.life, dm:dm/n*2.2, own, tp, R:8, hit:0 }); } return true; }
    case 'uppercut': s.mx = { k:'up', t0:G.time, sx:s.x, sy:s.y, a, dist:O.range*(1 + c*.2), dur:O.rush, own, dm, tp, knock:O.knock*(1 + c*.4), st:O.status, hit:0 }; return true;
    case 'whirl': PKZ.push({ k:'whl', x:clX(d.x), y:clY(d.y), t:0, dur:O.time, R:O.radius*(1 + c*.25), pull:O.pull, tick:O.tick, nt:0, dm:dm*O.tick/1.1, burst:dm*O.burst, own, tp, col }); return true;
    case 'crescent': { const tx = d.x, ty = d.y;
        [-1, 1].forEach(sg => PKB.push({ k:'cres', sx:s.x, sy:s.y, tx, ty, sg, bend:O.bend*(1 + c*.3), t:0, dur:O.time, dm:dm*.55, own, tp, R:14, hit:0, fl:O.flinch })); return true; }
    case 'nova': { const n = O.count + Math.round(c*4); for(let i = 0; i < n; i++) PKB.push({ k:'star', ox:s, q:i/n*6.283, ring:O.ring, t:-i*.02, hov:O.hover, sp:O.speed, dm:dm/n*2.4, own, tp, R:8, x:s.x, y:s.y, go:0, life:2.2, hit:0 }); return true; }
    case 'skydive': { const tx = d.x, ty = d.y, dx = tx - s.x, dy = ty - s.y, L = Math.hypot(dx, dy) || 1, ex = clX(tx + dx/L*120), ey = clY(ty + dy/L*120), sg = Math.random() < .5 ? 1 : -1;
        s.mx = { k:'sky', t0:G.time, dur:O.time, sx:s.x, sy:s.y, mx:tx, my:ty, ex, ey, c1x:(s.x + tx)/2 - dy/L*O.loop*sg, c1y:(s.y + ty)/2 + dx/L*O.loop*sg, c2x:(tx + ex)/2 + dy/L*O.loop*.6*sg, c2y:(ty + ey)/2 - dx/L*O.loop*.6*sg, own, dm, tp, hit:0, trail:O.trail, ts:O.trailShare, lastP:null }; return true; }
    case 'bubbles': { const n = O.count + (c > .6 ? 2 : 0); for(let i = 0; i < n; i++){ const q = a + (i - (n - 1)/2)*.32; PKB.push({ k:'bub', x:s.x + Math.cos(q)*20, y:s.y + Math.sin(q)*20, vx:Math.cos(q)*O.speed*R_(.85, 1.1), vy:Math.sin(q)*O.speed*R_(.85, 1.1), life:O.life, t:0, dm:dm/n*2.6, own, tp, R:O.radius*(1 + c*.3), st:O.status, hit:0 }); } return true; }
    case 'roll': s.mx = { k:'roll', t0:G.time, dur:O.time*(1 + c*.4), vx:Math.cos(a)*O.speed, vy:Math.sin(a)*O.speed, b:O.bounces, own, dm, tp, nh:0, spin:0 }; return true;
    case 'hug': { const tx = d.x, ty = d.y, dd = Math.hypot(tx - s.x, ty - s.y), k = Math.min(1, (O.range*(1 + c*.2))/Math.max(1, dd)), stop = Math.max(0, 1 - (T ? (T.r + s.r + 4)/Math.max(1, dd) : 0));
        s.mx = { k:'hug', t0:G.time, sx:s.x, sy:s.y, ex:s.x + (tx - s.x)*Math.min(k, stop), ey:s.y + (ty - s.y)*Math.min(k, stop), leap:O.leap, hits:O.hits + (c > .6 ? 1 : 0), gap:O.gap, own, dm:dm/O.hits, tp, deb:O.debuff, debT:O.debuffTime, done:0 }; return true; }
  }
  return true;
})(castPlus);
function pkNextLeg(s){
  const M = s.mx, T = pkFoe(M.own); M.i++; if(M.i >= M.legs || !pkOk(T)){ s.mx = null; return; }
  const a = Math.atan2(T.y - s.y, T.x - s.x) + (M.i % 2 ? .5 : -.5)*(M.i ? 1 : 0), dd = Math.hypot(T.x - s.x, T.y - s.y) + M.over;
  M.sx = s.x; M.sy = s.y; M.ex = clX(s.x + Math.cos(a)*dd); M.ey = clY(s.y + Math.sin(a)*dd); M.lt = G.time; M.hit = 0;
  if(typeof playSfx === 'function') playSfx('dash');
}

// ---------------------------------------------------------------- mise à jour
function pkUpdCaster(s, dt){
  const own = s === G.p;
  if(s.brth){ const B = s.brth, t = G.time - B.t0, T = pkFoe(B.own);
    if(t > B.dur){ s.brth = null; }
    else {
      if(pkOk(T)){ let da = Math.atan2(T.y - s.y, T.x - s.x) - B.a; da = Math.atan2(Math.sin(da), Math.cos(da)); B.a += Math.max(-B.turn*dt, Math.min(B.turn*dt, da)); }
      for(let k = 0; k < 4; k++){ const q = B.a + R_(-B.arc, B.arc), v = R_(260, 380); vp({ x:s.x + Math.cos(B.a)*14, y:s.y - 8 + Math.sin(B.a)*14, vx:Math.cos(q)*v, vy:Math.sin(q)*v, life:B.len/v, s:R_(5, 8), s1:R_(14, 22), kind:'smoke', col:['#7a5aff', '#c070ff', '#5ac8ff', '#ff8a3c'][k], a:.75 }); }
      B.nt -= dt;
      if(B.nt <= 0 && pkOk(T)){ B.nt = B.tick; const dx = T.x - s.x, dy = T.y - s.y, dd = Math.hypot(dx, dy); let da = Math.atan2(dy, dx) - B.a; da = Math.atan2(Math.sin(da), Math.cos(da));
        if(dd < B.len + T.r && Math.abs(da) < B.arc + Math.atan2(T.r, Math.max(dd, 1))){ if(pkHit(B.own, B.dm, B.tp, 'breath', Math.random() < .25 ? B.st : null)) return true; } }
    } }
  const M = s.mx; if(!M) return false;
  const t = G.time - M.t0, T = pkFoe(M.own);
  if(M.k !== 'sky'){ if(own) s.inv = Math.max(s.inv || 0, .05); else s.invT = Math.max(s.invT || 0, G.time + .05); }     // v0.21.10 : Piqué Céleste n'est plus invulnérable
  if(M.k === 'xs'){
    const u = Math.min(1, (G.time - M.lt)/M.leg), e = ease(u); s.x = M.sx + (M.ex - M.sx)*e; s.y = M.sy + (M.ey - M.sy)*e;
    M.trail.push({ x:s.x, y:s.y, t:G.time }); if(M.trail.length > 30) M.trail.shift();
    if(!M.hit && pkOk(T) && Math.hypot(T.x - s.x, T.y - s.y) < T.r + s.r + 16){ M.hit = 1; HS = Math.max(HS, .04); vp({ x:T.x, y:T.y - 8, life:.3, s:6, s1:44, kind:'ring', col:'#ffffff' }); if(pkHit(M.own, M.dm, M.tp, 'xspeed')) return true; }
    if(u >= 1) pkNextLeg(s);
  } else if(M.k === 'up'){
    const u = Math.min(1, t/M.dur);
    if(!M.hit){ const e = ease(u); s.x = clX(M.sx + Math.cos(M.a)*M.dist*e); s.y = clY(M.sy + Math.sin(M.a)*M.dist*e);
      if(pkOk(T) && Math.hypot(T.x - s.x, T.y - s.y) < T.r + s.r + 10){ M.hit = G.time; G.shake = Math.max(G.shake, .55); HS = Math.max(HS, .09); flashScreen(.15);
        for(let k = 0; k < 3; k++) groundRing(T.x, T.y + 8, 8, 70 + k*30, k ? '#ff9a3c' : '#ffffff', .35 + k*.1, 4);
        burst(18, (i, q) => vp({ x:T.x, y:T.y - 10, vx:Math.cos(q)*R_(120, 300), vy:Math.sin(q)*R_(120, 300) - 80, life:R_(.3, .6), s:R_(3, 6), s1:1, kind:'star', col:i % 2 ? '#ffd23f' : '#ff7a3a', rot:q }));
        PKT.push({ x:T.x, y:T.y - 60, s:'POW !', t:.7, col:'#ffd23f' });
        if(pkHit(M.own, M.dm, M.tp, 'uppercut', M.st)) return true;
        if(pkOk(T)) throwBack(T, M.a, M.knock, .35); } }
    if((M.hit && G.time - M.hit > .25) || (!M.hit && u >= 1)) s.mx = null;
  } else if(M.k === 'sky'){
    const u = Math.min(1, t/M.dur), h = u < .5, e = h ? u*2 : u*2 - 1, iu = 1 - e, A = h ? [M.sx, M.sy, M.c1x, M.c1y, M.mx, M.my] : [M.mx, M.my, M.c2x, M.c2y, M.ex, M.ey];
    s.x = clX(iu*iu*A[0] + 2*iu*e*A[2] + e*e*A[4]); s.y = clY(iu*iu*A[1] + 2*iu*e*A[3] + e*e*A[5]);
    if(M.lastP && Math.hypot(s.x - M.lastP.x, s.y - M.lastP.y) > 14){ PKZ.push({ k:'trl', x1:M.lastP.x, y1:M.lastP.y, x2:s.x, y2:s.y, t:0, dur:M.trail, own:M.own, dm:M.dm*M.ts, tp:M.tp, nt:0, hue:(G.time*600) % 360 }); M.lastP = { x:s.x, y:s.y }; }
    if(!M.lastP) M.lastP = { x:s.x, y:s.y };
    if(!M.hit && pkOk(T) && Math.hypot(T.x - s.x, T.y - s.y) < T.r + s.r + 14){ M.hit = 1; HS = Math.max(HS, .06); G.shake = Math.max(G.shake, .35); burst(16, (i, q) => vp({ x:T.x, y:T.y - 8, vx:Math.cos(q)*220, vy:Math.sin(q)*220, life:.5, s:5, s1:1, kind:'star', col:`hsl(${i*40},100%,75%)`, rot:q }));
      if(pkHit(M.own, M.dm, M.tp, 'skydive')) return true; }
    if(u >= 1) s.mx = null;
  } else if(M.k === 'roll'){
    M.spin += dt*14; let nx = s.x + M.vx*dt, ny = s.y + M.vy*dt;
    if((nx < 30 || nx > W - 30) && M.b > 0){ M.vx = -M.vx; M.b--; nx = clX(nx); G.shake = Math.max(G.shake, .2); } if((ny < 44 || ny > H - 34) && M.b > 0){ M.vy = -M.vy; M.b--; ny = clY(ny); G.shake = Math.max(G.shake, .2); }
    s.x = clX(nx); s.y = clY(ny);
    if(Math.random() < .8) vp({ x:s.x + R_(-10, 10), y:s.y + 10, vx:-M.vx*.2 + R_(-30, 30), vy:R_(-90, -20), life:.4, s:3, s1:1, kind:'drop', col:'#7ad8ff', g:500 });
    if(pkOk(T) && G.time >= M.nh && Math.hypot(T.x - s.x, T.y - s.y) < T.r + s.r + 12){ M.nh = G.time + .35; G.shake = Math.max(G.shake, .25); groundRing(T.x, T.y + 8, 6, 50, '#7ad8ff', .3, 3);
      if(pkHit(M.own, M.dm, M.tp, 'roll')) return true; if(pkOk(T)) throwBack(T, Math.atan2(T.y - s.y, T.x - s.x), 50, .2); }
    if(t >= M.dur) s.mx = null;
  } else if(M.k === 'hug'){
    const u = Math.min(1, t/M.leap);
    if(u < 1){ const e = ease(u); s.x = M.sx + (M.ex - M.sx)*e; s.y = M.sy + (M.ey - M.sy)*e - Math.sin(u*Math.PI)*0; M.jump = Math.sin(u*Math.PI)*34; }
    else { M.jump = 0; const k = Math.floor((t - M.leap)/M.gap);
      while(M.done <= k && M.done < M.hits){ M.done++;
        if(pkOk(T) && Math.hypot(T.x - s.x, T.y - s.y) < T.r + s.r + 30){ HS = Math.max(HS, .03); burst(8, (i, q) => vp({ x:T.x + R_(-8, 8), y:T.y - 14, vx:Math.cos(q)*R_(60, 160), vy:Math.sin(q)*R_(60, 160) - 60, life:.6, s:R_(4, 7), s1:2, kind:'star', col:i % 2 ? '#ff7ac8' : '#ffd0e8', rot:q }));
          if(pkHit(M.own, M.dm, M.tp, 'hug')) return true;
          if(M.done === M.hits && pkOk(T)){ T.dbf = G.time + M.debT; T.dbfK = 1 - M.deb; PKT.push({ x:T.x, y:T.y - 60, s:'ATTAQUE −25 %', t:1, col:'#ff9ad8' }); } } }
      if(M.done >= M.hits) s.mx = null; }
  }
  return false;
}
function pkUpd(dt){
  for(const s of [G.p, G.e]){ if(s && (s.mx || s.brth) && s.hp > 0){ if(pkUpdCaster(s, dt)) return; if(!G || G.over) return; } }
  for(let i = PKB.length - 1; i >= 0; i--){
    const b = PKB[i], T = pkFoe(b.own); b.t += dt; if(b.t < 0) continue;
    if(b.k === 'drop'){ b.r += b.sp*dt; const off = Math.sin(b.t*b.spin*4 + b.ph)*b.amp*Math.min(1, b.t*4); b.x = b.ox + Math.cos(b.a)*b.r - Math.sin(b.a)*off; b.y = b.oy + Math.sin(b.a)*b.r + Math.cos(b.a)*off; if(b.t > b.life){ PKB.splice(i, 1); continue; } }
    else if(b.k === 'cres'){ const u = b.t/b.dur, iu = 1 - u, dx = b.tx - b.sx, dy = b.ty - b.sy, L = Math.hypot(dx, dy) || 1, cx = (b.sx + b.tx)/2 - dy/L*b.bend*b.sg, cy = (b.sy + b.ty)/2 + dx/L*b.bend*b.sg;
      const ox = b.x, oy = b.y; b.x = iu*iu*b.sx + 2*iu*u*cx + u*u*(b.tx + dx/L*u*60); b.y = iu*iu*b.sy + 2*iu*u*cy + u*u*(b.ty + dy/L*u*60); b.ang = Math.atan2(b.y - (oy ?? b.y), b.x - (ox ?? b.x)); if(u >= 1.25){ PKB.splice(i, 1); continue; } }
    else if(b.k === 'star'){ const o = b.ox;
      if(b.t < b.hov){ b.x = o.x + Math.cos(b.q + G.time*4)*b.ring; b.y = o.y - 8 + Math.sin(b.q + G.time*4)*b.ring*.7; }
      else { if(!b.go){ b.go = 1; const tx = T ? T.x : b.x, ty = T ? T.y : b.y, a = Math.atan2(ty - b.y, tx - b.x); b.vx = Math.cos(a)*b.sp; b.vy = Math.sin(a)*b.sp; }
        if(pkOk(T)){ const s = Math.hypot(b.vx, b.vy), ca = Math.atan2(b.vy, b.vx); let da = Math.atan2(T.y - b.y, T.x - b.x) - ca; da = Math.atan2(Math.sin(da), Math.cos(da)); const na = ca + da*Math.min(1, dt*3); b.vx = Math.cos(na)*s; b.vy = Math.sin(na)*s; }
        b.x += b.vx*dt; b.y += b.vy*dt; }
      if(b.t > b.life){ PKB.splice(i, 1); continue; } }
    else if(b.k === 'bub'){ b.x += b.vx*dt; b.y += b.vy*dt; b.vx *= 1 - dt*.15; b.vy *= 1 - dt*.15;
      if(b.x < 30 || b.x > W - 30){ b.vx = -b.vx; b.x = clX(b.x); } if(b.y < 44 || b.y > H - 34){ b.vy = -b.vy; b.y = clY(b.y); }
      if(b.t > b.life){ pkPop(b); PKB.splice(i, 1); continue; } }
    if(pkOk(T) && !b.hit && (b.k !== 'star' || b.go) && Math.hypot(T.x - b.x, T.y - b.y) < T.r + b.R){
      if(b.k === 'cres'){ b.hit = 1; if(b.fl && Math.random() < b.fl) pkFlinch(T); }
      if(b.k === 'bub') pkPop(b);
      const st = b.st;
      if(pkHit(b.own, b.dm, b.tp, b.k, st)) return;
      if(b.k !== 'cres'){ PKB.splice(i, 1); }
    }
  }
  for(let i = PKZ.length - 1; i >= 0; i--){
    const z = PKZ[i], T = pkFoe(z.own); z.t += dt; z.nt -= dt;
    if(z.k === 'tor'){ if(pkOk(T)){ const a = Math.atan2(T.y - z.y, T.x - z.x); z.a += Math.atan2(Math.sin(a - z.a), Math.cos(a - z.a))*Math.min(1, dt*1.2); }
      z.x = clX(z.x + Math.cos(z.a)*z.sp*dt); z.y = clY(z.y + Math.sin(z.a)*z.sp*dt);
      if(Math.random() < .7) vp({ x:z.x + R_(-z.R, z.R), y:z.y + R_(-10, 20), vx:R_(-40, 40), vy:R_(-160, -60), life:.6, s:R_(2, 4), s1:1, kind:'snow', col:Math.random() < .5 ? '#c8d8e8' : '#8a7058', g:-40 });
      if(pkOk(T)){ const dd = Math.hypot(T.x - z.x, T.y - z.y); if(dd < z.reach && dd > 4 && !T.kb){ const k = z.pull*dt*(1 - dd/z.reach*.5); T.x = clX(T.x - (T.x - z.x)/dd*k); T.y = clY(T.y - (T.y - z.y)/dd*k); }
        if(dd < z.R + T.r && z.nt <= 0){ z.nt = z.tick; if(pkHit(z.own, z.dm, z.tp, 'tornado')) return; } }
      if(z.t > z.dur){ PKZ.splice(i, 1); continue; } }
    else if(z.k === 'whl'){
      if(z.t < z.dur){ if(pkOk(T)){ const dd = Math.hypot(T.x - z.x, T.y - z.y); if(dd < z.R*1.9 && dd > 4 && !T.kb){ const k = z.pull*dt; T.x = clX(T.x - (T.x - z.x)/dd*k); T.y = clY(T.y - (T.y - z.y)/dd*k); }
          if(dd < z.R + T.r*.5 && z.nt <= 0){ z.nt = z.tick; if(pkHit(z.own, z.dm, z.tp, 'whirl')) return; } } }
      else if(!z.boom){ z.boom = 1; G.shake = Math.max(G.shake, .45); flashScreen(.1); for(let k = 0; k < 26; k++) vp({ x:z.x + R_(-z.R*.6, z.R*.6), y:z.y, vx:R_(-60, 60), vy:R_(-420, -200), life:R_(.5, .9), s:R_(3, 6), s1:1, kind:'drop', col:k % 2 ? '#7ad8ff' : '#ffffff', g:700 });
        if(pkOk(T) && Math.hypot(T.x - z.x, T.y - z.y) < z.R + T.r){ if(pkHit(z.own, z.burst, z.tp, 'whirl')) return; } }
      if(z.t > z.dur + .5){ PKZ.splice(i, 1); continue; } }
    else if(z.k === 'trl'){
      if(pkOk(T) && z.nt <= 0){ const dx = z.x2 - z.x1, dy = z.y2 - z.y1, L2 = dx*dx + dy*dy || 1, u = Math.max(0, Math.min(1, ((T.x - z.x1)*dx + (T.y - z.y1)*dy)/L2)), px = z.x1 + dx*u, py = z.y1 + dy*u;
        if(Math.hypot(T.x - px, T.y - py) < T.r + 10){ z.nt = .45; PKZ.forEach(o => { if(o.k === 'trl') o.nt = Math.max(o.nt, .45); }); if(pkHit(z.own, z.dm, z.tp, 'trail')) return; } }
      if(z.t > z.dur){ PKZ.splice(i, 1); continue; } }
  }
  for(let i = PKT.length - 1; i >= 0; i--){ PKT[i].t -= dt; PKT[i].y -= 30*dt; if(PKT[i].t <= 0) PKT.splice(i, 1); }
}
function pkPop(b){ for(let k = 0; k < 10; k++) vp({ x:b.x, y:b.y, vx:R_(-120, 120), vy:R_(-120, 60), life:.35, s:3, s1:1, kind:'drop', col:'#bfefff', g:300 }); vp({ x:b.x, y:b.y, life:.25, s:b.R, s1:b.R*2, kind:'ring', col:'#bfefff' }); }
function pkFlinch(T){ if(T === G.p) T.stun = G.time + .4; else { T.tele = 0; T.next = Math.max(T.next || 0, .8); } PKT.push({ x:T.x, y:T.y - 54, s:'APEURÉ !', t:.8, col:'#c8f0ff' }); }

// ---------------------------------------------------------------- dessin
function pkDraw(){
  ctx.save();
  for(const z of PKZ){
    if(z.k === 'tor'){ const fade = Math.min(1, z.t*3, (z.dur - z.t)*2 + .2);
      for(let k = 0; k < 7; k++){ const y = z.y + 18 - k*14, rr = z.R*(.35 + k*.12), off = Math.sin(G.time*9 + k)*6;
        ctx.globalAlpha = .45*fade; ctx.strokeStyle = k % 2 ? '#d8e8f8' : '#8aa0c0'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(z.x + off, y, rr, rr*.32, 0, G.time*8 + k, G.time*8 + k + 4.4); ctx.stroke(); }
      ctx.globalAlpha = .25*fade; ctx.fillStyle = '#2a3446'; ctx.beginPath(); ctx.ellipse(z.x, z.y + 20, z.R*.8, z.R*.25, 0, 0, 6.283); ctx.fill(); }
    else if(z.k === 'whl'){ const live = z.t < z.dur, fade = live ? Math.min(1, z.t*3) : Math.max(0, 1 - (z.t - z.dur)*2);
      for(let k = 0; k < 4; k++){ const rr = z.R*(1 - k*.22); ctx.globalAlpha = .6*fade; ctx.strokeStyle = k % 2 ? '#bfefff' : '#3a9ae8'; ctx.lineWidth = 4; ctx.beginPath(); ctx.ellipse(z.x, z.y + 6, rr, rr*.5, 0, -G.time*(5 + k*2), -G.time*(5 + k*2) + 4.6); ctx.stroke(); }
      ctx.globalAlpha = .3*fade; ctx.fillStyle = '#1a5a9a'; ctx.beginPath(); ctx.ellipse(z.x, z.y + 6, z.R*.5, z.R*.25, 0, 0, 6.283); ctx.fill(); }
    else if(z.k === 'trl'){ ctx.globalAlpha = Math.max(0, 1 - z.t/z.dur)*.8; ctx.lineCap = 'round'; ctx.strokeStyle = `hsl(${z.hue},100%,72%)`; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(z.x1, z.y1); ctx.lineTo(z.x2, z.y2); ctx.stroke();
      ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 3; ctx.stroke(); }
  }
  for(const b of PKB){ if(b.t < 0) continue; ctx.globalAlpha = 1;
    if(b.k === 'drop'){ ctx.fillStyle = '#3a9ae8'; ctx.beginPath(); ctx.arc(b.x, b.y, 6, 0, 6.283); ctx.fill(); ctx.fillStyle = '#bfefff'; ctx.beginPath(); ctx.arc(b.x - 2, b.y - 2, 2.5, 0, 6.283); ctx.fill(); }
    else if(b.k === 'cres'){ ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.ang || 0); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = 'rgba(190,240,255,.9)'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(-6, 0, 14, -1.2, 1.2); ctx.stroke(); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.stroke(); ctx.restore(); }
    else if(b.k === 'star'){ ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(G.time*6 + b.q); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow('#ff7ac8'), -14, -14, 28, 28); ctx.fillStyle = '#fff0fa'; ctx.beginPath();
      for(let k = 0; k < 10; k++){ const r = k % 2 ? 3 : 8, q = k*Math.PI/5; ctx[k ? 'lineTo' : 'moveTo'](Math.cos(q)*r, Math.sin(q)*r); } ctx.closePath(); ctx.fill(); ctx.restore(); }
    else if(b.k === 'bub'){ ctx.globalAlpha = .55; ctx.fillStyle = '#9ae0ff'; ctx.beginPath(); ctx.arc(b.x, b.y, b.R, 0, 6.283); ctx.fill(); ctx.globalAlpha = .95; ctx.strokeStyle = '#e8faff'; ctx.lineWidth = 2; ctx.stroke(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.ellipse(b.x - b.R*.35, b.y - b.R*.4, b.R*.3, b.R*.18, -.6, 0, 6.283); ctx.fill(); }
  }
  for(const s of [G.p, G.e]){ if(!s) continue;
    if(s.brth){ const B = s.brth; ctx.globalAlpha = .22; const g = ctx.createRadialGradient(s.x, s.y - 8, 6, s.x, s.y - 8, B.len); g.addColorStop(0, '#c070ff'); g.addColorStop(1, 'rgba(90,120,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(s.x, s.y - 8); ctx.arc(s.x, s.y - 8, B.len, B.a - B.arc, B.a + B.arc); ctx.closePath(); ctx.fill(); }
    const M = s.mx; if(!M) continue;
    if(M.k === 'xs'){ ctx.globalAlpha = 1; ctx.lineCap = 'round'; for(let k = 1; k < M.trail.length; k++){ const a = M.trail[k - 1], b = M.trail[k], f = 1 - (G.time - b.t)/.3; if(f <= 0) continue; ctx.strokeStyle = `rgba(255,255,255,${f*.8})`; ctx.lineWidth = 10*f; ctx.beginPath(); ctx.moveTo(a.x, a.y - 8); ctx.lineTo(b.x, b.y - 8); ctx.stroke(); } }
    else if(M.k === 'roll'){ ctx.globalAlpha = .5; ctx.fillStyle = '#5ab8ff'; ctx.beginPath(); ctx.arc(s.x, s.y - 6, s.r + 12, 0, 6.283); ctx.fill(); ctx.globalAlpha = .9; ctx.strokeStyle = '#e8faff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(s.x, s.y - 6, s.r + 12, M.spin, M.spin + 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(s.x, s.y - 6, s.r + 12, M.spin + 3.1, M.spin + 4.2); ctx.stroke(); }
    else if(M.k === 'hug' && M.jump > 1){ ctx.globalAlpha = .9; for(let k = 0; k < 3; k++){ const q = G.time*8 + k*2.1; ctx.fillStyle = '#ff7ac8'; ctx.font = 'bold 12px sans-serif'; ctx.fillText('♥', s.x + Math.cos(q)*18 - 4, s.y - 20 + Math.sin(q)*8); } }
    else if(M.k === 'up' && !M.hit){ ctx.globalAlpha = .6; ctx.strokeStyle = '#ffb04a'; ctx.lineWidth = 3; for(let k = 0; k < 4; k++){ const o = R_(-10, 10); ctx.beginPath(); ctx.moveTo(s.x - Math.cos(M.a)*30 + o, s.y - 8 - Math.sin(M.a)*30 + o); ctx.lineTo(s.x - Math.cos(M.a)*60 + o, s.y - 8 - Math.sin(M.a)*60 + o); ctx.stroke(); } }
  }
  // Élan Combatif (Tartard) : petites flammes au-dessus de la tête
  for(const s of [G.p, G.e]) if(s && s.mom > 0 && s.hp > 0){ for(let k = 0; k < s.mom; k++){ ctx.globalAlpha = .9; ctx.fillStyle = '#ff8a3c'; ctx.fillRect(s.x - s.mom*4 + k*8, s.y - 58 - Math.abs(Math.sin(G.time*6 + k))*2, 5, 5); } }
  for(const T of PKT){ ctx.globalAlpha = Math.min(1, T.t*2); ctx.font = 'bold 13px "Pixelify Sans",monospace'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = '#14101c'; ctx.strokeText(T.s, T.x, T.y); ctx.fillStyle = T.col; ctx.fillText(T.s, T.x, T.y); }
  ctx.restore();
}

// ---------------------------------------------------------------- talents
const pkAb = o => o && POKEMON[o.t] && POKEMON[o.t].ability && POKEMON[o.t].ability.pk;
function pkDefend(o, d, b){         // o = celui qui encaisse
  const ab = pkAb(o);
  if(ab === 'multiscale' && o.hp >= o.max - .5 && d > 0){ d *= .5; PKT.push({ x:o.x, y:o.y - 64, s:'MULTIÉCAILLE', t:.7, col:'#9ab8ff' }); }
  if(ab === 'luck' && d > 0 && Math.random() < .2){ PKT.push({ x:o.x, y:o.y - 64, s:'RATÉ !', t:.7, col:'#fff3a0' }); return 0; }
  if(ab === 'momentum') o.mom = 0;
  return d;
}
function pkAttack(o, d, b){         // o = celui qui frappe
  const ab = pkAb(o);
  if(o.dbf && o.dbf > G.time) d *= o.dbfK || .75;
  if(ab === 'hugepower' && b && PK_CONTACT.includes(b.k)) d *= 1.35;
  if(ab === 'momentum'){ d *= 1 + .07*(o.mom || 0); o.mom = Math.min(5, (o.mom || 0) + 1); }
  return d;
}
hurtE = (prev => function(d, b){ if(G && G.e && G.p && G.e.hp > 0){ d = pkAttack(G.p, d, b); d = pkDefend(G.e, d, b); if(d <= 0) return false; } return prev(d, b); })(hurtE);
hurtP = (prev => function(d, b){ if(G && G.e && G.p && G.p.hp > 0 && !(G.p.inv > 0) && !(G.p.dT > 0)){ d = pkAttack(G.e, d, b); d = pkDefend(G.p, d, b); if(d <= 0) return false; } return prev(d, b); })(hurtP);

// ---------------------------------------------------------------- branchements
step = (prev => function(dt){
  if(!G || G.over || G.paused) return prev(dt);
  const p0 = G.p, e0 = G.e, hold = [p0, e0].map(o => o && (o.mx ? { x:o.x, y:o.y } : null));
  prev(dt);
  if(!G || G.over || G.paused || HS > 0) return;
  if(G.p === p0 && hold[0]){ p0.x = hold[0].x; p0.y = hold[0].y; }
  if(G.e === e0 && hold[1]){ e0.x = hold[1].x; e0.y = hold[1].y; }
  if(G.e === e0 && (e0.mx || e0.brth)){ e0.tele = 0; e0.next = Math.max(e0.next || 0, .3); }
  if(G.p === p0 && p0.brth){ /* ralenti pendant le souffle */ }
  try{ pkUpd(dt); }catch(err){ console.warn('pension-kits', err); }
})(step);
press = (prev => function(i){ if(G && G.p && (G.p.mx || G.p.brth || (G.p.stun || 0) > G.time)) return; return prev(i); })(press);
dash = (prev => function(){ if(G && G.p && (G.p.mx || G.p.brth)) return; return prev(); })(dash);
doSwap = (prev => function(n){ if(G){ pkClear(G.p); if(G.p) G.p.mom = 0; } return prev(n); })(doSwap);
spawn = (prev => function(){ PKB.length = 0; PKZ.length = 0; PKT.length = 0; if(G && G.p){ pkClear(G.p); } return prev(); })(spawn);
start = (prev => function(cfg){ PKB.length = 0; PKZ.length = 0; PKT.length = 0; return prev(cfg); })(start);
drawBullets = (prev => function(){ prev(); if(G) try{ pkDraw(); }catch(err){ console.warn('pkDraw', err); } })(drawBullets);

// ---------------------------------------------------------------- CARCHACROK : attaques qui touchent vraiment
if(POKEMON.carchacrok){
  const M = POKEMON.carchacrok.moves;
  Object.assign(M[0], { range:250, rushTime:.09, power:12 });                                              // Draco-Griffe : plus d'allonge
  Object.assign(M[1], { radius:66, speed:540, time:.95, track:true });                                    // Tunnel : suit la cible sous terre
  Object.assign(M[2], { count:6, radius:44, spread:55, delay:.8, track:true });                           // Draco-Météore : les météores suivent la cible
}
// Draco-Griffe : la ruée suit la cible (elle ne frappe plus dans le vide)
updRs = (prev => function(s, d, own){
  const R = s.rs; if(R && R.m && R.m.n === 'Draco-Griffe' && R.stop == null && d && d.hp > 0 && G.time - R.t0 < R.ta){ const dx = d.x - R.sx, dy = d.y - R.sy, L = Math.hypot(dx, dy) || 1, k = Math.min(L, 250); R.ex = clX(R.sx + dx/L*k); R.ey = clY(R.sy + dy/L*k); }
  return prev(s, d, own);
})(updRs);
updBurrow = (prev => function(s, own, dt){
  const B = s.bur; if(B && B.m && B.m.opt && B.m.opt.track && G.time - B.t0 < B.dur*.85){ const T = pkFoe(own); if(pkOk(T)){ B.tx = clX(T.x); B.ty = clY(T.y); } }
  return prev(s, own, dt);
})(updBurrow);
strike2 = (prev => function(s, d, m, c, own, sc, a){
  const n0 = ZONES.length, r = prev(s, d, m, c, own, sc, a);
  if(m.opt && m.opt.track) for(let i = n0; i < ZONES.length; i++){ const z = ZONES[i]; z.trk = { dx:z.x - d.x, dy:z.y - d.y, own }; }
  return r;
})(strike2);
step = (prev => function(dt){
  prev(dt);
  if(!G || G.over) return;
  for(const z of ZONES){ if(!z.trk || z.t >= z.delay*.45) continue; const T = pkFoe(z.trk.own); if(pkOk(T)){ z.x = clX(T.x + z.trk.dx*.6); z.y = clY(T.y + z.trk.dy*.6); } }
})(step);

// ---------------------------------------------------------------- aperçu de visée adapté à chaque nouvelle attaque
aimShape = (prev => function(p, m, c){
  if(!m || !PK_KINDS.includes(m.k)) return prev(p, m, c);
  const O = m.opt || {}, e = G && G.e, dist = e ? Math.hypot(e.x - p.x, e.y - p.y) : 260;
  switch(m.k){
    case 'breath':   return { k:'cone', half:O.arc || .42, rng:(O.length || 250)*(1 + c*.2) };
    case 'xspeed':   return { k:'line', w:30, rng:Math.min(520, dist + (O.over || 70)), end:true, endR:22 };
    case 'tornado':  return { k:'line', w:(O.radius || 58)*2*(1 + c*.2), rng:Math.min(560, (O.speed || 120)*(O.time || 3)), end:true };
    case 'spiral':   return { k:'line', w:(O.amp || 30)*2 + 16, rng:(O.speed || 330)*(O.life || 1.3) };
    case 'uppercut': return { k:'line', w:34, rng:(O.range || 210)*(1 + c*.2), end:true, endR:30 };
    case 'whirl':    return { k:'circle', r:(O.radius || 72)*(1 + c*.25) };
    case 'crescent': return { k:'cone', half:.38, rng:Math.max(160, Math.min(420, dist + 60)) };
    case 'nova':     return { k:'circle', r:O.ring || 44, self:true };
    case 'skydive':  return { k:'line', w:30, rng:Math.min(560, dist + 120), end:true, endR:26 };
    case 'bubbles':  return { k:'cone', half:.36 + (c > .6 ? .3 : 0), rng:Math.min(520, (O.speed || 190)*(O.life || 4)*.55) };
    case 'roll':     return { k:'line', w:40, rng:Math.min(620, (O.speed || 430)*(O.time || 1.2)*(1 + c*.4)*.8) };
    case 'hug':      return { k:'line', w:30, rng:Math.min((O.range || 260)*(1 + c*.2), dist), end:true, endR:40 };
  }
  return prev(p, m, c);
})(aimShape);
// Éclat Magique : l'anneau d'étoiles se forme autour de toi (aperçu centré sur ton Pokémon)
drawAimShape = (prev => function(p, i){
  const m = p.mv[i]; if(!m || m.k !== 'nova') return prev(p, i);
  if(!AIM.on[i] || (AIM.cancel && AIM.cancel[i])) return;
  const col = COL[m.tp] || '#ff7ac8', A = .55 + .2*Math.sin(G.time*10), R = (m.opt && m.opt.ring || 44) + 8;
  ctx.save(); ctx.translate(p.x, p.y - 8); ctx.setLineDash([6, 6]); ctx.lineWidth = 3; ctx.strokeStyle = hexA(col, .9*A); ctx.beginPath(); ctx.ellipse(0, 0, R, R*.7, 0, 0, 6.283); ctx.stroke(); ctx.setLineDash([]);
  const e = G.e, a = Math.atan2(e.y - p.y, e.x - p.x); ctx.strokeStyle = `rgba(255,255,255,${.6*A})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(Math.cos(a)*R, Math.sin(a)*R*.7); ctx.lineTo(Math.cos(a)*(R + 60), Math.sin(a)*(R + 60)*.7); ctx.stroke();
  ctx.restore();
})(drawAimShape);
