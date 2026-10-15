// ============================================================
//  raid-net.js — RAID À PLUSIEURS (2 à 4 joueurs) — v0.16
//
//  Salon par CODE : un joueur crée le raid (il devient l'HÔTE), les autres entrent le code à 5 caractères.
//  L'hôte lance quand tout le monde est là. Même principe que les combats en ligne (js/online-battle.js) :
//    • chaque joueur contrôle SON Pokémon chez lui ; les alliés sont des « marionnettes » qui suivent leurs positions ;
//    • c'est la machine de l'HÔTE qui fait agir le boss (choix des attaques, cible, rage, ultime) : chaque attaque
//      est rejouée à l'identique chez les autres, et chacun décide chez lui s'il a été touché ;
//    • les dégâts infligés au boss sont envoyés à l'hôte, qui tient les PV du boss et les renvoie à tous.
//  Messages (canal « match:raid-<CODE> ») :
//    rh / rl / rgo          salon : « je suis là », liste des joueurs (hôte), lancement (hôte)
//    s  / a / d / out       ton Pokémon (12 fois/s), tu attaques, dégâts cumulés que tu as faits au boss, ton équipe est K.O.
//    b  / bt / bf / bu      (hôte) état du boss, début du signal d'attaque, attaque, attaque ultime
//    win / fail / leave     fin du raid, abandon
//  Transports : Supabase (Internet, il faut être connecté au Multijoueur) ou BroadcastChannel (test local : 2 onglets).
// ============================================================
const RNET = { m:null };
const RN_HZ = 12, RN_CODE = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const rnOn = () => !!(RNET.m && RNET.m.state === 'fight' && G && G.raid && G.raid.net);
const rsend = (k, d) => { const M = RNET.m; if(M && M.T) M.T.send(k, d || 0); };
const rid = () => Math.random().toString(36).slice(2, 10);
const rcode = () => Array.from({ length:5 }, () => RN_CODE[Math.floor(Math.random()*RN_CODE.length)]).join('');
const onlineReady = () => typeof Online !== 'undefined' && Online.sb && Online.user;
const myPseudo = kind => (kind === 'sb' && onlineReady() ? Online.user.pseudo : (typeof LocalLobby !== 'undefined' && LocalLobby.pseudo) || ('Joueur-' + Math.floor(Math.random()*900 + 100)));

