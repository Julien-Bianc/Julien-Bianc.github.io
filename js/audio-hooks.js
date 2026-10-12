// ============================================================
//  audio-hooks.js — Branche les nouveaux sons sur le combat, sans modifier combat.js.
//  À charger APRÈS js/audio.js (et après options.js), avant js/main.js.
//  Enveloppe : hurtE, hurtP, step, spawn, battleEnd (au chargement complet de la page).
// ============================================================
addEventListener('load', () => {
  const wrap = (n, f) => { if(typeof window[n] === 'function'){ const o = window[n]; window[n] = f(o); } };
  const ST = { burn:'brule', par:'para', psn:'poison', pois:'poison', slow:'slow', slw:'slow' };
  // efficacité du type (super efficace / peu efficace / immunisé) + son de dégât reçu
  const eff = (x, hurt) => { if(x === 0) playSfx('miss'); else if(x > 1) playSfx('eff'); else if(x < 1) playSfx('resist'); if(hurt) playSfx('hurt'); };
  wrap('hurtE', o => function(d, b){ const e = G.e, h = e.hp, r = o(d, b); if(e.hp < h || h > 0 && b && mult(b.t, e.t) === 0) eff(mult(b.t, e.t), 0); return r; });
  wrap('hurtP', o => function(d, b){ const p = G.p, h = p.hp, r = o(d, b); if(p.hp < h) eff(mult(b.t, p.t), 1); return r; });
  // critique : pokemon-moves.js affiche « CRITIQUE ! » via dmgTxt
  wrap('dmgTxt', o => function(x, y, t, c){ if(typeof t === 'string' && t.indexOf('CRITIQUE') === 0) playSfx('crit'); return o(x, y, t, c); });
  // « ralenti » = statut 'par' posé par applyStatus('slow') : son distinct de la paralysie
  wrap('applyStatus', o => function(ob, kind){ const had = ob.st; o(ob, kind); if(!had && ob.st && kind === 'slow') ob._slow = 1; });
  const stSnd = ob => { if(ob.st === 'par' && ob._slow){ ob._slow = 0; return 'slow'; } return ST[ob.st]; };
  // esquive, charge, rochers brisés, statuts : détectés à chaque image
  const S = { g:null, p:null, e:null, dT:0, ch:0, ps:null, es:null, rk:0 };
  wrap('step', o => function(dt){
    const r = o(dt), g = G; if(!g || !g.p || !g.e) return r;
    const p = g.p, e = g.e, dT = p.dT > 0, ch = !!(p.ch && p.ch.some(c => c > 0)), rk = (typeof rocks !== 'undefined' ? rocks : []).filter(x => x.hp <= 0).length;
    if(S.g === g && S.p === p){
      if(dT && !S.dT) playSfx('dodge');
      if(ch && !S.ch) playSfx('charge');
      if(p.st && !S.ps){ const q = stSnd(p); if(q) playSfx('status:' + q); }
      if(rk > S.rk) playSfx('rock');
    }
    if(S.g === g && S.e === e && e.st && !S.es){ const q = stSnd(e); if(q) playSfx('status:' + q); }
    S.g = g; S.p = p; S.e = e; S.dT = dT; S.ch = ch; S.ps = p.st; S.es = e.st; S.rk = rk;
    return r;
  });
  // musique de boss à l'arrivée du boss
  wrap('spawn', o => function(){ const r = o(); if(G && G.e && G.e.boss) musicSet('boss'); return r; });
  // fin de combat : jingle (ou musique victory/defeat si un fichier existe dans data/music.js)
  wrap('battleEnd', o => function(win){
    const k = win ? 'victory' : 'defeat';
    if(typeof MUSIC !== 'undefined' && MUSIC[k]) musicSet(k); else { musicSet(null); playSfx(k); }
    return o(win);
  });
});