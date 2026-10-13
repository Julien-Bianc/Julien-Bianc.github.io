// ============================================================
//  ÉQUILIBRAGE (v0.12) — difficulté générale, récompenses. Modifie les nombres à ta guise.
// ============================================================
// Difficulté des combats Solo et Safari (multiplie les réglages des niveaux de data/stages.js / data/safari.js)
//   dmg  : dégâts des ennemis (1.3 = +30 %)     rate : délai entre leurs attaques (plus petit = plus agressif)
//   tele : durée du signal avant leurs attaques (plus petit = plus dur à esquiver)   aim : précision (0..1, ajouté)
const DIFFICULTY = {
  solo:   { dmg:1.3,  rate:.9,  tele:.92, aim:.1 },
  safari: { dmg:1.45, rate:.8,  tele:.85, aim:.25 }
};

// Solo : nombre MINIMUM d'adversaires (même si ton équipe n'a que 1 ou 2 Pokémon)
const SOLO_MIN_ENEMIES = 3;
// Solo : en cas de DÉFAITE, tu gagnes quand même cette part du gain par Pokémon adverse battu (0.5 = la moitié)
// (en victoire, le gain dépend déjà du nombre d'adversaires : 3 → gain normal, 6 → gain x2)
const SOLO_DEFEAT_SHARE = .5;

// Collection : récompense quand tu as les 3 cartes (commune, peu commune, rare) d'un même Pokémon — une fois par Pokémon
const CARD_SET_REWARD = 100;
