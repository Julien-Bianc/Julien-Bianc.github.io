// ============================================================
//  patch-v013.js — Rapport de test v0.12 (réglages : data/equilibrage.js)
//    1. Accueil : les Pokémon affichés sont bien ceux de ton équipe
//    2. Premier Ticket Safari offert
//    3. Listes à faire défiler : dégradé + flèche « ▼ » en bas tant qu'il reste du contenu
//    4. Visée façon Brawl Stars : appui BREF = visée auto sur l'ennemi ; appui LONG sans glisser = tir dans
//       ta direction de déplacement (aucun « aimant » vers l'ennemi) ; glisser = visée manuelle
//    5. Son : le jeu se mélange à la musique du téléphone (option « Son mixé avec le téléphone »)
//    6. Plein écran auto : bouton ⛶ masqué, plein écran dès l'activation et à chaque retour dans le jeu
//    7. Sécurité : un menu resté affiché par-dessus un combat en cours est fermé
//    8. Vibrations (retour haptique) aux boutons et quand tu touches l'adversaire — option
//    9. Plus d'immunités de type (→ peu efficace), invulnérabilité après un coup réduite, Éclair de Raichu
// ============================================================
Object.assign(SETTINGS_DEFAULT, { haptics:true, mixAudio:true });

// ---------- 1. accueil : on recalcule l'équipe affichée à chaque retour au menu ----------
const _mainV13 = showMain;
showMain = function(){
  if(typeof MBG !== 'undefined') MBG.team = null;
  _mainV13();
  // ---------- 2. ticket offert ----------
  const d = Save.load();
  if(typeof Owned !== 'undefined' && Owned.ready() && !d.freeTicket && typeof SAFARI !== 'undefined'){
    d.freeTicket = 1; Save.addItem(SAFARI.zones[0].ticket.id, FREE_TICKETS); Save.save();
    setTimeout(() => typeof toast === 'function' && toast(`<b>Cadeau : ${FREE_TICKETS > 1 ? FREE_TICKETS + ' Tickets' : 'ton premier Ticket'} Safari !</b><span style="font-size:11px">Achète des Poké Balls au Magasin et pars capturer !</span>`), 700);
  }
};

// ---------- 3. indicateur de défilement ----------
function scrollHints(){
  document.querySelectorAll('#menu .scroll').forEach(el => {
    const upd = () => { const can = el.scrollHeight > el.clientHeight + 6; el.classList.toggle('can-scroll', can); el.classList.toggle('at-end', !can || el.scrollTop + el.clientHeight >= el.scrollHeight - 8); };
    if(!el._sh){ el._sh = 1; el.addEventListener('scroll', upd, { passive:true }); }
    upd(); setTimeout(upd, 300);                                    // après le chargement des images
  });
}
const _menuV13 = menu;
menu = function(h){ _menuV13(h); if(h) requestAnimationFrame(scrollHints); };
addEventListener('resize', () => requestAnimationFrame(scrollHints));

// ---------- 4. visée : remplacée en v0.14 (js/patch-v014.js : le viseur part de l'endroit où le doigt touche le bouton)

// ---------- 5. son mixé avec le téléphone ----------
function applyAudioSession(){ try{ if(navigator.audioSession) navigator.audioSession.type = Settings.get().mixAudio ? 'ambient' : 'auto'; }catch(e){} }
applyAudioSession();
const BUF = new Map();
const bufferOf = url => { if(!BUF.has(url)) BUF.set(url, fetch(url).then(r => { if(!r.ok) throw new Error(url); return r.arrayBuffer(); }).then(a => new Promise((ok, ko) => AU.ctx.decodeAudioData(a, ok, ko)))); return BUF.get(url); };
const _playV13 = musicPlayFile;
musicPlayFile = function(kind, url){
  if(!Settings.get().mixAudio || !AU.ctx) return _playV13(kind, url);
  // musique jouée par Web Audio (et pas par une balise <audio>) : le téléphone ne coupe pas ta propre musique
  MU.playing = kind;
  const list = typeof MUSIC !== 'undefined' && (MUSIC[kind] || MUSIC[(kind || '').split(':')[0]]);
  const multi = Array.isArray(list) && list.length > 1, g = AU.ctx.createGain(); g.gain.value = 0; g.connect(AU.mu);
  const c = { g, kind, src:null, el:{ loop:!(kind === 'victory' || kind === 'defeat') && !multi, pause(){ try{ c.src && c.src.stop(); }catch(e){} }, addEventListener(){} } };
  MU.cur = c;
  bufferOf(url).then(buf => {
    if(MU.cur !== c) return;
    const s = AU.ctx.createBufferSource(); s.buffer = buf; s.loop = c.el.loop; s.connect(g); c.src = s;
    s.onended = () => { if(MU.cur === c && !s.loop && multi){ MU.playing = null; musicGo(); } };
    s.start(); const t = AU.ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.6, t + 1.2);
  }).catch(() => { if(MU.cur === c){ MU.cur = null; musicGen(kind); } });
};

