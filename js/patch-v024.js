// ============================================================
//  patch-v024.js — VERSION 0.24.0 (rapport de test n°3)
//   ÉQUILIBRAGE
//    1. Solo : niveaux 8 à 10 nettement plus abordables (boss ×2,2 / 2,3 / 2,4, dégâts −20 %, PV −10 %) ; début du chapitre 2 plus doux
//    2. Raid, Safari et Caisse des Titans dès le niveau 7 du Solo (js/patch-v0171.js, js/titans.js) — l'œuf reste la récompense de Mewtwo
//    3. Gains : Tournois moins généreux, Tournoi Élite plus dur ; bonus de série en Solo (3 victoires d'affilée)
//    4. Alakazam, Tortank renforcés ; Câlinerie d'Azumarill (côté IA) annoncée plus tôt et moins forte
//   ÉVOLUTIONS DEMANDÉES
//    5. Viseur à la souris en combat (PC), coloré selon l'attaque, qui grossit pendant une charge
//    6. Ouvrir 10 caisses d'un coup (une roulette sur la meilleure trouvaille, puis le récapitulatif)
//    7. Safari sans Ball / sans ticket : bouton « Acheter … → », retour automatique au Safari ; pastille « 0 Ball » au menu
//   BUGS / CONFORT
//    8. Capture : ajoutée aussi à l'autre équipe (3v3 / 6v6) ; équipe pleine → « Qui remplacer ? »
//    9. Combat en ligne : « Abandon : le jeu est passé en arrière-plan » bien affiché (délai 20 s : js/online-config.js)
//   10. Raid : avantage / désavantage de type de tes Pokémon contre le boss
// ============================================================

// ---------------------------------------------------------------- 1. courbe du Solo
(() => {
  const S = STAGES, r2 = v => +v.toFixed(2);
  // niveaux 6 à 10 : montée régulière (testé dans le rapport n°3 : boss ×2,2, dégâts −20 %, PV −10 % → 6 victoires sur 12 au niveau 9)
  [[5, 1.10, .93, 2.2], [6, 1.13, .95, 2.2], [7, 1.16, .96, 2.25], [8, 1.2, .97, 2.3], [9, 1.24, .98, 2.4]].forEach(([i, hp, dmg, boss]) => { if(S[i]) Object.assign(S[i], { hp, dmg, boss }); });
  // chapitre 2 : un départ plus doux pour récompenser la victoire contre Mewtwo, puis la même montée jusqu'au sommet
  const from = { hp:1.08, dmg:.92, rate:.95, tele:.92, aim:.75, boss:2.2 }, to = { hp:1.75, dmg:1.5, rate:.62, tele:.7, aim:1, boss:3.1 };
  for(let i = 10; i < 20 && i < S.length; i++){ const t = Math.pow((i - 10)/9, 1.15); Object.keys(from).forEach(k => S[i][k] = r2(from[k] + (to[k] - from[k])*t)); }
})();

// ---------------------------------------------------------------- 3. gains
if(typeof TOUR !== 'undefined') TOUR.rewards = { 1:300, 2:160, 4:90, 8:45, 16:25 };             // avant 500 / 260 / 140 / 70 / 35 (×0,65, ×niveau)
if(typeof TOUR_LEVELS !== 'undefined'){ const E = TOUR_LEVELS.find(l => l.id === 'elite'), M = TOUR_LEVELS.find(l => l.id === 'maitre');
  if(E){ E.sk = [1.18, 1.32]; E.desc = 'IA très rapide et précise, équipes optimisées : un vrai défi.'; } if(M) M.sk = [1.38, 1.5]; }
