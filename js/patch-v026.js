// ============================================================
//  patch-v026.js — rapport de test n°5 (v0.25.0) → v0.26.0
//
//    1. Objectifs du nouvel arrivant : 20 objectifs en 3 étapes (une seule étape affichée à la fois, chemin illustré),
//       un bonus par étape, et l'Œuf Mystère (+ titre « Dresseur confirmé ») quand tout est fini
//    2. Fin du chapitre 1 : « Encore N objectifs pour recevoir l'Œuf Mystère » + bouton « Voir les objectifs »
//       (écran opaque : plus de « Victoire ! » en fantôme derrière)
//    3. Objectifs « vétéran » (après le nouvel arrivant) : chacun donne un titre de profil
//    4. Tournoi : après une défaite, les 3 attaques qui t'ont fait le plus mal (et si tu aurais pu les esquiver)
//    5. Notifications : une seule à la fois, le badge se ferme quand on change d'écran
//    6. Correctifs d'affichage (téléphone surtout) : titres coupés, Mes équipes, Tournoi, Raid, Pension, Options…
//    7. Solo : « Reprendre au Ne adversaire » après une défaite (une fois, contre quelques ₽)
//    (Le Tournoi Élite / Maître et le chapitre 2 sont réglés dans js/tournament.js, js/ai-brain.js et js/patch-v025.js)
// ============================================================

// ---------------------------------------------------------------- suivis nécessaires aux nouveaux objectifs
// Relève utilisée volontairement (pas le remplacement automatique après un K.O.)
doSwap = (prev => function(n){ try{ if(G && G.p && G.p.hp > 0 && G.cfg && G.cfg.mode !== 'online'){ const d = Save.load(); if(!d.v26swap){ d.v26swap = 1; Save.save(); } } }catch(e){} return prev(n); })(doSwap);
// premier Poffin cuisiné
if(typeof makePoffin === 'function') makePoffin = (prev => function(){ const r = prev.apply(this, arguments); try{ const d = Save.load(); d.v26poffin = 1; }catch(e){} return r; })(makePoffin);

