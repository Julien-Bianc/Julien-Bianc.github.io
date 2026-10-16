// ============================================================
//  SAFARI EN PLUSIEURS SALLES (v0.15) — Dracaufeu, Florizarre, Tortank  (v0.19 : + Raichu, Lucario, Farfuret, Fouinar)
//  Chaque salle = une meute de Pokémon sauvages qui attaquent EN MÊME TEMPS ; la dernière salle contient le
//  Pokémon à capturer. Seul le dernier peut être capturé ; les autres se battent normalement.
//    pokemon : id du Pokémon     count : combien en même temps     hp / dmg : multiplicateurs pour cette salle
//    label   : bandeau affiché à l'entrée de la salle
//    map     : (v0.19) carte de la salle : herbes, volcan, lagon, toundra, montagne, orage (on passe d'une salle à l'autre par la SORTIE)
//  → Ajouter un Safari en salles : une entrée dans SAFARI_ROOMS (clé = Pokémon à capturer).
//
//  Pokémon « sauvages seulement » (wildOnly:true) : jamais dans tes équipes, les caisses ni le Classeur.
//  Sprites : sprites.pmdcollab.org (0001 Bulbizarre, 0002 Herbizarre, 0004 Salamèche, 0005 Reptincel,
//  0007 Carapuce, 0008 Carabaffe) → assets/pokemon/<nom>
// ============================================================
Object.assign(POKEMON, {
  salameche: {
    name:'Salamèche', folder:'assets/pokemon/salameche', types:['feu'], hp:55, speed:185, wildOnly:true,
    ability:{ name:'Brasier', desc:'Sous 33 % PV : attaques Feu x1,5', lowHp:{ below:.33, type:'feu', mult:1.5, label:'BRASIER !' } },
    moves:[
      { name:'Flammèche', type:'feu', kind:'fan', power:5, cooldown:1.2, speed:300, count:3, spread:.2, jitter:.05, life:.9, radius:5, anim:'Shoot', status:{ kind:'burn', chance:.12 } },
      { name:'Griffe', type:'normal', kind:'melee', power:6, cooldown:1.1, anim:'Attack', effect:'claws', rushTime:.14 },
      { name:'Draco-Rage', type:'dragon', kind:'fan', power:7, cooldown:2, speed:360, count:1, spread:0, life:1.1, radius:8, anim:'Shoot' }
    ]
  },
  reptincel: {
    name:'Reptincel', folder:'assets/pokemon/reptincel', types:['feu'], hp:80, speed:195, wildOnly:true,
    ability:{ name:'Brasier', desc:'Sous 33 % PV : attaques Feu x1,5', lowHp:{ below:.33, type:'feu', mult:1.5, label:'BRASIER !' } },
    moves:[
      { name:'Lance-Flammes', type:'feu', kind:'fan', power:6, cooldown:1.6, speed:320, count:6, spread:.09, jitter:.04, life:1, radius:6, anim:'Shoot', status:{ kind:'burn', chance:.2 } },
      { name:'Crocs Feu', type:'feu', kind:'melee', power:10, cooldown:1.3, anim:'Attack', effect:'slash', rushTime:.15 },
      { name:'Tranche', type:'normal', kind:'melee', power:12, cooldown:1.6, anim:'Strike', effect:'slash', rushTime:.13 }
    ]
  },
  bulbizarre: {
    name:'Bulbizarre', folder:'assets/pokemon/bulbizarre', types:['plante', 'poison'], hp:60, speed:175, wildOnly:true,
    ability:{ name:'Engrais', desc:'Sous 33 % PV : attaques Plante x1,5', lowHp:{ below:.33, type:'plante', mult:1.5, label:'ENGRAIS !' } },
    moves:[
      { name:'Tranch\'Herbe', type:'plante', kind:'fan', power:5, cooldown:1.3, speed:310, count:3, spread:.22, jitter:.06, life:.9, radius:5, anim:'Shoot' },
      { name:'Fouet Lianes', type:'plante', kind:'melee', power:7, cooldown:1.2, anim:'Attack', effect:'slash', rushTime:.15 },
      { name:'Poudre Toxik', type:'poison', kind:'fan', power:3, cooldown:2.4, speed:200, count:5, spread:.3, life:1.2, radius:7, anim:'Shoot', status:{ kind:'poison', chance:.3 } }
    ]
  },
  herbizarre: {
    name:'Herbizarre', folder:'assets/pokemon/herbizarre', types:['plante', 'poison'], hp:85, speed:180, wildOnly:true,
    ability:{ name:'Engrais', desc:'Sous 33 % PV : attaques Plante x1,5', lowHp:{ below:.33, type:'plante', mult:1.5, label:'ENGRAIS !' } },
    moves:[
      { name:'Tranch\'Herbe', type:'plante', kind:'fan', power:6, cooldown:1.5, speed:330, count:5, spread:.14, jitter:.05, life:1, radius:6, anim:'Shoot' },
      { name:'Bélier', type:'normal', kind:'melee', power:12, cooldown:1.6, anim:'Attack', effect:'ram', rushTime:.16 },
      { name:'Bomb-Beurk', type:'poison', kind:'fan', power:8, cooldown:2.6, speed:260, count:1, spread:0, life:1.2, radius:10, anim:'Shoot', status:{ kind:'poison', chance:.35 } }
    ]
  },
  carapuce: {
    name:'Carapuce', folder:'assets/pokemon/carapuce', types:['eau'], hp:60, speed:175, wildOnly:true,
    ability:{ name:'Torrent', desc:'Sous 33 % PV : attaques Eau x1,5', lowHp:{ below:.33, type:'eau', mult:1.5, label:'TORRENT !' } },
    moves:[
      { name:'Pistolet à O', type:'eau', kind:'fan', power:6, cooldown:1.1, speed:380, count:1, spread:0, life:1, radius:6, anim:'Shoot' },
      { name:'Charge', type:'normal', kind:'melee', power:6, cooldown:1.1, anim:'Attack', effect:'ram', rushTime:.15 },
      { name:'Écume', type:'eau', kind:'fan', power:3, cooldown:2, speed:220, count:5, spread:.28, life:1.1, radius:6, anim:'Shoot', status:{ kind:'slow', chance:.2 } }
    ]
  },
  carabaffe: {
    name:'Carabaffe', folder:'assets/pokemon/carabaffe', types:['eau'], hp:85, speed:180, wildOnly:true,
    ability:{ name:'Torrent', desc:'Sous 33 % PV : attaques Eau x1,5', lowHp:{ below:.33, type:'eau', mult:1.5, label:'TORRENT !' } },
    moves:[
      { name:'Vibraqua', type:'eau', kind:'fan', power:7, cooldown:1.5, speed:300, count:3, spread:.12, life:1.1, radius:8, anim:'Shoot', status:{ kind:'confuse', chance:.15 } },
      { name:'Morsure', type:'tenebres', kind:'melee', power:11, cooldown:1.4, anim:'Attack', effect:'slash', rushTime:.14 },
      { name:'Pistolet à O', type:'eau', kind:'fan', power:6, cooldown:1.2, speed:400, count:2, spread:.08, life:1, radius:6, anim:'Shoot' }
    ]
  },
  // ---- v0.19 : meutes des autres Safari (sprites pmdcollab : 0172 Pichu, 0025 Pikachu, 0447 Riolu, 0161 Fouinette) ----
  pichu: {
    name:'Pichu', folder:'assets/pokemon/pichu', types:['foudre'], hp:45, speed:185, wildOnly:true,
    ability:{ name:'Statik', desc:'Sous 33 %% PV : attaques Électrik x1,3', lowHp:{ below:.33, type:'foudre', mult:1.3, label:'STATIK !' } },
    moves:[
      { name:'Éclair', type:'foudre', kind:'fan', power:4, cooldown:1.2, speed:320, count:1, spread:0, life:1, radius:6, anim:'Attack', status:{ kind:'par', chance:.1 } },
      { name:'Vive-Attaque', type:'normal', kind:'melee', power:5, cooldown:1.1, anim:'Attack', effect:'ram', rushTime:.12 },
      { name:'Étincelle', type:'foudre', kind:'melee', power:6, cooldown:1.5, anim:'Attack', effect:'impact', rushTime:.14, status:{ kind:'par', chance:.2 } }
    ]
  },
  pikachu: {
    name:'Pikachu', folder:'assets/pokemon/pikachu', types:['foudre'], hp:65, speed:200, wildOnly:true,
    ability:{ name:'Statik', desc:'Sous 33 %% PV : attaques Électrik x1,3', lowHp:{ below:.33, type:'foudre', mult:1.3, label:'STATIK !' } },
    moves:[
      { name:'Éclair', type:'foudre', kind:'fan', power:5, cooldown:1.2, speed:340, count:2, spread:.1, life:1, radius:6, anim:'Shoot', status:{ kind:'par', chance:.1 } },
      { name:'Queue de Fer', type:'acier', kind:'melee', power:10, cooldown:1.6, anim:'Attack', effect:'slash', rushTime:.14 },
      { name:'Boule Élek', type:'foudre', kind:'fan', power:8, cooldown:2.2, speed:260, count:1, spread:0, life:1.2, radius:10, anim:'Shoot', status:{ kind:'par', chance:.2 } }
    ]
  },
  riolu: {
    name:'Riolu', folder:'assets/pokemon/riolu', types:['combat'], hp:60, speed:195, wildOnly:true,
    ability:{ name:'Impassible', desc:'Touché, +20 % de vitesse pendant 2 s', onHurt:{ speedBoost:.2, time:2 } },
    moves:[
      { name:'Onde Vide', type:'combat', kind:'fan', power:5, cooldown:1.3, speed:420, count:1, spread:0, life:.9, radius:6, anim:'Strike' },
      { name:'Forte-Paume', type:'combat', kind:'melee', power:8, cooldown:1.3, anim:'Strike', effect:'impact', rushTime:.13, status:{ kind:'par', chance:.15 } },
      { name:'Vive-Attaque', type:'normal', kind:'melee', power:5, cooldown:1, anim:'Attack', effect:'ram', rushTime:.11 }
    ]
  },
  fouinette: {
    name:'Fouinette', folder:'assets/pokemon/fouinette', types:['normal'], hp:55, speed:190, wildOnly:true,
    ability:{ name:'Fuite', desc:'Aucun effet en combat' },
    moves:[
      { name:'Météores', type:'normal', kind:'fan', power:4, cooldown:1.4, speed:300, count:3, spread:.25, jitter:.06, life:1, radius:6, anim:'Shoot' },
      { name:'Griffe', type:'normal', kind:'melee', power:5, cooldown:1.1, anim:'Attack', effect:'claws', rushTime:.13 },
      { name:'Vive-Attaque', type:'normal', kind:'melee', power:5, cooldown:1, anim:'Attack', effect:'ram', rushTime:.11 }
    ]
  },
  // Farfuret de la meute : même sprite que Farfuret, mais un autre identifiant (seul le dernier, « farfuret », est capturable)
  farfuretw: {
    name:'Farfuret', folder:'assets/pokemon/farfuret', types:['glace', 'tenebres'], hp:70, speed:200, wildOnly:true,
    ability:{ name:'Attention', desc:'Coups critiques +10 %', critBonus:.1 },
    moves:[
      { name:'Griffe', type:'normal', kind:'melee', power:5, cooldown:1.2, anim:'MultiScratch', hits:[3, 7], effect:'claws' },
      { name:'Vent Glace', type:'glace', kind:'fan', power:6, share:.5, cooldown:1.6, speed:250, count:5, spread:.2, life:.9, anim:'Shoot', status:{ kind:'slow', chance:.3 } },
      { name:'Feinte', type:'tenebres', kind:'melee', power:8, cooldown:1.8, anim:'Swing', hits:[5], effect:'slash' }
    ]
  }
});

