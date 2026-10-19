// ============================================================
//  tournament.js — MODE TOURNOI (v0.22)
//    • Solo ou en ligne (salon par code ; test local entre 2 onglets) — 8 ou 16 participants, l'IA complète
//    • Élimination directe, arbre du tournoi en direct, 3 minutes de préparation entre chaque combat
//      (le combat part tout de suite quand les 2 joueurs sont prêts)
//    • Une équipe de 3 + 1 remplaçant pour TOUT le tournoi : entre deux combats, le remplaçant peut prendre la place d'un des 3
//    • Combats 3 contre 3, sans bonus de stats : l'IA a les vrais Pokémon… mais joue très bien
//      (esquive tes tirs, garde la bonne distance, choisit l'attaque qui fait le plus mal, choisit son équipe
//       contre la tienne)
//    • Statistiques complètes : par tournoi (chaque participant) et carrière
//  Réglages : TOUR ci-dessous.
// ============================================================
const TOUR = {
  prep:180,                          // secondes de préparation entre deux combats
  teamSize:3,
  rewards:{ 1:500, 2:260, 4:140, 8:70, 16:35 },   // Pokédollars selon la place (×0,65 comme les autres modes)
  aiNames:['Pierre', 'Ondine', 'Major Bob', 'Erika', 'Koga', 'Morgane', 'Auguste', 'Giovanni', 'Flora', 'Cynthia', 'Peter', 'Iris', 'Alizée', 'Silver', 'Blue', 'Régis', 'Aurore', 'Lino', 'Pierrick', 'Sandra', 'Olga', 'Aldo', 'Kahili', 'Tanguy']
};
const TOUR_STAGE = { name:'Tournoi', level:6, arena:0, hp:1, dmg:1, speed:1, pspeed:1, rate:.75, tele:.85, aim:1, boss:1 };
const TROUND = n => n === 1 ? 'Finale' : n === 2 ? 'Demi-finales' : n === 4 ? 'Quarts de finale' : n === 8 ? 'Huitièmes de finale' : 'Tour ' + n;

// ---------------------------------------------------------------- identité, sauvegarde, carrière
const tMyId = () => (typeof Online !== 'undefined' && Online.user && Online.user.id) || (() => { let v = sessionStorage.getItem('tour.id'); if(!v){ v = 'p' + Math.random().toString(36).slice(2, 9); sessionStorage.setItem('tour.id', v); } return v; })();
const tMyName = () => (typeof Online !== 'undefined' && Online.user && Online.user.pseudo) || (typeof LocalLobby !== 'undefined' && LocalLobby.pseudo) || 'Toi';
const TSave = {
  d(){ const d = Save.load(); if(!d.tour) d.tour = { team:null, stats:{ played:0, won:0, finals:0, semis:0, best:0, matches:0, wins:0, ko:0, kod:0, dmg:0, dmgT:0, time:0, mons:{}, hist:[] } }; return d.tour; },
  team(){ const T = this.d(); if(!T.team || !Array.isArray(T.team.members)){ const t = Save.teams().find(x => x.size === 3 && x.members.length) || { members:ORDER.filter(id => Owned.has(id)).slice(0, 3), items:{} }; T.team = { members:t.members.filter(id => Owned.has(id)).slice(0, 3), items:{ ...(t.items || {}) } }; } if(T.team.res && (!Owned.has(T.team.res) || T.team.members.includes(T.team.res))) T.team.res = null; return T.team; },
  squad(){ const t = this.team(); return t.members.concat(t.res ? [t.res] : []); },
  teamObj(){ const t = this.team(); return { id:'tour', name:'Tournoi', size:3, members:t.members.slice(), items:{ ...t.items }, caps:{} }; },
  items(){ const t = this.team(), o = {}; t.members.concat(t.res ? [t.res] : []).forEach(id => { const it = t.items[id]; if(it && HELD_BY_ID[it] && Save.itemCount(it) > 0) o[id] = it; }); return o; }
};

// ---------------------------------------------------------------- IA : équipes et simulation
const tPick = a => a[Math.floor(Math.random()*a.length)];
const tPool = () => ORDER.filter(id => HERO[id] && MV[id] && !(POKEMON[id] && POKEMON[id].bossOnly));
function tStrength(id){ const H = HERO[id]; return H.hp/120 + H.sp/420 + MV[id].reduce((s, m) => s + (m.d || 0), 0)/55; }
function tMatchup(a, b){ return (lg2(bestHit(a, b)) - .8*lg2(bestHit(b, a))); }
// l'IA choisit 3 Pokémon de sa réserve de 6 contre l'équipe adverse
function tAiTeam(roster, foe, n){
  n = n || 3;
  const sc = id => tStrength(id) + (foe && foe.length ? foe.reduce((s, f) => s + tMatchup(id, f), 0)*.35 : 0) + Math.random()*.45;
  const out = [], L = roster.slice().sort((x, y) => sc(y) - sc(x));
  for(const id of L){ if(out.length >= n) break; if(out.some(o => typesOf(o)[0] === typesOf(id)[0]) && L.length - L.indexOf(id) > n - out.length) continue; out.push(id); }
  const R2 = out.length === n ? out : L.slice(0, n);
  if(foe && foe[0]) R2.sort((x, y) => tMatchup(y, foe[0]) - tMatchup(x, foe[0]));     // le meilleur contre ton 1er Pokémon ouvre le combat
  return R2;
}
function tNewAi(name, i){
  const pool = tPool().sort(() => Math.random() - .5), roster = tAiTeam(pool.slice(0, 7), null, 4);   // 4 Pokémon pour tout le tournoi
  return { id:'ai' + i + Math.random().toString(36).slice(2, 5), name, kind:'ai', ai:{ skill:+(.85 + Math.random()*.3).toFixed(2), roster }, team:tAiTeam(roster), items:{} };
}
function tPower(team, opp, skill){ let s = 0; team.forEach(a => { s += tStrength(a); opp.forEach(b => s += tMatchup(a, b)*.25); }); return s + (skill - 1)*3; }
function tSim(A, B){
  const pa = 1/(1 + Math.exp(-(tPower(A.team, B.team, A.ai ? A.ai.skill : 1.05) - tPower(B.team, A.team, B.ai ? B.ai.skill : 1.05))*1.4)), aw = Math.random() < pa;
  const W = aw ? A : B, L = aw ? B : A, close = Math.abs(pa - .5) < .15, lk = close ? (Math.random() < .6 ? 2 : 1) : (Math.random() < .5 ? 1 : 0);
  const hp = t => t.reduce((s, id) => s + HERO[id].hp, 0), time = Math.round(60 + Math.random()*90 + (close ? 40 : 0));
  return { w:W.id, st:{ [W.id]:{ ko:3, kod:lk, dmg:hp(L.team), dmgT:Math.round(hp(W.team)*(lk/3 + Math.random()*.2)), time, mvp:{ [tPick(W.team)]:2 } },
                       [L.id]:{ ko:lk, kod:3, dmg:Math.round(hp(W.team)*(lk/3 + Math.random()*.2)), dmgT:hp(L.team), time, mvp:lk ? { [tPick(L.team)]:lk } : {} } } };
}

// ---------------------------------------------------------------- MOTEUR (côté organisateur : solo ou hôte en ligne)
//  T = { code, solo, size, phase:'lobby'|'prep'|'done', round, deadline, players:[…], rounds:[[match]], ready:{}, stats:{}, champ }
//  match = { a, b, w, state:'wait'|'live'|'done', t0, res, sim }
let TO = null;            // tournoi suivi par ce joueur (copie locale ; l'hôte en est le propriétaire)
let TNET = null;          // { T:transport, host, code, kind, skew, last }
const tP = (T, id) => T.players.find(p => p.id === id);
const tMine = T => { if(!T || !T.rounds || !T.rounds.length) return null; const R = T.rounds[T.round] || []; const me = tMyId(); return R.find(m => m.a === me || m.b === me) || null; };
const tNow = () => Date.now() + (TNET && !TNET.host ? TNET.skew || 0 : 0);
function tStatAdd(T, id, s){ const S = T.stats[id] = T.stats[id] || { w:0, l:0, ko:0, kod:0, dmg:0, dmgT:0, time:0, mvp:{}, played:0 }; S.played++; ['ko', 'kod', 'dmg', 'dmgT', 'time'].forEach(k => S[k] += Math.round(s[k] || 0)); Object.entries(s.mvp || {}).forEach(([k, v]) => S.mvp[k] = (S.mvp[k] || 0) + v); }
const TEng = {
  create(o){
    const T = { code:o.code || null, solo:!!o.solo, size:o.size || 8, phase:'lobby', round:0, deadline:0, players:o.players || [], rounds:[], ready:{}, stats:{}, champ:null, v:1 };
    return T;
  },
  fill(T){
    const used = new Set(T.players.map(p => p.name)), names = TOUR.aiNames.filter(n => !used.has(n)).sort(() => Math.random() - .5);
    let i = 0; while(T.players.length < T.size) T.players.push(tNewAi(names[i % names.length] || 'Dresseur ' + (i + 1), i++));
  },
  begin(T){
    this.fill(T);
    T.players.forEach(P => { if(P.kind !== 'ai'){ P.squad = (P.squad && P.squad.length ? P.squad : (P.team || []).concat(P.res ? [P.res] : [])).slice(0, 4); P.lockItems = { ...(P.items || {}) }; } else { P.squad = P.ai.roster.slice(); P.items = P.lockItems = tAiItems(P.squad); } });
    const ids = T.players.map(p => p.id).sort(() => Math.random() - .5), R = [];
    for(let k = 0; k < ids.length; k += 2) R.push({ a:ids[k], b:ids[k + 1], w:null, state:'wait' });
    T.rounds = [R]; T.round = 0; this.prep(T);
  },
  prep(T){
    T.phase = 'prep'; T.ready = {};
    const anyHuman = (T.rounds[T.round] || []).some(m => [m.a, m.b].some(id => tP(T, id).kind !== 'ai'));
    T.deadline = Date.now() + (anyHuman ? TOUR.prep : 6)*1000;
    // l'IA choisit son équipe contre son adversaire du tour
    (T.rounds[T.round] || []).forEach(m => [[m.a, m.b], [m.b, m.a]].forEach(([x, y]) => { const P = tP(T, x), F = tP(T, y); if(P.kind === 'ai') P.team = tAiTeam(P.ai.roster, F.team); }));
  },
  tick(T){
    if(!T || T.phase !== 'prep') return false;
    let ch = false; const now = Date.now(), R = T.rounds[T.round];
    R.forEach(m => {
      const A = tP(T, m.a), B = tP(T, m.b), ra = A.kind === 'ai' || T.ready[m.a], rb = B.kind === 'ai' || T.ready[m.b];
      if(m.state === 'wait' && ((ra && rb) || now >= T.deadline)){
        m.state = 'live'; m.t0 = now; ch = true;
        if(A.kind === 'ai' && B.kind === 'ai'){ m.sim = tSim(A, B); m.endAt = now + (T.solo && !R.some(x => [x.a, x.b].includes(tMyId()) && x.state !== 'done') ? 1500 + Math.random()*2500 : 20000 + Math.random()*45000); }
      }
      if(m.state === 'live' && m.sim && now >= m.endAt){ this.result(T, m, m.sim.w, m.sim.st); ch = true; }
      if(m.state === 'live' && !m.sim && now - m.t0 > 12*60e3){ this.result(T, m, Math.random() < .5 ? m.a : m.b, {}); ch = true; }   // sécurité : combat bloqué
      // joueur absent : forfait 45 s après le début de son combat
      if(!T.solo && m.state === 'live' && !m.sim && !m.started && now - m.t0 > 45000){ const hum = [m.a, m.b].filter(id => tP(T, id).kind !== 'ai'), gone = hum.filter(id => !m['go' + id]);
        if(gone.length === hum.length) { this.result(T, m, Math.random() < .5 ? m.a : m.b, {}); ch = true; } else if(gone.length){ this.result(T, m, hum.find(id => !gone.includes(id)) || (m.a === gone[0] ? m.b : m.a), {}); ch = true; } }
    });
    if(T.solo && !R.some(x => (x.a === tMyId() || x.b === tMyId()) && x.state !== 'done')){ let k = 0; R.forEach(x => { if(x.state === 'live' && x.sim && x.endAt > now + 4000) x.endAt = now + 1200 + 900*k++; }); }
    if(R.every(m => m.state === 'done')){ this.next(T); ch = true; }
    return ch;
  },
  result(T, m, w, st){
    if(m.state === 'done') return;
    m.state = 'done'; m.w = w; m.res = { [m.a]:(st[m.a] || {}).ko || 0, [m.b]:(st[m.b] || {}).ko || 0 };
    [m.a, m.b].forEach(id => { tStatAdd(T, id, st[id] || {}); const S = T.stats[id]; if(id === w) S.w++; else S.l++; });
  },
  next(T){
    const R = T.rounds[T.round], W = R.map(m => m.w);
    if(W.length === 1){ T.phase = 'done'; T.champ = W[0]; return; }
    const N = []; for(let k = 0; k < W.length; k += 2) N.push({ a:W[k], b:W[k + 1], w:null, state:'wait' });
    T.rounds.push(N); T.round++; this.prep(T);
  },
  place(T, id){       // place finale (1, 2, 4, 8, 16) d'un joueur
    if(T.champ === id) return 1;
    for(let r = 0; r < T.rounds.length; r++){ const m = T.rounds[r].find(x => (x.a === id || x.b === id) && x.state === 'done' && x.w !== id); if(m) return Math.max(2, T.rounds[r].length*2); }
    return 0;
  }
};

