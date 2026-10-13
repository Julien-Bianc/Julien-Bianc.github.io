// ============================================================
//  POKÉMON — VAGUE 2 (v0.09) : Ectoplasma, Alakazam, Carchacrok, Tyranocif, Cizayox, Gardevoir
//  Même format que data/pokemon.js. Nouveaux kinds et capacités : voir js/moves-plus.js et js/abilities-plus.js.
//
//  Sprites (sprites.pmdcollab.org → bouton de téléchargement, ou GitHub PMDCollab/SpriteCollab/sprite/<n°>) :
//    Ectoplasma 0094 → assets/pokemon/ectoplasma/     Alakazam  0065 → assets/pokemon/alakazam/
//    Carchacrok 0445 → assets/pokemon/carchacrok/     Tyranocif 0248 → assets/pokemon/tyranocif/
//    Cizayox    0212 → assets/pokemon/cizayox/        Gardevoir 0282 → assets/pokemon/gardevoir/
//  Les noms d'animation (anim) ci-dessous ont été choisis d'après les vraies feuilles de sprites de chaque Pokémon.
// ============================================================
Object.assign(POKEMON, {

  ectoplasma: {
    name:'Ectoplasma', folder:'assets/pokemon/ectoplasma', types:['spectre', 'poison'], hp:95, speed:200,
    ability:{ name:'Lévitation', desc:'Immunisé aux attaques de type Sol (Tunnel…).', immune:['sol'] },
    anims:{ dash:'Float' },
    moves:[
      { name:'Ball\'Ombre', type:'spectre', kind:'fan', power:13, share:1, cooldown:1.1,
        speed:270, count:1, spread:0, jitter:0, life:1.6, radius:9, home:1.2, anim:'Shoot', color:'#8a5ae8', look:'ghost',
        status:{ kind:'confuse', chance:.12 } },
      { name:'Ombre Portée', type:'spectre', kind:'blink', power:14, cooldown:2.6,
        range:280, behind:true, radius:52, delay:.22, effect:'shadow', look:'shadow', anim:'Attack' },
      { name:'Pics Toxik', type:'poison', kind:'trap', power:7, cooldown:4,
        count:3, spacing:36, radius:16, duration:8, status:{ kind:'poison', chance:1 }, anim:'Swing' }
    ]
  },

  alakazam: {
    name:'Alakazam', folder:'assets/pokemon/alakazam', types:['psy'], hp:80, speed:190,
    ability:{ name:'Garde Magik', desc:'Ne perd aucun PV par brûlure, poison ou tempête de sable.', magicGuard:true },
    moves:[
      { name:'Choc Mental', type:'psy', kind:'wave', power:9, cooldown:.45,
        speed:380, count:1, amp:14, radius:6, life:1, anim:'Shoot' },
      { name:'Téléport', type:'psy', kind:'blink', power:0, cooldown:2.4,
        range:300, delay:.12, invuln:.35, look:'psy', anim:'SpAttack', after:{ dmg:1.3, time:1.5 } },
      { name:'Psyko', type:'psy', kind:'strike', power:28, cooldown:3.6,
        look:'implode', pattern:'single', radius:50, delay:.65, anim:'SpAttack', status:{ kind:'confuse', chance:.3 } }
    ]
  },

  carchacrok: {
    name:'Carchacrok', folder:'assets/pokemon/carchacrok', types:['dragon', 'sol'], hp:130, speed:210,
    ability:{ name:'Peau Dure', desc:'Qui le frappe au contact perd 5 % de ses PV max.', roughSkin:.05 },
    moves:[
      { name:'Draco-Griffe', type:'dragon', kind:'melee', power:11, cooldown:.9,
        anim:'Attack', hits:[2], effect:'dragon', rushTime:.1, range:200 },
      { name:'Tunnel', type:'sol', kind:'burrow', power:20, cooldown:3.4,
        time:1.1, speed:300, radius:52, anim:'RearUp' },
      { name:'Draco-Météore', type:'dragon', kind:'strike', power:9, cooldown:6.5,
        look:'meteor', pattern:'random', count:5, radius:36, spread:85, delay:.95, stagger:.13, exhaust:1.5, anim:'Shoot', big:true }
    ]
  },

  tyranocif: {
    name:'Tyranocif', folder:'assets/pokemon/tyranocif', types:['roche', 'tenebres'], hp:150, speed:140,
    ability:{ name:'Sable Volant', desc:'Tempête de sable : l\'adversaire perd des PV (sauf Roche/Sol/Acier) ; Tyranocif subit -20 % des attaques à distance.',
              sandStream:{ dps:.5, resist:.8 } },
    moves:[
      { name:'Mâchouille', type:'tenebres', kind:'melee', power:15, cooldown:1.3,
        anim:'Attack', hits:[4], effect:'bite', rushTime:.14, range:200 },
      { name:'Lame de Roc', type:'roche', kind:'strike', power:13, cooldown:2.8,
        look:'pillar', pattern:'line', count:4, gap:52, start:56, radius:26, delay:.35, stagger:.09, anim:'Strike' },
      { name:'Vibrobscur', type:'tenebres', kind:'pulse', power:22, cooldown:4,
        range:280, speed:460, width:26, arc:.85, knockback:60, anim:'Shoot' }
    ]
  },

  cizayox: {
    name:'Cizayox', folder:'assets/pokemon/cizayox', types:['insecte', 'acier'], hp:110, speed:180,
    ability:{ name:'Technicien', desc:'Attaques de puissance 10 ou moins : dégâts x1,5.', technician:{ max:10, mult:1.5 } },
    moves:[
      { name:'Poing Balle', type:'acier', kind:'melee', power:8, cooldown:.55,
        anim:'Attack', hits:[3], effect:'punch', rushTime:.06, range:170 },
      { name:'Plaie-Croix', type:'insecte', kind:'boomerang', power:15, cooldown:2.2,
        range:250, speed:460, radius:13, anim:'Swing' },
      { name:'Danse-Lames', type:'normal', kind:'buff', power:0, cooldown:9,
        time:6, dmg:1.5, speed:1.15, anim:'Rotate', label:'ATTAQUE +50 % !' }
    ]
  },

  gardevoir: {
    name:'Gardevoir', folder:'assets/pokemon/gardevoir', types:['psy', 'fee'], hp:100, speed:170,
    ability:{ name:'Synchro', desc:'Quand elle subit un statut, l\'adversaire subit le même.', synchro:true },
    moves:[
      { name:'Pouvoir Lunaire', type:'fee', kind:'meteor', power:16, cooldown:1.8,
        speed:240, radius:10, life:1.1, split:6, splitShare:.3, color:'#ffc8ec', look:'moon', anim:'Appeal' },
      { name:'Reflet Magik', type:'psy', kind:'shield', power:0, cooldown:7,
        time:1.3, radius:34, reflect:true, anim:'Charge' },
      { name:'Choc Psy', type:'psy', kind:'beam', power:24, cooldown:3.4,
        width:16, length:460, delay:.28, anim:'Appeal' }
    ]
  }
});

