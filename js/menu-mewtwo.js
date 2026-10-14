// ============================================================
//  menu-mewtwo.js — ÉCRAN « DÉFI : MEWTWO » (v0.14)
//    • Arrivée en « swipe » vers la droite (un éclair psychique balaie l'écran)
//    • Fond animé : un laboratoire secret dévasté — cuve de clonage brisée, liquide renversé, câbles
//      arrachés qui crachent des étincelles, alarme rouge, écrans grésillants — et Mewtwo qui lévite au
//      milieu des débris qu'il soulève par télékinésie.
// ============================================================
const MW = { L:null, t:0, parts:[], rocks:null };
function mwBuild(){
  const L = {}, [c, x] = mkcv(VW, VH);
  // mur : dégradé sarcelle sombre + panneaux métalliques
  const g = x.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#06181c'); g.addColorStop(.55, '#0b2c30'); g.addColorStop(1, '#051214');
  x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  for(let px = 0; px < VW; px += 46){ x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(px, 0, 2, 270); x.fillStyle = 'rgba(120,220,210,.06)'; x.fillRect(px + 2, 0, 1, 270);
    for(let py = 30; py < 260; py += 52){ x.fillStyle = '#2a5a5a'; x.fillRect(px + 6, py, 2, 2); x.fillRect(px + 38, py, 2, 2); } }
  // grand anneau au plafond
  x.strokeStyle = '#123c40'; x.lineWidth = 14; x.beginPath(); x.ellipse(470, -10, 260, 70, 0, 0, Math.PI); x.stroke();
  x.strokeStyle = '#1e5a5c'; x.lineWidth = 2; x.beginPath(); x.ellipse(470, -4, 252, 64, 0, 0, Math.PI); x.stroke();
  for(let k = 0; k < 9; k++){ const a = .25 + k*.33; x.fillStyle = '#0a2a2c'; x.fillRect(470 + Math.cos(a)*260 - 4, -10 + Math.sin(a)*70, 8, 20); }
  // passerelle et rambarde à droite
  x.fillStyle = '#0d3236'; x.fillRect(560, 168, 80, 8); x.fillStyle = '#2a6a6a'; x.fillRect(560, 168, 80, 1);
  for(let px = 564; px < 640; px += 10){ x.fillStyle = '#1e4e50'; x.fillRect(px, 146, 2, 22); } x.fillRect(560, 146, 80, 2);
  // fenêtre éclairée (comme sur la photo)
  x.fillStyle = '#e8f0c0'; x.fillRect(590, 96, 34, 42); x.fillStyle = '#b8c890'; x.fillRect(590, 120, 34, 18); x.fillStyle = '#0a2a2c'; x.fillRect(606, 96, 2, 42);
  // emblème « R » fissuré
  x.save(); x.translate(560, 52); x.fillStyle = '#3a0a10'; x.beginPath(); x.arc(0, 0, 16, 0, 6.283); x.fill(); x.strokeStyle = '#8a1a24'; x.lineWidth = 2; x.stroke();
  x.fillStyle = '#c8202c'; x.font = 'bold 22px monospace'; x.textAlign = 'center'; x.fillText('R', 0, 8);
  x.strokeStyle = '#06181c'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(-10, -12); x.lineTo(-2, -2); x.lineTo(-6, 6); x.lineTo(3, 14); x.stroke(); x.restore();
  // sol en perspective
  const fg = x.createLinearGradient(0, 270, 0, VH); fg.addColorStop(0, '#0c2e30'); fg.addColorStop(1, '#041012'); x.fillStyle = fg; x.fillRect(0, 270, VW, VH - 270);
  x.strokeStyle = 'rgba(90,200,190,.12)'; x.lineWidth = 1;
  for(let k = -12; k <= 12; k++){ x.beginPath(); x.moveTo(470 + k*14, 270); x.lineTo(470 + k*70, VH); x.stroke(); }
  for(let y = 276, s = 6; y < VH; y += s, s *= 1.35){ x.beginPath(); x.moveTo(0, y); x.lineTo(VW, y); x.stroke(); }
  // socle de la cuve
  x.fillStyle = '#16484a'; x.beginPath(); x.ellipse(470, 268, 92, 20, 0, 0, 6.283); x.fill(); x.fillStyle = '#0b2a2c'; x.fillRect(378, 258, 184, 12);
  x.fillStyle = '#1f6264'; x.beginPath(); x.ellipse(470, 258, 92, 18, 0, 0, 6.283); x.fill(); x.strokeStyle = '#5ae0d0'; x.lineWidth = 1.5; x.beginPath(); x.ellipse(470, 258, 80, 14, 0, 0, 6.283); x.stroke();
  // haut de la cuve + tuyaux
  x.fillStyle = '#0e3a3c'; x.fillRect(408, 0, 124, 52); x.fillStyle = '#1a5254'; x.beginPath(); x.ellipse(470, 52, 64, 14, 0, 0, 6.283); x.fill();
  x.strokeStyle = '#5ae0d0'; x.lineWidth = 2; x.beginPath(); x.ellipse(470, 54, 56, 11, 0, 0, 6.283); x.stroke();
  for(const px of [420, 444, 496, 520]){ x.fillStyle = '#0a2224'; x.fillRect(px, 0, 6, 46); x.fillStyle = '#2a7270'; x.fillRect(px, 0, 1, 46); }
  L.base = c;
  // éclats de verre au sol
  const [s, sx] = mkcv(VW, VH);
  for(let i = 0; i < 26; i++){ const px = 360 + Math.random()*240, py = 272 + Math.random()*70, r = 2 + Math.random()*5, a = Math.random()*6.283;
    sx.fillStyle = `rgba(160,240,240,${.25 + Math.random()*.35})`; sx.beginPath(); sx.moveTo(px + Math.cos(a)*r, py + Math.sin(a)*r*.5); sx.lineTo(px + Math.cos(a + 2.2)*r*.6, py + Math.sin(a + 2.2)*r*.3); sx.lineTo(px + Math.cos(a + 4)*r, py + Math.sin(a + 4)*r*.5); sx.closePath(); sx.fill(); }
  for(let i = 0; i < 14; i++){ const px = 330 + Math.random()*300, py = 280 + Math.random()*70; sx.fillStyle = '#123436'; sx.fillRect(px, py, 6 + Math.random()*10, 4 + Math.random()*5); sx.fillStyle = '#2a5a5a'; sx.fillRect(px, py, 6, 1); }
  L.shards = s;
  MW.L = L;
  MW.rocks = Array.from({ length:7 }, (_, i) => ({ a:i*.9, r:60 + (i % 3)*18, s:3 + (i % 3)*2, y:(i % 2 ? -1 : 1)*(10 + i*3), sp:.25 + (i % 4)*.08 }));
}
function drawMewtwoScene(dt){
  if(!MW.L) mwBuild();
  const L = MW.L, t = MW.t += dt;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.base, 0, 0);
  // la fenêtre clignote parfois
  if(Math.sin(t*13) > .96){ ctx.fillStyle = 'rgba(6,24,28,.8)'; ctx.fillRect(590, 96, 34, 42); }
  // cuve brisée : arrière du verre + liquide restant
  ctx.fillStyle = 'rgba(70,200,200,.10)'; ctx.fillRect(412, 56, 116, 200);
  const lv = 196 + Math.sin(t*1.3)*2; const lg = ctx.createLinearGradient(0, lv, 0, 256); lg.addColorStop(0, 'rgba(90,255,200,.55)'); lg.addColorStop(1, 'rgba(30,140,120,.6)');
  ctx.fillStyle = lg; ctx.fillRect(412, lv, 116, 256 - lv);
  for(let i = 0; i < 6; i++){ const by = 256 - ((t*30 + i*23) % 60), bx = 420 + (i*37 % 100) + Math.sin(t*3 + i)*3; if(by > lv) { ctx.fillStyle = 'rgba(200,255,240,.7)'; ctx.fillRect(bx | 0, by | 0, 2, 2); } }
  // liquide renversé au sol (miroitement)
  ctx.fillStyle = 'rgba(70,230,190,.35)'; ctx.beginPath(); ctx.ellipse(430, 290, 120, 18, -.05, 0, 6.283); ctx.fill();
  ctx.fillStyle = 'rgba(180,255,230,.25)'; for(let i = 0; i < 4; i++){ ctx.fillRect(360 + ((t*14 + i*40) % 150), 286 + i*2, 18, 1); }
  ctx.drawImage(L.shards, 0, 0);
  // halo psychique + Mewtwo
  const my = 150 + Math.sin(t*1.6)*6, mx = 470;
  ctx.save(); ctx.globalCompositeOperation = 'lighter';
  const ag = ctx.createRadialGradient(mx, my, 6, mx, my, 110); ag.addColorStop(0, `rgba(200,120,255,${.45 + .1*Math.sin(t*3)})`); ag.addColorStop(1, 'rgba(120,40,200,0)');
  ctx.fillStyle = ag; ctx.beginPath(); ctx.arc(mx, my, 110, 0, 6.283); ctx.fill(); ctx.restore();
  // débris soulevés (derrière / devant)
  const rock = (r, front) => { const a = r.a + t*r.sp, z = Math.sin(a); if((z > 0) !== front) return;
    const x = mx + Math.cos(a)*r.r*1.4, y = my + r.y + z*14 + Math.sin(t*2 + r.a)*3; ctx.fillStyle = front ? '#2a5a5c' : '#173a3c';
    ctx.beginPath(); ctx.moveTo(x - r.s, y); ctx.lineTo(x, y - r.s); ctx.lineTo(x + r.s, y - r.s*.3); ctx.lineTo(x + r.s*.4, y + r.s); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(210,150,255,.6)'; ctx.lineWidth = 1; ctx.stroke(); };
  MW.rocks.forEach(r => rock(r, false));
  const fr = SPR.mewtwo && mbgFrame('mewtwo', 'Hover', 0, t, 40);
  if(fr){ const k = 3; ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.beginPath(); ctx.ellipse(mx, 262, 26 - Math.sin(t*1.6)*3, 6, 0, 0, 6.283); ctx.fill();
    ctx.drawImage(fr, Math.round(mx - fr.width*k/2), Math.round(my - fr.height*k/2), fr.width*k, fr.height*k);
    ctx.save(); ctx.globalAlpha = .25 + .15*Math.sin(t*3); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(tintOf(fr, '#b070ff'), Math.round(mx - fr.width*k/2), Math.round(my - fr.height*k/2), fr.width*k, fr.height*k); ctx.restore(); }
  MW.rocks.forEach(r => rock(r, true));
  // verre brisé devant (bords déchiquetés)
  ctx.strokeStyle = 'rgba(160,250,250,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
  ctx.moveTo(412, 56); ctx.lineTo(412, 120); ctx.lineTo(424, 132); ctx.lineTo(416, 150); ctx.lineTo(430, 170); ctx.lineTo(418, 196); ctx.lineTo(412, 256);
  ctx.moveTo(528, 56); ctx.lineTo(528, 100); ctx.lineTo(516, 118); ctx.lineTo(526, 140); ctx.lineTo(512, 160); ctx.lineTo(528, 190); ctx.lineTo(528, 256); ctx.stroke();
  ctx.fillStyle = 'rgba(150,240,240,.12)'; ctx.beginPath(); ctx.moveTo(412, 56); ctx.lineTo(412, 120); ctx.lineTo(424, 132); ctx.lineTo(440, 56); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(528, 56); ctx.lineTo(528, 100); ctx.lineTo(516, 118); ctx.lineTo(500, 56); ctx.closePath(); ctx.fill();
  // câbles arrachés qui se balancent + étincelles
  const cables = [[372, 0, 120, '#1a1a22'], [560, 0, 96, '#2a1a1a'], [520, 0, 70, '#1a2222']];
  cables.forEach(([cx, cy, len, col], i) => { const sw = Math.sin(t*1.2 + i*2)*10, ex = cx + sw, ey = cy + len;
    ctx.strokeStyle = col; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx + sw*.3, cy + len*.6, ex, ey); ctx.stroke();
    ctx.fillStyle = '#c8a040'; ctx.fillRect(ex - 2, ey - 1, 4, 3);
    if(Math.random() < dt*4) for(let k = 0; k < 5; k++) MW.parts.push({ x:ex, y:ey, vx:(Math.random() - .5)*90, vy:-Math.random()*60, g:260, life:.6 + Math.random()*.4, k:'spark' }); });
  // console cassée au premier plan + écran qui grésille
  ctx.fillStyle = '#0a2224'; ctx.beginPath(); ctx.moveTo(548, VH); ctx.lineTo(560, 300); ctx.lineTo(640, 292); ctx.lineTo(640, VH); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#0e3034'; ctx.fillRect(566, 276, 64, 30);
  for(let i = 0; i < 40; i++){ const v = Math.random(); ctx.fillStyle = `rgba(${90 + v*120},${200 + v*55},${230},${.25 + v*.5})`; ctx.fillRect(570 + Math.random()*56, 280 + Math.random()*22, 2, 1); }
  if(Math.sin(t*7) > .5){ ctx.fillStyle = 'rgba(120,220,255,.55)'; ctx.fillRect(572, 284, 20, 2); ctx.fillRect(572, 290, 34, 2); }
  // particules : étincelles, poussière psychique
  if(MW.parts.length < 90 && Math.random() < .5) MW.parts.push({ x:mx + (Math.random() - .5)*160, y:300, vx:(Math.random() - .5)*8, vy:-14 - Math.random()*20, g:0, life:4, k:'psy' });
  for(let i = MW.parts.length - 1; i >= 0; i--){ const p = MW.parts[i]; p.life -= dt; p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt;
    if(p.life <= 0 || p.y > VH){ MW.parts.splice(i, 1); continue; }
    if(p.k === 'spark'){ ctx.fillStyle = p.life > .3 ? '#fff6b0' : '#ff9a3c'; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); }
    else { ctx.fillStyle = `rgba(210,150,255,${Math.min(1, p.life/2)*.8})`; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); } }
  // alarme rouge : gyrophare + teinte qui pulse
  const al = .5 + .5*Math.sin(t*4);
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = `rgba(255,30,50,${.07*al})`; ctx.fillRect(0, 0, VW, VH);
  const ba = t*2.4, bx = 620, by = 20; ctx.fillStyle = 'rgba(255,40,60,.12)'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ba - .18)*500, by + Math.sin(ba - .18)*500); ctx.lineTo(bx + Math.cos(ba + .18)*500, by + Math.sin(ba + .18)*500); ctx.closePath(); ctx.fill();
  ctx.restore(); ctx.fillStyle = al > .5 ? '#ff3a4a' : '#8a1a24'; ctx.beginPath(); ctx.arc(bx, by, 5, 0, 6.283); ctx.fill();
  // vignette
  const vg = ctx.createRadialGradient(VW*.62, VH*.5, VH*.3, VW*.62, VH*.5, VW*.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}