// Solo : bonus de série — 3 victoires d'affilée sur des niveaux « de pointe » (pas en rejouant un niveau facile)
const V24_STREAK = { n:3, coins:40 };
startSolo = (prev => function(team, stageIndex){
  const d = Save.load(), size = team && team.size || 3; d.v24front = stageIndex >= Save.cleared(size) - 2;
  return prev(team, stageIndex);
})(startSolo);
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, solo = c && c.mode === 'solo', d = Save.load(); let bonus = 0;
  if(solo){ if(win){ if(d.v24front){ d.v24streak = (d.v24streak || 0) + 1; if(d.v24streak % V24_STREAK.n === 0){ bonus = Math.round(V24_STREAK.coins*(1 + Math.floor(c.stageIndex/5)*.5)); Save.addCoins(bonus); } } } else d.v24streak = 0; Save.save(); }
  const r = prev(win, why);
  if(solo && win){ const s = d.v24streak || 0; let n = 0; const put = () => { const g = document.querySelector('#menu .gain'); if(g){ g.insertAdjacentHTML('afterend', bonus ? `<p class='v24st'>🔥 Série de ${s} victoires : <b>+${money(bonus)}</b></p>` : d.v24front && s ? `<p class='v24st dim'>🔥 Série : ${s % V24_STREAK.n}/${V24_STREAK.n} — bonus à ${V24_STREAK.n} victoires d'affilée</p>` : ''); } else if(n++ < 30) setTimeout(put, 100); }; setTimeout(put, 30); }
  return r;
})(battleEnd);

// ---------------------------------------------------------------- 4. Pokémon
if(POKEMON.alakazam){ POKEMON.alakazam.hp = 105; const m = POKEMON.alakazam.moves.find(x => x.name === 'Psyko'); if(m) m.cooldown = 3; }      // 95 → 105 PV, Psyko 3,6 → 3 s
if(POKEMON.tortank){ const m = POKEMON.tortank.moves.find(x => x.name === 'Surf'); if(m) m.cooldown = 2.8; }                                 // Surf 3,2 → 2,8 s
// Azumarill adversaire : Câlinerie annoncée 30 % plus tôt, 25 % de dégâts en moins
step = (prev => function(dt){
  const e = G && G.e; prev(dt);
  if(!e || !G || G.over || G.e !== e || e.t !== 'azumarill' || (G.cfg && G.cfg.mode === 'online')) return;
  if(e.tele > 0 && e._v24 !== e.tm){ const m = MV.azumarill && MV.azumarill[e.pat]; if(m && m.k === 'hug'){ e.tele *= 1.3; e.tm = e.tele; } e._v24 = e.tm; }
  if(!(e.tele > 0)) e._v24 = null;
})(step);
hurtP = (prev => function(d, b){ if(b && b.k === 'hug' && !b.own && G && G.e && G.e.t === 'azumarill' && !(G.cfg && G.cfg.mode === 'online')) d *= .75; return prev(d, b); })(hurtP);

// ---------------------------------------------------------------- 5. viseur à la souris (PC, en combat)
drawScreenFx = (prev => function(){
  prev();
  if(!G || G.over || G.paused || !document.body.classList.contains('pcmode') || !AIM.mouse || performance.now() - AIM.mouseT > 4000) return;
  const x = AIM.mouse.x, y = AIM.mouse.y, p = G.p, held = [0, 1, 2].find(i => typeof down !== 'undefined' && down[i]);
  const m = held != null && p && p.mv ? p.mv[held] : null, col = m ? (COL[m.tp] || '#ffd23f') : '#ffd23f';
  const ch = held != null && p && p.ch ? Math.min(1, p.ch[held] || 0) : (held != null ? .5 + .5*Math.sin(G.time*10) : 0);
  // v0.25 : taille FIXE à l'écran (~28 px, jusqu'à ~36 px en charge), quelle que soit la résolution
  const cv = ctx.canvas, k = cv.width/VW, s = cv.width/Math.max(1, cv.getBoundingClientRect().width || cv.width), t = G.time;
  const X = x*k, Y = y*k, R = (8 + ch*4)*s, L1 = 2.6*s, L2 = 1.3*s;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.lineWidth = L1; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.beginPath(); ctx.arc(X, Y, R, 0, 6.2832); ctx.stroke();
  ctx.lineWidth = L2; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(X, Y, R, 0, 6.2832); ctx.stroke();
  for(let i = 0; i < 4; i++){ const a = i*Math.PI/2 + (held != null ? t*2 : 0), r0 = R - 2*s, r1 = R + 6*s;
    ctx.lineWidth = L1; ctx.strokeStyle = 'rgba(20,10,30,.85)'; ctx.beginPath(); ctx.moveTo(X + Math.cos(a)*r0, Y + Math.sin(a)*r0); ctx.lineTo(X + Math.cos(a)*r1, Y + Math.sin(a)*r1); ctx.stroke();
    ctx.lineWidth = L2; ctx.strokeStyle = col; ctx.beginPath(); ctx.moveTo(X + Math.cos(a)*r0, Y + Math.sin(a)*r0); ctx.lineTo(X + Math.cos(a)*r1, Y + Math.sin(a)*r1); ctx.stroke(); }
  ctx.fillStyle = 'rgba(20,10,30,.85)'; ctx.fillRect(X - 2*s, Y - 2*s, 4*s, 4*s); ctx.fillStyle = '#fff'; ctx.fillRect(X - s, Y - s, 2*s, 2*s);
  ctx.restore();
})(drawScreenFx);