// ============================================================ SALON
const RaidNet = {
  open(o){
    this.close(true);
    const team = Save.team(o.teamId), mem = team.members.filter(id => ORDER.includes(id) && (typeof Owned === 'undefined' || Owned.has(id))).slice(0, RAID.teamMax);
    const cid = 'raid-' + o.code;
    const M = RNET.m = { code:o.code, host:!!o.host, kind:o.kind, teamId:o.teamId, T:o.kind === 'local' ? NetT.local(cid) : NetT.supabase(cid),
      me:{ id:rid(), pseudo:myPseudo(o.kind), team:mem }, seen:new Map(), list:[], state:'lobby', t0:performance.now(), timers:[],
      allies:new Map(), sent:0, recv:{}, dmgSeen:{}, tracers:[], lastB:0 };
    M.T.on((k, d) => { if(RNET.m === M) rnMsg(M, k, d); });
    if(o.host) M.boss = raidCurrent();
    M.timers.push(setInterval(() => rnLobbyTick(M), 700));
    rnLobbyTick(M); rnLobbyScreen(M);
    return M;
  },
  close(quiet){
    const M = RNET.m; if(!M) return;
    if(!quiet) rsend('leave', { id:M.me.id });
    M.timers.forEach(clearInterval); M.timers = []; RNET.m = null;
    setTimeout(() => { try{ M.T.close(); }catch(e){} }, 400);
  }
};
function rnLobbyTick(M){
  if(RNET.m !== M) return;
  const now = performance.now();
  if(M.state === 'lobby'){
    rsend('rh', { id:M.me.id, pseudo:M.me.pseudo, team:M.me.team, v:GAME_VERSION });
    if(M.host){
      for(const [id, p] of M.seen) if(now - p.last > 5000) M.seen.delete(id);
      const L = [{ id:M.me.id, pseudo:M.me.pseudo, team:M.me.team, host:true }, ...[...M.seen.values()].sort((a, b) => a.j - b.j).map(p => ({ id:p.id, pseudo:p.pseudo, team:p.team }))].slice(0, RAID.maxPlayers);
      const ch = JSON.stringify(L) !== JSON.stringify(M.list); M.list = L; M.boss = M.boss || raidCurrent(); rsend('rl', { list:L, boss:M.boss.id, stars:M.boss.stars });
      if(ch) rnLobbyScreen(M);
    } else if(!M.list.length && now - M.t0 > 10000) rnAbort('Aucun raid trouvé avec le code <b>' + esc(M.code) + '</b>.');
    if(M.T.err) rnAbort('Connexion au serveur impossible (' + M.T.err + ').');
  }
}
function rnLobbyScreen(M){
  if(RNET.m !== M || M.state !== 'lobby') return;
  const full = !M.host && M.list.length >= RAID.maxPlayers && !M.list.some(p => p.id === M.me.id);
  menu(`<div class='rnl'><h1>Raid à plusieurs</h1>
    ${M.boss ? `<p class='rnboss'>${'★'.repeat(M.boss.stars)} <b>${esc(NAME[M.boss.id] || M.boss.id)}</b></p>` : ''}
    <div class='rncode'><small>CODE DU RAID</small><b>${esc(M.code)}</b><small>${M.kind === 'local' ? 'Test local : ouvre le jeu dans un autre onglet → Combat Raid → Rejoindre' : 'Donne ce code à tes amis : Combat Raid → Rejoindre'}</small></div>
    <div class='rnps'>${M.list.length ? M.list.map(p => `<div class='rnp ${p.id === M.me.id ? 'me' : ''}'><b>${p.host ? '★ ' : ''}${esc(p.pseudo)}</b><span>${p.team.map(id => thumb(id)).join('')}</span></div>`).join('')
      : `<p class='hint'>${M.host ? '' : 'Recherche du raid…'}</p>`}${M.list.length ? Array.from({ length:Math.max(0, RAID.maxPlayers - M.list.length) }, () => `<div class='rnp empty'><i>en attente…</i></div>`).join('') : ''}</div>
    ${full ? `<p class='hint bad'>Ce raid est complet (${RAID.maxPlayers} joueurs).</p>` : ''}
    <div class='row'>${M.host ? `<button class='btn' id='rngo' ${M.list.length >= 2 ? '' : 'disabled'}>Lancer le raid (${M.list.length}/${RAID.maxPlayers})</button>` : `<p class='hint'>${M.list.length ? 'L\'hôte va lancer le raid…' : ''}</p>`}
      <button class='btn2' id='rnq'>Quitter</button></div></div>`);
  const go = document.getElementById('rngo'); if(go) go.onclick = () => rnHostGo(M);
  document.getElementById('rnq').onclick = () => { RaidNet.close(false); SCREENS.raid(); };
}
function rnAbort(msg){
  RaidNet.close(true);
  menu(`<h1>Combat Raid</h1><p>${msg}</p><div class='row'><button class='btn' id='rb'>Retour</button></div>`);
  document.getElementById('rb').onclick = () => SCREENS.raid();
}
function rnHostGo(M){
  if(M.list.length < 2) return;
  M.round = (M.round || 0) + 1;
  const pay = { list:M.list, n:M.round, boss:M.boss.id, stars:M.boss.stars };
  [0, 300, 800, 1500, 2500].forEach(t => setTimeout(() => { if(RNET.m === M) rsend('rgo', pay); }, t));
  rnStart(M, M.list, M.boss);
}
function rnStart(M, list, boss){
  const slot = list.findIndex(p => p.id === M.me.id); if(slot < 0) return rnAbort('Ce raid est complet.');
  M.list = list; M.state = 'fight'; M.allies.clear(); M.sent = 0; M.recv = {}; M.dmgSeen = {}; M.lastB = performance.now();
  list.forEach((p, i) => { if(p.id === M.me.id) return; const t = p.team.find(id => SPR[id] && MV[id]) || p.team[0];
    M.allies.set(p.id, { id:p.id, pseudo:p.pseudo, team:p.team, t, x:W/2, y:H/2 + 200, tx:W/2, ty:H/2 + 200, hp:1, max:1, out:false, last:performance.now(), r:12, slot:i }); });
  startRaid(Save.team(M.teamId), { net:true, host:M.host, players:list, slot, boss:boss && boss.id, stars:boss && boss.stars });
  M.timers.push(setInterval(() => rnFightTick(M), 1000/RN_HZ));
}