// ---------------------------------------------------------------- RÉSEAU (salon par code)
//  hôte → tous : 'st' (état complet) · joueur → hôte : 'join', 'team', 'ready', 'res', 'go', 'here', 'leave'
function tNetOpen(code, host){
  const kind = typeof Online !== 'undefined' && Online.configured && Online.configured() && Online.user ? 'sb' : 'local';
  if(kind === 'local' && typeof LocalLobby !== 'undefined') LocalLobby.join();
  const T = kind === 'sb' ? NetT.supabase('tour-' + code) : NetT.local('tour-' + code);
  TNET = { T, host, code, kind, skew:0, last:Date.now(), seen:{} };
  T.on((k, d) => { try{ tNetMsg(k, d); }catch(e){ console.warn('tour net', e); } });
  return TNET;
}
function tNetClose(){ if(!TNET) return; try{ if(!TNET.host) TNET.T.send('leave', { id:tMyId() }); }catch(e){} const T = TNET.T; TNET = null; setTimeout(() => T.close(), 300); }
const tSend = (k, d) => { if(TNET) TNET.T.send(k, d); };
function tSnapshot(T){ return { ...T, players:T.players.map(p => ({ id:p.id, name:p.name, kind:p.kind, team:p.team, items:p.items, res:p.res, squad:p.squad, lockItems:p.lockItems, skill:p.ai ? p.ai.skill : null })), now:Date.now() }; }
function tBroadcast(){ if(TNET && TNET.host && TO) tSend('st', tSnapshot(TO)); }
function tNetMsg(k, d){
  if(!TNET) return;
  if(TNET.host){
    const T = TO; if(!T) return;
    if(d && d.id) TNET.seen[d.id] = Date.now();
    if(k === 'join'){
      let P = tP(T, d.id);
      if(!P){ if(T.phase !== 'lobby' || T.players.length >= T.size){ tSend('full', { id:d.id, why:T.phase !== 'lobby' ? 'started' : 'full' }); return; } P = { id:d.id, name:d.name, kind:'human', team:d.team, items:d.items || {}, res:d.res || null }; T.players.push(P); Notif.toast('🏆 ' + d.name + ' rejoint le tournoi', '#ffd23f'); }
      else if(P.kind === 'gone'){ P.kind = 'human'; }
      tBroadcast(); tRender();
    } else if(k === 'team'){ const P = tP(T, d.id); if(P && T.phase !== 'done'){ if(T.phase !== 'lobby' && P.squad && !d.team.every(id => P.squad.includes(id))) return; P.team = d.team; P.items = P.lockItems || d.items || {}; P.res = d.res || null; tBroadcast(); tRender(); } }
    else if(k === 'ready'){ T.ready[d.id] = !!d.r; tBroadcast(); tRender(); }
    else if(k === 'go'){ const m = (T.rounds[T.round] || []).find(x => x.a === d.id || x.b === d.id); if(m){ m['go' + d.id] = 1; m.started = [m.a, m.b].every(id => tP(T, id).kind === 'ai' || m['go' + id]); } }
    else if(k === 'res'){ const m = (T.rounds[d.r] || [])[d.i]; if(m && m.state === 'live'){ const st = { [d.id]:d.st }; const o = m.a === d.id ? m.b : m.a; if(tP(T, o).kind === 'ai'){ st[o] = { ko:d.st.kod, kod:d.st.ko, dmg:d.st.dmgT, dmgT:d.st.dmg, time:d.st.time, mvp:{} }; TEng.result(T, m, d.win ? d.id : o, st); }
        else { m.rep = m.rep || {}; m.rep[d.id] = d; if(m.rep[o] || d.win === false){ const W = d.win ? d.id : o, s2 = m.rep[o] ? m.rep[o].st : { ko:d.st.kod, kod:d.st.ko, dmg:d.st.dmgT, dmgT:d.st.dmg, time:d.st.time, mvp:{} }; st[o] = s2; TEng.result(T, m, W, st); } }
        tBroadcast(); tRender(); } }
    else if(k === 'leave'){ const P = tP(T, d.id); if(P){ if(T.phase === 'lobby') T.players = T.players.filter(p => p.id !== d.id); else { P.kind = 'ai'; P.ai = { skill:1, roster:(P.squad || P.team).slice() }; P.name += ' (IA)'; } tBroadcast(); tRender(); } }
  } else {
    if(k === 'st'){ TNET.last = Date.now(); TNET.skew = d.now - Date.now(); const was = TO; TO = d; if(!tP(TO, tMyId()) && TO.phase !== 'lobby'){ /* pas dans ce tournoi */ } tAfterUpdate(was); tRender(); }
    else if(k === 'full' && d.id === tMyId()){ const why = d.why; tNetClose(); TO = null; gameConfirm('Tournoi indisponible', why === 'started' ? 'Ce tournoi a déjà commencé.' : 'Ce tournoi est complet.', 'OK', showTourney); }
  }
}

// ---------------------------------------------------------------- boucle (1 fois par seconde)
let TTICK = null;
function tLoop(){
  clearInterval(TTICK);
  TTICK = setInterval(() => {
    if(!TO){ clearInterval(TTICK); TTICK = null; return; }
    if(TO.solo || (TNET && TNET.host)){
      // joueurs en ligne partis (plus de nouvelles depuis 40 s) : l'IA les remplace
      if(TNET && TNET.host && TO.phase !== 'lobby') TO.players.forEach(p => { if(p.kind === 'human' && Date.now() - (TNET.seen[p.id] || Date.now()) > 40000){ p.kind = 'ai'; p.ai = { skill:1, roster:(p.squad || p.team).slice() }; p.name += ' (IA)'; } });
      const was = JSON.stringify(TO.rounds.map(r => r.map(m => m.state))) + TO.phase;
      if(TEng.tick(TO) || was !== JSON.stringify(TO.rounds.map(r => r.map(m => m.state))) + TO.phase){ tSave(); tBroadcast(); tAfterUpdate(); }
      else if(TNET && TNET.host && Date.now() % 3000 < 1000) tBroadcast();
    } else if(TNET){
      tSend('here', { id:tMyId() });
      if(Date.now() - TNET.last > 20000 && TO.phase !== 'done'){ tNetClose(); const T = TO; TO = null; if(!(G && G.cfg && G.cfg.mode === 'tourney')) gameConfirm('Tournoi interrompu', 'Le créateur du tournoi ne répond plus.', 'OK', showTourney); return; }
    }
    tTimerUi();
  }, 1000);
}
function tSave(){ if(TO && TO.solo){ TSave.d().cur = TO; Save.save(); } }
// après chaque changement : mon combat commence-t-il ? le tournoi est-il fini ?
function tAfterUpdate(){
  if(!TO) return;
  const m = tMine(TO);
  if(m && m.state === 'live' && !TLIVE && !(G && !G.over)) tStartMatch(m);
  if(TO.phase === 'done' && !TO._fin){ TO._fin = 1; tFinish(); }
  tRender();
}