// ---------------------------------------------------------------- 6. ouvrir 10 caisses
const V24_X10 = .9;                                    // ×10 : 10 % de remise
const crate10Price = c => Math.round(c.price*10*V24_X10/5)*5;
showCrate = (prev => function(id){
  prev(id);
  const c = CRATE[id], op = document.getElementById('op'); if(!c || !op || !c.price || op.disabled && /🔒/.test(op.textContent)) return;
  if(typeof crateLocked === 'function' && crateLocked(c)) return;
  const p = crate10Price(c);
  op.insertAdjacentHTML('afterend', `<button class='btn' id='op10' ${Save.coins() >= p ? '' : 'disabled'}>Ouvrir ×10 — ${money(p)} <s>${money(c.price*10)}</s></button>`);
  document.getElementById('op10').onclick = () => openCrate10(id);
})(showCrate);
function openCrate10(id){
  shopBuild();
  const c = CRATE[id], p = crate10Price(c); if(!c || !Save.spend(p)) return showCrate(id);
  if(typeof coinSfx === 'function') coinSfx();
  const got = [];
  for(let k = 0; k < 10; k++){ const it = rollItem(c), gid = it.give ? it.give.id : it.id, isNew = Save.itemCount(gid) === 0 && !got.some(g => g.gid === gid); Save.addItem(gid, it.give ? it.give.n : 1); Save.countOpen(); got.push({ it, gid, isNew }); }
  const best = got.slice().sort((a, b) => (RANK[b.it.r] || 0) - (RANK[a.it.r] || 0))[0].it;
  // une seule roulette, qui s'arrête sur la meilleure trouvaille
  const N = 54, wi = 42 + Math.floor(Math.random()*6);
  const filler = () => { let it; for(let k = 0; k < 20; k++){ it = rollItem(c); if(!(RAR[it.r] && RAR[it.r].hidden) && !it.legend) break; } return it; };
  const strip = Array.from({ length:N }, (_, i) => i === wi ? best : filler());
  menu(`<h1>Ouverture ×10</h1><small class='sub'>${esc(c.name)} · −${money(p)}</small>
    <div class='sview' id='sv' style='${rarCss(best.r)}'><div class='strip' id='st'>${strip.map((it, i) => itemCard(it, { s:.5, cls:'sc' + (i === wi ? ' win' : '') })).join('')}</div><div class='sline'></div></div>
    <div class='row' id='act'><button class='btn2' id='skip'>Passer</button></div>`);
  const sv = document.getElementById('sv'), st = document.getElementById('st'), vw = sv.offsetWidth || 480, target = wi*SHOP_CW + SHOP_CW*(.12 + Math.random()*.76) - vw/2;
  let t0 = performance.now(), last = -1, done = false;
  const recap = () => { if(done) return; done = true; if(typeof shopReveal === 'function') shopReveal(best.r); showCrate10Recap(id, got); };
  document.getElementById('skip').onclick = recap;
  const frame = now => { if(!st.isConnected || done) return; const t = Math.min(1, (now - t0)/(SHOP_DUR*.75)), x = target*(1 - Math.pow(1 - t, 4));
    st.style.transform = `translate3d(${-x}px,0,0)`; const i = Math.floor((x + vw/2)/SHOP_CW); if(i !== last){ last = i; if(typeof shopTick === 'function') shopTick(); }
    if(t >= 1){ sv.classList.add('done', 'z-' + best.r); if(typeof shopSuspense === 'function') shopSuspense(best.r); setTimeout(recap, Math.min(1500, SUSPENSE[best.r] || 600)); } else requestAnimationFrame(frame); };
  requestAnimationFrame(frame);
}
function showCrate10Recap(id, got){
  const c = CRATE[id], p = crate10Price(c), L = got.slice().sort((a, b) => (RANK[b.it.r] || 0) - (RANK[a.it.r] || 0));
  const dupes = () => [...new Set(L.filter(g => !g.it.give).map(g => g.it.id))].reduce((s, iid) => s + Save.sellable(iid)*sellPrice(ITEM[iid] || {}), 0);
  menu(`<div class='hd'><h1>10 caisses ouvertes !</h1>${walletHtml()}</div>
    <div class='scroll v24grid'>${L.map(g => `<div class='v24c' style='${rarCss(g.it.r)}'>${itemCard(g.it, { s:.42 })}<b class='v25nm'>${esc(v25ItemName(g.it))}</b>${g.isNew ? `<i class='v24new'>Nouveau !</i>` : ''}<small style='color:${RAR[g.it.r].col}'>${RAR[g.it.r].label}</small></div>`).join('')}</div>
    <div class='row'><button class='btn' id='re10' ${Save.coins() >= p ? '' : 'disabled'}>Rouvrir ×10 — ${money(p)}</button><button class='btn2' id='sell10'></button><button class='btn2' id='inv'>Inventaire</button><button class='btn2' id='cl'>Fermer</button></div>`);
  if(typeof shopConfetti === 'function') shopConfetti(L[0].it.r);
  const sb = document.getElementById('sell10'), upd = () => { const v = dupes(); sb.disabled = !v; sb.textContent = v ? `Vendre les doublons (+${money(v)})` : 'Pas de doublon'; if(typeof refreshWallet === 'function') refreshWallet(); };
  sb.onclick = () => { [...new Set(L.filter(g => !g.it.give).map(g => g.it.id))].forEach(iid => { const n = Save.sellable(iid); if(n) Save.sell(iid, n, sellPrice(ITEM[iid])); }); if(typeof coinSfx === 'function') coinSfx(); upd(); };
  upd();
  document.getElementById('re10').onclick = () => openCrate10(id);
  document.getElementById('inv').onclick = () => showInventory({ back:() => showCrate(id) });
  document.getElementById('cl').onclick = () => showCrate(id);
}

