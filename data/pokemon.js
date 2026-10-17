// ============================================================
//  POKÉMON — c'est LE fichier à modifier pour ajouter un Pokémon.
//
//  1) Télécharge ses sprites sur https://sprites.pmdcollab.org
//  2) Décompresse le zip dans  assets/pokemon/<dossier>/  (AnimData.xml + les *.png)
//  3) Ajoute une entrée ci-dessous (copie-colle une entrée existante et adapte).
//
//  Champs d'un Pokémon
//    name      : nom affiché
//    folder    : dossier des sprites (relatif à index.html)
//    types     : 1 ou 2 types parmi data/types.js (ex: ['feu','vol'])
//    hp        : points de vie (affichés x10 en jeu)
//    speed     : vitesse de déplacement (≈ 150 lent … 220 très rapide)
//    ability   : capacité spéciale (optionnel) — voir README.md
//    anims     : (optionnel) force un nom d'animation, ex { dash:'Rotate' }
//    moves     : EXACTEMENT 3 attaques (boutons A, B, C)
//
//  Types d'attaque (kind)
//    'melee' : charge au corps à corps (anim, hits, effect, rushTime, range, crit, knockback, recoil, invuln)
//    'fan'   : éventail de projectiles (count, spread, jitter, speed, life, radius, anim, status, exhaust, share)
//    'fly'   : s'envole puis plonge sur la cible (rise, dive, height, speed, radius)
//  Communs : name, type, kind, power (puissance), cooldown (secondes)
//  Les noms d'animation (Attack, Swing, Strike, Shoot, MultiScratch…) viennent du dossier
//  de sprites : lance  node tools/inspect-pokemon.js assets/pokemon/<dossier>  pour les lister.
// ============================================================
const POKEMON = {

  farfuret: {
    name:'Farfuret', folder:'assets/pokemon/farfuret', types:['glace','tenebres'], hp:95, speed:205,
    ability:{ name:'Attention', desc:'Coups critiques +20 %', critBonus:.2 },
    moves:[
      { name:'Furie-Griffe', type:'normal', kind:'melee', power:6, cooldown:1.2,
        anim:'MultiScratch', hits:[3,7,10], effect:'claws' },
      { name:'Vent Glace', type:'glace', kind:'fan', power:9, share:.5, cooldown:1.5,
        speed:260, count:7, spread:.2, life:.9, anim:'Shoot', status:{ kind:'slow', chance:.5 } },
      { name:'Tranche-Nuit', type:'tenebres', kind:'melee', power:19, cooldown:3.2,              // v0.21 : 26 → 19, critiques 35 % → 25 %
        anim:'Swing', hits:[5], effect:'slash', crit:.25 }
    ]
  },

  dracaufeu: {
    name:'Dracaufeu', folder:'assets/pokemon/dracaufeu', types:['feu','vol'], hp:125, speed:165,
    ability:{ name:'Brasier', desc:'Sous 33 % PV : attaques Feu x1,5',
              lowHp:{ below:.33, type:'feu', mult:1.5, label:'BRASIER !' } },
    moves:[
      { name:'Griffe Dragon', type:'dragon', kind:'melee', power:14, cooldown:1.4,
        anim:'Attack', hits:[5], effect:'dragon', rushTime:.16 },
      { name:'Vol', type:'vol', kind:'fly', power:22, cooldown:3.6,
        rise:.6, dive:.2, height:70, speed:330, radius:46 },
      { name:'Surchauffe', type:'feu', kind:'fan', power:20, share:.45, cooldown:4,
        speed:330, count:13, spread:.085, jitter:.05, life:1.1, radius:6, radiusJitter:3,
        anim:'Shoot', status:{ kind:'burn', chance:1 }, exhaust:2.5 }
    ]
  },

  fouinar: {
    name:'Fouinar', folder:'assets/pokemon/fouinar', types:['normal'], hp:100, speed:215,
    ability:{ name:'Fuite', desc:'1 fois sous 25 % PV : 1,2 s invulnérable + soin',
              lastStand:{ below:.25, invuln:1.2, heal:.1, label:'FUITE !' } },
    anims:{ dash:'Rotate' },
    moves:[
      { name:'Vive-Attaque', type:'normal', kind:'melee', power:8, cooldown:.7,
        anim:'Strike', hits:[2], effect:'quick', rushTime:.07, invuln:.3 },
      { name:'Météores', type:'normal', kind:'fan', power:16, share:.35, cooldown:2.2,           // v0.21.1 : remplace Souplesse (attaque à distance)
        speed:330, count:5, spread:.16, jitter:.04, life:1.1, radius:6, home:1.4, anim:'Shoot', color:'#fff3a0',
        desc:'5 étoiles dorées qui suivent la cible : difficiles à esquiver.' },
      { name:'Damoclès', type:'normal', kind:'melee', power:30, cooldown:4,
        anim:'Charge', hits:[5], effect:'ram', rushTime:.22, recoil:.25, range:300 }
    ]
  }

  // ← AJOUTE TON NOUVEAU POKÉMON ICI (n'oublie pas la virgule après l'entrée précédente)
};
