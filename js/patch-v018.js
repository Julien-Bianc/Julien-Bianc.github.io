// ============================================================
//  patch-v018.js — v0.18.0 (rapport de test v0.17.2)
//    1. Éditeur d'équipe : double appui = ajouter / retirer ; glisser-déposer pour ajouter, retirer, changer de place
//    2. Raid à plusieurs : K.O., tu regardes un allié encore debout ; après un échec : réessayer en solo / nouveau raid
//    3. En ligne : le K.O. final se joue (2,4 s) avant l'écran de fin
//    4. Raid : inviter directement un ami connecté depuis le salon
//    5. Échanges : l'écran défile (on voit tous les objets et les boutons)
//    6. Guides : Créer une équipe, Objets tenus, Safari (1re visite + bouton « ? »)
//    7. Solo : niveau 1 = 1 adversaire, niveau 2 = 2 ; équipe type par niveau + Pokémon au hasard (data/chapters.js)
//    8. Safari : pas de grand « K.O. » pour les petits Pokémon de la meute
//  (souris PC : corrigée dans js/patch-v0172.js · objets tenus moins forts : data/items.js)
// ============================================================

// ---------- 1. éditeur d'équipe ----------
let TAP = { k:null, t:0 }, DRAG = null, NOCLICK = 0;
const dblTap = k => { const now = performance.now(), d = TAP.k === k && now - TAP.t < 420; TAP = d ? { k:null, t:0 } : { k, t:now }; return d; };
let TE = null;                                                   // éditeur ouvert : { ed, rer }
function teamEditorHook(ed, rer){
  TE = { ed, rer };
  document.querySelectorAll('.edit img').forEach(i => { i.draggable = false; });
  document.querySelectorAll('.grid2c [data-add]').forEach(el => {
    const old = el.onclick;
    el.onclick = ev => { if(NOCLICK > performance.now()) return; if(dblTap('c' + el.dataset.add)) return teToggle(el.dataset.add); if(old) old(ev); };
    teDragSrc(el, { id:el.dataset.add, from:-1 });
  });
  document.querySelectorAll('.slot[data-rm]').forEach(el => {
    const i = +el.dataset.rm, id = ed.members[i];
    el.classList.toggle('filled', !!id);
    el.onclick = () => { if(NOCLICK > performance.now() || !id) return;
      if(dblTap('s' + i)){ ed.members.splice(i, 1); teDrop(id); ed.pick = false; return rer(); }
      ed.focus = id; ed.pick = false; rer(); };
    if(id) teDragSrc(el, { id, from:i });
  });
  const sv = document.getElementById('sv');
  if(sv && !document.querySelector('.tehint')){
    sv.parentElement.insertAdjacentHTML('beforebegin', `<p class='hint tehint'>Double appui : ajouter / retirer · Maintiens puis glisse un Pokémon vers une place (ou hors de l'équipe pour le retirer)</p>`);
    sv.parentElement.insertAdjacentHTML('beforeend', `<button class='btn2 sm' id='teq' title='Guide'>?</button>`);
    document.getElementById('teq').onclick = () => showGuide('team', () => rer());
  }
  if(!guideSeen('team')) setTimeout(() => { if(TE && TE.ed === ed) showGuide('team', () => rer()); }, 60);
  else if(ed.pick === 'held' && !guideSeen('held')) setTimeout(() => showGuide('held', () => rer()), 60);
}
const teOwn = id => typeof Owned === 'undefined' || Owned.has(id);
function teDrop(id){ const ed = TE.ed; delete ed.items[id]; delete ed.caps[id]; }
function teToggle(id){
  const ed = TE.ed, i = ed.members.indexOf(id);
  if(i >= 0){ ed.members.splice(i, 1); teDrop(id); }
  else if(!teOwn(id)){ Notif.toast('🔒 À capturer au Safari'); return; }
  else if(ed.members.length < ed.size) ed.members.push(id);
  else { Notif.toast('Équipe pleine : retire d\'abord un Pokémon'); return; }
  ed.focus = id; ed.pick = false; TE.rer();
}
function teDragSrc(el, src){
  el.addEventListener('dragstart', e => e.preventDefault());
  el.addEventListener('contextmenu', e => e.preventDefault());
  el.addEventListener('pointerdown', e => {
    if(e.button > 0) return;
    const D = DRAG = { src, el, x:e.clientX, y:e.clientY, x0:e.clientX, y0:e.clientY, t0:performance.now(), pid:e.pointerId, on:false, slow:e.pointerType !== 'mouse' && src.from < 0 };
    if(D.slow) setTimeout(() => { if(DRAG === D && !D.on && Math.hypot(D.x - D.x0, D.y - D.y0) < 12) teStart(D); }, 280);   // tactile dans la liste : appui long
  });
}
function teStart(D){
  D.on = true; const img = D.el.querySelector('img, canvas');
  const g = D.ghost = document.createElement('div'); g.className = 'tdrag';
  if(img){ const im = document.createElement('img'); im.src = img.tagName === 'CANVAS' ? img.toDataURL() : img.src; g.appendChild(im); }
  document.body.appendChild(g); teMove(D); D.el.classList.add('dragsrc');
  if(navigator.vibrate) try{ navigator.vibrate(12); }catch(e){}
}
function teMove(D){
  if(D.ghost){ D.ghost.style.left = D.x + 'px'; D.ghost.style.top = D.y + 'px'; }
  const t = document.elementFromPoint(D.x, D.y), s = t && t.closest && t.closest('.slot[data-rm]');
  document.querySelectorAll('.slot.dropon').forEach(x => x !== s && x.classList.remove('dropon')); if(s) s.classList.add('dropon');
  const out = D.src.from >= 0 && !s; document.body.classList.toggle('tdrag-out', out);
}
function teEnd(D, drop){
  if(D.ghost) D.ghost.remove(); document.body.classList.remove('tdrag-out'); DRAG = null;
  if(!D.on || !drop || !TE) return;
  NOCLICK = performance.now() + 350;
  const ed = TE.ed, id = D.src.id, t = document.elementFromPoint(D.x, D.y), s = t && t.closest && t.closest('.slot[data-rm]'), j = s ? +s.dataset.rm : null, M = ed.members;
  if(D.src.from < 0){                                            // depuis la liste
    if(j == null) return TE.rer();
    if(!teOwn(id)){ Notif.toast('🔒 À capturer au Safari'); return TE.rer(); }
    const k = M.indexOf(id);
    if(k >= 0){ M.splice(k, 1); M.splice(Math.min(j, M.length), 0, id); }
    else if(M.length >= ed.size){ const old = M[Math.min(j, M.length - 1)]; teDrop(old); M[Math.min(j, M.length - 1)] = id; }
    else M.splice(Math.min(j, M.length), 0, id);
  } else {                                                       // depuis une place de l'équipe
    const i = D.src.from;
    if(j == null){ M.splice(i, 1); teDrop(id); }
    else if(j !== i){ if(j < M.length){ M[i] = M[j]; M[j] = id; } else { M.splice(i, 1); M.push(id); } }
  }
  ed.focus = id; ed.pick = false; TE.rer();
}
addEventListener('pointermove', e => {
  const D = DRAG; if(!D || e.pointerId !== D.pid) return;
  D.x = e.clientX; D.y = e.clientY;
  if(!D.on){
    const dist = Math.hypot(D.x - D.x0, D.y - D.y0);
    if(D.slow){ if(dist > 12) DRAG = null; return; }            // tactile : on a voulu faire défiler la liste
    if(dist < 8) return; teStart(D);
  }
  e.preventDefault(); teMove(D);
}, { passive:false });
addEventListener('pointerup', e => { if(DRAG && e.pointerId === DRAG.pid) teEnd(DRAG, true); });
addEventListener('pointercancel', e => { if(DRAG && e.pointerId === DRAG.pid && !DRAG.on) DRAG = null; });
document.addEventListener('touchmove', e => { if(DRAG && DRAG.on) e.preventDefault(); }, { passive:false });
const _showTeamsV18 = showTeams; showTeams = function(){ TE = null; return _showTeamsV18.apply(this, arguments); };

