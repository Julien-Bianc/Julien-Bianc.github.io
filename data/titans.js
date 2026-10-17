// ============================================================
//  CAISSE DES TITANS — 2e caisse du Magasin (débloquée après le chapitre 1 du Solo)
//  Contenu : les cartes des 7 Pokémon du chapitre 2, une NOUVELLE série d'objets tenus et de Capsules Ball
//  (champ set:'titans' : ils n'apparaissent QUE dans cette caisse), des lots de Balls du Safari,
//  la carte LÉGENDAIRE d'Ectoplasma et, en secret, le Shiny Swapper et le Ticket Doré.
//  Les effets des objets et des capsules sont codés dans js/titans.js.
//  Équilibrage : bonus faibles, comme ceux de la 1re caisse (v0.18).
// ============================================================
const TITANS = ['rondoudou', 'ectoplasma', 'alakazam', 'gardevoir', 'cizayox', 'carchacrok', 'tyranocif'];

// ---------- objets tenus (série « titans ») ----------
[
  // communs
  { id:'poudre-claire',  name:'Poudre Claire',   r:'C',  img:'bright-powder', desc:'4 % de chance d\'esquiver une attaque à distance.', fx:{ dodge:.04 } },
  { id:'grosse-racine',  name:'Grosse Racine',   r:'C',  img:'big-root',      desc:'Tous les soins reçus (baies, Restes, drains…) +15 %.', fx:{ healBoost:.15 } },
  { id:'boue-noire',     name:'Boue Noire',      r:'C',  img:'black-sludge',  desc:'Type Poison : regagne 0,4 % PV/s. Les autres types perdent 0,3 % PV/s !', fx:{ sludge:{ heal:.004, hurt:.003 } } },
  // peu communs
  { id:'ballon',         name:'Ballon',          r:'PC', img:'air-balloon',   desc:'Immunisé aux attaques Sol… jusqu\'au premier coup reçu (le ballon éclate).', fx:{ balloon:true } },
  { id:'herbe-blanche',  name:'Herbe Blanche',   r:'PC', img:'white-herb',    desc:'Une fois par combat : guérit la paralysie, le ralentissement ou la brûlure.', fx:{ cure:['par', 'burn'] } },
  { id:'bandeau-muscle', name:'Bandeau Muscle',  r:'PC', img:'muscle-band',   desc:'Attaques au contact +8 %.', fx:{ contact:1.08 } },
  { id:'lunettes-sages', name:'Lunettes Sages',  r:'PC', img:'wise-glasses',  desc:'Attaques à distance +8 %.', fx:{ ranged:1.08 } },
  // rares
  { id:'veste-combat',   name:'Veste de Combat', r:'R',  img:'assault-vest',  desc:'Dégâts des attaques à distance reçues −12 %, mais vitesse −5 %.', fx:{ vest:.88, speed:.95 } },
  { id:'roche-royale',   name:'Roche Royale',    r:'R',  img:'kings-rock',    desc:'6 % de chance d\'apeurer l\'adversaire quand tu le touches : son attaque en préparation est annulée.', fx:{ flinch:.06 } },
  { id:'lentilscope',    name:'Lentilscope',     r:'R',  img:'scope-lens',    desc:'Coups critiques plus fréquents (+5 %).', fx:{ crit:.05 } },
  { id:'bracelet-macho', name:'Bracelet Macho',  r:'R',  img:'macho-brace',   desc:'Dégâts +12 %, mais vitesse −10 %.', fx:{ dmg:1.12, speed:.9 } }
].forEach(h => { h.set = 'titans'; HELD.push(h); HELD_BY_ID[h.id] = h; });

