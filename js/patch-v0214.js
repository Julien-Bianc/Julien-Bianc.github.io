// ============================================================
//  patch-v0214.js — correctif (rapport de test v0.21.3)
//    1. Argent gagné réduit dans tous les modes (Solo, Défi Mewtwo, Raids, Concours ; Tour : js/tower.js)
//    2. FRAGMENTS DE CARTE : un doublon → 1 fragment de sa rareté ; 5 fragments → la carte de ton choix (même rareté)
//    3. Concours Pokémon : nouvel écran d'accueil
//    4. Safari : quand toute la meute est K.O., ton Pokémon n'est plus tourné vers elle et la caméra le suit
//    5. Menu : « Magasin » ressort du groupe Collection ; nouvelle entrée « Profil »
//    6. PROFIL DE DRESSEUR (visible en ligne) : avatar, titre, 3 badges et 3 cartes favoris, statistiques
//  Base de données (une seule fois) : supabase/profil.sql
// ============================================================
const MONEY_RATE = .65;          // tous les gains des modes de jeu ×0,65

// ---------------------------------------------------------------- 1. argent
(() => {
  const k = v => Math.max(5, Math.round(v*MONEY_RATE/5)*5);
  ECONOMY.soloWin = ECONOMY.soloWin.map(k); ECONOMY.firstClear = ECONOMY.firstClear.map(k);
  CONTEST_RANKS.forEach(r => r.prize = k(r.prize));
  new Set(BOSS_DIFFS.concat(typeof SECRET_DIFF !== 'undefined' ? [SECRET_DIFF] : [])).forEach(D => D.coins = k(D.coins));
  [RAID.reward].concat(Object.values(RAID_STARS).map(S => S.reward)).forEach(R => { if(R){ if(R.solo) R.solo = k(R.solo); if(R.multi) R.multi = k(R.multi); } });
})();

