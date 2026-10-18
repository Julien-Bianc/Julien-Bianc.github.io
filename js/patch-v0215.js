// ============================================================
//  patch-v0215.js — correctif (rapport de test v0.21.5)
//    1. PC : les attaques sont sur la SOURIS (clic gauche A, clic droit B, molette C), réglables dans Options → Touches
//       (on peut y mettre une touche ou un bouton de souris pour n'importe quelle attaque, l'esquive, la relève…)
//    2. Tutoriel PC (clavier + souris) ; bouton « PC / Tactile » dans le tutoriel
//    3. 300 ₽ pour démarrer (et 300 ₽ offerts une fois à tous les joueurs)
//    4. Équilibrage : Dracolosse, niveaux Solo 1 → 7, Safari du chapitre 1, Carchacrok au Safari
//    5. Classeur : boutons Vendre / Fragment groupés sous la carte
//    6. Musique de la Pension (générée ; ou ton fichier assets/music/pension.mp3)
// ============================================================

// ---------------------------------------------------------------- 1. souris dans les réglages
const MOUSE_DEF = { a:'Mouse0', b:'Mouse2', c:'Mouse1' };
const MOUSE_NAME = { Mouse0:'Clic gauche', Mouse1:'Clic molette', Mouse2:'Clic droit', Mouse3:'Souris 4', Mouse4:'Souris 5' };
Settings.get = (prev => function(){
  const s = prev.call(this);
  if((s.mver || 0) < 1){ const d = { a:'KeyJ', b:'KeyK', c:'KeyL' }; for(const k in MOUSE_DEF) if(!s.keys[k] || s.keys[k] === d[k]) s.keys[k] = MOUSE_DEF[k]; s.mver = 1; Save.save(); }
  return s;
})(Settings.get);
Settings.resetKeys = function(){ this.get().keys = { ...DEFAULT_KEYS, ...MOUSE_DEF }; Save.save(); };
keyName = (prev => function(code){ return MOUSE_NAME[code] || prev(code); })(keyName);
// Options : capture d'un bouton de souris
addEventListener('mousedown', e => {
  if(!Settings.capture) return;
  e.preventDefault(); e.stopImmediatePropagation();
  const fn = Settings.capture; Settings.capture = null; fn('Mouse' + e.button);
}, true);
addEventListener('contextmenu', e => { if(document.querySelector('#menu .kbtn.wait')) e.preventDefault(); }, true);
showOptions = (prev => function(back){
  prev(back);
  const h = [...document.querySelectorAll('#menu h3')].find(x => /Touches/.test(x.textContent)); if(h) h.textContent = 'Touches (clavier et souris)';
  const p = document.querySelector('#menu .kgrid + p'); if(p) p.textContent = 'Clique une action, puis appuie sur une touche OU un bouton de la souris (Échap = annuler).';
  document.querySelectorAll('.kbtn').forEach(el => el.addEventListener('click', () => { const b = el.querySelector('b'); if(b) b.textContent = 'Touche ou clic…'; }));
})(showOptions);
// combat : chaque bouton de souris fait l'action qui lui est attribuée
const MBITS = [[1, 'Mouse0'], [2, 'Mouse2'], [4, 'Mouse1'], [8, 'Mouse3'], [16, 'Mouse4']];
mouseButtons = function(e, start){
  const was = mMask, K = Settings.get().keys; mMask = e.buttons;
  for(const [bit, code] of MBITS){
    const on = !!(e.buttons & bit), before = !!(was & bit); if(on === before) continue;
    const act = Object.keys(K).find(a => K[a] === code); if(!act) continue;
    const i = { a:0, b:1, c:2 }[act];
    if(i != null){ if(on && start){ setMouse(e); press(i); if(down[i]) AIM.key(i); } else if(!on && MHOLD[i]) rel(i); }
    else if(on && start){ if(act === 'dash') dash(); else if(act === 'swap') swap(); else if(act === 'pause') pauseGame(); else if(act === 'fullscreen') toggleFullscreen(); }
  }
};

