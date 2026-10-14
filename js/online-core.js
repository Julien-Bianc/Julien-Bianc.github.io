// ============================================================
//  online-core.js — COMPTES (pseudo + mot de passe), SAUVEGARDE EN LIGNE, PRÉSENCE, NOTIFICATIONS
//    • Online   : connexion à Supabase, inscription / connexion / déconnexion, qui est en ligne, notifications temps réel
//    • Sync     : la sauvegarde du jeu (équipes, inventaire, Pokédollars, progression…) suit ton compte sur tous tes appareils
//    • Notif    : fenêtres « Untel te défie ! » et petits messages en haut de l'écran
//  Réglages : js/online-config.js. Base de données : supabase/schema.sql.
//  Hors connexion (ou sans compte) le jeu marche comme avant, avec la sauvegarde du navigateur.
// ============================================================
const PSEUDO_RE = /^[A-Za-z0-9_-]{3,16}$/;
const GUEST_KEY = Save.KEY;                                  // sauvegarde « invité » (sans compte) : arene.save.v1
const clone = o => o == null ? o : JSON.parse(JSON.stringify(o));
const withTimeout = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('timeout')), ms))]);

// ============================================================ NOTIFICATIONS
const Notif = {
  el:null,
  box(){
    if(!this.el || !this.el.isConnected){ this.el = document.createElement('div'); this.el.id = 'netpop'; document.getElementById('app').appendChild(this.el); }
    return this.el;
  },
  // o = { id, title, text (HTML), buttons:[{ label, fn, cls }], timeout (s), onTimeout }
  show(o){
    const box = this.box(); if(o.id) this.close(o.id);
    const d = document.createElement('div'); d.className = 'np' + (o.cls ? ' ' + o.cls : ''); d.dataset.id = o.id || '';
    d.innerHTML = `<b class='np-h'>${o.title}</b>${o.text ? `<p>${o.text}</p>` : ''}<div class='np-b'></div>${o.timeout ? `<i class='np-t' style='animation-duration:${o.timeout}s'></i>` : ''}`;
    let t = 0; const close = () => { clearTimeout(t); d.remove(); };
    (o.buttons || []).forEach(b => { const x = document.createElement('button'); x.className = b.cls || 'btn2'; x.textContent = b.label; x.onclick = () => { close(); if(b.fn) b.fn(); }; d.querySelector('.np-b').appendChild(x); });
    if(o.timeout) t = setTimeout(() => { close(); if(o.onTimeout) o.onTimeout(); }, o.timeout*1000);
    box.appendChild(d);
    if(o.sfx !== false && typeof playSfx === 'function' && typeof AU !== 'undefined' && AU.ctx) playSfx('select');
    return { close, el:d };
  },
  close(id){ this.box().querySelectorAll('.np').forEach(n => { if(n.dataset.id === id) n.remove(); }); },
  toast(html, col){
    const d = document.createElement('div'); d.className = 'np toast'; d.innerHTML = html; if(col) d.style.borderColor = col;
    this.box().appendChild(d); setTimeout(() => d.classList.add('out'), 2800); setTimeout(() => d.remove(), 3400);
  }
};

