// ============================================================
//  rules.js — Règles de combat transverses (v0.05)
//    • coups critiques pour TOUS les Pokémon (même probabilité faible)  → CRIT
//    • K.O. définitif : un Pokémon K.O. ne revient jamais ; brûlure / poison / contrecoup peuvent achever
//    • l'esquive ANNULE la charge d'une attaque
//    • sécurité : écran d'erreur (au lieu d'un gel du jeu) + garde-fous contre les animations bloquées
// ============================================================
const GAME_VERSION = '0.26.0';
const CRIT = { chance:.0625, mult:1.5 };        // 1 chance sur 16, dégâts x1,5 — identique pour tous les Pokémon

// ---------- coups critiques ----------
function critFx(x, y){
  vp({ x, y, life:.35, s:10, s1:46, kind:'ring', col:'#ffd23f' });
  burst(8, (i, a) => vp({ x, y, vx:Math.cos(a)*R_(80, 200), vy:Math.sin(a)*R_(80, 200), life:.5, s:R_(6, 10), s1:2, kind:'star', col:'#ffe070', rot:a, vr:6 }));
  playSfx('crit');
}
const _hEcr = hurtE;
hurtE = function(d, b){
  const e = G && G.e;
  if(e && !b.crit && b.k !== 'pool' && e.hp > 0 && !(e.invT > G.time) && G.intro <= 0 && Math.random() < CRIT.chance){
    d *= CRIT.mult; b.crit = 1; dmgTxt(e.x, e.y - 76, 'COUP CRITIQUE !', '#ffd23f'); critFx(e.x, e.y);
  }
  return _hEcr(d, b);
};
const _hPcr = hurtP;
hurtP = function(d, b){
  const p = G && G.p;
  if(p && !b.crit && b.k !== 'pool' && p.hp > 0 && p.inv <= 0 && p.dT <= 0 && !G.sw && Math.random() < CRIT.chance){
    d *= CRIT.mult; b.crit = 1; dmgTxt(p.x, p.y - 76, 'COUP CRITIQUE !', '#ffd23f'); critFx(p.x, p.y);
  }
  return _hPcr(d, b);
};

// ---------- K.O. définitif ----------
function koCheck(){
  const p = G.p, e = G.e;
  if(G.training){ if(p.hp <= 0) p.hp = p.max; return; }
  if(p.hp <= 0 && !G.sw && !p.koDone){                       // K.O. par brûlure, poison, contrecoup…
    p.koDone = 1; p.hp = 0; onKO(p, false);
    const nx = G.team.find(c => c.hp > 0);
    if(nx){ doSwap(nx); G.swc = 0; } else { G.over = 1; battleEnd(false); }
  }
  if(e.hp <= 0 && !G.wait && !e.koDone){
    e.koDone = 1; e.hp = 0; onKO(e, true); G.wait = 2.2; dmgTxt(e.x, e.y, 'K.O.', '#ffd23f'); bullets.length = 0; zn.length = 0;
  }
}
const _stepRu = step;
step = function(dt){
  _stepRu(dt);
  if(!G || G.over || G.paused) return;
  koCheck();
  // garde-fous : une animation ne doit jamais bloquer le combat
  if(G.sw && G.time - G.sw.t0 > 4){ const al = G.team.find(c => c.hp > 0); G.sw = null; G.team.forEach(c => c.hid = false); if(al) G.p = al; }
  if(G.em && G.time - G.em.t0 > 3){ G.em.e.hid = false; G.em = null; }
};
// un Pokémon K.O. ne peut jamais être rappelé
const _doSwapR = doSwap;
doSwap = function(n){ if(!n || n.hp <= 0) return; _doSwapR(n); };

// ---------- l'esquive annule la charge ----------
const _dashR = dash;
dash = function(){
  if(G && !G.over && !G.sw && G.p.dC <= 0){
    G.p.ch = [0, 0, 0]; down[0] = down[1] = down[2] = 0; AIM.on = [0, 0, 0];
  }
  _dashR();
};

// ---------- sécurité : au lieu de geler, le jeu se met en pause et affiche l'erreur ----------
let ERR_SHOWN = false, SLOW_FRAMES = 0;
function reportError(e){
  console.error(e);
  if(ERR_SHOWN) return; ERR_SHOWN = true;
  const msg = (e && e.stack) ? e.stack : String(e);
  const rep = `Arène v${GAME_VERSION}\n${msg}\nniveau:${G && G.cfg && G.cfg.stageIndex} vague:${G && G.wave} paused:${G && G.paused}`;
  if(G) G.paused = true;
  menu(`<h1>Oups, une erreur</h1><p>Le jeu a été mis en pause. Copie ce rapport pour qu'on corrige :</p>
    <textarea id='er' readonly rows='6' style='width:95%;font-size:9px'>${esc(rep)}</textarea>
    <div class='row'><button class='btn' id='er1'>Reprendre</button><button class='btn2' id='er2'>Copier</button><button class='btn2' id='er3'>Menu</button></div>`);
  document.getElementById('er1').onclick = () => { ERR_SHOWN = false; if(G) resumeGame(); else showMain(); };
  document.getElementById('er2').onclick = () => { const t = document.getElementById('er'); t.select(); try{ navigator.clipboard.writeText(rep); }catch(x){ document.execCommand('copy'); } };
  document.getElementById('er3').onclick = () => { ERR_SHOWN = false; G = null; showMain(); };
}
addEventListener('error', ev => reportError(ev.error || ev.message));
addEventListener('unhandledrejection', ev => reportError(ev.reason));
// allège les effets si la machine rame
function perfTick(dt){ if(dt > .032) SLOW_FRAMES++; else SLOW_FRAMES = Math.max(0, SLOW_FRAMES - 1); if(SLOW_FRAMES > 45) VFX_LOW = true; }