// Descriptions affichées dans l'éditeur d'équipe
Object.assign(MOVE_DESC, {
  'Ball\'Ombre':'Boule spectrale qui suit un peu la cible ; peut rendre confus.',
  'Ombre Portée':'Plonge dans l\'ombre et réapparaît DERRIÈRE la cible pour frapper.',
  'Pics Toxik':'Lance 3 pics au sol (4 si chargé) : qui marche dessus est empoisonné.',
  'Choc Mental':'Onde psychique ondulante, très rapide à relancer.',
  'Téléport':'Se téléporte où tu vises (appui simple : esquive). Prochaine attaque +30 %.',
  'Psyko':'Implosion psychique retardée à l\'endroit visé ; peut rendre confus.',
  'Draco-Griffe':'Griffes draconiques rapides.',
  'Tunnel':'Creuse sous terre (intouchable), file vers le point visé puis surgit en zone.',
  'Draco-Météore':'Pluie de 5 météores autour du point visé (7 si chargé). Ralentit le lanceur.',
  'Mâchouille':'Morsure puissante au contact.',
  'Lame de Roc':'4 pics de roche jaillissent en ligne droite (6 si chargé).',
  'Vibrobscur':'Onde de ténèbres en arc qui repousse la cible.',
  'Poing Balle':'Coup de poing d\'acier ultra-rapide (boosté par Technicien).',
  'Plaie-Croix':'Lame en croix qui part puis REVIENT : peut toucher deux fois.',
  'Danse-Lames':'Danse guerrière : attaques +50 % et vitesse +15 % pendant 6 s.',
  'Pouvoir Lunaire':'Boule de lune qui éclate en 6 éclats d\'étoiles.',
  'Reflet Magik':'Bulle psychique 1,3 s : bloque tout et RENVOIE les projectiles.',
  'Choc Psy':'Rayon psychique après une courte charge : vise bien !',
  'Hydrocanon':'Jet d\'eau continu et puissant qui suit la cible en se courbant. Tortank est presque immobile pendant le jet.'
});
Object.assign(KIND_LABEL, { blink:'Téléportation', burrow:'Souterrain', shield:'Protection', trap:'Piège', buff:'Bonus', boomerang:'Boomerang', pulse:'Onde', stream:'Jet continu' });
