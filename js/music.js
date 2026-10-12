// ============================================================
//  data/music.js — Musiques du jeu (une ligne = une situation).
//  Mets tes fichiers (.mp3 ou .ogg, ~128 kbps) dans assets/music/.
//  Si un fichier est absent, le jeu joue la petite musique générée à la place.
//  Clé 'battle:<id du niveau/arène>' possible pour une musique propre à un niveau (sinon 'battle').
// ============================================================
const MUSIC = {
  menu:    'assets/music/menu.mp3',      // ex. Treasure Town
  battle:  'assets/music/battle.mp3',    // combat standard
  boss:    'assets/music/boss.mp3'       // combat de boss
  // victory: 'assets/music/victory.mp3', // facultatif : sinon un petit jingle généré est joué
  // defeat:  'assets/music/defeat.mp3',
  // 'battle:prairie': 'assets/music/hidden-land.mp3',
};