// ---------- 2. raid à plusieurs : spectateur, après un échec ----------
const raidWatch = () => { if(!(isRaid() && G.raid.out && G.raid.net && RaidHook.allies)) return null; return RaidHook.allies().find(a => a.hp > 0 && !a.out) || null; };
updCam = (prev => function(p, e){ const a = raidWatch(); return prev(a || p, e); })(updCam);
const _dsfV18 = drawScreenFx;
drawScreenFx = function(){
  _dsfV18();
  const a = G && G.raid && !G.raid.ended && !G.over && raidWatch(); if(!a) return;
  ctx.save(); ctx.globalAlpha = .75 + .25*Math.sin(G.time*3); htext('K.O. — tu regardes ' + a.pseudo, VW/2, VH - 52, 10, '#bff0c0', 'center'); ctx.restore();
};
raidEndScreen = (prev => function(win, R){
  const t = G && G.cfg && Save.team(G.cfg.teamId), boss = G && G.cfg && G.cfg.raidBoss, stars = RCF().stars;
  prev(win, R);
  if(win || !R || !R.net || !t) return;
  const row = document.querySelector('#menu .row'); if(!row) return;
  row.insertAdjacentHTML('afterbegin', `<button class='btn' id='rsolo2'>Réessayer en solo</button><button class='btn2' id='rnew2'>Nouveau raid à plusieurs</button>`);
  document.getElementById('rsolo2').onclick = () => { if(RNET.m) RaidNet.close(true); startRaid(t, { boss, stars }); };
  document.getElementById('rnew2').onclick = () => { if(RNET.m) RaidNet.close(true); G = null; rnChoose(t, true); };
})(raidEndScreen);

