// ============================================================
//  patch-v020.js — v0.20.0 (rapport de test v0.19)
//    1. Raids : 3 TENTATIVES par raid (RAID_TRIES). Un raid réussi, ou perdu 3 fois, ne peut plus être lancé
//       (on peut toujours rejoindre le raid d'un autre joueur, ou payer pour changer de raid)
//    2. Safari : choix de la zone (Grand Départ / Titans) en haut de l'écran Safari
//    3. Musiques : plusieurs morceaux par situation (tirés au hasard) et une musique par mode → data/music.js
//  (fond animé des raids : js/menu-raid.js · Safari des Titans : data/safari.js + data/safari-rooms.js)
// ============================================================
const RAID_TRIES = 3;

// ---------- 1. raids : 3 tentatives ----------
const raidWon = cur => { const d = Save.load().raidDone; return !!(d && cur && d.slot === cur.slot && d.id === cur.id); };
const raidTries = cur => { const t = Save.load().raidTry; return t && cur && t.slot === cur.slot && t.id === cur.id ? t.n : 0; };
const raidOut = cur => !raidWon(cur) && raidTries(cur) >= RAID_TRIES;
raidDone = cur => raidWon(cur) || raidTries(cur) >= RAID_TRIES;
const _showRaidV20 = showRaid;
showRaid = function(sel){
  _showRaidV20(sel);
  const cur = raidCurrent(), n = raidTries(cur);
  if(raidOut(cur)){
    const s = document.getElementById('rsolo'); if(s) s.textContent = '✖ Plus de tentative';
    const p = document.querySelector('.rdone'); if(p){ p.classList.add('rlost'); p.innerHTML = `✖ Tu as perdu ce raid ${RAID_TRIES} fois. Le prochain arrive dans ${mmss2(raidNextIn())} — ou change-le maintenant. Tu peux toujours <b>rejoindre</b> le raid d'un autre joueur.`; }
  } else if(!raidWon(cur)){
    const r = document.querySelector('.raidv .right');
    if(r) r.insertAdjacentHTML('afterbegin', `<p class='rtries'>Tentatives : ${'●'.repeat(RAID_TRIES - n)}${'○'.repeat(n)} <small>(${RAID_TRIES - n}/${RAID_TRIES} restantes)</small></p>`);
  }
};
SCREENS.raid = showRaid;
rnChoose = (prev => function(t, create){
  if(create && raidOut(raidCurrent())){ gameConfirm('Plus de tentative', `Tu as perdu ce raid ${RAID_TRIES} fois. Attends le prochain (ou change-le), ou rejoins celui d'un autre joueur.`, 'Rejoindre', () => prev(t, false)); return; }
  return prev(t, create);
})(rnChoose);
startRaid = (prev => function(team, o){
  o = o || {};
  const cur = raidCurrent();
  if(!o.net && (!o.boss || o.boss === cur.id) && raidDone(cur)){ Notif.toast(raidWon(cur) ? 'Raid déjà battu' : 'Plus de tentative pour ce raid'); return SCREENS.raid(); }
  return prev(team, o);
})(startRaid);
raidEndScreen = (prev => function(win, R){
  const own = G && G.cfg && G.cfg.mode === 'raid' && R && (!R.net || R.host), boss = G && G.cfg && G.cfg.raidBoss, cur = raidCurrent();
  if(own && !win && boss === cur.id){ const d = Save.load(), n = raidTries(cur) + 1; d.raidTry = { slot:cur.slot, id:cur.id, n }; Save.save(); }
  prev(win, R);
  if(win || !own || boss !== cur.id) return;
  const n = raidTries(cur), h = document.querySelector('#menu h1');
  if(h) h.insertAdjacentHTML('afterend', `<p class='rtries'>Tentative ${n}/${RAID_TRIES}${n >= RAID_TRIES ? ' — <b>plus de tentative pour ce raid</b>' : ''}</p>`);
  if(n >= RAID_TRIES) ['rp', 'rsolo2', 'rnew2'].forEach(id => { const b = document.getElementById(id); if(b) b.remove(); });
})(raidEndScreen);
renderMainMM = (prev => function(){
  prev();
  const cur = typeof raidCurrent === 'function' && raidCurrent(), el = document.querySelector('#mmraid small');
  if(cur && el && raidOut(cur)) el.innerHTML = el.innerHTML.replace('✔ battu', '✖ 3 échecs');
})(renderMainMM);

// ---------- 2. safari : choix de la zone ----------
menu = (prev => function(h){
  prev(h);
  if(!h || !h.includes("class='edit sf-ed'") || SAFARI.zones.length < 2) return;
  const t = document.querySelector('#menu h1'); if(!t) return;
  const z = SAFARI.zones.find(x => x.name === t.textContent.trim()) || SAFARI.zones[0];
  // v0.21 : zones verrouillées (Titans : chapitre 1 du Solo terminé) et titre « Safari »
  const locked = x => x.id === 'titans' && typeof raidUnlocked === 'function' && !raidUnlocked();
  if(locked(z)) return showSafari({ zone:SAFARI.zones[0].id });
  t.textContent = 'Safari';
  t.closest('.hd').insertAdjacentHTML('afterend', `<div class='row sfz'>${SAFARI.zones.map(x => `<button class='btn2 sm ${x.id === z.id ? 'on' : ''} ${locked(x) ? 'lk' : ''}' data-sfz='${x.id}' ${locked(x) ? "title='Termine le chapitre 1 du Solo'" : ''}>${locked(x) ? '🔒 ' : ''}${esc(x.name.replace('Safari ', ''))}</button>`).join('')}</div>`);
  bindAll('[data-sfz]', b => { const x = SAFARI.zones.find(q => q.id === b.dataset.sfz); if(locked(x)) return Notif.toast('🔒 Termine le chapitre 1 du Solo pour ouvrir le ' + esc(x.name)); showSafari({ zone:x.id }); });
})(menu);

