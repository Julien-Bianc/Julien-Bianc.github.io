// ============================================================
//  DESCRIPTIONS DES ATTAQUES + petits réglages sur les Pokémon existants (sans toucher à data/pokemon*.js).
//  - MOVE_DESC : texte affiché dans l'éditeur d'équipe (clé = nom exact de l'attaque). Si une attaque n'a pas
//    de description ici, le jeu en génère une automatiquement à partir de son type d'attaque.
//    Tu peux aussi écrire `desc:'…'` directement dans l'attaque (data/pokemon.js) : il est prioritaire.
//  - color : couleur des projectiles d'une attaque (champ `color` d'une attaque de kind 'fan').
// ============================================================
const MOVE_DESC = {
  'Furie-Griffe':'Fonce sur la cible et la griffe 3 fois d\'affilée.',
  'Vent Glace':'Rafale de 7 éclats de givre en éventail qui ralentit.',
  'Tranche-Nuit':'Coup tranchant puissant, critiques fréquents. À charger.',
  'Griffe Dragon':'Charge rapide avec un coup de griffe dévastateur.',
  'Vol':'S\'envole (intouchable), suit la cible puis plonge en zone.',
  'Surchauffe':'Déluge de 13 flammes qui brûle, mais ralentit le lanceur.',
  'Vive-Attaque':'Charge éclair qui protège un instant après le coup.',
  'Souplesse':'Coup de queue puissant qui repousse la cible.',
  'Damoclès':'Charge titanesque, très puissante, avec contrecoup.',
  'Pistolet à O':'Trois jets d\'eau rapides en éventail serré.',
  'Surf':'Grande vague perforante qui ralentit ceux qu\'elle touche.',
  'Hydrocanon':'Énorme bulle qui explose en 8 jets à l\'impact.',
  "Tranch'Herbe":'Cinq feuilles tranchantes lancées en éventail.',
  'Bomb Beurk':'Lance une flaque toxique à viser : blesse et empoisonne.',
  'Lance-Soleil':'Rayon instantané en ligne droite, très puissant si chargé.',
  'Éclair':'Éclair très rapide, cadence de tir élevée.',
  'Tonnerre':'Marque le sol : la foudre frappe 0,8 s plus tard (3 zones si chargé).',
  'Électacle':'Charge électrique qui paralyse, avec contrecoup.',
  'Aurasphère':'Sphère d\'aura bleue à tête chercheuse, difficile à esquiver.',
  'Close Combat':'Assaut rapproché puissant, avec contrecoup.',
  'Luminocanon':'Rayon d\'acier instantané en ligne droite.'
};
if(typeof POKEMON !== 'undefined' && POKEMON.lucario) POKEMON.lucario.moves[0].color = '#4aa8ff';   // Aurasphère : sphère bleue

const KIND_LABEL = { melee:'Contact', fan:'Éventail', fly:'Plongeon', pool:'Zone', tide:'Vague', meteor:'Explosion', bolt:'Tir rapide', strike:'Foudre', beam:'Rayon', wave:'Ondulation', spore:'Nuée', drain:'Vol de PV', leaf:'Projectile', shot:'Projectile', flame:'Flammes' };
function moveDesc(m){
  if(m.desc) return m.desc; if(MOVE_DESC[m.name]) return MOVE_DESC[m.name];
  const k = m.kind;
  if(k === 'melee') return 'Charge au corps à corps' + (m.knockback ? ', repousse' : '') + (m.recoil ? ', avec contrecoup' : '') + '.';
  if(k === 'fan') return 'Éventail de ' + (m.count || 5) + ' projectile(s)' + (m.home ? ' à tête chercheuse' : '') + '.';
  if(k === 'fly') return 'Plongeon en zone après un vol.';
  if(k === 'pool') return 'Flaque persistante qui blesse.';
  return KIND_LABEL[k] ? KIND_LABEL[k] + ' (attaque spéciale).' : 'Attaque spéciale.';
}

// v0.07 : chances de statut des attaques (par LANCER, répartie sur les projectiles)
if(typeof POKEMON !== 'undefined'){
  if(POKEMON.farfuret) POKEMON.farfuret.moves[1].status = { kind:'slow', chance:.2 };      // Vent Glace : ralentit
  if(POKEMON.dracaufeu) POKEMON.dracaufeu.moves[2].status = { kind:'burn', chance:.35 };   // Surchauffe : brûle
  if(POKEMON.raichu) POKEMON.raichu.moves[2].status = { kind:'par', chance:.3 };           // Électacle : paralyse
}
