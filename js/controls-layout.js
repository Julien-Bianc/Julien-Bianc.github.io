// ============================================================
//  controls-layout.js — DISPOSITION DES COMMANDES TACTILES (v0.13)
//  Options → Confort → « Disposition des commandes… » : glisse le joystick et chaque bouton où tu veux,
//  règle leur taille, puis « Terminé ». Enregistré avec tes réglages (Settings.get().layout).
// ============================================================
const LYT_IDS = ['joy', 'b0', 'b1', 'b2', 'b3', 'b4', 'b5'];
const lytGet = () => { const s = Settings.get(); if(!s.layout) s.layout = { js:1, bs:1 }; return s.layout; };
function applyLayout(){
  const L = lytGet();
  LYT_IDS.forEach(id => { const el = document.getElementById(id); if(!el) return; const p = L[id] || [0, 0]; el.style.translate = `${p[0]}px ${p[1]}px`; });
  const j = document.getElementById('joy'), b = document.getElementById('btns');
  if(j) j.style.scale = L.js || 1; if(b) b.style.scale = L.bs || 1;
}
applyLayout(); setTimeout(applyLayout, 500);                        // le bouton Ball (js/safari.js) est créé au chargement

function editLayout(back){
  const app = document.getElementById('app'), ui = document.getElementById('ui'), L = lytGet();
  const saved = {}; LYT_IDS.forEach(id => { const el = document.getElementById(id); if(el){ saved[id] = { html:el.innerHTML, disp:el.style.display }; el.style.display = ''; } });
  const lbl = { b0:'A', b1:'B', b2:'C', b3:'»', b4:'Relève', b5:'Ball' };
  for(const id in lbl){ const el = document.getElementById(id); if(el && !G) el.innerHTML = `<b>${lbl[id]}</b>`; }
  app.classList.add('lyt');
  const bar = document.createElement('div'); bar.id = 'lytbar';
  bar.innerHTML = `<b>Glisse les commandes où tu veux</b>
    <label>Joystick <input type='range' id='ly-js' min='.6' max='1.6' step='.05' value='${L.js || 1}'></label>
    <label>Boutons <input type='range' id='ly-bs' min='.6' max='1.6' step='.05' value='${L.bs || 1}'></label>
    <button class='btn2 sm' id='ly-rs'>Réinitialiser</button><button class='btn sm' id='ly-ok'>Terminé</button>`;
  app.appendChild(bar);
  const save = () => { Settings.set('layout', L); applyLayout(); };
  document.getElementById('ly-js').oninput = e => { L.js = +e.target.value; save(); };
  document.getElementById('ly-bs').oninput = e => { L.bs = +e.target.value; save(); };
  document.getElementById('ly-rs').onclick = () => { LYT_IDS.forEach(id => delete L[id]); L.js = L.bs = 1; document.getElementById('ly-js').value = 1; document.getElementById('ly-bs').value = 1; save(); };
  // glisser-déposer (capture : le jeu ne reçoit rien pendant l'édition)
  let drag = null;
  const down = e => {
    const el = e.target.closest && e.target.closest('#joy, .ab'); if(!el || !LYT_IDS.includes(el.id)) return;
    e.preventDefault(); e.stopPropagation(); ui.setPointerCapture && ui.setPointerCapture(e.pointerId);
    const par = el.id === 'joy' ? null : document.getElementById('btns'), r = par && par.getBoundingClientRect();
    const k = par ? Math.max(r.width, r.height)/Math.max(par.offsetWidth, par.offsetHeight) : 1;
    drag = { el, x:e.clientX, y:e.clientY, p:(L[el.id] || [0, 0]).slice(), k }; el.classList.add('lydrag');
  };
  const move = e => {
    if(!drag) return; e.preventDefault(); e.stopPropagation();
    let dx = e.clientX - drag.x, dy = e.clientY - drag.y; if(innerHeight > innerWidth){ const q = dx; dx = dy; dy = -q; }   // jeu pivoté en portrait
    L[drag.el.id] = [Math.round(drag.p[0] + dx/drag.k), Math.round(drag.p[1] + dy/drag.k)]; applyLayout();
  };
  const up = e => { if(!drag) return; e.stopPropagation(); drag.el.classList.remove('lydrag'); drag = null; save(); };
  ui.addEventListener('pointerdown', down, true); ui.addEventListener('pointermove', move, true); ui.addEventListener('pointerup', up, true); ui.addEventListener('pointercancel', up, true);
  document.getElementById('ly-ok').onclick = () => {
    ui.removeEventListener('pointerdown', down, true); ui.removeEventListener('pointermove', move, true); ui.removeEventListener('pointerup', up, true); ui.removeEventListener('pointercancel', up, true);
    app.classList.remove('lyt'); bar.remove(); save();
    LYT_IDS.forEach(id => { const el = document.getElementById(id); if(el && saved[id]){ if(!G) el.innerHTML = saved[id].html; el.style.display = saved[id].disp; } });
    back();
  };
}
document.head.insertAdjacentHTML('beforeend', `<style>
#app.lyt #ui{display:flex!important;z-index:45}
#app.lyt #menu,#app.lyt #pauseBtn,#app.lyt #fsBtn{display:none!important}
#app.lyt #joy,#app.lyt .ab{outline:2px dashed rgba(255,210,63,.8);outline-offset:2px;cursor:grab}
#app.lyt .lydrag{outline-color:#fff;filter:brightness(1.3)}
#lytbar{position:absolute;left:50%;top:8px;transform:translateX(-50%);z-index:50;display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:center;
  max-width:96%;padding:6px 10px;background:linear-gradient(180deg,rgba(46,34,86,.95),rgba(16,10,34,.95));border:1px solid var(--gold,#ffd23f);border-radius:10px;
  font-family:var(--font,monospace);font-size:11px;color:#fff}
#lytbar b{color:#ffe9a0}#lytbar label{display:flex;align-items:center;gap:4px}#lytbar input{width:80px;accent-color:#ffd23f}
#lytbar .btn{padding:4px 12px;font-size:12px}
</style>`);