// ---------------------------------------------------------------- 1. objectifs du nouvel arrivant
const v26Max = () => Math.max(Save.cleared(3), Save.cleared(6));
const v26Has = k => !!Save.load()[k];
const NEWBIE_STAGES = [
  { n:1, name:'Premiers pas',      icon:'👣', bonus:{ txt:'un Ticket Safari', give:() => Save.addItem('ticket:depart', 1) } },
  { n:2, name:'Explorer',          icon:'🧭', bonus:{ txt:'une Caisse du grand départ', give:() => v26FreeCrate('depart') } },
  { n:3, name:'Devenir dresseur',  icon:'🏆', bonus:null }
];
const NEWBIE_GOALS = [
  // étape 1 · Premiers pas
  { st:1, id:'b-lv2',     txt:'Termine le niveau 2 du Solo',              r:50,  ok:() => v26Max() >= 2, go:() => SCREENS.solo() },
  { st:1, id:'b-tuto',    txt:'Termine le tutoriel (jusqu\'à la dernière page)', r:30, ok:() => v26Has('v26tuto'), go:() => SCREENS.tuto() },
  { st:1, id:'b-swap',    txt:'Utilise la Relève pendant un combat',      r:40,  ok:() => v26Has('v26swap'), go:() => SCREENS.solo() },
  { st:1, id:'b-balls',   txt:'Achète des Poké Balls au Magasin',         r:40,  ok:() => !!Save.load().boughtBall || SAFARI.balls.reduce((s, b) => s + Save.itemCount(b.id), 0) >= 3, go:() => showShop('safari') },
  { st:1, id:'b-catch',   txt:'Capture un Pokémon au Safari',             r:80,  ok:() => Owned.list().length >= 2, go:() => showSafari({ zone:'decouverte' }) },
  { st:1, id:'b-crate',   txt:'Ouvre ta première Caisse du grand départ', r:60,  ok:() => Save.opened() >= 1, go:() => showShop('crates') },
  { st:1, id:'b-held',    txt:'Équipe un objet tenu sur un Pokémon',      r:50,  ok:() => Save.teams().some(t => t.members.some(id => Save.teamItem(t, id))), go:() => SCREENS.teams() },
  // étape 2 · Explorer
  { st:2, id:'b-lv3',     txt:'Termine le niveau 3 du Solo',              r:100, item:'baie-sitrus', ok:() => v26Max() >= 3, go:() => SCREENS.solo() },
  { st:2, id:'b-tower',   txt:'Franchis 3 étages de la Tour',             r:60,  ok:() => Tower.stats().floors >= 3, go:() => SCREENS.tower() },
  { st:2, id:'b-quest',   txt:'Récupère une quête du jour',               r:50,  ok:() => v26Has('v26quest') || Quests.d().list.some(q => q.c), go:() => showQuests() },
  { st:2, id:'b-own4',    txt:'Possède 4 Pokémon',                        r:100, ok:() => Owned.list().length >= 4, go:() => SCREENS.safari() },
  { st:2, id:'b-contest', txt:'Participe à un Concours',                  r:60,  ok:() => typeof Con !== 'undefined' && Con.d().played >= 1, go:() => SCREENS.contest() },
  { st:2, id:'b-poffin',  txt:'Cuisine un Poffin',                        r:40,  ok:() => v26Has('v26poffin') || (typeof Con !== 'undefined' && Con.d().poffins.length >= 1), go:() => SCREENS.contest() },
  { st:2, id:'b-lv5',     txt:'Termine le niveau 5 du Solo',              r:120, ok:() => v26Max() >= 5, go:() => SCREENS.solo() },
  // étape 3 · Devenir dresseur
  { st:3, id:'b-raid',    txt:'Gagne un Raid ★ (débloqué au niveau 7)',   r:120, ok:() => (Save.load().raidWins || 0) >= 1, go:() => SCREENS.raid() },
  { st:3, id:'b-tower10', txt:'Atteins l\'étage 10 de la Tour',           r:100, item:'restes', ok:() => Tower.best() >= 10, go:() => SCREENS.tower() },
  { st:3, id:'b-6v6',     txt:'Termine le niveau 1 en Solo 6v6',          r:80,  ok:() => Save.cleared(6) >= 1, go:() => SCREENS.solo({ size:6 }) },
  { st:3, id:'b-tourney', txt:'Joue un Tournoi à 8 (Challenger)',         r:100, ok:() => typeof TSave !== 'undefined' && (TSave.d().stats.played || 0) >= 1, go:() => SCREENS.tourney() },
  { st:3, id:'b-ch1',     txt:'Termine le chapitre 1 du Solo (bats Mewtwo)', r:150, item:'orbe-vie', ok:() => v26Max() >= 10, go:() => SCREENS.solo() },
  // final
  { st:4, id:'b-final',   txt:'Termine tous les objectifs du nouvel arrivant', r:0, final:true, ok:() => NEWBIE_GOALS.every(g => g.final || Quests.d().goals[g.id]), go:() => showQuests() }
];
// on remplace la liste (même tableau : le reste du jeu continue de la lire)
BEGIN_GOALS.splice(0, BEGIN_GOALS.length, ...NEWBIE_GOALS);
// objectifs « vétéran » : après le nouvel arrivant, chacun donne un titre de profil
const VETERAN_GOALS = [
  { id:'v-mewtwo3', txt:'Bats Mewtwo en Extrême',              r:300, title:'fleau-x', tname:'Fléau de Mewtwo',   ok:() => typeof BossWins !== 'undefined' && BossWins.has('mewtwo', 'extreme'), go:() => SCREENS.boss() },
  { id:'v-maitre',  txt:'Gagne un Tournoi Maître',             r:300, title:'maitre-t', tname:'Maître du Tournoi', ok:() => v26Has('v26maitre'), go:() => SCREENS.tourney() },
  { id:'v-pension', txt:'Termine les 4 lignées de la Pension', r:300, title:'eleveur',  tname:'Éleveur confirmé',  ok:() => typeof Pen !== 'undefined' && Object.keys(Pen.d().done || {}).length >= (typeof PEN_LINES !== 'undefined' ? PEN_LINES.length : 4), go:() => SCREENS.pension() },
  { id:'v-ch2',     txt:'Termine le chapitre 2 du Solo',       r:300, title:'titan',    tname:'Dompteur de Titans', ok:() => v26Max() >= 20, go:() => SCREENS.solo() }
];
const v26NewbieDone = () => !!Quests.d().goals['b-final'];
const v26StageOf = () => { const Q = Quests.d(); for(const S of NEWBIE_STAGES){ const L = NEWBIE_GOALS.filter(g => g.st === S.n); if(L.some(g => !Q.goals[g.id]) || (S.bonus && !Q.goals['stage' + S.n])) return S.n; } return 4; };
const v26Left = () => NEWBIE_GOALS.filter(g => !g.final && !Quests.d().goals[g.id]).length;
Quests.open = function(){ const Q = this.d(); const st = v26StageOf();
  return Q.list.filter(q => { const D = this.def(q.id); return D && !q.c && q.p >= D.n; }).length
    + NEWBIE_GOALS.filter(g => g.st <= Math.min(st, 3) && !Q.goals[g.id] && g.ok()).length + (st === 4 && !Q.goals['b-final'] ? 1 : 0)
    + (v26NewbieDone() ? VETERAN_GOALS.filter(g => !Q.goals[g.id] && g.ok()).length : 0); };
