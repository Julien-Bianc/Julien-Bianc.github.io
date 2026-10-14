// ============================================================
//  online-battle.js — COMBAT EN LIGNE EN TEMPS RÉEL (joueur contre joueur)
//
//  Principe (le même que beaucoup de jeux d'action en ligne) :
//    • chaque joueur fait tourner le combat sur SA machine : TON Pokémon est contrôlé chez toi,
//      celui de l'adversaire est une « marionnette » qui suit les positions reçues (15 fois par seconde) ;
//    • quand un joueur attaque, l'attaque est REJOUÉE à l'identique chez l'autre (même visée, même charge) ;
//    • c'est la machine du joueur VISÉ qui décide s'il est touché (si tu as esquivé sur ton écran, tu as esquivé) :
//      elle calcule les dégâts (types, critiques, objets, capacités…) et prévient l'attaquant.
//
//  Messages échangés (canal « match:<id du défi> ») :
//    hello / go          préparation (équipes, objets, capsules, arène)
//    s                   état de ton Pokémon (position, PV, statut, équipe)       15 fois/s
//    f                   tu lances une attaque (bouton, charge, angle, point visé)
//    h                   « tu m'as touché » : dégâts, PV restants, critique        (envoyé par la victime)
//    x / st              dégâts ou statut renvoyés au contact (Casque Brut, Peau Dure, Synchro, Joli Sourire…)
//    lose / bye          j'ai perdu / j'abandonne        again / leave   revanche / je quitte
//    pi / po             mesure du ping
//
//  Deux « transports » : Supabase (Internet) ou BroadcastChannel (TEST LOCAL : 2 onglets du même navigateur).
//  Réglages : js/online-config.js.
// ============================================================
const NET_PROTO = 1;
const NET_R = 16;                                         // taille de la zone de touche des deux Pokémon en ligne (identique des deux côtés)
const NET = { m:null, inHurt:false, replay:false };
const netOn = () => !!(NET.m && G && G.cfg && G.cfg.mode === 'online' && NET.m.state === 'fight');
const NET_LAG = +(new URLSearchParams(location.search).get('lag') || 0);   // test local : ?lag=120 simule 120 ms de latence

// ============================================================ TRANSPORTS
const NetT = {
  supabase(cid){
    const T = { fns:[], ready:false, err:null };
    const ch = Online.sb.channel('match:' + cid, { config:{ broadcast:{ self:false, ack:false } } });
    ch.on('broadcast', { event:'m' }, msg => { const p = msg && msg.payload; if(p) T.fns.forEach(f => f(p.k, p.d)); });
    ch.subscribe(st => { if(st === 'SUBSCRIBED') T.ready = true; else if(st === 'CHANNEL_ERROR' || st === 'TIMED_OUT') T.err = st; });
    T.send = (k, d) => { if(!T.ready) return; try{ const r = ch.send({ type:'broadcast', event:'m', payload:{ k, d } }); if(r && r.catch) r.catch(() => {}); }catch(e){} };
    T.on = f => T.fns.push(f);
    T.close = () => { T.fns = []; try{ Online.sb.removeChannel(ch); }catch(e){} };
    return T;
  },
  local(cid){
    const T = { fns:[], ready:true }, bc = new BroadcastChannel('arene-match-' + cid);
    bc.onmessage = ev => { const p = ev.data; if(!p) return; const go = () => T.fns.forEach(f => f(p.k, p.d)); if(NET_LAG) setTimeout(go, NET_LAG); else go(); };
    T.send = (k, d) => { try{ bc.postMessage({ k, d }); }catch(e){} };
    T.on = f => T.fns.push(f);
    T.close = () => { T.fns = []; bc.close(); };
    return T;
  }
};
const nsend = (k, d) => { if(NET.m && NET.m.T) NET.m.T.send(k, d || 0); };
const r2 = v => Math.round(v*100)/100;

