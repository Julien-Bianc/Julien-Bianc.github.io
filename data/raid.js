// ============================================================
//  COMBAT RAID (v0.17) — réglages. Modifie les nombres à ta guise.
//
//  Un Pokémon géant (aura rouge, yeux rouges) apparaît au centre du Stade du Raid. Il a plusieurs barres de vie :
//  à chaque barre perdue il RUGIT et passe en RAGE (plus rapide, plus fort). De temps en temps il lance son
//  ATTAQUE ULTIME : des ondes de choc rouges partent de lui → esquive AU BON MOMENT pour passer à travers !
//  Solo : difficile.  À plusieurs (2 à 4 joueurs, js/raid-net.js) : il a moins de PV par joueur → plus simple.
//  3 Pokémon maximum par joueur (les 3 premiers de l'équipe choisie).
//
//  TOUS les Pokémon peuvent être boss de raid. Plus il est fort, plus le raid a d'ÉTOILES (RAID_TIERS).
//  Le Pokémon du raid change toutes les 30 minutes (le même pour tout le monde) ; on peut le changer
//  tout de suite contre des Pokédollars (RAID.reroll).
// ============================================================
const RAID = {
  maxPlayers:4, teamMax:3,
  hpPerPlayer:.8,                   // chaque joueur en plus ajoute 80 % de PV (à 2 joueurs : x1,8 PV pour x2 dégâts)
  perPlayer:{ rate:.92, tele:.95, dmg:1.08, special:.9 },   // (v0.17.2) par joueur en plus : boss plus rapide et plus fort
  rotation:30,                      // minutes entre deux Pokémon de raid
  reroll:250,                       // prix pour changer de Pokémon de raid tout de suite
  // réglages de base (chaque nombre d'étoiles les modifie, voir RAID_STARS)
  bars:5, hp:7, time:180,
  stage:{ name:'Combat Raid', level:6, hp:1, dmg:1.7, speed:.8, pspeed:1.1, rate:.8, tele:.9, aim:.7, boss:1 },
  rage:{ rate:.86, tele:.92, dmg:1.12, invuln:1.3, roarRadius:230, roarPush:150 },
  ult:{ first:16, cd:24, cdRage:3, charge:1.6, rings:3, gap:.6, speed:340, width:30, dmg:.42 /* part des PV max */, push:150 },
  // yeux rouges : position dans la tête (parts de la tête) — head : hauteur de la tête, y : hauteur des yeux, gap : écart, side/turn : profil
  // attaques de zone (v0.17.1) : le boss fait tomber des zones rouges au sol → sors-en ou esquive au bon moment.
  //   first : 1re après x s · every : puis toutes les x s (plus souvent en rage) · power : dégâts · count : zones en plus au hasard
  //   delay : temps avant l'impact · kinds : 'meteor' (pluie sur les joueurs), 'cross' (fissures depuis le boss), 'ring' (2 ondes autour du boss)
  zones:{ first:10, every:10, power:20, count:3, delay:.9, kinds:['meteor', 'cross', 'ring'] },
  // attaques spéciales de boss (v0.17.2) : first / every (s) · power : multiplie les dégâts (part des PV max de ton Pokémon)
  //   'chase'  Traque : des impacts tombent sur toi l'un après l'autre → il faut bouger
  //   'spiral' Tempête : spirale de projectiles autour du boss       'dash'  Charge : le boss fonce en ligne droite
  //   'sweep'  Rayon : un rayon géant balaie l'arène → roulade au bon moment pour passer à travers
  specials:{ first:6, every:9, power:1, kinds:['chase', 'spiral', 'dash', 'sweep'] },
  eyes:{ head:.32, y:.78, gap:.17, turn:.14, side:.28 },
  reward:{ solo:600, multi:400, crates:1, bonus:null }
};

