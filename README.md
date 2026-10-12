# Arène des Créatures (jeu horizontal, temps réel)

## Lancer le jeu
1. Ouvre le dossier `arene-pokemon` dans **VS Code**.
2. Installe l'extension **Live Server** (VS Code te la propose automatiquement).
3. Clic droit sur `index.html` → **Open with Live Server**.
   (Un double-clic sur index.html ne marche pas : le navigateur bloque la lecture des sprites.)
4. Sur téléphone : ouvre l'adresse affichée par Live Server (même Wi-Fi), ex. `http://192.168.x.x:5500`.

## Ajouter un nouveau Pokémon (3 étapes)
1. Va sur https://sprites.pmdcollab.org, choisis le Pokémon puis télécharge son **zip de sprites**.
2. Décompresse-le dans `assets/pokemon/<nom>/` (ex. `assets/pokemon/tortank/`).
   Le dossier doit contenir `AnimData.xml` et les `*-Anim.png` / `*-Shadow.png`.
3. Dans `data/pokemon.js`, copie une entrée existante, change l'identifiant, le nom, le `folder`,
   les types, les PV, la vitesse et les 3 attaques. Sauvegarde : le Pokémon apparaît dans le menu.

Pour choisir les animations d'attaque : `node tools/inspect-pokemon.js assets/pokemon/<nom>`
affiche les animations disponibles (Attack, Strike, Swing, Shoot…) et l'image de frappe (`hit`).
Seule `Idle-Anim.png` est obligatoire : si une animation manque, le jeu utilise Hurt/Idle à la place.

### Les 3 types d'attaque (`kind`)
| kind | Effet | Champs utiles |
|---|---|---|
| `melee` | charge vers la cible et frappe | `anim`, `hits` (images de frappe), `effect` (claws, slash, dragon, quick, slam, ram, impact), `rushTime`, `range`, `crit`, `knockback`, `recoil`, `invuln` |
| `fan` | éventail de projectiles | `count`, `spread`, `jitter`, `speed`, `life`, `radius`, `anim`, `status` (`{kind:'burn'|'slow'|'par', chance}`), `exhaust`, `share` |
| `fly` | s'envole (invulnérable), suit la cible puis plonge | `rise`, `dive`, `height`, `speed`, `radius` |

Champs communs : `name`, `type`, `kind`, `power`, `cooldown`. Maintenir un bouton charge l'attaque.

### Capacités (`ability`)
- `critBonus: .2` → +20 % de chance de critique (sur les attaques avec `crit`)
- `lowHp: {below:.33, type:'feu', mult:1.5}` → sous 33 % PV, attaques de ce type x1,5
- `lastStand: {below:.25, invuln:1.2, heal:.1}` → 1 fois par combat, invulnérable + soin
Une nouvelle capacité = un nouveau champ dans `ability` + son traitement dans `js/pokemon-abilities.js`.

## Où modifier quoi
| Je veux… | Fichier |
|---|---|
| Ajouter / modifier un Pokémon, ses stats, ses attaques, sa capacité | `data/pokemon.js` |
| Corriger le tableau des types ou les couleurs de types | `data/types.js` |
| Créer un nouveau **type d'attaque** (kind) | `js/pokemon-moves.js` + `js/pokemon-register.js` |
| Créer une nouvelle **capacité** | `js/pokemon-abilities.js` |
| Changer les animations utilisées (marche, esquive, vol…) | `js/pokemon-render.js` (ou `anims:{…}` dans data/pokemon.js) |
| Modifier / ajouter les arènes, rochers | `js/arena.js` (+ `data/stages.js` pour les affecter aux niveaux) |
| Caméra, taille du monde / de l'écran | `js/camera.js`, `js/config.js` (W,H = monde ; VW,VH = écran) |
| Règles de combat, dégâts, IA ennemie, statuts | `js/combat.js` |
| Niveaux solo (nombre, difficulté, arène, noms) | `data/stages.js` |
| Entrées du menu principal (ajouter un mode) | `data/menu.js` + `js/menu.js` (écran) + `js/modes.js` (logique du mode) |
| Équipes sauvegardées / progression | `js/save.js` (stockées dans le navigateur) |
| Visée (glisser depuis un bouton, tir assisté/précis) | `js/aim.js`, `js/input.js` |
| Effets visuels (impacts, projectiles, particules) | `js/gfx.js` |
| HUD, menu, dessin d'une image | `js/render.js`, `js/menu.js` |
| Boutons, joystick, clavier | `js/input.js`, `index.html`, `css/style.css` |
| Taille de l'arène (640x360), constantes | `js/config.js` + attributs du `<canvas>` dans `index.html` |
| Créatures d'origine dessinées par code (Pyrex, Aquor…) | `js/rig-monsters.js`, `js/config.js` |