// ============================================================ PRÉPARATION D'UN MATCH
//  NetMatch.open({ cid, host, kind:'sb'|'local', team, foePseudo, waitText, onAbort })
//    host = celui qui a lancé le défi (il choisit l'arène). L'écran « connexion » sert aussi d'écran d'attente.
const NetMatch = {
  open(o){
    this.close(true);
    const M = NET.m = { cid:o.cid, host:!!o.host, kind:o.kind, T:o.kind === 'local' ? NetT.local(o.cid) : NetT.supabase(o.cid),
      me:{ pseudo:o.myPseudo || (Online.user && Online.user.pseudo) || 'Moi', team:o.team }, foe:{ pseudo:o.foePseudo || '?', info:null, hp:{}, tm:[] },
      state:'connect', t0:performance.now(), lastRecv:performance.now(), onAbort:o.onAbort, waitText:o.waitText, timers:[], ping:0 };
    M.T.on((k, d) => { if(NET.m === M) netMsg(M, k, d); });
    M.timers.push(setInterval(() => netTick(M), 600));
    netConnectScreen(M);
    netTick(M);
    return M;
  },
  // ferme le match en cours (sans prévenir l'adversaire si quiet)
  close(quiet){
    const M = NET.m; if(!M) return;
    if(!quiet) nsend('leave');
    M.timers.forEach(clearInterval); M.timers = []; NET.m = null;
    setTimeout(() => M.T.close(), 300);
  },
  abort(msg){
    const M = NET.m; if(!M || M.state === 'fight') return;
    const cb = M.onAbort; this.close(false);
    if(cb) cb();
    menu(`<h1>Combat en ligne</h1><p>${msg}</p><div class='row'><button class='btn' id='nb'>Retour</button></div>`);
    document.getElementById('nb').onclick = () => SCREENS.online();
  }
};
function teamInfo(team){
  const items = {}, caps = {};
  team.members.forEach(id => { const it = Save.teamItem(team, id); if(it) items[id] = it; const c = Save.teamCap(team, id); if(c) caps[id] = c; });
  return { pseudo:NET.m.me.pseudo, team:team.members.slice(0, 6), items, caps, v:NET_PROTO, gv:GAME_VERSION };
}
function netConnectScreen(M){
  const waiting = !M.foe.info;
  menu(`<div class='onl net-wait'><h1>Combat en ligne</h1>
    <div class='vs'><div><b>${esc(M.me.pseudo)}</b><div class='tmem'>${M.me.team.members.map(id => thumb(id)).join('')}</div></div><i>VS</i>
      <div><b>${esc(M.foe.pseudo)}</b><div class='tmem'>${M.foe.info ? M.foe.info.team.map(id => thumb(id)).join('') : '<span class="dots">…</span>'}</div></div></div>
    <p class='hint' id='nwt'>${waiting ? (M.waitText || 'Connexion…') : 'Connexion établie, préparation de l\'arène…'}</p>
    <div class='row'><button class='btn2' id='ncx'>Annuler</button></div></div>`);
  document.getElementById('ncx').onclick = () => NetMatch.abort('Combat annulé.');
}
// envoyé régulièrement tant que le combat n'a pas commencé (et pendant les premières secondes : le « go » peut se perdre)
function netTick(M){
  if(NET.m !== M) return;
  const now = performance.now();
  if(M.state === 'connect'){
    nsend('hello', { ...teamInfo(M.me.team), got:!!M.foe.info });
    if(M.host && M.foe.info && M.foeGot && !M.goArena) hostGo(M);
    const lim = M.foe.info ? 25000 : (ONLINE_CFG.challengeTimeout + 15)*1000;
    if(now - M.t0 > lim) NetMatch.abort(M.foe.info ? 'La connexion avec ton adversaire a échoué.' : `${esc(M.foe.pseudo)} n'a pas rejoint le combat.`);
    if(M.T.err) NetMatch.abort('Connexion au serveur impossible (' + M.T.err + ').');
  } else if(M.state === 'fight'){
    if(M.host && !M.gotSnap && M.goArena != null) nsend('go', { arena:M.goArena, n:M.round });
    nsend('pi', { t:now });
  }
}
function hostGo(M){
  M.goArena = Math.floor(Math.random()*6);         // une des 6 arènes de combat (js/arena.js)
  M.round = (M.round || 0) + 1;
  nsend('go', { arena:M.goArena, n:M.round });
  setTimeout(() => { if(NET.m === M && M.state !== 'fight') netStart(M, M.goArena); }, 150);
}