// ---------------------------------------------------------------- 7. Safari sans Ball / sans ticket
const v24Balls = () => SAFARI.balls.reduce((s, b) => s + Save.itemCount(b.id), 0);
showSafari = (prev => function(sel){
  prev(sel);
  const go = document.getElementById('go'); if(!go) return;
  const z = ZONE[sel && sel.zone] || SAFARI.zones[0], card = document.querySelector('.sf-ed .card.foc'), pid = card && card.dataset.pid;
  const noT = Save.itemCount(z.ticket.id) < 1, noB = v24Balls() < 1; if(!pid || (!noT && !noB)) return;
  go.disabled = false; go.classList.add('v24buy'); go.textContent = noT ? `Acheter un ${z.ticket.name.replace('Ticket Safari — ', 'ticket ')} →` : 'Acheter des Poké Balls →';
  go.onclick = () => { Save.load().v24ret = { zone:z.id, pid }; Save.save(); showShop('safari'); };
  const sh = document.getElementById('shop'); if(sh) sh.remove();
})(showSafari);
SCREENS.safari = showSafari;
showShop = (prev => function(tab){
  const r = prev(tab), R = Save.load().v24ret; if(!R || (tab || Save.load().shopTab) !== 'safari') return r;
  const row = [...document.querySelectorAll('#menu .row')].pop();
  if(row && !document.getElementById('v24back')) row.insertAdjacentHTML('afterbegin', `<button class='btn' id='v24back'>← Retour au Safari (${esc(NAME[R.pid] || '')})</button>`);
  const back = () => { const q = Save.load().v24ret; delete Save.load().v24ret; Save.save(); showSafari({ zone:q.zone, pid:q.pid }); };
  const bk = document.getElementById('v24back'); if(bk) bk.onclick = back;
  // après un achat, retour direct au Safari s'il ne manque plus rien
  document.querySelectorAll('[data-buy]').forEach(b => { const f = b.onclick; b.onclick = () => { f && f(); const z = ZONE[R.zone]; if(z && Save.itemCount(z.ticket.id) > 0 && v24Balls() > 0 && Save.load().v24ret){ Notif.toast('✔ Prêt ! Retour au Safari'); back(); } }; });
  return r;
})(showShop);
SCREENS.shop = showShop;
renderMainMM = (prev => function(){
  prev();
  try{ const b = document.querySelector(".mmi[data-id='safari']"); if(b && v24Balls() < 1 && !b.querySelector('.v24nb')) b.insertAdjacentHTML('beforeend', `<span class='v24nb'>0 Ball</span>`); }catch(e){}
})(renderMainMM);

