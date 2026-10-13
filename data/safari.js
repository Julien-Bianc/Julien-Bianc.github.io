// ============================================================
//  SAFARI & DÉBLOCAGE DES POKÉMON (v0.11) — tout se règle ici.
//
//  Déblocage : au début de l'aventure le joueur choisit 1 Pokémon parmi STARTERS_CHOICE.
//  Tous les autres sont verrouillés : on les débloque en les CAPTURANT au Safari (ou lors d'événements).
//
//  Safari : on achète un ticket au Magasin (+ des Balls), on choisit le Pokémon voulu, on le combat sur
//  une carte sauvage de son type, on l'affaiblit puis on lance des Balls. Capture = Pokémon débloqué.
//  Impossible d'entrer dans un Safari pour un Pokémon déjà capturé.
// ============================================================
const STARTERS_CHOICE = ['farfuret', 'dracaufeu', 'tortank', 'florizarre', 'lucario', 'raichu', 'fouinar'];

const SAFARI = {
  zones:[
    { id:'depart', name:'Safari du Grand Départ', desc:'Les 7 Pokémon du grand départ vivent ici.',
      pokemon:['farfuret', 'dracaufeu', 'tortank', 'florizarre', 'lucario', 'raichu', 'fouinar'],
      ticket:{ id:'ticket:depart', name:'Ticket Safari — Grand Départ', price:200, col:'#5aa845' },
      // combat contre le Pokémon sauvage (même format que data/stages.js) — hp élevé : il faut le temps de l'affaiblir
      stage:{ name:'Safari', level:4, hp:2.0, dmg:.95, speed:1.1, pspeed:1.05, rate:1.0, tele:1.0, aim:.45, boss:1 } }
  ],
  // Balls vendues au Magasin. mult = multiplicateur de capture
  balls:[
    { id:'ball:poke',  name:'Poké Ball',  price:25,  mult:1,   top:'#e8403c', band:null },
    { id:'ball:super', name:'Super Ball', price:60,  mult:1.5, top:'#3a78e8', band:'#e8403c' },
    { id:'ball:hyper', name:'Hyper Ball', price:120, mult:2,   top:'#2a2a34', band:'#ffd23f' }
  ],
  // Chance de capture (comme dans les jeux Pokémon) :
  //   chance = base × Ball × statut × (1 − hpWeight × PV restants / PV max)   (entre 1 % et 97 %)
  //   puis la Ball bouge 3 fois : chaque secousse doit réussir (sinon le Pokémon s'échappe).
  base:.55, hpWeight:.85,
  status:{ slp:2, frz:2, par:1.5, burn:1.5, psn:1.5, cnf:1.2 },
  throwCd:1.2,                  // délai entre deux lancers (secondes)
  // carte sauvage selon le 1er type du Pokémon (cartes : js/safari-maps.js)
  maps:{ plante:'herbes', normal:'herbes', fee:'herbes', insecte:'herbes', poison:'herbes',
         feu:'volcan', dragon:'volcan', sol:'volcan',
         eau:'lagon',
         glace:'toundra', tenebres:'toundra', spectre:'toundra',
         combat:'montagne', acier:'montagne', roche:'montagne', psy:'montagne',
         foudre:'orage', vol:'orage' }
};
