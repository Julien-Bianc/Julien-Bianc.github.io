// ============================================================
//  training.js — MODE ENTRAÎNEMENT : teste n'importe quel Pokémon contre un mannequin, sur une grande map vide.
//    • Menu principal → Entraînement → choisis ton Pokémon puis le mannequin.
//    • Pause (❚❚) : change de Pokémon à tout moment, règle le mannequin (immobile / se déplace / se bat),
//      invincibilité et recharge instantanée.
//    • Le mannequin se soigne tout seul et revient s'il est K.O.
// ============================================================
const TRAIN_STAGE = { name:'Entraînement', level:1, arena:6, hp:1.4, dmg:1, speed:1, pspeed:1, rate:1, tele:1, aim:0, boss:1 };
const TR_OPT = { mine:null, dummy:null, mode:'static', god:true, cd:false };
const TR_MODES = { static:'immobile', move:'se déplace', fight:'se bat' };

// terrain d'entraînement : sol clair quadrillé, cercles de distance, aucune décoration
ARENAS.push({ name:'Entraînement', rock:{ o:'#3a3a48', l:'#c4c4d0', m:'#92929e', d:'#666674' }, fx:{ k:'dust', c:'#ffffff', n:0, s:2 },
  paint(a){
    const T = [0, 1].map(v => mkTile((i, j, h) => { let c = v ? '#8a98a8' : '#94a2b2'; if(i === 0 || j === 0) c = '#a6b4c4'; else if(i === 15 || j === 15) c = '#76828f'; if(h < .04) c = '#7e8a98'; return c; }, v + 77));
    for(let ty = 0; ty < PH; ty += 16) for(let tx = 0; tx < PW; tx += 16) a.drawImage(T[((tx >> 4) + (ty >> 4)) & 1], tx, ty);
    a.fillStyle = 'rgba(255,255,255,.22)'; for(let x = 0; x < PW; x += 64) a.fillRect(x, 0, 1, PH); for(let y = 0; y < PH; y += 64) a.fillRect(0, y, PW, 1);
    [60, 120, 180].forEach(r => ringPx(a, PW/2, PH/2, r, 'rgba(255,255,255,.35)'));
    a.fillStyle = 'rgba(255,255,255,.5)'; a.fillRect(PW/2 - 1, PH/2 - 6, 3, 13); a.fillRect(PW/2 - 6, PH/2 - 1, 13, 3);
    a.fillStyle = '#2a3547'; a.fillRect(0, 0, PW, 9); a.fillRect(0, PH - 9, PW, 9); a.fillRect(0, 0, 9, PH); a.fillRect(PW - 9, 0, 9, PH);
    a.fillStyle = '#4a5a74'; a.fillRect(0, 8, PW, 1); a.fillRect(0, PH - 9, PW, 1); a.fillRect(8, 0, 1, PH); a.fillRect(PW - 9, 0, 1, PH);
  } });

function pokemonPicker(title, current, onPick, back){
  menu(`<h1>${title}</h1><div class='scroll'><div class='grid2'>${ORDER.map(id => `<button class='card ${id === current ? 'sel' : ''}' data-pk='${id}'>${thumb(id)}<small>${NAME[id]}</small><small class='ty'>${typesOf(id).map(t => `<span class='tc' style='background:${COL[t]}'>${TN[t] || t}</span>`).join('')}</small></button>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='bk'>Retour</button></div>`);
  bindAll('[data-pk]', el => onPick(el.dataset.pk));
  document.getElementById('bk').onclick = back || showMain;
}
function showTraining(){
  pokemonPicker('Entraînement : ton Pokémon', TR_OPT.mine, mine => pokemonPicker('Choisis le mannequin', TR_OPT.dummy, dummy => startTraining(mine, dummy), showTraining), showMain);
}
SCREENS.training = showTraining;

function startTraining(mine, dummy){
  TR_OPT.mine = mine; TR_OPT.dummy = dummy;
  start({ mode:'training', team:[mine], size:1, stage:TRAIN_STAGE, arena:6, enemies:[dummy] });
  G.training = TR_OPT; G.intro = .4; rocks = [];
}
const _stepTr = step;
step = function(dt){
  if(!G || !G.training) return _stepTr(dt);
  const e = G.e, ex = e.x, ey = e.y, T = G.training;
  if(T.cd) G.p.cd = [0, 0, 0];
  _stepTr(dt);
  if(!G || G.over) return;
  if(T.mode === 'static'){ e.x = ex; e.y = ey; e.tele = 0; e.next = 99; }
  else if(T.mode === 'move'){ e.tele = 0; e.next = 99; }
  if(T.god){ G.p.hp = G.p.max; G.p.st = null; }
  if(e.hp > 0 && e.hp < e.max && G.time - (e.lastHit || 0) > 3) e.hp = Math.min(e.max, e.hp + e.max*dt*.4);
};
const _hPTr = hurtP; hurtP = function(d, b){ if(G && G.training && G.training.god) return; return _hPTr(d, b); };
const _hETr = hurtE;
hurtE = function(d, b){
  const e = G && G.e, r = _hETr(d, b);
  if(G && G.training){ e.lastHit = G.time; if(r){ e.hp = e.max; G.wait = 0; e.koDone = 0; } return 0; }
  return r;
};
// pause d'entraînement : réglages + changement de Pokémon
const _spmTr = showPauseMenu;
showPauseMenu = function(){
  if(!G || !G.training) return _spmTr();
  const T = G.training;
  menu(`<h1>Entraînement</h1><div class='row'><button class='btn' id='rs'>Reprendre</button></div>
    <div class='row'><button class='btn2' id='t-me'>Mon Pokémon : ${NAME[T.mine]}</button><button class='btn2' id='t-du'>Mannequin : ${NAME[T.dummy]}</button></div>
    <div class='row'><button class='btn2' id='t-mode'>Mannequin ${TR_MODES[T.mode]}</button><button class='btn2 ${T.god ? 'on' : ''}' id='t-god'>Invincible : ${T.god ? 'oui' : 'non'}</button><button class='btn2 ${T.cd ? 'on' : ''}' id='t-cd'>Recharge instantanée : ${T.cd ? 'oui' : 'non'}</button></div>
    <div class='row'><button class='btn2' id='op'>Options</button><button class='btn2' id='qt'>Quitter</button></div>`);
  document.getElementById('rs').onclick = resumeGame;
  document.getElementById('t-me').onclick = () => pokemonPicker('Ton Pokémon', T.mine, id => startTraining(id, T.dummy), showPauseMenu);
  document.getElementById('t-du').onclick = () => pokemonPicker('Mannequin', T.dummy, id => startTraining(T.mine, id), showPauseMenu);
  document.getElementById('t-mode').onclick = () => { T.mode = T.mode === 'static' ? 'move' : T.mode === 'move' ? 'fight' : 'static'; showPauseMenu(); };
  document.getElementById('t-god').onclick = () => { T.god = !T.god; showPauseMenu(); };
  document.getElementById('t-cd').onclick = () => { T.cd = !T.cd; showPauseMenu(); };
  document.getElementById('op').onclick = () => showOptions(showPauseMenu);
  document.getElementById('qt').onclick = () => { G = null; showMain(); };
};
