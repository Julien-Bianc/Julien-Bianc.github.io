// ============================================================
//  POKÉMON (suite) — Tortank, Florizarre, Raichu, Lucario
//  Même format que data/pokemon.js (tu peux répartir tes Pokémon sur autant de fichiers que tu veux :
//  il suffit d'ajouter un <script src="data/…"> dans index.html, juste après data/pokemon.js).
//
//  ⚠ Les sprites ne sont PAS fournis : télécharge chaque Pokémon sur https://sprites.pmdcollab.org
//  et décompresse-le dans  assets/pokemon/<dossier>/  (voir README.md). Tant qu'un dossier est absent,
//  le Pokémon est ignoré (message d'avertissement dans le menu) et le jeu fonctionne avec les autres.
//
//  Types d'attaque (kind) en plus de melee / fan / fly :
//    'pool'  : lance une flaque persistante qui blesse et empoisonne (radius, duration, status)
//    'tide' (vague perforante qui ralentit), 'meteor' (boule qui explose en 8 éclats), 'bolt' (éclair très rapide),
//    'strike' (zones de foudre retardées, 3 si chargé), 'beam' (rayon instantané, ligne droite), 'wave', 'spore', 'drain', 'leaf', 'shot', 'flame'
//    -> pour ces kinds legacy, seuls name, type, kind, power, cooldown et speed comptent.
//  Capacités : critBonus, lowHp, lastStand (voir README) + absorb {type,heal} + onHurt {speedBoost,time}
// ============================================================
Object.assign(POKEMON, {

  tortank: {
    name:'Tortank', folder:'assets/pokemon/tortank', types:['eau'], hp:135, speed:150,
    ability:{ name:'Torrent', desc:'Sous 33 % PV : attaques Eau x1,5',
              lowHp:{ below:.33, type:'eau', mult:1.5, label:'TORRENT !' } },
    moves:[
      { name:'Pistolet à O', type:'eau', kind:'fan', power:10, share:.5, cooldown:.8,
        speed:380, count:3, spread:.07, jitter:.03, life:.9, anim:'Shoot' },
      { name:'Surf', type:'eau', kind:'tide', power:20, cooldown:3.2, speed:240 },        // vague perforante qui ralentit
      { name:'Hydrocanon', type:'eau', kind:'stream', power:30, cooldown:4,               // v0.09 : jet continu qui se courbe (js/moves-plus.js)
        time:.9, length:320, width:18, tick:.1, sweep:1.2, anim:'Shoot' }
    ]
  },

  florizarre: {
    name:'Florizarre', folder:'assets/pokemon/florizarre', types:['plante','poison'], hp:125, speed:145,
    ability:{ name:'Engrais', desc:'Sous 33 % PV : attaques Plante x1,5',
              lowHp:{ below:.33, type:'plante', mult:1.5, label:'ENGRAIS !' } },
    moves:[
      { name:"Tranch'Herbe", type:'plante', kind:'fan', power:9, share:.55, cooldown:1,
        speed:340, count:5, spread:.12, jitter:.04, life:1, anim:'Shoot' },
      { name:'Bomb Beurk', type:'poison', kind:'pool', power:6, cooldown:3,                // flaque toxique à viser
        radius:46, duration:3.5, status:{ kind:'poison', chance:1 }, anim:'Shoot' },
      { name:'Lance-Soleil', type:'plante', kind:'beam', power:26, cooldown:4.2 }          // rayon instantané (à charger)
    ]
  },

  raichu: {
    name:'Raichu', folder:'assets/pokemon/raichu', types:['foudre'], hp:90, speed:225,
    ability:{ name:'Paratonnerre', desc:'Absorbe les attaques Électrik (soigne 15 %)',
              absorb:{ type:'foudre', heal:.15 } },
    moves:[
      { name:'Éclair', type:'foudre', kind:'bolt', power:7, cooldown:.22, speed:420 },
      { name:'Tonnerre', type:'foudre', kind:'strike', power:6, cooldown:2 },              // zones de foudre retardées
      { name:'Électacle', type:'foudre', kind:'melee', power:28, cooldown:3.6,
        anim:'Charge', effect:'ram', rushTime:.2, recoil:.2, range:320, status:{ kind:'par', chance:.4 } }
    ]
  },

  lucario: {
    name:'Lucario', folder:'assets/pokemon/lucario', types:['combat','acier'], hp:105, speed:195,
    ability:{ name:'Impassible', desc:'Touché, +35 % de vitesse pendant 2 s',
              onHurt:{ speedBoost:.35, time:2 } },
    moves:[
      { name:'Aurasphère', type:'combat', kind:'fan', power:16, share:1, cooldown:1.8,
        speed:250, count:1, spread:0, jitter:0, life:2.5, radius:9, home:3.2, anim:'Shoot' },   // sphère à tête chercheuse
      { name:'Close Combat', type:'combat', kind:'melee', power:20, cooldown:2.4,
        anim:'Attack', effect:'impact', rushTime:.1, recoil:.15, range:220, crit:.2 },
      { name:'Luminocanon', type:'acier', kind:'beam', power:24, cooldown:3.4 }
    ]
  }

});
