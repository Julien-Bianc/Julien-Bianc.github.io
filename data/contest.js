// ============================================================
//  CONCOURS POKÉMON — données (inspiré des Super Concours de Diamant/Perle/Platine et de leurs remakes)
//  Ces statistiques n'ont AUCUN effet sur le mode combat.
//
//  Déroulement d'un concours (js/contest.js) : 3 épreuves, 4 concurrents
//    1. STYLE        : stat de la catégorie + capsule Ball (la rareté de la capsule compte dans la note) + type du Pokémon
//    2. RYTHME       : danse à 4 boutons (Gauche / Saut / Droite / Devant) sur la musique
//    3. PRESTATIONS  : 4 appels avec les attaques (catégorie de l'attaque, stats, combos, jauge d'enthousiasme)
//  Le 1er gagne le RUBAN du concours (un ruban différent par catégorie et par rang) + de l'argent.
//
//  Ajouter une baie = une ligne dans BERRIES. Ajouter un rang = une ligne dans CONTEST_RANKS.
// ============================================================

// Les 5 statistiques (comme dans les jeux : Classe, Beauté, Charme, Intelligence, Robustesse)
const CONTEST_STATS = [
  { id:'cool',   name:'Classe',       col:'#e8402c', flavor:'Épicé' },
  { id:'beauty', name:'Beauté',       col:'#3b8fd9', flavor:'Sec'   },
  { id:'cute',   name:'Charme',       col:'#ff7ac8', flavor:'Doux'  },
  { id:'smart',  name:'Intelligence', col:'#3fbf5a', flavor:'Amer'  },
  { id:'tough',  name:'Robustesse',   col:'#f0b928', flavor:'Acide' }
];
const CSTAT = Object.fromEntries(CONTEST_STATS.map(s => [s.id, s]));
const STAT_MAX = 255, SHEEN_MAX = 255;      // plafonds (comme dans les jeux : 255 par stat, 255 d'éclat)

// Rangs : chaque rang se débloque en gagnant le rang précédent (dans la même catégorie).
//   prize = argent du 1er (le 2e touche 40 %, le 3e 20 %). Rejouer un concours déjà gagné : moitié du gain.
//   ai    = niveau des concurrents contrôlés par l'ordinateur ([mini, maxi] de leur stat principale)
const CONTEST_RANKS = [
  { id:0, name:'Normal', col:'#c98b52', prize:300,  ai:[25, 95],   bpm:92,  notes:20 },
  { id:1, name:'Super',  col:'#c8d0dc', prize:600,  ai:[70, 145],  bpm:104, notes:24 },
  { id:2, name:'Hyper',  col:'#ffd23f', prize:1000, ai:[115, 200], bpm:116, notes:28 },
  { id:3, name:'Master', col:'#c06eff', prize:1800, ai:[165, 250], bpm:128, notes:32 }
];
const PRIZE_SHARE = [1, .4, .2, 0];         // part de l'argent selon la place (1er, 2e, 3e, 4e)
const WEIGHT = { style:.3, dance:.35, perf:.35 };   // poids des 3 épreuves dans la note finale

// Capsule Ball : points de STYLE selon la rareté (data/capsules.js)
const CAP_STYLE = { C:6, PC:12, R:18, UR:26 };

// Type du Pokémon / de l'attaque → catégorie de concours
const TYPE_CAT = {
  feu:'cool', combat:'cool', foudre:'cool', dragon:'cool',
  eau:'beauty', glace:'beauty', vol:'beauty',
  normal:'cute', fee:'cute', plante:'cute',
  psy:'smart', spectre:'smart', tenebres:'smart',
  roche:'tough', sol:'tough', acier:'tough', poison:'tough', insecte:'tough'
};
const catOf = type => TYPE_CAT[type] || 'cute';

// Baies : sprite = image dans assets/items/ (PokéSprite ; si elle manque, le jeu dessine la baie lui-même), fl = saveurs { statId: valeur }, lisse = douceur (plus c'est bas, plus le poffin est « lisse »), price = prix au marché
const BERRIES = [
  { id:'ceriz', sprite:'cheri-berry',  name:'Baie Ceriz',  fl:{ cool:20 },              lisse:25, price:20, col:'#e0443a' },
  { id:'maron', sprite:'chesto-berry',  name:'Baie Maron',  fl:{ beauty:20 },            lisse:25, price:20, col:'#5a8fe0' },
  { id:'pecha', sprite:'pecha-berry',  name:'Baie Pêcha',  fl:{ cute:20 },              lisse:25, price:20, col:'#ff9ad0' },
  { id:'fraive', sprite:'rawst-berry', name:'Baie Fraive', fl:{ smart:20 },             lisse:25, price:20, col:'#58c46a' },
  { id:'willia', sprite:'aspear-berry', name:'Baie Willia', fl:{ tough:20 },             lisse:25, price:20, col:'#f0c23a' },
  { id:'mepo', sprite:'figy-berry',   name:'Baie Mepo',   fl:{ cool:30, beauty:10 },   lisse:20, price:45, col:'#c0301e' },
  { id:'wiki', sprite:'wiki-berry',   name:'Baie Wiki',   fl:{ beauty:30, cute:10 },   lisse:20, price:45, col:'#3a68c8' },
  { id:'kika', sprite:'mago-berry',   name:'Baie Kika',   fl:{ cute:30, smart:10 },    lisse:20, price:45, col:'#e86ab4' },
  { id:'gowav', sprite:'aguav-berry',  name:'Baie Gowav',  fl:{ smart:30, tough:10 },   lisse:20, price:45, col:'#3a9c4e' },
  { id:'papaya', sprite:'iapapa-berry', name:'Baie Papaya', fl:{ tough:30, cool:10 },    lisse:20, price:45, col:'#d8a418' }
];
const BERRY = Object.fromEntries(BERRIES.map(b => [b.id, b]));
const POFFIN_MAX_BERRIES = 4, POFFIN_STOCK = 40;
