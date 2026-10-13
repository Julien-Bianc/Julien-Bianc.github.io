// ============================================================
//  MAGASIN — raretés, cartes, caisses. Tout est piloté par les données.
//
//  Rareté (RARITY, de la plus rare à la plus commune) :
//    odds = probabilité de tirer cette rareté (1/50 = 2 %). La dernière (odds:null) prend « le reste ».
//    Si une caisse ne contient rien d'une rareté, sa chance passe à la rareté juste en dessous.
//
//  Cartes : chaque Pokémon du jeu a une carte par rareté de CARD_RARITIES (visibles dans Inventaire → Classeur).
//
//  Caisse (CRATES) : { id, name, desc, price, slots:[…] }
//    Ouverture : on tire une rareté, puis un EMPLACEMENT (slot) de cette rareté, puis un objet au hasard dans cet emplacement.
//    Un emplacement : { r, label, w?, …contenu }   w = poids (1 par défaut) : w:2 = 2 fois plus de chances que ses voisins
//      cards:['farfuret', …]   → une carte de rareté r d'un de ces Pokémon (cards:'all' = tous les Pokémon)
//      held:true               → un objet tenu de rareté r (data/items.js)
//      items:['restes', …]     → un objet précis parmi cette liste
//    → Nouvel emplacement : une ligne dans slots. Nouvelle caisse : une entrée dans CRATES + une dans SHOP.
// ============================================================
const RARITY = [
  { id:'UR', label:'Ultra rare', col:'#eb4b4b', odds:1/50 },
  { id:'R',  label:'Rare',       col:'#d32ce6', odds:1/20 },
  { id:'PC', label:'Peu commun', col:'#8847ff', odds:1/6  },
  { id:'C',  label:'Commun',     col:'#4b69ff', odds:null }
];
const RAR = Object.fromEntries(RARITY.map(r => [r.id, r]));
const CARD_RARITIES = ['C', 'PC', 'R'];

// Les 7 Pokémon du « grand départ »
const STARTERS = ['farfuret', 'dracaufeu', 'tortank', 'florizarre', 'lucario', 'raichu', 'fouinar'];

const CRATES = [
  { id:'depart', name:'Caisse du grand départ', desc:'Cartes des 7 Pokémon de départ et objets tenus', price:100,
    slots:[
      { r:'C',  label:'Carte commune',          cards:STARTERS },
      { r:'C',  label:'Objet tenu commun',      held:true },
      // { r:'C',  label:'Commun 3 — à définir' },
      // { r:'C',  label:'Commun 4 — à définir' },
      // { r:'C',  label:'Commun 5 — à définir' },
      { r:'PC', label:'Carte peu commune',      cards:STARTERS },
      { r:'PC', label:'Objet tenu peu commun',  held:true },
      // { r:'PC', label:'Peu commun 3 — à définir' },
      { r:'R',  label:'Carte rare',             cards:STARTERS },
      { r:'R',  label:'Objet tenu rare',        held:true }
    ] }
];

const SHOP = [
  { id:'depart', type:'crate', crate:'depart', label:'Caisse du grand départ', desc:'Cartes de départ et objets tenus' }
];

// ---------- accès pratiques ----------
const CRATE = Object.fromEntries(CRATES.map(c => [c.id, c]));
const ITEM = {};
// (Re)construit le catalogue : une carte par Pokémon (ORDER) et par rareté + les objets tenus, puis le contenu de chaque emplacement.
function shopBuild(){
  const key = ORDER.join(',');
  if(shopBuild.key === key) return; shopBuild.key = key;
  for(const k in ITEM) delete ITEM[k];
  ORDER.forEach(pid => CARD_RARITIES.forEach(r => {
    ITEM[`card:${pid}:${r}`] = { id:`card:${pid}:${r}`, kind:'card', poke:pid, name:'Carte ' + (NAME[pid] || pid), r, crates:[] };
  }));
  HELD.forEach(h => { ITEM[h.id] = { ...h, kind:'held', crates:[] }; });
  CRATES.forEach(c => c.slots.forEach(s => {
    let pool = [];
    if(s.cards) pool = (s.cards === 'all' ? ORDER : s.cards.filter(pid => ORDER.includes(pid))).map(pid => ITEM[`card:${pid}:${s.r}`]);
    else if(s.held) pool = HELD.filter(h => h.r === s.r).map(h => ITEM[h.id]);
    else if(s.items) pool = s.items.map(id => ITEM[id]);
    s.pool = pool.filter(Boolean);
    s.pool.forEach(it => { if(!it.crates.includes(c.id)) it.crates.push(c.id); });
  }));
}
const RANK = { C:0, PC:1, R:2, UR:3 };                                       // pour trier
const byRarity = (a, b) => RANK[b.r] - RANK[a.r];

// Pourcentage théorique de chaque rareté (UR 2 %, R 5 %, PC ≈16,7 %, C = le reste)
function rarityPct(id){
  let used = 0;
  for(const r of RARITY){ const p = r.odds == null ? 1 - used : r.odds; if(r.id === id) return p; used += p; }
  return 0;
}
// Chances RÉELLES d'une caisse : une rareté absente donne sa chance à la rareté juste en dessous (sinon au-dessus)
function crateOdds(c){
  shopBuild();
  const has = r => c.slots.some(s => s.r === r && s.pool.length), out = {};
  RARITY.forEach(r => out[r.id] = 0);
  RARITY.forEach((r, i) => {
    let j = i; while(j < RARITY.length && !has(RARITY[j].id)) j++;
    if(j >= RARITY.length){ j = i; while(j >= 0 && !has(RARITY[j].id)) j--; }
    if(j >= 0) out[RARITY[j].id] += rarityPct(r.id);
  });
  return out;
}
// Chance d'un emplacement précis
function slotPct(c, s){
  const same = c.slots.filter(x => x.r === s.r && x.pool.length), tw = same.reduce((a, x) => a + (x.w || 1), 0);
  return s.pool.length ? crateOdds(c)[s.r]*(s.w || 1)/tw : 0;
}
// Tirage : rareté → emplacement → objet
function rollItem(c){
  shopBuild();
  const odds = crateOdds(c), pick = a => a[Math.floor(Math.random()*a.length)];
  let x = Math.random(), r = 'C';
  for(const R of RARITY){ if(x < odds[R.id]){ r = R.id; break; } x -= odds[R.id]; }
  const slots = c.slots.filter(s => s.r === r && s.pool.length);
  if(!slots.length) return pick(c.slots.find(s => s.pool.length).pool);
  let y = Math.random()*slots.reduce((a, s) => a + (s.w || 1), 0), slot = slots[0];
  for(const s of slots){ y -= s.w || 1; if(y < 0){ slot = s; break; } }
  return pick(slot.pool);
}
