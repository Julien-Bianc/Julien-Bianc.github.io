// ============================================================
//  online-social.js — ÉCRANS DU MULTIJOUEUR
//    • Connexion / création de compte (pseudo + mot de passe), changement de mot de passe, déconnexion
//    • Amis : demandes d'ami par pseudo, qui est en ligne / en combat, retirer un ami
//    • Défis : défier un ami (équipe 3v3 ou 6v6), fenêtre « Untel te défie ! » → combat en ligne (js/online-battle.js)
//    • Échanges : proposer à un ami des cartes / objets tenus / Capsules Ball contre les siens
//    • Test local : 2 onglets du même navigateur se voient et peuvent s'affronter (sans compte, sans serveur)
//  Branché sur : js/online-core.js (Online, Sync, Notif) et js/online-battle.js (NetMatch, LocalLobby).
//  Écran enregistré : SCREENS.online (entrée « Multijoueur » de data/menu.js).
// ============================================================
const Social = {
  tab:'friends', trades:[], history:[], seen:new Set(), names:{}, local:false, msg:'',

  // ---------------------------------------------------------------- pseudos (cache)
  async pseudoOf(id){
    const f = Online.friends.find(x => x.other === id); if(f) return f.pseudo;
    if(this.names[id]) return this.names[id];
    try{ const { data } = await Online.sb.from('profiles').select('pseudo').eq('id', id).maybeSingle(); if(data) return this.names[id] = data.pseudo; }catch(e){}
    return '?';
  },
  busy(){ return !!(typeof NET !== 'undefined' && NET.m); },
  // un combat Solo / Safari / Entraînement est en cours (pas en ligne)
  inLocalFight(){ return !!(G && !G.over && !(G.cfg && G.cfg.mode === 'online')); },
  rerender(){ const h = document.querySelector('.onl-hub'); if(h && !this.busy()) showOnline(this.tab, true); },
  badge(){ return Online.friends.filter(f => f.status === 'pending' && f.incoming).length + this.trades.filter(t => t.to_id === (Online.user && Online.user.id) && t.status === 'pending').length; },

  // ---------------------------------------------------------------- DÉFIS reçus / mis à jour
  async challengeIn(r){
    if(!r || r.status !== 'pending' || this.seen.has(r.id) || !Online.user || r.to_id !== Online.user.id) return;
    this.seen.add(r.id);
    if(this.busy()){ Online.rpc('respond_challenge', { p_id:r.id, p_accept:false }).catch(() => {}); return; }   // déjà en combat en ligne
    const name = await this.pseudoOf(r.from_id);
    Notif.show({ id:'ch' + r.id, cls:'chal', title:`⚔ ${esc(name)} te défie !`, timeout:ONLINE_CFG.challengeTimeout,
      text:`Combat en ligne ${r.size}v${r.size}${this.inLocalFight() ? '<br><small>Accepter quitte ton combat en cours.</small>' : ''}`,
      buttons:[
        { label:'Accepter', cls:'btn', fn:() => this.acceptChallenge(r, name) },
        { label:'Refuser', fn:() => Online.rpc('respond_challenge', { p_id:r.id, p_accept:false }).catch(() => {}) }
      ] });
  },
  acceptChallenge(r, name){
    if(this.busy()) return;
    if(G){ G = null; }
    pickTeam({ size:r.size, title:`Défi de ${esc(name)} — choisis ton équipe ${r.size}v${r.size}`,
      onCancel:() => { Online.rpc('respond_challenge', { p_id:r.id, p_accept:false }).catch(() => {}); showOnline(); },
      onPick:async team => {
        menu(`<h1>Combat en ligne</h1><p>Connexion à ${esc(name)}…</p>`);
        let res; try{ res = await Online.rpc('respond_challenge', { p_id:r.id, p_accept:true }); }catch(e){ res = 'err:' + e.message; }
        if(res !== 'accepted'){
          const why = { expired:'Ce défi a expiré.', cancelled:`${esc(name)} a annulé le défi.`, declined:'Défi déjà refusé.', notfound:'Défi introuvable.' }[res] || 'Impossible d\'accepter : ' + esc(res);
          menu(`<h1>Combat en ligne</h1><p>${why}</p><div class='row'><button class='btn' id='nb'>Retour</button></div>`);
          document.getElementById('nb').onclick = () => showOnline(); return;
        }
        NetMatch.open({ cid:r.id, host:false, kind:'sb', team, foePseudo:name, waitText:`Connexion à ${esc(name)}…` });
      } });
  },
  async challengeUpd(r){
    if(!r || !r.id) return;
    if(r.status !== 'pending') Notif.close('ch' + r.id);
    const M = typeof NET !== 'undefined' && NET.m;
    if(!M || M.cid !== r.id || M.state !== 'connect') return;
    if(r.status === 'declined') NetMatch.abort(`${esc(M.foe.pseudo)} a refusé le défi.`);
    else if(r.status === 'cancelled') NetMatch.abort(`Le défi a été annulé.`);
    else if(r.status === 'accepted' && M.host && !M.foe.info){ const w = document.getElementById('nwt'); if(w) w.textContent = `${M.foe.pseudo} a accepté ! Connexion…`; }
  },
  // secours si le temps réel ne marche pas : défis reçus récents + état de mon défi en attente
  async pollChallenges(){
    if(!Online.user || !Online.sb) return;
    try{
      const since = new Date(Date.now() - (ONLINE_CFG.challengeTimeout + 45)*1000).toISOString();
      const { data } = await Online.sb.from('challenges').select('*').eq('to_id', Online.user.id).eq('status', 'pending').gte('created_at', since);
      (data || []).forEach(r => this.challengeIn(r));
      const M = typeof NET !== 'undefined' && NET.m;
      if(M && M.kind === 'sb' && M.host && M.state === 'connect'){
        const { data:c } = await Online.sb.from('challenges').select('*').eq('id', M.cid).maybeSingle();
        if(c) this.challengeUpd(c);
      }
    }catch(e){}
  },
  async sendChallenge(f, team){
    if(this.busy()) return;
    menu(`<h1>Combat en ligne</h1><p>Envoi du défi à ${esc(f.pseudo)}…</p>`);
    let cid; try{ cid = await Online.rpc('create_challenge', { p_to:f.other, p_size:team.size }); }
    catch(e){ return errScreen('Impossible d\'envoyer le défi : ' + netErr(e)); }
    NetMatch.open({ cid, host:true, kind:'sb', team, foePseudo:f.pseudo,
      waitText:`Défi ${team.size}v${team.size} envoyé à ${esc(f.pseudo)}. En attente de sa réponse…`,
      onAbort:() => Online.rpc('cancel_challenge', { p_id:cid }).catch(() => {}) });
  },

  // ---------------------------------------------------------------- AMIS
  async friendIn(r){
    if(!r || r.status !== 'pending') return;
    const name = await this.pseudoOf(r.requester);
    Notif.toast(`👋 <b>${esc(name)}</b> veut être ton ami`, '#7ad0ff');
    await Online.loadFriends(); this.refreshBadge(); this.rerender();
  },
  async friendUpd(r){
    if(!r || r.status !== 'accepted') return;
    const name = await this.pseudoOf(r.addressee);
    Notif.toast(`🤝 <b>${esc(name)}</b> a accepté ta demande d'ami`, '#8dff9a');
    await Online.loadFriends(); this.rerender();
  },

  // ---------------------------------------------------------------- ÉCHANGES
  async loadTrades(){
    if(!Online.user) return;
    try{
      const { data } = await Online.sb.from('trades').select('*').order('updated_at', { ascending:false }).limit(40);
      const all = data || [];
      this.trades = all.filter(t => t.status === 'pending');
      this.history = all.filter(t => t.status !== 'pending').slice(0, 8);
      await Promise.all(all.map(t => this.pseudoOf(t.from_id === Online.user.id ? t.to_id : t.from_id)));
    }catch(e){ console.warn(e); }
    this.refreshBadge();
  },
  async tradeIn(r){
    const name = await this.pseudoOf(r.from_id);
    Notif.toast(`🔁 <b>${esc(name)}</b> te propose un échange`, '#ffd23f');
    await this.loadTrades(); this.rerender();
  },
  async tradeUpd(r){
    if(!Online.user) return;
    const mine = r.from_id === Online.user.id, name = await this.pseudoOf(mine ? r.to_id : r.from_id);
    if(mine && r.status === 'accepted'){ await Sync.pull().catch(() => {}); Notif.toast(`✅ <b>${esc(name)}</b> a accepté ton échange !`, '#8dff9a'); if(typeof coinSfx === 'function') coinSfx(); }
    else if(mine && r.status === 'declined') Notif.toast(`❌ <b>${esc(name)}</b> a refusé ton échange`, '#ff8a7a');
    else if(mine && r.status === 'failed') Notif.toast(`⚠ Échange avec <b>${esc(name)}</b> annulé : il te manquait des objets`, '#ff8a7a');
    await this.loadTrades(); this.rerender();
  },
  // la sauvegarde a été remplacée par celle du serveur (échange accepté, autre appareil…)
  saveReplaced(){
    try{ Save.ensureDefaults(); }catch(e){}
    if(typeof refreshWallet === 'function') refreshWallet();
  },
  refreshBadge(){
    const n = this.badge();
    document.querySelectorAll('.onl-badge').forEach(b => { b.textContent = n || ''; b.style.display = n ? '' : 'none'; });
  },

  // ---------------------------------------------------------------- TEST LOCAL (2 onglets)
  localChallengeIn(d){
    if(this.busy()){ LocalLobby.send({ k:'resp', to:d.from, cid:d.cid, ok:false }); return; }
    Notif.show({ id:'lc' + d.cid, cls:'chal', title:`⚔ ${esc(d.p)} te défie !`, text:`Test local ${d.size}v${d.size}`, timeout:ONLINE_CFG.challengeTimeout,
      onTimeout:() => LocalLobby.send({ k:'resp', to:d.from, cid:d.cid, ok:false }),
      buttons:[
        { label:'Accepter', cls:'btn', fn:() => { if(G) G = null; pickTeam({ size:d.size, title:`Défi de ${esc(d.p)} — choisis ton équipe ${d.size}v${d.size}`,
            onCancel:() => { LocalLobby.send({ k:'resp', to:d.from, cid:d.cid, ok:false }); showLocal(); },
            onPick:team => { LocalLobby.send({ k:'resp', to:d.from, cid:d.cid, ok:true });
              NetMatch.open({ cid:d.cid, host:false, kind:'local', team, foePseudo:d.p, myPseudo:LocalLobby.pseudo, waitText:'Connexion…' }); } }); } },
        { label:'Refuser', fn:() => LocalLobby.send({ k:'resp', to:d.from, cid:d.cid, ok:false }) }
      ] });
  },
  localChallengeResp(d){
    const M = typeof NET !== 'undefined' && NET.m;
    if(M && M.cid === d.cid && M.state === 'connect' && !d.ok) NetMatch.abort(`${esc(M.foe.pseudo)} a refusé le défi.`);
  }
};

