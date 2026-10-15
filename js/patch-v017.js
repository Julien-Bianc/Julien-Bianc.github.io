// ============================================================
//  patch-v017.js — Rapport de test v0.16
//    1. Ennemis plus lents (data/equilibrage.js → ENEMY_SPEED) : leurs déplacements sont plus faciles à anticiper
//    2. Opacité des commandes réglable aussi dans « Disposition des commandes… »
// ============================================================
const _startV17 = start;
start = function(cfg){
  if(cfg && cfg.stage && !['online', 'training'].includes(cfg.mode)) cfg = { ...cfg, stage:{ ...cfg.stage, speed:+((cfg.stage.speed || 1)*ENEMY_SPEED).toFixed(2) } };
  return _startV17(cfg);
};
const _elV17 = editLayout;
editLayout = function(back){
  _elV17(back);
  const bar = document.getElementById('lytbar'); if(!bar) return;
  const v = Settings.get().ctlAlpha ?? 1, rs = document.getElementById('ly-rs');
  rs.insertAdjacentHTML('beforebegin', `<label>Opacité <input type='range' id='ly-op' min='.2' max='1' step='.05' value='${v}'></label>`);
  document.getElementById('ly-op').oninput = e => { Settings.set('ctlAlpha', +e.target.value); applyCtlAlpha(); };
};
