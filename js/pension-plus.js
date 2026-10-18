// ============================================================
//  pension-plus.js — PENSION : nouvel habillage (v0.21.5)
//    • Fond animé : une ferme-pension au soleil (grange, enclos, prairie, papillons) avec ton Pokémon (ou ton œuf) dans l'enclos
//    • Nouvel écran d'accueil, boutique et lignées dans le style du jeu
//    • Sprites manquants : le message indique le dossier exact et la raison (et un bouton « Réessayer »)
// ============================================================
// ---------- sprites : raison précise + nouvel essai ----------
const PEN_ERR = {};
penLoad = async function(id){
  if(typeof SPR !== 'undefined' && SPR[id]) return true;
  const f = PEN_FORMS[id], had = !!POKEMON[id]; if(!had) POKEMON[id] = { name:f.name, folder:f.folder, types:['normal'], hp:1, speed:1, moves:[] };
  try{ await loadPokemon(id); delete PEN_ERR[id]; return true; }catch(e){ PEN_ERR[id] = e && e.message || String(e); return false; }
  finally{ if(!had) delete POKEMON[id]; }
};
const penRetry = () => { PEN_LOADED = null; Object.keys(_penTh).forEach(k => delete _penTh[k]); showPension(); };

// ---------- écrans ----------
const penSect = (t, body) => `<div class='psect'><p class='psh'>${t}</p>${body}</div>`;
function penStat(lbl, v, col, ico){ return `<div class='pst'><span>${ico} ${lbl}</span><i><u style='width:${Math.max(0, Math.min(100, v))}%;background:${col}'></u></i><b>${Math.round(v)}</b></div>`; }
renderPension = function(msg, miss){
  const P = Pen.d(); penTick(P); const m = P.mon, e = P.egg;
  let hero = '', info = '';
  if(e){
    const pct = penEggPct(P)*100;
    hero = `<img class='phero egg' src='assets/items/${PEN.egg}.png'>`;
    info = `<b class='pname'>Œuf Mystère</b><span class='ptag'>En incubation${P.items.incubator ? ' · couveuse' : ''}</span>
      <div class='pbig'><i><u style='width:${pct}%'></u></i><small>${Math.round(pct)} % · éclosion dans <b>${penFmt(penEggLeft(P))}</b></small></div>
      <p class='phint'>Rends-lui visite et frotte-le pour le réchauffer plus vite.</p>`;
  } else if(m){
    const ev = penEvoState(P), fid = Pen.form(m), L = PEN_LINE[m.line];
    hero = `<img class='phero' src='${penThumb(fid)}'>`;
    info = `<b class='pname'>${esc(Pen.formName(fid))}</b><span class='ptag'>${esc(L.name)} · forme ${m.stage + 1}/3 · âge ${penFmt(m.age)}</span>
      <div class='psts'>${penStat('Faim', m.hunger, '#ff9a3c', '🍎')}${penStat('Bonheur', m.joy, '#ff7ac8', '♥')}${penStat('Énergie', m.energy, '#ffd23f', '⚡')}${penStat('Propreté', m.clean, '#5ad8ff', '✦')}</div>
      <p class='pmood'>${PEN_MOOD_TXT[penMood(m)]}</p>
      ${ev ? `<div class='pevo'><span>Prochaine évolution :</span><em class='${ev.ageOK ? 'ok' : ''}'>âge ${ev.ageOK ? '✓' : penFmt(ev.age)}</em><em class='${ev.joyOK ? 'ok' : ''}'>bonheur ${ev.joyOK ? '✓' : ev.joy + ' %'}</em></div>` : `<div class='pevo'><span>Forme finale !</span></div>`}`;
  } else {
    hero = `<img class='phero egg dim' src='assets/items/${PEN.egg}.png'>`;
    info = `<b class='pname'>La pension est vide</b><span class='ptag'>Œufs Mystère dans ton sac : ${Pen.eggs()}</span><p class='phint'>Dépose un Œuf Mystère : il éclot en un Pokémon que tu élèves jusqu'à sa forme finale — elle rejoint alors tes Pokémon de combat. L'œuf se trouve dans les <b>caisses</b> (rareté secrète dorée).</p>`;
  }
  const errs = (miss || []).map(id => `<li><b>assets/pokemon/${id}/</b> — ${esc(PEN_ERR[id] || 'introuvable')}</li>`).join('');
  menu(`<div class='hd' data-penscene><h1>Pension Pokémon</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='pmain'><div class='pheroc'>${hero}</div><div class='pinfo'>${info}</div></div>
    <div class='pacts'>${e || m ? `<button class='pact main' id='visit'><b>Rendre visite</b><small>${e ? 'Réchauffer l\'œuf' : 'Nourrir · jouer · laver'}</small></button>` : `<button class='pact main' id='dep' ${Pen.eggs() > 0 ? '' : 'disabled'}><b>Déposer l'œuf</b><small>${Pen.eggs()} en stock</small></button>`}
      <button class='pact' id='shop'><img src='${penIcon('bowl')}'><b>Boutique</b><small>Baies et confort</small></button>
      <button class='pact' id='lines'><img src='${penIcon('plant')}'><b>Lignées</b><small>${Object.keys(P.done || {}).length}/${PEN_LINES.length} terminées</small></button></div>
    ${errs ? `<div class='pwarn2'><b>⚠ Sprites manquants</b> (le nom du dossier doit être exactement celui-ci, en minuscules) :<ul>${errs}</ul><button class='btn2 sm' id='pretry'>Réessayer</button></div>` : ''}
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  const $ = id => document.getElementById(id);
  if($('visit')) $('visit').onclick = () => penEnter();
  if($('dep')) $('dep').onclick = () => { if(penDeposit()) showPension('L\'œuf est installé à la pension : il chauffe doucement.'); };
  if($('pretry')) $('pretry').onclick = penRetry;
  $('shop').onclick = () => showPenShop(); $('lines').onclick = () => showPenLines(); $('back').onclick = showMain;
};
showPenShop = function(msg){
  const P = Pen.d();
  menu(`<div class='hd' data-penscene><h1>Boutique de la pension</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='scroll pshop2'>${penSect('Baies', `<div class='pgrid'>${PEN_FOODS.map(f => `<div class='pitem'><img src='assets/items/${f.img}.png'><b>${f.name}</b><small>Faim +${f.v}${f.joy ? ' · bonheur +' + f.joy : ''}</small><em>stock : ${P.food[f.id] || 0}</em><button class='btn2 sm' data-f='${f.id}'>${money(f.price)}</button></div>`).join('')}</div>`)}
    ${penSect('Confort (permanent)', `<div class='pgrid'>${PEN_COMFORT.map(c => `<div class='pitem ${P.items[c.id] ? 'own' : ''}'><img src='${penIcon(c.id)}'><b>${c.name}</b><small>${c.desc}</small>${P.items[c.id] ? `<em class='ok'>✓ installé</em>` : `<button class='btn2 sm' data-c='${c.id}'>${money(c.price)}</button>`}</div>`).join('')}</div>`)}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-f]', el => { const f = PEN_FOOD[el.dataset.f]; if(Save.spend(f.price)){ P.food[f.id] = (P.food[f.id] || 0) + 1; Pen.save(); if(typeof coinSfx === 'function') coinSfx(); showPenShop('+1 ' + f.name); } else showPenShop('Pas assez de Pokédollars.'); });
  bindAll('[data-c]', el => { const c = PEN_COMFORT_BY[el.dataset.c]; if(Save.spend(c.price)){ P.items[c.id] = 1; Pen.save(); showPenShop(c.name + ' installé !'); } else showPenShop('Pas assez de Pokédollars.'); });
  document.getElementById('back').onclick = () => showPension();
};
showPenLines = function(){
  const P = Pen.d(), ev = a => a >= 24 ? (a/24) + ' j' : a + ' h';
  menu(`<div class='hd' data-penscene><h1>Lignées de la pension</h1></div>
    <div class='scroll plines2'>${PEN_LINES.map(L => `<div class='pl2 ${P.done[L.id] ? 'done' : ''}'><p><b>${L.name}</b>${P.done[L.id] ? `<em>✓ forme finale obtenue</em>` : ''}</p><div class='plr'>${L.forms.map((id, i) => { const seen = P.seen[id];
      return `${i ? `<span class='parr2'>➜<small>${ev(L.evo[i - 1].age)}<br>♥ ${L.evo[i - 1].joy} %</small></span>` : ''}<div class='pf2 ${seen ? '' : 'unk'}'><img src='${penThumb(id)}'><small>${seen ? esc(Pen.formName(id)) : '???'}</small></div>`; }).join('')}</div></div>`).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('back').onclick = () => showPension();
};
SCREENS.pension = showPension;

// ---------- fond animé : la ferme-pension ----------
const PNS = { L:null, t:0, flies:[], mon:{ x:430, tx:430, dir:1, t:0 }, parts:[] };
function pnsBuild(){
  const L = {}, [c, x] = mkcv(VW, VH);
  const g = x.createLinearGradient(0, 0, 0, 220); g.addColorStop(0, '#5ab8f0'); g.addColorStop(.7, '#a8e0ff'); g.addColorStop(1, '#e8f6ff'); x.fillStyle = g; x.fillRect(0, 0, VW, 220);
  x.fillStyle = '#fff6c0'; x.beginPath(); x.arc(560, 52, 24, 0, 6.283); x.fill(); x.fillStyle = 'rgba(255,246,192,.25)'; x.beginPath(); x.arc(560, 52, 40, 0, 6.283); x.fill();
  const hill = (y0, amp, col, ph) => { x.fillStyle = col; x.beginPath(); x.moveTo(0, VH); for(let px = 0; px <= VW; px += 8) x.lineTo(px, y0 + Math.sin(px/90 + ph)*amp + Math.sin(px/37 + ph*2)*amp*.3); x.lineTo(VW, VH); x.closePath(); x.fill(); };
  hill(170, 14, '#7ac86a', 1); hill(196, 10, '#5ab85a', 3);
  x.fillStyle = '#4aa84a'; x.fillRect(0, 214, VW, VH - 214);
  for(let i = 0; i < 260; i++){ x.fillStyle = Math.random() < .5 ? '#3a983e' : '#6ac86a'; x.fillRect(Math.random()*VW, 214 + Math.random()*(VH - 214), 2, 2); }
  // grange
  const bx = 430, by = 120;
  x.fillStyle = '#7a2a1e'; x.beginPath(); x.moveTo(bx - 70, by + 30); x.lineTo(bx, by - 22); x.lineTo(bx + 70, by + 30); x.closePath(); x.fill();
  x.fillStyle = '#c8402c'; x.fillRect(bx - 60, by + 28, 120, 74); x.fillStyle = '#a8301e'; for(let k = 0; k < 120; k += 8) x.fillRect(bx - 60 + k, by + 28, 1, 74);
  x.fillStyle = '#f4e8d0'; x.fillRect(bx - 22, by + 54, 44, 48); x.fillStyle = '#6a2418'; x.fillRect(bx - 18, by + 58, 36, 44);
  x.strokeStyle = '#f4e8d0'; x.lineWidth = 3; x.beginPath(); x.moveTo(bx - 18, by + 58); x.lineTo(bx + 18, by + 102); x.moveTo(bx + 18, by + 58); x.lineTo(bx - 18, by + 102); x.stroke();
  x.fillStyle = '#f4e8d0'; x.fillRect(bx - 12, by + 4, 24, 18); x.fillStyle = '#ffd860'; x.fillRect(bx - 9, by + 7, 18, 12);
  x.fillStyle = '#5a3a1e'; x.fillRect(bx - 46, by + 112, 92, 16); x.fillStyle = '#ffd23f'; x.font = 'bold 11px "Pixelify Sans",monospace'; x.textAlign = 'center'; x.fillText('PENSION', bx, by + 124);
  // enclos
  for(let px = 250; px < VW; px += 22){ x.fillStyle = '#c89a5a'; x.fillRect(px, 236, 5, 26); x.fillStyle = '#8a6030'; x.fillRect(px + 4, 236, 1, 26); }
  x.fillStyle = '#d8aa6a'; x.fillRect(248, 242, VW - 248, 4); x.fillRect(248, 252, VW - 248, 4);
  // fleurs
  for(let i = 0; i < 40; i++){ const fx = Math.random()*VW, fy = 270 + Math.random()*80; x.fillStyle = ['#ff7ac8', '#ffd23f', '#ffffff', '#ff8a5a'][i % 4]; x.fillRect(fx, fy, 3, 3); x.fillStyle = '#2a7a2e'; x.fillRect(fx + 1, fy + 3, 1, 3); }
  L.base = c; PNS.L = L;
  PNS.clouds = Array.from({ length:5 }, () => ({ x:Math.random()*VW, y:20 + Math.random()*70, w:50 + Math.random()*60, s:5 + Math.random()*6 }));
  PNS.flies = Array.from({ length:5 }, (_, i) => ({ x:Math.random()*VW, y:200 + Math.random()*100, ph:Math.random()*6, col:['#ffd23f', '#ff9ad8', '#9ae0ff'][i % 3] }));
}
function drawPensionScene(dt){
  if(!PNS.L) pnsBuild();
  const t = PNS.t += dt;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(PNS.L.base, 0, 0);
  PNS.clouds.forEach(cl => { cl.x += cl.s*dt; if(cl.x - cl.w > VW) cl.x = -cl.w; ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w/2, 10, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(cl.x + cl.w*.15, cl.y - 7, cl.w/3.2, 9, 0, 0, 6.283); ctx.fill(); });
  // ton Pokémon (ou l'œuf) dans l'enclos
  const P = Pen.d(), m = P.mon, M = PNS.mon;
  if(m && typeof SPR !== 'undefined' && SPR[Pen.form(m)] && typeof conFrame === 'function'){
    M.t -= dt; if(M.t <= 0){ M.tx = 280 + Math.random()*320; M.t = 2 + Math.random()*3; }
    const dx = M.tx - M.x, walk = Math.abs(dx) > 3; if(walk){ M.x += Math.sign(dx)*Math.min(Math.abs(dx), 40*dt); M.dir = Math.sign(dx); }
    const f = conFrame(Pen.form(m), walk ? ['Walk', 'Idle'] : ['Idle'], t, M.dir > 0 ? 2 : 6), k = 1.2;
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.beginPath(); ctx.ellipse(M.x, 300, 16, 5, 0, 0, 6.283); ctx.fill();
    ctx.drawImage(f.cv, Math.round(M.x - f.cx*k), Math.round(300 - f.bot*k), Math.round(f.cv.width*k), Math.round(f.cv.height*k));
  } else if(P.egg){
    const im = PNS.egg || (PNS.egg = Object.assign(new Image(), { src:'assets/items/' + PEN.egg + '.png' })), w = Math.sin(t*6)*(.5 + penEggPct(P)*2);
    ctx.fillStyle = '#d8b060'; ctx.beginPath(); ctx.ellipse(430, 300, 26, 8, 0, 0, 6.283); ctx.fill();
    if(im.complete && im.width){ ctx.save(); ctx.translate(430, 300); ctx.rotate(w*.05); ctx.drawImage(im, -16, -32, 32, 32); ctx.restore(); }
  }
  // papillons + pollen
  PNS.flies.forEach((b, i) => { b.ph += dt*3; b.x += Math.cos(b.ph*.4 + i)*30*dt + 8*dt; b.y += Math.sin(b.ph*.7)*20*dt; if(b.x > VW + 10) b.x = -10;
    const wing = Math.abs(Math.sin(b.ph*4))*3 + 1; ctx.fillStyle = b.col; ctx.fillRect(b.x - wing, b.y, wing, 3); ctx.fillRect(b.x + 1, b.y, wing, 3); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(b.x, b.y, 1, 3); });
  if(PNS.parts.length < 30 && Math.random() < .3) PNS.parts.push({ x:Math.random()*VW, y:VH, vy:-10 - Math.random()*14, life:6 });
  for(let i = PNS.parts.length - 1; i >= 0; i--){ const p = PNS.parts[i]; p.life -= dt; p.y += p.vy*dt; p.x += Math.sin(t + i)*8*dt; if(p.life <= 0){ PNS.parts.splice(i, 1); continue; } ctx.fillStyle = `rgba(255,250,200,${Math.min(1, p.life/2)*.7})`; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); }
  const vg = ctx.createLinearGradient(0, 0, VW, 0); vg.addColorStop(0, 'rgba(20,10,30,.55)'); vg.addColorStop(.55, 'rgba(20,10,30,.15)'); vg.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}
drawMenuScene = (prev => function(dt){ return MBG.scene === 'pension' ? drawPensionScene(dt) : prev(dt); })(drawMenuScene);
menu = (prev => function(h){
  const was = MBG.scene; prev(h);
  const m = document.getElementById('menu'), on = !G && !!h && h.includes('data-penscene');
  m.classList.toggle('penscene', on); if(!on) return;
  MBG.scene = 'pension'; m.classList.add('mscene');
  if(was !== 'pension'){ m.classList.remove('swin'); void m.offsetWidth; m.classList.add('swin'); if(typeof musicSet === 'function') musicSet('menu'); }
})(menu);

document.head.insertAdjacentHTML('beforeend', `<style>
#menu.penscene h1{background:linear-gradient(180deg,#fffbe6 0%,#ffe27a 45%,#ff9a3c 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(2px 2px 0 #3a1a06) drop-shadow(0 0 8px rgba(255,200,90,.5))}
#menu.penscene h1::after{background:linear-gradient(90deg,#ffd23f,transparent)}
#menu.penscene .mc>*{max-width:60%}
.pmain{display:flex;gap:12px;align-items:center;width:100%;max-width:560px;padding:10px 12px;border-radius:16px;border:2px solid #c8892e;background:linear-gradient(180deg,rgba(74,40,20,.88),rgba(36,18,10,.9));box-shadow:inset 0 0 0 2px #2a1206,0 4px 0 #1a0a04}
.pheroc{flex:0 0 96px;height:96px;border-radius:50%;background:radial-gradient(circle at 50% 60%,#8ad86a,#3a8a3a);border:3px solid #ffd23f;display:flex;align-items:center;justify-content:center;box-shadow:inset 0 -6px 0 rgba(0,0,0,.2)}
.phero{width:76px;height:76px;image-rendering:pixelated;filter:drop-shadow(0 3px 0 rgba(0,0,0,.3))}.phero.egg{width:56px;height:56px;animation:pegg 1.4s ease-in-out infinite}.phero.dim{filter:grayscale(1) opacity(.5);animation:none}
@keyframes pegg{0%,100%{transform:rotate(-4deg)}50%{transform:rotate(4deg)}}
.pinfo{flex:1;display:flex;flex-direction:column;align-items:flex-start;gap:3px;text-align:left}.pname{font-size:18px;color:#fff3c8}.ptag{font-size:10px;color:#ffd890}
.pbig{width:100%}.pbig i{display:block;height:10px;border-radius:5px;background:#1a0a04;border:1px solid #5a3018;overflow:hidden}.pbig u{display:block;height:100%;background:linear-gradient(90deg,#ffd23f,#ff9a3c)}.pbig small{font-size:10px}
.phint{font-size:10px;color:#e8d8c0;margin:2px 0}.pmood{font-size:11px;color:#fff;margin:2px 0}
.psts{display:grid;grid-template-columns:1fr 1fr;gap:3px 10px;width:100%}.pst{display:grid;grid-template-columns:70px 1fr 22px;align-items:center;gap:4px;font-size:10px}.pst i{height:7px;border-radius:4px;background:#1a0a04;overflow:hidden}.pst u{display:block;height:100%}.pst b{font-size:9px;text-align:right}
.pevo{display:flex;gap:6px;align-items:center;font-size:10px;flex-wrap:wrap}.pevo em{font-style:normal;padding:1px 6px;border-radius:7px;background:rgba(255,255,255,.1)}.pevo em.ok{background:#2a8a4a}
.pacts{display:flex;gap:7px;margin:8px 0;flex-wrap:wrap;justify-content:center;max-width:560px}
.pact{display:flex;flex-direction:column;align-items:center;gap:1px;min-width:120px;padding:6px 10px;border-radius:12px;border:2px solid #8a5a20;background:linear-gradient(180deg,#5a3418,#2e180a);box-shadow:0 3px 0 #1a0a04;color:#fff3c8;cursor:pointer;font-family:var(--font)}
.pact img{width:30px;height:30px;image-rendering:pixelated}.pact b{font-size:12px;color:#ffe27a}.pact small{font-size:9px;opacity:.85}
.pact.main{min-width:170px;justify-content:center;border-color:#ffd23f;background:linear-gradient(180deg,#ffd23f,#e8962a);color:#3a1a06;box-shadow:0 3px 0 #8a4a10,inset 0 2px 0 rgba(255,255,255,.5)}.pact.main b{color:#3a1a06;font-size:15px}.pact:disabled{opacity:.5;cursor:default}
.pwarn2{max-width:560px;font-size:10px;color:#ffd0c0;background:rgba(60,10,10,.75);border:1px solid #c8402c;border-radius:10px;padding:6px 10px;text-align:left}.pwarn2 ul{margin:4px 0 6px;padding-left:16px}
.psect{margin:0 0 6px}.psh{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffd890;margin:2px 0 4px;text-align:left}
.pshop2{max-width:620px;width:100%}.pgrid{display:flex;flex-wrap:wrap;gap:6px}
.pitem{width:132px;display:flex;flex-direction:column;align-items:center;gap:2px;padding:6px;border-radius:12px;border:2px solid #8a5a20;background:linear-gradient(180deg,rgba(74,40,20,.9),rgba(36,18,10,.92));text-align:center}
.pitem img{width:36px;height:36px;image-rendering:pixelated}.pitem b{font-size:11px;color:#ffe27a}.pitem small{font-size:9px;line-height:1.2;min-height:22px}.pitem em{font-style:normal;font-size:9px;color:#ffd890}.pitem em.ok{color:#7aff9a}.pitem.own{border-color:#3a9a4a}
.plines2{max-width:620px;width:100%;display:flex;flex-direction:column;gap:6px}.pl2{padding:6px 10px;border-radius:12px;border:2px solid #8a5a20;background:linear-gradient(180deg,rgba(74,40,20,.9),rgba(36,18,10,.92))}.pl2.done{border-color:#ffd23f}
.pl2 p{margin:0 0 3px;font-size:12px;display:flex;justify-content:space-between;text-align:left}.pl2 p b{color:#ffe27a}.pl2 p em{font-style:normal;font-size:10px;color:#7aff9a}
.plr{display:flex;align-items:center;justify-content:space-around}.pf2{display:flex;flex-direction:column;align-items:center;width:80px}.pf2 img{width:48px;height:48px;image-rendering:pixelated}.pf2 small{font-size:9px}.pf2.unk img{filter:brightness(0) opacity(.6)}
.parr2{display:flex;flex-direction:column;align-items:center;color:#ffd23f;font-size:16px}.parr2 small{font-size:8px;color:#ffd890;text-align:center}
</style>`);