// ============================================================ OUTILS
const NET_ERR = { not_friends:'vous n\'êtes pas (ou plus) amis.', bad_size:'taille d\'équipe invalide.', missing_items:'tu n\'as plus tous les objets proposés.',
  too_many_trades:'tu as déjà 10 échanges en attente.', bad_items:'liste d\'objets invalide (12 lignes et 99 exemplaires max).', empty_trade:'l\'échange est vide.',
  not_authenticated:'tu n\'es plus connecté.', timeout:'le serveur ne répond pas.' };
function netErr(e){
  const m = String(e && e.message || e), k = Object.keys(NET_ERR).find(k => m.includes(k));
  return k ? NET_ERR[k] : m;
}
function errScreen(msg, back){
  menu(`<h1>Multijoueur</h1><p>${esc(msg)}</p><div class='row'><button class='btn' id='nb'>Retour</button></div>`);
  document.getElementById('nb').onclick = back || (() => showOnline());
}
// une équipe en ligne ne contient que des Pokémon vraiment capturés (le mode développeur ne compte pas)
function onlineTeamOk(t){
  const own = Save.load().owned;
  return teamOk(t) && (!Owned.ready() || !Array.isArray(own) || t.members.every(id => own.includes(id)));
}
// choix de l'équipe pour un combat en ligne : o = { size (3 ou 6, facultatif), title, onPick(team), onCancel() }
function pickTeam(o){
  const all = Save.teams().filter(t => !o.size || t.size === o.size);
  const back = () => (o.onCancel || (() => showOnline()))();
  if(!all.length){
    menu(`<h1>${o.title || 'Choisis ton équipe'}</h1><p>Tu n'as aucune équipe ${o.size ? o.size + 'v' + o.size : ''}. Crée-en une dans <b>Mes équipes</b>.</p>
      <div class='row'><button class='btn2' id='pt-t'>Mes équipes</button><button class='btn2' id='pt-x'>Annuler</button></div>`);
    document.getElementById('pt-t').onclick = () => { if(o.onCancel) o.onCancel(); showTeams(); };
    document.getElementById('pt-x').onclick = back; return;
  }
  menu(`<h1>${o.title || 'Choisis ton équipe'}</h1><div class='scroll onl-teams'>${all.map(t => { const ok = onlineTeamOk(t); return `
    <div class='trow ${ok ? '' : 'off'}'><div class='tinfo'><b>${esc(t.name)}</b> <span class='tag'>${t.size}v${t.size}</span>
      <div class='tmem'>${t.members.map(id => thumbH(id, Save.teamItem(t, id))).join('')}</div>${ok ? '' : `<small class='bad'>Contient un Pokémon pas encore capturé (mode développeur)</small>`}</div>
      <button class='btn' data-pt='${t.id}' ${ok ? '' : 'disabled'}>Choisir</button></div>`; }).join('')}</div>
    <div class='row'><button class='btn2' id='pt-x'>Annuler</button></div>`);
  bindAll('[data-pt]', el => { const t = Save.team(el.dataset.pt); if(t) o.onPick(t); });
  document.getElementById('pt-x').onclick = back;
}
const recordTxt = (w, l) => `${w || 0} V · ${l || 0} D`;

