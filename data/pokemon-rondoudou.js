// ============================================================
//  RONDOUDOU (Normal / Fée) — chanteur : sa BERCEUSE endort l'adversaire (recharge très longue).
//  ⚠ Sprites à télécharger sur https://sprites.pmdcollab.org/#/0039 et à décompresser dans assets/pokemon/rondoudou/
//  Tant que le dossier est absent, Rondoudou est simplement ignoré (avertissement dans le menu).
//
//  Nouveau type d'attaque 'song' : chant en cône devant le lanceur (range, half = demi-angle en radians, delay),
//  applique un statut (ici le sommeil) à l'adversaire pris dans le cône. À viser !
// ============================================================
Object.assign(MOVE_DESC, {
  'Roulade':'Roule sur la cible sur une longue distance, rapide et peu coûteuse.',
  'Éclat Magique':'Gerbe de 9 éclats féeriques en large éventail.',
  'Berceuse':'Chant en cône qui ENDORT l\'adversaire (à viser, recharge très longue).'
});
Object.assign(POKEMON, {
  rondoudou: {
    name:'Rondoudou', folder:'assets/pokemon/rondoudou', types:['normal', 'fee'], hp:150, speed:140,
    ability:{ name:'Joli Sourire', desc:'Touché au contact : 20 % de rendre l\'attaquant confus',
              onHit:{ melee:true, status:{ kind:'confuse', chance:.2 } } },
    moves:[
      { name:'Roulade', type:'normal', kind:'melee', power:12, cooldown:1.6,
        anim:'Rotate', effect:'impact', rushTime:.12, range:280 },
      { name:'Éclat Magique', type:'fee', kind:'fan', power:14, share:.4, cooldown:3,
        speed:300, count:9, spread:.12, jitter:.03, life:.55, radius:5, anim:'Shoot', color:'#ff9ad8' },
      { name:'Berceuse', type:'normal', kind:'song', power:0, cooldown:9,
        range:230, half:.6, delay:.5, status:{ kind:'sleep', chance:.9 }, anim:'Shoot' }
    ]
  }
});