// ---------------------------------------------------------------- 2. fragments de carte
const FRAG_N = 5, FRAG_R = ['C', 'PC', 'R'];
const Frag = {
  all(){ const d = Save.load(); if(!d.frags) d.frags = { C:0, PC:0, R:0 }; return d.frags; },
  n(r){ return this.all()[r] || 0; },
  ok(it){ return it && it.kind === 'card' && !it.legend && !it.limited && FRAG_R.includes(it.r) && /^card:[^:]+:(C|PC|R)$/.test(it.id); },
  make(id, n){ const it = ITEM[id]; n = Math.min(n || 1, Save.sellable(id)); if(!this.ok(it) || n < 1) return 0; Save.inv()[id] -= n; this.all()[it.r] += n; Save.save(); return n; },
  craft(id){ const it = ITEM[id]; if(!this.ok(it) || this.n(it.r) < FRAG_N) return false; this.all()[it.r] -= FRAG_N; Save.addItem(id, 1); Save.save(); return true; },
  dupes(r){ return Object.keys(Save.inv()).filter(id => ITEM[id] && this.ok(ITEM[id]) && ITEM[id].r === r && Save.sellable(id) > 0); }
};
const fragImgC = {};
function fragImg(r){
  if(fragImgC[r]) return fragImgC[r];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'), col = RAR[r].col;
  bdBGem(x, bdPoly([[18, 8], [44, 4], [52, 30], [40, 34], [46, 58], [14, 54], [22, 32]]), col);
  x.fillStyle = 'rgba(255,255,255,.35)'; x.beginPath(); x.moveTo(22, 12); x.lineTo(40, 9); x.lineTo(30, 26); x.closePath(); x.fill();
  x.strokeStyle = 'rgba(0,0,0,.35)'; x.lineWidth = 1.5; x.beginPath(); x.moveTo(22, 32); x.lineTo(36, 36); x.lineTo(40, 34); x.stroke();
  x.font = 'bold 13px monospace'; x.textAlign = 'center'; x.fillStyle = '#fff'; x.fillText(SYM[r] || r, 32, 50);
  return fragImgC[r] = c.toDataURL();
}
const fragTag = (r, n) => `<span class='frg' style='--fc:${RAR[r].col}'><img src='${fragImg(r)}'><b>${n}</b></span>`;
// dans le classeur : boutons « fragment » sur une carte en double, « créer » sur une carte manquante
binderBody = (prev => function(o, inv){
  let h = prev(o, inv);
  const it = o.sel && ITEM[o.sel], bar = `<div class='frgbar'>${FRAG_R.map(r => fragTag(r, Frag.n(r))).join('')}<button class='btn2 sm' id='frgw'>Atelier</button></div>`;
  h = h.replace(`<div class='scroll right'>`, `<div class='scroll right'>${bar}`);
  if(!it || !Frag.ok(it)) return h;
  const s = Save.sellable(it.id);
  if(inv[it.id] > 0 && s > 0) h = h.replace(/(<div class='scroll right'>[\s\S]*)(<\/div><\/div>\s*)$/, `$1<div class='row left'><button class='btn2' id='frg1'>→ 1 fragment ${RAR[it.r].label.toLowerCase()}</button>${s > 1 ? `<button class='btn2' id='frga'>→ ${s} fragments</button>` : ''}</div>$2`);
  if(!(inv[it.id] > 0)) h = h.replace(/(<div class='scroll right'>[\s\S]*)(<\/div><\/div>\s*)$/, `$1<div class='row left'><button class='btn' id='frgc' ${Frag.n(it.r) >= FRAG_N ? '' : 'disabled'}>Créer avec ${FRAG_N} fragments (${Frag.n(it.r)}/${FRAG_N})</button></div>$2`);
  return h;
})(binderBody);
showInventory = (prev => function(o){
  prev(o);
  const oo = Object.assign({ tab:'items', filter:'all' }, o || {}), it = oo.sel && ITEM[oo.sel], re = m => { if(m) Notif.toast(m, '#ffd23f'); showInventory(oo); };
  const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
  on('frgw', () => showFragments(null, () => showInventory(oo)));
  on('frg1', () => { if(Frag.make(it.id, 1)){ if(typeof coinSfx === 'function') coinSfx(); re('+1 fragment ' + RAR[it.r].label.toLowerCase()); } });
  on('frga', () => { const n = Frag.make(it.id, Save.sellable(it.id)); if(n) re(`+${n} fragments ${RAR[it.r].label.toLowerCase()}s`); });
  on('frgc', () => { if(Frag.craft(it.id)){ if(typeof playSfx === 'function') playSfx('victory'); re(`${it.name} créée !`); } });
})(showInventory);
// atelier : convertir tous les doublons d'une rareté, créer une carte au choix
function showFragments(r, back){
  r = r || FRAG_R.find(x => Frag.n(x) >= FRAG_N) || 'C';
  const inv = Save.inv(), cards = ORDER.map(pid => ITEM[`card:${pid}:${r}`]).filter(Boolean).sort((a, b) => (inv[a.id] > 0) - (inv[b.id] > 0));
  const n = Frag.n(r), du = Frag.dupes(r), nd = du.reduce((a, id) => a + Save.sellable(id), 0);
  menu(`<div class='hd'><h1>Atelier de fragments</h1>${walletHtml()}</div>
    <div class='row'>${FRAG_R.map(x => `<button class='btn2 ${x === r ? 'on' : ''}' data-fr='${x}'>${fragTag(x, Frag.n(x))} ${RAR[x].label}</button>`).join('')}</div>
    <p class='hint'>1 carte en double = 1 fragment de sa rareté (tu gardes toujours 1 exemplaire). ${FRAG_N} fragments = la carte <b>${RAR[r].label.toLowerCase()}</b> de ton choix, même une carte manquante. Pas pour les cartes légendaires ni limitées.</p>
    <div class='row'><button class='btn2' id='frall' ${nd ? '' : 'disabled'}>Transformer tous les doublons ${RAR[r].label.toLowerCase()}s (+${nd})</button></div>
    <div class='scroll'><div class='frgrid'>${cards.map(it => `<button class='frc ${inv[it.id] > 0 ? '' : 'miss'}' data-fc='${it.id}' ${n >= FRAG_N ? '' : 'disabled'}>${inv[it.id] > 0 ? cardHtml(it, .36) : `<span class='pk miss' style='${rarCss(r)}'><img src='${cardArt(it.poke, r)}'><span class='sym'>${SYM[r]}</span></span>`}<small>${inv[it.id] > 0 ? '×' + inv[it.id] : 'manquante'}</small></button>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-fr]', b => showFragments(b.dataset.fr, back));
  bindAll('[data-fc]', b => { const it = ITEM[b.dataset.fc]; gameConfirm('Créer cette carte ?', `${esc(it.name)} — ${FRAG_N} fragments ${RAR[r].label.toLowerCase()}s`, 'Créer', () => { if(Frag.craft(it.id)){ if(typeof playSfx === 'function') playSfx('victory'); Notif.toast(`${it.name} créée !`, '#ffd23f'); } showFragments(r, back); }); });
  document.getElementById('frall').onclick = () => { let k = 0; du.forEach(id => k += Frag.make(id, Save.sellable(id))); Notif.toast(`+${k} fragments`, '#ffd23f'); showFragments(r, back); };
  document.getElementById('back').onclick = back || (() => showInventory({ tab:'binder' }));
}