// ============================================================ ÉCRAN PRINCIPAL DU MULTIJOUEUR
function showOnline(tab, keep){
  if(Social.local && LocalLobby.bc) return showLocal();
  if(!Online.configured()) return showOnlineOff();
  if(!Online.user) return showAuth('login');
  Social.tab = tab = tab || Social.tab || 'friends';
  const u = Online.user, nReq = Online.friends.filter(f => f.status === 'pending' && f.incoming).length,
        nTr = Social.trades.filter(t => t.to_id === u.id).length;
  const n = (k, v) => v ? ` <span class='nb'>${v}</span>` : '';
  const prev = keep && document.getElementById('fp') ? document.getElementById('fp').value : '';
  menu(`<div class='onl onl-hub'><div class='hd'><h1>Multijoueur</h1><span class='who'><b>${esc(u.pseudo)}</b> <small>${recordTxt(u.wins, u.losses)}</small></span></div>
    <div class='tabs'><button class='btn2 ${tab === 'friends' ? 'on' : ''}' data-ot='friends'>Amis${n('f', nReq)}</button><button class='btn2 ${tab === 'trades' ? 'on' : ''}' data-ot='trades'>Échanges${n('t', nTr)}</button><button class='btn2 ${tab === 'account' ? 'on' : ''}' data-ot='account'>Compte</button></div>
    <div class='onl-body' id='ob'></div>
    <div class='row'><button class='btn2' id='o-local'>Test local</button><button class='btn2' id='back'>Retour</button></div></div>`);
  bindAll('[data-ot]', el => showOnline(el.dataset.ot));
  document.getElementById('back').onclick = showMain;
  document.getElementById('o-local').onclick = () => { Social.local = true; showLocal(); };
  if(tab === 'friends') friendsTab(prev);
  else if(tab === 'trades') tradesTab();
  else accountTab();
}
SCREENS.online = () => showOnline();

