// ============================================================
//  DÉFI : MEWTWO — 3 DIFFICULTÉS (v0.11). Modifie les nombres pour équilibrer.
//    stage  : réglages du combat (même format que data/stages.js)
//    coins  : Pokédollars gagnés à la PREMIÈRE victoire dans cette difficulté
//    card   : rareté de la carte Mewtwo « édition limitée » gagnée à la première victoire (C, PC ou R)
//    ai     : (facultatif) modifie le cerveau de Mewtwo pour cette difficulté (voir data/boss-mewtwo.js)
//  Les cartes Mewtwo ne se trouvent dans AUCUNE caisse : seulement ici, une seule fois chacune.
// ============================================================
const BOSS_DIFFS = [
  { id:'normal',  label:'Normal',    col:'#4fd16a', coins:250,  card:'C',
    stage:{ name:'Défi : Mewtwo — Normal',    level:4, arena:5, hp:1.0, dmg:.9,  speed:1.0, pspeed:1.0,  rate:1.0, tele:1.0, aim:.5, boss:2.0 } },
  { id:'difficile', label:'Difficile', col:'#e3b72a', coins:500,  card:'PC',
    stage:{ name:'Défi : Mewtwo — Difficile', level:5, arena:5, hp:1.3, dmg:1.15, speed:1.1, pspeed:1.15, rate:.85, tele:.85, aim:.8, boss:2.6 } },
  { id:'extreme', label:'Extrême',   col:'#d9503f', coins:1000, card:'R',
    stage:{ name:'Défi : Mewtwo — Extrême',   level:6, arena:4, hp:1.5, dmg:1.35, speed:1.2, pspeed:1.3,  rate:.7,  tele:.7,  aim:1,  boss:3.0 },
    ai:{ rage:{ below:.65, rate:.5, label:'MEWTWO S\'ÉNERVE !' }, dodge:{ range:90, cd:2.4 } } }
];
