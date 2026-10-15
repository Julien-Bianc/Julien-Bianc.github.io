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
  hpPerPlayer:.65,                  // chaque joueur en plus ajoute 65 % de PV (à 2 joueurs : x1,65 PV pour x2 dégâts)
  rotation:30,                      // minutes entre deux Pokémon de raid
  reroll:250,                       // prix pour changer de Pokémon de raid tout de suite
  // réglages de base (chaque nombre d'étoiles les modifie, voir RAID_STARS)
  bars:5, hp:7, time:180,
  stage:{ name:'Combat Raid', level:6, hp:1, dmg:1.45, speed:.8, pspeed:1.1, rate:.8, tele:.9, aim:.7, boss:1 },
  rage:{ rate:.86, tele:.92, dmg:1.12, invuln:1.3, roarRadius:230, roarPush:150 },
  ult:{ first:16, cd:24, cdRage:3, charge:2.1, rings:3, gap:.75, speed:270, width:26, dmg:.32 /* part des PV max */, push:120 },
  // yeux rouges : position dans la tête (parts de la tête) — head : hauteur de la tête, y : hauteur des yeux, gap : écart, side/turn : profil
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
// Ce que chaque nombre d'étoiles change par rapport à RAID (stage, ult, rage et reward sont fusionnés)
//   bonus : objet supplémentaire possible à la victoire { chance, held:'R'|'UR', caps:'R'|'UR' }
const RAID_STARS = {
  1:{ bars:3, hp:5, time:150, stage:{ dmg:.9, rate:1.05, tele:1.1, aim:.45, speed:.7 }, ult:{ first:20, cd:28, rings:2, dmg:.2 },
      reward:{ solo:250, multi:180, crates:1 } },
  2:{ bars:4, hp:6.5, time:165, stage:{ dmg:1.15, rate:.92, tele:1, aim:.6, speed:.75 }, ult:{ first:18, cd:26, rings:2, dmg:.26 },
      reward:{ solo:400, multi:280, crates:1, bonus:{ chance:.25, held:'R' } } },
  3:{ bars:5, hp:7.5, time:180, stage:{ dmg:1.35, rate:.84, tele:.92, aim:.7 }, ult:{ rings:3, dmg:.3 },
      reward:{ solo:600, multi:420, crates:1, bonus:{ chance:.5, held:'R' } } },
  4:{ bars:5, hp:9, time:195, stage:{ dmg:1.55, rate:.78, tele:.86, aim:.8 }, ult:{ first:14, cd:22, rings:3, dmg:.34 },
      reward:{ solo:900, multi:650, crates:2, bonus:{ chance:.8, held:'R', caps:'R' } } },
  5:{ bars:6, hp:10, time:210, stage:{ dmg:1.7, rate:.74, tele:.82, aim:.9 }, ult:{ first:12, cd:20, rings:4, gap:.65, dmg:.36 },
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
