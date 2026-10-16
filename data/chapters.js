// ============================================================
//  MODE SOLO EN CHAPITRES (v0.17) — 10 niveaux par chapitre.
//    pool  : les SEULS Pokémon que tu peux affronter dans ce chapitre
//    stages: noms des 10 niveaux (les réglages de difficulté sont générés plus bas, de plus en plus durs)
//  Solo 3v3 et Solo 6v6 sont deux modes séparés : chacun a sa propre progression (3 ou 6 adversaires par niveau).
//  Un chapitre se débloque quand le précédent est terminé (dans le même mode).
//  → Nouveau chapitre : une entrée de plus dans CHAPTERS (+ ses 10 niveaux générés automatiquement).
// ============================================================
// (v0.18) nombre d'adversaires imposé pour certains niveaux (n° du niveau dans tout le Solo, 0 = niveau 1). Les autres : 3 ou 6.
const SOLO_COUNT = { 0:1, 1:2 };
const CHAPTERS = [
  { id:'depart', name:'Le Grand Départ', desc:'Les 7 Pokémon du grand départ… et un clone légendaire t\'attend au niveau 10.',
    pool:['farfuret', 'dracaufeu', 'tortank', 'florizarre', 'lucario', 'raichu', 'fouinar'],
    // (v0.19) équipes FIXES de l'ordinateur, niveau par niveau (de plus en plus fortes) : teams3 en Solo 3v3, teams6 en Solo 6v6.
    //   Les doublons sont permis. Le boss (Mewtwo) est écrit directement dans la liste du niveau 10.
    teams3:[
             ['fouinar'],
             ['fouinar', 'farfuret'],
             ['fouinar', 'farfuret', 'raichu'],
             ['farfuret', 'raichu', 'fouinar'],
             ['raichu', 'farfuret', 'lucario'],
             ['lucario', 'raichu', 'florizarre'],
             ['florizarre', 'lucario', 'tortank'],
             ['tortank', 'florizarre', 'lucario'],
             ['lucario', 'tortank', 'dracaufeu'],
             ['tortank', 'dracaufeu', 'mewtwo']],
    teams6:[
             ['fouinar'],
             ['fouinar', 'farfuret'],
             ['fouinar', 'farfuret', 'fouinar', 'raichu', 'farfuret', 'raichu'],
             ['farfuret', 'fouinar', 'raichu', 'farfuret', 'lucario', 'raichu'],
             ['raichu', 'farfuret', 'lucario', 'fouinar', 'raichu', 'florizarre'],
             ['lucario', 'raichu', 'florizarre', 'farfuret', 'lucario', 'tortank'],
             ['florizarre', 'lucario', 'tortank', 'raichu', 'florizarre', 'dracaufeu'],
             ['tortank', 'florizarre', 'lucario', 'dracaufeu', 'raichu', 'tortank'],
             ['lucario', 'tortank', 'florizarre', 'dracaufeu', 'farfuret', 'dracaufeu'],
             ['florizarre', 'lucario', 'tortank', 'raichu', 'dracaufeu', 'mewtwo']] },                  // niveaux 1 à 10 (data/stages.js)
  { id:'titans', name:'L\'Éveil des Titans', desc:'Des Pokémon jamais vus sortent de l\'ombre…',
    pool:['rondoudou', 'ectoplasma', 'alakazam', 'gardevoir', 'cizayox', 'carchacrok', 'tyranocif'],
    teams3:[
             ['rondoudou', 'alakazam', 'gardevoir'],
             ['alakazam', 'rondoudou', 'ectoplasma'],
             ['gardevoir', 'alakazam', 'rondoudou'],
             ['cizayox', 'gardevoir', 'alakazam'],
             ['ectoplasma', 'carchacrok', 'cizayox'],
             ['ectoplasma', 'tyranocif', 'gardevoir'],
             ['gardevoir', 'ectoplasma', 'alakazam'],
             ['alakazam', 'cizayox', 'gardevoir'],
             ['cizayox', 'tyranocif', 'carchacrok'],
             ['ectoplasma', 'tyranocif', 'carchacrok']],
    teams6:[
             ['rondoudou', 'alakazam', 'rondoudou', 'gardevoir', 'alakazam', 'rondoudou'],
             ['alakazam', 'rondoudou', 'ectoplasma', 'gardevoir', 'alakazam', 'ectoplasma'],
             ['gardevoir', 'rondoudou', 'alakazam', 'gardevoir', 'ectoplasma', 'rondoudou'],
             ['cizayox', 'gardevoir', 'alakazam', 'cizayox', 'ectoplasma', 'tyranocif'],
             ['ectoplasma', 'carchacrok', 'cizayox', 'alakazam', 'gardevoir', 'carchacrok'],
             ['ectoplasma', 'tyranocif', 'gardevoir', 'cizayox', 'alakazam', 'tyranocif'],
             ['gardevoir', 'ectoplasma', 'alakazam', 'ectoplasma', 'cizayox', 'gardevoir'],
             ['alakazam', 'gardevoir', 'cizayox', 'ectoplasma', 'carchacrok', 'alakazam'],
             ['cizayox', 'tyranocif', 'carchacrok', 'ectoplasma', 'tyranocif', 'carchacrok'],
             ['gardevoir', 'ectoplasma', 'cizayox', 'tyranocif', 'carchacrok', 'tyranocif']],
    stages:['Forêt hantée', 'Temple psychique', 'Jardin féerique', 'Forteresse d\'acier', 'Canyon du dragon',
            'Montagne sombre', 'Gouffre spectral', 'Sanctuaire mental', 'Volcan des titans', 'Sommet des maîtres'],
    // décors : 0 prairie, 1 grotte, 2 désert, 3 banquise, 4 lave, 5 ruines (les cartes sauvages et le Stade du Raid sont ajoutés dans js/solo-chapters.js)
    arenas:[5, 1, 'herbes', 3, 'montagne', 4, 5, 1, 'volcan', 'raid'],
    win:  [150, 165, 180, 200, 220, 240, 260, 285, 310, 360],        // gain d'une victoire (pour 3 adversaires)
    first:[320, 340, 360, 390, 420, 450, 480, 520, 560, 900] }       // bonus du premier passage
];
// (v0.17.2) Mewtwo est le boss du niveau 10 (fin du chapitre 1), plus du niveau 9.
//   Pour donner un boss à un autre niveau : boss:{ 9:'mewtwo' } dans le chapitre voulu (0 = 1er niveau du chapitre)
delete STAGE_BOSS[8]; STAGE_BOSS[9] = 'mewtwo';
