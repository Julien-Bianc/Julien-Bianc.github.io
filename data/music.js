// ============================================================
//  data/music.js — Musiques du jeu (v0.20 : plusieurs morceaux par situation + une musique par mode).
//  Mets tes fichiers (.mp3 ou .ogg, ~128 kbps) dans assets/music/ avec EXACTEMENT les noms ci-dessous.
//
//  • Une ligne peut contenir UN fichier ou une LISTE [ ... ] : un morceau est tiré au hasard à chaque combat.
//  • Un fichier absent est simplement sauté : le jeu passe au suivant, puis à la situation plus générale
//    (ex. un raid essaie 'raid:tyranocif' → 'raid' → 'boss' → 'battle'), et en dernier recours la petite musique générée.
//    → Tu peux donc ajouter les fichiers petit à petit : rien ne casse s'il en manque.
//  • Clés spéciales possibles (à ajouter si tu veux) :
//      'battle:niveau12'      un niveau Solo précis (niveau 1 à 20)
//      'battle:chapitre2'     tous les niveaux d'un chapitre
//      'boss:mewtwo'          un boss précis (aussi 'boss:<id>' pour tout Pokémon boss)
//      'raid:tyranocif'       le raid d'un Pokémon précis
//      'safari:titans'        une zone de Safari (ou 'safari:<id du Pokémon>')
// ============================================================
const MUSIC = {
  // ----- menus -----
  menu:            'assets/music/menu.mp3',             // menu principal (ex. Treasure Town)
  'menu:mewtwo':   'assets/music/menu-mewtwo.mp3',      // écran « Défi : Mewtwo »
  'menu:raid':     'assets/music/menu-raid.mp3',        // écrans des raids (salon, choix d'équipe)
  'menu:contest':  'assets/music/menu-concours.mp3',    // écrans du Concours Pokémon
  pension:        'assets/music/pension.mp3',          // Pension Pokémon (sans fichier : une petite mélodie est générée)
  'menu:tower':   'assets/music/menu-tower.mp3',       // écran de la Tour de Combat (record, classement, entre les étages)
  tower:          'assets/music/tower.mp3',            // combats de la Tour (sans fichier : musique de combat normale)
  // ----- combats -----
  battle:  [ 'assets/music/battle.mp3', 'assets/music/battle2.mp3', 'assets/music/battle3.mp3' ],   // combats Solo (au hasard)
  'battle:chapitre2': [ 'assets/music/battle-ch2.mp3' ],                                         // chapitre 2 « L'Éveil des Titans »
  boss:    [ 'assets/music/boss.mp3', 'assets/music/boss2.mp3' ],                                 // arrivée d'un boss
  'boss:mewtwo':  'assets/music/boss-mewtwo.mp3',      // combat contre Mewtwo (Défi et niveau 10)
  raid:    [ 'assets/music/raid.mp3', 'assets/music/raid2.mp3' ],                                 // combats de raid
  safari:  'assets/music/safari.mp3',                   // Safari
  online:  'assets/music/online.mp3',                   // combats en ligne
  training:'assets/music/training.mp3',                 // Entraînement
  // ----- fin de combat (facultatif : sinon un petit jingle généré est joué) -----
  // victory: 'assets/music/victory.mp3',
  // defeat:  'assets/music/defeat.mp3',
};