// ============================================================ CONNEXION
const Online = {
  sb:null, user:null, friends:[], online:new Map(), status:'menu', inbox:null, lobby:null, ev:{}, polls:[], imported:false,
  configured(){ return !!(ONLINE_CFG.url && ONLINE_CFG.key); },
  // la bibliothèque Supabase n'est chargée que si le jeu en ligne est configuré
  loadLib(){
    if(window.supabase && window.supabase.createClient) return Promise.resolve(true);
    if(this._lib) return this._lib;
    return this._lib = new Promise(ok => {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js';
      s.onload = () => ok(!!(window.supabase && window.supabase.createClient)); s.onerror = () => { this._lib = null; ok(false); };
      document.head.appendChild(s);
    });
  },
  async init(){
    if(this.sb) return true;
    if(!this.configured() || !(await withTimeout(this.loadLib(), 8000).catch(() => false))) return false;
    try{
      this.sb = window.supabase.createClient(ONLINE_CFG.url, ONLINE_CFG.key, {
        auth:{ persistSession:true, autoRefreshToken:true, storageKey:'arene.auth' },
        realtime:{ params:{ eventsPerSecond:40 } } });
      this.sb.auth.onAuthStateChange((ev) => { if(ev === 'SIGNED_OUT' && this.user) this.signedOut(); });
    }catch(e){ console.warn('Supabase', e); this.sb = null; }
    return !!this.sb;
  },
  // au démarrage du jeu (js/main.js) : reconnexion automatique si une session existe
  async boot(){
    if(!this.configured()) return;
    try{
      if(!(await this.init())) return;
      const { data } = await withTimeout(this.sb.auth.getSession(), 5000);
      if(data && data.session) await withTimeout(this.afterLogin(data.session.user), 9000);
    }catch(e){ console.warn('Online.boot', e); }
  },
  on(k, fn){ (this.ev[k] = this.ev[k] || []).push(fn); },
  off(k, fn){ this.ev[k] = (this.ev[k] || []).filter(f => f !== fn); },
  emit(k, d){ (this.ev[k] || []).slice().forEach(f => { try{ f(d); }catch(e){ console.error(e); } }); },
  email(pseudo){ return pseudo.toLowerCase() + '@' + ONLINE_CFG.emailDomain; },

  async register(pseudo, pass){
    pseudo = pseudo.trim();
    if(!PSEUDO_RE.test(pseudo)) return { msg:'Pseudo : 3 à 16 caractères (lettres, chiffres, - et _), sans espace ni accent.' };
    if(pass.length < 6) return { msg:'Mot de passe : 6 caractères minimum.' };
    if(!(await this.init())) return { msg:'Serveur injoignable. Vérifie ta connexion.' };
    const av = await this.sb.rpc('pseudo_available', { p:pseudo });
    if(av.error) return { msg:'Base de données non prête : as-tu lancé supabase/schema.sql ? (' + av.error.message + ')' };
    if(!av.data) return { msg:'Ce pseudo est déjà pris.' };
    const { data, error } = await this.sb.auth.signUp({ email:this.email(pseudo), password:pass, options:{ data:{ pseudo } } });
    if(error) return { msg:/registered|exists/i.test(error.message) ? 'Ce pseudo est déjà pris.' : /email address.*invalid|invalid.*email/i.test(error.message)
      ? 'Supabase refuse l\'adresse interne : change emailDomain dans js/online-config.js (ex. ton-domaine.fr). (' + error.message + ')'
      : /rate limit|too many/i.test(error.message) ? 'Trop d\'inscriptions depuis cette connexion : réessaie dans une heure.'
      : /confirm|not authorized/i.test(error.message)
      ? 'Supabase demande une confirmation par e-mail : désactive « Confirm email » (Authentication → Sign In / Providers → Email).' : 'Inscription impossible : ' + error.message };
    if(!data.session) return { msg:'Compte créé, mais Supabase attend une confirmation par e-mail : désactive « Confirm email » (Authentication → Sign In / Providers → Email), puis connecte-toi.' };
    return this.safeAfterLogin(data.user);
  },
  async safeAfterLogin(u){
    try{ await this.afterLogin(u); return { ok:true }; }
    catch(e){ try{ await this.sb.auth.signOut(); }catch(x){} this.user = null; return { msg:'Connexion impossible : ' + e.message }; }
  },
  async login(pseudo, pass){
    pseudo = pseudo.trim();
    if(!pseudo || !pass) return { msg:'Entre ton pseudo et ton mot de passe.' };
    if(!(await this.init())) return { msg:'Serveur injoignable. Vérifie ta connexion.' };
    const { data, error } = await this.sb.auth.signInWithPassword({ email:this.email(pseudo), password:pass });
    if(error) return { msg:/invalid/i.test(error.message) ? 'Pseudo ou mot de passe incorrect.' : /confirm/i.test(error.message)
      ? 'Compte pas encore confirmé : désactive « Confirm email » dans Supabase.' : 'Connexion impossible : ' + error.message };
    return this.safeAfterLogin(data.user);
  },
  async logout(){
    try{ await withTimeout(Sync.push(), 4000); }catch(e){}
    try{ await this.sb.auth.signOut(); }catch(e){}
    this.signedOut();
  },
  async afterLogin(u){
    const { data:prof, error } = await this.sb.from('profiles').select('id,pseudo,wins,losses').eq('id', u.id).maybeSingle();
    if(error || !prof){ console.warn('profil introuvable', error); throw new Error('profil introuvable : as-tu lancé supabase/schema.sql ?'); }
    this.user = prof;
    await Sync.attach(prof.id);
    this.startRealtime();
    this.emit('login');
  },
  signedOut(){
    this.stopRealtime(); this.user = null; this.friends = []; this.online = new Map();
    Sync.detach();
    this.emit('logout');
  },
  async refreshProfile(){
    if(!this.user) return; const { data } = await this.sb.from('profiles').select('id,pseudo,wins,losses').eq('id', this.user.id).maybeSingle();
    if(data) this.user = data;
  },
  async rpc(fn, args){
    const { data, error } = await this.sb.rpc(fn, args || {});
    if(error) throw new Error(error.message || String(error));
    return data;
  },
  async loadFriends(){
    if(!this.user) return [];
    try{ this.friends = await this.rpc('my_friends') || []; }catch(e){ console.warn(e); }
    this.emit('friends'); return this.friends;
  },
  friendName(id){ const f = this.friends.find(x => x.other === id); return f ? f.pseudo : '?'; },
  isOnline(id){ return this.online.has(id); },
  inFight(id){ const o = this.online.get(id); return !!(o && o.s === 'fight'); },

  // ---------- temps réel : présence (qui est en ligne) + notifications (défis, échanges, demandes d'ami)
  startRealtime(){
    this.stopRealtime();
    const uid = this.user.id, pg = (event, table, filter, fn) => ({ event, table, filter, fn });
    const subs = [
      pg('INSERT', 'challenges', 'to_id=eq.' + uid, r => Social.challengeIn(r)),
      pg('UPDATE', 'challenges', 'to_id=eq.' + uid, r => Social.challengeUpd(r)),
      pg('UPDATE', 'challenges', 'from_id=eq.' + uid, r => Social.challengeUpd(r)),
      pg('INSERT', 'trades', 'to_id=eq.' + uid, r => Social.tradeIn(r)),
      pg('UPDATE', 'trades', 'to_id=eq.' + uid, r => Social.tradeUpd(r)),
      pg('UPDATE', 'trades', 'from_id=eq.' + uid, r => Social.tradeUpd(r)),
      pg('INSERT', 'friendships', 'addressee=eq.' + uid, r => Social.friendIn(r)),
      pg('UPDATE', 'friendships', 'requester=eq.' + uid, r => Social.friendUpd(r))
    ];
    this.inbox = this.sb.channel('inbox:' + uid);
    subs.forEach(s => this.inbox.on('postgres_changes', { event:s.event, schema:'public', table:s.table, filter:s.filter }, p => { try{ s.fn(p.new || {}); }catch(e){ console.error(e); } }));
    this.inbox.subscribe();
    this.lobby = this.sb.channel('arene-lobby', { config:{ presence:{ key:uid } } });
    this.lobby.on('presence', { event:'sync' }, () => {
      const st = this.lobby.presenceState(); this.online = new Map(Object.entries(st).map(([k, v]) => [k, (v && v[0]) || {}]));
      this.emit('presence');
    }).subscribe(s => { if(s === 'SUBSCRIBED') this.track(); });
    // secours si le temps réel n'est pas activé : on regarde les défis reçus toutes les 8 s
    this.polls.push(setInterval(() => Social.pollChallenges(), 8000));
    this.polls.push(setInterval(() => { if(document.querySelector('.onl')) this.loadFriends(); }, 30000));
    this.loadFriends(); Social.pollChallenges(); Social.loadTrades();
  },
  stopRealtime(){
    this.polls.forEach(clearInterval); this.polls = [];
    for(const k of ['inbox', 'lobby']) if(this[k]){ try{ this.sb.removeChannel(this[k]); }catch(e){} this[k] = null; }
  },
  track(){ if(this.lobby && this.user){ const r = this.lobby.track({ p:this.user.pseudo, s:this.status }); if(r && r.catch) r.catch(() => {}); } },
  setStatus(s){ if(this.status === s) return; this.status = s; this.track(); }
};