// ============================================================ PENDANT LE RAID : ENVOIS
function rnFightTick(M){
  if(RNET.m !== M || !rnOn()) return;
  const p = G.p, R = G.raid, now = performance.now();
  rsend('s', { id:M.me.id, t:p.t, x:r2(p.x), y:r2(p.y), hp:r2(Math.max(0, p.hp)), max:p.max, out:!!R.out });
  if(M.host){
    const e = G.e, ack = {}; for(const id in M.recv) ack[id] = r2(M.recv[id]);
    rsend('b', { x:r2(e.x), y:r2(e.y), hp:r2(Math.max(0, e.hp)), max:e.max, rg:R.rage, ack, tl:r2(raidLeft()) });
    // un allié silencieux depuis 8 s = parti
    for(const a of M.allies.values()) if(!a.out && now - a.last > 8000){ a.out = true; a.left = true; }
    // tout le monde est K.O. : raid échoué
    if(!R.ended && R.out && [...M.allies.values()].every(a => a.out)){ R.failed = 'ko'; R.allOut = true; rsend('fail', { why:'ko' }); G.over = 1; battleEnd(false); }
  } else if(now - M.lastB > 7000 && !G.raid.ended){ G.raid.failed = 'host'; G.raid.allOut = true; G.over = 1; battleEnd(false); }
}
RaidHook.allies = () => RNET.m && rnOn() ? [...RNET.m.allies.values()] : [];
RaidHook.me = () => RNET.m ? RNET.m.me.pseudo : '';
RaidHook.cast = c => { if(rnOn() && RNET.m.host) rsend('bf', c); };
RaidHook.ult = () => { if(rnOn() && RNET.m.host) rsend('bu', 1); };
RaidHook.fail = why => { if(rnOn() && RNET.m.host) rsend('fail', { why }); };
RaidHook.out = () => { if(rnOn()) rsend('out', { id:RNET.m.me.id }); };
RaidHook.end = win => {
  const M = RNET.m; if(!M) return;
  if(M.host && win) [0, 400, 1000].forEach(t => setTimeout(() => rsend('win', 1), t));
  M.state = 'end'; setTimeout(() => { if(RNET.m === M) RaidNet.close(true); }, 3000);
};
// tes attaques : l'animation est montrée chez les autres
const _fireRN = fire;
fire = function(m, c, i){ const r = _fireRN(m, c, i); if(rnOn()) rsend('a', { id:RNET.m.me.id, tp:m.tp || G.p.t, an:(m.mel && m.mel.an) || (m.fan && m.fan.anim) || 'Shoot' }); return r; };
// tes dégâts au boss
const _hERN = hurtE;
hurtE = function(d, b){
  if(!rnOn()) return _hERN(d, b);
  const M = RNET.m, e = G.e, h0 = e.hp, R = G.raid;
  if(!M.host && !R.won){                                     // invité : le boss ne peut pas tomber chez toi, c'est l'hôte qui décide
    e.hp += 1e6; try{ _hERN(d, b); } finally { const dl = Math.max(0, h0 + 1e6 - e.hp); e.hp = Math.max(1, h0 - dl); if(dl > 0){ M.sent += dl; rsend('d', { id:M.me.id, c:r2(M.sent) }); } }
    return 0;
  }
  const r = _hERN(d, b), dl = Math.max(0, h0 - Math.max(0, e.hp));
  if(dl > 0){ M.sent += dl; rsend('d', { id:M.me.id, c:r2(M.sent) }); }
  return r;
};