// ---------------------------------------------------------------- onglet Amis
function friendsTab(prev){
  const ob = document.getElementById('ob');
  ob.innerHTML = `<div class='row addf'><input id='fp' maxlength='16' placeholder='Pseudo de ton ami' autocomplete='off' value='${esc(prev || '')}'><button class='btn' id='fadd'>Ajouter</button></div>
    <p class='hint' id='fmsg'>${Social.msg || 'Ajoute un ami avec son pseudo exact, puis défie-le ou propose-lui un échange.'}</p><div class='scroll flist' id='flist'></div>`;
  Social.msg = '';
  const add = async () => {
    const p = document.getElementById('fp').value.trim(), m = document.getElementById('fmsg'); if(!p) return;
    m.textContent = 'Envoi…';
    let r; try{ r = await Online.rpc('send_friend_request', { p_pseudo:p }); }catch(e){ m.textContent = 'Erreur : ' + netErr(e); return; }
    Social.msg = esc(({ sent:`Demande envoyée à ${p}.`, accepted:`${p} t'avait déjà demandé : vous êtes amis !`, already:`${p} est déjà ton ami.`,
      pending:`Demande déjà envoyée à ${p}.`, notfound:`Aucun joueur « ${p} ».`, self:'C\'est toi !', limit:'Trop de demandes en attente (30 max).' })[r] || r);
    await Online.loadFriends(); showOnline('friends');
  };
  document.getElementById('fadd').onclick = add;
  document.getElementById('fp').onkeydown = e => { if(e.key === 'Enter') add(); };
  fillFriends();
}
function fillFriends(){
  const el = document.getElementById('flist'); if(!el) return;
  const F = Online.friends, inc = F.filter(f => f.status === 'pending' && f.incoming), out = F.filter(f => f.status === 'pending' && !f.incoming),
        ok = F.filter(f => f.status === 'accepted').sort((a, b) => (Online.isOnline(b.other) - Online.isOnline(a.other)) || a.pseudo.localeCompare(b.pseudo));
  const dot = id => Online.inFight(id) ? `<i class='dot fight' title='En combat'></i>` : Online.isOnline(id) ? `<i class='dot on' title='En ligne'></i>` : `<i class='dot' title='Hors ligne'></i>`;
  const st = id => Online.inFight(id) ? 'en combat' : Online.isOnline(id) ? 'en ligne' : 'hors ligne';
  el.innerHTML = (inc.length ? `<h3>Demandes reçues</h3>` + inc.map(f => `<div class='frow'><span class='fn'><b>${esc(f.pseudo)}</b><small>veut être ton ami</small></span>
      <button class='btn sm' data-fa='${f.fid}'>Accepter</button><button class='btn2 sm' data-fr='${f.fid}'>Refuser</button></div>`).join('') : '')
    + `<h3>Mes amis (${ok.length})</h3>` + (ok.length ? ok.map(f => `<div class='frow'>${dot(f.other)}<span class='fn'><b>${esc(f.pseudo)}</b><small>${st(f.other)} · ${recordTxt(f.wins, f.losses)}</small></span>
      <button class='btn sm' data-fc='${f.other}' ${Online.inFight(f.other) ? 'disabled' : ''}>Défier</button><button class='btn2 sm' data-ft='${f.other}'>Échanger</button><button class='btn2 sm bad' data-fx='${f.fid}' title='Retirer'>✕</button></div>`).join('')
      : `<p class='hint'>Pas encore d'ami. Donne ton pseudo <b>${esc(Online.user.pseudo)}</b> à tes amis !</p>`)
    + (out.length ? `<h3>Demandes envoyées</h3>` + out.map(f => `<div class='frow'><span class='fn'><b>${esc(f.pseudo)}</b><small>en attente</small></span><button class='btn2 sm' data-fx='${f.fid}'>Annuler</button></div>`).join('') : '');
  const done = () => Online.loadFriends().then(() => { if(document.getElementById('flist')) showOnline('friends', true); });
  bindAll('[data-fa]', b => Online.rpc('respond_friend', { p_id:+b.dataset.fa, p_accept:true }).then(done).catch(e => Notif.toast(netErr(e))));
  bindAll('[data-fr]', b => Online.rpc('respond_friend', { p_id:+b.dataset.fr, p_accept:false }).then(done).catch(e => Notif.toast(netErr(e))));
  bindAll('[data-fx]', b => {
    if(!b.classList.contains('sure')){ b.classList.add('sure'); b.textContent = 'Sûr ?'; setTimeout(() => { if(b.isConnected){ b.classList.remove('sure'); b.textContent = b.title ? '✕' : 'Annuler'; } }, 2500); return; }
    Online.rpc('remove_friend', { p_id:+b.dataset.fx }).then(done).catch(e => Notif.toast(netErr(e)));
  });
  bindAll('[data-fc]', b => { const f = F.find(x => x.other === b.dataset.fc); if(!f) return;
    if(!Online.isOnline(f.other)) Notif.toast(`${esc(f.pseudo)} semble hors ligne : il ne verra peut-être pas ton défi.`, '#ffe27a');
    pickTeam({ title:`Défier ${esc(f.pseudo)} — choisis ton équipe`, onPick:t => Social.sendChallenge(f, t), onCancel:() => showOnline('friends') }); });
  bindAll('[data-ft]', b => { const f = F.find(x => x.other === b.dataset.ft); if(f) showTrade(f); });
  Social.refreshBadge();
}
Online.on('presence', fillFriends);
Online.on('friends', () => { fillFriends(); Social.refreshBadge(); });