// ---------------------------------------------------------------- 2. tutoriel PC
const IS_PC = () => matchMedia('(hover: hover) and (pointer: fine)').matches;
let TUTO_MODE = null, TUTO_ARGS = null;
const TUTO_TOUCH = TUTO.slice();
function tutoPC(){
  const K = Settings.get().keys, kn = a => keyName(K[a]);
  const keep = id => TUTO_TOUCH.find(t => t.img === id);
  return [
    keep('combat'),
    { img:'pc-move',   title:'Se déplacer',            text:`Touches <b>${kn('up')} ${kn('left')} ${kn('down')} ${kn('right')}</b> (soit <b>ZQSD</b> sur un clavier AZERTY) ou les <b>flèches</b>. Bouge sans arrêt pour esquiver les attaques !` },
    { img:'pc-attack', title:'Attaquer à la souris',   text:`<b>${kn('a')}</b> = attaque A, <b>${kn('b')}</b> = attaque B, <b>${kn('c')}</b> = attaque C. Un clic bref : l'attaque part <b>toute seule vers l'adversaire</b>. Chaque attaque a son temps de recharge.` },
    { img:'pc-charge', title:'Charger : clic maintenu', text:'Garde le bouton enfoncé <b>sans bouger la souris</b> : l\'attaque se <b>charge</b> (anneau sous ton Pokémon) et fait plus de dégâts. Relâche pour tirer.' },
    { img:'pc-aim',    title:'Viser avec le curseur',  text:'Garde le bouton enfoncé et <b>déplace la souris</b> : la zone de l\'attaque suit le curseur. Relâche pour tirer. Viser toi-même donne <b>+25 % de dégâts</b>… si tu touches !' },
    { img:'pc-dodge',  title:'Esquive, relève, pause', text:`<b>${kn('dash')}</b> = esquive (invulnérable un court instant, vers où tu te déplaces). <b>${kn('swap')}</b> = relève (le Pokémon suivant entre). <b>${kn('pause')}</b> = pause, <b>${kn('fullscreen')}</b> = plein écran.` },
    { img:'pc-keys',   title:'Change tes touches',     text:'<b>Options → Touches</b> : clique une action puis appuie sur la touche ou le <b>bouton de souris</b> de ton choix. « Touches par défaut » remet la souris sur les attaques.' },
    keep('types'), keep('menu')
  ].filter(Boolean);
}
showTutorial = (prev => function(back, first, page){
  TUTO_ARGS = [back, first]; if(TUTO_MODE == null) TUTO_MODE = IS_PC() ? 'pc' : 'touch';
  const L = TUTO_MODE === 'pc' ? tutoPC() : TUTO_TOUCH; TUTO.length = 0; TUTO.push(...L);
  return prev(back, first, page);
})(showTutorial);
menu = (prev => function(h){
  prev(h);
  if(!h || !h.includes("class='tuto'")) return;
  const hd = document.querySelector('#menu .tuh'); if(!hd || hd.querySelector('.tumode')) return;
  hd.insertAdjacentHTML('beforeend', `<span class='tumode'><button class='btn2 sm ${TUTO_MODE === 'pc' ? 'on' : ''}' data-tm='pc'>🖱 PC</button><button class='btn2 sm ${TUTO_MODE !== 'pc' ? 'on' : ''}' data-tm='touch'>📱 Tactile</button></span>`);
  hd.querySelectorAll('[data-tm]').forEach(b => b.onclick = () => { TUTO_MODE = b.dataset.tm; showTutorial(TUTO_ARGS[0], TUTO_ARGS[1], 0); });
})(menu);

// ---------------------------------------------------------------- 3. argent de départ
ECONOMY.start = 300;
showMain = (prev => function(){
  const d = Save.load();
  if(!d.gift300){ d.gift300 = 1; if(d.coins != null){ d.coins += 300; setTimeout(() => Notif.toast('🎁 Cadeau : +300 ₽ pour tout le monde !', '#ffd23f'), 800); } Save.save(); }
  return prev.apply(this, arguments);
})(showMain);

// ---------------------------------------------------------------- 4. équilibrage
// Dracolosse : moins de PV, attaques plus lentes et un peu moins fortes
if(POKEMON.dracolosse){
  POKEMON.dracolosse.hp = 112;
  const M = POKEMON.dracolosse.moves;
  Object.assign(M[0], { power:13, cooldown:2.3 });                 // Draco-Souffle
  Object.assign(M[1], { power:7, cooldown:3.5, legs:2 });          // Vitesse Extrême : 2 ruées (3 si chargée)
  Object.assign(M[2], { power:6, cooldown:9 });                    // Ouragan
}
// Solo : niveaux 1 à 7 progressivement plus faciles (niveau 1 ×0,75 → niveau 7 ×0,95)
STAGES.slice(0, 7).forEach((S, i) => {
  const k = .75 + i*(.2/6), r2 = v => +v.toFixed(2);
  S.hp = r2(S.hp*k); S.dmg = r2(S.dmg*k); S.rate = r2(S.rate/k); S.tele = r2(S.tele/Math.sqrt(k)); S.aim = r2(S.aim*k); S.speed = r2(S.speed*(.9 + .1*k));
});
// Safari du chapitre 1 (Grand Départ) : un peu plus facile
(() => { const Z = SAFARI.zones.find(z => z.id === 'depart') || SAFARI.zones[0], S = Z && Z.stage; if(!S) return;
  S.hp = +(S.hp*.85).toFixed(2); S.dmg = +(S.dmg*.85).toFixed(2); S.rate = +(S.rate*1.15).toFixed(2); S.tele = +(S.tele*1.1).toFixed(2); S.aim = +(S.aim*.8).toFixed(2); })();
