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

const CRATES = [
  { id:'caisse1', name:'Caisse de l\'Arène', desc:'Ta première caisse', price:0, items:[
    // 5 bleus (communs)
    { id:'c1-c1',  name:'Objet bleu 1',   r:'C',  icon:'gem'    },
    { id:'c1-c2',  name:'Objet bleu 2',   r:'C',  icon:'orb'    },
    { id:'c1-c3',  name:'Objet bleu 3',   r:'C',  icon:'star'   },
    { id:'c1-c4',  name:'Objet bleu 4',   r:'C',  icon:'shield' },
    { id:'c1-c5',  name:'Objet bleu 5',   r:'C',  icon:'flask'  },
    // 3 violets (peu communs)
    { id:'c1-pc1', name:'Objet violet 1', r:'PC', icon:'gem'    },
    { id:'c1-pc2', name:'Objet violet 2', r:'PC', icon:'star'   },
    { id:'c1-pc3', name:'Objet violet 3', r:'PC', icon:'shield' },
    // 2 roses (rares)
    { id:'c1-r1',  name:'Objet rose 1',   r:'R',  icon:'orb'    },
    { id:'c1-r2',  name:'Objet rose 2',   r:'R',  icon:'flask'  },
    // 1 rouge (ultra rare)
    { id:'c1-ur1', name:'Objet rouge 1',  r:'UR', icon:'star'   }
  ] }
];

const SHOP = [
  { id:'caisse1', type:'crate', crate:'caisse1', label:'Caisse de l\'Arène', desc:'Ouvre-la pour gagner un objet' }
];

// ---------- accès pratiques ----------
const CRATE = Object.fromEntries(CRATES.map(c => [c.id, c]));
const ITEM = {};
CRATES.forEach(c => c.items.forEach(it => { it.crate = c.id; ITEM[it.id] = it; }));
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