// ============================================================ RÉCEPTION
function netMsg(M, k, d){
  M.lastRecv = performance.now();
  switch(k){
    case 'hello': {
      if(d.v !== NET_PROTO || !Array.isArray(d.team) || !d.team.length) return NetMatch.abort('Ton adversaire a une autre version du jeu : mettez-vous à jour tous les deux.');
      const miss = d.team.filter(t => !MV[t] || !HERO[t]);
      if(miss.length) return NetMatch.abort('Ton adversaire utilise un Pokémon que ton jeu ne connaît pas (' + esc(miss.join(', ')) + ') : mettez-vous à jour.');
      const first = !M.foe.info;
      M.foe.info = { ...d, team:d.team.slice(0, 6), items:d.items || {}, caps:d.caps || {} }; M.foe.pseudo = d.pseudo || M.foe.pseudo; M.foeGot = !!d.got;
      if(first && M.state === 'connect'){ netConnectScreen(M); nsend('hello', { ...teamInfo(M.me.team), got:true }); if(M.onConnected) M.onConnected(); }
      if(M.host && M.foeGot && M.state === 'connect' && M.goArena == null) hostGo(M);
      return;
    }
    case 'go':
      if(M.host) return;
      if(M.state === 'connect' && M.foe.info) netStart(M, d.arena, d.n);
      else if(M.state === 'end' && M.againMe && d.n !== M.round) netStart(M, d.arena, d.n);
      return;
    case 'pi': nsend('po', { t:d.t }); return;
    case 'po': M.ping = Math.round(performance.now() - d.t); return;
    case 'again':
      M.againFoe = true; netEndText(M);
      if(M.host && M.againMe && M.state === 'end') hostGo(M);
      return;
    case 'leave':
      M.foeLeft = true;
      if(M.state === 'fight') netForfeitWin(M, 'leave');
      else if(M.state === 'end') netEndText(M);
      else NetMatch.abort(`${esc(M.foe.pseudo)} a quitté le combat.`);
      return;
  }
  if(M.state !== 'fight' || !netOn()) return;
  switch(k){
    case 's': netSnap(M, d); return;
    case 'f': netReplay(M, d); return;
    case 'h': netHitReport(M, d); return;
    case 'x': { const p = G.p; if(p && p.hp > 0 && !G.sw){ p.hp -= d.d; dmgTxt(p.x, p.y - 48, '-' + Math.round(d.d*10), '#ffb08a'); } return; }
    case 'st': if(G.p && G.p.hp > 0) applyStatus(G.p, d.k); return;
    case 'lose': M.foeLost = performance.now(); return;
    case 'bye': netForfeitWin(M, 'bye'); return;
  }
}

// ============================================================ LANCEMENT DU COMBAT
const netStage = arena => ({ ...STAGE_DEFAULT, name:'En ligne', arena, hp:1, dmg:1, speed:1, pspeed:1/.85, rate:1, tele:1, aim:0, boss:1 });
function netStart(M, arena, round){
  if(round) M.round = round;
  M.state = 'fight'; M.goArena = arena; M.gotSnap = false; M.againMe = M.againFoe = false; M.foeLost = 0; M.endWhy = null;
  M.foe.snap = null; M.foe.hp = {}; M.foe.tm = M.foe.info.team.map(t => [t, HERO[t].hp, HERO[t].hp]); M.foe.active = M.foe.info.team[0];
  M.koT = 0; M.lastRecv = performance.now(); M.sendT = 0; M.cd = 3.2; M.goFx = 0; M.menuOpen = false;
  const team = M.me.team;
  G = null;
  start({ mode:'online', team:team.members.slice(0, 6), teamId:team.id, size:team.size, stage:netStage(arena), arena, enemies:M.foe.info.team.slice() });
  // le joueur qui a lancé le défi commence à gauche, l'autre à droite (mêmes coordonnées des deux côtés)
  const L = { x:W*.3, y:H*.5 }, R = { x:W*.7, y:H*.5 }, mine = M.host ? L : R, his = M.host ? R : L;
  G.team.forEach(c => { c.x = mine.x; c.y = mine.y; c.r = NET_R; });
  if(G.sw){ G.sw.x = mine.x; G.sw.y = mine.y; }
  const e = G.e; e.x = e.lx = his.x; e.y = e.ly = his.y;
  G.intro = 0; CAM.init = false;
  if(typeof resetAim === 'function') resetAim();
  if(typeof playSfx === 'function') playSfx('select');
}

