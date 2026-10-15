// ============================================================
//  ÉQUILIBRAGE (v0.14) — difficulté générale, récompenses. Modifie les nombres à ta guise.
// ============================================================
// Difficulté par mode (multiplie les réglages des niveaux : data/stages.js, data/safari.js, data/boss-defi.js)
//   dmg  : dégâts des ennemis (1.6 = +60 %)       hp   : PV des ennemis
//   rate : délai entre leurs attaques (plus petit = plus agressif)
//   tele : durée du signal avant leurs attaques (plus petit = plus dur à esquiver)    aim : précision (0..1, ajouté)
const DIFFICULTY = {
  solo:   { dmg:1.6,  hp:1.2,  rate:.85, tele:.9,  aim:.15 },
  safari: { dmg:1.75, hp:1.1,  rate:.75, tele:.82, aim:.3 },
  boss:   { dmg:1.7,  hp:1.35, rate:.8,  tele:.85, aim:.2 }      // Défi : Mewtwo (les 3 difficultés)
};
// Invulnérabilité du joueur après un coup reçu (secondes). Avant : 0,6 s → on encaissait trop peu de coups.
const PLAYER_IFRAMES = .35;
// Plus d'immunité de type : une attaque qui n'avait « aucun effet » fait maintenant ce multiplicateur (peu efficace)
const IMMUNITY_MULT = .5;
// Ajustements d'attaques : { pokémon : { 'Nom de l'attaque' : { champ:valeur } } }
const MOVE_TWEAKS = {
  raichu:{ 'Éclair':{ cooldown:.5 } },                           // avant 0,22 s : trop facile à spammer
  dracaufeu:{ 'Vol':{ cooldown:5 } }                             // avant 3,6 s : trop d'esquives en l'air
};
// Attaques « Vol » (s'envole puis plonge) : pour limiter les esquives
//   invulnAbove : invulnérable seulement quand il est plus haut que cette part de la hauteur max (0.55 = 55 %)
//   lockAfter   : secondes sans pouvoir esquiver juste après l'atterrissage
const FLY_RULES = { invulnAbove:.55, lockAfter:1 };

// Solo : nombre MINIMUM d'adversaires (même si ton équipe n'a que 1 ou 2 Pokémon)
const SOLO_MIN_ENEMIES = 3;
// Solo : en cas de DÉFAITE, tu gagnes quand même cette part du gain par Pokémon adverse battu (0.5 = la moitié)
const SOLO_DEFEAT_SHARE = .5;

// Collection : récompense quand tu as les 3 cartes (commune, peu commune, rare) d'un même Pokémon — une fois par Pokémon
const CARD_SET_REWARD = 100;
// Cadeau de bienvenue : tickets Safari offerts (une seule fois)
const FREE_TICKETS = 1;

// v0.17 : vitesse de déplacement des ennemis (multiplie les réglages des niveaux) — plus lent = plus facile à viser
//         (sauf combats en ligne et Entraînement)
const ENEMY_SPEED = .68;
