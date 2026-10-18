// ============================================================
//  PENSION POKÉMON — données (js/pension.js = logique + écrans, js/pension-scene.js = le camp en plein écran)
//
//  Principe :
//    1. INCUBATION : on dépose l'« Œuf Mystère » (récupéré dans une caisse, rareté secrète) à la pension. Il éclot au bout
//       de PEN.hatchH heures de temps RÉEL (même quand le jeu est fermé). Il tremble de plus en plus en approchant de l'éclosion.
//    2. ÉLEVAGE : un Pokémon au hasard parmi les lignées ci-dessous en sort. Il faut s'en occuper : Faim, Bonheur, Énergie,
//       Propreté (0–100 %) baissent avec le temps. On le nourrit (baies à acheter), on joue (plume), on le caresse, on le lave, on le couche.
//    3. ÉVOLUTION : quand il a l'ÂGE et le BONHEUR demandés (PEN_LINES[..].evo), il évolue. Dernière forme = elle est débloquée
//       pour les combats (Owned.add) et la pension se libère.
//
//  Ajouter une lignée : une entrée dans PEN_FORMS (sprites) + une dans PEN_LINES (3 formes). La dernière forme doit aussi avoir
//  une fiche de combat (PEN_COMBAT plus bas) pour être jouable en combat.
//  Sprites PMDCollab (sprites.pmdcollab.org ou GitHub PMDCollab/SpriteCollab/sprite/<n°>) → dossier assets/pokemon/<id>/
// ============================================================
const PEN = {
  egg:'oeuf-mystere',          // objet de l'inventaire (data/secret.js)
  hatchH:.25,                  // éclosion : 0,25 h = 15 min (temps réel)
  warmMax:.25,                 // « Réchauffer » l'œuf peut raccourcir l'éclosion de 25 % au maximum
  speed:1,                     // × vitesse du temps (1 = temps réel ; mets 60 pour tout tester vite)
  maxOffline:18,               // heures d'absence prises en compte au maximum (au-delà, on ne punit pas plus)
  rate:{ hunger:14, joy:8, energy:10, clean:9 },     // baisse par heure (éveillé)
  sleepRate:28,                // énergie récupérée par heure de sommeil
  hour:null                    // (test) force l'heure du décor : 12 = plein jour, 23 = nuit ; null = heure réelle
};

// Formes (sprites) : id = nom du dossier dans assets/pokemon/
const PEN_FORMS = {
  minidraco:{ name:'Minidraco', dex:'0147' }, draco:{ name:'Draco', dex:'0148' },    dracolosse:{ name:'Dracolosse', dex:'0149', combat:true },
  ptitard:  { name:'Ptitard',   dex:'0060' }, tetarte:{ name:'Têtarte', dex:'0061' }, tartard:{ name:'Tartard', dex:'0062', combat:true },
  togepi:   { name:'Togepi',    dex:'0175' }, togetic:{ name:'Togetic', dex:'0176' },  togekiss:{ name:'Togekiss', dex:'0468', combat:true },
  azurill:  { name:'Azurill',   dex:'0298' }, marill: { name:'Marill',  dex:'0183' },  azumarill:{ name:'Azumarill', dex:'0184', combat:true }
};
Object.entries(PEN_FORMS).forEach(([id, f]) => f.folder = 'assets/pokemon/' + id);

// Lignées : 3 formes, conditions d'évolution (age = heures depuis l'éclosion, joy = bonheur minimum en %), baie préférée (+bonheur)
const PEN_LINES = [
  { id:'draco',   name:'Lignée Dragon', forms:['minidraco', 'draco', 'dracolosse'],  evo:[{ age:24, joy:60 }, { age:72, joy:75 }], fav:'sitrus' },
  { id:'ptitard', name:'Lignée Eau',    forms:['ptitard', 'tetarte', 'tartard'],     evo:[{ age:24, joy:60 }, { age:72, joy:75 }], fav:'oran'   },
  { id:'togepi',  name:'Lignée Fée',    forms:['togepi', 'togetic', 'togekiss'],     evo:[{ age:24, joy:60 }, { age:72, joy:75 }], fav:'pecha'  },
  { id:'azurill', name:'Lignée Aqua',   forms:['azurill', 'marill', 'azumarill'],    evo:[{ age:24, joy:60 }, { age:72, joy:75 }], fav:'persim' }
];
const PEN_LINE = Object.fromEntries(PEN_LINES.map(l => [l.id, l]));

// Nourriture (à acheter) : v = faim rendue, joy = bonheur en plus ; img = assets/items/<img>.png
const PEN_FOODS = [
  { id:'oran',   name:'Baie Oran',   v:22, price:12, img:'oran-berry'   },
  { id:'pecha',  name:'Baie Pêcha',  v:26, price:15, img:'pecha-berry'  },
  { id:'persim', name:'Baie Kaki',   v:28, price:18, img:'persim-berry' },
  { id:'rawst',  name:'Baie Fraive', v:30, price:20, img:'rawst-berry'  },
  { id:'sitrus', name:'Baie Sitrus', v:45, price:32, img:'sitrus-berry' },
  { id:'lum',    name:'Baie Lum',    v:70, price:60, img:'lum-berry', joy:6 }
];
const PEN_FOOD = Object.fromEntries(PEN_FOODS.map(f => [f.id, f]));