// ---------------------------------------------------------------- COMBAT
let TLIVE = null;          // { r, i, foe, st:{…} }
function tMyItems(){ const P = TO && tP(TO, tMyId()), L = P && P.lockItems; if(!L) return TSave.items(); const o = {}; Object.entries(L).forEach(([k, v]) => { if(HELD_BY_ID[v] && Save.itemCount(v) > 0) o[k] = v; }); return o; }
function tStartMatch(m){
  const T = TO, me = tMyId(), foeId = m.a === me ? m.b : m.a, F = tP(T, foeId), r = T.round, i = T.rounds[r].indexOf(m);
  if(TLIVE && TLIVE.r === r && TLIVE.i === i) return;
  TLIVE = { r, i, foe:foeId, st:{ ko:0, kod:0, dmg:0, dmgT:0, time:0, mvp:{} } };
  const team = TSave.team();
  if(team.members.length < 1){ Notif.toast('Ton équipe de tournoi est vide !'); return; }
  if(!TNET || TNET.host){ m['go' + me] = 1; m.started = [m.a, m.b].every(id => tP(T, id).kind === 'ai' || m['go' + id]); } else tSend('go', { id:me });
  if(F.kind !== 'ai' && TNET){                 // contre un autre joueur : combat en ligne en temps réel
    const cid = 'tour-' + T.code + '-' + r + '-' + i;
    NetMatch.open({ cid, host:m.a === me, kind:TNET.kind, team:{ ...TSave.teamObj(), items:tMyItems() }, foePseudo:F.name, myPseudo:tMyName(), waitText:`Combat de tournoi contre ${esc(F.name)}…`, onAbort:() => { tReport(false); } });
    NET.m.tour = TLIVE;
    return;
  }
  G = null;
  const arena = [0, 1, 2, 3, 4, 5][Math.floor(Math.random()*6)];
  start({ mode:'tourney', team:team.members.slice(), items:tMyItems(), size:3, stage:{ ...TOUR_STAGE, arena }, arena, enemies:F.team.slice(), tourItems:{ ...(F.items || {}) } });
  if(!G) return;
  G.tour = { skill:F.ai ? F.ai.skill : 1 };
  if(typeof musicSet === 'function') musicSet(r === T.rounds.length - 1 && T.rounds[r].length === 1 ? 'tourney:final|tourney|boss|battle' : 'tourney|battle');
}
function tReport(win){
  const L = TLIVE; if(!L || !TO) return; TLIVE = null;
  const me = tMyId(), st = L.st;
  // carrière
  const C = TSave.d().stats; C.matches++; if(win) C.wins++; C.ko += st.ko; C.kod += st.kod; C.dmg += Math.round(st.dmg); C.dmgT += Math.round(st.dmgT); C.time += Math.round(st.time);
  TSave.team().members.forEach(id => { const M = C.mons[id] = C.mons[id] || { used:0, wins:0, ko:0 }; M.used++; if(win) M.wins++; M.ko += st.mvp[id] || 0; }); Save.save();
  if(TO.solo || (TNET && TNET.host)){
    const m = TO.rounds[L.r][L.i], o = L.foe, s = { [me]:st, [o]:{ ko:st.kod, kod:st.ko, dmg:st.dmgT, dmgT:st.dmg, time:st.time, mvp:{} } };
    if(m.state === 'live'){
      if(tP(TO, o).kind !== 'ai'){ m.rep = m.rep || {}; m.rep[me] = { st, win }; if(m.rep[o] || !win) TEng.result(TO, m, win ? me : o, m.rep[o] ? { [me]:st, [o]:m.rep[o].st } : s); }
      else TEng.result(TO, m, win ? me : o, s);
    }
    tSave(); tBroadcast();
  } else tSend('res', { id:me, r:L.r, i:L.i, win, st });
}
// statistiques pendant le combat (mode tournoi ou combat en ligne de tournoi)
const tFight = () => G && G.cfg && (G.cfg.mode === 'tourney' || (G.cfg.mode === 'online' && NET.m && NET.m.tour));
hurtE = (prev => function(d, b){
  const e = G && G.e, hp0 = e ? e.hp : 0, r = prev(d, b);
  if(tFight() && e && TLIVE){ const dd = Math.max(0, hp0 - Math.max(0, e.hp)); TLIVE.st.dmg += dd; if(hp0 > 0 && e.hp <= 0){ TLIVE.st.mvp[G.p.t] = (TLIVE.st.mvp[G.p.t] || 0) + 1; } }
  return r;
})(hurtE);
hurtP = (prev => function(d, b){
  const p = G && G.p, hp0 = p ? p.hp : 0, r = prev(d, b);
  if(tFight() && p && TLIVE) TLIVE.st.dmgT += Math.max(0, hp0 - Math.max(0, p.hp));
  return r;
})(hurtP);
// adversaires « vrais » : pas de boss, pas de PV en plus
spawn = (prev => function(){
  prev();
  if(!G || !G.cfg || G.cfg.mode !== 'tourney' || !G.e) return;
  const e = G.e; e.boss = false; e.r = 24; if(e.hp >= e.max) e.hp = e.max = Math.round(HERO[e.t].hp*(G.stage.hp || 1)); e.tq = { dodge:0, last:-9 }; e.item = tEnemyItem(e.t);
})(spawn);
battleEnd = (prev => function(win, why){
  if(!(G && G.cfg && G.cfg.mode === 'tourney')) return prev(win, why);
  if(TLIVE){ TLIVE.st.ko = win ? G.et.length : (G.eko ? G.eko.filter(Boolean).length : G.wave); TLIVE.st.kod = G.team.filter(c => c.hp <= 0).length + (win ? 0 : 0); TLIVE.st.time = G.time; }
  const foe = TLIVE && TO ? tP(TO, TLIVE.foe) : null;
  tReport(!!win);
  if(typeof playSfx === 'function') playSfx(win ? 'victory' : 'ko');
  setTimeout(() => { G = null; tShow(win ? `🏆 Victoire contre ${foe ? foe.name : 'ton adversaire'} !` : `Défaite contre ${foe ? foe.name : 'ton adversaire'}…`); }, 600);
})(battleEnd);
// combat en ligne de tournoi : fin → résultat au tournoi (au lieu de l'écran « Revanche »)
netEndScreen = (prev => function(M){
  if(!M || !M.tour) return prev(M);
  if(TLIVE){ const ko = M.foe.tm.filter(r => r[1] <= 0).length; TLIVE.st.ko = M.win ? 3 : ko; TLIVE.st.kod = G ? G.team.filter(c => c.hp <= 0).length : 0; TLIVE.st.time = G ? G.time : 0; }
  tReport(!!M.win);
  const name = M.foe.pseudo; setTimeout(() => { NetMatch.close(true); G = null; tShow(M.win ? `🏆 Victoire contre ${name} !` : `Défaite contre ${name}…`); }, 800);
})(netEndScreen);