Quests.beginner = function(){ return !v26NewbieDone(); };
// œuf déjà reçu avec une ancienne version (v0.24 : objectif « chapitre 1 » ; v0.25 : écran de fin du chapitre 1) → 300 ₽ à la place
setTimeout(() => { try{ const d = Save.load(); if(d.v26mig) return; d.v26mig = 1; if(d.v25egg === 'given' || (d.quests && d.quests.goals && d.quests.goals['b-ch1'])) d.v26eggPrev = 1; Save.save(); }catch(e){} }, 1500);
// titres de profil : nouvel arrivant + vétéran
if(typeof TITLES !== 'undefined'){
  const has = id => !!(Quests.d().goals[id]);
  if(!TITLES.some(t => t.id === 'confirme')) TITLES.push({ id:'confirme', name:'Dresseur confirmé', q:'b-final' });
  VETERAN_GOALS.forEach(g => { if(!TITLES.some(t => t.id === g.title)) TITLES.push({ id:g.title, name:g.tname, q:g.id }); });
  if(typeof titleOk === 'function'){ const tq = TITLES.filter(t => t.q);
    // titleOk est une constante : on passe par le badge « b » d'un faux badge toujours vrai/faux selon l'objectif
    tq.forEach(t => { const bid = 'q:' + t.q; t.b = bid; if(typeof Badges !== 'undefined'){ const h = Badges.has; if(!Badges.v26){ Badges.v26 = 1; Badges.has = function(id){ return String(id).startsWith('q:') ? has(id.slice(2)) : h.call(this, id); }; } } });
    if(typeof pfPick === 'function') pfPick = (prev => function(title, L, fn, cls){ return prev(title, (L || []).map(x => x && typeof x.label === 'string' && x.label.includes('undefined') ? { ...x, label:'🔒 Objectif à finir (Quêtes)' } : x), fn, cls); })(pfPick);
  }
}
function v26FreeCrate(id){ const c = CRATE[id]; if(!c) return; const p = c.price; c.price = 0; try{ openCrate(id); } finally { c.price = p; } }
function v26GiveFinal(){
  const d = Save.load();
  if(d.v26eggPrev){ Save.addCoins(300); Save.save(); return v26Scene({ title:'Objectifs du nouvel arrivant terminés !', got:`Tu as déjà ton Œuf Mystère : voici <b>${money(300)}</b> à la place !`, egg:false,
    list:[['🎖️', 'Titre « Dresseur confirmé » (Profil)'], ['⭐', 'Objectifs vétéran débloqués (Quêtes du jour)']], buttons:[['Voir mes objectifs', () => showQuests()], ['Plus tard', null]] }); }
  if(typeof PEN !== 'undefined') Save.addItem(PEN.egg, 1); d.v26eggPrev = 1; Save.save();
  v26Scene({ title:'Objectifs du nouvel arrivant terminés !', got:'Tu as reçu un <b>Œuf Mystère</b> !', egg:true,
    list:[['🥚', 'Fais-le éclore à la Pension'], ['🎖️', 'Titre « Dresseur confirmé » (Profil)'], ['⭐', 'Objectifs vétéran débloqués (Quêtes du jour)']],
    buttons:[['Aller à la Pension', () => { G = null; SCREENS.pension(); }], ['Plus tard', null]] });
}