// ---------- 3. en ligne : on laisse jouer le K.O. final ----------
battleEnd = (prev => function(win, why){
  if(G && G.cfg && G.cfg.mode === 'online' && !win && !G.netEndDone){
    if(G.netEndAt) return;
    if(why == null && G.p && G.p.hp <= 0 && typeof NET !== 'undefined' && NET.m && NET.m.state === 'fight'){
      G.netEndAt = G.time + 2.4; G.over = 0; G.p.koDone = 1; G.p.inv = 0; return;
    }
  }
  return prev(win, why);
})(battleEnd);
const _stepV18 = step;
step = function(dt){
  if(!G || !G.netEndAt) return _stepV18(dt);
  down[0] = down[1] = down[2] = 0;
  _stepV18(dt);
  if(G && G.netEndAt && G.time >= G.netEndAt && !G.netEndDone){ G.netEndDone = true; G.netEndAt = 0; G.over = 1; battleEnd(false); }
};
const _pressV18 = press; press = function(i){ if(G && G.netEndAt) return; return _pressV18(i); };

// ---------- 4. inviter un ami dans un raid ----------
const RINV = { seen:new Set() };
setInterval(() => {
  const L = typeof Online !== 'undefined' && Online.lobby; if(!L || L.__rinv) return; L.__rinv = 1;
  try{ L.on('broadcast', { event:'rinv' }, m => raidInviteIn(m && m.payload)); }catch(e){ console.warn(e); }
}, 1500);
function raidInviteIn(d){
  if(!d || !Online.user || d.to !== Online.user.id || RINV.seen.has(d.k)) return; RINV.seen.add(d.k);
  if(RNET.m || (typeof NET !== 'undefined' && NET.m)) return;
  Notif.show({ id:'ri' + d.c, cls:'chal', title:`🔥 ${esc(d.p)} t'invite à un raid !`, timeout:45,
    text:`${'★'.repeat(d.s || 3)} ${esc(NAME[d.b] || d.b || '')}${G && !G.over ? '<br><small>Rejoindre quitte ton combat en cours.</small>' : ''}`,
    buttons:[{ label:'Rejoindre', cls:'btn', fn:() => { G = null; pickTeam({ title:`Raid de ${esc(d.p)} — choisis ton équipe (les 3 premiers Pokémon)`, onCancel:showMain,
      onPick:t => RaidNet.open({ code:d.c, host:false, kind:'sb', teamId:t.id }) }); } }, { label:'Refuser' }] });
}
function raidInvite(M, f){
  if(!Online.lobby || !Online.user) return;
  const payload = { to:f.other, p:Online.user.pseudo, c:M.code, b:M.boss && M.boss.id, s:M.boss && M.boss.stars, k:M.code + ':' + f.other + ':' + Date.now() };
  try{ Online.lobby.send({ type:'broadcast', event:'rinv', payload }); }catch(e){ return Notif.toast('Invitation impossible : ' + esc(e.message || e)); }
  (M.inv = M.inv || new Set()).add(f.other); Notif.toast(`Invitation envoyée à <b>${esc(f.pseudo)}</b>`, '#8dff9a');
}
rnLobbyScreen = (prev => function(M){
  prev(M);
  if(RNET.m !== M || M.state !== 'lobby' || M.kind !== 'sb' || !onlineReady() || M.list.length >= RAID.maxPlayers) return;
  const inRaid = new Set(M.list.map(p => p.pseudo));
  const F = (Online.friends || []).filter(f => f.status === 'accepted' && Online.isOnline(f.other) && !inRaid.has(f.pseudo));
  const box = document.querySelector('.rnl .rnps'); if(!box) return;
  box.insertAdjacentHTML('afterend', `<div class='rninv'><small>Inviter un ami :</small>${F.length ? F.map(f => `<button class='btn2 sm' data-rinv='${f.other}' ${M.inv && M.inv.has(f.other) ? 'disabled' : ''}>${M.inv && M.inv.has(f.other) ? '✔ ' : '+ '}${esc(f.pseudo)}</button>`).join('') : `<i>aucun ami en ligne</i>`}</div>`);
  bindAll('[data-rinv]', b => { const f = F.find(x => x.other === b.dataset.rinv); if(f){ raidInvite(M, f); b.disabled = true; b.textContent = '✔ ' + f.pseudo; } });
})(rnLobbyScreen);

