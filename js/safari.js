// ============================================================
//  safari.js — MODE SAFARI (v0.11) : capture des Pokémon (réglages : data/safari.js, cartes : js/safari-maps.js)
//    1. Magasin → onglet Safari : Ticket Safari + Poké / Super / Hyper Balls
//    2. Menu → Safari : choisis le Pokémon voulu (pas ceux déjà capturés) et ton équipe → −1 ticket
//    3. Combat sur une carte sauvage de son type. Affaiblis-le SANS le mettre K.O. (sinon il s'enfuit)
//    4. Bouton « Ball » (ou touche E ; R = changer de Ball) : la Ball part vers le Pokémon. Si elle touche,
//       il est aspiré, la Ball bouge jusqu'à 3 fois… et le Pokémon est capturé ou s'échappe.
//    Capturé = débloqué (Owned.add) : il est disponible dans Mes équipes.
// ============================================================
const BALL = Object.fromEntries(SAFARI.balls.map(b => [b.id, b]));
const ZONE = Object.fromEntries(SAFARI.zones.map(z => [z.id, z]));
const ballsLeft = () => SAFARI.balls.reduce((n, b) => n + Save.itemCount(b.id), 0);
const mapOf = pid => { const k = SAFARI.maps[typesOf(pid)[0]] || 'herbes'; return { key:k, idx:WILD[k] ?? WILD.herbes, name:WILD_MAPS[k].name }; };

// ---------- images (dessinées par le jeu, pas de fichier à ajouter) ----------
const _sfImg = {};
function ballImg(b){
  if(_sfImg[b.id]) return _sfImg[b.id];
  const c = document.createElement('canvas'); c.width = c.height = 32; const x = c.getContext('2d');
  x.translate(16, 16); drawBallCol(x, 0, 0, 13, b, 0, 0); return _sfImg[b.id] = c.toDataURL();
}
function ticketImg(z){
  const k = 'tk' + z.id; if(_sfImg[k]) return _sfImg[k];
  const c = document.createElement('canvas'); c.width = 48; c.height = 32; const x = c.getContext('2d');
  x.fillStyle = '#14101c'; x.fillRect(2, 5, 44, 22); x.fillStyle = '#ffe9a0'; x.fillRect(3, 6, 42, 20); x.fillStyle = z.ticket.col; x.fillRect(3, 6, 12, 20);
  x.fillStyle = '#14101c'; for(let y = 7; y < 26; y += 3) x.fillRect(16, y, 1, 2);
  x.fillStyle = '#2a7a3a'; x.beginPath(); x.ellipse(9, 16, 4, 6, .6, 0, 6.283); x.fill(); x.fillStyle = '#9ae070'; x.fillRect(8, 12, 1, 8);
  x.fillStyle = '#3a2a10'; x.font = 'bold 7px monospace'; x.fillText('SAFARI', 19, 15); x.fillStyle = '#8a5a10'; x.fillText('ADMIT 1', 19, 23);
  return _sfImg[k] = c.toDataURL();
}
// Ball aux couleurs de son type (Poké / Super / Hyper)
function drawBallCol(x, cx, cy, r, b, open, rot){
  x.save(); x.translate(cx, cy); x.rotate(rot || 0); x.lineWidth = Math.max(1.5, r*.16); x.strokeStyle = '#14101c';
  const half = top => { x.beginPath(); x.arc(0, 0, r, top ? Math.PI : 0, top ? 6.283 : Math.PI); x.closePath(); x.fillStyle = top ? b.top : '#f4f4f4'; x.fill(); x.stroke(); };
  half(false);
  if(open > 0){ x.save(); x.translate(-r, 0); x.rotate(-open*1.2); x.translate(r, 0); half(true); x.restore(); } else half(true);
  if(b.band && !open){ x.fillStyle = b.band; if(b.id === 'ball:super'){ x.fillRect(-r*.75, -r*.62, r*.3, r*.32); x.fillRect(r*.45, -r*.62, r*.3, r*.32); } else { x.fillRect(-r*.7, -r*.5, r*.32, r*.42); x.fillRect(r*.38, -r*.5, r*.32, r*.42); } }
  x.fillStyle = '#14101c'; x.fillRect(-r, -r*.1, r*2, r*.2);
  x.beginPath(); x.arc(0, 0, r*.32, 0, 6.283); x.fillStyle = '#fff'; x.fill(); x.stroke();
  x.restore();
}

