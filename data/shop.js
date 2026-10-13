// ============================================================
//  MAGASIN — raretés, caisses, objets. Tout est piloté par les données.
//
//  Rareté (RARITY, de la plus rare à la plus commune) :
//    odds = probabilité de tirage sur UN tirage (1/50 = 2 %). La dernière (odds:null) prend « le reste ».
//
//  Caisse (CRATES) : { id, name, desc, price, items:[...] }
//    price : 0 = gratuit (la monnaie n'existe pas encore : un prix > 0 est affiché « Bientôt »)
//    items : { id, name, r (rareté), icon (forme de ICON_SHAPES), desc? }
//    → Pour ajouter un objet : une ligne dans items. Pour une nouvelle caisse : une entrée dans CRATES + une dans SHOP.
//
//  Magasin (SHOP) : une entrée = une offre affichée dans l'écran Magasin.
// ============================================================
const RARITY = [
  { id:'UR', label:'Ultra rare', col:'#eb4b4b', odds:1/50 },
  { id:'R',  label:'Rare',       col:'#d32ce6', odds:1/20 },
  { id:'PC', label:'Peu commun', col:'#8847ff', odds:1/6  },
  { id:'C',  label:'Commun',     col:'#4b69ff', odds:null }
];
const RAR = Object.fromEntries(RARITY.map(r => [r.id, r]));

// Formes des icônes provisoires (# = pixel). Contour sombre et ombrage 3 tons ajoutés automatiquement.
const ICON_SHAPES = {
  gem:    ['....######....', '...########...', '..##########..', '.############.', '##############', '.############.', '..##########..', '...########...', '....######....', '.....####.....', '......##......'],
  orb:    ['....####....', '..########..', '.##########.', '.##########.', '############', '############', '############', '############', '.##########.', '.##########.', '..########..', '....####....'],
  star:   ['......#......', '......#......', '.....###.....', '.....###.....', '#############', '.###########.', '..#########..', '...#######...', '...#######...', '..####.####..', '..###...###..', '.##.......##.'],
  shield: ['############', '############', '############', '############', '############', '############', '.##########.', '.##########.', '..########..', '...######...', '....####....', '.....##.....'],
  flask:  ['....####....', '....####....', '.....##.....', '.....##.....', '....####....', '...######...', '..########..', '.##########.', '.##########.', '.##########.', '..########..', '...######...']
};
const SHAPE_ORDER = Object.keys(ICON_SHAPES);

// Une caisse : name, desc, price, items (objets fixes), cards (raretés pour lesquelles on crée UNE carte par Pokémon du jeu).
//   → un nouveau Pokémon dans data/pokemon*.js obtient automatiquement ses cartes dans les caisses.
const CRATES = [
  { id:'caisse1', name:'Caisse de l\'Arène', desc:'Ta première caisse', price:0,
    cards:['C', 'PC', 'R'],              // cartes Pokémon : commune, peu commune, rare
    items:[
      { id:'c1-ur1', name:'Objet rouge 1', r:'UR', icon:'star' }     // ultra rare : provisoire, à remplacer plus tard
    ] }
];

const SHOP = [
  { id:'caisse1', type:'crate', crate:'caisse1', label:'Caisse de l\'Arène', desc:'Ouvre-la pour gagner un objet' }
];

// ---------- accès pratiques ----------
const CRATE = Object.fromEntries(CRATES.map(c => [c.id, c]));
const ITEM = {};
// (Re)construit les objets : objets fixes + une carte par Pokémon (ORDER) et par rareté de c.cards. À appeler avant d'utiliser ITEM.
function shopBuild(){
  const key = ORDER.join(',');
  if(shopBuild.key === key) return; shopBuild.key = key;
  for(const k in ITEM) delete ITEM[k];
  CRATES.forEach(c => {
    if(!c.base) c.base = c.items;
    const cards = [];
    (c.cards || []).forEach(r => ORDER.forEach(pid => cards.push({ id:`card:${pid}:${r}`, kind:'card', poke:pid, name:'Carte ' + (NAME[pid] || pid), r })));
    c.items = c.base.concat(cards);
    c.items.forEach(it => { it.crate = c.id; ITEM[it.id] = it; });
  });
}
const RANK = { C:0, PC:1, R:2, UR:3 };                                       // pour trier
const byRarity = (a, b) => RANK[b.r] - RANK[a.r];

// Pourcentage réel de chaque rareté (UR 2 %, R 5 %, PC ≈16,7 %, C = le reste)
function rarityPct(id){
  let used = 0;
  for(const r of RARITY){ const p = r.odds == null ? 1 - used : r.odds; if(r.id === id) return p; used += p; }
  return 0;
}
// Tire une rareté, puis un objet au hasard dans cette rareté (repli sur la rareté inférieure si la caisse n'en a pas)
function rollItem(crate){
  const x = Math.random(); let acc = 0, start = RARITY.length - 1;
  for(let i = 0; i < RARITY.length; i++){ if(RARITY[i].odds == null){ start = i; break; } acc += RARITY[i].odds; if(x < acc){ start = i; break; } }
  for(let i = start; i < RARITY.length; i++){ const pool = crate.items.filter(it => it.r === RARITY[i].id); if(pool.length) return pool[Math.floor(Math.random()*pool.length)]; }
  for(let i = start - 1; i >= 0; i--){ const pool = crate.items.filter(it => it.r === RARITY[i].id); if(pool.length) return pool[Math.floor(Math.random()*pool.length)]; }
  return crate.items[0];
}
