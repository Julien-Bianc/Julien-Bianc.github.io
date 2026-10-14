// ============================================================
//  COMBAT RAID (v0.16) — réglages. Modifie les nombres à ta guise.
//
//  Un Pokémon géant (aura rouge, yeux rouges) apparaît au centre d'un stade de nuit. Il a plusieurs barres de vie :
//  à chaque barre perdue il RUGIT et passe en RAGE (plus rapide, plus fort). De temps en temps il lance son
//  ATTAQUE ULTIME : des ondes de choc rouges partent de lui → esquive AU BON MOMENT pour passer à travers !
//  Solo : très difficile.  À plusieurs (2 à 4 joueurs, js/raid-net.js) : il a moins de PV par joueur → plus simple.
//  3 Pokémon maximum par joueur (les 3 premiers de l'équipe choisie).
// ============================================================
const RAID = {
  boss:'raid_tyranocif',            // Pokémon du raid (défini plus bas)
  bars:5,                           // nombre de barres de vie
  hp:7,                             // PV du boss = PV du Pokémon x hp (en solo)
  hpPerPlayer:.65,                  // chaque joueur en plus ajoute 65 % de PV (donc à 2 joueurs : x1,65 PV pour x2 dégâts)
  time:180,                         // secondes pour le vaincre
  maxPlayers:4, teamMax:3,
  // combat (même format que data/stages.js)
  stage:{ name:'Combat Raid', level:6, hp:1, dmg:1.45, speed:1, pspeed:1.15, rate:.8, tele:.9, aim:.75, boss:1 },
  // rage : à chaque barre perdue (cumulatif)
  rage:{ rate:.86, tele:.92, dmg:1.12, invuln:1.3, roarRadius:230, roarPush:150 },
  // attaque ultime : ondes de choc
  ult:{ first:16, cd:24, cdRage:3, charge:2.1, rings:3, gap:.75, speed:270, width:26, dmg:.32 /* part des PV max */, push:120 },
  // yeux rouges : position dans la tête (parts de la tête) — head : hauteur de la tête, y : hauteur des yeux, gap : écart, side/turn : profil
  eyes:{ head:.32, y:.78, gap:.17, turn:.14, side:.28 },
  // récompenses (à chaque victoire)
  reward:{ solo:600, multi:400, crates:1 }
};

// ---------- le Pokémon du raid (jamais dans tes équipes : wildOnly) ----------
Object.assign(POKEMON, {
  raid_tyranocif: {
    name:'Tyranocif', folder:'assets/pokemon/tyranocif', types:['roche', 'tenebres'], hp:150, speed:120, wildOnly:true,
    ability:{ name:'Sable Volant', desc:'Tempête de sable : les adversaires perdent des PV (sauf Roche/Sol/Acier).', sandStream:{ dps:.5, resist:.85 } },
    moves:[
      { name:'Mâchouille', type:'tenebres', kind:'melee', power:18, cooldown:1.3,
        anim:'Attack', hits:[4], effect:'bite', rushTime:.16, range:260, knockback:70 },
      { name:'Lame de Roc', type:'roche', kind:'strike', power:15, cooldown:2.6,
        look:'pillar', pattern:'random', count:6, spread:150, radius:34, delay:.75, stagger:.1, anim:'Strike' },
      { name:'Vibrobscur', type:'tenebres', kind:'pulse', power:20, cooldown:4,
        range:420, speed:420, width:30, arc:3.2, knockback:80, anim:'Shoot' }
    ]
  }
});

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