// Safari : Carchacrok attaque beaucoup moins souvent (et ses météores ne le suivent plus)
step = (prev => function(dt){
  const e = G && G.e, safari = G && G.cfg && G.cfg.mode === 'safari' && e && e.t === 'carchacrok', n0 = safari ? e.next : 0;
  prev(dt);
  if(safari && G && G.e === e && e.next > n0 + .15) e.next *= 1.8;
})(step);
strike2 = (prev => function(s, d, m, c, own, sc, a){
  if(!own && G && G.cfg && G.cfg.mode === 'safari' && s.t === 'carchacrok' && m.opt){ const O = m.opt, keep = [O.track, O.count]; O.track = false; O.count = 4; const r = prev(s, d, m, c, own, sc*.8, a); O.track = keep[0]; O.count = keep[1]; return r; }
  return prev(s, d, m, c, own, sc, a);
})(strike2);

// ---------------------------------------------------------------- 6. musique de la Pension
if(typeof MUSIC !== 'undefined' && !MUSIC.pension) MUSIC.pension = 'assets/music/pension.mp3';     // mets ton fichier ici (facultatif)
// sinon : petite mélodie générée, douce et joyeuse (boîte à musique + basse + clochettes)
const PEN_TUNE = { chords:[[0, 4, 7], [7, 11, 14], [9, 12, 16], [5, 9, 12]], mel:[12, 16, 19, 16, 14, 12, 11, 14, 16, 19, 21, 19, 16, 14, 12, 7, 9, 12, 16, 12, 9, 7, 9, 12, 5, 9, 12, 14, 12, 9, 7, 5] };
function penMusicStart(){
  clearInterval(MU.id); MU.step = 0;
  const bpm = 104, dt = 60/bpm/2, root = 261.63, F = n => root*Math.pow(2, n/12);
  MU.id = setInterval(() => {
    if(!AU.ctx || AU.ctx.state !== 'running') return;
    const s = MU.step, bar = Math.floor(s/8) % 4, ch = PEN_TUNE.chords[bar], n = PEN_TUNE.mel[s % 32];
    if(s % 8 !== 7) tone(F(n), dt*1.6, 'triangle', .26, 0, 0, AU.mu);
    if(s % 2 === 1) tone(F(n + 12), dt*.6, 'sine', .08, 0, 0, AU.mu);                                  // clochette
    if(s % 4 === 0) tone(F(ch[0] - 12), dt*3.4, 'triangle', .36, 0, 0, AU.mu);                             // basse
    if(s % 4 === 2) tone(F(ch[2] - 12), dt*1.6, 'triangle', .2, 0, 0, AU.mu);
    if(s % 8 === 4) ch.forEach((c, k) => tone(F(c), dt*2.6, 'sine', .09, 0, k*.03, AU.mu));                // accord arpégé
    MU.step++;
  }, dt*1000);
}
musicGen = (prev => function(kind){ if(String(MU.kind || kind).split('|')[0] === 'pension'){ MU.playing = MU.kind; return penMusicStart(); } return prev(kind); })(musicGen);
menu = (prev => function(h){
  prev(h);
  const pen = !G && !!h && (h.includes('data-penscene') || (h.includes("class='cwrap'") && CV.font));
  if(pen && typeof musicSet === 'function') musicSet('pension');
})(menu);

// ---------------------------------------------------------------- 5. classeur : boutons groupés
document.head.insertAdjacentHTML('beforeend', `<style>
.invw .scroll.right .row.left{display:inline-flex;vertical-align:top;flex-wrap:wrap;gap:4px;margin:3px 4px 0 0!important;padding:0!important;background:none!important;border:0!important;box-shadow:none!important;min-height:0!important;height:auto!important;flex:0 0 auto!important;justify-content:flex-start}
.invw .scroll.right .row.left .btn2,.invw .scroll.right .row.left .btn{font-size:10px!important;padding:4px 8px!important;min-height:0!important;margin:0!important;line-height:1.2}
.invw .scroll.right{display:block!important}
.invw .scroll.right .bdv{margin-bottom:4px}
.tuh{flex-wrap:wrap}.tumode{display:inline-flex;gap:4px;margin-left:8px}.tumode .btn2{font-size:10px;padding:3px 8px}
</style>`);
