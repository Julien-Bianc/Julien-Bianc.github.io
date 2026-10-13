// ============================================================
//  MENU PRINCIPAL — liste des entrées. C'est ici que tu ajoutes de nouveaux modes.
//  Entrée : { id, label, desc, screen }   (screen = nom d'une fonction d'écran déclarée dans SCREENS, js/menu.js)
//  { soon:true } affiche le bouton grisé « Bientôt ».
//  Pour ajouter un mode : 1) ajoute une ligne ici  2) écris l'écran dans js/menu.js  3) SCREENS.monId = showMonEcran;
// ============================================================
const MAIN_MENU = [
  { id:'solo',    label:'Solo',          desc:'Défis de plus en plus durs',            screen:'solo'  },
  { id:'teams',   label:'Mes équipes',   desc:'Créer et modifier tes équipes (3v3 / 6v6)', screen:'teams' },
  { id:'training', label:'Entraînement', desc:'Teste tous les Pokémon sur une grande map', screen:'training' },
  { id:'shop',    label:'Magasin',       desc:'Caisses et objets',                     screen:'shop'      },
  { id:'inventory', label:'Inventaire', desc:'Les objets que tu possèdes',            screen:'inventory' },
  { id:'versus',  label:'Combat libre',  desc:'', soon:true },
  { id:'online',  label:'Multijoueur',   desc:'', soon:true },
  { id:'options', label:'Options',       desc:'Son, touches, plein écran', screen:'options' }
];