// ---------- chance de capture ----------
function catchChance(e, b){
  const st = (e.st && SAFARI.status[e.st]) || 1;
  return Math.max(.01, Math.min(.97, SAFARI.base*(b ? b.mult : 1)*st*(1 - SAFARI.hpWeight*Math.max(0, e.hp)/e.max)));
}

// ============================================================ MAGASIN : onglet Safari
showShop = function(tab){
  tab = tab === 'safari' ? 'safari' : tab === 'crates' ? 'crates' : (Save.load().shopTab || 'crates');
  Save.load().shopTab = tab; shopBuild();
  const have = Save.coins();
  const tabs = `<div class='tabs'><button class='btn2 ${tab === 'crates' ? 'on' : ''}' data-tab='crates'>Caisses</button><button class='btn2 ${tab === 'safari' ? 'on' : ''}' data-tab='safari'>Safari</button></div>`;
  let body;
  if(tab === 'crates') body = `<div class='mlist shoplist'>${SHOP.map(o => { const c = CRATE[o.crate], ok = have >= c.price;
      return `<button class='mbtn offer' data-o='${o.id}'><img class='cr' src='${crateImg()}'><b>${esc(o.label)}</b><small>${esc(o.desc || '')}</small><span class='tag ${ok ? '' : 'bad'}'>${c.price ? money(c.price) : 'Gratuit'}</span></button>`; }).join('')}</div>
    <p class='hint'>Gagne des ${ECONOMY.name} en remportant des niveaux Solo (bonus au premier passage).</p>`;
  else {
    const row = (id, img, name, desc, price) => { const n = Save.itemCount(id);
      return `<div class='sf-off'><img src='${img}'><div><b>${esc(name)}</b><small>${esc(desc)}</small><em>Possédé : ×${n}</em></div>
        <button class='btn2 sm' data-buy='${id}' data-n='1' ${have >= price ? '' : 'disabled'}>×1 · ${money(price)}</button>
        <button class='btn2 sm' data-buy='${id}' data-n='5' ${have >= price*5 ? '' : 'disabled'}>×5 · ${money(price*5)}</button></div>`; };
    body = `<div class='scroll sf-shop'>${SAFARI.zones.map(z => row(z.ticket.id, ticketImg(z), z.ticket.name, 'Une entrée au ' + z.name + '. ' + z.desc, z.ticket.price)).join('')}
      ${SAFARI.balls.map(b => row(b.id, ballImg(b), b.name, 'Capture ×' + String(b.mult).replace('.', ','), b.price)).join('')}</div>
      <p class='hint'>Affaiblis le Pokémon sauvage avant de lancer une Ball : moins il a de PV, plus la capture est facile. Un statut (sommeil, gel, paralysie…) aide aussi.</p>`;
  }
  menu(`<div class='hd'><h1>Magasin</h1>${tabs}${walletHtml()}</div>${body}
    <div class='row'><button class='btn2' id='inv'>Inventaire</button>${tab === 'safari' ? `<button class='btn2' id='sf'>Aller au Safari →</button>` : ''}<button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-tab]', el => showShop(el.dataset.tab));
  bindAll('[data-o]', el => showCrate(SHOP.find(o => o.id === el.dataset.o).crate));
  bindAll('[data-buy]', el => {
    const id = el.dataset.buy, n = +el.dataset.n, price = (BALL[id] ? BALL[id].price : SAFARI.zones.find(z => z.ticket.id === id).ticket.price)*n;
    if(Save.spend(price)){ Save.addItem(id, n); coinSfx(); showShop('safari'); }
  });
  document.getElementById('inv').onclick = () => showInventory({ back:() => showShop() });
  const sf = document.getElementById('sf'); if(sf) sf.onclick = () => showSafari();
  document.getElementById('back').onclick = showMain;
};
SCREENS.shop = showShop;

// ============================================================ ÉCRAN SAFARI
{ const i = MAIN_MENU.findIndex(m => m.id === 'solo'); MAIN_MENU.splice(i + 1, 0, { id:'safari', label:'Safari', desc:'Capture de nouveaux Pokémon pour les débloquer', screen:'safari' }); }
function showSafari(sel){
  sel = sel || {};
  const z = ZONE[sel.zone] || SAFARI.zones[0], teams = Save.teams().filter(teamOk);
  const free = z.pokemon.filter(id => ORDER.includes(id) && !Owned.has(id));
  const pid = free.includes(sel.pid) ? sel.pid : free[0], t = sel.team || teams.find(x => x.id === Save.lastTeam) || teams[0];
  const tk = Save.itemCount(z.ticket.id), nb = ballsLeft(), ok = pid && tk > 0 && nb > 0 && t;
  const M = pid && mapOf(pid);
  menu(`<div class='hd'><h1>${esc(z.name)}</h1>${walletHtml()}</div>
    <div class='sf-inv'><span><img src='${ticketImg(z)}'>×${tk}</span>${SAFARI.balls.map(b => `<span><img src='${ballImg(b)}'>×${Save.itemCount(b.id)}</span>`).join('')}</div>
    <div class='edit sf-ed'>
      <div class='scroll left'><div class='grid2c'>${z.pokemon.filter(id => ORDER.includes(id)).map(id => { const own = Owned.has(id);
        return `<button class='card ${id === pid ? 'foc sel' : ''} ${own ? 'got' : ''}' data-pid='${id}' ${own ? 'disabled' : ''}>${thumb(id)}<small>${NAME[id]}</small>${own ? `<span class='lk'>✔</span>` : ''}</button>`; }).join('')}</div></div>
      <div class='scroll right'>${pid ? `<div class='dh'>${thumb(pid)}<div><b>${esc(NAME[pid])} sauvage</b><br>${typesOf(pid).map(tp => `<span class='tc' style='background:${COL[tp]}'>${TN[tp] || tp}</span>`).join('')}</div></div>
        <p>Carte : <b>${esc(M.name)}</b></p>
        <p class='hint'>Affaiblis-le sans le mettre K.O., puis lance une Ball (bouton « Ball » ou touche E, R pour changer de Ball — modifiables dans Options). S'il tombe K.O., il s'enfuit !</p>`
        : `<p><b>Bravo !</b> Tu as capturé tous les Pokémon de ce Safari.</p>`}
        ${!tk ? `<p class='hint bad'>Il te faut un ${esc(z.ticket.name)} (Magasin → Safari).</p>` : ''}${!nb ? `<p class='hint bad'>Il te faut des Poké Balls (Magasin → Safari).</p>` : ''}
      </div></div>
    <div class='row'>${teams.map(x => `<button class='btn2 sm ${t && x.id === t.id ? 'on' : ''}' data-team='${x.id}'>${esc(x.name)} (${x.members.length})</button>`).join('')}</div>
    <div class='row'><button class='btn' id='go' ${ok ? '' : 'disabled'}>Entrer (−1 ticket)</button>${!tk || !nb ? `<button class='btn2' id='shop'>Magasin</button>` : ''}<button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-pid]', el => showSafari({ zone:z.id, pid:el.dataset.pid, team:t }));
  bindAll('[data-team]', el => showSafari({ zone:z.id, pid, team:Save.team(el.dataset.team) }));
  const go = document.getElementById('go'); if(go) go.onclick = () => startSafari(t, z, pid);
  const sh = document.getElementById('shop'); if(sh) sh.onclick = () => showShop('safari');
  document.getElementById('back').onclick = showMain;
}
SCREENS.safari = showSafari;
function startSafari(team, z, pid){
  if(!team || !pid || Owned.has(pid) || Save.itemCount(z.ticket.id) < 1 || ballsLeft() < 1) return showSafari({ zone:z.id });
  Save.addItem(z.ticket.id, -1); Save.lastTeam = team.id;
  const M = mapOf(pid), stage = { ...z.stage, arena:M.idx };
  start({ mode:'safari', zone:z.id, target:pid, team:team.members.slice(), size:team.size, teamId:team.id, stage, arena:M.idx, enemies:[pid] });
  G.safari = { ball:SAFARI.balls.find(b => Save.itemCount(b.id) > 0).id, cd:0, warned:false };
}