// ============================================================ RÉCEPTION
function rnMsg(M, k, d){
  if(k === 'rh'){
    if(!d || !d.id || d.id === M.me.id) return;
    const known = Array.isArray(d.team) && d.team.length && d.team.every(t => MV[t] && HERO[t]);
    if(M.host && M.state === 'lobby' && known){ const p = M.seen.get(d.id); M.seen.set(d.id, { id:d.id, pseudo:String(d.pseudo || '?').slice(0, 16), team:d.team.slice(0, RAID.teamMax), last:performance.now(), j:p ? p.j : performance.now() }); }
    return;
  }
  if(k === 'rl'){ if(M.host || M.state !== 'lobby') return; const ch = JSON.stringify(d.list) !== JSON.stringify(M.list) || !M.boss; M.list = d.list || []; if(d.boss && SPR[d.boss]) M.boss = { id:d.boss, stars:d.stars }; if(ch) rnLobbyScreen(M); return; }
  if(k === 'rgo'){ if(M.host || M.state !== 'lobby' || !d || !d.list) return; if(!SPR[d.boss]) return rnAbort('Le Pokémon de ce raid est inconnu de ton jeu : mets-le à jour.'); rnStart(M, d.list, { id:d.boss, stars:d.stars }); return; }
  if(M.state !== 'fight' || !G || !G.raid) return;
  const e = G.e, R = G.raid;
  switch(k){
    case 's': { const a = M.allies.get(d.id); if(!a) return; const now = performance.now(), dtS = Math.max(.02, (now - a.last)/1000);
      a.vx = (d.x - a.tx)/dtS; a.vy = (d.y - a.ty)/dtS; a.tx = d.x; a.ty = d.y; a.hp = d.hp; a.max = d.max; a.last = now;
      if(d.t !== a.t && SPR[d.t]){ a.t = d.t; a.x = d.x; a.y = d.y; } a.out = !!d.out; return; }
    case 'a': { const a = M.allies.get(d.id); if(!a || a.out) return; if(SPR[a.t]) a.ann = { an:resolveAnim(SPR[a.t], d.an) || 'Attack', t0:G.time };
      M.tracers.push({ x:a.x, y:a.y - 10, t0:G.time, col:COL[d.tp] || '#ffffff' }); return; }
    case 'd': { const last = M.dmgSeen[d.id] || 0, dl = d.c - last; if(dl <= 0) return; M.dmgSeen[d.id] = d.c;
      if(M.host && e.hp > 0 && d.id !== M.me.id){ M.recv[d.id] = d.c; e.hp = Math.max(0, e.hp - dl); }   // l'invité a déjà vérifié chez lui que le coup portait
      if(d.id !== M.me.id){ txt.push({ x:e.x + R_(-30, 30), y:e.y - 60, s:String(Math.round(dl*10)), c:'#bff0c0', f:14, t:.8 }); vp({ x:e.x + R_(-20, 20), y:e.y - 10, life:.25, s:6, s1:26, kind:'ring', col:'#bff0c0' }); }
      return; }
    case 'out': { const a = M.allies.get(d.id); if(a) a.out = true; return; }
    case 'leave': { const a = M.allies.get(d.id); if(a){ a.out = true; a.left = true; } if(!M.host && M.list[0] && M.list[0].id === d.id && !R.ended){ R.failed = 'host'; R.allOut = true; G.over = 1; battleEnd(false); } return; }
    case 'win': if(M.host || R.won) return; R.won = true; e.invT = 0; e.hp = 0; return;
    case 'fail': if(M.host || R.ended) return; R.failed = d.why || 'ko'; R.allOut = true; G.over = 1; battleEnd(false); return;
  }
  if(M.host) return;
  // l'hôte fait agir le boss
  switch(k){
    case 'b':
      M.lastB = performance.now(); M.bx = d.x; M.by = d.y;
      if(!R.won){ e.max = d.max; e.hp = Math.max(1, d.hp - Math.max(0, M.sent - ((d.ack && d.ack[M.me.id]) || 0))); }
      if(d.rg > R.rage) raidRage(d.rg, true);
      R.t0 = G.time - (RCF().time - d.tl);
      return;
    case 'bt': e.pat = d.p; e.tele = e.tm = d.t; return;
    case 'bf': { const m = MV[e.t][d.i]; if(!m) return; lbl(1, m.n, e.t); e.atk = e.atkD = .35; e.tele = 0; cast(e, { x:d.x, y:d.y, r:d.r }, m, .5, 0, d.sc, undefined); return; }
    case 'bu': raidUlt(true); return;
  }
}