// ---------- 6. plein écran automatique ----------
function syncFsBtn(){ const b = document.getElementById('fsBtn'); if(b) b.style.display = IS_APP() || (Settings.get().autoFs && fsOk()) ? 'none' : ''; }
syncFsBtn();
const _tfsV13 = toggleFullscreen; let FS_T = 0;
toggleFullscreen = function(){ const n = performance.now(); if(n - FS_T < 900) return; FS_T = n; return _tfsV13(); };   // jamais 2 demandes d'affilée
['pointerup', 'click'].forEach(ev => addEventListener(ev, () => { if(Settings.get().autoFs && !fsEl() && fsOk()) toggleFullscreen(); }));   // à CHAQUE retour (Chrome Android) — pointerup/click : le navigateur l'autorise
document.addEventListener('visibilitychange', () => { if(!document.hidden) syncFsBtn(); });

// ---------- 7. menu oublié par-dessus un combat ----------
const _stepV13 = step;
step = function(dt){
  _stepV13(dt);
  if(!G || G.over || G.paused || (typeof ERR_SHOWN !== 'undefined' && ERR_SHOWN) || (G.cfg && G.cfg.mode === 'online')) { if(G) G.menuT = 0; return; }
  const m = document.getElementById('menu');
  if(m.style.display !== 'none' && m.innerHTML){ G.menuT = (G.menuT || 0) + dt; if(G.menuT > .6){ G.menuT = 0; menu(''); } } else G.menuT = 0;
};

// ---------- 8. vibrations ----------
let _hapLbl = null, _hapT = 0;
function haptic(ms){
  if(!Settings.get().haptics) return; const now = performance.now(); if(now - _hapT < 45) return; _hapT = now;
  if(navigator.vibrate){ try{ navigator.vibrate(ms); }catch(e){} return; }
  // iPhone (Safari 18+) : pas de navigator.vibrate → un interrupteur caché déclenche le retour haptique du système
  if(!_hapLbl){ _hapLbl = document.createElement('label'); _hapLbl.style.cssText = 'position:fixed;left:-200px;top:0;opacity:0;pointer-events:none'; _hapLbl.innerHTML = "<input type='checkbox' switch>"; document.body.appendChild(_hapLbl); }
  _hapLbl.click();
}
addEventListener('pointerdown', e => { if(e.target && e.target.closest && e.target.closest('button, #joy')) haptic(8); }, true);
const _hEV13 = hurtE;
hurtE = function(d, b){ const e = G && G.e, h = e && e.hp, r = _hEV13(d, b); if(e && b && b.own && e.hp < h) haptic(r ? 45 : 14); return r; };

// ---------- 9. équilibrage ----------
const _tmV13 = typeMult;
typeMult = function(a, d){ const m = _tmV13(a, d); return m === 0 ? IMMUNITY_MULT : m; };
for(const pid in MOVE_TWEAKS){ const P = POKEMON[pid]; if(!P) continue;
  for(const n in MOVE_TWEAKS[pid]){ const mv = P.moves.find(m => m.name === n); if(mv) Object.assign(mv, MOVE_TWEAKS[pid][n]); } }
const _hPV13 = hurtP;
hurtP = function(d, b){ const p = G && G.p, h = p && p.hp, r = _hPV13(d, b); if(p && p.hp < h && p.hp > 0 && p.inv > PLAYER_IFRAMES) p.inv = PLAYER_IFRAMES; return r; };

// ---------- Options : section « Confort » ----------
const _optV13 = showOptions;
showOptions = function(back){
  _optV13(back);
  const s = Settings.get(), box = document.querySelector('#menu .opts'); if(!box) return;
  const afs = document.getElementById('o-afs');
  if(afs) afs.onclick = () => { const on = !Settings.get().autoFs; Settings.set('autoFs', on); if(on && !fsEl() && fsOk()) toggleFullscreen(); syncFsBtn(); showOptions(back); };
  const h3 = [...box.querySelectorAll('h3')].find(x => /touches/i.test(x.textContent));
  const html = `<h3>Confort</h3><div class='row left'>
      <button class='btn2 ${s.haptics ? 'on' : ''}' id='o-hap'>Vibrations : ${s.haptics ? 'oui' : 'non'}</button>
      <button class='btn2 ${s.mixAudio ? 'on' : ''}' id='o-mix'>Son mixé avec le téléphone : ${s.mixAudio ? 'oui' : 'non'}</button>
      <button class='btn2' id='o-lyt'>Disposition des commandes…</button></div>
    <p class='hint'>Son mixé : ta musique (Spotify…) continue pendant le jeu. Sur iPhone, le jeu suit alors le bouton silencieux.</p>`;
  if(h3) h3.insertAdjacentHTML('beforebegin', html); else box.insertAdjacentHTML('beforeend', html);
  document.getElementById('o-hap').onclick = () => { Settings.set('haptics', !s.haptics); if(!s.haptics) haptic(30); showOptions(back); };
  document.getElementById('o-mix').onclick = () => { Settings.set('mixAudio', !s.mixAudio); applyAudioSession(); if(typeof MU !== 'undefined'){ MU.playing = null; musicGo(); } showOptions(back); };
  document.getElementById('o-lyt').onclick = () => editLayout(() => showOptions(back));
  requestAnimationFrame(scrollHints);
};
SCREENS.options = showOptions;
