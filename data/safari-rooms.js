// ============================================================
//  SAFARI EN PLUSIEURS SALLES (v0.14) — pour l'instant : Dracaufeu.
//  Chaque salle = une meute de Pokémon sauvages qui attaquent EN MÊME TEMPS ; la dernière salle contient le
//  Pokémon à capturer. Seul le dernier peut être capturé ; les autres se battent normalement.
//    pokemon : id du Pokémon     count : combien en même temps     hp / dmg : multiplicateurs pour cette salle
//    label   : bandeau affiché à l'entrée de la salle
//  → Ajouter un Safari en salles : une entrée dans SAFARI_ROOMS (clé = Pokémon à capturer).
//
//  Pokémon « sauvages seulement » (wildOnly:true) : jamais dans tes équipes, les caisses ni le Classeur.
//  Sprites : sprites.pmdcollab.org (0004 Salamèche, 0005 Reptincel) → assets/pokemon/salameche, reptincel
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
  }
});

const SAFARI_ROOMS = {
  dracaufeu:[
    { pokemon:'salameche', count:3, hp:.55, dmg:.75, label:'Salle 1 — Le nid des Salamèche' },
    { pokemon:'reptincel', count:2, hp:.6,  dmg:.85, label:'Salle 2 — Les Reptincel montent la garde' },
    { pokemon:'dracaufeu', count:1, hp:1,   dmg:1,   label:'Salle 3 — Dracaufeu t\'attend !' }
  ]
};