// ---------------------------------------------------------------- 8. capture : l'autre équipe aussi, ou « Qui remplacer ? »
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, cap = c && c.mode === 'safari' && G.caught, pid = c && c.target, tid = c && c.teamId;
  const r = prev(win, why);
  if(!cap || !pid) return r;
  try{
    Save.teams().forEach(t => { if(t.id !== tid && !t.members.includes(pid) && t.members.length < t.size){ t.members.push(pid); } }); Save.save();
    const used = Save.team(tid);
    if(used && !used.members.includes(pid) && used.members.length >= used.size){
      let n = 0; const put = () => { const row = document.querySelector('#menu .row'); if(row && !document.getElementById('v24rep')){ row.insertAdjacentHTML('beforebegin', `<p class='hint'>Ton équipe <b>${esc(used.name)}</b> est pleine.</p>`); row.insertAdjacentHTML('afterbegin', `<button class='btn' id='v24rep'>Qui remplacer ?</button>`); document.getElementById('v24rep').onclick = () => v24Replace(used.id, pid); } else if(!row && n++ < 40) setTimeout(put, 100); };
      setTimeout(put, 50);
    }
  }catch(e){ console.warn('v24 capture', e); }
  return r;
})(battleEnd);
function v24Replace(tid, pid){
  const t = Save.team(tid); if(!t) return showMain();
  menu(`<div class='hd'><h1>Qui laisse sa place ?</h1></div><p>${thumb(pid)} <b>${esc(NAME[pid])}</b> rejoint <b>${esc(t.name)}</b> à la place de…</p>
    <div class='row v24rp'>${t.members.map((id, i) => `<button class='card' data-rp='${i}'>${thumb(id)}<small>${esc(NAME[id])}</small>${typeof pkRoleTag === 'function' ? pkRoleTag(id) : ''}</button>`).join('')}</div>
    <div class='row'><button class='btn2' id='v24keep'>Personne (garder mon équipe)</button></div>`);
  bindAll('[data-rp]', b => { const i = +b.dataset.rp, old = t.members[i]; t.members[i] = pid; if(t.items && t.items[old]){ t.items[pid] = t.items[old]; delete t.items[old]; } Save.save(); Notif.toast(`${NAME[pid]} rejoint ${t.name} !`); showMain(); });
  document.getElementById('v24keep').onclick = showMain;
}

