// ============================================================
//  status.js — Statuts altérés : brûlure, poison, gel, paralysie, confusion, ralentissement.
//  Réglages (chances, durées, immunités) : data/status.js.
//  Codes internes de o.st : 'burn', 'psn', 'frz', 'par', 'cnf'  (le ralentissement est une 'par' sans échec d'attaque).
// ============================================================
const ST_CODE = { burn:'burn', poison:'psn', freeze:'frz', par:'par', confuse:'cnf', sleep:'slp', slow:'par' };
const ST_TAG = { burn:['BRÛLÉ', '#ff8a5a'], psn:['POISON', '#c070e0'], frz:['GELÉ', '#9fe3ff'], par:['PARALYSÉ', '#ffe24a'], cnf:['CONFUS', '#ff9ad8'], slp:['ENDORMI', '#c8b0ff'] };

function applyStatus(o, kind){
  if(!o || o.st || o.hp <= 0) return;
  const D = STATUS_DEF[kind]; if(!D) return;
  if(typesOf(o.t).some(t => D.immune.includes(t))){ dmgTxt(o.x, o.y - 50, 'IMMUNISÉ', '#c8c8d0'); return; }   // ex. un type Feu ne brûle pas
  o.st = ST_CODE[kind]; o.stT = D.dur*((o.boss && (kind === 'sleep' || kind === 'freeze')) ? .5 : 1); o.slowOnly = kind === 'slow'; o.cT = 0;
  dmgTxt(o.x, o.y - 50, D.label, D.col);
  if(kind === 'freeze'){ tone(1800, .22, 'sine', .08, -900); noise(.25, .12, 7000, 2500, 'highpass'); flashScreen(.12); }
  else if(kind === 'confuse'){ tone(500, .4, 'sine', .08, 350); tone(700, .3, 'triangle', .05, -300, .15); }
}
// déclenchement : statut propre à l'attaque, sinon statut du TYPE de l'attaque (avec sa chance)
setSt = function(o, t, k, b){
  if(!o || o.st || o.hp <= 0) return;
  const mv = b && b.status;
  if(mv){ if(Math.random() < (mv.chance ?? 1)) applyStatus(o, mv.kind); return; }
  if(k === 'tide'){ if(Math.random() < .3) applyStatus(o, 'slow'); return; }
  const d = STATUS_BY_TYPE[t]; if(!d) return;
  const n = (b && (b.n || ({ flame:7, spore:5, wave:2 })[b.k])) || 1;                  // la chance est PAR LANCER : on la répartit sur les projectiles
  if(Math.random() < 1 - Math.pow(1 - d.chance, 1/n)) applyStatus(o, d.kind);
};

// ---------- effets des statuts ----------
const _castSt = cast;
cast = function(s, d, m, c, own, sc, ang){
  if(s.st === 'frz' || s.st === 'slp') return;                                                                              // gelé ou endormi : aucune action
  if(s.st === 'par' && !s.slowOnly && Math.random() < .25){ dmgTxt(s.x, s.y - 50, 'PARALYSÉ !', '#ffe24a'); return; }    // l'attaque échoue
  if(s.st === 'burn') sc *= .85;                                                                                           // brûlé : attaques affaiblies
  if(s.st === 'cnf'){                                                                                                      // confus : tire de travers
    const a = (ang !== undefined ? ang : Math.atan2(d.y - s.y, d.x - s.x)) + R_(-.9, .9), dist = Math.hypot(d.x - s.x, d.y - s.y);
    d = { x:s.x + Math.cos(a)*dist, y:s.y + Math.sin(a)*dist, r:d.r, hp:d.hp }; ang = a;
  }
  return _castSt(s, d, m, c, own, sc, ang);
};
const _pressSt = press; press = function(i){ if(G && (G.p.st === 'frz' || G.p.st === 'slp')) return; _pressSt(i); };
const _dashSt = dash; dash = function(){ if(G && (G.p.st === 'frz' || G.p.st === 'slp')) return; _dashSt(); };
const _hEst = hurtE;
hurtE = function(d, b){ const e = G && G.e, was = e && e.st === 'frz', r = _hEst(d, b); if(was && b && b.t === 'feu' && e.st === 'frz'){ e.st = null; dmgTxt(e.x, e.y - 60, 'DÉGEL !', '#ffb070'); } return r; };
const _hPst = hurtP;
hurtP = function(d, b){ const p = G && G.p, was = p && p.st === 'frz', r = _hPst(d, b); if(was && b && b.t === 'feu' && p.st === 'frz'){ p.st = null; dmgTxt(p.x, p.y - 60, 'DÉGEL !', '#ffb070'); } return r; };