// ---------- 3. musiques ----------
//  Une clé peut valoir un fichier ou une LISTE de fichiers (un morceau tiré au hasard à chaque fois).
//  Le jeu cherche la clé la plus précise puis remonte : ex. un raid essaie 'raid:tyranocif' → 'raid' → 'boss' → 'battle'.
//  Un fichier absent est sauté (le suivant est essayé), et en dernier recours la petite musique générée est jouée.
const musicKeys = kind => { const out = []; String(kind).split('|').forEach(k => { if(k && !out.includes(k)) out.push(k); }); return out; };
function musicUrls(kind){
  if(typeof MUSIC === 'undefined') return [];
  const urls = [];
  musicKeys(kind).forEach(k => { const v = MUSIC[k]; if(!v) return; const L = (Array.isArray(v) ? v.slice() : [v]).sort(() => Math.random() - .5); L.forEach(u => { if(!urls.includes(u)) urls.push(u); }); });
  return urls;
}
const musicGenBase = kind => { const k = musicKeys(kind).map(x => x.split(':')[0]); return k.includes('menu') ? 'menu' : 'battle'; };
function musicChain(kind, urls, i){
  if(i >= urls.length){ musicGen(musicGenBase(kind)); MU.playing = kind; return; }
  MU.playing = kind;
  const el = new Audio(urls[i]); el.loop = !/^(victory|defeat)/.test(kind); el.preload = 'auto';
  const g = AU.ctx.createGain(); g.gain.value = 0;
  try{ AU.ctx.createMediaElementSource(el).connect(g); g.connect(AU.mu); }catch(e){ return musicChain(kind, urls, i + 1); }
  const c = { el, g, kind }; MU.cur = c;
  const next = () => { if(MU.cur === c){ MU.cur = null; try{ g.disconnect(); }catch(e){} musicChain(kind, urls, i + 1); } };
  el.addEventListener('error', next);
  el.play().then(() => { if(MU.cur !== c) return; const t = AU.ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.6, t + 1.2); })
    .catch(e => { if(e && e.name === 'NotAllowedError'){ if(MU.cur === c){ MU.cur = null; MU.playing = null; } } else next(); });
}
musicGo = function(){
  const kind = MU.kind; if(!AU.ctx || MU.playing === kind) return;
  clearInterval(MU.id); MU.id = null; musicFadeOut(.8); MU.playing = null;
  if(!kind) return;
  musicChain(kind, musicUrls(kind), 0);
};
// chaque situation → sa liste de clés (de la plus précise à la plus générale)
musicSet = (prev => function(kind){
  if(kind === 'boss' && G && G.cfg && G.cfg.mode === 'raid') kind = `raid:${G.cfg.raidBoss}|raid|boss|battle`;   // le boss de raid garde la musique de raid
  else if(kind === 'boss' && G && G.e) kind = `boss:${G.e.t}|boss|battle`;
  else if(kind === 'menu' && typeof MBG !== 'undefined' && MBG.scene) kind = `menu:${MBG.scene}|menu`;
  return prev(kind);
})(musicSet);
start = (prev => function(cfg){
  const r = prev(cfg);
  if(!G || !cfg) return r;
  const m = cfg.mode, si = cfg.stageIndex;
  let k = null;
  if(m === 'raid') k = `raid:${cfg.raidBoss}|raid|boss|battle`;
  else if(m === 'safari') k = `safari:${cfg.target}|safari${cfg.zone ? '|safari:' + cfg.zone : ''}|battle`;
  else if(m === 'online') k = 'online|battle';
  else if(m === 'training') k = 'training|battle';
  else if(m === 'boss') k = `boss:${(cfg.enemies || [])[0] || 'mewtwo'}|boss|battle`;
  else if(si != null && typeof chapterOf === 'function') k = `battle:niveau${si + 1}|battle:chapitre${chapterOf(si) + 1}|battle`;
  if(k) musicSet(k);
  return r;
})(start);
// menus avec fond animé (Défi Mewtwo, Raid, Concours) : leur propre musique
menu = (prev => function(h){
  prev(h);
  if(h && (!G || G.over) && typeof MBG !== 'undefined' && (MBG.scene || MU.kind && String(MU.kind).startsWith('menu'))) musicSet('menu');
})(menu);

document.head.insertAdjacentHTML('beforeend', `<style>
.rtries{font-size:11px;color:#ffe9a0;margin:0 0 4px}.rtries small{color:var(--txt2,#c9bcd8)}
.rdone.rlost{color:#ff8a7a}
.sfz{margin:0 0 2px}.sfz .btn2{font-size:10px}.sfz .btn2.lk{opacity:.6}
</style>`);