// ============================================================ LA MARIONNETTE (Pokémon de l'adversaire)
function netRow(t){ const M = NET.m; return M && M.foe.tm.find(r => r[0] === t); }
function netPuppet(e, t){
  const M = NET.m, info = M.foe.info, row = netRow(t);
  e.boss = false; e.r = NET_R; e.next = 1e9; e.tele = 0; e.net = true; e.intro = 0;
  e.max = row ? row[2] : HERO[t].hp; e.hp = M.foe.hp[t] ?? (row ? row[1] : e.max);
  e.item = info.items[t] && HELD_BY_ID[info.items[t]] ? info.items[t] : null;
  e.cap = info.caps[t] || null;
  const s = M.foe.snap; if(s && s.a === t){ e.x = s.x; e.y = s.y; }
  e.lx = e.x; e.ly = e.y;
  return e;
}
// nouvel adversaire après un K.O. : le moteur le fait sortir de sa Pokéball (js/pokeball.js)
const _spawnNet = spawn;
spawn = function(){
  const M = NET.m;
  if(!(M && G && G.cfg && G.cfg.mode === 'online')) return _spawnNet();
  const t = M.foe.active || G.et[0], et = G.et; G.et = [t]; G.wave = 0;
  try{ _spawnNet(); } finally { G.et = et; G.wave = 0; }
  netPuppet(G.e, t); G.intro = 0; G.wait = 0; M.koT = 0;
};
// l'adversaire rappelle son Pokémon (relève) : rayon rouge puis Pokéball (comme js/ai-swap.js)
function netRecall(t){
  const o = G.e, x = o.x, y = o.y;
  if(typeof clearPlus === 'function') clearPlus(o);
  o.rs = o.fl = o.kb = null;
  const n = netPuppet({ t, x, y, hp:1, max:1, r:NET_R, tele:0, next:1e9, pat:0, ph:0, boss:false, intro:0, st:null, stT:0, bcd:{}, rage:0, invT:G.time + .9 }, t);
  n.x = x; n.y = y; n.lx = x; n.ly = y;
  G.erc = { o, t0:G.time, x, y };
  G.e = n; n.hid = true; G.em = { e:n, t0:G.time, ev:false };
  lbl(1, NAME[o.t] + ', reviens !', o.t); dmgTxt(x, y - 60, 'RELÈVE !', '#ffd0a0');
  if(typeof playSfx === 'function') playSfx('recall');
}
const puppetBusy = e => !!(e.rs || e.fl || e.bl || e.bur || e.kb || (G.em && G.em.e === e));
function netSnap(M, s){
  M.foe.snap = s; M.gotSnap = true;
  if(Array.isArray(s.tm)) M.foe.tm = s.tm;
  M.foe.hp[s.a] = s.h; M.foe.active = s.a;
  const e = G.e;
  if(e && s.a !== e.t && e.hp > 0 && !e.koDone && !G.em && !G.erc) netRecall(s.a);
}
// une attaque de l'adversaire : on la rejoue à l'identique
function netReplay(M, f){
  let e = G.e;
  if(e.t !== f.t){
    M.foe.active = f.t;
    if(e.hp <= 0 || e.koDone) spawn(); else netRecall(f.t);
    e = G.e; e.hid = false; G.em = null;               // il attaque déjà : on le montre tout de suite
  }
  if(e.hp <= 0) return;
  const m = MV[e.t] && MV[e.t][f.i]; if(!m) return;
  if(!puppetBusy(e)){ e.x = f.x; e.y = f.y; }
  const st = e.st, so = e.slowOnly, ps = G.stage.pspeed;
  e.st = f.bu ? 'burn' : null; e.slowOnly = false;      // brûlure : attaque affaiblie (les autres statuts ont déjà été tirés chez lui)
  if((m.k === 'wave' && m.opt && (m.opt.amp || m.opt.count)) || (m.k === 'meteor' && m.opt && m.opt.split)) G.stage.pspeed = 1;
  NET.replay = true;
  try{
    if(f.bl && typeof isFreeBlink === 'function' && isFreeBlink(m)) netBlink(e, m, f);
    else cast(e, { x:f.tx, y:f.ty, r:NET_R, hp:1 }, m, f.c, 0, f.sc, f.a);
  } finally { NET.replay = false; G.stage.pspeed = ps; e.st = st; e.slowOnly = so; }
  lbl(1, m.n + (f.c > .5 ? ' +' : ''), e.t); e.atk = e.atkD = .3;
}
// téléport libre (Alakazam…) : il arrive exactement où il l'a choisi
function netBlink(e, m, f){
  const O = m.opt || {}, look = O.look || m.tp, col = lcol(m.tp);
  if(SPR[e.t]) AFTER.push({ img:mon(e, 1), x:e.x, y:e.y, k:2, t0:G.time, dur:.45, col });
  e.bl = { t0:G.time, dur:O.delay ?? .15, sx:e.x, sy:e.y, ex:clX(f.bl[0]), ey:clY(f.bl[1]), m, c:f.c, sc:f.sc, own:0, look, col, done:0 };
  e.hid = true; e.rs = null; departFx(e.x, e.y, look, col);
  if(typeof playSfx === 'function') playSfx('cast:' + m.tp);
}
// « je t'ai touché » vu par l'attaquant : chiffres de dégâts, critique, objets qui se déclenchent quand TU frappes
function netHitReport(M, d){
  M.foe.hp[d.t] = d.hp;
  const e = G.e; if(!e || e.t !== d.t) return;
  e.hp = d.hp;
  hitFx(e.x, e.y, Math.max(1, Math.round(d.d)), d.m, 1, d.tp);
  if(d.c){ dmgTxt(e.x, e.y - 76, 'COUP CRITIQUE !', '#ffd23f'); critFx(e.x, e.y); }
  const p = G.p, h = typeof heldOf === 'function' && heldOf(p), fx = h && h.fx;
  if(fx && d.d > 0 && p.hp > 0){
    if(fx.drainHit){ const g = d.d*fx.drainHit; p.hp = Math.min(p.max, p.hp + g); if(g >= .5) dmgTxt(p.x, p.y - 34, '+' + Math.round(g*10), '#8dff9a'); }
    if(fx.recoil && G.time - (p.recT || -9) > .4){ p.recT = G.time; const l = p.max*fx.recoil; p.hp -= l; dmgTxt(p.x, p.y - 48, '-' + Math.round(l*10) + ' ' + h.name, '#ff9a9a'); }
  }
}