// Objets de confort (achat unique, effets permanents)
const PEN_COMFORT = [
  { id:'incubator', name:'Couveuse chauffante',    price:350, desc:'L\'œuf éclot 30 % plus vite.' },
  { id:'bed',       name:'Panier moelleux',        price:300, desc:'Le sommeil répare 60 % plus d\'énergie.' },
  { id:'bowl',      name:'Gamelle en porcelaine',  price:250, desc:'La faim baisse 25 % plus lentement.' },
  { id:'toys',      name:'Coffre à jouets',        price:350, desc:'Jeux et câlins : +30 % de bonheur.' },
  { id:'soap',      name:'Savon parfumé',          price:200, desc:'Toilette 2× plus efficace, saleté −20 %.' },
  { id:'plant',     name:'Jardinière fleurie',     price:400, desc:'Le bonheur baisse 25 % plus lentement.' }
];
const PEN_COMFORT_BY = Object.fromEntries(PEN_COMFORT.map(c => [c.id, c]));

// ------------------------------------------------------------
//  FORMES FINALES = fiches de COMBAT (même format que data/pokemon.js). Elles ne sont jouables qu'une fois obtenues à la pension.
//  Si leurs sprites ne sont pas dans assets/pokemon/, le jeu les ignore au démarrage (message « Ignorés » dans le menu).
// ------------------------------------------------------------
Object.assign(POKEMON, {
  dracolosse: {
    name:'Dracolosse', folder:'assets/pokemon/dracolosse', types:['dragon', 'vol'], hp:125, speed:170,
    ability:{ name:'Multiécaille', desc:'Sous 33 % PV : attaques Dragon x1,5',
              lowHp:{ below:.33, type:'dragon', mult:1.5, label:'MULTIÉCAILLE !' } },
    moves:[
      { name:'Dracogriffe', type:'dragon', kind:'melee', power:14, cooldown:1.3, anim:'Attack', hits:[5], effect:'dragon', rushTime:.16 },
      { name:'Ouragan', type:'vol', kind:'fan', power:11, share:.5, cooldown:1.2, speed:320, count:5, spread:.13, jitter:.04, life:1.1, anim:'Shoot' },
      { name:'Colère', type:'dragon', kind:'melee', power:30, cooldown:4.2, anim:'Charge', hits:[5], effect:'ram', rushTime:.22, recoil:.2, range:300 }
    ]
  },
  tartard: {
    name:'Tartard', folder:'assets/pokemon/tartard', types:['eau', 'combat'], hp:135, speed:150,
    ability:{ name:'Absorb Eau', desc:'Absorbe les attaques Eau (soigne 15 %)', absorb:{ type:'eau', heal:.15 } },
    moves:[
      { name:'Pistolet à O', type:'eau', kind:'fan', power:9, share:.5, cooldown:.8, speed:380, count:3, spread:.07, jitter:.03, life:.9, anim:'Shoot' },
      { name:'Cascade', type:'eau', kind:'melee', power:18, cooldown:2.4, anim:'Swing', hits:[5], effect:'slam', rushTime:.18, knockback:90 },
      { name:'Dynamopoing', type:'combat', kind:'melee', power:26, cooldown:3.4, anim:'Attack', hits:[5], effect:'impact', rushTime:.14, range:240, status:{ kind:'confuse', chance:.4 } }
    ]
  },
  togekiss: {
    name:'Togekiss', folder:'assets/pokemon/togekiss', types:['fee', 'vol'], hp:100, speed:190,
    ability:{ name:'Sérénité', desc:'1 fois sous 25 % PV : 1,2 s invulnérable + soin',
              lastStand:{ below:.25, invuln:1.2, heal:.12, label:'BÉNÉDICTION !' } },
    moves:[
      { name:'Éclat Magique', type:'fee', kind:'fan', power:8, share:.55, cooldown:1.3, speed:330, count:7, spread:.2, jitter:.05, life:1, anim:'Shoot' },
      { name:'Aéropique', type:'vol', kind:'fan', power:13, share:.7, cooldown:1.6, speed:380, count:3, spread:.06, jitter:.02, life:1, anim:'Shoot' },
      { name:'Vol', type:'vol', kind:'fly', power:22, cooldown:3.8, rise:.6, dive:.2, height:70, speed:330, radius:46 }
    ]
  },
  azumarill: {
    name:'Azumarill', folder:'assets/pokemon/azumarill', types:['eau', 'fee'], hp:130, speed:160,
    ability:{ name:'Coloforce', desc:'Sous 33 % PV : attaques Fée x1,5',
              lowHp:{ below:.33, type:'fee', mult:1.5, label:'COLOFORCE !' } },
    moves:[
      { name:'Aqua-Jet', type:'eau', kind:'melee', power:8, cooldown:.7, anim:'Strike', hits:[2], effect:'quick', rushTime:.07, invuln:.3 },
      { name:'Câlinerie', type:'fee', kind:'melee', power:20, cooldown:2.6, anim:'Attack', hits:[5], effect:'impact', rushTime:.16, knockback:80 },
      { name:'Bulles d\'O', type:'eau', kind:'fan', power:7, share:.5, cooldown:1.2, speed:300, count:5, spread:.1, jitter:.04, life:1.1, anim:'Shoot' }
    ]
  }
});