// ---------------------------------------------------------------- 9. combat en ligne : abandon en arrière-plan bien expliqué
if(typeof netEndScreen === 'function') netEndScreen = (prev => function(M){
  const r = prev(M);
  if(M && M.endWhy === 'hidden' && !M.win){ const h = document.querySelector('#menu .net-end h1'); if(h) h.textContent = 'Abandon';
    const p = document.querySelector('#menu .net-end .hint'); if(p) p.innerHTML = `⚠ <b>Abandon : le jeu est passé en arrière-plan plus de ${ONLINE_CFG.hiddenForfeit} s</b> (appel, autre appli…). Garde le jeu à l'écran pendant un combat en ligne.`; }
  return r;
})(netEndScreen);
addEventListener('visibilitychange', () => { if(document.hidden) return; try{ const M = typeof NET !== 'undefined' && NET.m; if(M && M.state === 'end' && M.endWhy === 'hidden' && !document.querySelector('#menu .net-end')) netEndScreen(M); }catch(e){} });

// ---------------------------------------------------------------- 10. Raid : avantage de type contre le boss
showRaid = (prev => function(sel){
  prev(sel);
  try{
    const cur = raidCurrent(), boss = cur && cur.id, tm = document.querySelector('#menu .rtm'); if(!boss || !tm || !HERO[boss]) return;
    const btn = document.querySelector('[data-team].on'), t = btn ? Save.team(btn.dataset.team) : null; if(!t) return;
    const adv = id => { const s = lg2(bestHit(id, boss)) - lg2(bestHit(boss, id)); return s > .3 ? `<b class='adv up'>▲</b>` : s < -.3 ? `<b class='adv dn'>▼</b>` : `<b class='adv eq'>=</b>`; };
    tm.innerHTML = t.members.slice(0, RAID.teamMax).map(id => `<span class='v22m'>${thumb(id)}${adv(id)}</span>`).join('');
    tm.insertAdjacentHTML('beforeend', `<small class='v24rt'>contre ${typesOf(boss).map(x => `<i style='background:${COL[x]}'>${TN[x] || x}</i>`).join('')}</small>`);
  }catch(e){ console.warn('v24 raid', e); }
})(showRaid);
SCREENS.raid = showRaid;

document.head.insertAdjacentHTML('beforeend', `<style>
body.pcmode #app:not(.nogame) #cv{cursor:none}
.v24st{font-size:12px;color:#ffb070;margin:2px 0}.v24st.dim{font-size:10px;opacity:.75}
#op10 s,.v24buy s{opacity:.55;font-size:.8em}
.v24grid{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;max-width:720px;width:100%}.v24c{position:relative;display:flex;flex-direction:column;align-items:center;padding:4px;border-radius:10px;background:rgba(20,12,36,.7);border:1px solid rgba(255,255,255,.12)}
.v24c small{font-size:8px}.v24new{position:absolute;top:2px;left:2px;font-style:normal;font-size:8px;padding:0 4px;border-radius:4px;background:#3fae4a;color:#fff;z-index:2}
.v24buy{background:linear-gradient(180deg,#ffd86a,#f0a82c)!important;color:#3a2208!important;animation:v24p 1.2s ease-in-out infinite}@keyframes v24p{50%{box-shadow:0 0 14px #ffd23f}}
.v24nb{margin-left:6px;font-size:9px;padding:0 5px;border-radius:5px;background:#a8302a;color:#fff;vertical-align:middle}
.v24rt{display:inline-flex;gap:2px;align-items:center;margin-left:4px;font-size:9px}.v24rt i{font-style:normal;font-size:8px;padding:0 3px;border-radius:3px;color:#fff}
.rtm .v22m{display:inline-flex;flex-direction:column;align-items:center;margin:0 2px}
.v24rp .card{min-width:80px}
@media (max-height:440px){ .v24grid{grid-template-columns:repeat(5,1fr);gap:3px} }
</style>`);
