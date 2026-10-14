// ============================================================
//  OBJETS SPÉCIAUX + CARTES LÉGENDAIRES (magasin)
//
//  Rareté SECRÈTE (or) : 1 chance sur 200. Son contenu n'est JAMAIS montré avant d'être obtenu
//  (dans l'aperçu de la caisse : « ??? »). Ouverture encore plus spectaculaire que l'ultra rare.
//
//  SPECIAL : objets qui ne s'équipent pas (rangés dans Inventaire → Objets)
//    { id, name, r, img (assets/items/), desc, use }
//    use : 'shiny' → s'utilise sur un de tes Pokémon pour le rendre shiny (js/shiny.js) ; absent = rien à faire (pour l'instant)
//
//  LEGEND_CARDS : cartes LÉGENDAIRES (rareté rouge / ultra rare), animées et zoomables (js/legend-card.js)
//    { poke, theme }   theme = décor animé de la carte (voir LEGEND_THEMES dans js/legend-card.js)
//    → id de la carte : card:<poke>:L
// ============================================================
const SPECIAL = [
  { id:'shiny-swapper', name:'Shiny Swapper', r:'S', img:'shiny-swapper', use:'shiny',
    desc:'Un charme scintillant. Utilise-le sur un de tes Pokémon : il devient SHINY pour toujours (couleurs chromatiques et éclat à son entrée en combat).' },
  { id:'oeuf-mystere', name:'Œuf Mystère', r:'S', img:'oeuf-mystere',
    desc:'Un œuf de Pokémon… Il est chaud, et quelque chose bouge à l\'intérieur. Personne ne sait encore ce qu\'il en sortira.' }
];
const SPECIAL_BY_ID = Object.fromEntries(SPECIAL.map(s => [s.id, s]));

const LEGEND_CARDS = [
  { poke:'dracaufeu', theme:'volcan' }
];