## Clavier (test sur ordinateur)
WASD/flèches = bouger · J K L = attaques (maintenir pour charger) · Espace = esquive · Q = relève.

## Remarque sur les sprites
Les sprites PMDCollab sont des assets Pokémon (Nintendo / Game Freak / Spike Chunsoft) : parfait
pour un prototype perso, mais à ne pas publier tels quels (stores, site public).

## Équipes, solo et menu
- **Équipes** : 3 Pokémon (3v3) ou 6 Pokémon (6v6), sans doublon. Écran « Mes équipes » → créer, modifier, supprimer.
  Elles sont enregistrées dans le navigateur (`localStorage`). Deux équipes de départ sont créées automatiquement.
- **Solo** : 10 niveaux de plus en plus durs (`data/stages.js`). Tu affrontes une équipe de même taille que la tienne ;
  le dernier adversaire est un boss. Le niveau suivant se débloque après une victoire (progression séparée en 3v3 et 6v6).
  La difficulté règle : PV ennemis, dégâts, vitesse, vitesse des projectiles, cadence d'attaque, lisibilité du signal d'attaque,
  et la capacité de l'ennemi à anticiper tes déplacements (`aim`).
- **Menu principal** : liste dans `data/menu.js`. Une entrée avec `soon:true` s'affiche grisée « Bientôt ».
  Ajouter un mode : (1) une ligne dans `data/menu.js`, (2) un écran dans `js/menu.js` enregistré dans `SCREENS`,
  (3) une fonction de lancement dans `js/modes.js` qui appelle `start({ team, enemies, stage, … })`.

## Visée (facile à jouer, difficile à maîtriser)
- **Simple appui** sur A / B / C : tir assisté, il part vers la position ACTUELLE de l'ennemi (il rate si l'ennemi bouge).
- **Glisser le doigt depuis le bouton puis relâcher** : tir précis dans la direction choisie, **+25 % de dégâts**.
  La longueur du glissé règle la portée des attaques à zone (Tonnerre, Vol…).
- Les charges (`melee`) avancent dans la direction visée : si la cible n'est pas sur la trajectoire, le coup part dans le vide.
- Sur ordinateur : la souris vise, puis J / K / L tirent vers le curseur.

## Types : ce qui est appliqué
- Chaque Pokémon a 1 ou 2 types (`types`), chaque attaque a son propre type (`type`) : Dracaufeu (Feu/Vol) lance Vol (type Vol),
  Griffe Dragon (Dragon) et Surchauffe (Feu).
- Les dégâts utilisent le type de l'ATTAQUE contre les types du DÉFENSEUR (double type = multiplication, x0,25 à x4),
  plus un bonus de x1,3 quand le type de l'attaque est un type du lanceur (STAB).
- L'affichage suit : pastilles de type dans le HUD et le menu, couleur et libellé du type sur chaque bouton d'attaque,
  couleur des impacts = type de l'attaque.
- Les 4 créatures d'origine (Pyrex, Aquor, Floria, Voltus) sont mono-type avec des attaques de leur type.

## Roster actuel (7 Pokémon) — sprites à télécharger
Les 4 créatures d'origine ont été remplacées par de vrais Pokémon, définis dans `data/pokemon-more.js`.
Les sprites ne sont pas fournis : pour chacun, télécharge le zip sur https://sprites.pmdcollab.org
(recherche par nom, bouton de téléchargement des sprites) et décompresse-le dans le dossier indiqué.
Tu peux aussi les prendre sur GitHub : dépôt **PMDCollab/SpriteCollab**, dossier `sprite/<numéro>` (AnimData.xml + PNG).

| Pokémon | N° | Dossier à créer | Types |
|---|---|---|---|
| Tortank | 009 | `assets/pokemon/tortank/` | Eau |
| Florizarre | 003 | `assets/pokemon/florizarre/` | Plante / Poison |
| Raichu | 026 | `assets/pokemon/raichu/` | Électrik |
| Lucario | 448 | `assets/pokemon/lucario/` | Combat / Acier |

Tant qu'un dossier manque, ce Pokémon est ignoré (⚠ affiché dans le menu) : le jeu tourne avec les autres.
Il faut au moins 6 Pokémon chargés pour créer des équipes 6v6. Les équipes sauvegardées sont réparées automatiquement.