// ============================================================ BOUTON « BALL » (6e case des commandes)
const ballBtn = (() => { const b = document.createElement('button'); b.className = 'ab ballb'; b.id = 'b5'; b.style.display = 'none';
  document.getElementById('btns').appendChild(b); return b; })();
ballBtn.addEventListener('pointerdown', e => { e.preventDefault(); if(e.target.closest('.bsw')) cycleBall(); else throwBall(); });
addEventListener('keydown', e => { if(!G || !G.safari || e.repeat || (e.target && e.target.tagName === 'INPUT')) return; const k = canon(e.code); if(k === 'KeyE') throwBall(); else if(k === 'KeyR') cycleBall(); /* touches réglables (Options) */ });
function cycleBall(){
  if(!G || !G.safari) return; const L = SAFARI.balls.filter(b => Save.itemCount(b.id) > 0); if(!L.length) return;
  const i = L.findIndex(b => b.id === G.safari.ball); G.safari.ball = L[(i + 1) % L.length].id; playSfx('click');
}
function updBallBtn(){
  if(!G || !G.safari){ ballBtn.style.display = 'none'; return; }
  ballBtn.style.display = '';
  let b = BALL[G.safari.ball]; if(Save.itemCount(b.id) < 1){ const nb = SAFARI.balls.find(x => Save.itemCount(x.id) > 0); if(nb){ G.safari.ball = nb.id; b = nb; } }
  const n = Save.itemCount(b.id), pc = Math.round(catchChance(G.e, b)*100), key = b.id + n + pc + (G.safari.cd > 0);
  if(ballBtn.dataset.k === key) return; ballBtn.dataset.k = key;
  ballBtn.style.borderColor = b.top === '#2a2a34' ? '#ffd23f' : b.top;
  ballBtn.innerHTML = `<img src='${ballImg(b)}'><b>${esc(b.name.replace(' Ball', ''))} ×${n}</b><small>${pc} %</small><span class='bsw'>⇄</span>`;
  ballBtn.classList.toggle('cd', G.safari.cd > 0 || !!G.ballFly || !!G.cap);
}
function throwBall(){
  if(!G || !G.safari || G.over || G.paused || G.sw || G.cap || G.ballFly || G.safari.cd > 0 || G.wait) return;
  const e = G.e, p = G.p, b = BALL[G.safari.ball]; if(!e || e.hp <= 0 || G.intro > 0 || e.hid) return;
  if(Save.itemCount(b.id) < 1){ dmgTxt(p.x, p.y - 50, 'PLUS DE ' + b.name.toUpperCase() + ' !', '#ff8a7a'); return; }
  Save.addItem(b.id, -1);
  const dur = .5, v = Math.hypot(e.vx || 0, e.vy || 0), k = v > 260 ? 260/v : 1;     // on vise un peu devant lui
  const tx = e.x + (e.vx || 0)*k*dur*.5, ty = e.y + (e.vy || 0)*k*dur*.5;
  G.ballFly = { sx:p.x, sy:p.y - 12, tx, ty, t0:G.time, dur, b };
  G.safari.cd = SAFARI.throwCd; p.atk = p.atkD = .3; lbl(0, b.name + ' !', 'normal'); playSfx('throw');
}
function startCapture(b){
  const e = G.e, p = catchChance(e, b), s = Math.pow(p, 1/3);
  let n = 0; while(n < 3 && Math.random() < s) n++;
  if(typeof clearPlus === 'function') clearPlus(e);
  e.rs = null; e.fl = null; e.tele = 0; e.hid = true; e.invT = G.time + 99;
  G.cap = { t0:G.time, x:e.x, y:e.y, hp:e.hp, n, ok:n === 3, b, ev:{} };
  playSfx('recall'); flashScreen(.15);
}
function updCapture(){
  const C = G.cap, e = G.e, t = G.time - C.t0; e.x = C.x; e.y = C.y; e.hp = Math.max(e.hp, Math.min(C.hp, 1)); e.tele = 0; e.next = Math.max(e.next || 0, .5);
  for(let k = 0; k < C.n; k++){ const tk = 1 + k*.6; if(t >= tk && !C.ev['s' + k]){ C.ev['s' + k] = 1; playSfx('click'); } }
  const tEnd = 1 + C.n*.6 + (C.ok ? 0 : .1);
  if(t < tEnd) return;
  if(C.ok){
    if(!C.ev.done){ C.ev.done = 1; G.caught = true; Owned.add(G.cfg.target); playSfx('ball_open'); stars(C.x, C.y + 4, 22, '#ffe86a'); dmgTxt(C.x, C.y - 50, 'CAPTURÉ !', '#ffe86a'); flashScreen(.2); }
    if(t > tEnd + 1.1){ G.cap = null; G.over = 1; battleEnd(true); }
  } else {
    G.cap = null; e.hid = false; e.invT = G.time + .5; e.next = .25;
    playSfx('ball_open'); flashScreen(.25); stars(C.x, C.y, 14); vp({ x:C.x, y:C.y, life:.4, s:10, s1:70, kind:'ring', col:'#ffffff' });
    dmgTxt(C.x, C.y - 56, ['Raté ! Il s\'est échappé !', 'Presque !', 'Argh ! Si près du but !'][Math.min(2, C.n)], '#ffb0a0');
  }
}
const _stepSf = step;
step = function(dt){
  const e0 = G && G.e, ex = e0 && e0.x, ey = e0 && e0.y;
  _stepSf(dt);
  if(!G || !G.safari || G.over || G.paused) return;
  const S = G.safari, e = G.e; if(S.cd > 0) S.cd -= dt;
  if(e && e === e0 && dt > 0){ e.vx = (e.x - ex)/dt; e.vy = (e.y - ey)/dt; }
  if(G.ballFly){ const F = G.ballFly;
    if(e && !e.hid){ const h = Math.min(1, dt*2.5); F.tx += (e.x - F.tx)*h; F.ty += (e.y - F.ty)*h; }   // la Ball suit un peu le Pokémon
    if(G.time - F.t0 >= F.dur){ G.ballFly = null;
      if(e && e.hp > 0 && !e.hid && Math.hypot(e.x - F.tx, e.y - F.ty) < e.r + 20) startCapture(F.b);
      else { dmgTxt(F.tx, F.ty - 30, 'RATÉ !', '#c8c8d0'); vp({ x:F.tx, y:F.ty, life:.3, s:4, s1:20, kind:'ring', col:'#ffffff' }); } } }
  if(G.cap) updCapture();
  if(!G || G.over) return;
  if(e && e.hp <= 0 && !G.caught){ S.koT = (S.koT || 0) + dt; if(S.koT > 1.2){ G.over = 1; battleEnd(false); } return; }   // K.O. : il s'enfuit
  if(!S.warned && e && e.hp > 0 && e.hp < e.max*.2){ S.warned = true; dmgTxt(e.x, e.y - 70, 'ATTENTION : NE LE METS PAS K.O. !', '#ffd23f'); }
  if(!G.cap && !G.ballFly && !G.caught && ballsLeft() === 0){ S.noBall = (S.noBall || 0) + dt; if(S.noBall > 1.5){ G.over = 1; battleEnd(false); } }
};
const _drawSf = draw;
draw = function(){ _drawSf(); updBallBtn(); };
// dessin de la Ball qui vole + capture
function drawSafari(){
  if(!G || !G.safari) return;
  if(G.ballFly){ const F = G.ballFly, u = Math.min(1, (G.time - F.t0)/F.dur), x = F.sx + (F.tx - F.sx)*u, y = F.sy + (F.ty - F.sy)*u - Math.sin(u*Math.PI)*70;
    E(ctx, F.tx, F.ty + 10, 8*u, 3*u, 'rgba(0,0,0,.25)'); drawBallCol(ctx, x, y, 7, F.b, 0, u*14); }
  const C = G.cap; if(!C) return;
  const t = G.time - C.t0, gy = C.y + 8;
  if(t < .5){ const u = t/.5, fr = mon(G.e, 1), sc = 2*(1 - u*.95);
    ctx.save(); ctx.globalAlpha = 1 - u*.3; ctx.translate(C.x, C.y - 30*u); ctx.drawImage(tint(fr, '#ff4a3a'), -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc); ctx.restore();
    drawBallCol(ctx, C.x, C.y - 34, 8, C.b, Math.max(0, 1 - u*1.6), 0); return; }
  let y = t < .8 ? (C.y - 34) + (gy - C.y + 34)*Math.min(1, (t - .5)/.3) : gy, rot = 0;
  if(t >= .8 && t < .95) y = gy - Math.sin((t - .8)/.15*Math.PI)*6;
  for(let k = 0; k < C.n; k++){ const tk = 1 + k*.6; if(t >= tk && t < tk + .4) rot = Math.sin((t - tk)/.4*Math.PI*2)*.5; }
  E(ctx, C.x, gy + 7, 9, 3, 'rgba(0,0,0,.3)');
  drawBallCol(ctx, C.x, y, 8, C.b, 0, rot);
  if(G.caught){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + .3*Math.sin(G.time*20); ctx.drawImage(glow('#ffe86a'), C.x - 24, y - 24, 48, 48); ctx.restore(); }
}
const _dbSf = drawBullets; drawBullets = function(){ _dbSf(); drawSafari(); };
// le bouton n'apparaît qu'au Safari
const _startSf = start; start = function(cfg){ const r = _startSf(cfg); if(G && cfg.mode !== 'safari') G.safari = null; updBallBtn(); return r; };