// ---------------------------------------------------------------- scène animée (œuf) — fond opaque (V1)
function v26Scene(o){
  const app = document.getElementById('app'); if(!app) return; const old = document.getElementById('v25egg'); if(old) old.remove();
  const egg = typeof PEN !== 'undefined' ? `assets/items/${PEN.egg}.png` : '';
  const parts = Array.from({ length:18 }, (_, i) => `<i style='--a:${i*20}deg;--d:${(i%6)*.12}s'></i>`).join('');
  app.insertAdjacentHTML('beforeend', `<div id='v25egg' class='v26op ${o.egg ? '' : 'v26ne'}'><div class='v25in'>
    <h2>${o.title}</h2>
    <div class='v25stage'><div class='v25glow'></div><div class='v25parts'>${parts}</div><img class='v25e ${o.egg ? '' : 'v26dim'}' src='${egg}' alt=''></div>
    <p class='v25got'>${o.got}</p>
    ${o.list && o.list.length ? `<ul>${o.list.map(([i, t]) => `<li><span>${i}</span>${t}</li>`).join('')}</ul>` : ''}
    <div class='row'>${o.buttons.map((b, i) => `<button class='${i ? 'btn2' : 'btn'}' data-v26b='${i}'>${esc(b[0])}</button>`).join('')}</div></div></div>`);
  const close = () => { const x = document.getElementById('v25egg'); if(x) x.remove(); };
  document.querySelectorAll('[data-v26b]').forEach(b => b.onclick = () => { close(); const f = o.buttons[+b.dataset.v26b][1]; if(f){ G = null; f(); } });
  if(typeof AU !== 'undefined' && AU.ctx && typeof tone === 'function'){ [523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'square', .08, 0, 1.1 + i*.11)); tone(1568, .8, 'triangle', .1, 0, 1.6); }
}
// fin du chapitre 1 (appelée par js/patch-v025.js)
v25Chapter1Scene = function(){
  const C2 = CHAPTERS[1] ? CHAPTERS[1].name : '';
  const n = v26Left(), list = [['📖', `Chapitre 2 : ${esc(C2)}`], ['📦', 'Caisse des Titans (Boutique)'], ['🌋', 'Safari des Titans + son ticket']];
  v26Scene({ title:'Chapitre 1 terminé !', egg:false, list,
    got: v26NewbieDone() || Save.load().v26eggPrev ? 'Bravo, dresseur !' : n ? `Encore <b>${n} objectif${n > 1 ? 's' : ''}</b> pour recevoir l'<b>Œuf Mystère</b> !` : `Récupère tes objectifs : l'<b>Œuf Mystère</b> t'attend !`,
    buttons:[['Voir les objectifs', () => showQuests()], ['Plus tard', null]] });
};