const _dmsMW = drawMenuScene;
drawMenuScene = function(dt){ return MBG.scene === 'mewtwo' ? drawMewtwoScene(dt) : _dmsMW(dt); };
// l'écran du défi active la scène et le « swipe »
const _menuMW = menu;
menu = function(h){
  const was = MBG.scene, boss = !!h && h.includes("class='edit bdefi'");
  MBG.scene = boss ? 'mewtwo' : null;
  _menuMW(h);
  const m = document.getElementById('menu');
  m.classList.toggle('mscene', boss);
  if(boss && was !== 'mewtwo'){ m.classList.remove('swin'); void m.offsetWidth; m.classList.add('swin'); }
  if(!boss) m.classList.remove('swin');
};
document.head.insertAdjacentHTML('beforeend', `<style>
#menu.mscene{background:linear-gradient(90deg,rgba(6,4,16,.9) 0%,rgba(6,4,16,.72) 45%,rgba(6,4,16,.12) 72%,rgba(6,4,16,0) 100%);-webkit-backdrop-filter:none;backdrop-filter:none}
#menu.mscene .mc{align-items:flex-start!important;padding-left:calc(14px + env(safe-area-inset-left,0px))}
#menu.mscene .mc>*{max-width:62%}
#menu.mscene .hd{justify-content:flex-start}
#menu.mscene h1{background:linear-gradient(180deg,#f4e0ff 0%,#c88aff 55%,#7a3ac8 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(0 2px 0 #1a0630) drop-shadow(0 0 10px rgba(190,110,255,.55))}
#menu.mscene h1::after{background:linear-gradient(90deg,#c88aff,transparent)}
#menu.swin .mc{animation:mwin .55s cubic-bezier(.2,.9,.25,1) both}
@keyframes mwin{from{translate:-90px 0;opacity:0}to{translate:0 0;opacity:1}}
#menu.swin::before{content:"";position:absolute;inset:0;z-index:5;pointer-events:none;background:linear-gradient(100deg,transparent 35%,rgba(200,140,255,.55) 48%,rgba(255,255,255,.8) 50%,rgba(200,140,255,.55) 52%,transparent 65%);animation:mwipe .6s ease-out forwards}
@keyframes mwipe{from{transform:translateX(-100%)}to{transform:translateX(100%);opacity:.2}}
</style>`);