// ---------- 6. guides ----------
const GUIDES = {
  team:{ title:'Créer une équipe', pages:[
    { img:'team-edit', title:'Choisir ses Pokémon', text:'<b>Mes équipes → Nouvelle 3v3 / 6v6.</b> Touche un Pokémon de la liste : ses <b>statistiques et ses attaques</b> s\'affichent à droite. Le bouton « Ajouter à l\'équipe » le met dans la première place libre.' },
    { img:'team-drag', title:'Double appui et glisser-déposer', text:'<b>Double appui</b> sur un Pokémon : il entre dans l\'équipe (ou en sort). <b>Maintiens puis glisse-le</b> sur une place en haut pour l\'y mettre, ou d\'une place à l\'autre pour changer l\'ordre. Glisse-le hors des places pour le retirer.' },
    { img:'team-save', title:'L\'ordre compte', text:'Le Pokémon de la <b>1re place</b> commence le combat, les suivants entrent dans l\'ordre (ou avec la Relève). En 3v3 : 1 à 3 Pokémon, en 6v6 : 1 à 6. Pense à <b>Enregistrer</b> !' }] },
  held:{ title:'Objets tenus', pages:[
    { img:'held-pick', title:'Équiper un objet', text:'Dans l\'éditeur d\'équipe, touche un Pokémon de ton équipe puis <b>Objet tenu</b> : choisis un objet parmi ceux que tu possèdes. <b>Un objet par Pokémon</b>.' },
    { img:'held-fx', title:'Ce que font les objets', text:'Attaques d\'un type renforcées, soin sous la moitié des PV (baies), soin des statuts, critiques plus fréquents, survie à un coup fatal… Les objets <b>Choix</b> sont puissants mais te bloquent sur une attaque jusqu\'à la Relève (🔒 sur les boutons).' },
    { img:'held-get', title:'Où les trouver ?', text:'Dans les <b>caisses du Magasin</b> et les <b>caisses de raid</b>. Plus un objet est fort, plus il est rare : commun, peu commun, rare, ultra rare. Les doublons se revendent dans l\'Inventaire.' }] },
  safari:{ title:'Le Safari', pages:[
    { img:'safari-shop', title:'Préparer l\'expédition', text:'Au <b>Magasin → Safari</b>, achète un <b>Ticket Safari</b> et des <b>Balls</b> (Poké, Super, Hyper : plus chères = meilleures chances).' },
    { img:'safari-pick', title:'Choisir sa cible', text:'Dans <b>Safari</b>, choisis le Pokémon que tu veux capturer (pas ceux que tu as déjà) et ton équipe. Le ticket est utilisé à l\'entrée.' },
    { img:'safari-fight', title:'Traverser les salles', text:'Chaque salle cache une <b>meute</b> de Pokémon sauvages : bats-les pour avancer. Le Pokémon à capturer t\'attend dans la <b>dernière salle</b>.' },
    { img:'safari-ball', title:'Capturer', text:'<b>Affaiblis-le sans le mettre K.O.</b> (sinon il s\'enfuit), puis touche le bouton <b>Ball</b> (touche E, R pour changer de Ball). Moins il a de PV, plus la capture est facile. Capturé = disponible dans Mes équipes !' }] }
};
const guideSeen = k => { const d = Save.load(); return !!(d.guides && d.guides[k]); };
function showGuide(key, back){
  const Gd = GUIDES[key]; if(!Gd) return back && back();
  const d = Save.load(); d.guides = d.guides || {}; if(!d.guides[key]){ d.guides[key] = 1; Save.save(); }
  let i = 0;
  const render = () => {
    const T = Gd.pages[i], last = i === Gd.pages.length - 1;
    menu(`<div class='tuto'>
      <div class='tuh'><h1>${Gd.title}</h1><span class='tun'>${i + 1}/${Gd.pages.length}</span></div>
      <div class='tuv' id='tuv'><img src='assets/tutorial/${T.img}.jpg' alt='' draggable='false' onerror="this.style.visibility='hidden'">
        <button class='tua l' id='tup' ${i ? '' : 'disabled'}>◀</button><button class='tua r' id='tunx' ${last ? 'disabled' : ''}>▶</button></div>
      <div class='tut'><b>${T.title}</b><p>${T.text}</p></div>
      <div class='tud'>${Gd.pages.map((_, k) => `<i class='${k === i ? 'on' : ''}' data-tp='${k}'></i>`).join('')}</div>
      <div class='row'>${last ? `<button class='btn' id='tuok'>Compris !</button>` : `<button class='btn' id='tugo'>Suivant</button><button class='btn2' id='tusk'>Fermer</button>`}</div></div>`);
    const go = k => { i = Math.max(0, Math.min(Gd.pages.length - 1, k)); render(); };
    const b = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    const done = () => (back || showMain)();
    b('tup', () => go(i - 1)); b('tunx', () => go(i + 1)); b('tugo', () => go(i + 1)); b('tusk', done); b('tuok', done);
    bindAll('[data-tp]', el => go(+el.dataset.tp));
    const v = document.getElementById('tuv'); let x0 = null;
    v.onpointerdown = e => { x0 = e.clientX; }; v.onpointerup = e => { if(x0 == null) return; let dx = e.clientX - x0; if(innerHeight > innerWidth) dx = 0; x0 = null; if(Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); };
  };
  render();
}
// Safari : guide à la 1re visite + bouton « ? »
if(SCREENS.safari){
  const _sfV18 = SCREENS.safari;
  SCREENS.safari = function(){
    const args = arguments;
    if(!guideSeen('safari')) return showGuide('safari', () => SCREENS.safari.apply(this, args));
    const r = _sfV18.apply(this, args);
    const h = document.querySelector('#menu h1');
    if(h && !document.getElementById('sfq')){ h.insertAdjacentHTML('beforeend', ` <button class='btn2 sm' id='sfq' title='Guide'>?</button>`); document.getElementById('sfq').onclick = () => showGuide('safari', () => SCREENS.safari.apply(this, args)); }
    return r;
  };
}
// Objets tenus : guide la 1re fois qu'on ouvre le choix d'objet (géré dans teamEditorHook) + depuis le Tutoriel
if(typeof TUTO !== 'undefined'){
  const _stV18 = showTutorial;
  showTutorial = function(back, first, page){
    _stV18(back, first, page);
    if(first) return;
    const row = document.querySelector('.tuto .row');
    if(row && !document.getElementById('tug')) {
      row.insertAdjacentHTML('afterend', `<div class='row tug' id='tug'>${Object.entries(GUIDES).map(([k, g]) => `<button class='btn2 sm' data-gd='${k}'>${g.title}</button>`).join('')}</div>`);
      bindAll('[data-gd]', el => showGuide(el.dataset.gd, () => showTutorial(back)));
    }
  };
}