const SAFARI_ROOMS = {
  dracaufeu:[
    { pokemon:'salameche', count:3, hp:.55, dmg:.75, label:'Salle 1 — Le nid des Salamèche', map:'montagne' },
    { pokemon:'reptincel', count:2, hp:.6,  dmg:.85, label:'Salle 2 — Les Reptincel montent la garde', map:'volcan' },
    { pokemon:'dracaufeu', count:1, hp:1,   dmg:1,   label:'Salle 3 — Dracaufeu t\'attend !', map:'volcan' }
  ],
  florizarre:[
    { pokemon:'bulbizarre', count:3, hp:.55, dmg:.75, label:'Salle 1 — Le jardin des Bulbizarre', map:'herbes' },
    { pokemon:'herbizarre', count:2, hp:.6,  dmg:.85, label:'Salle 2 — Les Herbizarre bloquent le passage', map:'orage' },
    { pokemon:'florizarre', count:1, hp:1,   dmg:1,   label:'Salle 3 — Florizarre t\'attend !', map:'herbes' }
  ],
  tortank:[
    { pokemon:'carapuce',  count:3, hp:.55, dmg:.75, label:'Salle 1 — La plage des Carapuce', map:'lagon' },
    { pokemon:'carabaffe', count:2, hp:.6,  dmg:.85, label:'Salle 2 — Les Carabaffe gardent le lagon', map:'herbes' },
    { pokemon:'tortank',   count:1, hp:1,   dmg:1,   label:'Salle 3 — Tortank t\'attend !', map:'lagon' }
  ],
  // ---- v0.19 ----
  raichu:[
    { pokemon:'pichu',     count:3, hp:.55, dmg:.7,  label:'Salle 1 — Les Pichu chargent l\'air', map:'herbes' },
    { pokemon:'pikachu',   count:2, hp:.6,  dmg:.85, label:'Salle 2 — Les Pikachu crépitent', map:'orage' },
    { pokemon:'raichu',    count:1, hp:1,   dmg:1,   label:'Salle 3 — Raichu t\'attend !', map:'orage' }
  ],
  lucario:[
    { pokemon:'riolu',     count:2, hp:.55, dmg:.75, label:'Salle 1 — Deux Riolu s\'entraînent', map:'herbes' },
    { pokemon:'riolu',     count:3, hp:.6,  dmg:.85, label:'Salle 2 — Le dojo des Riolu', map:'montagne' },
    { pokemon:'lucario',   count:1, hp:1,   dmg:1,   label:'Salle 3 — Lucario t\'attend !', map:'montagne' }
  ],
  farfuret:[
    { pokemon:'farfuretw', count:2, hp:.5,  dmg:.7,  label:'Salle 1 — Des Farfuret rôdent', map:'montagne' },
    { pokemon:'farfuretw', count:3, hp:.55, dmg:.8,  label:'Salle 2 — La bande des Farfuret', map:'toundra' },
    { pokemon:'farfuret',  count:1, hp:1,   dmg:1,   label:'Salle 3 — Le chef Farfuret t\'attend !', map:'toundra' }
  ],
  fouinar:[
    { pokemon:'fouinette', count:3, hp:.55, dmg:.7,  label:'Salle 1 — Les Fouinette guettent', map:'herbes' },
    { pokemon:'fouinette', count:4, hp:.55, dmg:.75, label:'Salle 2 — Le terrier des Fouinette', map:'montagne' },
    { pokemon:'fouinar',   count:1, hp:1,   dmg:1,   label:'Salle 3 — Fouinar t\'attend !', map:'herbes' }
  ]
};
