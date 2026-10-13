// ============================================================
//  CAPSULES BALL — personnalisent l'arrivée d'un Pokémon dans l'arène (effet quand la Pokéball s'ouvre).
//  Purement visuelles : aucun effet sur le combat. Plus l'effet est impressionnant, plus la capsule est rare.
//  Une capsule s'équipe sur un Pokémon dans « Mes équipes » ; la même capsule peut servir à plusieurs Pokémon.
//
//  Une capsule : { id, name, r, fx, col, sym, desc }
//    fx  : nom de l'effet (dessiné dans js/capsules.js, objet CAP_FX)
//    col : couleur de la lumière de la Pokéball et de la matérialisation du Pokémon
//    sym : symbole de l'icône (star, bubble, leaf, cloud, confetti, flame, wave, bolt, snow, spiral, moon, dragon, sparkle, rainbow, crown)
//  → Nouvelle capsule : une ligne ici (avec un fx existant ou un nouveau fx dans js/capsules.js).
//    Elle entre toute seule dans les caisses qui contiennent « une capsule » de sa rareté.
// ============================================================
const CAPSULES = [
  // ---------- COMMUNES : petits effets ----------
  { id:'cap-etincelles', name:'Capsule Étincelles', r:'C', fx:'etincelles', col:'#fff2a0', sym:'star',     desc:'Une gerbe d\'étoiles dorées jaillit de la Pokéball.' },
  { id:'cap-bulles',     name:'Capsule Bulles',     r:'C', fx:'bulles',     col:'#9fdcff', sym:'bubble',   desc:'Des bulles montent du sol puis éclatent.' },
  { id:'cap-feuilles',   name:'Capsule Feuilles',   r:'C', fx:'feuilles',   col:'#9be86a', sym:'leaf',     desc:'Des feuilles tourbillonnent autour du Pokémon.' },
  { id:'cap-fumee',      name:'Capsule Fumée',      r:'C', fx:'fumee',      col:'#e0e0ea', sym:'cloud',    desc:'Un nuage de fumée, façon ninja.' },
  { id:'cap-confettis',  name:'Capsule Confettis',  r:'C', fx:'confettis',  col:'#ffffff', sym:'confetti', desc:'Une explosion de confettis multicolores.' },
  // ---------- PEU COMMUNES : effets élémentaires ----------
  { id:'cap-flammes',    name:'Capsule Flammes',    r:'PC', fx:'flammes',   col:'#ff8a3c', sym:'flame',    desc:'Un cercle de flammes s\'embrase autour du Pokémon.' },
  { id:'cap-vague',      name:'Capsule Vague',      r:'PC', fx:'vague',     col:'#5ab4ff', sym:'wave',     desc:'Une vague déferle en anneau et éclabousse tout autour.' },
  { id:'cap-eclair',     name:'Capsule Éclair',     r:'PC', fx:'eclair',    col:'#ffe24a', sym:'bolt',     desc:'Trois éclairs frappent le sol à l\'arrivée.' },
  { id:'cap-blizzard',   name:'Capsule Blizzard',   r:'PC', fx:'blizzard',  col:'#bfefff', sym:'snow',     desc:'Des pics de glace jaillissent du sol dans un tourbillon de neige.' },
  // ---------- RARES : effets spectaculaires ----------
  { id:'cap-psy',        name:'Capsule Psy',        r:'R', fx:'psy',        col:'#ff8ad8', sym:'spiral',   desc:'Ondes psychiques et orbes en orbite autour du Pokémon.' },
  { id:'cap-tenebres',   name:'Capsule Ténèbres',   r:'R', fx:'tenebres',   col:'#b07aff', sym:'moon',     desc:'Un vortex obscur s\'ouvre sous le Pokémon.' },
  { id:'cap-dragon',     name:'Capsule Dragon',     r:'R', fx:'dragon',     col:'#8fa0ff', sym:'dragon',   desc:'Deux rubans d\'énergie draconique s\'enroulent puis explosent.' },
  { id:'cap-brillant',   name:'Capsule Brillant',   r:'R', fx:'brillant',   col:'#ffffff', sym:'sparkle',  desc:'L\'éclat d\'un Pokémon chromatique, comme dans les jeux.' },
  // ---------- ULTRA RARES : entrée légendaire ----------
  { id:'cap-arcenciel',  name:'Capsule Arc-en-ciel', r:'UR', fx:'arcenciel', col:'#ffffff', sym:'rainbow', desc:'Un pilier de lumière arc-en-ciel descend du ciel, onde de choc prismatique.' },
  { id:'cap-legende',    name:'Capsule Légendaire', r:'UR', fx:'legende',   col:'#ffd860', sym:'crown',    desc:'Cercle runique doré, pilier de lumière, couronne d\'éclairs et onde de choc.' }
];
const CAPSULE_BY_ID = Object.fromEntries(CAPSULES.map(c => [c.id, c]));
