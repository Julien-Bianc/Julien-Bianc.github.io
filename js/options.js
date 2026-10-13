// ============================================================
//  options.js — Écran OPTIONS : volumes, plein écran, taille de l'interface, secousses d'écran, touches du clavier.
//  Accessible depuis le menu principal et depuis la pause. Réglages enregistrés par js/settings.js.
// ============================================================
function showOptions(back){
  back = typeof back === 'function' ? back : showMain;
  const s = Settings.get();
  const pct = v => Math.round(v*100) + '%', mult = v => v == 0 ? 'Auto' : '×' + v;
  const slider = (id, label, val, max, step, fmt) => `<label class='opt'><span>${label}</span><input type='range' id='${id}' min='0' max='${max}' step='${step}' value='${val}'><b id='${id}v'>${fmt(val)}</b></label>`;
  menu(`<h1>Options</h1><div class='scroll opts'>
    <h3>Son</h3>${slider('o-master', 'Volume général', s.master, 1, .05, pct)}${slider('o-sfx', 'Effets sonores', s.sfx, 1, .05, pct)}${slider('o-music', 'Musique', s.music, 1, .05, pct)}
    <h3>Affichage</h3>
    <div class='row'><button class='btn2' id='o-fs'>${fsEl() ? 'Quitter le plein écran' : 'Plein écran'}</button>
      <button class='btn2 ${s.autoFs ? 'on' : ''}' id='o-afs'>Plein écran auto : ${s.autoFs ? 'oui' : 'non'}</button></div>
    ${slider('o-shake', 'Secousses et chocs', s.shake, 1.5, .05, pct)}
    <div class='row'><button class='btn2 ${s.aimGuides ? 'on' : ''}' id='o-aim'>Indications de visée : ${s.aimGuides ? 'oui' : 'non'}</button></div>
    ${slider('o-aimo', 'Opacité de la visée', s.aimOpacity, 1, .05, pct)}
    ${slider('o-uim', 'Taille des menus', s.uiMenu, 3, .25, mult)}
    ${slider('o-uih', 'Taille de l\'ATH', s.uiHud, 3, .25, mult)}
    <h3>Touches du clavier</h3>
    <div class='kgrid'>${Object.keys(DEFAULT_KEYS).map(a => `<button class='kbtn' data-k='${a}'><small>${KEY_LABELS[a]}</small><b>${keyName(s.keys[a])}</b></button>`).join('')}</div>
    <p>Clique une action, puis appuie sur la touche voulue (Échap = annuler).</p>
    <div class='row'><button class='btn2' id='o-rk'>Touches par défaut</button></div>
  </div><div class='row'><button class='btn' id='o-back'>Retour</button></div>`);
  [['o-master', 'master', pct], ['o-sfx', 'sfx', pct], ['o-music', 'music', pct], ['o-shake', 'shake', pct], ['o-uim', 'uiMenu', mult], ['o-uih', 'uiHud', mult], ['o-aimo', 'aimOpacity', pct]].forEach(([id, key, fmt]) => {
    const el = document.getElementById(id), lab = document.getElementById(id + 'v');
    el.oninput = () => { Settings.set(key, +el.value); lab.textContent = fmt(+el.value); if(key === 'uiMenu' || key === 'uiHud') applyUI(); };
    el.onchange = () => { audioInit(); if(key === 'sfx' || key === 'master') playSfx('hit:feu'); if(key === 'shake' && G) G.shake = .4; };
  });
  document.getElementById('o-fs').onclick = async () => { await toggleFullscreen(); showOptions(back); };
  document.getElementById('o-aim').onclick = () => { Settings.set('aimGuides', !Settings.get().aimGuides); showOptions(back); };
  document.getElementById('o-afs').onclick = () => { Settings.set('autoFs', !Settings.get().autoFs); showOptions(back); };
  document.getElementById('o-rk').onclick = () => { Settings.resetKeys(); showOptions(back); };
  document.getElementById('o-back').onclick = () => { Settings.capture = null; back(); };
  bindAll('.kbtn', el => {
    el.querySelector('b').textContent = 'Appuie sur une touche…'; el.classList.add('wait');
    Settings.capture = code => { if(code !== 'Escape') Settings.bind(el.dataset.k, code); showOptions(back); };
  });
}
SCREENS.options = showOptions;
