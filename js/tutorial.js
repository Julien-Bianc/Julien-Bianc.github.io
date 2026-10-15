// ============================================================
//  tutorial.js — TUTORIEL (v0.17) : captures du jeu (assets/tutorial/) + explications, page par page.
//    • S'ouvre tout seul la première fois (après le choix du premier Pokémon)
//    • Toujours disponible : menu principal → Tutoriel
//    • Glisser l'image (ou ◀ ▶, flèches du clavier) pour changer de page
//  → Ajouter une page : une ligne dans TUTO (image dans assets/tutorial/).
// ============================================================
const TUTO = [
  { img:'combat',  title:'Bienvenue dans l\'Arène !',  text:'Tes Pokémon se battent <b>en temps réel</b> contre ceux de l\'adversaire. En haut : les PV de ton Pokémon (à gauche) et de l\'adversaire (à droite), et les Pokéballs de chaque équipe. Mets tous les adversaires K.O. pour gagner !' },
  { img:'move',    title:'Se déplacer',               text:'Pose le pouce <b>n\'importe où sur la moitié gauche</b> de l\'écran : le joystick apparaît sous ton doigt. Bouge pour esquiver les attaques. Lâche : il disparaît.' },
  { img:'tap',     title:'Attaquer : appui bref',     text:'Touche un bouton d\'attaque (<b>A</b>, <b>B</b> ou <b>C</b>) et relâche aussitôt : l\'attaque part <b>toute seule vers l\'adversaire</b>. Chaque attaque a son temps de recharge, qui tourne autour du bouton.' },
  { img:'charge',  title:'Charger : appui long',      text:'Garde le doigt appuyé sans bouger : l\'attaque se <b>charge</b> (anneau autour de la base de ton Pokémon) et fait plus de dégâts. Relâche : elle part vers l\'adversaire.' },
  { img:'aim',     title:'Viser : faire glisser',     text:'Appuie sur un bouton puis <b>fais glisser</b> ton doigt : la zone de l\'attaque s\'affiche au sol dans cette direction. Relâche pour tirer. Viser toi-même donne <b>+25 % de dégâts</b>… si tu touches !' },
  { img:'cancel',  title:'Annuler une attaque',       text:'En visant, <b>reviens au centre du bouton</b> : le cercle devient rouge ✕ et la visée disparaît. Relâche : l\'attaque est <b>annulée</b>, sans perdre son temps de recharge.' },
  { img:'dodge',   title:'Esquiver',                  text:'Le bouton <b>»</b> fait une esquive rapide dans la direction du joystick : ton Pokémon est <b>invulnérable</b> un court instant. Parfait contre les gros coups… et les ondes de choc des raids.' },
  { img:'swap',    title:'Relève',                    text:'Le bouton <b>Relève</b> (avec le portrait du suivant) rappelle ton Pokémon et envoie le suivant. Un Pokémon <b>K.O.</b> ne revient plus du combat.' },
  { img:'types',   title:'Les types',                 text:'Chaque attaque a un type : <b>Eau</b> bat Feu, <b>Feu</b> bat Plante, <b>Plante</b> bat Eau… « <b>SUPER EFFICACE</b> » = dégâts doublés, « peu efficace » = moitié. Choisis bien qui envoyer !' },
  { img:'menu',    title:'Et maintenant ?',           text:'<b>Solo</b> : 2 chapitres de niveaux. <b>Safari</b> : capture de nouveaux Pokémon. <b>Combat Raid</b> : un Pokémon géant, seul ou à plusieurs. <b>Magasin</b> : caisses, cartes et objets. Ce tutoriel reste dans le menu.' }
];
function showTutorial(back, first, page){
  back = typeof back === 'function' ? back : showMain;
  let i = Math.max(0, Math.min(TUTO.length - 1, page || 0));
  const render = () => {
    const T = TUTO[i], last = i === TUTO.length - 1;
    menu(`<div class='tuto'>
      <div class='tuh'><h1>${first ? 'Comment jouer' : 'Tutoriel'}</h1><span class='tun'>${i + 1}/${TUTO.length}</span></div>
      <div class='tuv' id='tuv'><img src='assets/tutorial/${T.img}.jpg' alt='' draggable='false'>
        <button class='tua l' id='tup' ${i ? '' : 'disabled'}>◀</button><button class='tua r' id='tunx' ${last ? 'disabled' : ''}>▶</button></div>
      <div class='tut'><b>${T.title}</b><p>${T.text}</p></div>
      <div class='tud'>${TUTO.map((_, k) => `<i class='${k === i ? 'on' : ''}' data-tp='${k}'></i>`).join('')}</div>
      <div class='row'>${last ? `<button class='btn' id='tuok'>${first ? 'C\'est parti !' : 'Terminé'}</button>` : `<button class='btn' id='tugo'>Suivant</button><button class='btn2' id='tusk'>${first ? 'Passer' : 'Fermer'}</button>`}</div></div>`);
    const go = k => { i = Math.max(0, Math.min(TUTO.length - 1, k)); render(); };
    const b = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
    b('tup', () => go(i - 1)); b('tunx', () => go(i + 1)); b('tugo', () => go(i + 1)); b('tusk', back); b('tuok', back);
    bindAll('[data-tp]', el => go(+el.dataset.tp));
    // glisser l'image pour changer de page
    const v = document.getElementById('tuv'); let x0 = null;
    v.onpointerdown = e => { x0 = e.clientX; }; v.onpointerup = e => { if(x0 == null) return; let dx = e.clientX - x0; if(innerHeight > innerWidth) dx = 0; x0 = null; if(Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1)); };
    if(typeof playSfx === 'function' && typeof AU !== 'undefined' && AU.ctx) playSfx('click');
  };
  TUTO_KEYS = e => { if(!document.querySelector('#menu .tuto')) return; if(e.code === 'ArrowRight' && i < TUTO.length - 1){ i++; render(); } else if(e.code === 'ArrowLeft' && i > 0){ i--; render(); } };
  render();
}
let TUTO_KEYS = null;
addEventListener('keydown', e => { if(TUTO_KEYS) TUTO_KEYS(e); });
// menu principal : entrée « Tutoriel » (avant Options)
{ const i = MAIN_MENU.findIndex(m => m.id === 'options'); MAIN_MENU.splice(i >= 0 ? i : MAIN_MENU.length, 0, { id:'tuto', label:'Tutoriel', desc:'Comment jouer : attaquer, charger, viser, esquiver…', screen:'tuto' }); }
SCREENS.tuto = () => showTutorial(showMain, false);
// première fois : juste après le choix du premier Pokémon (ou au prochain passage au menu pour les anciennes sauvegardes)
const _mainTuto = showMain;
showMain = function(){
  const d = Save.load();
  if(typeof Owned !== 'undefined' && Owned.ready() && !d.tutoSeen){ d.tutoSeen = 1; Save.save(); G = null; return showTutorial(showMain, true); }
  _mainTuto();
};
document.head.insertAdjacentHTML('beforeend', `<style>
.tuto{display:grid;grid-template-columns:minmax(0,1.35fr) minmax(0,1fr);grid-template-rows:auto 1fr auto auto;gap:4px 12px;width:100%;max-width:820px;height:100%;align-items:center}
.tuh{grid-column:1/-1;display:flex;align-items:center;justify-content:center;gap:10px}.tun{font-size:11px;color:var(--txt2,#c9bcd8)}
.tuv{grid-row:2/5;position:relative;width:100%;aspect-ratio:640/296;border:2px solid var(--gold,#ffd23f);border-radius:10px;overflow:hidden;box-shadow:0 0 18px rgba(255,210,63,.25);touch-action:pan-y}
.tuv img{display:block;width:100%;height:100%;object-fit:contain;background:#0c0818;user-select:none;-webkit-user-drag:none;pointer-events:none}
.tua{position:absolute;top:50%;transform:translateY(-50%);width:30px;height:44px;border:0;border-radius:8px;background:rgba(10,8,24,.6);color:#ffe9a0;font-size:16px;cursor:pointer}
.tua.l{left:6px}.tua.r{right:6px}.tua:disabled{opacity:.2}
.tut{text-align:left;align-self:end}.tut b{color:#ffe9a0;font-size:15px}.tut p{margin:4px 0 0;font-size:12px!important;line-height:1.4}
.tud{display:flex;gap:5px;justify-content:flex-start}.tud i{width:7px;height:7px;border-radius:50%;background:#3a3248;cursor:pointer}.tud i.on{background:#ffd23f;box-shadow:0 0 6px #ffd23f}
.tuto>.row{justify-content:flex-start;align-self:start}
</style>`);