// ---------- Capsules Ball (série « titans ») — effets : CAP_FX dans js/titans.js ----------
[
  { id:'cap-melodie',    name:'Capsule Mélodie',          r:'C',  fx:'melodie',    col:'#ffb0e0', sym:'note',    desc:'Des notes de musique s\'envolent en chantant (comme une Berceuse).' },
  { id:'cap-petales',    name:'Capsule Pétales',          r:'C',  fx:'petales',    col:'#ff9ad0', sym:'petal',   desc:'Une pluie de pétales roses tourbillonne autour du Pokémon.' },
  { id:'cap-spectre',    name:'Capsule Spectre',          r:'PC', fx:'spectre',    col:'#a070ff', sym:'hand',    desc:'Des mains spectrales surgissent du sol pour accueillir le Pokémon.' },
  { id:'cap-sable',      name:'Capsule Tempête de Sable', r:'PC', fx:'sable',      col:'#e8c070', sym:'sand',    desc:'Une tornade de sable et de pierres se lève, puis retombe.' },
  { id:'cap-lames',      name:'Capsule Danse-Lames',      r:'PC', fx:'lames',      col:'#dfe8f8', sym:'blade',   desc:'Des lames d\'acier tournoient puis se plantent en cercle.' },
  { id:'cap-cosmos',     name:'Capsule Faille Cosmique',  r:'R',  fx:'cosmos',     col:'#9ad0ff', sym:'galaxy',  desc:'Une faille s\'ouvre sur l\'espace : galaxie, étoiles et cuillères qui lévitent.' },
  { id:'cap-seisme',     name:'Capsule Séisme',           r:'R',  fx:'seisme',     col:'#d89a50', sym:'quake',   desc:'Le sol se fissure, des rochers jaillissent et l\'écran tremble.' },
  { id:'cap-distorsion', name:'Capsule Distorsion',       r:'UR', fx:'distorsion', col:'#7a5aff', sym:'distort', desc:'Le Monde Distorsion s\'ouvre : l\'arène se tord, des plateformes flottent et des ombres rampent.' },
  { id:'cap-eclipse',    name:'Capsule Éclipse',          r:'UR', fx:'eclipse',    col:'#ffe8a0', sym:'eclipse', desc:'Le ciel devient noir : une éclipse totale entourée d\'une couronne de lumière.' }
].forEach(c => { c.set = 'titans'; CAPSULES.push(c); CAPSULE_BY_ID[c.id] = c; });

// ---------- objet secret : Ticket Doré ----------
SPECIAL.push({ id:'ticket-dore', name:'Ticket Doré', r:'S', img:'ticket-dore', use:'golden',
  desc:'Un ticket en or massif… Utilise-le pour que MEWTWO rejoigne ton équipe : il devient jouable pour toujours !' });
SPECIAL_BY_ID['ticket-dore'] = SPECIAL[SPECIAL.length - 1];

// ---------- carte légendaire : Ectoplasma « Manoir hanté » (décor dans js/titans.js) ----------
LEGEND_CARDS.push({ poke:'ectoplasma', theme:'manoir' });

// ---------- la caisse ----------
CRATES.push({ id:'titans', name:'Caisse des Titans', desc:'Les Pokémon du chapitre 2, une nouvelle série d\'objets et de capsules', price:150,
  unlock:'chapter1',                                                     // verrouillée tant que le chapitre 1 du Solo n'est pas terminé
  look:'titans',                                                         // apparence dans le Magasin (js/titans.js)
  slots:[
    { r:'C',  label:'Carte commune',              cards:TITANS },
    { r:'C',  label:'Objet tenu commun',          held:'titans' },
    { r:'C',  label:'Capsule Ball commune',       caps:'titans' },
    { r:'C',  label:'Poké Ball',                  balls:{ id:'ball:poke',  n:1 } },
    { r:'PC', label:'Carte peu commune',          cards:TITANS },
    { r:'PC', label:'Objet tenu peu commun',      held:'titans' },
    { r:'PC', label:'Capsule Ball peu commune',   caps:'titans' },
    { r:'PC', label:'Super Ball',                 balls:{ id:'ball:super', n:1 } },
    { r:'R',  label:'Carte rare',                 cards:TITANS },
    { r:'R',  label:'Objet tenu rare',            held:'titans' },
    { r:'R',  label:'Capsule Ball rare',          caps:'titans' },
    { r:'R',  label:'Hyper Ball',                 balls:{ id:'ball:hyper', n:1 } },
    { r:'UR', label:'Capsule Ball ultra rare',    caps:'titans' },
    { r:'UR', label:'Carte LÉGENDAIRE',           legend:['ectoplasma'] },
    { r:'S',  label:'???',                        items:['shiny-swapper', 'ticket-dore'], hidden:true }
  ] });
CRATE.titans = CRATES[CRATES.length - 1];
SHOP.push({ id:'titans', type:'crate', crate:'titans', label:'Caisse des Titans', desc:'Cartes du chapitre 2, nouveaux objets et capsules' });