// Pokémon de raid par nombre d'étoiles. weight = chance que ce niveau d'étoiles tombe au changement de raid.
const RAID_TIERS = [
  { stars:1, weight:24, pokemon:['farfuret', 'fouinar', 'rondoudou'] },
  { stars:2, weight:26, pokemon:['raichu', 'alakazam', 'gardevoir'] },
  { stars:3, weight:24, pokemon:['lucario', 'ectoplasma', 'cizayox'] },
  { stars:4, weight:20, pokemon:['tortank', 'dracaufeu', 'florizarre', 'carchacrok', 'tyranocif'] },
  { stars:5, weight:6,  pokemon:['mewtwo'] }                           // raid RARE
];
// Ce que chaque nombre d'étoiles change par rapport à RAID (stage, ult, rage, zones et reward sont fusionnés)
//   bonus : objet supplémentaire possible à la victoire { chance, held:'R' ou une liste ['C', 'PC'] (tirée au hasard), caps:'R'|'UR' }
const RAID_STARS = {
  1:{ bars:3, hp:6, time:150, stage:{ dmg:1.3, rate:.86, tele:.95, aim:.7, speed:.85 }, ult:{ first:18, cd:24, rings:2, dmg:.3 },
      zones:{ first:11, every:11, power:15, count:2, delay:1 }, specials:{ first:7, every:10, power:.8, kinds:['chase', 'spiral', 'dash'] },
      reward:{ solo:250, multi:180, crates:1, bonus:{ chance:.35, held:['C', 'PC'] } } },
  2:{ bars:4, hp:7.5, time:165, stage:{ dmg:1.5, rate:.8, tele:.92, aim:.75, speed:.85 }, ult:{ first:17, cd:23, rings:2, dmg:.36 },
      zones:{ first:10, every:10, power:17, count:3, delay:.95 }, specials:{ every:9.5, power:.9 },
      reward:{ solo:400, multi:280, crates:1, bonus:{ chance:.5, held:['C', 'PC'] } } },
  3:{ bars:5, hp:8.5, time:180, stage:{ dmg:1.7, rate:.74, tele:.88, aim:.8 }, ult:{ rings:3, dmg:.42 },
      zones:{ every:9, power:20, count:4 }, specials:{ every:8.5, power:1 },
      reward:{ solo:600, multi:420, crates:1, bonus:{ chance:.65, held:['PC', 'PC', 'C'] } } },
  4:{ bars:5, hp:10, time:195, stage:{ dmg:1.9, rate:.7, tele:.84, aim:.85 }, ult:{ first:14, cd:21, rings:3, dmg:.46 },
      zones:{ first:9, every:8, power:23, count:5, delay:.85 }, specials:{ first:5, every:7.5, power:1.12 },
      reward:{ solo:900, multi:650, crates:2, bonus:{ chance:.8, held:'R', caps:'R' } } },
  5:{ bars:6, hp:11, time:210, stage:{ dmg:2.1, rate:.66, tele:.8, aim:.9 }, ult:{ first:12, cd:19, rings:4, gap:.55, dmg:.5 },
      zones:{ first:8, every:7, power:26, count:6, delay:.8 }, specials:{ first:5, every:6.5, power:1.25 },
      reward:{ solo:1500, multi:1100, crates:3, bonus:{ chance:1, held:'R', caps:'UR' } } }
};

// ---------- Caisse de raid (contenu à compléter plus tard) ----------
//  Pas d'emplacement commun : une caisse de raid donne toujours au moins un objet PEU COMMUN.
CRATES.push({ id:'raid', name:'Caisse de raid', desc:'Gagnée en battant un Pokémon de raid', price:0,
  slots:[
    { r:'PC', label:'Objet tenu peu commun', held:true },
    { r:'PC', label:'Capsule Ball peu commune', caps:true },
    { r:'R',  label:'Objet tenu rare', held:true },
    { r:'R',  label:'Capsule Ball rare', caps:true },
    { r:'UR', label:'Capsule Ball ultra rare', caps:true },
    { r:'UR', label:'Carte LÉGENDAIRE', legend:true },
    { r:'S',  label:'???', items:['shiny-swapper', 'oeuf-mystere'], hidden:true }
  ] });
CRATE.raid = CRATES[CRATES.length - 1];
