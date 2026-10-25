// ============================================================
//  MODES DE JEU : composition des équipes ennemies, lancement d'un combat, fin de combat, pause.
//  Pour créer un nouveau mode : écris une fonction qui appelle start({...}) comme startSolo ci-dessous.
// ============================================================
function enemyTeam(size){
  const pool = [...ORDER].sort(() => Math.random() - .5), out = [];
  for(let i = 0; i < size; i++) out.push(pool[i % pool.length]);
  return out;
}

function startSolo(team, stageIndex){
  const S = STAGES[stageIndex];
  Save.lastTeam = team.id;
  const items = {}; team.members.forEach(id => { const it = Save.teamItem(team, id); if(it) items[id] = it; });   // objets tenus
  start({ mode:'solo', team:team.members.slice(), items, size:team.size, teamId:team.id, stageIndex, stage:S, arena:S.arena, enemies:enemyTeam(team.members.length) });
}

function battleEnd(win){
  const c = G.cfg, bind = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
  if(c.mode === 'solo'){
    const t = Save.team(c.teamId), next = c.stageIndex + 1 < STAGES.length;
    if(win){
      const first = c.stageIndex >= Save.cleared(c.size), rw = soloReward(c.stageIndex, G.et.length, first), before = Save.coins();
      Save.clear(c.size, c.stageIndex); Save.addCoins(rw.total);
      menu(`<h1>🏆 Victoire !</h1><p>Niveau terminé : ${esc(STAGES[c.stageIndex].name)}</p>
        <div class='gain'><b>+${money(rw.total)}</b>${rw.bonus ? `<small>Victoire ${money(rw.win)} + premier passage ${money(rw.bonus)}</small>` : ''}</div>
        <p>Solde : <span id='gsol'>${money(before)}</span></p><div class='row'>
        ${next ? `<button class='btn' id='nx'>Niveau suivant</button>` : '<p>Tous les niveaux sont terminés !</p>'}
        <button class='btn2' id='rp'>Rejouer</button><button class='btn2' id='mn'>Menu</button></div>`);
      bind('nx', () => startSolo(t, c.stageIndex + 1));
      countUp(document.getElementById('gsol'), before, Save.coins());
    } else {
      menu(`<h1>Défaite</h1><p>${G.wave} adversaire(s) battu(s) sur ${G.et.length}</p><div class='row'>
        <button class='btn' id='rp'>Réessayer</button><button class='btn2' id='mn'>Menu</button></div>`);
    }
    bind('rp', () => startSolo(t, c.stageIndex)); bind('mn', showMain);
  } else { menu(`<h1>${win ? 'Victoire !' : 'Défaite'}</h1><div class='row'><button class='btn2' id='mn'>Menu</button></div>`); bind('mn', showMain); }
}

function pauseGame(){
  if(!G || G.over || G.paused) return;
  G.paused = true; showPauseMenu();
}
function showPauseMenu(){
  menu(`<h1>Pause</h1><div class='row'><button class='btn' id='rs'>Reprendre</button><button class='btn2' id='op'>Options</button><button class='btn2' id='qt'>Quitter</button></div>`);
  document.getElementById('rs').onclick = resumeGame;
  document.getElementById('op').onclick = () => showOptions(showPauseMenu);
  document.getElementById('qt').onclick = () => { G = null; showMain(); };
}
function resumeGame(){ if(!G) return; G.paused = false; menu(''); last = performance.now(); }
document.getElementById('pauseBtn').addEventListener('pointerdown', () => { if(G && G.paused) resumeGame(); else pauseGame(); });
addEventListener('keydown', e => { if(e.target && e.target.tagName === 'INPUT') return; if(canon(e.code) === 'Escape'){ if(G && G.paused) resumeGame(); else pauseGame(); } });

// compteur de Pokédollars qui défile (écran de victoire)
function countUp(el, a, b){
  if(!el) return; const t0 = performance.now(), D = 900;
  const f = now => { if(!el.isConnected) return; const t = Math.min(1, (now - t0)/D); el.textContent = money(a + (b - a)*(1 - Math.pow(1 - t, 3))); if(t < 1) requestAnimationFrame(f); else coinSfx(); };
  setTimeout(() => requestAnimationFrame(f), 350);
}