// ---------- 7. solo : nombre d'adversaires et équipe type ----------
let SOLO_STAGE = null;
const _startSoloV18 = startSolo;
startSolo = function(team, stageIndex){ SOLO_STAGE = stageIndex; try{ return _startSoloV18(team, stageIndex); } finally { SOLO_STAGE = null; } };
const _enemyTeamV18 = enemyTeam;
enemyTeam = function(size){
  if(!SOLO_CTX || SOLO_STAGE == null) return _enemyTeamV18(size);
  const st = SOLO_STAGE, ch = chapterOf(st), C = CHAPTERS[ch], ok = id => SPR[id] && MV[id];
  const n = (typeof SOLO_COUNT !== 'undefined' && SOLO_COUNT[st]) || SOLO_CTX.size;
  const fixed = ((C.teams || [])[st - ch*CH_SIZE] || []).filter(ok), keep = n >= 3 && n > 2 && SOLO_CTX.size === 3 ? n - 1 : n;
  const out = fixed.slice(0, Math.min(keep, n));
  let pool = chapterPool(ch).filter(id => !out.includes(id)); if(!pool.length) pool = chapterPool(ch);
  pool = pool.sort(() => Math.random() - .5);
  while(out.length < n){ out.push(pool.length ? pool.pop() : out[out.length % Math.max(1, out.length)]); }
  if(typeof PENDING_BOSS !== 'undefined' && PENDING_BOSS && BOSSES.includes(PENDING_BOSS)) out[n - 1] = PENDING_BOSS;
  return out;
};