// ---------------------------------------------------------------- écran Quêtes du jour (nouvelle version)
function showQuests(msg){
  const Q = Quests.d(), now = new Date(), mid = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1), left = mid - now, hh = Math.floor(left/3600e3), mm = Math.floor(left/60e3) % 60;
  const qrow = q => { const D = Quests.def(q.id); if(!D) return ''; const k = D.k || 1, done = q.p >= D.n;
    return `<div class='qrow ${q.c ? 'got' : done ? 'ok' : ''}'><div><b>${esc(D.txt)}</b><i><u style='width:${q.p/D.n*100}%'></u></i><small>${Math.round(q.p*k)} / ${D.n*k}</small></div>
      ${q.c ? `<em>✔ Récupérée</em>` : done ? `<button class='btn sm' data-qc='${q.id}'>+${money(D.r)}</button>` : `<span class='qr'>${money(D.r)}</span>`}</div>`; };
  const itName = id => (HELD_BY_ID[id] ? HELD_BY_ID[id].name : id);
  const grow = g => { const got = Q.goals[g.id], ok = g.ok(), rew = (g.r ? money(g.r) : '') + (g.item ? ` + ${esc(itName(g.item))}` : '') + (g.final ? '🥚 Œuf Mystère + titre' : g.title ? ` + titre « ${esc(g.tname)} »` : '');
    return `<div class='qrow ${got ? 'got' : ok ? 'ok' : ''} ${g.final ? 'v26fin' : ''}'><div><b>${esc(g.txt)}</b><small class='v26rw'>${rew}</small></div>${got ? `<em>✔</em>` : ok ? `<button class='btn sm' data-gc='${g.id}'>Récupérer</button>` : `<button class='btn2 sm' data-gg='${g.id}'>Y aller</button>`}</div>`; };
  const st = v26StageOf(), newbie = !v26NewbieDone();
  let right = '';
  if(newbie){
    const S = NEWBIE_STAGES[Math.min(st, 3) - 1], L = st >= 4 ? NEWBIE_GOALS.filter(g => g.final) : NEWBIE_GOALS.filter(g => g.st === st), done = L.filter(g => Q.goals[g.id]).length;
    // chemin illustré : 3 étapes qui mènent à l'œuf
    const path = `<div class='v26path'>${NEWBIE_STAGES.map(s => `<span class='v26st ${s.n < st ? 'ok' : s.n === st ? 'on' : ''}'>${s.n < st ? '✔' : s.icon}<small>${s.name}</small></span><i class='v26ln ${s.n < st ? 'ok' : ''}'></i>`).join('')}<span class='v26st egg ${st >= 4 ? 'on' : ''}'><img src='assets/items/${typeof PEN !== 'undefined' ? PEN.egg : ''}.png' alt=''><small>Œuf</small></span></div>`;
    const allDone = st <= 3 && L.every(g => Q.goals[g.id]);
    right = `<div class='scroll right'><p class='qh'>Nouvel arrivant · ${st <= 3 ? `Étape ${st}/3 · ${S.name} <small>(${done}/${L.length})</small>` : 'Dernière marche !'}</p>${path}
      ${L.map(grow).join('')}
      ${allDone && S.bonus ? `<div class='qrow ok v26fin'><div><b>Étape ${st} terminée !</b><small class='v26rw'>Bonus : ${S.bonus.txt}</small></div><button class='btn sm' data-stg='${st}'>Récupérer</button></div>` : ''}
      ${st <= 3 && S.bonus && !allDone ? `<p class='hint'>Bonus de l'étape : ${S.bonus.txt}. Au bout du chemin : l'Œuf Mystère !</p>` : ''}</div>`;
  } else right = `<div class='scroll right'><p class='qh'>Objectifs vétéran</p>${VETERAN_GOALS.map(grow).join('')}<p class='hint'>Chaque objectif vétéran donne un titre pour ton Profil.</p></div>`;
  menu(`<div class='hd'><h1>Quêtes du jour</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='edit qv'><div class='scroll left'><p class='qh'>Défis du jour <small>· nouveaux dans ${hh} h ${String(mm).padStart(2, '0')}</small></p>${Q.list.map(qrow).join('')}</div>${right}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  const fx = () => { if(typeof coinSfx === 'function') coinSfx(); if(typeof refreshWallet === 'function') refreshWallet(); };
  bindAll('[data-qc]', b => { const q = Q.list.find(x => x.id === b.dataset.qc), D = Quests.def(q.id); if(q.c || q.p < D.n) return; q.c = 1; Save.load().v26quest = 1; Save.addCoins(D.r); Save.save(); fx(); showQuests('+' + money(D.r)); });
  bindAll('[data-gc]', b => { const g = [...NEWBIE_GOALS, ...VETERAN_GOALS].find(x => x.id === b.dataset.gc); if(!g || Q.goals[g.id] || !g.ok()) return; Q.goals[g.id] = 1;
    if(g.r) Save.addCoins(g.r); if(g.item) Save.addItem(g.item, 1); Save.save(); fx();
    if(g.final){ showQuests('Objectifs du nouvel arrivant terminés !'); return v26GiveFinal(); }
    showQuests(`+${money(g.r)}${g.item ? ' et ' + itName(g.item) : ''}${g.title ? ' et le titre « ' + g.tname + ' »' : ''} !`); });
  bindAll('[data-stg]', b => { const S = NEWBIE_STAGES[+b.dataset.stg - 1]; if(!S || !S.bonus || Q.goals['stage' + S.n]) return; Q.goals['stage' + S.n] = 1; Save.save(); fx();
    if(S.n === 2){ S.bonus.give(); return; } S.bonus.give(); Save.save(); showQuests(`Bonus d'étape : ${S.bonus.txt} !`); });
  bindAll('[data-gg]', b => { const g = [...NEWBIE_GOALS, ...VETERAN_GOALS].find(x => x.id === b.dataset.gg); if(g) g.go(); });
  document.getElementById('back').onclick = showMain;
}
SCREENS.quests = showQuests;
// tutoriel « terminé » = arrivé sur la dernière page ; tournoi Maître gagné
menu = (prev => function(){ const r = prev.apply(this, arguments); try{ if(document.getElementById('tuok')){ const d = Save.load(); if(!d.v26tuto){ d.v26tuto = 1; Save.save(); } } }catch(e){} return r; })(menu);