// ============================================================ SAUVEGARDE EN LIGNE
//  Le jeu garde une copie dans le navigateur (jeu hors ligne possible) et l'envoie au serveur 2 s après chaque modification.
//  rev = numéro de version du serveur. Si le serveur a changé entre-temps (échange accepté, autre appareil),
//  les deux versions sont FUSIONNÉES : inventaire et Pokédollars additionnent les différences, le reste garde ta version.
const Sync = {
  uid:null, rev:0, base:null, dirty:false, timer:0, busy:null, attached:false,
  metaKey(){ return 'arene.sync.' + this.uid; },
  loadMeta(){ try{ const m = JSON.parse(localStorage.getItem(this.metaKey())); if(m){ this.rev = m.rev || 0; this.base = m.base || null; } }catch(e){} },
  saveMeta(){ try{ localStorage.setItem(this.metaKey(), JSON.stringify({ rev:this.rev, base:this.base })); }catch(e){} },
  writeLocal(){ _saveSync.call(Save); },
  changed(){ return JSON.stringify(Save.load()) !== JSON.stringify(this.base); },
  async attach(uid){
    this.uid = uid; this.rev = 0; this.base = null; this.dirty = false; this.attached = true;
    Save.KEY = 'arene.save.u.' + uid; Save.data = null; this.loadMeta();
    const hadCache = !!localStorage.getItem(Save.KEY);
    let srv = null;
    try{
      const r = await withTimeout(Online.sb.from('saves').select('data,rev').eq('user_id', uid).maybeSingle(), 6000);
      if(r.error) throw r.error; srv = r.data || { data:null, rev:0 };
    }catch(e){ console.warn('sauvegarde en ligne indisponible', e); }
    if(srv && srv.data){
      if(!hadCache || !this.base) this.adopt(srv, false);
      else if(srv.rev !== this.rev) this.adopt(srv, true);
      else { Save.load(); if(this.changed()) this.markDirty(); }
    } else if(srv){                                            // compte neuf : on y range la progression de cet appareil
      if(!hadCache){
        let guest = null; try{ guest = JSON.parse(localStorage.getItem(GUEST_KEY)); }catch(e){}
        if(guest && (guest.starter || (guest.teams && guest.teams.length))){
          Save.data = guest; Online.imported = true;
          try{ localStorage.removeItem(GUEST_KEY); }catch(e){}   // la progression appartient maintenant à ce compte
        }
      }
      Save.load(); this.rev = srv.rev; this.base = {}; this.writeLocal(); this.markDirty(true);
    } else Save.load();                                         // hors ligne : on joue avec la copie locale
    Save.ensureDefaults();
  },
  detach(){
    clearTimeout(this.timer); this.attached = false; this.uid = null; this.dirty = false;
    Save.KEY = GUEST_KEY; Save.data = null; Save.load(); Save.ensureDefaults();
  },
  // prend la version du serveur (fusionnée avec les changements locaux pas encore envoyés)
  adopt(srv, merge){
    const local = merge ? Save.load() : null;
    if(local && this.base && this.changed()){ Save.data = mergeSave(this.base, local, srv.data); this.dirty = true; }
    else Save.data = clone(srv.data);
    this.base = clone(srv.data); this.rev = srv.rev; this.writeLocal(); this.saveMeta();
    if(this.dirty) this.markDirty();
  },
  markDirty(now){
    if(!this.attached) return;
    this.dirty = true; clearTimeout(this.timer);
    this.timer = setTimeout(() => this.push(), now ? 50 : ONLINE_CFG.saveDelay*1000);
  },
  // envoie la sauvegarde ; renvoie true quand tout est bien enregistré sur le serveur (false si échec : nouvel essai dans 10 s)
  async push(force){
    if(this.busy){ await this.busy.catch(() => {}); if(!this.dirty && !force) return true; }
    if(!Online.user || !this.attached) return false;
    if(!this.dirty && !force) return true;
    clearTimeout(this.timer);
    let failed = false;
    const run = (async () => {
      const snap = clone(Save.load()); this.dirty = false;
      try{
        const r = await withTimeout(Online.rpc('push_save', { p_data:snap, p_rev:this.rev }), 8000);
        if(r && r.ok){ this.rev = r.rev; this.base = snap; this.saveMeta(); }
        else if(r){ this.adopt({ data:r.data || {}, rev:r.rev }, true); Social.saveReplaced(); }
      }catch(e){ console.warn('envoi de la sauvegarde', e); failed = true; this.dirty = true; clearTimeout(this.timer); this.timer = setTimeout(() => this.push(), 10000); }
    })();
    this.busy = run; try{ await run; } finally { if(this.busy === run) this.busy = null; }
    if(failed) return false;
    if(this.dirty) return this.push();
    return true;
  },
  // relit la sauvegarde du serveur (après un échange)
  async pull(){
    if(!Online.user) return;
    await this.push().catch(() => {});
    const r = await Online.sb.from('saves').select('data,rev').eq('user_id', Online.user.id).maybeSingle();
    if(r.data && r.data.data && r.data.rev !== this.rev){ this.adopt(r.data, true); Social.saveReplaced(); }
  }
};
// fusion de 3 versions : base (dernière version commune), locale, serveur
function mergeSave(base, local, server){
  base = base || {}; server = server || {};
  const out = clone(local), bi = base.inv || {}, li = local.inv || {}, si = server.inv || {};
  out.inv = {};
  new Set([...Object.keys(bi), ...Object.keys(li), ...Object.keys(si)]).forEach(k => {
    const v = (si[k] || 0) + (li[k] || 0) - (bi[k] || 0); if(v > 0 || k in li || k in si) out.inv[k] = Math.max(0, v);
  });
  if([base.coins, local.coins, server.coins].every(v => typeof v === 'number')) out.coins = Math.max(0, server.coins + local.coins - base.coins);
  if(Array.isArray(server.owned)) out.owned = [...new Set([...(local.owned || []), ...server.owned])];
  if(server.progress && local.progress) for(const k in server.progress) out.progress[k] = Math.max(local.progress[k] || 0, server.progress[k] || 0);
  return out;
}
// chaque sauvegarde locale programme un envoi au serveur
const _saveSync = Save.save;
Save.save = function(){ _saveSync.call(this); if(Online.user && Sync.attached && this.KEY !== GUEST_KEY) Sync.markDirty(); };
addEventListener('visibilitychange', () => { if(document.hidden && Sync.dirty) Sync.push(); });
addEventListener('pagehide', () => { if(Sync.dirty) Sync.push(); });

// statut visible par les amis : « en combat » ou « au menu »
const _startOnl = start;
start = function(cfg){ _startOnl(cfg); Online.setStatus('fight'); };
const _showMainOnl = showMain;
showMain = function(){ Online.setStatus('menu'); _showMainOnl(); };