// ============================================================ BRANCHEMENTS SUR LE MOTEUR
// 1. TES attaques : on les envoie (les statuts paralysie / confusion sont tirés ICI pour que les deux écrans soient d'accord)
const _castNet = cast;
cast = function(s, d, m, c, own, sc, ang){
  if(!netOn() || NET.replay || !own || s !== G.p || NET.m.cd > 0) return netOn() && own && s === G.p && NET.m.cd > 0 ? undefined : _castNet(s, d, m, c, own, sc, ang);
  if(s.st === 'frz' || s.st === 'slp') return;
  let unSlow = false, unCnf = false;
  if(s.st === 'par' && !s.slowOnly){
    if(Math.random() < .25){ dmgTxt(s.x, s.y - 50, 'PARALYSÉ !', '#ffe24a'); return; }
    s.slowOnly = true; unSlow = true;
  }
  if(s.st === 'cnf'){
    const a = (ang !== undefined ? ang : Math.atan2(d.y - s.y, d.x - s.x)) + R_(-.9, .9), dist = Math.hypot(d.x - s.x, d.y - s.y);
    d = { x:s.x + Math.cos(a)*dist, y:s.y + Math.sin(a)*dist, r:d.r, hp:d.hp }; ang = a; s.st = null; unCnf = true;
  }
  const i = MV[s.t] ? MV[s.t].indexOf(m) : -1;
  const a = ang ?? Math.atan2(d.y - s.y, d.x - s.x);
  if(i >= 0) nsend('f', { t:s.t, i, c:r2(c), sc:r2(sc), a:+a.toFixed(4), tx:Math.round(d.x), ty:Math.round(d.y), x:Math.round(s.x), y:Math.round(s.y),
    bu:s.st === 'burn' ? 1 : 0, bl:typeof BLINK_TO !== 'undefined' && BLINK_TO ? [Math.round(BLINK_TO.x), Math.round(BLINK_TO.y)] : 0 });
  try{ return _castNet(s, d, m, c, own, sc, ang); }
  finally { if(unSlow) s.slowOnly = false; if(unCnf && !s.st) s.st = 'cnf'; }
};
// 2. tes attaques qui touchent la marionnette : RIEN ici (c'est l'adversaire qui calcule et renvoie « h »)
const _hEnet = hurtE;
hurtE = function(d, b){
  if(!netOn()) return _hEnet(d, b);
  const e = G.e; if(e && e.hp > 0 && !e.hid) fx.push({ x:e.x, y:e.y, t:.18, mx:.18 });
  return;
};
// 3. TU es touché : ta machine décide (avec les objets offensifs de l'adversaire) puis prévient l'attaquant
function foeItemMult(e, p, b){
  const h = typeof heldOf === 'function' && heldOf(e), fx = h && h.fx; if(!fx || !b) return 1;
  let k = 1;
  if(fx.type && b.t === fx.type) k *= fx.mult || 1.2;
  if(fx.superEff && mult(b.t, p.t) > 1) k *= fx.superEff;
  if(fx.dmg) k *= fx.dmg;
  if(fx.crit && !b.crit && b.k !== 'pool' && p.inv <= 0 && Math.random() < fx.crit){ k *= CRIT.mult; b.crit = 1; dmgTxt(p.x, p.y - 76, 'COUP CRITIQUE !', '#ffd23f'); critFx(p.x, p.y); }
  return k;
}
const _hPnet = hurtP;
hurtP = function(d, b){
  if(!netOn()) return _hPnet(d, b);
  const p = G.p, e = G.e, hp0 = p.hp, eh0 = e.hp, t0 = p.t;
  if(p.hp > 0 && p.inv <= 0 && p.dT <= 0) d *= foeItemMult(e, p, b);
  let r; NET.inHurt = true;
  try{ r = _hPnet(d, b); } finally { NET.inHurt = false; }
  const dealt = hp0 - Math.max(0, p.hp);
  if(dealt > .001) nsend('h', { t:t0, d:r2(dealt), hp:r2(Math.max(0, p.hp)), m:typeMult(b.t, t0), tp:b.t, c:b.crit ? 1 : 0 });
  if(G && G.e === e && e.hp < eh0 - .001){ nsend('x', { d:r2(eh0 - e.hp) }); e.hp = eh0; }   // Casque Brut, Peau Dure…
  return r;
};
// 4. statuts : ceux que TU infliges arrivent par la machine de l'adversaire ; seuls les renvois au contact partent d'ici
const _apNet = applyStatus;
applyStatus = function(o, kind){
  if(netOn() && o === G.e){ if(NET.inHurt || (typeof SYNC_LOCK !== 'undefined' && SYNC_LOCK)) nsend('st', { k:kind }); return; }
  return _apNet(o, kind);
};
// 5. chaque image
const _stepNet = step;
step = function(dt){
  if(!netOn()) return _stepNet(dt);
  const M = NET.m, p = G.p, e = G.e, px = p.x, py = p.y;
  if(M.cd > 0){ M.cd -= dt; if(M.cd <= 0) M.goFx = performance.now(); }
  // la marionnette : pas d'IA, PV et statut venus du réseau
  const ex = e.x, ey = e.y, s = M.foe.snap;
  e.next = 1e9; e.tele = 0; e.st = null;
  if(M.foe.hp[e.t] != null) e.hp = M.foe.hp[e.t];
  if(G.wait > 0) G.wait = Math.max(G.wait, dt + .05);      // c'est nous qui faisons entrer le Pokémon suivant (voir plus bas)
  G.wave = 0;
  _stepNet(dt);
  if(!netOn()) return;
  if(M.cd > 0 && G.p === p){ p.x = px; p.y = py; }
  if(G.e === e){
    if(s && s.a === e.t){ e.st = s.st || null; e.slowOnly = !!s.so; e.stT = 9; e.dT = s.d ? .1 : 0; }
    if(M.foe.hp[e.t] != null && !e.koDone) e.hp = M.foe.hp[e.t];
    if(!puppetBusy(e)){
      if(s && s.a === e.t){ const k = Math.min(1, dt*14); e.x = ex + (s.x - ex)*k; e.y = ey + (s.y - ey)*k; }
      else { e.x = ex; e.y = ey; }
    }
  }
  // K.O. de l'adversaire : on attend qu'il envoie son Pokémon suivant
  if(G.e.koDone){
    M.koT += dt;
    const nx = M.foe.active, row = netRow(nx);
    if(M.koT > 1.3 && nx && nx !== G.e.t && (!row || row[1] > 0)){ G.wait = 0; spawn(); }
  }
  // fin : l'adversaire a perdu (message « lose », ou toute son équipe est K.O. depuis un moment)
  const allKo = M.foe.tm.length && M.foe.tm.every(r => r[1] <= 0);
  if((M.foeLost && performance.now() - M.foeLost > 1500) || (allKo && G.e.koDone && M.koT > 4)){ battleEnd(true); return; }
  netSendState(M);
  netWatch(M);
};
function netSendState(M){
  const now = performance.now(); if(now < M.sendT) return; M.sendT = now + 1000/ONLINE_CFG.sendRate;
  const p = G.p;
  nsend('s', { a:p.t, x:Math.round(p.x), y:Math.round(p.y), h:r2(Math.max(0, p.hp)), st:p.st || 0, so:p.slowOnly ? 1 : 0, d:p.dT > 0 ? 1 : 0,
    tm:G.team.map(c => [c.t, Math.round(Math.max(0, c.hp)*10)/10, c.max]) });
}
// connexion perdue ?
function netWatch(M){
  const gap = (performance.now() - M.lastRecv)/1000;
  M.lost = gap > 5;
  if(gap > ONLINE_CFG.disconnectAfter) netForfeitWin(M, 'dc');
}
// 6. pendant le compte à rebours : ni attaque, ni esquive, ni relève
const _pressNet = press; press = function(i){ if(netOn() && NET.m.cd > 0) return; _pressNet(i); };
const _dashNet = dash; dash = function(){ if(netOn() && NET.m.cd > 0) return; _dashNet(); };
const _doSwapNet = doSwap; doSwap = function(n){ if(netOn() && NET.m.cd > 0) return; _doSwapNet(n); };