// ---------------------------------------------------------------- 4. Tournoi : ce qui t'a fait perdre
hurtP = (prev => function(d, b){
  const p = G && G.p, h0 = p ? p.hp : 0, r = prev(d, b);
  try{ if(G && G.cfg && G.cfg.mode === 'tourney' && p && p.hp < h0 && b && !b.own && G.e){ const m = MV[G.e.t] && MV[G.e.t][G.e.pat], key = G.e.t + '|' + (m ? m.n : b.k), A = G.v26hit || (G.v26hit = {});
    const o = A[key] || (A[key] = { mon:G.e.t, n:m ? m.n : b.k, dmg:0, hits:0, tele:0, k:b.k }); o.dmg += h0 - p.hp; o.hits++; o.tele = Math.max(o.tele, G.e.tm || 0); } }catch(e){}
  return r;
})(hurtP);
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, A = G && G.v26hit; const r = prev(win, why);
  if(c && c.mode === 'tourney' && !win && A){
    const top = Object.values(A).sort((a, b) => b.dmg - a.dmg).slice(0, 3);
    if(top.length) setTimeout(() => Notif.show({ id:'v26why', cls:'v26whyn', title:'💡 Ce qui t\'a fait le plus mal', timeout:14, buttons:[{ label:'Compris' }],
      text:top.map(o => `<span class='v26w'>${thumb(o.mon)}<span><b>${esc(o.n)}</b> de ${esc(NAME[o.mon] || o.mon)} · ${Math.round(o.dmg*10)} dégâts en ${o.hits} coup${o.hits > 1 ? 's' : ''}<small>${o.tele >= .3 ? `annoncée ${o.tele.toFixed(1).replace('.', ',')} s avant : esquive au moment où elle part` : 'très rapide : bouge sans arrêt, ne reste pas dans son axe'}</small></span></span>`).join('') }), 1200);
  }
  return r;
})(battleEnd);
// Tournoi Maître gagné (objectif vétéran) : on regarde la fin du tournoi
if(typeof tReport === 'function') tReport = (prev => function(win){ const T = typeof TO !== 'undefined' && TO; const r = prev(win);
  const chk = () => { try{ const t = (typeof TO !== 'undefined' && TO) || T; if(t && t.level === 'maitre' && t.champ && t.champ === tMyId()){ const d = Save.load(); if(!d.v26maitre){ d.v26maitre = 1; Save.save(); } } }catch(e){} };
  chk(); setTimeout(chk, 1500);
  return r; })(tReport);

