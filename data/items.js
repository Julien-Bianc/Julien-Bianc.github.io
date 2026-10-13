// ============================================================
//  OBJETS TENUS (comme dans les jeux Pokémon) — trouvés dans les caisses, équipés dans l'éditeur d'équipe.
//  Plus l'objet est fort, plus il est rare : C (commun) < PC (peu commun) < R (rare) < UR (ultra rare).
//
//  Un objet : { id, name, r, img, desc, fx:{…} }
//    img : nom du fichier dans assets/items/ (sans .png). Sprites : projet « pokesprite » (msikma, licence MIT).
//    fx  : effet en combat (traité dans js/held-items.js). Effets disponibles :
//      type:'feu', mult:1.2       attaques de ce type x mult
//      superEff:1.2               attaques super efficaces x1,2                      (Ceinture Pro)
//      crit:.0625                 chance de critique en plus (1/16 de plus → 1/8)    (Griffe Rasoir)
//      heal:{ below:.5, amount:.25 }  1 fois par combat : soigne `amount` des PV max sous `below` PV  (baies)
//      cure:['burn']              1 fois par combat : soigne ces statuts (burn, psn, frz, par, slp, cnf, ou 'any')
//      drainHit:.125              rend 1/8 des dégâts infligés                          (Grelot Coque)
//      endure:.1                  10 % de chance de survivre avec 1 PV à un coup fatal  (Bandeau)
//      sash:true                  à PV max, survit 1 fois avec 1 PV à un coup fatal     (Ceinture Force)
//      helmet:.08                 qui le frappe au contact perd 8 % de ses PV max       (Casque Brut)
//      regen:.008                 regagne 0,8 % des PV max par seconde                  (Restes)
//      dmg:1.3, recoil:.05        dégâts x1,3, perd 5 % PV max quand il touche          (Orbe Vie)
//      choice:true (+ dmg ou speed)  bloqué sur la 1re attaque utilisée jusqu'à la relève (Choix)
//      speed:1.3                  vitesse de déplacement x1,3
//  → Pour ajouter un objet : une ligne ici + son image dans assets/items/. Il apparaît tout seul dans les caisses
//    qui contiennent « un objet tenu » de sa rareté.
// ============================================================
const HELD = [
  // ---------- COMMUNS : objets de type (+20 %) et baies ----------
  { id:'charbon',      name:'Charbon',         r:'C', img:'charcoal',       desc:'Attaques Feu +20 %.',      fx:{ type:'feu',      mult:1.2 } },
  { id:'eau-mystique', name:'Eau Mystique',    r:'C', img:'mystic-water',   desc:'Attaques Eau +20 %.',      fx:{ type:'eau',      mult:1.2 } },
  { id:'grain-miracle',name:'Grain Miracle',   r:'C', img:'miracle-seed',   desc:'Attaques Plante +20 %.',   fx:{ type:'plante',   mult:1.2 } },
  { id:'aimant',       name:'Aimant',          r:'C', img:'magnet',         desc:'Attaques Électrik +20 %.', fx:{ type:'foudre',   mult:1.2 } },
  { id:'glace-eternelle', name:'Glace Éternelle', r:'C', img:'never-melt-ice', desc:'Attaques Glace +20 %.', fx:{ type:'glace',    mult:1.2 } },
  { id:'ceinture-noire', name:'Ceinture Noire', r:'C', img:'black-belt',    desc:'Attaques Combat +20 %.',   fx:{ type:'combat',   mult:1.2 } },
  { id:'pic-venin',    name:'Pic Venin',       r:'C', img:'poison-barb',    desc:'Attaques Poison +20 %.',   fx:{ type:'poison',   mult:1.2 } },
  { id:'sable-doux',   name:'Sable Doux',      r:'C', img:'soft-sand',      desc:'Attaques Sol +20 %.',      fx:{ type:'sol',      mult:1.2 } },
  { id:'bec-pointu',   name:'Bec Pointu',      r:'C', img:'sharp-beak',     desc:'Attaques Vol +20 %.',      fx:{ type:'vol',      mult:1.2 } },
  { id:'cuillere-tordue', name:'Cuillère Tordue', r:'C', img:'twisted-spoon', desc:'Attaques Psy +20 %.',     fx:{ type:'psy',      mult:1.2 } },
  { id:'poudre-argentee', name:'Poudre Argentée', r:'C', img:'silver-powder', desc:'Attaques Insecte +20 %.', fx:{ type:'insecte',  mult:1.2 } },
  { id:'pierre-dure',  name:'Pierre Dure',     r:'C', img:'hard-stone',     desc:'Attaques Roche +20 %.',    fx:{ type:'roche',    mult:1.2 } },
  { id:'rune-sort',    name:'Rune Sort',       r:'C', img:'spell-tag',      desc:'Attaques Spectre +20 %.',  fx:{ type:'spectre',  mult:1.2 } },
  { id:'croc-dragon',  name:'Croc Dragon',     r:'C', img:'dragon-fang',    desc:'Attaques Dragon +20 %.',   fx:{ type:'dragon',   mult:1.2 } },
  { id:'lunettes-noires', name:'Lunettes Noires', r:'C', img:'black-glasses', desc:'Attaques Ténèbres +20 %.', fx:{ type:'tenebres', mult:1.2 } },
  { id:'peau-metal',   name:'Peau Métal',      r:'C', img:'metal-coat',     desc:'Attaques Acier +20 %.',    fx:{ type:'acier',    mult:1.2 } },
  { id:'mouchoir-soie',name:'Mouchoir Soie',   r:'C', img:'silk-scarf',     desc:'Attaques Normal +20 %.',   fx:{ type:'normal',   mult:1.2 } },
  { id:'plaque-pixie', name:'Plaque Pixie',    r:'C', img:'pixie-plate',    desc:'Attaques Fée +20 %.',      fx:{ type:'fee',      mult:1.2 } },
  { id:'baie-oran',    name:'Baie Oran',       r:'C', img:'oran-berry',     desc:'Une fois par combat, sous 50 % PV : soigne 10 % des PV.', fx:{ heal:{ below:.5, amount:.10 } } },
  { id:'baie-fraive',  name:'Baie Fraive',     r:'C', img:'rawst-berry',    desc:'Une fois par combat : guérit la brûlure.',  fx:{ cure:['burn'] } },
  { id:'baie-pecha',   name:'Baie Pêcha',      r:'C', img:'pecha-berry',    desc:'Une fois par combat : guérit le poison.',   fx:{ cure:['psn'] } },
  { id:'baie-willia',  name:'Baie Willia',     r:'C', img:'aspear-berry',   desc:'Une fois par combat : dégèle.',             fx:{ cure:['frz'] } },
  { id:'baie-ceriz',   name:'Baie Ceriz',      r:'C', img:'cheri-berry',    desc:'Une fois par combat : guérit la paralysie et le ralentissement.', fx:{ cure:['par'] } },
  { id:'baie-maron',   name:'Baie Maron',      r:'C', img:'chesto-berry',   desc:'Une fois par combat : réveille.',           fx:{ cure:['slp'] } },
  { id:'baie-kika',    name:'Baie Kika',       r:'C', img:'persim-berry',   desc:'Une fois par combat : guérit la confusion.', fx:{ cure:['cnf'] } },

  // ---------- PEU COMMUNS ----------
  { id:'baie-sitrus',  name:'Baie Sitrus',     r:'PC', img:'sitrus-berry',  desc:'Une fois par combat, sous 50 % PV : soigne 25 % des PV.', fx:{ heal:{ below:.5, amount:.25 } } },
  { id:'baie-prine',   name:'Baie Prine',      r:'PC', img:'lum-berry',     desc:'Une fois par combat : guérit n\'importe quel statut.', fx:{ cure:['any'] } },
  { id:'ceinture-pro', name:'Ceinture Pro',    r:'PC', img:'expert-belt',   desc:'Attaques super efficaces +20 %.', fx:{ superEff:1.2 } },
  { id:'griffe-rasoir',name:'Griffe Rasoir',   r:'PC', img:'razor-claw',    desc:'Coups critiques 2 fois plus fréquents (1/8).', fx:{ crit:.0625 } },
  { id:'grelot-coque', name:'Grelot Coque',    r:'PC', img:'shell-bell',    desc:'Rend 1/8 des dégâts infligés en PV.', fx:{ drainHit:.125 } },
  { id:'bandeau',      name:'Bandeau',         r:'PC', img:'focus-band',    desc:'10 % de chance de tenir avec 1 PV face à un coup fatal.', fx:{ endure:.1 } },
  { id:'casque-brut',  name:'Casque Brut',     r:'PC', img:'rocky-helmet',  desc:'Qui le frappe au contact perd 8 % de ses PV max.', fx:{ helmet:.08 } },

  // ---------- RARES ----------
  { id:'restes',       name:'Restes',          r:'R', img:'leftovers',      desc:'Regagne un peu de PV en continu (0,8 % par seconde).', fx:{ regen:.008 } },
  { id:'orbe-vie',     name:'Orbe Vie',        r:'R', img:'life-orb',       desc:'Dégâts +30 %, mais perd 5 % de ses PV à chaque attaque qui touche.', fx:{ dmg:1.3, recoil:.05 } },
  { id:'bandeau-choix',name:'Bandeau Choix',   r:'R', img:'choice-band',    desc:'Dégâts +50 %, mais bloqué sur la première attaque utilisée jusqu\'à la relève.', fx:{ choice:true, dmg:1.5 } },
  { id:'mouchoir-choix', name:'Mouchoir Choix', r:'R', img:'choice-scarf',  desc:'Vitesse +30 %, mais bloqué sur la première attaque utilisée jusqu\'à la relève.', fx:{ choice:true, speed:1.3 } },
  { id:'ceinture-force', name:'Ceinture Force', r:'R', img:'focus-sash',    desc:'À PV max, survit une fois avec 1 PV à un coup fatal.', fx:{ sash:true } }
];
const HELD_BY_ID = Object.fromEntries(HELD.map(h => [h.id, h]));
const heldImg = h => 'assets/items/' + h.img + '.png';
