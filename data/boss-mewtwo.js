// ============================================================
//  BOSS : MEWTWO (v0.10) — sprites PMDCollab n° 0150 → assets/pokemon/mewtwo/
//  `bossOnly:true` : il n'apparaît PAS dans les équipes, le magasin ni le choix du joueur, seulement :
//     • en boss final des niveaux listés dans STAGE_BOSS (data/stages.js garde les autres réglages)
//     • dans le mode « Défi : Mewtwo » du menu principal (réglages : BOSS_STAGE ci-dessous)
//     • comme mannequin dans l'Entraînement (pour le tester)
//  Pour le rendre jouable plus tard : enlève simplement  bossOnly:true.
//
//  `ai` = cerveau du boss (js/boss.js) :
//     weights      : probabilité de choisir chaque attaque (même ordre que moves)
//     rageWeights  : idem quand il est enragé
//     tele         : durée du signal avant chaque attaque (secondes)
//     react        : n° de l'attaque lancée en RÉACTION quand des projectiles arrivent (Barrière)
//     dodge        : se téléporte quand tu es trop près (range px, cd secondes)
//     rage         : sous `below` PV : attaques plus rapides (rate) + aura
// ============================================================
Object.assign(POKEMON, {
  mewtwo: {
    name:'Mewtwo', folder:'assets/pokemon/mewtwo', types:['psy'], hp:180, speed:200, bossOnly:true,
    ability:{ name:'Pression', desc:'Tes temps de recharge sont 25 % plus longs face à lui.', pressure:1.25 },
    anims:{ dash:'Hover', fly:'Hover' },
    moves:[
      { name:'Ball\'Ombre', type:'spectre', kind:'prison', power:8, cooldown:1.6,
        speed:250, radius:13, life:2.2, home:.7, time:1.6, tick:.3, dot:.8, final:10, knockback:160, anim:'Shoot',
        desc:'Sphère obscure : enferme la cible, la blesse en continu puis l\'éjecte en arrière.' },
      { name:'Barrière', type:'psy', kind:'stasis', power:0, cooldown:6,
        time:1.4, radius:150, mult:1.2, anim:'Hover',
        desc:'Arrête tous les projectiles en l\'air puis les RENVOIE. Les rayons et le corps à corps passent.' },
      { name:'Télékinésie', type:'psy', kind:'grab', power:18, cooldown:5,
        radius:46, warn:.6, lift:.5, knockback:210, anim:'Hover',
        desc:'Un cercle se referme sur toi : sors-en ! Sinon il te soulève, t\'écrase au sol et te projette.' },
      { name:'Psykoud\'Boul', type:'psy', kind:'megabeam', power:34, cooldown:8,
        charge:1.15, time:1.3, width:46, length:720, sweep:.45, chargeSweep:1.8, lock:.35, anim:'Charge',
        desc:'Charge une boule d\'énergie puis tire un rayon géant qui te suit lentement.' }
    ],
    ai:{ weights:[.45, 0, .3, .25], rageWeights:[.35, 0, .3, .35], tele:[.35, .1, .3, .2], react:1,
         dodge:{ range:80, cd:3 }, rage:{ below:.5, rate:.6, label:'MEWTWO S\'ÉNERVE !' } }
  }
});

// Niveaux solo dont le boss final est Mewtwo (index : 0 = Prairie … 9 = Ligue des maîtres)
const STAGE_BOSS = { 8:'mewtwo', 9:'mewtwo' };

// Réglages du mode « Défi : Mewtwo » (même format que data/stages.js)
const BOSS_STAGE = { name:'Défi : Mewtwo', level:5, arena:5, hp:1.3, dmg:1.15, speed:1.1, pspeed:1.15, rate:.85, tele:.85, aim:.8, boss:2.6 };