### Attaques (types corrects, mécaniques originales)
- **Tortank** (Eau) : Pistolet à O (3 jets), Surf (vague perforante qui ralentit), Hydrocanon (bulle qui explose en 8 jets). Capacité Torrent.
- **Florizarre** (Plante/Poison) : Tranch'Herbe (éventail de 5 feuilles), **Bomb Beurk** (flaque toxique à viser, empoisonne), Lance-Soleil (rayon instantané, à charger). Capacité Engrais.
- **Raichu** (Électrik) : Éclair (très rapide), Tonnerre (zones de foudre retardées à viser), Électacle (charge qui paralyse, avec contrecoup). Capacité Paratonnerre (absorbe l'Électrik).
- **Lucario** (Combat/Acier) : Aurasphère (sphère à tête chercheuse), Close Combat (charge avec contrecoup), Luminocanon (rayon d'acier). Capacité Impassible (+35 % de vitesse quand il est touché).

## Arènes et caméra
- Le monde fait 1280x720, l'écran 640x360 : la caméra suit un point entre toi et l'ennemi, et une flèche rouge indique l'ennemi hors écran.
- 6 arènes en pixel art (`js/arena.js`) : prairie, grotte cristalline, désert, banquise, cratère de lave, ruines. Le décor est dessiné en
  demi-résolution puis agrandi x2, comme les sprites. Les niveaux solo les utilisent dans `data/stages.js` (`STAGE_ARENAS`).
- Chaque arène a 13 emplacements de rochers destructibles (`ROCK_LAYOUT`) et des effets d'ambiance (braises, étincelles, poussière).

## Plein écran, options, effets (v4)
- **Plein écran** : bouton ⛶ (bas de l'écran), touche F, ou Options. Sur Android le jeu se verrouille en paysage.
  Pour un plein écran « comme une appli » (aussi sur iPhone) : ouvre le jeu en **https** (ou localhost) et choisis
  « Ajouter à l'écran d'accueil » : `manifest.json` + `sw.js` s'occupent du reste.
- **Options** (menu principal ou pause) : volume général / effets / musique, secousses d'écran, plein écran automatique,
  et **toutes les touches du clavier** modifiables. Sons et musique sont générés par le navigateur (`js/audio.js`).
- **Équipes** : de 1 à 3 Pokémon (3v3) ou de 1 à 6 (6v6). Tu affrontes autant d'adversaires que tu as de Pokémon
  (le dernier est un boss à partir de 3 adversaires).
- **Animations** : Pokéball pour la relève (rappel puis envoi), l'entrée après un K.O. et l'arrivée de chaque ennemi
  (`js/pokeball.js`) ; message K.O. avec ralenti, zoom et recul de caméra (`js/vfx.js`).
- **Effets par type** : feu (flammes et braises), glace (givre, éclats, neige), eau (gouttes), foudre (arcs), plante (feuilles),
  poison (bulles), dragon, ténèbres, acier, vol, combat… dans `js/vfx.js` (fonctions `trail`, `hitFx2`, cast).

| Je veux… | Fichier |
|---|---|
| Changer les sons / la musique | `js/audio.js` |
| Changer les réglages par défaut, les touches par défaut | `js/settings.js` |
| Modifier l'écran Options | `js/options.js` |
| Changer l'apparence d'un type d'attaque, le K.O., les chocs | `js/vfx.js` |
| Changer l'animation de Pokéball | `js/pokeball.js` |

## v0.05 — entraînement, lisibilité, critiques, K.O. définitif
- **Entraînement** (menu principal) : choisis ton Pokémon et un mannequin sur un terrain quadrillé. Dans la pause : change de Pokémon,
  mannequin immobile / mobile / qui se bat, invincibilité, recharge instantanée. Code : `js/training.js`.
- **Lisibilité** : secousses réduites par défaut (35 %), réglables dans Options. Aperçu au sol des attaques pendant la charge ou la visée
  (cône, ligne, zone ; plus marqué quand tu vises) : `js/aim.js`.
- **Critiques** : 1 chance sur 16 pour tous les Pokémon, x1,5 (`CRIT` dans `js/rules.js`).
- **K.O. définitif** : un Pokémon K.O. ne revient jamais ; brûlure, poison et contrecoup peuvent achever. L'esquive annule la charge.
- **Équipe** : l'éditeur affiche PV, vitesse, capacité et les 3 attaques avec description (`data/pokemon-tweaks.js` → `MOVE_DESC`,
  ou champ `desc` dans l'attaque).
- **Écrans 2K/4K** : Options → taille des menus et de l'ATH (Auto par défaut).
- **Aurasphère** : projectile bleu (champ `color` d'une attaque de kind 'fan').
- **Sécurité** : si le jeu rencontre une erreur, il se met en pause et affiche un rapport à copier au lieu de se figer.