// ============================================================ CHAQUE IMAGE
const _stepRN = step;
step = function(dt){
  if(!rnOn()) return _stepRN(dt);
  const M = RNET.m, e = G.e, R = G.raid, wasTele = e.tele > 0;
  if(!M.host && !R.won && e.hp < 3) e.hp = 3;                  // un statut (brûlure…) ne fait jamais tomber le boss chez un invité
  _stepRN(dt);
  if(!G || !G.raid || !RNET.m) return;
  if(M.host){
    if(e.tele > 0 && !wasTele) rsend('bt', { p:e.pat, t:r2(e.tele) });
    if(e.hp <= 0 && !M.winSent){ M.winSent = true; [0, 300, 900].forEach(t => setTimeout(() => rsend('win', 1), t)); }
  } else if(M.bx != null && !(e.rs || e.fl || e.bl || e.bur)){ const k = Math.min(1, dt*8); e.x += (M.bx - e.x)*k; e.y += (M.by - e.y)*k; }
  for(const a of M.allies.values()){ const k = Math.min(1, dt*12); a.x += (a.tx - a.x)*k; a.y += (a.ty - a.y)*k; }
  for(let i = M.tracers.length - 1; i >= 0; i--) if(G.time - M.tracers[i].t0 > .3) M.tracers.splice(i, 1);
};
// alliés : sprite, pseudo, PV, base verte + tirs vers le boss
RaidHook.draw = () => {
  const M = RNET.m; if(!rnOn()) return; const e = G.e;
  for(const a of M.allies.values()){
    if(a.out || a.hp <= 0 || !SPR[a.t]) continue;
    animOf(a, e.x, e.y, 1); const f = mon(a, 1), k = 2;
    ctx.save(); ctx.translate(Math.round(a.x), Math.round(a.y));
    ctx.fillStyle = '#0003'; ctx.strokeStyle = '#6ae08ae6'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, (f.sy ?? 14)*k, (f.sw ?? 11)*k, (f.sh ?? 5)*k, 0, 0, 6.283); ctx.fill(); ctx.stroke();
    ctx.globalAlpha = .92; ctx.drawImage(f, -f.width*k/2, -f.height*k/2, f.width*k, f.height*k); ctx.restore();
    const w = 40, fr = Math.max(0, a.hp/(a.max || 1));
    ctx.fillStyle = '#0a0614cc'; ctx.fillRect(a.x - w/2 - 1, a.y - 48, w + 2, 6); ctx.fillStyle = fr < .3 ? '#e8503c' : '#46d468'; ctx.fillRect(a.x - w/2, a.y - 47, w*fr, 4);
    htext(a.pseudo, a.x, a.y - 52, 8, '#bff0c0', 'center');
  }
  for(const q of M.tracers){ const u = Math.min(1, (G.time - q.t0)/.25), x = q.x + (e.x - q.x)*u, y = q.y + (e.y - 20 - q.y)*u;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glow(q.col), x - 12, y - 12, 24, 24); ctx.restore(); }
};
// pause : le raid continue pendant le menu (comme en ligne)
const _pauseRN = pauseGame;
pauseGame = function(){
  if(!rnOn()) return _pauseRN();
  const M = RNET.m; if(M.menuOpen){ M.menuOpen = false; menu(''); return; }
  M.menuOpen = true; rnPauseMenu();
};
function rnPauseMenu(){
  menu(`<h1>Raid à plusieurs</h1><p class='hint'>Attention : le raid continue pendant ce menu !</p>
    <div class='row'><button class='btn' id='rs'>Reprendre</button><button class='btn2' id='op'>Options</button><button class='btn2 bad' id='rq'>Quitter le raid</button></div>`);
  document.getElementById('rs').onclick = () => { if(RNET.m) RNET.m.menuOpen = false; menu(''); };
  document.getElementById('op').onclick = () => showOptions(() => rnOn() ? rnPauseMenu() : null);
  document.getElementById('rq').onclick = () => { if(RNET.m) RaidNet.close(false); G = null; showMain(); };
}