// ============================================================ FIN DU SAFARI
const _endSf = battleEnd;
battleEnd = function(win){
  const c = G.cfg; if(c.mode !== 'safari') return _endSf(win);
  const pid = c.target, z = ZONE[c.zone], t = Save.team(c.teamId), b = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
  ballBtn.style.display = 'none';
  if(G.caught){
    playSfx('victory');
    menu(`<div class='st-win'><img src='${spr(pid).toDataURL()}'><h1>${esc(NAME[pid])} est capturé !</h1>
      <p>Il est débloqué : ajoute-le à une équipe dans <b>Mes équipes</b>.</p>
      <div class='row'><button class='btn' id='tm'>Mes équipes</button><button class='btn2' id='sf'>Safari</button><button class='btn2' id='mn'>Menu</button></div></div>`);
  } else {
    const why = G.e && G.e.hp <= 0 ? `${esc(NAME[pid])} est K.O.… il s'est enfui dans les hautes herbes.` : ballsLeft() === 0 ? 'Tu n\'as plus de Balls…' : 'Ton équipe est K.O.…';
    playSfx('defeat');
    menu(`<h1>Raté !</h1><p>${why}</p><p class='hint'>Le ticket est utilisé. Tu peux réessayer avec un nouveau ticket.</p>
      <div class='row'><button class='btn' id='sf'>Safari</button><button class='btn2' id='shp'>Magasin</button><button class='btn2' id='mn'>Menu</button></div>`);
  }
  b('tm', showTeams); b('sf', () => showSafari({ zone:z.id })); b('shp', () => showShop('safari')); b('mn', showMain);
};