// ---------------------------------------------------------------- 5. notifications : une à la fois, le badge se ferme en changeant d'écran
(() => {
  const toast = Notif.toast.bind(Notif); let q = [], busy = 0;
  const next = () => { if(busy || !q.length) return; busy = 1; const [h, c] = q.shift(); toast(h, c); setTimeout(() => { busy = 0; next(); }, 3500); };
  Notif.toast = function(html, col){ q.push([html, col]); next(); };
  // le badge attend que les autres messages soient partis
  badgeToast = (prev => function(list){ const go = () => { if(busy || q.length) return setTimeout(go, 700); prev(list); }; go(); })(badgeToast);
  // changer d'écran ferme la notification de badge (elle couvrait les boutons de l'écran suivant)
  let last = null;
  menu = (prev => function(h){ const r = prev.apply(this, arguments); try{ const t = (document.querySelector('#menu h1') || {}).textContent || ''; if(last !== null && t !== last) document.querySelectorAll('#netpop .np.bdgn').forEach(n => n.remove()); last = t; }catch(e){} return r; })(menu);
})();

// ---------------------------------------------------------------- V10 : Pension — œuf prêt = bouton « Faire éclore ! »
if(typeof showPension === 'function'){ showPension = (prev => function(){ const r = prev.apply(this, arguments);
  try{ const P = Pen.d(); if(P.egg && penEggLeft(P) <= 0){ const v = document.getElementById('visit'); if(v){ v.classList.add('v26hatch'); v.innerHTML = `<b>🥚 Faire éclore !</b><small>L'œuf est prêt</small>`; }
    document.querySelectorAll('#menu .pbig small, #menu .pbody small').forEach(s => { if(/éclosion dans/.test(s.textContent)) s.innerHTML = `100 % · <b>prêt à éclore !</b>`; }); } }catch(e){}
  return r; })(showPension); SCREENS.pension = showPension; }

// ---------------------------------------------------------------- 7. Solo : reprendre au dernier adversaire après une défaite (une fois, contre des ₽)
//  Tes Pokémon repartent avec tous leurs PV, les adversaires déjà battus restent battus. Si tu reperds, il faut recommencer le niveau.
let V26_RAW = null;
start = (prev => function(cfg){ if(cfg && cfg.mode === 'solo' && !cfg.v26res) V26_RAW = cfg; return prev.apply(this, arguments); })(start);
const v26ResPrice = i => 25 + i*5;
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, w = G ? G.wave : 0, raw = V26_RAW, ok = !win && c && c.mode === 'solo' && !c.v26res && raw && raw.stageIndex === c.stageIndex && w > 0 && G.et && w < G.et.length;
  const r = prev(win, why);
  if(ok){ const price = v26ResPrice(c.stageIndex); let n = 0;
    const put = () => { const rp = document.getElementById('rp'); if(!rp || document.getElementById('v26res')) return; rp.insertAdjacentHTML('beforebegin', `<button class='btn' id='v26res' ${Save.coins() >= price ? '' : 'disabled'}>Reprendre au ${w + 1}<sup>e</sup> adversaire — ${money(price)}</button>`); rp.className = 'btn2';
      document.getElementById('v26res').onclick = () => { if(!Save.spend(price)) return; if(typeof coinSfx === 'function') coinSfx(); G = null;
        start({ ...raw, v26res:1 }); if(!G) return; G.wave = w; spawn(); if(typeof Notif !== 'undefined') Notif.toast(`▶ Reprise au ${w + 1}<sup>e</sup> adversaire : tes Pokémon sont soignés.`); }; };
    // l'écran de défaite est reconstruit juste après (js/patch-v022.js) : on remet le bouton à chaque fois
    [0, 120, 400, 900].forEach(t => setTimeout(put, t)); }
  return r;
})(battleEnd);