// ============================================================ AFFICHAGE
// ATH : pseudos, Pokéballs de l'équipe adverse, ping
const _hudNet = hud;
hud = function(){
  if(!netOn() && !(NET.m && G && G.cfg && G.cfg.mode === 'online')) return _hudNet();
  const M = NET.m, et = G.et; G.et = []; try{ _hudNet(); } finally { G.et = et; }
  const HW = VW/UIK.hud;
  M.foe.tm.forEach((r, i) => {
    const st = r[1] <= 0 ? 2 : r[0] === G.e.t ? 1 : 0, cx = HW - 54 - i*18, cy = 58;
    ctx.fillStyle = st == 2 ? '#666' : '#e23b3b'; ctx.beginPath(); ctx.arc(cx, cy, 6, Math.PI, 6.283); ctx.fill();
    ctx.fillStyle = st == 2 ? '#999' : '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#14101c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.283); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.stroke();
    if(st == 1){ ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 6.283); ctx.stroke(); }
  });
  otext(M.me.pseudo, 48, 76, 10, '#9fe3ff', 'left');
  otext(M.foe.pseudo, HW - 48, 76, 10, '#ffb0a0', 'right');
  const pc = M.ping < 90 ? '#8dff9a' : M.ping < 180 ? '#ffe27a' : '#ff8a7a';
  otext(M.lost ? 'connexion perdue…' : (M.ping ? M.ping + ' ms' : ''), HW/2, 82, 9, M.lost ? '#ff8a7a' : pc, 'center');
};
// compte à rebours 3, 2, 1, COMBAT !
const _dsfNet = drawScreenFx;
drawScreenFx = function(){
  _dsfNet();
  const M = NET.m; if(!M || M.state !== 'fight' || !G) return;
  let txt = null, k = 0;
  if(M.cd > 0){ const n = Math.ceil(Math.min(3, M.cd)); txt = String(n); k = M.cd - Math.floor(M.cd); }
  else if(M.goFx && performance.now() - M.goFx < 700){ txt = 'COMBAT !'; k = 1 - (performance.now() - M.goFx)/700; }
  if(!txt) return;
  ctx.save(); ctx.globalAlpha = Math.min(1, k*2.5); ctx.translate(VW/2, VH*.42); const s = 1 + k*.35; ctx.scale(s, s); ctx.transform(1, 0, -.15, 1, 0, 0);
  ctx.font = '900 64px Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  ctx.strokeStyle = '#14101c'; ctx.lineWidth = 12; ctx.strokeText(txt, 0, 0);
  const g = ctx.createLinearGradient(0, -30, 0, 30); g.addColorStop(0, '#ffffff'); g.addColorStop(.6, '#ffe27a'); g.addColorStop(1, '#ff9a3c'); ctx.fillStyle = g; ctx.fillText(txt, 0, 0);
  ctx.restore();
};

