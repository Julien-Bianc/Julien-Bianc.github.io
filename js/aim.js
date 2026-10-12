// ============================================================
//  VISÉE — glisser le doigt depuis un bouton d'attaque (A/B/C) pour viser, relâcher pour tirer.
//    • simple appui  = tir assisté : part vers la position ACTUELLE de l'ennemi (rate si l'ennemi bouge)
//    • glisser + relâcher = tir précis : direction choisie, +25 % de dégâts ; la longueur du glissé
//      règle la portée des attaques à zone (Tonnerre, Vol…)
//  Sur ordinateur : bouge la souris, puis J/K/L tirent vers le curseur.
// ============================================================
const AIM = {
  on:[0, 0, 0], a:[0, 0, 0], r:[0, 0, 0], c:[[0, 0], [0, 0], [0, 0]], mouse:null, mouseT:0,
  start(i, b){ const rc = b.getBoundingClientRect(); this.c[i] = [rc.left + rc.width/2, rc.top + rc.height/2]; this.on[i] = 0; },
  move(i, e){
    let dx = e.clientX - this.c[i][0], dy = e.clientY - this.c[i][1];
    if(innerHeight > innerWidth){ const q = dx; dx = dy; dy = -q; }          // jeu pivoté en portrait
    dx /= UIK.menu; dy /= UIK.menu;
    const m = Math.hypot(dx, dy);
    if(m > 24){ this.on[i] = 1; this.a[i] = Math.atan2(dy, dx); this.r[i] = Math.min(1, (m - 24)/110); } else this.on[i] = 0;
  },
  stop(i){ this.on[i] = 0; },
  key(i){      // clavier + souris
    if(!this.mouse || performance.now() - this.mouseT > 4000 || !G || G.over) return;
    const p = G.p, dx = this.mouse.x + CAM.x - p.x, dy = this.mouse.y + CAM.y - p.y;
    this.on[i] = 1; this.a[i] = Math.atan2(dy, dx); this.r[i] = Math.min(1, Math.max(0, (Math.hypot(dx, dy) - 40)/260));
  },
  take(i, p, e){
    const manual = !!this.on[i]; let ang, range;
    if(manual){ ang = this.a[i]; range = 60 + this.r[i]*260; }
    else { ang = Math.atan2(e.y - p.y, e.x - p.x); range = Math.hypot(e.x - p.x, e.y - p.y); }
    this.on[i] = 0; return { manual, ang, range };
  }
};
cv.addEventListener('mousemove', e => {
  const r = cv.getBoundingClientRect(), s = Math.min(r.width/VW, r.height/VH), ox = r.left + (r.width - VW*s)/2, oy = r.top + (r.height - VH*s)/2;
  AIM.mouse = { x:(e.clientX - ox)/s, y:(e.clientY - oy)/s }; AIM.mouseT = performance.now();
});

// ---------- aperçu au sol : cône / ligne / zone transparente de l'attaque en cours de visée ou de charge ----------
function aimShape(p, m, c){
  if(m.fan){ const F = m.fan, n = F.count || 5; return { k:'cone', half:Math.max(.06, ((n - 1)/2)*(F.spread || .15) + (F.jitter || .05)), rng:(F.speed || 260)*(F.life || 1)*.95 }; }
  if(m.mel) return { k:'line', w:34, rng:m.mel.rng || 240, end:true };
  if(m.fly) return { k:'circle', r:(m.fly.radius || 46) };
  if(m.pool) return { k:'circle', r:(m.pool.radius || 44)*(1 + c*.3) };
  const s = m.s || 300;
  switch(m.k){
    case 'flame': return { k:'cone', half:.42, rng:s*.45 };
    case 'spore': return { k:'cone', half:.95, rng:s*1.4 };
    case 'wave':  return { k:'line', w:62, rng:s*2.7 };
    case 'tide':  return { k:'line', w:38 + c*22, rng:s*1.5 };
    case 'meteor':return { k:'line', w:24, rng:s*.95, end:true, endR:46 };
    case 'strike':return { k:'circle', r:34 + c*14 };
    case 'beam':  return { k:'line', w:12 + c*14, rng:520 };
    default:      return { k:'line', w:12, rng:s*2.7 };
  }
}
function drawAimShape(p, i){
  const m = p.mv[i], c = p.ch[i] || 0, sh = aimShape(p, m, c), e = G.e, manual = !!AIM.on[i];
  const ang = manual ? AIM.a[i] : Math.atan2(e.y - p.y, e.x - p.x);
  const col = (m.fan && m.fan.color) || COL[m.tp || p.t] || '#ffffff';
  const pulse = .8 + .2*Math.sin(G.time*10), A = (manual ? 1 : .65)*pulse;
  ctx.save(); ctx.translate(p.x, p.y);
  const stroke = (w, a) => { ctx.lineWidth = w + 2; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke(); ctx.lineWidth = w; ctx.strokeStyle = hexA(col, a); ctx.stroke(); };
  if(sh.k === 'circle'){
    const dist = manual ? 60 + AIM.r[i]*260 : Math.hypot(e.x - p.x, e.y - p.y), cx = Math.cos(ang)*dist, cy = Math.sin(ang)*dist;
    ctx.setLineDash([7, 6]); ctx.beginPath(); ctx.moveTo(Math.cos(ang)*20, Math.sin(ang)*20); ctx.lineTo(cx, cy); stroke(2, .8*A); ctx.setLineDash([]);
    ctx.beginPath(); ctx.ellipse(cx, cy, sh.r, sh.r*.8, 0, 0, 6.283); ctx.fillStyle = hexA(col, .3*A); ctx.fill(); stroke(3, .95*A);
    ctx.beginPath(); ctx.ellipse(cx, cy, sh.r*(.35 + .65*((G.time*1.6)%1)), sh.r*.8*(.35 + .65*((G.time*1.6)%1)), 0, 0, 6.283); stroke(2, .6*A);
  } else {
    ctx.rotate(ang);
    const rng = sh.rng, g = ctx.createRadialGradient(0, 0, 14, 0, 0, rng);
    g.addColorStop(0, hexA(col, .5*A)); g.addColorStop(1, hexA(col, .1*A));
    ctx.beginPath();
    if(sh.k === 'cone'){ ctx.moveTo(14, 0); ctx.arc(0, 0, rng, -sh.half, sh.half); ctx.closePath(); }
    else { const h = sh.w/2; ctx.moveTo(14, -h); ctx.lineTo(rng, -h); if(sh.end){ ctx.arc(rng, 0, Math.max(h, sh.endR || h), -Math.PI/2, Math.PI/2); } else ctx.lineTo(rng, h); ctx.lineTo(14, h); ctx.closePath(); }
    ctx.fillStyle = g; ctx.fill(); stroke(3, .95*A);
    ctx.setLineDash([8, 7]); ctx.beginPath(); ctx.moveTo(18, 0); ctx.lineTo(rng, 0); ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = hexA(col, .95*A); for(let k = 0; k < 3; k++){ const x = 40 + ((G.time*140 + k*70) % (rng - 50)); ctx.beginPath(); ctx.moveTo(x + 9, 0); ctx.lineTo(x - 5, -7); ctx.lineTo(x - 5, 7); ctx.closePath(); ctx.fill(); }
  }
  ctx.restore();
}
function drawAim(){
  if(!G || G.over || G.sw) return;
  const p = G.p;
  for(let i = 0; i < 3; i++) if(down[i] && p.cd[i] <= 0) drawAimShape(p, i);
}
const _dbAim = drawBullets;
drawBullets = function(){ _dbAim(); drawAim(); };