// ---------------------------------------------------------------- IA COMPÉTITIVE (combats de tournoi)
//  Mêmes stats que tes Pokémon. Ce qui la rend forte :
//   • prévision : elle vise là où tu VAS être (et pas toujours, pour punir les changements de direction) ;
//     ses rayons te suivent pendant la charge puis se bloquent au dernier moment
//   • réflexes : elle voit arriver tes projectiles, ruées et zones et esquive sur le côté (en évitant les murs)
//   • placement : distance idéale selon ses attaques et les tiennes, tourne autour de toi, se replie quand elle a peu de PV
//   • choix d'attaque : efficacité de type, distance, temps de recharge, statut, achever un Pokémon affaibli
//   • relèves : change de Pokémon quand le type est défavorable ou pour sauver un Pokémon affaibli
//   • équipe : 4 Pokémon pour le tournoi, les 3 meilleurs contre ton équipe, le meilleur face à ton 1er Pokémon
//   • objets : chaque Pokémon de l'IA porte un objet adapté (figé pour le tournoi, comme les tiens)
const tMel = m => !!(m && (m.mel || ['melee', 'uppercut', 'roll', 'hug', 'xspeed'].includes(m.k)));
function tAiItems(team){
  const used = new Set(), o = {};
  team.forEach(id => {
    const H = HERO[id], mv = (MV[id] || []).filter(m => m.d > 0), main = mv.slice().sort((a, b) => b.d - a.d)[0];
    const tb = main && HELD.find(h => h.fx && h.fx.type === (main.tp || typesOf(id)[0]));
    const c = [];
    if(H.hp < 105) c.push('ceinture-force');
    if(H.hp >= 130) c.push('restes');
    if(mv.filter(tMel).length >= 2) c.push('grelot-coque');
    c.push('orbe-vie'); if(tb) c.push(tb.id); c.push('ceinture-pro', 'baie-sitrus', 'baie-prine', 'bandeau');
    const pick = c.find(x => HELD_BY_ID[x] && !used.has(x)); if(pick){ used.add(pick); o[id] = pick; }
  });
  return o;
}
const tEnemyItem = id => { const it = G && G.cfg && G.cfg.tourItems && G.cfg.tourItems[id]; return it && HELD_BY_ID[it] ? it : null; };
// un Pokémon de l'IA qui entre par une relève : vrais PV + objet
if(typeof freshEnemy === 'function') freshEnemy = (prev => function(idx, x, y){ const o = prev(idx, x, y); if(G && G.cfg && G.cfg.mode === 'tourney'){ o.hp = o.max = Math.round(HERO[o.t].hp*(G.stage.hp || 1)); o.item = tEnemyItem(o.t); o.tq = { dodge:0, last:-9 }; } return o; })(freshEnemy);
// objets de l'IA : attaque (type, Ceinture Pro, Orbe Vie, Grelot Coque)
hurtP = (prev => function(d, b){
  const e = G && G.e, fx = G && G.cfg && G.cfg.mode === 'tourney' && e && e.item && HELD_BY_ID[e.item] ? HELD_BY_ID[e.item].fx : null;
  if(!fx || !b || d <= 0) return prev(d, b);
  const tp = b.t || b.tp || e.t;
  if(fx.type && tp === fx.type) d *= fx.mult || 1.1;
  if(fx.superEff && typeMult(tp, G.p.t) > 1) d *= fx.superEff;
  if(fx.dmg) d *= fx.dmg;
  const p = G.p, h0 = p.hp, r = prev(d, b), dealt = Math.max(0, h0 - Math.max(0, p.hp));
  if(dealt > 0 && e.hp > 0){
    if(fx.drainHit) e.hp = Math.min(e.max, e.hp + dealt*fx.drainHit);
    if(fx.recoil && G.time - (e.recT || -9) > .4){ e.recT = G.time; e.hp = Math.max(1, e.hp - e.max*fx.recoil); }
  }
  return r;
})(hurtP);
// objets de l'IA : défense (Ceinture Force, Bandeau, Casque Brut)
hurtE = (prev => function(d, b){
  const e = G && G.e, h = G && G.cfg && G.cfg.mode === 'tourney' && e && e.item && HELD_BY_ID[e.item], fx = h && h.fx;
  if(!fx || e.hp <= 0) return prev(d, b);
  const sash = fx.sash && !e.sashUsed && e.hp >= e.max - .01, band = fx.endure && Math.random() < fx.endure;
  let r;
  if(sash || band){ const BIG = 1e6; e.hp += BIG; e.max += BIG; r = prev(d, b); e.hp -= BIG; e.max -= BIG; if(e.hp <= 0){ e.hp = 1; if(sash) e.sashUsed = 1; heldPop(e, h, '#ffb070'); } }
  else r = prev(d, b);
  if(fx.helmet && b && tMel(b) && G.p && G.p.hp > 0){ const l = Math.max(1, G.p.max*fx.helmet); G.p.hp -= l; dmgTxt(G.p.x, G.p.y - 48, '-' + Math.round(l*10) + ' ' + h.name, '#ffb08a'); }
  return r;
})(hurtE);
function tAiItemsStep(e, dt){
  const h = e.item && HELD_BY_ID[e.item], fx = h && h.fx; if(!fx || e.hp <= 0 || e.hid) return;
  if(fx.regen && e.hp < e.max) e.hp = Math.min(e.max, e.hp + e.max*fx.regen*dt);
  if(fx.heal && !e.berryHp && e.hp < e.max*fx.heal.below){ e.berryHp = 1; const g = e.max*fx.heal.amount; e.hp = Math.min(e.max, e.hp + g); heldPop(e, h, '#8dff9a'); }
  if(fx.cure && !e.berrySt && e.st && (fx.cure.includes('any') || fx.cure.includes(e.st))){ e.berrySt = 1; e.st = null; e.stT = 0; heldPop(e, h, '#9fe3ff'); }
}
// prévision : la plupart du temps elle anticipe ton déplacement, parfois elle vise où tu es (pour punir les demi-tours)
eFire = (prev => function(){
  if(!(G && G.cfg && G.cfg.mode === 'tourney' && G.p)) return prev();
  const p = G.p, vx = p.vx, vy = p.vy, w = G.wave, r = Math.random(), k = r < .6 ? 1 : r < .82 ? .5 : 0;
  p.vx = (vx || 0)*k; p.vy = (vy || 0)*k; G.wave = 0;          // G.wave = 0 : pas de bonus de dégâts « adversaire suivant »
  try{ return prev(); } finally { p.vx = vx; p.vy = vy; G.wave = w; }
})(eFire);
function tAiThink(dt){
  const e = G.e, p = G.p; if(!e || e.hp <= 0 || G.intro > 0 || G.wait || !p || p.hp <= 0 || !MV[e.t] || e.hid) return;
  const sk = (G.tour && G.tour.skill) || 1, Q = e.tq || (e.tq = { dodge:0, last:-9, orb:Math.random() < .5 ? 1 : -1, orbT:0 }), dx0 = p.x - e.x, dy0 = p.y - e.y, dist = Math.hypot(dx0, dy0) || 1;
  if(!Q.orb){ Q.orb = Math.random() < .5 ? 1 : -1; Q.orbT = 0; }
  tAiItemsStep(e, dt);
  // 1. réflexes : esquive sur le côté le plus sûr
  if(G.time >= Q.dodge && !e.kb && !(e.tele > 0 && e.tele < .12)){
    let threat = null;
    for(const b of bullets){ if(!b.own) continue; const dx = e.x - b.x, dy = e.y - b.y, vv = b.vx*b.vx + b.vy*b.vy; if(vv < 1) continue;
      const t = (dx*b.vx + dy*b.vy)/vv; if(t < 0 || t > .5) continue; const mx = b.x + b.vx*t - e.x, my = b.y + b.vy*t - e.y;
      if(Math.hypot(mx, my) < e.r + (b.r || 5) + 12){ threat = Math.atan2(b.vy, b.vx); threat += (mx*b.vy - my*b.vx > 0 ? -1 : 1)*Math.PI/2; break; } }
    if(threat == null && p.rs && dist < 230) threat = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() < .5 ? 1 : -1)*1.25;
    if(threat == null && typeof ZONES !== 'undefined') for(const z of ZONES){ if(!z.own || z.done) continue; if(Math.hypot(e.x - z.x, e.y - z.y) < z.R + e.r + 8){ threat = Math.atan2(e.y - z.y, e.x - z.x); break; } }
    if(threat != null && Math.random() < Math.min(.95, .78 + .3*(sk - 1))){
      // si l'esquive mène dans un mur, on part de l'autre côté
      const land = a => { const x = e.x + Math.cos(a)*90, y = e.y + Math.sin(a)*90; return Math.min(x - 40, W - 40 - x, y - 50, H - 40 - y); };
      if(land(threat) < 0 && land(threat + Math.PI) > land(threat)) threat += Math.PI;
      throwBack(e, threat, 90, .17); Q.dodge = G.time + .8/sk;
    }
  }
  if(e.kb) return;
  // 2. placement : distance idéale, on tourne autour, repli quand les PV sont bas
  const myMel = MV[e.t].filter(tMel).length, hisMel = (MV[p.t] || []).filter(tMel).length, low = e.hp < e.max*.35;
  let want = myMel >= 2 ? 150 : 250;
  if(myMel < 2 && hisMel >= 2) want = 290;            // garde le corps à corps adverse à distance
  if(low && myMel < 2) want += 90;                    // repli stratégique
  if(p.hp < p.max*.3 && !low) want -= 40;             // presse un adversaire affaibli
  const k = (dist - want)*Math.min(1, dt*1.6);
  let nx = e.x + dx0/dist*k*.65, ny = e.y + dy0/dist*k*.65;
  if(G.time > Q.orbT){ Q.orbT = G.time + 1.5 + Math.random()*2; if(Math.random() < .4) Q.orb *= -1; }
  const os = 60*dt*(low ? 1.4 : 1); nx += -dy0/dist*os*Q.orb; ny += dx0/dist*os*Q.orb;
  if(nx < 50 || nx > W - 50 || ny < 60 || ny > H - 50) Q.orb *= -1;
  e.x = clX(nx); e.y = clY(ny);
  // 3. rayons : la visée suit pendant la charge et se bloque juste avant le tir
  if(e.tele > .2 && MV[e.t][e.pat] && MV[e.t][e.pat].k === 'beam'){ const T = .25; e.aim = Math.atan2(p.y + (p.vy || 0)*T - e.y, p.x + (p.vx || 0)*T - e.x); }
}
function tAiPick(e){
  const p = G.p, L = MV[e.t], dist = Math.hypot(p.x - e.x, p.y - e.y), cd = e.tcd || (e.tcd = {});
  const stuck = p.st === 'par' || p.st === 'slow' || p.st === 'slp' || p.st === 'frz' || p.dC > 0;
  let best = 0, bs = -1e9;
  L.forEach((m, i) => {
    if((cd[i] || 0) > G.time) return;
    let s = (m.d || 5)*typeMult(m.tp || e.t, p.t)/Math.sqrt(Math.max(.6, m.cd || 1));
    if(tMel(m)) s *= dist < 230 ? 1.4 : .1;
    else if(dist < 110 && !isBig(m)) s *= .8;
    if(isBig(m)) s *= stuck ? 1.7 : dist > 350 ? .7 : .95;
    if(m.d <= 0 && (m.st || m.k === 'status')) s = p.st ? 0 : 14;          // statut : seulement si tu n'en as pas déjà un
    if(p.hp < p.max*.25 && !isBig(m)) s *= 1.3;                            // achever vite, avec une attaque rapide
    s *= .9 + Math.random()*.2;
    if(s > bs){ bs = s; best = i; }
  });
  cd[best] = G.time + (L[best].cd || 1)*.85;
  return best;
}
const AI_SWAP_DEF = typeof AI_SWAP !== 'undefined' ? { ...AI_SWAP } : null;
step = (prev => function(dt){
  const T = G && G.cfg && G.cfg.mode === 'tourney' && !G.over && !G.paused, e = T ? G.e : null, n0 = e ? e.next : 0;
  if(AI_SWAP_DEF){ if(T) Object.assign(AI_SWAP, { chance:.75, lowChance:.4, gain:1, cooldown:6, think:.35 }); else Object.assign(AI_SWAP, AI_SWAP_DEF); }
  prev(dt);
  if(!T || !G || G.over || G.paused || HS > 0 || G.e !== e) return;
  try{
    if(e.tele > 0 && !e._tq){ e._tq = 1; e.pat = tAiPick(e); const big = isBig(MV[e.t][e.pat]); e.tele = e.tm = Math.max(.3, (big ? .85 : .5)*G.stage.tele); if(MV[e.t][e.pat].k === 'beam') e.aim = Math.atan2(G.p.y - e.y, G.p.x - e.x); }
    if(!(e.tele > 0)) e._tq = 0;
    if(e.next > n0 + .15) e.next = (.62 + Math.random()*.3)*G.stage.rate;          // cadence fixe (pas de bonus « adversaire suivant »)
    tAiThink(dt);
  }catch(err){ console.warn('tour ai', err); }
})(step);