// ---------- 8. safari : pas de grand K.O. pour la meute ----------
onKO = (prev => function(o, en){
  const c = G && G.cfg;
  if(en && c && c.mode === 'safari' && !(o.t === c.target && (!G.rm || !c.rooms || G.rm.ri >= c.rooms.length - 1))){
    dmgTxt(o.x, o.y - 40, 'K.O.', '#ffd23f'); G.shake = Math.max(G.shake, .25); flashScreen(.08);
    burst(14, (i, q) => vp({ x:o.x, y:o.y, vx:Math.cos(q)*R_(60, 180), vy:Math.sin(q)*R_(60, 180), life:R_(.3, .6), s:R_(4, 7), s1:2, kind:'star', col:'#fff2a0', rot:q }));
    if(typeof playSfx === 'function') playSfx('hit:normal');
    return;
  }
  return prev(o, en);
})(onKO);

document.head.insertAdjacentHTML('beforeend', `<style>
.tdrag{position:fixed;z-index:99999;pointer-events:none;width:64px;height:64px;transform:translate(-50%,-65%) scale(1.2);filter:drop-shadow(0 4px 6px #000c)}
.tdrag img{width:100%;height:100%;object-fit:contain;image-rendering:pixelated}
body.tdrag-out .tdrag{opacity:.55;filter:grayscale(1) drop-shadow(0 4px 6px #000c)}
.slot.dropon{outline:2px solid #ffe070;box-shadow:0 0 12px #ffe07088;transform:scale(1.08)}
.slot.filled{cursor:grab;touch-action:none}.dragsrc{opacity:.45}
.grid2c [data-add],.slot{-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.tehint{font-size:8px!important;margin:0;opacity:.8}
.onl > .edit.trade{flex:1 1 auto;min-height:0;max-height:none;align-items:stretch}
.edit.trade .left,.edit.trade .right{min-height:0;max-height:none;overflow-y:auto;-webkit-overflow-scrolling:touch;touch-action:pan-y}
.edit.trade .igrid{flex:none}.onl > .row{flex:none}
.rninv{display:flex;flex-wrap:wrap;gap:4px;align-items:center;justify-content:center;font-size:10px}.rninv i{opacity:.7}
.tug{margin-top:2px}.tug .btn2{font-size:10px}
</style>`);