// ============================================================ PAUSE / ABANDON / FIN
// en ligne le combat ne s'arrête jamais : le menu s'affiche par-dessus
const _pauseNet = pauseGame;
pauseGame = function(){
  if(!netOn()) return _pauseNet();
  const M = NET.m; if(M.menuOpen){ M.menuOpen = false; menu(''); return; }
  M.menuOpen = true; netPauseMenu();
};
function netPauseMenu(){
  menu(`<h1>Combat en ligne</h1><p class='hint'>Attention : le combat continue pendant ce menu !</p>
    <div class='row'><button class='btn' id='rs'>Reprendre</button><button class='btn2' id='op'>Options</button><button class='btn2 bad' id='ff'>Abandonner</button></div>`);
  document.getElementById('rs').onclick = () => { NET.m.menuOpen = false; menu(''); };
  document.getElementById('op').onclick = () => showOptions(() => netOn() ? netPauseMenu() : null);
  document.getElementById('ff').onclick = () => { if(!netOn()) return; nsend('bye'); NET.m.menuOpen = false; battleEnd(false, 'bye'); };
}
function netForfeitWin(M, why){ if(M.state === 'fight' && netOn()){ M.endWhy = why; battleEnd(true, why); } }
// jeu en arrière-plan pendant un combat : abandon au bout de quelques secondes (sinon tu serais intouchable)
let NET_HIDE = 0;
addEventListener('visibilitychange', () => {
  clearTimeout(NET_HIDE);
  if(document.hidden && netOn()) NET_HIDE = setTimeout(() => { if(netOn() && document.hidden){ nsend('bye'); battleEnd(false, 'hidden'); } }, ONLINE_CFG.hiddenForfeit*1000);
});
const _beNet = battleEnd;
battleEnd = function(win, why){
  const M = NET.m;
  if(!(M && G && G.cfg && G.cfg.mode === 'online')) return _beNet(win);
  if(M.state !== 'fight') return;
  M.state = 'end'; M.win = !!win; M.endWhy = why || M.endWhy || null; G.over = 1; M.menuOpen = false;
  if(!win){
    if(why !== 'hidden' && why !== 'bye') nsend('lose');
    if(M.kind === 'sb' && Online.user) Online.rpc('report_defeat', { p_id:M.cid }).then(() => Online.refreshProfile()).catch(e => console.warn(e));
  } else if(M.kind === 'sb') setTimeout(() => Online.refreshProfile().catch(() => {}), 1500);
  if(typeof playSfx === 'function') playSfx(win ? 'victory' : 'ko');
  netEndScreen(M);
};
function netEndScreen(M){
  const why = { bye:`${esc(M.foe.pseudo)} a abandonné.`, leave:`${esc(M.foe.pseudo)} a quitté le combat.`, dc:`${esc(M.foe.pseudo)} ne répond plus (déconnecté).`, hidden:'Le jeu est passé en arrière-plan trop longtemps : abandon.' }[M.endWhy] || '';
  const ko = M.foe.tm.filter(r => r[1] <= 0).length, mine = G ? G.team.filter(c => c.hp <= 0).length : 0;
  menu(`<div class='onl net-end'><h1>${M.win ? '🏆 Victoire !' : 'Défaite'}</h1>
    <p>contre <b>${esc(M.foe.pseudo)}</b> — ${ko} K.O. infligé${ko > 1 ? 's' : ''}, ${mine} subi${mine > 1 ? 's' : ''}${G ? ' · ' + Math.floor(G.time/60) + ':' + String(Math.floor(G.time)%60).padStart(2, '0') : ''}</p>
    ${why ? `<p class='hint'>${why}</p>` : ''}<p class='hint' id='nag'></p>
    <div class='row'><button class='btn' id='nre'>Revanche</button><button class='btn2' id='nmn'>Menu</button></div></div>`);
  document.getElementById('nre').onclick = () => {
    if(M.foeLeft || M.endWhy === 'dc' || NET.m !== M) return;
    M.againMe = true; nsend('again'); netEndText(M);
    if(M.host && M.againFoe) hostGo(M);
  };
  document.getElementById('nmn').onclick = () => { NetMatch.close(false); G = null; SCREENS.online(); };
  netEndText(M);
}
function netEndText(M){
  const el = document.getElementById('nag'), bt = document.getElementById('nre'); if(!el) return;
  if(M.foeLeft || M.endWhy === 'dc'){ el.textContent = M.foe.pseudo + ' est parti.'; if(bt) bt.disabled = true; return; }
  el.textContent = M.againMe ? (M.againFoe ? 'C\'est reparti !' : 'En attente de ' + M.foe.pseudo + '…') : (M.againFoe ? M.foe.pseudo + ' veut une revanche !' : '');
  if(bt && M.againMe) bt.disabled = true;
}