// ---------------------------------------------------------------- ÉCRANS
const tSprite = id => thumb(id);
const tFmt = s => Math.max(0, Math.floor(s/60)) + ':' + String(Math.max(0, Math.floor(s)) % 60).padStart(2, '0');
function showTourney(){
  G = null;
  const cur = TSave.d().cur; if(!TO && cur && cur.solo && cur.phase !== 'done'){ TO = cur; tLoop(); return tShow(); }
  if(TO){ return tShow(); }
  const C = TSave.d().stats, wr = C.matches ? Math.round(C.wins/C.matches*100) : 0;
  const fav = Object.entries(C.mons).sort((a, b) => b[1].used - a[1].used)[0];
  menu(`<div class='hd' data-trscene><h1>Tournoi</h1>${walletHtml()}</div>
    <div class='edit trhome'><div class='scroll left'>
      <p class='mini'>Élimination directe, combats <b>3 contre 3</b> sans bonus de stats. Les adversaires IA jouent <b>très bien</b> : prépare ton équipe et tes objets !
        Entre deux combats : <b>3 minutes</b> pour changer ton équipe (le combat part dès que les deux joueurs sont prêts).</p>
      <div class='trbox'><b>Solo</b><div class='row'><button class='btn' data-ts='8'>Tournoi à 8</button><button class='btn' data-ts='16'>Tournoi à 16</button></div></div>
      <div class='trbox'><b>En ligne</b><small>${typeof Online !== 'undefined' && Online.user ? 'Crée un tournoi et donne le code à tes amis (l\'IA complète les places libres).' : 'Sans compte : test local entre 2 onglets du même navigateur.'}</small>
        <div class='row'><button class='btn2' data-to='8'>Créer (8)</button><button class='btn2' data-to='16'>Créer (16)</button><input id='trcode' maxlength='5' placeholder='CODE' autocomplete='off'><button class='btn2' id='trjoin'>Rejoindre</button></div></div>
      <div class='row'><button class='btn2' id='trteam'>Mon équipe de tournoi</button></div>
    </div><div class='scroll right'><p class='trh'>Ma carrière</p>
      <div class='trst'>${[['Tournois', C.played], ['Victoires', C.won], ['Finales', C.finals], ['Meilleure place', C.best ? (C.best === 1 ? '1er' : C.best + 'e') : '—'], ['Combats', C.matches], ['Taux de victoire', wr + ' %'], ['K.O. infligés', C.ko], ['K.O. subis', C.kod],
        ['Dégâts infligés', C.dmg], ['Dégâts subis', C.dmgT], ['Temps de combat', tFmt(C.time)], ['Favori', fav ? NAME[fav[0]] : '—']].map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`).join('')}</div>
      ${Object.keys(C.mons).length ? `<p class='trh'>Mes Pokémon en tournoi</p><table class='trtab'><tr><th></th><th>Combats</th><th>Vict.</th><th>K.O.</th></tr>${Object.entries(C.mons).sort((a, b) => b[1].used - a[1].used).slice(0, 8).map(([id, M]) => `<tr><td>${tSprite(id)} ${esc(NAME[id] || id)}</td><td>${M.used}</td><td>${Math.round(M.wins/M.used*100)} %</td><td>${M.ko}</td></tr>`).join('')}</table>` : ''}
      ${C.hist.length ? `<p class='trh'>Derniers tournois</p>${C.hist.slice(-5).reverse().map(h => `<p class='trhi'>${new Date(h.t).toLocaleDateString('fr-FR')} · ${h.size} joueurs${h.online ? ' · en ligne' : ''} · <b>${h.place === 1 ? '🏆 Vainqueur' : h.place + 'e'}</b></p>`).join('')}` : ''}
    </div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-ts]', b => { const T = TEng.create({ solo:true, size:+b.dataset.ts, players:[{ id:tMyId(), name:tMyName(), kind:'me', team:TSave.team().members.slice(), res:TSave.team().res || null, items:TSave.items() }] }); TO = T; TEng.begin(T); tSave(); tLoop(); tShow(); });
  bindAll('[data-to]', b => { const code = Math.random().toString(36).slice(2, 7).toUpperCase().replace(/[^A-Z0-9]/g, 'X'); tNetOpen(code, true); TO = TEng.create({ code, size:+b.dataset.to, players:[{ id:tMyId(), name:tMyName(), kind:'human', team:TSave.team().members.slice(), res:TSave.team().res || null, items:TSave.items() }] }); tLoop(); tShow(); });
  const inp = document.getElementById('trcode'); inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  document.getElementById('trjoin').onclick = () => { const c = inp.value; if(c.length !== 5) return inp.classList.add('bad'); TO = { code:c, phase:'lobby', players:[], rounds:[], wait:true }; tNetOpen(c, false); tLoop();
    const hello = () => { if(!TNET || TNET.host) return; if(TO && TO.wait){ tSend('join', { id:tMyId(), name:tMyName(), team:TSave.team().members.slice(), res:TSave.team().res || null, items:TSave.items() }); setTimeout(hello, 1500); } };
    hello(); setTimeout(() => { if(TO && TO.wait){ tNetClose(); TO = null; gameConfirm('Tournoi introuvable', 'Aucun tournoi avec le code <b>' + esc(c) + '</b>.', 'OK', showTourney); } }, 10000); tShow(); };
  document.getElementById('trteam').onclick = () => tTeamEdit(showTourney);
  document.getElementById('back').onclick = showMain;
}
SCREENS.tourney = showTourney;
// écran principal du tournoi : arbre en direct + mon prochain combat
let TSHOWN = false, TMSG = '';
function tShow(msg){ if(msg) TMSG = msg; TSHOWN = true; tRender(true); }
function tRender(force){
  if(!TO || !TSHOWN) return;
  if(G && !G.over) return;                                   // pendant un combat
  if(!force && !document.querySelector('#menu .trv')) return;  // l'écran du tournoi n'est pas affiché
  const T = TO, me = tMyId();
  if(T.wait && !T.players.length){ menu(`<div class='hd' data-trscene><h1>Tournoi ${esc(T.code)}</h1></div><div class='trv'><p>Connexion au tournoi <b>${esc(T.code)}</b>…</p></div><div class='row'><button class='btn2' id='trq'>Annuler</button></div>`); document.getElementById('trq').onclick = () => { tNetClose(); TO = null; showTourney(); }; return; }
  if(T.wait) T.wait = false;
  if(T.phase === 'lobby') return tLobby();
  const m = tMine(T), F = m ? tP(T, m.a === me ? m.b : m.a) : null, R = T.rounds[T.round] || [], live = m && m.state === 'live', out = (!m || (m.state === 'done' && m.w !== me)) && T.phase !== 'done', qual = m && m.state === 'done' && m.w === me;
  const left = Math.max(0, (T.deadline - tNow())/1000);
  const box = (x, r, i) => { const A = tP(T, x.a), B = tP(T, x.b), cls = id => (x.w === id ? 'win' : x.state === 'done' ? 'lose' : '') + (id === me ? ' me' : '');
    const row = (P, id) => `<div class='trp ${cls(id)}' data-tp='${id}'>${P && P.team && P.team[0] ? tSprite(P.team[0]) : ''}<span>${esc(P ? P.name : '?')}</span><em>${x.state === 'done' && x.res ? x.res[id] : ''}</em></div>`;
    return `<div class='trm ${x.state}'>${row(A, x.a)}${row(B, x.b)}<i class='trs'>${x.state === 'live' ? '⚔ en cours' : x.state === 'done' ? '' : T.ready[x.a] && T.ready[x.b] ? 'prêts' : '⏳'}</i></div>`; };
  const tree = T.rounds.map((Rr, r) => `<div class='trc'><p>${TROUND(Rr.length)}</p>${Rr.map((x, i) => box(x, r, i)).join('')}</div>`).join('') +
    Array.from({ length:Math.max(0, Math.log2(T.size) - T.rounds.length) }, (_, k) => { const n = T.size/Math.pow(2, T.rounds.length + k + 1); return `<div class='trc'><p>${TROUND(n)}</p>${Array.from({ length:n }, () => `<div class='trm wait'><div class='trp'><span>?</span></div><div class='trp'><span>?</span></div></div>`).join('')}</div>`; }).join('') +
    (T.champ ? `<div class='trc champ'><p>Champion</p><div class='trm done'><div class='trp win'>${tSprite((tP(T, T.champ).team || [])[0])}<span>🏆 ${esc(tP(T, T.champ).name)}</span></div></div></div>` : '');
  const head = T.phase === 'done' ? T.champ === me ? `<b>🏆 Tu remportes le tournoi !</b>` : `<b>🏆 ${esc(tP(T, T.champ).name)} remporte le tournoi !</b>`
    : out ? `Tu es éliminé. Le tournoi continue : <b>${TROUND(R.length)}</b>`
    : qual ? `✔ Qualifié ! En attente de la fin des autres combats (${TROUND(R.length)})…`
    : live ? `⚔ Ton combat contre <b>${esc(F.name)}</b> commence !`
    : `<b>${TROUND(R.length)}</b> — prochain adversaire : <b>${esc(F.name)}</b> ${(F.team || []).map(tSprite).join('')} <span class='trtime' id='trtime'>${tFmt(left)}</span>`;
  menu(`<div class='hd' data-trscene><h1>Tournoi${T.code ? ' ' + esc(T.code) : ''}</h1>${walletHtml()}</div>
    <div class='trv'><p class='trhead'>${head}</p>${TMSG ? `<p class='trmsg'>${esc(TMSG)}</p>` : ''}
      <div class='trtree'>${tree}</div></div>
    <div class='row'>${m && m.state === 'wait' ? `<button class='btn2' id='trteam'>Mon équipe ${TSave.team().members.map(tSprite).join('')}${TSave.team().res ? ` <small>+</small> <span style='opacity:.6'>${tSprite(TSave.team().res)}</span>` : ''}</button><button class='btn ${T.ready[me] ? 'on' : ''}' id='trready'>${T.ready[me] ? '✔ Prêt — en attente' : 'Prêt !'}</button>` : ''}
      <button class='btn2' id='trstats'>Statistiques</button>${T.phase === 'done' || out ? `<button class='btn2' id='trquit'>Quitter</button>` : `<button class='btn2' id='trab'>Abandonner</button>`}</div>`);
  TMSG = '';
  const on = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };
  on('trteam', () => tTeamEdit(() => tShow()));
  on('trready', () => { const v = !T.ready[me]; if(T.solo || (TNET && TNET.host)){ T.ready[me] = v; tBroadcast(); TEng.tick(T); tSave(); tAfterUpdate(); } else { T.ready[me] = v; tSend('ready', { id:me, r:v }); } tRender(true); });
  on('trstats', () => tStats());
  on('trquit', () => tQuit());
  on('trab', () => gameConfirm('Abandonner le tournoi ?', 'Tu perds tes prochains combats par forfait.', 'Abandonner', () => { if(m && m.state !== 'done'){ TLIVE = { r:T.round, i:R.indexOf(m), foe:m.a === me ? m.b : m.a, st:{ ko:0, kod:3, dmg:0, dmgT:0, time:0, mvp:{} } }; if(m.state === 'wait'){ m.state = 'live'; } tReport(false); } tQuit(); }));
  bindAll('[data-tp]', el => tStats(el.dataset.tp));
}
function tTimerUi(){
  const el = document.getElementById('trtime'); if(el && TO) el.textContent = tFmt((TO.deadline - tNow())/1000);
  if(TO && TO.phase !== 'done' && !(G && !G.over) && document.querySelector('#menu .trv')){ const m = tMine(TO); if(m && m.state === 'live' && !TLIVE) tStartMatch(m); }
}
function tLobby(){
  const T = TO, host = TNET && TNET.host;
  menu(`<div class='hd' data-trscene><h1>Tournoi ${esc(T.code)}</h1></div>
    <div class='trv'><div class='rncode'><small>CODE DU TOURNOI</small><b>${esc(T.code)}</b><small>${TNET && TNET.kind === 'local' ? 'Test local : ouvre le jeu dans un autre onglet → Tournoi → Rejoindre' : 'Donne ce code à tes amis'}</small></div>
      <p>${T.players.length}/${T.size} joueurs — l'IA complétera les places libres.</p>
      <div class='trlob'>${T.players.map(p => `<div class='trp'>${(p.team || []).map(tSprite).join('')}<span>${esc(p.name)}${p.id === tMyId() ? ' (toi)' : ''}</span></div>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='trteam'>Mon équipe</button>${host ? `<button class='btn' id='trgo'>Lancer le tournoi</button>` : `<small>En attente du créateur…</small>`}<button class='btn2' id='trq'>Quitter</button></div>`);
  document.getElementById('trteam').onclick = () => tTeamEdit(() => tShow());
  const go = document.getElementById('trgo'); if(go) go.onclick = () => { TEng.begin(T); tBroadcast(); tAfterUpdate(); tRender(true); };
  document.getElementById('trq').onclick = () => tQuit();
}
function tQuit(){ tNetClose(); const T = TO; TO = null; TSHOWN = false; TLIVE = null; if(T && T.solo){ delete TSave.d().cur; Save.save(); } showTourney(); }
// fin du tournoi : place, récompense, carrière
function tFinish(){
  const T = TO, me = tMyId(), pl = TEng.place(T, me), C = TSave.d().stats;
  if(!tP(T, me)) return;
  C.played++; if(pl === 1) C.won++; if(pl && pl <= 2) C.finals++; if(pl && pl <= 4) C.semis++; if(pl && (!C.best || pl < C.best)) C.best = pl;
  C.hist.push({ t:Date.now(), size:T.size, place:pl, online:!T.solo }); if(C.hist.length > 30) C.hist.shift();
  const gain = Math.round((TOUR.rewards[pl] || 20)*(typeof MONEY_RATE !== 'undefined' ? MONEY_RATE : 1)*(T.size === 16 ? 1.3 : 1));
  Save.addCoins(gain); if(T.solo) delete TSave.d().cur; Save.save();
  if(typeof Badges !== 'undefined') Badges.check();
  TMSG = pl === 1 ? `🏆 Tu remportes le tournoi ! +${money(gain)}` : `Tournoi terminé : ${pl === 2 ? 'finaliste' : pl + 'e place'} · +${money(gain)}`;
}
// équipe de tournoi : 3 titulaires + 1 remplaçant, figés pour tout le tournoi.
//   Avant le début : choix libre parmi tes Pokémon. Pendant le tournoi : seul échange possible, remplaçant ⇄ titulaire
//   (glisser-déposer comme dans « Mes équipes », ou bouton ⇄). Les objets se changent entre deux combats.
let TSEL = 0;
function tLocked(){ const P = TO && TO.phase !== 'lobby' && !TO.wait ? tP(TO, tMyId()) : null; return P && P.squad && P.squad.length ? P.squad : null; }
function tTeamEdit(back){
  const t = TSave.team(), inv = Save.inv(), m = TO && tMine(TO), me = tMyId(), F = m ? tP(TO, m.a === me ? m.b : m.a) : null, lock = tLocked();
  if(lock){ // sécurité : l'équipe locale doit rester dans l'escouade du tournoi
    if(!t.members.every(id => lock.includes(id)) || t.members.length !== Math.min(3, lock.length)){ t.members = lock.slice(0, 3); t.res = lock[3] || null; }
    if(t.res && !lock.includes(t.res)) t.res = lock.find(id => !t.members.includes(id)) || null;
  }
  const LP = lock && tP(TO, me); if(LP && LP.lockItems) t.items = { ...LP.lockItems };
  const arr = [t.members[0], t.members[1], t.members[2], t.res || null];
  const mine = ORDER.filter(id => Owned.has(id)), items = HELD.filter(h => (inv[h.id] || 0) > 0), used = id => arr.some(x => x && t.items[x] === id);
  const cur = arr[TSEL], curIt = cur && t.items[cur] && HELD_BY_ID[t.items[cur]];
  const slot = i => { const id = arr[i], it = id && t.items[id] && HELD_BY_ID[t.items[id]];
    return `<div class='trslw'>${i === 3 ? `<small class='trlab'>Remplaçant</small>` : `<small class='trlab'>Titulaire ${i + 1}</small>`}<button class='trsl ${i === 3 ? 'trres' : ''} ${i === TSEL ? 'on' : ''}' data-sl='${i}'>${id ? tSprite(id) + `<b>${esc(NAME[id])}</b>` : '<em>+</em>'}${it ? `<img class='trit' src='${heldImg(it)}'>` : ''}</button>
      ${lock && i < 3 && arr[3] && id ? `<button class='btn2 sm trx' data-x='${i}' title='Échanger avec le remplaçant'>⇄ ${esc(NAME[arr[3]])}</button>` : ''}</div>`; };
  menu(`<div class='hd' data-trscene><h1>Équipe de tournoi</h1>${TO && TO.phase === 'prep' && m && m.state === 'wait' ? `<span class='trtime' id='trtime'>${tFmt((TO.deadline - tNow())/1000)}</span>` : ''}</div>
    ${F ? `<p class='trfoe'>Prochain adversaire : <b>${esc(F.name)}</b> ${(F.team || []).map(id => `<span class='trfm'>${tSprite(id)}${F.items && HELD_BY_ID[F.items[id]] ? `<img class='trfi' src='${heldImg(HELD_BY_ID[F.items[id]])}' title='${esc(HELD_BY_ID[F.items[id]].name)}'>` : ''}<small>${typesOf(id).map(x => TN[x] || x).join('/')}</small></span>`).join('')}</p>` : ''}
    <div class='edit trte'><div class='scroll left'>${lock
      ? `<p class='trh'>Équipe figée pour le tournoi</p><p class='mini'>Ton équipe de 4 est fixée jusqu'à la fin du tournoi. Entre deux combats, tu peux faire entrer ton <b>remplaçant</b> à la place d'un titulaire :
         <b>glisse-le sur un titulaire</b> (ou utilise le bouton ⇄). Tu peux aussi changer l'ordre des titulaires (le 1er commence le combat). Les objets tenus restent ceux du début du tournoi.</p>`
      : `<p class='mini'>Choisis <b>3 titulaires + 1 remplaçant</b> et leurs objets. Attention : équipe et objets sont <b>figés pour tout le tournoi</b> ; entre deux combats, seul le remplaçant pourra prendre la place d'un titulaire.
         Touche un Pokémon pour l'ajouter, ou glisse-le sur une place.</p><div class='trro'>${mine.map(id => `<button class='trr ${arr.includes(id) ? 'in' : ''}' data-tr='${id}' title='${esc(NAME[id])}'>${tSprite(id)}<small>${typesOf(id).map(x => `<i style='background:${COL[x]}'></i>`).join('')}</small></button>`).join('')}</div>`}</div>
      <div class='scroll right'><div class='trslots'>${[0, 1, 2].map(slot).join('')}<span class='trsep'></span>${slot(3)}</div>
        <p class='trh'>${cur ? `Objet de ${esc(NAME[cur])}${TSEL === 3 ? ' <small>(remplaçant)</small>' : ''}` : 'Choisis une place'}</p>
        ${cur && lock ? `<p class='trdesc'>${curIt ? `<img class='trdi' src='${heldImg(curIt)}'> <b>${esc(curIt.name)}</b> — ${esc(curIt.desc)}` : '<small>Aucun objet.</small>'}</p><p class='mini'>🔒 Les objets tenus sont figés pour tout le tournoi (le remplaçant garde le sien).</p>`
        : cur ? `<div class='tritems'><button class='btn2 sm ${!curIt ? 'on' : ''}' data-it=''>Aucun</button>${items.map(h => `<button class='triti ${t.items[cur] === h.id ? 'on' : ''} ${used(h.id) && t.items[cur] !== h.id ? 'used' : ''}' data-it='${h.id}' title='${esc(h.name)}'><img src='${heldImg(h)}'></button>`).join('')}</div>
          <p class='trdesc'>${curIt ? `<b>${esc(curIt.name)}</b> — ${esc(curIt.desc)}` : '<small>Touche un objet pour voir son effet et l\'équiper.</small>'}</p>` : ''}
      </div></div>
    <div class='row'><button class='btn' id='tok'>Valider</button></div>`);
  const write = () => { const L = arr.slice(0, 3).filter(Boolean); t.members = L; t.res = arr[3] || null; Object.keys(t.items).forEach(k => { if(!arr.includes(k)) delete t.items[k]; }); };
  const sync = () => { write(); Save.save(); if(TO){ const P = tP(TO, me); if(P){ P.team = t.members.slice(); P.res = t.res; P.items = TSave.items(); if(!lock && TO.phase === 'lobby') P.squad = null; }
    if(TNET && !TNET.host) tSend('team', { id:me, team:t.members.slice(), res:t.res, items:TSave.items() }); else tBroadcast(); } };
  const redraw = () => { sync(); tTeamEdit(back); };
  const swap = (a, b) => { if(a === b) return; if(lock && a < 3 && b < 3 && (!arr[a] || !arr[b])) return; [arr[a], arr[b]] = [arr[b], arr[a]];
    if(arr.slice(0, 3).filter(Boolean).length === 0){ [arr[a], arr[b]] = [arr[b], arr[a]]; return; } TSEL = b; redraw(); };
  const put = (id, i) => { if(lock) return; const k = arr.indexOf(id); if(k >= 0){ arr[k] = arr[i]; } arr[i] = id; TSEL = i; redraw(); };
  const tapRoster = id => { const k = arr.indexOf(id);
    if(k >= 0){ if(arr.filter(Boolean).length > 1){ arr[k] = null; delete t.items[id]; } return redraw(); }
    let i = arr.indexOf(null); if(i < 0 || (arr[TSEL] == null)) i = arr[TSEL] == null ? TSEL : i; if(i < 0) i = TSEL;
    put(id, i); };
  // glisser-déposer (Pokémon de la liste → place ; place → place)
  const startDrag = (el, ev, data) => {
    const x0 = ev.clientX, y0 = ev.clientY; let ghost = null;
    const mv = e => { if(!ghost && Math.hypot(e.clientX - x0, e.clientY - y0) > 8){ ghost = el.querySelector('img').cloneNode(); ghost.className = 'tdrag'; ghost.style.cssText = 'position:fixed;pointer-events:none;z-index:99;width:48px;height:48px;image-rendering:pixelated'; document.body.appendChild(ghost); el.classList.add('dragsrc'); }
      if(ghost){ ghost.style.left = e.clientX - 24 + 'px'; ghost.style.top = e.clientY - 24 + 'px'; document.querySelectorAll('.trsl').forEach(s => s.classList.remove('dropon')); const t2 = document.elementFromPoint(e.clientX, e.clientY), sl = t2 && t2.closest('[data-sl]'); if(sl) sl.classList.add('dropon'); } };
    const up = e => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); el.classList.remove('dragsrc');
      if(!ghost){ data.tap(); return; } ghost.remove(); const t2 = document.elementFromPoint(e.clientX, e.clientY), sl = t2 && t2.closest('[data-sl]'); if(sl) data.drop(+sl.dataset.sl); else redraw(); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  document.querySelectorAll('[data-tr]').forEach(b => { b.onpointerdown = ev => { ev.preventDefault(); const id = b.dataset.tr; startDrag(b, ev, { tap:() => tapRoster(id), drop:i => put(id, i) }); }; });
  document.querySelectorAll('[data-sl]').forEach(b => { b.onpointerdown = ev => { ev.preventDefault(); const i = +b.dataset.sl; if(!arr[i]){ TSEL = i; return tTeamEdit(back); } startDrag(b, ev, { tap:() => { TSEL = i; tTeamEdit(back); }, drop:j => swap(i, j) }); }; });
  bindAll('[data-x]', b => swap(3, +b.dataset.x));
  bindAll('[data-it]', b => { if(!cur || lock) return; const v = b.dataset.it; if(!v) delete t.items[cur]; else { arr.forEach(x => { if(x && t.items[x] === v && (inv[v] || 0) < 2) delete t.items[x]; }); t.items[cur] = v; } redraw(); });
  document.getElementById('tok').onclick = () => { if(!lock && !t.res && mine.length > 3) return gameConfirm('Pas de remplaçant', 'Tu n\'as pas choisi de remplaçant. Sans lui, tu ne pourras rien changer pendant le tournoi.', 'Continuer quand même', () => { TSEL = 0; back(); }); TSEL = 0; back(); };
}
// statistiques détaillées du tournoi (tous les participants) ou d'un joueur
function tStats(pid){
  const T = TO; if(!T) return;
  const rows = T.players.map(p => ({ p, S:T.stats[p.id] || { w:0, l:0, ko:0, kod:0, dmg:0, dmgT:0, time:0, played:0, mvp:{} } })).sort((a, b) => b.S.w - a.S.w || (b.S.ko - b.S.kod) - (a.S.ko - a.S.kod));
  const one = pid && rows.find(r => r.p.id === pid);
  const det = one ? (() => { const { p, S } = one, mvp = Object.entries(S.mvp).sort((a, b) => b[1] - a[1])[0];
    return `<div class='trone'><p class='trh'>${esc(p.name)}${p.kind === 'ai' ? ` <small>IA · niveau ${Math.round((p.skill || (p.ai && p.ai.skill) || 1)*100)}</small>` : ''}</p><div>${(p.team || []).map(tSprite).join('')}</div>
      <div class='trst'>${[['Combats', S.played], ['Victoires', S.w], ['Défaites', S.l], ['K.O. infligés', S.ko], ['K.O. subis', S.kod], ['Dégâts infligés', S.dmg], ['Dégâts subis', S.dmgT], ['Temps', tFmt(S.time)], ['Dégâts / combat', S.played ? Math.round(S.dmg/S.played) : 0], ['Meilleur Pokémon', mvp ? NAME[mvp[0]] : '—'], ['Place', T.phase === 'done' ? (TEng.place(T, p.id) === 1 ? '🏆 1er' : TEng.place(T, p.id) + 'e') : (T.rounds[T.round] || []).some(x => (x.a === p.id || x.b === p.id)) ? 'en lice' : 'éliminé']].map(([k, v]) => `<div><b>${v}</b><small>${k}</small></div>`).join('')}</div></div>`; })() : '';
  menu(`<div class='hd' data-trscene><h1>Statistiques du tournoi</h1></div>${det}
    <div class='scroll trsc'><table class='trtab'><tr><th>Joueur</th><th>V</th><th>D</th><th>K.O.</th><th>Subis</th><th>Dégâts</th><th>Reçus</th><th>Temps</th></tr>
      ${rows.map(({ p, S }) => `<tr class='${p.id === tMyId() ? 'me' : ''}' data-tp='${p.id}'><td>${(p.team || []).slice(0, 1).map(tSprite).join('')} ${esc(p.name)}</td><td>${S.w}</td><td>${S.l}</td><td>${S.ko}</td><td>${S.kod}</td><td>${S.dmg}</td><td>${S.dmgT}</td><td>${tFmt(S.time)}</td></tr>`).join('')}</table></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-tp]', el => tStats(el.dataset.tp));
  document.getElementById('back').onclick = () => tShow();
}

