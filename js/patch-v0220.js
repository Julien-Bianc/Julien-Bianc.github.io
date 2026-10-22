// ============================================================
//  patch-v0220.js — correctif (rapport de test v0.21.9)
//    1. Équilibrage : Togekiss (moins de dégâts), Gardevoir (+PV), Tartard (Siphon plus long à recharger),
//       Alakazam (Choc Mental : double hélice psychique), Carchacrok du Safari beaucoup moins agressif
//    2. Tour de Combat : mise en page des menus sur téléphone (colonne à gauche, boutons en bas de la colonne)
//    3. Raid sur téléphone : les étoiles et « Changer de raid » restent visibles
//    4. Ergonomie : rappel de l'équipe utilisée, petits ajustements
// ============================================================

// ---------------------------------------------------------------- 1. équilibrage (avant l'enregistrement des Pokémon par main.js)
if(POKEMON.togekiss){ const M = POKEMON.togekiss.moves;
  Object.assign(M[0], { power:11 });                               // Lame d'Air 13 → 11
  Object.assign(M[1], { power:13 });                               // Éclat Magique 16 → 13
  Object.assign(M[2], { power:18, trailShare:.07 });               // Piqué Céleste 22 → 18, traînée arc-en-ciel 12 % → 7 % (et plus d'invulnérabilité : js/pension-kits.js)
}
if(POKEMON.gardevoir) POKEMON.gardevoir.hp = 118;                   // 100 → 118
if(POKEMON.tartard) POKEMON.tartard.moves[2].cooldown = 8.5;        // Siphon 6,5 s → 8,5 s
if(POKEMON.alakazam){                                               // Choc Mental : 2 ondes psychiques entrelacées, plus larges, plus visibles
  Object.assign(POKEMON.alakazam.moves[0], { power:6.5, cooldown:.55, count:2, amp:18, radius:7, life:1.1, speed:400, color:'#e08aff' });
}
if(typeof MOVE_DESC !== 'undefined') MOVE_DESC['Choc Mental'] = 'Deux ondes psychiques entrelacées : chacune peut toucher.';

// Carchacrok, boss du Safari : attaque bien moins souvent, Tunnel ne le suit plus, un peu moins de dégâts
const cgSafari = () => G && G.cfg && G.cfg.mode === 'safari' && G.e && G.e.t === 'carchacrok';
step = (prev => function(dt){
  const on = cgSafari(), e = on ? G.e : null, n0 = e ? e.next : 0;
  prev(dt);
  if(on && G && G.e === e && e.next > n0 + .15) e.next *= 1.4;      // en plus du ×1,8 de la v0.21.5 → ≈ 2,5× moins d'attaques qu'avant
})(step);
if(typeof updBurrow === 'function') updBurrow = (prev => function(s, own, dt){
  const B = s && s.bur, O = !own && B && B.m && B.m.opt && cgSafari() ? B.m.opt : null;
  if(!O) return prev(s, own, dt);
  const k = O.track; O.track = false; try{ return prev(s, own, dt); } finally { O.track = k; }
})(updBurrow);
hurtP = (prev => function(d, b){ if(cgSafari()) d *= .8; return prev(d, b); })(hurtP);

// ---------------------------------------------------------------- 2. Tour de Combat : mise en page téléphone
document.head.insertAdjacentHTML('beforeend', `<style>
#menu.twscene .mc{align-items:flex-start!important}
#menu.twscene .mc>*{max-width:62%!important;margin-left:0!important;margin-right:0!important}
#menu.twscene .twfoot{width:62%!important;max-width:62%!important;justify-content:flex-start!important;margin-top:auto!important;background:linear-gradient(90deg,rgba(10,6,20,.9),rgba(10,6,20,.6) 80%,rgba(10,6,20,0))!important;border-radius:10px}
#menu.twscene .mc p{text-align:left}
#menu.twscene .twbag,#menu.twscene [class*='twbag']{margin-left:0!important}
@media (max-width:760px){ #menu.twscene .mc>*,#menu.twscene .twfoot{max-width:72%!important;width:72%!important} }
/* 3. raid : la colonne du boss tient dans l'écran (étoiles + bouton « Changer de raid » visibles) */
@media (max-height:560px){
  .raidv .rboss{justify-content:flex-start!important;overflow-y:auto!important;padding:4px 6px!important;gap:0!important}
  .raidv .rboss canvas{width:150px!important;height:90px!important}
  .raidv .rboss .rstars{font-size:17px;flex:none}
  .raidv .rboss .rnext{font-size:9px}
  .raidv .rboss #rrr{flex:none;margin-top:2px}
}
</style>`);

// ---------------------------------------------------------------- 4. ergonomie : écran de chargement des combats de tournoi → rappel de l'adversaire
// (l'écran d'équipe du tournoi rappelle déjà les objets figés)
// tournoi sur téléphone : accueil plus compact
document.head.insertAdjacentHTML('beforeend', `<style>
@media (max-height:560px){ .trlvb small{display:none} .trlvb{padding:3px} .trteamc{padding:4px 6px;margin-bottom:4px} .trtc img{width:30px!important;height:30px!important} .trtc em{height:30px} .trbox{margin:4px 0;padding:4px 6px} }
</style>`);