// ============================================================ BOUTONS DE L'ÉCRAN « COMBAT RAID »
RaidHook.menuButtons = () => `<button class='btn2' id='rnnew'>Créer un raid à plusieurs</button><button class='btn2' id='rnjoin'>Rejoindre un raid</button>`;
RaidHook.bindMenu = t => {
  document.getElementById('rnnew').onclick = () => rnChoose(t, true);
  document.getElementById('rnjoin').onclick = () => rnChoose(t, false);
};
function rnChoose(t, create){
  const on = onlineReady();
  menu(`<h1>${create ? 'Créer un raid' : 'Rejoindre un raid'}</h1>
    ${create ? '' : `<div class='row'><input id='rncode' maxlength='5' placeholder='CODE' autocapitalize='characters' autocomplete='off'></div>`}
    <div class='row'><button class='btn' id='rnsb' ${on ? '' : 'disabled'}>En ligne</button><button class='btn2' id='rnlc'>Test local (2 onglets)</button></div>
    ${on ? `<p class='hint'>Connecté en tant que <b>${esc(Online.user.pseudo)}</b>.</p>` : `<p class='hint'>Pour jouer en ligne, connecte-toi dans <b>Multijoueur</b>. <button class='btn2 sm' id='rnlog'>Se connecter</button></p>`}
    <div class='row'><button class='btn2' id='rnb'>Retour</button></div>`);
  const code = () => { const el = document.getElementById('rncode'); return el ? el.value.toUpperCase().replace(/[^A-Z0-9]/g, '') : ''; };
  const go = kind => {
    if(create) return RaidNet.open({ code:rcode(), host:true, kind, teamId:t.id });
    const c = code(); if(c.length !== 5){ const el = document.getElementById('rncode'); if(el){ el.classList.add('bad'); el.focus(); } return; }
    RaidNet.open({ code:c, host:false, kind, teamId:t.id });
  };
  document.getElementById('rnsb').onclick = () => go('sb');
  document.getElementById('rnlc').onclick = () => go('local');
  const lg = document.getElementById('rnlog'); if(lg) lg.onclick = () => SCREENS.online();
  document.getElementById('rnb').onclick = () => SCREENS.raid({ team:t });
  const inp = document.getElementById('rncode'); if(inp){ inp.oninput = () => { inp.value = inp.value.toUpperCase(); inp.classList.remove('bad'); }; setTimeout(() => inp.focus(), 50); }
}
document.head.insertAdjacentHTML('beforeend', `<style>
.rnl{display:flex;flex-direction:column;align-items:center;gap:6px;width:100%}
.rnboss{margin:0;font-size:13px;color:#ffd23f}.rnboss b{color:#ffb0a0}
.rncode{display:flex;flex-direction:column;align-items:center;background:rgba(10,8,24,.55);border:1px solid rgba(255,90,70,.6);border-radius:10px;padding:4px 18px}
.rncode b{font:700 30px var(--font,monospace);letter-spacing:6px;color:#ffe9a0;text-shadow:0 0 10px rgba(255,90,70,.6)}.rncode small{font-size:9px;color:var(--txt2,#c9bcd8)}
.rnps{display:grid;grid-template-columns:repeat(2,minmax(150px,1fr));gap:5px;width:100%;max-width:440px}
.rnp{display:flex;align-items:center;justify-content:space-between;gap:6px;background:var(--glass2,#2a2238);border:1px solid rgba(255,255,255,.12);border-radius:8px;padding:3px 8px;font-size:11px}
.rnp.me{border-color:#6ae08a}.rnp.empty{opacity:.45;justify-content:center}.rnp img{width:24px;height:24px;image-rendering:pixelated}
input#rncode{width:150px;text-align:center;font:700 22px var(--font,monospace);letter-spacing:5px;background:rgba(10,8,24,.85);color:#ffe9a0;border:2px solid var(--line,#fff4);border-radius:8px;padding:4px;user-select:text;-webkit-user-select:text}
input#rncode.bad{border-color:#ff5a4a}
</style>`);