// ---------------------------------------------------------------- menu, badge, musique
if(!MAIN_MENU.some(m => m.id === 'tourney')){ const i = MAIN_MENU.findIndex(m => m.id === 'tower'); MAIN_MENU.splice(i >= 0 ? i + 1 : MAIN_MENU.length, 0, { id:'tourney', label:'Tournoi', desc:'Tournoi à 8 ou 16, solo ou en ligne, contre une IA redoutable', screen:'tourney' }); }
if(typeof MM_GROUPS !== 'undefined'){ const g = MM_GROUPS.find(x => x.id === 'g-combat'); if(g && !g.kids.includes('tourney')){ g.kids.splice(g.kids.indexOf('tower') + 1, 0, 'tourney'); g.desc = 'Solo, Tour de Combat, Tournoi, Entraînement'; } }
if(typeof MUSIC !== 'undefined'){ if(!MUSIC.tourney) MUSIC.tourney = 'assets/music/tourney.mp3'; if(!MUSIC['tourney:final']) MUSIC['tourney:final'] = 'assets/music/tourney-final.mp3'; }
if(typeof BADGES !== 'undefined' && !BADGES.some(B => B.id === 'tourney')){
  const champIdx = BADGES.findIndex(B => B.id === 'champion');
  BADGES.splice(champIdx >= 0 ? champIdx : BADGES.length, 0, { id:'tourney', name:'Badge Tournoi', how:'Remporte un tournoi.', ok:() => (TSave.d().stats.won || 0) >= 1 });
  if(typeof BADGE_REWARD !== 'undefined') BADGE_REWARD.tourney = { coins:600 };
  if(typeof bdBDRAW !== 'undefined') bdBDRAW.tourney = c => { bdBGem(c, bdP2(p => { p.moveTo(14, 10); p.lineTo(50, 10); p.lineTo(46, 34); p.bezierCurveTo(44, 42, 20, 42, 18, 34); p.closePath(); }), '#c8d0dc');
    bdBGem(c, bdRect(27, 40, 10, 8, 1), '#9aa4b4'); bdBGem(c, bdRect(18, 48, 28, 8, 2), '#3a5ae8'); [[22, 20], [32, 16], [42, 20]].forEach(([x, y]) => { c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y + 4, 2.5, 0, 6.2832); c.fill(); }); bdShine(c, 22, 16, 3); };
}
document.head.insertAdjacentHTML('beforeend', `<style>
.trhome .left{flex:0 0 52%}.trbox{margin:6px 0;padding:6px 8px;border:1px solid #8a5a20;border-radius:10px;background:rgba(30,16,50,.6);text-align:left}.trbox>b{color:#ffe27a;font-size:13px}.trbox small{display:block;font-size:10px;color:var(--txt2,#c9bcd8);margin:2px 0}
input#trcode{width:96px;text-align:center;font:700 16px var(--font,monospace);letter-spacing:3px;background:rgba(10,8,24,.85);color:#ffe9a0;border:2px solid var(--line,#fff4);border-radius:8px;padding:4px}input#trcode.bad{border-color:#ff5a4a}
.trh{font-size:11px;letter-spacing:2px;text-transform:uppercase;color:#ffd890;margin:6px 0 3px;text-align:left}
.trst{display:grid;grid-template-columns:repeat(3,1fr);gap:4px}.trst div{display:flex;flex-direction:column;align-items:center;padding:3px;border-radius:7px;background:rgba(255,255,255,.06)}.trst b{font-size:12px;color:#fff3c8}.trst small{font-size:8px;color:var(--txt2,#c9bcd8);text-align:center}
.trtab{width:100%;border-collapse:collapse;font-size:10px}.trtab th{color:#ffd890;font-weight:600;padding:2px}.trtab td{padding:2px 4px;text-align:center;border-top:1px solid rgba(255,255,255,.06)}.trtab td:first-child{text-align:left;white-space:nowrap}.trtab tr.me td{background:rgba(255,210,63,.15)}.trtab tr[data-tp]{cursor:pointer}
.trtab img{width:18px;height:18px;image-rendering:pixelated;vertical-align:middle}.trhi{font-size:10px;margin:1px 0;text-align:left}
.trv{width:100%;max-width:980px;display:flex;flex-direction:column;align-items:center;min-height:0;flex:1 1 auto}
.trhead{font-size:13px;margin:2px 0;display:flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center}.trhead img{width:24px;height:24px;image-rendering:pixelated}.trmsg{font-size:12px;color:#7aff9a;margin:2px 0}
.trtime{font:700 15px var(--font);color:#ffd23f;background:rgba(0,0,0,.4);padding:1px 8px;border-radius:8px;border:1px solid #ffd23f}
.trtree{display:flex;gap:10px;overflow:auto;max-width:100%;max-height:100%;padding:4px;align-items:stretch;flex:1 1 auto}
.trc{display:flex;flex-direction:column;justify-content:space-around;gap:6px;min-width:150px}.trc>p{margin:0;font-size:10px;color:#ffd890;text-align:center;letter-spacing:1px;text-transform:uppercase}
.trm{position:relative;flex:0 0 auto;border:1px solid #5a3a24;border-radius:8px;background:rgba(20,10,30,.8);overflow:hidden}.trm.live{border-color:#ff8a3c;box-shadow:0 0 8px rgba(255,138,60,.5)}.trm.done{opacity:.95}
.trp{display:flex;align-items:center;gap:4px;padding:2px 5px;font-size:10px;cursor:pointer;min-height:22px}.trp+.trp{border-top:1px solid rgba(255,255,255,.08)}.trp img{width:20px;height:20px;image-rendering:pixelated}.trp span{flex:1;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:110px}
.trp em{font-style:normal;color:#ffd23f;font-weight:700}.trp.win{background:rgba(70,216,106,.18)}.trp.win span{color:#aef5c0}.trp.lose{opacity:.5}.trp.me span{color:#ffe27a;font-weight:700}
.trs{position:absolute;right:4px;top:50%;transform:translateY(-50%);font-style:normal;font-size:8px;color:#ffb070}.trc.champ .trm{border-color:#ffd23f}
.trlob{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;max-width:640px}.trlob .trp{border:1px solid #5a3a24;border-radius:8px;background:rgba(20,10,30,.8)}
.trfoe{font-size:12px;display:flex;align-items:center;gap:6px;justify-content:center;flex-wrap:wrap}.trfm{display:inline-flex;flex-direction:column;align-items:center}.trfm img{width:30px;height:30px;image-rendering:pixelated}.trfm small{font-size:8px}.trfm{position:relative}.trfm .trfi{position:absolute;top:0;right:-4px;width:14px!important;height:14px!important}
.trte .left{flex:0 0 52%}.trro{display:flex;flex-wrap:wrap;gap:4px}.trr{width:52px;padding:2px;border-radius:8px;border:1px solid rgba(255,255,255,.15);background:rgba(255,255,255,.05);cursor:pointer;display:flex;flex-direction:column;align-items:center}
.trr img{width:40px;height:40px;image-rendering:pixelated}.trr small{display:flex;gap:2px}.trr small i{width:8px;height:4px;border-radius:2px}.trr.in{border-color:#ffd23f;background:rgba(255,210,63,.15)}
.trslots{display:flex;gap:6px;justify-content:center;align-items:flex-end}.trslw{display:flex;flex-direction:column;align-items:center;gap:2px}.trlab{font-size:8px;letter-spacing:1px;text-transform:uppercase;color:#ffd890}.trsep{width:2px;align-self:stretch;background:rgba(255,210,63,.35);margin:0 4px}.trsl.trres{border-color:#3a8ae8}.trsl.trres.on{border-color:#7ab8ff}.trsl.dropon{box-shadow:0 0 0 3px #7aff9a}.trsl,.trr{touch-action:none}.trx{font-size:9px!important;padding:2px 5px!important}.trsl{position:relative;width:84px;min-height:70px;border-radius:10px;border:2px dashed #8a5a20;background:rgba(0,0,0,.3);color:#fff3c8;display:flex;flex-direction:column;align-items:center;justify-content:center;cursor:pointer;font-family:var(--font)}
.trsl.on{border-style:solid;border-color:#ffd23f}.trsl img{width:42px;height:42px;image-rendering:pixelated}.trsl b{font-size:10px}.trsl em{font-style:normal;font-size:20px;opacity:.6}.trsl .trit{position:absolute;top:3px;right:3px;width:18px!important;height:18px!important}
.tritems{display:flex;flex-wrap:wrap;gap:3px;justify-content:center}.triti{width:30px;height:30px;padding:2px;border-radius:7px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);cursor:pointer}.triti img{width:24px;height:24px}.triti.on{border-color:#ffd23f;box-shadow:0 0 6px #ffd23f}.triti.used{opacity:.35}
.trdesc{font-size:10px;margin:4px 0;text-align:left}.trdi{width:20px;height:20px;vertical-align:middle}.trdesc b{color:#ffe27a}
.trone{max-width:620px;width:100%}.trone>div:nth-child(2) img{width:34px;height:34px;image-rendering:pixelated}.trsc{max-width:760px;width:100%;background:rgba(14,8,30,.8);border-radius:12px;padding:6px}.trone{background:rgba(14,8,30,.8);border-radius:12px;padding:6px;margin-bottom:6px}
</style>`);

