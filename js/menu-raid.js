// ============================================================
//  menu-raid.js — FOND ANIMÉ DES ÉCRANS DE RAID (v0.20), dans l'esprit d'un raid de nuit au stade :
//    ciel étoilé, tribunes pleines (flashs d'appareils), projecteurs qui éblouissent, pelouse en perspective,
//    le Pokémon du raid en GÉANT (aura rouge, yeux rouges), 3 Pokémon qui l'attaquent (éclairs, bulles, flammèches)
//    avec gerbes d'étincelles à l'impact, et des silhouettes de dresseurs au premier plan.
//  Actif sur : écran Combat Raid, salon du raid à plusieurs, choix Créer / Rejoindre.
//  Réglages : RAID_SCENE (Pokémon qui attaquent, si ton équipe n'est pas disponible).
// ============================================================
const RAID_SCENE = { fallback:['raichu', 'tortank', 'dracaufeu'] };
const RS = { L:null, t:0, parts:[], bolts:[], flash:[], hitT:0, nextAtk:1, k:0 };

function rsBuild(){
  const L = {}, [c, x] = mkcv(VW, VH), R = (col, a, b, w, h) => { x.fillStyle = col; x.fillRect(a, b, w, h); };
  // ciel de nuit
  const g = x.createLinearGradient(0, 0, 0, 170); g.addColorStop(0, '#050a24'); g.addColorStop(.6, '#0d2a5c'); g.addColorStop(1, '#1d5a9a'); x.fillStyle = g; x.fillRect(0, 0, VW, 170);
  // tribunes (anneau qui monte vers la gauche, comme vu de la pelouse)
  for(let row = 0; row < 26; row++){
    const y0 = 104 + row*3.2, sl = (VW - 0)*.0;
    const yl = y0 - 34 + row*.4, yr = y0 + 12;                         // la tribune descend vers la droite
    x.fillStyle = row % 2 ? '#1a1430' : '#221a3e';
    x.beginPath(); x.moveTo(0, yl); x.lineTo(VW, yr); x.lineTo(VW, yr + 3.4); x.lineTo(0, yl + 3.4); x.closePath(); x.fill();
  }
  // public : petits points de couleur
  const rnd = (s => () => (s = (s*16807) % 2147483647)/2147483647)(77);
  for(let i = 0; i < 1500; i++){ const u = rnd(), v = rnd(), px = u*VW, yl = 70 + v*84, py = yl + u*46;
    x.fillStyle = ['#e85a5a', '#ffd23f', '#5ac8ff', '#f0f0f0', '#8a5ae8', '#5ae88a', '#ff9a3c'][(rnd()*7) | 0]; x.globalAlpha = .35 + rnd()*.45; x.fillRect(px | 0, py | 0, 1, 1); }
  x.globalAlpha = 1;
  // rambarde lumineuse + panneaux
  x.strokeStyle = 'rgba(160,220,255,.55)'; x.lineWidth = 2; x.beginPath(); x.moveTo(0, 154); x.lineTo(VW, 200); x.stroke();
  for(let i = 0; i < 9; i++){ const px = i*76 + 6, py = 154 + px*.072; R(i % 2 ? '#1c3a8a' : '#8a1c3a', px, py - 1, 60, 6); R('rgba(255,255,255,.25)', px + 4, py + 1, 30, 1); }
  // pelouse en perspective
  const gg = x.createLinearGradient(0, 160, 0, VH); gg.addColorStop(0, '#1f7a3a'); gg.addColorStop(1, '#0e4a20'); x.fillStyle = gg;
  x.beginPath(); x.moveTo(0, 156); x.lineTo(VW, 202); x.lineTo(VW, VH); x.lineTo(0, VH); x.closePath(); x.fill();
  for(let i = 0; i < 9; i++){ x.fillStyle = i % 2 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.04)'; x.beginPath(); x.moveTo(i*80, 156 + i*80*.072); x.lineTo(i*80 + 80, 156 + (i + 1)*80*.072); x.lineTo(i*120 - 160, VH); x.lineTo(i*120 - 280, VH); x.closePath(); x.fill(); }
  // anneau de combat au sol (sous le boss)
  x.strokeStyle = 'rgba(255,240,200,.35)'; x.lineWidth = 2; x.beginPath(); x.ellipse(540, 282, 150, 38, -.08, 0, 6.283); x.stroke();
  x.strokeStyle = 'rgba(255,240,200,.18)'; x.beginPath(); x.ellipse(540, 282, 105, 26, -.08, 0, 6.283); x.stroke();
  L.bg = c;
  // silhouettes de dresseurs au premier plan
  const [s, y] = mkcv(VW, VH); y.fillStyle = '#05060c';
  const guy = (cx, by, k, arm) => { y.beginPath(); y.arc(cx, by - 62*k, 9*k, 0, 6.283); y.fill();
    y.beginPath(); y.moveTo(cx - 14*k, by - 50*k); y.lineTo(cx + 14*k, by - 50*k); y.lineTo(cx + 12*k, by - 14*k); y.lineTo(cx + 9*k, by); y.lineTo(cx - 9*k, by); y.lineTo(cx - 12*k, by - 14*k); y.closePath(); y.fill();
    y.fillRect(cx - 9*k, by, 7*k, 30*k); y.fillRect(cx + 2*k, by, 7*k, 30*k);
    if(arm){ y.beginPath(); y.moveTo(cx + 10*k, by - 46*k); y.lineTo(cx + 26*k, by - 30*k); y.lineTo(cx + 22*k, by - 26*k); y.lineTo(cx + 8*k, by - 38*k); y.closePath(); y.fill(); } };
  guy(150, 345, 1.1, 1); guy(18, 330, .8, 0); guy(250, 250, .45, 1);
  L.fg = s;
  RS.L = L;
}
// éclair en zigzag entre deux points
function rsBolt(x0, y0, x1, y1, col){
  const pts = [[x0, y0]], n = 9;
  for(let i = 1; i < n; i++){ const u = i/n; pts.push([x0 + (x1 - x0)*u + (Math.random() - .5)*18, y0 + (y1 - y0)*u + (Math.random() - .5)*18]); }
  pts.push([x1, y1]); RS.bolts.push({ pts, life:.16, col });
}
function drawRaidScene(dt){
  ctx.save();
  try{ drawRaidScene2(dt); }
  catch(e){ console.warn('menu-raid', e); }
  finally{ ctx.restore(); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }   // jamais d'état « lighter » qui reste collé
}
function drawRaidScene2(dt){
  if(!RS.L) rsBuild();
  const L = RS.L, t = RS.t += dt;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false; ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(L.bg, 0, 0);
  // étoiles qui scintillent
  for(let i = 0; i < 40; i++){ const sx = (i*97) % VW, sy = (i*53) % 70, a = .4 + .6*Math.abs(Math.sin(t*1.3 + i)); ctx.fillStyle = `rgba(255,255,255,${a})`; ctx.fillRect(sx, sy, 1, 1); }
  // flashs d'appareils dans le public
  if(Math.random() < .25) RS.flash.push({ x:Math.random()*VW, y:80 + Math.random()*80, life:.15 });
  ctx.globalCompositeOperation = 'lighter';
  for(let i = RS.flash.length - 1; i >= 0; i--){ const f = RS.flash[i]; f.life -= dt; if(f.life <= 0){ RS.flash.splice(i, 1); continue; } ctx.fillStyle = `rgba(255,255,255,${f.life*5})`; ctx.fillRect(f.x | 0, f.y | 0, 2, 2); ctx.drawImage(glow('#ffffff'), f.x - 5, f.y - 5, 10, 10); }
  // projecteurs (en haut à gauche) : halo + rayons qui tournent doucement
  for(const [px, py, ph] of [[30, 58, 0], [112, 40, 1.7], [196, 30, 3.1]]){
    const a = .75 + .25*Math.sin(t*2 + ph);
    const gl = ctx.createRadialGradient(px, py, 1, px, py, 60); gl.addColorStop(0, `rgba(230,250,255,${a})`); gl.addColorStop(.25, `rgba(150,220,255,${.45*a})`); gl.addColorStop(1, 'rgba(80,160,255,0)');
    ctx.fillStyle = gl; ctx.fillRect(px - 60, py - 60, 120, 120);
    for(let k = 0; k < 6; k++){ const an = k*1.047 + t*.15 + ph; ctx.strokeStyle = `rgba(200,240,255,${.12*a})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(an)*110, py + Math.sin(an)*110); ctx.stroke(); }
  }
  ctx.globalCompositeOperation = 'source-over';
  // le boss du raid
  const cur = typeof raidCurrent === 'function' ? raidCurrent() : { id:'tyranocif' }, bx = 560, by = 192, k = 3.5;
  const fr = SPR[cur.id] && mbgFrame(cur.id, RS.hitT > 0 ? 'Hurt' : 'Idle', 7, t, 40);
  // aura rouge au sol
  const pul = .75 + .25*Math.sin(t*4), ag = ctx.createRadialGradient(bx, 282, 8, bx, 282, 170); ag.addColorStop(0, `rgba(255,60,40,${.55*pul})`); ag.addColorStop(1, 'rgba(255,40,40,0)');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.ellipse(bx, 282, 170, 50, 0, 0, 6.283); ctx.fill();
  if(fr){
    const shake = RS.hitT > 0 ? (Math.random() - .5)*4 : 0, x0 = Math.round(bx - fr.width*k/2 + shake), y0 = Math.round(by - fr.height*k/2);
    ctx.fillStyle = 'rgba(0,0,0,.4)'; ctx.beginPath(); ctx.ellipse(bx, 282, 60, 12, 0, 0, 6.283); ctx.fill();
    ctx.drawImage(fr, x0, y0, fr.width*k, fr.height*k);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .1 + .06*Math.sin(t*5);
    ctx.drawImage(tintOf(fr, '#ff2020'), x0, y0, fr.width*k, fr.height*k);
    if(RS.hitT > .08){ ctx.globalAlpha = .12; ctx.drawImage(tintOf(fr, '#fff6c0'), x0, y0, fr.width*k, fr.height*k); } ctx.restore();
    if(typeof raidEyes === 'function'){ const E = raidEyes(fr, 7); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .6 + .4*Math.sin(t*5);
      E.pts.forEach(([i, j]) => ctx.drawImage(glow('#ff2020'), x0 + i*k - 12, y0 + j*k - 12, 26, 26)); ctx.restore();
      E.pts.forEach(([i, j]) => { ctx.fillStyle = '#ff2a2a'; ctx.fillRect(x0 + i*k - k/2, y0 + j*k - k/2, k*1.5, k); }); }
  }
  // les attaquants (vus de dos)
  const team = (typeof mbgTeam === 'function' ? mbgTeam() : []).concat(RAID_SCENE.fallback).filter((id, i, a) => SPR[id] && a.indexOf(id) === i && id !== cur.id).slice(0, 3);
  const spots = [[60, 118, 2], [70, 312, 2.6], [330, 330, 2.4]];
  const target = [bx, by - 10];
  RS.nextAtk -= dt;
  team.forEach((id, i) => {
    const [ax, ay, kk] = spots[i], ph = t*2 + i*2.1, fly = i === 0 ? Math.sin(ph)*6 : 0, row = ax < bx ? 3 : 5;
    const f = mbgFrame(id, RS.k % 3 === i && RS.atkT > 0 ? 'Attack' : 'Idle', row, t + i, 44); if(!f) return;
    ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(ax, ay + 14*kk*.6 + (i === 0 ? 30 : 0), 12*kk, 4*kk, 0, 0, 6.283); ctx.fill();
    ctx.drawImage(f, Math.round(ax - f.width*kk/2), Math.round(ay + fly - f.height*kk/2), f.width*kk, f.height*kk);
  });
  if(RS.atkT > 0) RS.atkT -= dt;
  if(RS.nextAtk <= 0 && team.length){
    RS.k = (RS.k + 1) % team.length; RS.nextAtk = .9 + Math.random()*.7; RS.atkT = .4;
    const id = team[RS.k], [ax, ay] = spots[RS.k], tp = (POKEMON[id] && POKEMON[id].types[0]) || 'normal', col = COL[tp] || '#ffffff';
    if(tp === 'foudre'){ for(let n = 0; n < 3; n++) rsBolt(ax + 10, ay - 10, target[0] + (Math.random() - .5)*30, target[1] + (Math.random() - .5)*30, n ? '#fff6a0' : '#ffffff'); RS.hitT = .25; }
    else for(let n = 0; n < 7; n++) RS.parts.push({ x:ax, y:ay - 10, tx:target[0] + (Math.random() - .5)*50, ty:target[1] + (Math.random() - .5)*40, u:-n*.06, sp:1.6 + Math.random()*.4, col, k:tp });
  }
  // projectiles (bulles, flammes…) vers le boss
  ctx.globalCompositeOperation = 'lighter';
  for(let i = RS.parts.length - 1; i >= 0; i--){
    const p = RS.parts[i]; if(p.ember) continue; p.u += dt*p.sp;
    if(p.u < 0) continue;
    if(p.u >= 1){ RS.parts.splice(i, 1); RS.hitT = .18; for(let s = 0; s < 4; s++) RS.bolts.push({ spark:1, x:p.tx, y:p.ty, a:Math.random()*6.283, life:.25, col:p.col }); continue; }
    const x = p.x + (p.tx - p.x)*p.u, y = p.y + (p.ty - p.y)*p.u - Math.sin(p.u*Math.PI)*30;
    if(p.k === 'eau'){ ctx.strokeStyle = 'rgba(180,240,255,.9)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(x, y, 4 + p.u*3, 0, 6.283); ctx.stroke(); }
    else ctx.drawImage(glow(p.col), x - 7, y - 7, 14, 14);
  }
  // éclairs + étincelles d'impact
  for(let i = RS.bolts.length - 1; i >= 0; i--){
    const b = RS.bolts[i]; b.life -= dt; if(b.life <= 0){ RS.bolts.splice(i, 1); continue; }
    if(b.spark){ const r = (1 - b.life/.25)*40; ctx.strokeStyle = b.col; ctx.globalAlpha = b.life*4; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(b.x + Math.cos(b.a)*r*.4, b.y + Math.sin(b.a)*r*.4); ctx.lineTo(b.x + Math.cos(b.a)*r, b.y + Math.sin(b.a)*r); ctx.stroke(); ctx.globalAlpha = 1; continue; }
    ctx.strokeStyle = b.col; ctx.lineWidth = 3; ctx.globalAlpha = Math.min(1, b.life*8); ctx.beginPath(); b.pts.forEach(([px, py], j) => j ? ctx.lineTo(px, py) : ctx.moveTo(px, py)); ctx.stroke();
    ctx.lineWidth = 1; ctx.strokeStyle = '#ffffff'; ctx.stroke(); ctx.globalAlpha = 1;
  }
  // flash d'impact sur le boss
  if(RS.hitT > 0){ RS.hitT -= dt; const a = RS.hitT*2; ctx.globalAlpha = Math.min(.7, a); ctx.drawImage(glow('#fff6c0'), target[0] - 60, target[1] - 60, 120, 120); ctx.globalAlpha = 1; }
  // braises rouges qui montent du boss
  if(Math.random() < .8) RS.parts.push({ ember:1, x:bx + (Math.random() - .5)*120, y:280, vy:-30 - Math.random()*40, life:2, u:0, sp:0, tx:0, ty:0 });
  for(let i = RS.parts.length - 1; i >= 0; i--){ const p = RS.parts[i]; if(!p.ember) continue; p.life -= dt; p.y += p.vy*dt; if(p.life <= 0){ RS.parts.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(255,${80 + (p.life*60 | 0)},60,${p.life/2})`; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); }
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(L.fg, 0, 0);
  // écrans de téléphone des dresseurs
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .7 + .3*Math.sin(t*3); ctx.drawImage(glow('#7ad0ff'), 165, 296, 16, 16); ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  // vignette
  const vg = ctx.createRadialGradient(VW*.55, VH*.5, VH*.3, VW*.55, VH*.5, VW*.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.5)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}
const _dmsRS = drawMenuScene;
drawMenuScene = function(dt){ return MBG.scene === 'raid' ? drawRaidScene(dt) : _dmsRS(dt); };
const _menuRS = menu;
menu = function(h){
  const hh = h || '', isRaid = hh.includes("raidv") || hh.includes("class='rnl'") || hh.includes("id='rncode'") || hh.includes("id='rnsb'");
  _menuRS(h);
  if(isRaid) MBG.scene = 'raid';
  const m = document.getElementById('menu'); if(m) m.classList.toggle('rscene', isRaid);
};
document.head.insertAdjacentHTML('beforeend', `<style>
#menu.rscene{background:radial-gradient(ellipse at 30% 50%,rgba(6,8,24,.78),rgba(6,8,24,.35) 70%,rgba(6,8,24,.15));-webkit-backdrop-filter:none;backdrop-filter:none}
#menu.rscene .raidv .right,#menu.rscene .rnl{background:rgba(8,10,30,.55);border-radius:10px}
#menu.rscene .raidv .left{background:rgba(8,10,30,.35)}
</style>`);
// filet de sécurité : chaque image de combat commence dans un état de dessin normal
draw = (prev => function(){ ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; return prev.apply(this, arguments); })(draw);