// ============================================================ TEST LOCAL : salon entre onglets du même navigateur
//  Ouvre le jeu dans 2 onglets → Multijoueur → Test local. Chaque onglet voit l'autre et peut le défier.
//  Ajoute ?lag=120 à l'adresse pour simuler 120 ms de latence.
const LocalLobby = {
  bc:null, id:null, pseudo:null, peers:new Map(), timer:0, fns:[],
  join(){
    if(this.bc) return;
    this.id = Math.random().toString(36).slice(2, 8);
    this.pseudo = (Online.user && Online.user.pseudo) || 'Onglet-' + this.id.slice(0, 3).toUpperCase();
    this.bc = new BroadcastChannel('arene-local-lobby');
    this.bc.onmessage = ev => this.recv(ev.data || {});
    const ping = () => { this.send({ k:'here', p:this.pseudo, s:G ? 'fight' : 'menu' }); const now = Date.now(); for(const [k, v] of this.peers) if(now - v.seen > 5000) this.peers.delete(k); this.emit(); };
    ping(); this.timer = setInterval(ping, 1500);
  },
  leave(){ if(!this.bc) return; this.send({ k:'bye' }); clearInterval(this.timer); this.bc.close(); this.bc = null; this.peers.clear(); },
  send(o){ if(this.bc) this.bc.postMessage({ ...o, from:this.id }); },
  on(fn){ this.fns = [fn]; },
  emit(){ this.fns.forEach(f => f()); },
  recv(d){
    if(!d.from || d.from === this.id) return;
    if(d.k === 'here'){ const had = this.peers.has(d.from); this.peers.set(d.from, { id:d.from, p:d.p, s:d.s, seen:Date.now() }); if(!had){ this.send({ k:'here', p:this.pseudo, s:G ? 'fight' : 'menu' }); this.emit(); } }
    else if(d.k === 'bye'){ this.peers.delete(d.from); this.emit(); }
    else if(d.to !== this.id) return;
    else if(d.k === 'chal') Social.localChallengeIn(d);
    else if(d.k === 'resp') Social.localChallengeResp(d);
    else if(d.k === 'cancel') Notif.close('lc' + d.cid);
  }
};