// ---------------------------------------------------------------- 3. concours : écran d'accueil
function cnIcon(kind){
  const k = 'cn' + kind; if(fragImgC[k]) return fragImgC[k];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  if(kind === 'pot'){ bdBGem(x, bdP2(p => { p.moveTo(8, 26); p.lineTo(56, 26); p.lineTo(52, 54); p.bezierCurveTo(50, 60, 14, 60, 12, 54); p.closePath(); }), '#e8a850'); bdBGem(x, bdRect(4, 22, 56, 8, 3), '#c87810');
    x.fillStyle = '#fff0d8'; x.beginPath(); x.ellipse(32, 26, 22, 4, 0, 0, 6.2832); x.fill(); x.strokeStyle = '#a8703a'; x.lineWidth = 4; x.lineCap = 'round'; x.beginPath(); x.moveTo(40, 26); x.lineTo(54, 4); x.stroke();
    x.fillStyle = 'rgba(255,255,255,.7)'; [[22, 16, 3], [30, 10, 2], [38, 15, 2.5]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, 6.2832); x.fill(); }); }
  else if(kind === 'mons'){ const b = bdDisc(22, 30, 34); bdBGem(x, b, '#f4f4f4'); x.save(); x.clip(b); x.fillStyle = '#ff7ac8'; x.fillRect(0, 0, 64, 33); x.fillStyle = '#1a1020'; x.fillRect(0, 31, 64, 5); x.restore(); bdBGem(x, bdDisc(6, 30, 34), '#fff');
    bdBGem(x, bdP2(p => { p.moveTo(50, 22); p.bezierCurveTo(38, 14, 40, 2, 50, 8); p.bezierCurveTo(60, 2, 62, 14, 50, 22); p.closePath(); }), '#ff4a7a'); }
  else if(kind === 'market'){ bdBGem(x, bdP2(p => p.ellipse(32, 38, 20, 18, 0, 0, 6.2832)), '#e8402c'); x.fillStyle = '#3ab84a'; x.beginPath(); x.ellipse(26, 18, 10, 5, -.5, 0, 6.2832); x.fill(); x.beginPath(); x.ellipse(40, 17, 9, 4.5, .5, 0, 6.2832); x.fill(); bdShine(x, 24, 32, 4); }
  return fragImgC[k] = c.toDataURL();
}
function showContest(){
  const c = Con.d(), won = Object.keys(c.wins).length, tot = CONTEST_STATS.length*CONTEST_RANKS.length, ber = Object.values(c.berries).reduce((a, b) => a + b, 0);
  const next = (() => { for(const r of CONTEST_RANKS) for(const s of CONTEST_STATS) if(Con.unlocked(s.id, r.id) && !c.wins[s.id + ':' + r.id]) return [s, r]; return null; })();
  menu(`<div class='hd'><h1>Concours Pokémon</h1>${walletHtml()}</div>
    <div class='cnhub'>
      <button class='cnmain' id='cp'><img class='cnrb' src='${next ? ribbonImg(next[0].id, next[1].id) : ribbonImg('cool', 3)}'><span><b>Participer</b><small>Style · Rythme · Imitation · Prestations</small>
        <em>${next ? `Prochain ruban : <i>${esc(ribbonName(next[0].id, next[1].id))}</i>` : 'Tous les rubans sont gagnés !'}</em></span><i class='cnplay'>▶</i></button>
      <div class='cnprog'>${CONTEST_STATS.map(s => `<div class='cnrow'><span style='color:${s.col}'>${s.name}</span>${CONTEST_RANKS.map(r => { const w = c.wins[s.id + ':' + r.id], ok = Con.unlocked(s.id, r.id); return `<img class='cnpip ${w ? 'won' : ok ? 'open' : 'lock'}' src='${ribbonImg(s.id, r.id, !w)}' title='${esc(ribbonName(s.id, r.id))}'>`; }).join('')}</div>`).join('')}
        <p><b>${won}</b>/${tot} rubans</p></div>
      <div class='cngrid'>
        <button class='cntile' id='cm'><img src='${cnIcon('mons')}'><b>Mes Pokémon</b><small>Stats · capsule · poffins</small></button>
        <button class='cntile' id='cc'><img src='${cnIcon('pot')}'><b>Cuisine à Poffin</b><small>${ber} baies · ${c.poffins.length} poffins</small></button>
        <button class='cntile' id='cb'><img src='${cnIcon('market')}'><b>Marché aux baies</b><small>Achète des baies</small></button>
        <button class='cntile' id='cr'><img src='${ribbonImg('cute', 2)}'><b>Rubans</b><small>${won}/${tot} gagnés</small></button>
      </div>
    </div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  const on = (id, fn) => { document.getElementById(id).onclick = fn; };
  on('cp', () => showContestPlay()); on('cm', () => showContestMons()); on('cc', () => showCook()); on('cb', () => showMarket()); on('cr', () => showRibbons()); on('back', showMain);
}
SCREENS.contest = function(){ if(typeof CM !== 'undefined'){ CM.on = true; CM.fresh = true; } showContest(); };

// ---------------------------------------------------------------- 4. safari : meute K.O. → plus de verrouillage
const sfCleared = () => G && G.cfg && G.cfg.rooms && G.rm && G.e && (G.e.hp <= 0 || G.e.hid) && !(G.rm.adds || []).some(a => a.hp > 0);
updCam = (prev => function(p, e){ if(sfCleared() && p === G.p) return prev(p, { x:p.x, y:p.y }); return prev(p, e); })(updCam);
animOf = (prev => function(o, tx, ty, en){
  if(G && o === G.p && sfCleared()){
    const vx = (jx || 0) + (typeof kx !== 'undefined' ? kx : 0), vy = (jy || 0) + (typeof ky !== 'undefined' ? ky : 0);
    if(Math.hypot(vx, vy) > .1){ o._fx = vx; o._fy = vy; }
    if(o._fx != null){ tx = o.x + o._fx*100; ty = o.y + o._fy*100; }
  } else if(o && o._fx != null && !(G && G.cfg && G.cfg.rooms)) o._fx = o._fy = null;
  return prev(o, tx, ty, en);
})(animOf);

// ---------------------------------------------------------------- 6. profil de dresseur
const TITLES = [
  { id:'debutant',  name:'Dresseur débutant' },
  { id:'explo',     name:'Explorateur du Safari', b:'safari1' },
  { id:'raider',    name:'Raider',                b:'raid1' },
  { id:'psy',       name:'Rival de Mewtwo',       b:'mewtwo' },
  { id:'champsolo', name:'Champion Solo',         b:'solo3' },
  { id:'hexa',      name:'Maître de l\'Hexa',     b:'solo6' },
  { id:'grimpeur',  name:'Grimpeur de la Tour',   b:'tower25' },
  { id:'sommet',    name:'Seigneur de la Tour',   b:'tower50' },
  { id:'titans',    name:'Chasseur de Titans',    b:'safariT' },
  { id:'tombeur',   name:'Tombeur de Titans',     b:'raid5' },
  { id:'concours',  name:'Maître Concours',       b:'contestM' },
  { id:'star',      name:'Star des Concours',     b:'crown' },
  { id:'fleau',     name:'Fléau de Mewtwo',       b:'mewtwo3' },
  { id:'legende',   name:'Légende vivante',       b:'secret' },
  { id:'shiny',     name:'Chasseur de Shiny',     b:'shiny5' },
  { id:'collec',    name:'Collectionneur',        b:'collectAll' },
  { id:'duel',      name:'Duelliste',             b:'online10' },
  { id:'champion',  name:'Champion PokéClash',    b:'champion' }
];
const titleOk = T => !T.b || Badges.has(T.b);
const Prof = {
  d(){ const d = Save.load(); if(!d.prof) d.prof = { av:null, title:'debutant', badges:[], cards:[] }; return d.prof; },
  stats(){
    const inv = Save.inv(), d = Save.load(), con = typeof Con !== 'undefined' ? Object.keys(Con.d().wins).length : 0;
    return { owned:ORDER.filter(id => Owned.list().includes(id)).length, shiny:typeof Shiny !== 'undefined' ? Object.keys(Shiny.all()).length : 0,
      cards:Object.keys(inv).filter(id => inv[id] > 0 && ITEM[id] && ITEM[id].kind === 'card').length, badges:BADGES.filter(B => Badges.has(B.id)).length,
      solo3:Save.cleared(3), solo6:Save.cleared(6), mw:['normal', 'difficile', 'extreme', 'secret'].filter(x => BossWins.has('mewtwo', x)).length,
      raids:d.raidWins || 0, tower:d.towerBest || 0, contests:con, crates:Save.opened() };
  },
  card(){ const P = this.d(); return { v:1, av:P.av || Save.load().starter || ORDER[0], title:P.title, badges:P.badges.filter(id => Badges.has(id)).slice(0, 3), cards:P.cards.filter(id => Save.itemCount(id) > 0).slice(0, 3), st:this.stats() }; },
  async publish(){
    if(typeof Online === 'undefined' || !Online.user) return;
    const j = JSON.stringify(this.card()), d = Save.load(); if(d.profSent === j) return;
    try{ await Online.rpc('set_profile', { p_card:JSON.parse(j) }); d.profSent = j; Save.save(); }catch(e){ console.warn('profil', e.message); }
  },
  async fetch(q){
    let r = Online.sb.from('profiles').select('id,pseudo,wins,losses,card');
    r = q.id ? r.eq('id', q.id) : r.ilike('pseudo', q.pseudo);
    const { data, error } = await r.limit(1).maybeSingle(); if(error) throw new Error(error.message); return data;
  }
};
const PST = [['owned', 'Pokémon', s => `${s.owned}/${ORDER.length}`], ['shiny', 'Shiny'], ['cards', 'Cartes'], ['badges', 'Badges', s => `${s.badges}/${BADGES.length}`],
  ['solo3', 'Solo 3v3', s => `${s.solo3}/${STAGES.length}`], ['solo6', 'Solo 6v6', s => `${s.solo6}/${STAGES.length}`], ['mw', 'Mewtwo battu', s => `${s.mw}/4`],
  ['raids', 'Raids gagnés'], ['tower', 'Record Tour', s => 'étage ' + s.tower], ['contests', 'Rubans', s => `${s.contests}/20`], ['crates', 'Caisses ouvertes']];
function profHtml(C, who, edit){
  const T = TITLES.find(t => t.id === C.title) || TITLES[0], st = C.st || {}, slot = (k, i, inner) => edit ? `<button class='pfslot' data-${k}='${i}'>${inner}</button>` : `<span class='pfslot'>${inner}</span>`;
  return `<div class='pfc'>
    <div class='pfid'>${edit ? `<button class='pfav' id='pfav' title='Changer d\'avatar'>` : `<span class='pfav'>`}${ORDER.includes(C.av) ? thumb(C.av) : ''}${edit ? '</button>' : '</span>'}
      <div><b class='pfn'>${esc(who.pseudo || 'Toi')}</b>${edit ? `<button class='pft' id='pft'>${esc(T.name)} ✎</button>` : `<span class='pft'>${esc(T.name)}</span>`}
      ${who.wins != null ? `<small>En ligne : ${who.wins || 0} V · ${who.losses || 0} D</small>` : ''}</div></div>
    <p class='pfh'>Badges favoris</p><div class='pfrow'>${[0, 1, 2].map(i => slot('pfb', i, C.badges[i] && BADGES.find(B => B.id === C.badges[i]) ? `<img src='${badgeImg(C.badges[i])}' title='${esc(BADGES.find(B => B.id === C.badges[i]).name)}'>` : '<em>+</em>')).join('')}</div>
    <p class='pfh'>Cartes favorites</p><div class='pfrow cards'>${[0, 1, 2].map(i => slot('pfk', i, C.cards[i] && ITEM[C.cards[i]] ? cardHtml(ITEM[C.cards[i]], .42) : '<em>+</em>')).join('')}</div>
    <p class='pfh'>Statistiques</p><div class='pfst'>${PST.map(([k, n, f]) => `<div><b>${f ? f(st) : (st[k] || 0)}</b><small>${n}</small></div>`).join('')}</div>
  </div>`;
}
function showProfile(msg){
  const P = Prof.d(), C = Prof.card(), who = Online && Online.user ? Online.user : { pseudo:'Toi' };
  menu(`<div class='hd'><h1>Profil de dresseur</h1>${walletHtml()}</div>
    <div class='edit pfv'><div class='scroll left'>${profHtml(C, who, true)}</div>
      <div class='scroll right'><p class='hint'>${Online && Online.user ? 'Ton profil est visible par les autres joueurs (amis, classement de la Tour).' : 'Connecte-toi dans <b>Multijoueur</b> pour que les autres joueurs voient ton profil.'}</p>
        ${msg ? `<p class='ok'>${esc(msg)}</p>` : ''}<p class='hint'>Touche ton avatar, ton titre, un badge ou une carte pour les changer. Les titres se débloquent avec les badges.</p>
        ${Online && Online.user ? `<div class='row addf'><input id='pfq' maxlength='16' placeholder='Pseudo d\'un dresseur' autocomplete='off'><button class='btn2' id='pfgo'>Voir</button></div>` : ''}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  const save = m => { Save.save(); Prof.publish(); showProfile(m); };
  document.getElementById('pfav').onclick = () => pfPick('Choisis ton avatar', myMonsAll().map(id => ({ id, html:thumb(id), label:NAME[id] })), id => { P.av = id; save(); });
  document.getElementById('pft').onclick = () => pfPick('Choisis ton titre', TITLES.map(T => ({ id:T.id, html:`<b>${esc(T.name)}</b>`, label:titleOk(T) ? '' : '🔒 ' + (BADGES.find(B => B.id === T.b) || {}).name, lock:!titleOk(T) })), id => { P.title = id; save(); }, 'pftl');
  bindAll('[data-pfb]', b => pfPick('Badge favori', [{ id:'', html:'<em>✕</em>', label:'Vide' }].concat(BADGES.filter(B => Badges.has(B.id)).map(B => ({ id:B.id, html:`<img src='${badgeImg(B.id)}'>`, label:B.name }))), id => { P.badges[+b.dataset.pfb] = id || null; P.badges = P.badges.slice(0, 3); save(); }));
  bindAll('[data-pfk]', b => { const inv = Save.inv(); pfPick('Carte favorite', [{ id:'', html:'<em>✕</em>', label:'Vide' }].concat(Object.keys(inv).filter(id => inv[id] > 0 && ITEM[id] && ITEM[id].kind === 'card').sort((a, c) => byRarity(ITEM[a], ITEM[c])).map(id => ({ id, html:cardHtml(ITEM[id], .32), label:'' }))), id => { P.cards[+b.dataset.pfk] = id || null; P.cards = P.cards.slice(0, 3); save(); }, 'pfcards'); });
  const go = document.getElementById('pfgo'); if(go){ const q = document.getElementById('pfq'); go.onclick = () => q.value.trim() && showTrainer({ pseudo:q.value.trim() }, showProfile); q.onkeydown = e => { if(e.key === 'Enter') go.onclick(); }; }
  document.getElementById('back').onclick = showMain;
}
const myMonsAll = () => ORDER.filter(id => Owned.has(id));
function pfPick(title, L, fn, cls){
  menu(`<div class='hd'><h1>${title}</h1></div><div class='scroll'><div class='pfpick ${cls || ''}'>${L.map(o => `<button class='pfo ${o.lock ? 'lock' : ''}' data-po='${o.id}' ${o.lock ? 'disabled' : ''}>${o.html}${o.label ? `<small>${esc(o.label)}</small>` : ''}</button>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-po]', b => fn(b.dataset.po)); document.getElementById('back').onclick = () => showProfile();
}
async function showTrainer(q, back){
  menu(`<div class='hd'><h1>Profil de dresseur</h1></div><p class='hint'>Chargement…</p><div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('back').onclick = back || showMain;
  let row = null, err = '';
  try{ row = await Prof.fetch(q); }catch(e){ err = /card/.test(e.message) ? 'Les profils en ligne ne sont pas encore installés sur le serveur.' : 'Profil indisponible pour l\'instant.'; }
  if(!document.querySelector('#menu #back')) return;
  if(!row){ menu(`<div class='hd'><h1>Profil de dresseur</h1></div><p>${err || `Aucun dresseur « ${esc(q.pseudo || '')} ».`}</p><div class='row'><button class='btn2' id='back'>Retour</button></div>`); document.getElementById('back').onclick = back || showMain; return; }
  const C = row.card || { title:'debutant', badges:[], cards:[], st:{} };
  menu(`<div class='hd'><h1>${esc(row.pseudo)}</h1></div><div class='pfone'>${profHtml({ badges:[], cards:[], ...C }, row, false)}</div>${row.card ? '' : `<p class='hint'>Ce dresseur n'a pas encore publié son profil.</p>`}
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('back').onclick = back || showMain;
}
SCREENS.profile = () => showProfile();
if(!MAIN_MENU.some(m => m.id === 'profile')){ const i = MAIN_MENU.findIndex(m => m.id === 'badges'); MAIN_MENU.splice(i + 1, 0, { id:'profile', label:'Profil', desc:'Ton profil de dresseur : avatar, titre, favoris, statistiques', screen:'profile' }); }
// menu : Magasin seul, Profil dans Collection
(() => { const g = MM_GROUPS.find(x => x.id === 'g-coll'); if(g){ g.kids = ['teams', 'inventory', 'badges', 'profile']; g.desc = 'Équipes, inventaire, badges et profil'; }
  if(!MM_GROUPS.some(x => x.id === 'shop')) MM_GROUPS.splice(MM_GROUPS.findIndex(x => x.id === 'g-coll'), 0, { id:'shop' }); })();
// les autres joueurs : bouton « Profil » sur chaque ami, pseudo cliquable dans le classement de la Tour
fillFriends = (prev => function(){
  prev();
  document.querySelectorAll('#flist [data-fc]').forEach(b => b.insertAdjacentHTML('beforebegin', `<button class='btn2 sm' data-pfu='${b.dataset.fc}'>Profil</button>`));
  bindAll('[data-pfu]', b => showTrainer({ id:b.dataset.pfu }, () => showOnline('friends')));
})(fillFriends);
twBoard = (prev => async function(){
  await prev();
  document.querySelectorAll('#twlb li b').forEach(b => { b.style.cursor = 'pointer'; b.title = 'Voir le profil'; b.onclick = () => showTrainer({ pseudo:b.textContent }, showTower); });
})(twBoard);
// publication automatique (connexion, retour au menu)
if(typeof Online !== 'undefined' && Online.on) Online.on('login', () => setTimeout(() => Prof.publish(), 1500));
showMain = (prev => function(){ const r = prev.apply(this, arguments); setTimeout(() => Prof.publish(), 2000); return r; })(showMain);

document.head.insertAdjacentHTML('beforeend', `<style>
.frgbar{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin:0 0 6px;padding:4px 6px;border-radius:8px;background:rgba(0,0,0,.25)}
.frg{display:inline-flex;align-items:center;gap:2px;font-size:12px;color:var(--fc)}.frg img{width:22px;height:22px}.frg b{color:#fff}
.frgrid{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.frc{display:flex;flex-direction:column;align-items:center;gap:2px;padding:4px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(0,0,0,.25);color:inherit;cursor:pointer;font-family:var(--font)}
.frc:disabled{opacity:.55;cursor:default}.frc small{font-size:9px}.frc.miss{border-color:#ffd23f}.frc .pk{width:60px;height:84px;display:flex;align-items:center;justify-content:center;position:relative}.frc .pk img{width:48px;height:48px;image-rendering:pixelated;filter:brightness(0) opacity(.5)}
.cnhub{display:grid;grid-template-columns:1fr 1fr;gap:8px;max-width:640px;width:100%}
.cnmain{grid-column:1/-1;display:flex;align-items:center;gap:12px;padding:10px 14px;border-radius:14px;border:2px solid #ffd23f;background:linear-gradient(135deg,#ff6ab0 0%,#c03a8a 45%,#5a1a6a 100%);box-shadow:0 4px 0 #3a0a3a,inset 0 2px 0 rgba(255,255,255,.35),0 0 18px rgba(255,120,200,.35);color:#fff;cursor:pointer;text-align:left;font-family:var(--font)}
.cnmain:hover{filter:brightness(1.08);transform:translateY(-1px)}.cnmain .cnrb{width:52px;height:50px;image-rendering:pixelated;filter:drop-shadow(0 2px 2px rgba(0,0,0,.5))}
.cnmain span{display:flex;flex-direction:column;flex:1}.cnmain b{font-size:22px;color:#fff6c8;text-shadow:2px 2px 0 #5a0a3a}.cnmain small{font-size:11px;opacity:.9}.cnmain em{font-style:normal;font-size:11px;margin-top:3px;color:#ffe9a0}.cnmain em i{font-style:normal;font-weight:700;color:#fff}
.cnplay{font-style:normal;font-size:20px;color:#ffd23f;text-shadow:0 0 8px #ffd23f}
.cnprog{grid-row:span 2;padding:8px;border-radius:12px;border:1px solid rgba(255,210,63,.4);background:rgba(30,8,36,.72)}.cnprog p{margin:4px 0 0;font-size:11px;text-align:center}.cnprog p b{color:#ffd23f}
.cnrow{display:flex;align-items:center;gap:3px;margin:2px 0}.cnrow span{flex:1;font-size:11px;font-weight:700;text-align:left}.cnpip{width:26px;height:25px;image-rendering:pixelated}.cnpip.lock{opacity:.25}.cnpip.open{opacity:.65}
.cngrid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.cntile{display:flex;flex-direction:column;align-items:center;gap:1px;padding:7px 4px;border-radius:12px;border:2px solid #8a3a6a;background:linear-gradient(180deg,rgba(90,26,90,.88),rgba(40,10,44,.9));box-shadow:0 3px 0 #2a0a2a;color:#fff;cursor:pointer;font-family:var(--font)}
.cntile:hover{border-color:#ff8ad0}.cntile img{width:38px;height:38px;image-rendering:pixelated}.cntile b{font-size:12px;color:#ffe9a0}.cntile small{font-size:9px;opacity:.85}
.pfv .left{flex:0 0 60%}.pfc{padding:8px;border-radius:14px;border:2px solid #8a5a20;background:linear-gradient(180deg,rgba(58,26,80,.9),rgba(20,10,30,.9));box-shadow:inset 0 0 0 1px #14081e}
.pfone{max-width:520px;width:100%}
.pfid{display:flex;align-items:center;gap:10px;text-align:left}.pfav{width:70px;height:70px;border-radius:50%;border:3px solid #ffd23f;background:radial-gradient(circle at 50% 40%,#7a4ab0,#2a1040);display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 0 12px rgba(255,210,63,.4)}
.pfav img{width:54px;height:54px;image-rendering:pixelated}.pfid div{display:flex;flex-direction:column;align-items:flex-start}.pfn{font-size:18px;color:#fff6c8}
.pft{font-family:var(--font);font-size:11px;color:#ffd23f;background:none;border:none;padding:0;cursor:pointer;text-align:left}.pfid small{font-size:10px;color:var(--txt2,#c9bcd8)}
.pfh{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--txt2,#c9bcd8);margin:8px 0 3px;text-align:left}
.pfrow{display:flex;gap:6px}.pfslot{flex:1;min-height:50px;border-radius:10px;border:1px dashed rgba(255,210,63,.45);background:rgba(0,0,0,.25);display:flex;align-items:center;justify-content:center;padding:3px;cursor:pointer;color:#ffe27a}
span.pfslot{cursor:default}.pfslot img{width:44px;height:44px}.pfslot em{font-style:normal;font-size:18px;opacity:.6}.pfrow.cards .pfslot{min-height:100px}
.pfst{display:grid;grid-template-columns:repeat(4,1fr);gap:4px}.pfst div{display:flex;flex-direction:column;align-items:center;padding:3px;border-radius:7px;background:rgba(255,255,255,.06)}.pfst b{font-size:12px;color:#fff3c8}.pfst small{font-size:8px;color:var(--txt2,#c9bcd8)}
.pfpick{display:flex;flex-wrap:wrap;gap:6px;justify-content:center}.pfo{display:flex;flex-direction:column;align-items:center;gap:2px;min-width:70px;padding:5px;border-radius:10px;border:2px solid #5a3a24;background:rgba(40,16,56,.9);color:#fff3c8;cursor:pointer;font-family:var(--font)}
.pfo:hover{border-color:#ffd23f}.pfo img{width:42px;height:42px;image-rendering:pixelated}.pfo small{font-size:9px}.pfo.lock{opacity:.45;cursor:default}.pftl .pfo{min-width:150px}.pfo em{font-style:normal;font-size:20px}
</style>`);
