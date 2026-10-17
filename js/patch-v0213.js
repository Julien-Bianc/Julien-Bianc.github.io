// ============================================================
//  patch-v0213.js — correctif (rapport de test v0.21.2)
//    1. Menu principal rangé en groupes (Combats ▸, Collection ▸, Options ▸) : moins de lignes
//    2. Safari : tes projectiles touchent TOUS les Pokémon de la salle, pas seulement la cible
//  (Tour de Combat : js/tower.js · récompenses des badges ÷ 2 : js/patch-v0212.js)
// ============================================================

// ---------- 1. menu principal en groupes ----------
//  Une ligne = un mode, ou un GROUPE qui s'ouvre sur place (‹ kids ›). Les entrées non listées restent à la fin.
const MM_GROUPS = [
  { id:'g-combat', label:'Combats',    desc:'Solo, Tour de Combat, Entraînement',          kids:['solo', 'tower', 'training'] },
  { id:'safari' },
  { id:'contest' },
  { id:'g-coll',   label:'Collection', desc:'Équipes, magasin, inventaire et badges',       kids:['teams', 'shop', 'inventory', 'badges'] },
  { id:'online' },
  { id:'g-opt',    label:'Options',    desc:'Réglages et tutoriel',                         kids:['options', 'tuto'] }
];
MM.open = MM.open || null;
function mmView(full){
  const byId = id => full.find(m => m.id === id), used = new Set(), out = [];
  MM_GROUPS.forEach(g => {
    if(!g.kids){ const m = byId(g.id); if(m && !m.soon){ out.push(m); used.add(m.id); } return; }
    const kids = g.kids.map(byId).filter(m => m && !m.soon); kids.forEach(m => used.add(m.id)); if(!kids.length) return;
    out.push({ id:g.id, label:g.label, desc:g.desc, screen:'mmgrp:' + g.id, grp:true });
    if(MM.open === g.id) kids.forEach(m => out.push(m));
  });
  full.forEach(m => { if(!used.has(m.id) && !m.soon) out.push(m); });      // Défi Mewtwo / Raid (encarts à droite), Développeur…
  return out;
}
MM_GROUPS.filter(g => g.kids).forEach(g => {
  SCREENS['mmgrp:' + g.id] = () => {
    MM.open = MM.open === g.id ? null : g.id;
    renderMainMM();
    const i = (MM.items || []).findIndex(m => m && m.id === g.id); if(i >= 0 && MM.focus) MM.focus(MM.open ? Math.min(i + 1, MM.items.length - 1) : i);
  };
});
renderMainMM = (prev => function(){
  const full = MAIN_MENU.slice(), view = mmView(full);
  MAIN_MENU.length = 0; MAIN_MENU.push(...view);
  try{ prev(); } finally { MAIN_MENU.length = 0; MAIN_MENU.push(...full); }
  const open = MM_GROUPS.find(g => g.id === MM.open);
  document.querySelectorAll('.mmi').forEach(b => {
    const g = MM_GROUPS.find(x => x.id === b.dataset.id && x.kids);
    if(g){ b.classList.add('grp'); b.classList.toggle('open', MM.open === g.id); b.insertAdjacentHTML('beforeend', `<i class='mmar'>${MM.open === g.id ? '▾' : '▸'}</i>`); }
    else if(open && open.kids.includes(b.dataset.id)) b.classList.add('sub');
  });
  // pastille des récompenses de badges : sur « Collection » quand le groupe est fermé
  const n = typeof BdClaim !== 'undefined' ? BdClaim.open().length : 0, coll = document.querySelector(".mmi[data-id='g-coll']");
  if(n && coll && MM.open !== 'g-coll') coll.insertAdjacentHTML('beforeend', `<span class='bdgdot'>${n}</span>`);
  const soon = document.querySelector('.mm-soon'); if(soon) soon.remove();
})(renderMainMM);

// ---------- 2. safari : les projectiles touchent toute la meute ----------
step = (prev => function(dt){
  prev(dt);
  if(!G || G.over || !G.cfg || !G.cfg.rooms || !G.rm || !G.rm.adds || !G.rm.adds.length || typeof hitAdd !== 'function') return;
  for(let i = bullets.length - 1; i >= 0; i--){
    const b = bullets[i]; if(!b.own) continue;
    for(const a of G.rm.adds){
      if(a.hp <= 0 || (b.hitA && b.hitA.has(a)) || Math.hypot(b.x - a.x, b.y - a.y) >= b.r + (a.r || 20)) continue;
      hitAdd(a, b.d, b.t);
      if(b.pierce){ (b.hitA = b.hitA || new Set()).add(a); continue; }
      if(b.split) explode(b);
      bullets.splice(i, 1); break;
    }
  }
})(step);

document.head.insertAdjacentHTML('beforeend', `<style>
.mmi.grp .mmar{font-style:normal;font-size:.7em;margin-left:8px;opacity:.75;color:#ffe27a}
.mmi.sub{font-size:.86em;padding-left:2.4em!important;opacity:.92}
.mmi.sub::before{content:"";position:absolute;left:1.5em;top:50%;width:.55em;height:2px;background:rgba(255,226,122,.5)}
.mmi.grp.open{color:#ffe27a}
</style>`);