// ---------------------------------------------------------------- 6. correctifs d'affichage
document.head.insertAdjacentHTML('beforeend', `<style>
/* V1 : écran de l'œuf / fin de chapitre opaque */
#v25egg.v26op{background:radial-gradient(circle at 50% 40%,#2a1650 0,#0c0818 70%);animation:none}
#v25egg .v26dim{filter:brightness(.35) grayscale(.6)}#v25egg.v26ne .v25glow,#v25egg.v26ne .v25parts{display:none}
#v25egg .v25in{max-height:100%;overflow:auto}
/* V4 : titres coupés — le panneau commence en haut et défile au lieu de déborder des deux côtés */
#menu .mc{justify-content:safe center;overflow-y:auto;overflow-x:hidden}
.nw{white-space:nowrap}
.pact.v26hatch{animation:v26pulse .9s ease-in-out infinite alternate}@keyframes v26pulse{from{box-shadow:0 0 4px #ffd23f}to{box-shadow:0 0 18px #ffd23f}}
/* V13 */ @media (min-width:900px){ .opt span{flex:0 0 200px} }
/* V8 */ @media (max-height:440px){ .raidv .right{font-size:9.5px;line-height:1.25} .raidv .right p{margin:1px 0} .raidv .left b,.raidv .left h2{white-space:nowrap} }
/* V14 */ .pshop.scroll,.pshop2.scroll{max-height:none;flex:1 1 auto;min-height:0}
/* V7 */ .cberr.scroll{max-height:none;flex:1 1 auto;min-height:0}
/* V9 */ @media (max-height:440px){ .trbox{margin:2px 0;padding:3px 6px} .trbox>small,.trbox p.hint{display:none} }
/* V5 : Mes équipes sur téléphone — filtres sur une ligne qui défile */
.v25rf{flex-wrap:nowrap;overflow-x:auto;scrollbar-width:none}.v25rf::-webkit-scrollbar{display:none}.v25rf .btn2.sm{flex:none}
@media (max-height:440px){ .edit .grid2c{grid-template-columns:repeat(4,1fr);gap:3px} .edit .grid2c .card{padding:1px} .edit .grid2c .card img{width:26px;height:26px} .grid2c .card small{font-size:7.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%;display:block}
  .edit .stat span{font-size:8px}.edit .stat b{font-size:8px;min-width:28px} .v25rt{display:none} }
/* objectifs du nouvel arrivant */
.v26path{display:flex;align-items:center;justify-content:center;gap:0;margin:2px 0 6px}
.v26st{display:flex;flex-direction:column;align-items:center;font-size:16px;line-height:1;min-width:46px;opacity:.5}.v26st small{font-size:7.5px;margin-top:2px;color:#c9bcd8;white-space:nowrap}
.v26st.on{opacity:1;transform:scale(1.12)}.v26st.on small{color:#ffd23f}.v26st.ok{opacity:.9;color:#8dff9a}
.v26st.egg img{width:22px;height:22px;image-rendering:pixelated}.v26st.egg.on img{filter:drop-shadow(0 0 6px #ffd23f)}
.v26ln{flex:1;max-width:28px;height:2px;border-top:2px dashed rgba(255,255,255,.3)}.v26ln.ok{border-color:#8dff9a}
.v26rw{display:block;font-size:8.5px;color:#ffe27a!important}.qrow.v26fin{border-color:#ffd23f}
/* Tournoi : pourquoi j'ai perdu */
.v26whyn p{text-align:left}.v26w{display:flex;align-items:center;gap:6px;margin:3px 0;font-size:11px}.v26w img{width:26px;height:26px}.v26w small{display:block;font-size:9px;opacity:.8}
</style>`);