// ---------------------------------------------------------------- onglet Échanges
const tradable = id => { const it = ITEM[id]; return !!it && !it.limited && !/^(ticket|ball):/.test(id); };
function itemMini(id, n){
  const it = ITEM[id]; if(!it) return `<span class='im'>${esc(id)} ×${n}</span>`;
  const img = it.kind === 'card' ? cardArt(it.poke, it.r) : imgOf(it);
  return `<span class='im' style='${rarCss(it.r)}' title="${esc(it.name)}"><img src='${img}'><span>${esc(it.kind === 'card' ? (NAME[it.poke] || it.poke) + ' ' + SYM[it.r] : it.name)}</span>${n > 1 ? `<em>×${n}</em>` : ''}</span>`;
}
const itemsLine = o => Object.keys(o || {}).length ? Object.entries(o).map(([id, n]) => itemMini(id, n)).join('') : `<span class='hint'>rien</span>`;
function tradesTab(){
  shopBuild();
  const ob = document.getElementById('ob'), me = Online.user.id, nm = id => esc(Social.names[id] || Online.friendName(id));
  const inc = Social.trades.filter(t => t.to_id === me), out = Social.trades.filter(t => t.from_id === me);
  const card = (t, inbound) => `<div class='trd'><div class='trh'><b>${inbound ? nm(t.from_id) + ' te propose' : 'À ' + nm(t.to_id)}</b>${t.note ? `<small>« ${esc(t.note)} »</small>` : ''}</div>
    <div class='trl'><span class='lab'>${inbound ? 'Tu reçois' : 'Tu donnes'}</span>${itemsLine(t.give)}</div>
    <div class='trl'><span class='lab'>${inbound ? 'Tu donnes' : 'Tu reçois'}</span>${itemsLine(t.take)}</div>
    <div class='row left'>${inbound ? `<button class='btn sm' data-ta='${t.id}'>Accepter</button><button class='btn2 sm' data-td='${t.id}'>Refuser</button>` : `<button class='btn2 sm' data-tc='${t.id}'>Annuler</button>`}</div></div>`;
  const stl = { accepted:'✅ accepté', declined:'❌ refusé', cancelled:'annulé', failed:'⚠ échoué' };
  ob.innerHTML = `<div class='scroll tlist'>
    <div class='row left'><button class='btn sm' id='tnew'>+ Nouvel échange</button><span class='hint'>Cartes, objets tenus et Capsules Ball. Les tickets, Balls et cartes limitées ne s'échangent pas.</span></div>
    <h3>Reçus (${inc.length})</h3>${inc.length ? inc.map(t => card(t, true)).join('') : `<p class='hint'>Aucune proposition reçue.</p>`}
    <h3>Envoyés (${out.length})</h3>${out.length ? out.map(t => card(t, false)).join('') : `<p class='hint'>Aucune proposition en attente.</p>`}
    ${Social.history.length ? `<h3>Récents</h3>` + Social.history.map(t => `<div class='trd old'><small>${t.from_id === me ? 'À ' + nm(t.to_id) : 'De ' + nm(t.from_id)} — ${stl[t.status] || t.status}</small></div>`).join('') : ''}</div>`;
  document.getElementById('tnew').onclick = () => {
    const ok = Online.friends.filter(f => f.status === 'accepted');
    if(!ok.length) return Notif.toast('Ajoute d\'abord un ami dans l\'onglet Amis.');
    menu(`<h1>Échanger avec…</h1><div class='scroll flist'>${ok.map(f => `<div class='frow'><span class='fn'><b>${esc(f.pseudo)}</b></span><button class='btn sm' data-tw='${f.other}'>Choisir</button></div>`).join('')}</div>
      <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
    bindAll('[data-tw]', b => showTrade(ok.find(f => f.other === b.dataset.tw)));
    document.getElementById('back').onclick = () => showOnline('trades');
  };
  const act = async (fn, args, after) => { try{ const r = await Online.rpc(fn, args); if(after) await after(r); }catch(e){ Notif.toast('Erreur : ' + esc(netErr(e)), '#ff8a7a'); } await Social.loadTrades(); showOnline('trades'); };
  bindAll('[data-ta]', b => { b.disabled = true; acceptTrade(Social.trades.find(t => t.id === b.dataset.ta)); });
  bindAll('[data-td]', b => act('respond_trade', { p_id:b.dataset.td, p_accept:false }));
  bindAll('[data-tc]', b => act('cancel_trade', { p_id:b.dataset.tc }));
}
async function acceptTrade(t){
  if(!t) return;
  const inv = Save.inv(), miss = Object.entries(t.take || {}).filter(([id, n]) => (inv[id] || 0) < n);
  if(miss.length) return Notif.toast('Il te manque : ' + miss.map(([id]) => esc(ITEM[id] ? ITEM[id].name : id)).join(', '), '#ff8a7a');
  await Sync.push(true);                                    // le serveur doit connaître ton inventaire exact avant l'échange
  let r; try{ r = await Online.rpc('respond_trade', { p_id:t.id, p_accept:true }); }catch(e){ r = 'err'; Notif.toast('Erreur : ' + esc(netErr(e)), '#ff8a7a'); }
  if(r === 'accepted'){ await Sync.pull().catch(() => {}); Notif.toast('✅ Échange réussi ! Regarde ton inventaire.', '#8dff9a'); if(typeof coinSfx === 'function') coinSfx(); }
  else if(r === 'failed:you_missing') Notif.toast('Il te manque des objets demandés (sont-ils bien synchronisés ?).', '#ff8a7a');
  else if(r === 'failed:sender_missing') Notif.toast('Ton ami n\'a plus les objets proposés : échange annulé.', '#ff8a7a');
  else if(r === 'failed:not_friends') Notif.toast('Vous n\'êtes plus amis : échange annulé.', '#ff8a7a');
  else if(r !== 'err') Notif.toast('Échange : ' + esc(r));
  await Social.loadTrades(); showOnline('trades');
}

// ---------------------------------------------------------------- composer un échange
//  st = { give:{id:n}, take:{id:n}, side:'give'|'take', foe:{id:n} (inventaire de l'ami), kind:'all'|'card'|'held'|'capsule' }
async function showTrade(f, st){
  shopBuild();
  if(!st){
    menu(`<h1>Échange avec ${esc(f.pseudo)}</h1><p>Chargement de son inventaire…</p>`);
    await Sync.push().catch(() => {});
    let foe; try{ foe = await Online.rpc('friend_inventory', { p_friend:f.other }) || {}; }catch(e){ return errScreen('Impossible de lire son inventaire : ' + netErr(e), () => showOnline('trades')); }
    st = { give:{}, take:{}, side:'give', foe, kind:'all', note:'' };
  }
  const src = st.side === 'give' ? Save.inv() : st.foe, pick = st[st.side];
  const ids = Object.keys(src).filter(id => src[id] > 0 && tradable(id) && (st.kind === 'all' || ITEM[id].kind === st.kind))
    .sort((a, b) => byRarity(ITEM[a], ITEM[b]) || ITEM[a].kind.localeCompare(ITEM[b].kind) || ITEM[a].name.localeCompare(ITEM[b].name));
  const lines = (side) => { const o = st[side], k = Object.keys(o); return k.length ? k.map(id => `<button class='tline' data-rm='${side}:${id}' title='Retirer 1'>${itemMini(id, o[id])}<i>−</i></button>`).join('') : `<p class='hint'>${side === 'give' ? 'Rien pour l\'instant' : 'Rien pour l\'instant'}</p>`; };
  const kinds = [['all', 'Tout'], ['card', 'Cartes'], ['held', 'Objets'], ['capsule', 'Capsules']];
  const note = document.getElementById('tnote') ? document.getElementById('tnote').value : st.note; st.note = note;
  menu(`<div class='onl'><div class='hd'><h1>Échange avec ${esc(f.pseudo)}</h1></div>
    <div class='edit trade'>
      <div class='scroll left'>
        <button class='tside ${st.side === 'give' ? 'on' : ''}' data-side='give'><b>Tu donnes</b><small>tes objets</small></button><div class='tlines'>${lines('give')}</div>
        <button class='tside ${st.side === 'take' ? 'on' : ''}' data-side='take'><b>Tu demandes</b><small>objets de ${esc(f.pseudo)}</small></button><div class='tlines'>${lines('take')}</div>
        <input id='tnote' maxlength='120' placeholder='Petit mot (facultatif)' value='${esc(note || '')}'>
      </div>
      <div class='scroll right'>
        <div class='row tkinds'>${kinds.map(([k, l]) => `<button class='btn2 sm ${st.kind === k ? 'on' : ''}' data-k='${k}'>${l}</button>`).join('')}</div>
        <p class='hint'>${st.side === 'give' ? 'Touche un de TES objets pour l\'ajouter à ce que tu donnes.' : `Touche un objet de ${esc(f.pseudo)} pour le demander.`}</p>
        <div class='igrid'>${ids.length ? ids.map(id => itemCard(ITEM[id], { n:src[id], cls:pick[id] ? 'foc' : '' })).join('') : `<p class='hint'>Aucun objet échangeable ici.</p>`}</div>
      </div>
    </div>
    <div class='row'><button class='btn' id='tsend'>Proposer l'échange</button><button class='btn2' id='back'>Annuler</button></div></div>`);
  const redo = () => showTrade(f, st);
  bindAll('[data-side]', b => { st.side = b.dataset.side; redo(); });
  bindAll('[data-k]', b => { st.kind = b.dataset.k; redo(); });
  bindAll('.igrid [data-id]', b => {
    const id = b.dataset.id, o = st[st.side], have = (st.side === 'give' ? Save.inv() : st.foe)[id] || 0;
    if((o[id] || 0) >= Math.min(99, have)) return Notif.toast('Il n\'y en a pas plus.');
    if(!o[id] && Object.keys(o).length >= 12) return Notif.toast('12 objets différents maximum de chaque côté.');
    o[id] = (o[id] || 0) + 1; redo();
  });
  bindAll('[data-rm]', b => { const [side, id] = b.dataset.rm.split(/:(.*)/s); const o = st[side]; if(--o[id] <= 0) delete o[id]; redo(); });
  document.getElementById('back').onclick = () => showOnline('trades');
  document.getElementById('tsend').onclick = async () => {
    if(!Object.keys(st.give).length && !Object.keys(st.take).length) return Notif.toast('Ajoute au moins un objet.');
    const b = document.getElementById('tsend'); b.disabled = true; b.textContent = 'Envoi…';
    const ok = await Sync.push(true);
    if(!ok){ b.disabled = false; b.textContent = 'Proposer l\'échange'; return Notif.toast('Sauvegarde pas encore envoyée au serveur, réessaie.', '#ff8a7a'); }
    try{ await Online.rpc('create_trade', { p_to:f.other, p_give:st.give, p_take:st.take, p_note:(document.getElementById('tnote').value || '').trim() || null }); }
    catch(e){ b.disabled = false; b.textContent = 'Proposer l\'échange'; return Notif.toast('Erreur : ' + esc(netErr(e)), '#ff8a7a'); }
    Notif.toast(`Proposition envoyée à <b>${esc(f.pseudo)}</b>`, '#8dff9a');
    await Social.loadTrades(); showOnline('trades');
  };
}

// ---------------------------------------------------------------- onglet Compte
function accountTab(){
  const ob = document.getElementById('ob'), u = Online.user;
  const sync = !Sync.attached ? 'hors ligne (copie locale)' : Sync.dirty ? 'envoi en attente…' : 'à jour ✔';
  ob.innerHTML = `<div class='scroll acc'>
    <p>Connecté en tant que <b>${esc(u.pseudo)}</b> — combats en ligne : ${recordTxt(u.wins, u.losses)}</p>
    <p>Sauvegarde en ligne : <b id='syn'>${sync}</b><br><small class='hint'>Équipes, inventaire, Pokédollars, Pokémon capturés et progression suivent ton compte sur tous tes appareils.</small></p>
    <h3>Changer de mot de passe</h3>
    <div class='row left'><input id='np1' type='password' placeholder='Nouveau mot de passe' autocomplete='new-password'><input id='np2' type='password' placeholder='Confirmer' autocomplete='new-password'><button class='btn2 sm' id='npw'>Valider</button></div>
    <p class='hint' id='npm'>Note-le bien : sans adresse e-mail, un mot de passe oublié ne peut pas être récupéré.</p>
    <div class='row left'><button class='btn2 bad' id='lo'>Se déconnecter</button></div></div>`;
  document.getElementById('npw').onclick = async () => {
    const a = document.getElementById('np1').value, b = document.getElementById('np2').value, m = document.getElementById('npm');
    if(a.length < 6) return m.textContent = '6 caractères minimum.';
    if(a !== b) return m.textContent = 'Les deux mots de passe ne correspondent pas.';
    const { error } = await Online.sb.auth.updateUser({ password:a });
    m.textContent = error ? 'Erreur : ' + error.message : 'Mot de passe changé ✔';
  };
  document.getElementById('lo').onclick = async () => { menu('<h1>Déconnexion…</h1>'); await Online.logout(); showAuth('login', 'Déconnecté. Tu joues maintenant sans compte (sauvegarde du navigateur).'); };
}

// ============================================================ CONNEXION / INSCRIPTION
function showAuth(mode, info){
  const reg = mode === 'register';
  menu(`<div class='onl auth'><h1>Multijoueur</h1>
    <div class='tabs'><button class='btn2 ${reg ? '' : 'on'}' data-am='login'>Se connecter</button><button class='btn2 ${reg ? 'on' : ''}' data-am='register'>Créer un compte</button></div>
    <form id='af' autocomplete='on' onsubmit='return false'>
      <label>Pseudo<input id='ap' name='username' maxlength='16' autocomplete='username' autocapitalize='off' spellcheck='false'></label>
      <label>Mot de passe<input id='aw' name='password' type='password' autocomplete='${reg ? 'new-password' : 'current-password'}'></label>
      ${reg ? `<label>Confirmer<input id='aw2' type='password' autocomplete='new-password'></label>` : ''}
      <p class='hint err' id='ae'>${info ? esc(info) : reg ? 'Pseudo : 3 à 16 caractères (lettres, chiffres, - et _). Ta progression actuelle sera rattachée à ce compte.' : 'Connecte-toi pour retrouver ta progression et jouer avec tes amis.'}</p>
      <div class='row'><button class='btn' id='ago' type='submit'>${reg ? 'Créer mon compte' : 'Connexion'}</button></div>
    </form>
    <div class='row'><button class='btn2' id='o-local'>Test local (2 onglets)</button><button class='btn2' id='back'>Retour</button></div></div>`);
  bindAll('[data-am]', b => showAuth(b.dataset.am));
  document.getElementById('back').onclick = showMain;
  document.getElementById('o-local').onclick = () => { Social.local = true; showLocal(); };
  const go = async () => {
    const p = document.getElementById('ap').value, w = document.getElementById('aw').value, e = document.getElementById('ae'), b = document.getElementById('ago');
    if(reg && w !== document.getElementById('aw2').value){ e.textContent = 'Les deux mots de passe ne correspondent pas.'; return; }
    b.disabled = true; e.textContent = reg ? 'Création du compte…' : 'Connexion…';
    const r = reg ? await Online.register(p, w) : await Online.login(p, w);
    if(!document.getElementById('ae')) return;
    if(!r.ok){ b.disabled = false; e.textContent = r.msg; return; }
    afterAuth();
  };
  document.getElementById('af').onsubmit = e => { e.preventDefault(); go(); return false; };
  setTimeout(() => { const i = document.getElementById('ap'); if(i && matchMedia('(pointer:fine)').matches) i.focus(); }, 50);
}
function afterAuth(){
  if(Online.imported){ Online.imported = false; Notif.toast('Ta progression de cet appareil a été rattachée à ton compte ✔', '#8dff9a'); }
  Notif.toast(`Bienvenue <b>${esc(Online.user.pseudo)}</b> !`, '#ffd23f');
  if(!Owned.ready()) return showMain();                    // compte neuf sans Pokémon : choix du premier Pokémon
  showOnline('friends');
}
function showOnlineOff(){
  menu(`<div class='onl'><h1>Multijoueur</h1>
    <p>Le jeu en ligne n'est pas encore configuré.</p>
    <p class='hint'>Pour l'activer : crée un projet Supabase, lance <b>supabase/schema.sql</b>, puis remplis <b>js/online-config.js</b> (voir README).</p>
    <p>En attendant, tu peux tester le combat en ligne entre <b>2 onglets</b> de ce navigateur.</p>
    <div class='row'><button class='btn' id='o-local'>Test local (2 onglets)</button><button class='btn2' id='back'>Retour</button></div></div>`);
  document.getElementById('o-local').onclick = () => { Social.local = true; showLocal(); };
  document.getElementById('back').onclick = showMain;
}

// ============================================================ TEST LOCAL
function showLocal(){
  LocalLobby.join();
  menu(`<div class='onl'><h1>Test local</h1>
    <p class='hint'>Ouvre le jeu dans un <b>2e onglet</b> de ce navigateur → Multijoueur → Test local. Chaque onglet voit l'autre et peut le défier.<br>Ajoute <b>?lag=120</b> à l'adresse pour simuler 120 ms de latence.</p>
    <p>Tu es : <b>${esc(LocalLobby.pseudo)}</b></p>
    <div class='scroll flist' id='llist'></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div></div>`);
  document.getElementById('back').onclick = () => { Social.local = false; LocalLobby.leave(); showOnline(); };
  const fill = () => {
    const el = document.getElementById('llist'); if(!el) return;
    const P = [...LocalLobby.peers.values()];
    el.innerHTML = P.length ? P.map(p => `<div class='frow'><i class='dot ${p.s === 'fight' ? 'fight' : 'on'}'></i><span class='fn'><b>${esc(p.p)}</b><small>${p.s === 'fight' ? 'en combat' : 'au menu'}</small></span>
      <button class='btn sm' data-lc='${p.id}' ${p.s === 'fight' ? 'disabled' : ''}>Défier</button></div>`).join('') : `<p class='hint'>Personne pour l'instant… ouvre un 2e onglet.</p>`;
    bindAll('[data-lc]', b => { const p = LocalLobby.peers.get(b.dataset.lc); if(!p) return;
      pickTeam({ title:`Défier ${esc(p.p)} — choisis ton équipe`, onCancel:showLocal, onPick:team => {
        const cid = 'L' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
        LocalLobby.send({ k:'chal', to:p.id, cid, size:team.size, p:LocalLobby.pseudo });
        NetMatch.open({ cid, host:true, kind:'local', team, foePseudo:p.p, myPseudo:LocalLobby.pseudo, waitText:`Défi envoyé à ${esc(p.p)}…`,
          onAbort:() => LocalLobby.send({ k:'cancel', to:p.id, cid }) });
      } }); });
  };
  LocalLobby.on(fill); fill();
}

// ============================================================ BRANCHEMENTS
// menu principal : pastille du compte en haut à droite (pseudo + nombre de demandes / échanges en attente)
const _mmOnl = renderMainMM;
renderMainMM = function(){
  _mmOnl();
  const top = document.querySelector('.mm-top'); if(!top || !Online.configured()) return;
  const b = document.createElement('button'); b.className = 'onl-chip';
  b.innerHTML = Online.user ? `<i class='dot on'></i>${esc(Online.user.pseudo)}<span class='onl-badge'></span>` : 'Se connecter';
  b.onclick = () => SCREENS.online();
  top.prepend(b); Social.refreshBadge();
};
Online.on('login', () => { if(document.querySelector('#menu.home')) showMain(); });
Online.on('logout', () => { Social.trades = []; Social.history = []; Social.seen.clear(); });

// en combat en ligne, les outils développeur de combat (invincible, recharge instantanée) sont coupés
if(typeof DEV !== 'undefined'){
  const _devIsOnl = DEV.is.bind(DEV);
  DEV.is = k => ((k === 'god' || k === 'cd') && typeof NET !== 'undefined' && NET.m) ? false : _devIsOnl(k);
}

// Classeur : le bouton « Échanger — bientôt » ouvre maintenant les échanges
const _binderOnl = binderBody;
binderBody = function(o, inv){
  return _binderOnl(o, inv).replace(`<button class='btn2' disabled>Échanger — bientôt</button>`, `<button class='btn2' onclick='SCREENS.online()'>Échanger</button>`)
    .replace('Échanges entre joueurs : bientôt.', 'Échanges entre amis : Multijoueur → Échanges.');
};