// ---------------------------------------------------------------- fond animé : stade du tournoi (projecteurs, foule, confettis)
const TRS = { t:0, L:null, conf:[], flash:0 };
function trsBuild(){
  const [sky, sx] = mkcv(VW, VH), g = sx.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#0a0820'); g.addColorStop(.55, '#1c1240'); g.addColorStop(1, '#2a1030'); sx.fillStyle = g; sx.fillRect(0, 0, VW, VH);
  for(let i = 0; i < 60; i++){ sx.fillStyle = `rgba(255,255,255,${.2 + Math.random()*.5})`; sx.fillRect(Math.random()*VW | 0, Math.random()*VH*.35 | 0, 1, 1); }
  // tribunes
  const rows = 6; for(let r = 0; r < rows; r++){ const y = 150 + r*26; sx.fillStyle = r % 2 ? '#20163a' : '#281c46'; sx.beginPath(); sx.moveTo(0, y + 30); sx.quadraticCurveTo(VW/2, y - 40, VW, y + 30); sx.lineTo(VW, y + 56); sx.quadraticCurveTo(VW/2, y - 14, 0, y + 56); sx.fill(); }
  // terrain
  sx.fillStyle = '#2e6a3a'; sx.beginPath(); sx.ellipse(VW/2, VH - 30, VW*.62, 90, 0, 0, 6.2832); sx.fill();
  sx.strokeStyle = 'rgba(255,255,255,.55)'; sx.lineWidth = 2; sx.beginPath(); sx.ellipse(VW/2, VH - 30, VW*.36, 50, 0, 0, 6.2832); sx.stroke(); sx.beginPath(); sx.moveTo(VW/2, VH - 120); sx.lineTo(VW/2, VH); sx.stroke();
  sx.beginPath(); sx.arc(VW/2, VH - 30, 16, 0, 6.2832); sx.stroke();
  // fanions
  ['#e8403a', '#3a6ae8', '#ffd23f', '#46d86a', '#b050e8'].forEach((c, i) => { for(let k = 0; k < 9; k++){ const x = 40 + k*100 + i*18; if(x > VW) continue; sx.fillStyle = c; sx.beginPath(); sx.moveTo(x, 132 + Math.sin(k)*4); sx.lineTo(x + 12, 132 + Math.sin(k)*4); sx.lineTo(x + 6, 146); sx.fill(); } });
  TRS.L = { sky, crowd:Array.from({ length:220 }, () => { const r = Math.random()*rows | 0, x = Math.random()*VW, y0 = 150 + r*26, y = y0 + 34 - 70*(1 - Math.pow((x - VW/2)/(VW/2), 2))*.55 + 6; return { x, y, c:['#ffd23f', '#e8403a', '#7ab8ff', '#f0e0ff', '#ff9ad2', '#9af5b0'][Math.random()*6 | 0], p:Math.random()*6.28 }; }) };
}
function drawTourneyScene(dt){
  if(!TRS.L) trsBuild();
  const L = TRS.L, t = TRS.t += dt;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.sky, 0, 0);
  // la foule qui saute
  L.crowd.forEach(c => { const j = Math.max(0, Math.sin(t*5 + c.p))*3; ctx.fillStyle = c.c; ctx.fillRect(c.x | 0, (c.y - j) | 0, 3, 4); ctx.fillStyle = '#e8c8a0'; ctx.fillRect(c.x | 0, (c.y - j - 3) | 0, 3, 3); });
  // projecteurs qui balaient
  ctx.globalCompositeOperation = 'lighter';
  [[60, .7], [VW - 60, -.7], [VW/2, 0]].forEach(([x, s], i) => { const a = Math.PI/2 + Math.sin(t*.6 + i*2)*.55 + s*.25, len = VH*1.2;
    const gr = ctx.createLinearGradient(x, 0, x + Math.cos(a)*len, Math.sin(a)*len); gr.addColorStop(0, 'rgba(255,240,200,.28)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + Math.cos(a - .09)*len, Math.sin(a - .09)*len); ctx.lineTo(x + Math.cos(a + .09)*len, Math.sin(a + .09)*len); ctx.fill(); });
  ctx.globalCompositeOperation = 'source-over';
  // flashs d'appareils photo
  if(Math.random() < dt*3){ const c = L.crowd[Math.random()*L.crowd.length | 0]; TRS.flash = { x:c.x, y:c.y - 4, t:.15 }; }
  if(TRS.flash && TRS.flash.t > 0){ TRS.flash.t -= dt; ctx.fillStyle = `rgba(255,255,255,${TRS.flash.t/.15})`; ctx.beginPath(); ctx.arc(TRS.flash.x, TRS.flash.y, 4, 0, 6.2832); ctx.fill(); }
  // confettis
  if(TRS.conf.length < 70 && Math.random() < .6) TRS.conf.push({ x:Math.random()*VW, y:-6, vy:30 + Math.random()*40, ph:Math.random()*6, c:['#ffd23f', '#e8403a', '#3a6ae8', '#46d86a', '#fff'][Math.random()*5 | 0] });
  for(let i = TRS.conf.length - 1; i >= 0; i--){ const c = TRS.conf[i]; c.y += c.vy*dt; c.x += Math.sin(t*2 + c.ph)*20*dt; if(c.y > VH){ TRS.conf.splice(i, 1); continue; } ctx.fillStyle = c.c; ctx.fillRect(c.x | 0, c.y | 0, 3, Math.abs(Math.sin(t*6 + c.ph))*3 + 1 | 0); }
  const vg = ctx.createRadialGradient(VW/2, VH*.55, VH*.2, VW/2, VH*.55, VW*.7); vg.addColorStop(0, 'rgba(0,0,0,.15)'); vg.addColorStop(1, 'rgba(0,0,0,.7)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}
drawMenuScene = (prev => function(dt){ return MBG.scene === 'tourney' ? drawTourneyScene(dt) : prev(dt); })(drawMenuScene);
menu = (prev => function(h){
  const was = MBG.scene;
  prev(h);
  const m = document.getElementById('menu'), on = !G && !!h && h.includes('data-trscene');
  m.classList.toggle('trscene', on);
  if(!on) return;
  MBG.scene = 'tourney'; m.classList.add('mscene');
  if(was !== 'tourney'){ m.classList.remove('swin'); void m.offsetWidth; m.classList.add('swin'); }
  if(typeof musicSet === 'function' && MU.kind !== 'menu:tourney|menu') musicSet('menu');
})(menu);
if(typeof MUSIC !== 'undefined' && !MUSIC['menu:tourney']) MUSIC['menu:tourney'] = 'assets/music/tourney-menu.mp3';
document.head.insertAdjacentHTML('beforeend', `<style>
#menu.trscene h1{background:linear-gradient(180deg,#fff 0%,#ffe27a 50%,#ff9a20 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(2px 2px 0 #2a0e04) drop-shadow(0 0 10px rgba(255,210,63,.45))}
#menu.trscene{background:radial-gradient(ellipse at 50% 45%,rgba(6,4,16,.55),rgba(6,4,16,.2) 80%)}#menu.trscene .mc{align-items:center!important}#menu.trscene .mc>*{max-width:98%}#menu.trscene .hd{justify-content:center}
#menu.trscene .edit,#menu.trscene .trv{background:rgba(14,8,30,.78);border-radius:12px;padding:6px}#menu.trscene .row img{width:26px;height:26px;image-rendering:pixelated;vertical-align:middle}
</style>`);