const _stepSt = step;
step = function(dt){
  if(!G || G.over || G.paused || G.sw) return _stepSt(dt);
  const p = G.p, e = G.e, pf = p.st === 'frz' || p.st === 'slp', ef = e.st === 'frz' || e.st === 'slp', px = p.x, py = p.y, ex = e.x, ey = e.y;
  _stepSt(dt);
  if(!G || G.over || G.paused) return;
  if(pf && G.p === p){ p.x = px; p.y = py; p.ch = [0, 0, 0]; p.rs = null; }                                  // gelé : immobile, charge annulée
  if(ef && G.e === e){ e.x = ex; e.y = ey; e.tele = 0; e.next = Math.max(e.next || 0, .4); e.rs = null; }
  for(const o of [G.p, G.e]){
    if(!o || o.hp <= 0 || !o.st) continue;
    if(o.st === 'cnf'){                                                                                          // confus : titube au hasard
      o.cT -= dt; if(o.cT <= 0){ o.cT = R_(.3, .7); o.cA = R_(0, 6.283); }
      const v = (o.sp || 130)*.45*dt; o.x = Math.max(30, Math.min(W - 30, o.x + Math.cos(o.cA)*v)); o.y = Math.max(44, Math.min(H - 34, o.y + Math.sin(o.cA)*v));
      if(Math.random() < .5){ const a = G.time*6; vp({ x:o.x + Math.cos(a)*18, y:o.y - 34 + Math.sin(a)*6, life:.25, s:5, s1:3, kind:'star', col:'#ff9ad8', rot:a }); }
    } else if(o.st === 'burn' && Math.random() < .5) vp({ x:o.x + R_(-10, 10), y:o.y + R_(-8, 8), vx:R_(-10, 10), vy:R_(-60, -25), life:.4, s:5, s1:9, pal:FIRE, a:.5 });
    else if(o.st === 'psn' && Math.random() < .25) vp({ x:o.x + R_(-12, 12), y:o.y + R_(-6, 8), vy:R_(-40, -15), life:.7, s:3, s1:6, kind:'bubble', col:'#c070e0' });
    else if(o.st === 'par' && Math.random() < .3) vp({ x:o.x + R_(-14, 14), y:o.y + R_(-14, 10), life:.15, s:R_(14, 24), kind:'arc', col:'#fff6a0', rot:R_(0, 6.28) });
  }
};

// ---------- affichage : bloc de glace + étiquette de statut au-dessus du Pokémon ----------
function drawStatusOverlay(o){
  if(!o || !o.st || o.hid || o.hp <= 0) return;
  if(o.st === 'frz'){
    const w = 56, h = 64, x = o.x - w/2, y = o.y - h/2 - 4, pulse = .85 + .15*Math.sin(G.time*8);
    ctx.save(); ctx.globalAlpha = .55*pulse; ctx.fillStyle = '#a8e0ff'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + w - 4, y + 3); ctx.lineTo(x + w, y + h - 6); ctx.lineTo(x + w - 6, y + h); ctx.lineTo(x + 3, y + h - 3); ctx.lineTo(x, y + 8); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = .7; ctx.beginPath(); ctx.moveTo(x + 10, y + 10); ctx.lineTo(x + 22, y + 4); ctx.moveTo(x + 14, y + 18); ctx.lineTo(x + 14, y + 38); ctx.stroke(); ctx.restore();
  }
  let [txt, col] = ST_TAG[o.st] || ['?', '#fff']; if(o.st === 'par' && o.slowOnly){ txt = 'RALENTI'; col = '#9fe3ff'; }
  if(o.st === 'slp'){ ctx.save(); ctx.font = 'bold 15px "Courier New",monospace'; ctx.fillStyle = '#e8dcff'; ctx.strokeStyle = '#14101c'; ctx.lineWidth = 3; for(let k = 0; k < 3; k++){ const u = ((G.time*26 + k*13) % 40), x = o.x + 14 + k*6, y = o.y - 36 - u; ctx.globalAlpha = 1 - u/40; ctx.strokeText('Z', x, y); ctx.fillText('Z', x, y); } ctx.restore(); }
  ctx.save(); ctx.font = 'bold 9px "Courier New",monospace'; const w = ctx.measureText(txt).width + 10;
  ctx.fillStyle = col; ctx.fillRect(Math.round(o.x - w/2), Math.round(o.y - 66), w, 12); ctx.fillStyle = '#14101c'; ctx.textAlign = 'center'; ctx.fillText(txt, Math.round(o.x), Math.round(o.y - 57)); ctx.restore();
}
const _drawFxSt = drawFx;
drawFx = function(){ _drawFxSt(); if(G){ drawStatusOverlay(G.e); drawStatusOverlay(G.p); } };
