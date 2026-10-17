// ============================================================
//  tower.js — TOUR DE COMBAT (mode infini)  · v0.21.3
//    • Écran à fond animé (une tour de pierre dans l'orage, des Pokémon à chaque fenêtre), record + équipe, statistiques,
//      classement en ligne (supabase/tour.sql).
//    • Tu commences avec 1 Pokémon sans objet ; 3 Pokémon maximum ; des recrues et des bonus en route.
//    • Entre deux étages : change l'ordre de ton équipe et donne / échange les objets gagnés (le « sac »).
//    • 3 adversaires par étage, même si des Pokémon de ton équipe sont K.O. (+1 dès l'étage 20, +2 dès l'étage 40) ;
//      tous les 10 étages, le dernier adversaire est un boss.
// ============================================================
const TW = {
  teamMax:3,
  heal:.1,                         // PV rendus à chaque Pokémon encore debout après chaque étage
  coins:f => Math.round((10 + 2*f)*.65),   // Pokédollars gagnés en passant l'étage f (v0.21.4 : ×0,65)
  extraFoes:f => f >= 40 ? 2 : f >= 20 ? 1 : 0,
  arenas:[0, 1, 2, 3, 4, 5, 7, 8, 11, 13]
};
const twStage = f => { const t = Math.min(1, (f - 1)/40), x = Math.max(0, f - 40), r2 = v => +v.toFixed(2);
  return { name:'Tour — étage ' + f, level:Math.min(10, Math.ceil(f/5)), arena:TW.arenas[(f*7) % TW.arenas.length], hp:r2(.75 + .028*(f - 1) + .03*x), dmg:r2(.65 + .024*(f - 1) + .02*x),
    speed:r2(.8 + .45*t), pspeed:r2(.85 + .5*t), rate:r2(1.3 - .72*t), tele:r2(1.2 - .52*t), aim:r2(Math.min(1, (f - 1)/20)), boss:r2(1.8 + .03*f) }; };
const twBossFloor = f => f % 10 === 0;
const twFoesN = f => 3 + TW.extraFoes(f);                  // v0.21.4 : toujours 3 adversaires (et plus en haut de la tour)
const twPick = (pool, n) => { const out = []; while(out.length < n){ const P = pool.slice().sort(() => Math.random() - .5); out.push(...P.slice(0, n - out.length)); } return out; };

// ---------------------------------------------------------------- sauvegarde, record, stats, classement
const Tower = {
  run(){ return Save.load().tower || null; },
  set(r){ const d = Save.load(); d.tower = r; Save.save(); },
  best(){ return +(Save.load().towerBest || 0); },
  bestTeam(){ return String(Save.load().towerTeam || '').split(',').filter(id => ORDER.includes(id)); },
  stats(){ const d = Save.load(); if(!d.towerStats) d.towerStats = { runs:0, floors:0, foes:0, coins:0, bonus:0, recruits:0, last:null }; return d.towerStats; },
  record(f, team){ const d = Save.load(); if(f > (d.towerBest || 0)){ d.towerBest = f; d.towerTeam = team; d.towerDate = Date.now(); Save.save(); if(typeof Badges !== 'undefined') Badges.check(); } this.sync(); },
  async sync(){ const d = Save.load(); if(typeof Online === 'undefined' || !Online.user || !d.towerBest || (d.towerSent || 0) >= d.towerBest) return;
    try{ await Online.rpc('submit_tower', { p_floor:d.towerBest, p_team:d.towerTeam || '' }); d.towerSent = d.towerBest; Save.save(); }catch(e){ console.warn('tour', e.message); } },
  async top(){ return await Online.rpc('tower_top', { p_limit:30 }) || []; }
};

// ---------------------------------------------------------------- icônes (émail à bord doré, comme les badges)
const TWI = {
  heal(c){ const h = bdP2(p => { p.moveTo(32, 56); p.bezierCurveTo(4, 36, 6, 8, 32, 20); p.bezierCurveTo(58, 8, 60, 36, 32, 56); p.closePath(); }); bdBGem(c, h, '#ff6a9a'); c.fillStyle = '#fff'; c.fillRect(28, 22, 8, 22); c.fillRect(21, 29, 22, 8); bdShine(c, 20, 22, 3.5); },
  revive(c){ bdBGem(c, bdStar(4, 28, 8, 32, 32), '#ffd23f'); bdBGem(c, bdStar(4, 11, 3.5, 50, 14), '#fff3a0'); c.fillStyle = '#fff'; c.beginPath(); c.arc(32, 32, 4, 0, 6.2832); c.fill(); },
  atk(c){ c.save(); c.translate(32, 32); c.rotate(Math.PI/4); bdBGem(c, bdPoly([[-5, 8], [-5, -20], [0, -28], [5, -20], [5, 8]]), '#dfe6f0'); bdBGem(c, bdRect(-14, 8, 28, 6, 2), '#ffd23f'); bdBGem(c, bdRect(-3.5, 14, 7, 12, 2), '#8a4a20'); c.restore(); bdShine(c, 26, 20, 2); },
  def(c){ const s = bdP2(p => { p.moveTo(32, 5); p.lineTo(54, 13); p.bezierCurveTo(54, 38, 44, 52, 32, 59); p.bezierCurveTo(20, 52, 10, 38, 10, 13); p.closePath(); }); bdBGem(c, s, '#3a8ae8'); c.fillStyle = '#7ac0ff'; c.fill(bdP2(p => { p.moveTo(32, 12); p.lineTo(47, 17); p.bezierCurveTo(47, 36, 40, 46, 32, 51); p.closePath(); })); bdShine(c, 22, 16, 3); },
  spd(c){ [[0, '#5ad8f0'], [16, '#c0f4ff']].forEach(([dx, col]) => bdBGem(c, bdPoly([[10 + dx, 12], [26 + dx, 12], [42 + dx, 32], [26 + dx, 52], [10 + dx, 52], [26 + dx, 32]]), col)); },
  hpm(c){ const h = bdP2(p => { p.moveTo(28, 56); p.bezierCurveTo(2, 36, 4, 10, 28, 22); p.bezierCurveTo(52, 10, 54, 36, 28, 56); p.closePath(); }); bdBGem(c, h, '#e8402c'); bdBGem(c, bdPoly([[46, 6], [52, 6], [52, 14], [60, 14], [60, 20], [52, 20], [52, 28], [46, 28], [46, 20], [38, 20], [38, 14], [46, 14]]), '#ffd23f'); bdShine(c, 17, 24, 3); },
  item(c){ bdBGem(c, bdP2(p => { p.moveTo(14, 24); p.bezierCurveTo(14, 16, 50, 16, 50, 24); p.lineTo(54, 54); p.bezierCurveTo(54, 58, 10, 58, 10, 54); p.closePath(); }), '#b07838'); c.strokeStyle = '#6a4418'; c.lineWidth = 3; c.beginPath(); c.arc(32, 18, 9, Math.PI, 0); c.stroke(); bdBGem(c, bdRect(26, 30, 12, 10, 2), '#ffd23f'); bdShine(c, 20, 28, 3); },
  coins(c){ bdBDRAW.rich(c); },
  trophy(c){ bdBDRAW.champion(c); },
  crown(c){ bdBDRAW.crown(c); },
  tower(c){ bdTower(c, '#8a7aa8', '#ffd23f'); },
  stairs(c){ bdBGem(c, bdPoly([[6, 58], [6, 46], [18, 46], [18, 34], [30, 34], [30, 22], [42, 22], [42, 10], [58, 10], [58, 58]]), '#c8a050'); c.fillStyle = 'rgba(0,0,0,.2)'; [[6, 46], [18, 34], [30, 22], [42, 10]].forEach(([x, y]) => c.fillRect(x, y + 8, 12 + (58 - x - 12), 3)); },
  foes(c){ c.save(); c.translate(32, 32); [Math.PI/4, -Math.PI/4].forEach(a => { c.save(); c.rotate(a); bdBGem(c, bdPoly([[-4, 8], [-4, -22], [0, -28], [4, -22], [4, 8]]), '#dfe6f0'); bdBGem(c, bdRect(-11, 8, 22, 5, 2), '#ffd23f'); bdBGem(c, bdRect(-3, 13, 6, 11, 2), '#8a4a20'); c.restore(); }); c.restore(); },
  runs(c){ c.fillStyle = '#7a5a18'; c.fillRect(14, 6, 5, 54); bdBGem(c, bdPoly([[19, 8], [54, 14], [44, 24], [54, 34], [19, 34]]), '#8a3ae8'); bdBGem(c, bdStar(5, 7, 3, 32, 21), '#ffd23f'); },
  recruit(c){ const b = bdDisc(22, 32, 34); bdBGem(c, b, '#f4f4f4'); c.save(); c.clip(b); c.fillStyle = '#8a3ae8'; c.fillRect(0, 0, 64, 33); c.fillStyle = '#1a1020'; c.fillRect(0, 31, 64, 5); c.restore(); bdBGem(c, bdDisc(6, 32, 34), '#ffffff');
    bdBGem(c, bdPoly([[46, 2], [52, 2], [52, 10], [60, 10], [60, 16], [52, 16], [52, 24], [46, 24], [46, 16], [38, 16], [38, 10], [46, 10]]), '#3ab84a'); },
  bag(c){ TWI.item(c); }
};
const TWI_IMG = {};
function twIcon(k){ if(TWI_IMG[k]) return TWI_IMG[k]; const cv2 = document.createElement('canvas'); cv2.width = cv2.height = 64; const c = cv2.getContext('2d'); try{ TWI[k](c); }catch(e){ console.warn('twIcon', k, e); } return TWI_IMG[k] = cv2.toDataURL(); }
const twI = (k, cls) => `<img class='twi ${cls || ''}' src='${twIcon(k)}'>`;

// ---------------------------------------------------------------- bonus
const TW_BONUS = {
  heal:  { name:'Soin total',    desc:'Tous tes Pokémon debout récupèrent tous leurs PV.', ok:R => R.team.some(m => m.hp > 0 && m.hp < 1), go:R => R.team.forEach(m => { if(m.hp > 0) m.hp = 1; }) },
  revive:{ name:'Rappel',        desc:'Tes Pokémon K.O. reviennent avec 50 % de leurs PV.', ok:R => R.team.some(m => m.hp <= 0), go:R => R.team.forEach(m => { if(m.hp <= 0) m.hp = .5; }) },
  atk:   { name:'Attaque +12 %', desc:'Toute ton équipe frappe plus fort jusqu\'à la fin de la tour.', ok:() => true, go:R => R.atk = +((R.atk || 1)*1.12).toFixed(3) },
  def:   { name:'Défense +10 %', desc:'Ton équipe subit 10 % de dégâts en moins.', ok:() => true, go:R => R.def = +((R.def || 1)*.9).toFixed(3) },
  spd:   { name:'Vitesse +8 %',  desc:'Ton équipe se déplace plus vite.', ok:R => (R.spd || 1) < 1.4, go:R => R.spd = +((R.spd || 1)*1.08).toFixed(3) },
  hpm:   { name:'PV max +15 %',  desc:'Tous tes Pokémon ont plus de PV.', ok:R => (R.hpm || 1) < 2, go:R => R.hpm = +((R.hpm || 1)*1.15).toFixed(3) },
  item:  { name:'Objet tenu',    desc:'Un objet tenu va dans ton sac : donne-le au Pokémon de ton choix.', ok:() => true,
           go:R => { const L = HELD.filter(h => h.r === 'PC' || h.r === 'R'), h = L[Math.floor(Math.random()*L.length)]; (R.bag = R.bag || []).push(h.id); return `${h.name} rejoint ton sac !`; } },
  coins: { name:'Bourse',        desc:'Des Pokédollars tout de suite.', ok:() => true, go:R => { const n = Math.round((40 + R.floor*8)*.65); Save.addCoins(n); R.coins = (R.coins || 0) + n; Tower.stats().coins += n; return `+ ${money(n)}`; } }
};
function twOffer(R, f){
  if(f % 5 === 0) return { kind:'bonus', opts:twPick(Object.keys(TW_BONUS).filter(k => TW_BONUS[k].ok(R)), 3).filter((v, i, a) => a.indexOf(v) === i) };
  if(f % 5 === 2 || (f % 5 === 4 && R.team.length < TW.teamMax)) return { kind:'recruit', opts:ORDER.filter(id => !R.team.some(m => m.id === id)).sort(() => Math.random() - .5).slice(0, 3) };
  return null;
}

// ---------------------------------------------------------------- morceaux d'interface
const twTypes = id => typesOf(id).map(t => `<span class='tc' style='background:${COL[t]}'>${TN[t] || t}</span>`).join('');
const twHp = h => `<i class='twhp'><u style='width:${Math.max(0, h)*100}%;background:${h > .5 ? '#46d86a' : h > .2 ? '#ffd23f' : '#ff5a4a'}'></u></i>`;
const twItemImg = id => id && HELD_BY_ID[id] ? `<img src='${heldImg(HELD_BY_ID[id])}' title='${esc(HELD_BY_ID[id].name)}'>` : '';
function twTeamView(R){
  return `<div class='twteam'>${R.team.map((m, i) => `<div class='twm ${m.hp <= 0 ? 'ko' : ''} ${i === 0 ? 'lead' : ''}'>${thumb(m.id)}<b>${esc(NAME[m.id] || m.id)}</b>${twHp(m.hp)}${(R.items || {})[m.id] ? `<span class='twit'>${twItemImg(R.items[m.id])}</span>` : ''}</div>`).join('')}</div>`;
}
const twBuffs = R => [['atk', 'Attaque', v => '+' + Math.round((v - 1)*100) + ' %'], ['def', 'Dégâts subis', v => '−' + Math.round((1 - v)*100) + ' %'], ['spd', 'Vitesse', v => '+' + Math.round((v - 1)*100) + ' %'], ['hpm', 'PV max', v => '+' + Math.round((v - 1)*100) + ' %']]
  .filter(([k]) => R[k] && R[k] !== 1).map(([k, n, f]) => `<span class='twb'>${twI(k)}${n} ${f(R[k])}</span>`).join('');
const twOn = (id, fn) => { const b = document.getElementById(id); if(b) b.onclick = fn; };

// ---------------------------------------------------------------- écran principal
function showTower(){
  const R = Tower.run();
  if(R && R.inFight && !(G && G.cfg && G.cfg.mode === 'tower' && !G.over)){ G = null; return twEnd(R, 'abandon'); }
  G = null; Tower.sync();
  const S = Tower.stats(), best = Tower.best(), bt = Tower.bestTeam();
  const tile = (k, v, n) => `<div class='twst'>${twI(k)}<b>${v}</b><small>${n}</small></div>`;
  menu(`<div class='hd' data-twscene><h1>Tour de Combat</h1>${walletHtml()}</div>
    <div class='edit twhome'><div class='scroll left'>
      <div class='twrec'>${twI('trophy', 'big')}<div><small>RECORD</small><b>Étage ${best}</b><span class='twrt'>${bt.length ? bt.map(thumb).join('') : '<small>Aucune tour terminée</small>'}</span></div></div>
      <div class='twsts'>${tile('runs', S.runs, 'tours jouées')}${tile('stairs', S.floors, 'étages gagnés')}${tile('foes', S.foes, 'adversaires battus')}
        ${tile('coins', money(S.coins), 'gagnés')}${tile('item', S.bonus, 'bonus choisis')}${tile('recruit', S.recruits, 'recrues')}</div>
      ${S.last ? `<p class='twlast'>Dernière tour : étage <b>${S.last.f}</b> ${String(S.last.team || '').split(',').filter(id => ORDER.includes(id)).map(thumb).join('')}</p>` : ''}
      ${R ? `<div class='twrun'><span>${twI('tower')} Tour en cours : <b>étage ${R.floor}</b></span>${twTeamView(R)}</div>
        <div class='row'><button class='btn' id='twc'>Continuer</button><button class='btn2' id='twq'>Abandonner</button></div>`
        : `<div class='row'><button class='btn' id='twn'>Entrer dans la tour</button><button class='btn2' id='twh'>Règles</button></div>`}
    </div><div class='scroll right'><p class='twlbt'>${twI('crown')} Classement</p><div id='twlb'><small>Chargement…</small></div></div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  twOn('twn', twNew); twOn('twc', () => R.pending ? twAfter(R) : twFloor()); twOn('back', showMain); twOn('twh', twRules);
  twOn('twq', () => gameConfirm('Abandonner la tour ?', `Ta tour s'arrête à l'étage ${R.floor - 1}.`, 'Abandonner', () => twEnd(R, 'quit')));
  twBoard();
}
SCREENS.tower = showTower;
function twRules(){
  menu(`<div class='hd' data-twscene><h1>Règles de la Tour</h1></div><div class='twrules'>
    <p>${twI('recruit')} Tu entres avec <b>un seul Pokémon, sans objet</b>. D'autres Pokémon proposent de te rejoindre en route (<b>3 maximum</b> ; équipe pleine : l'un d'eux laisse sa place).</p>
    <p>${twI('foes')} Chaque étage est plus dur. <b>3 adversaires</b> par étage, <b>un de plus dès l'étage 20</b>, deux dès l'étage 40. Tous les 10 étages, le dernier est un <b>boss</b>.</p>
    <p>${twI('heal')} Les PV ne remontent que de 10 % entre deux étages et un Pokémon K.O. le reste (sauf Rappel).</p>
    <p>${twI('item')} Tous les 5 étages : un <b>bonus</b> au choix. Les objets gagnés vont dans ton <b>sac</b> : donne-les et change l'ordre de ton équipe avant chaque combat.</p>
    <p>${twI('runs')} Si toute ton équipe tombe, la tour est finie. <b>Quitter un combat = fin de la tour.</b></p></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  twOn('back', showTower);
}
async function twBoard(){
  const el = () => document.getElementById('twlb');
  if(typeof Online === 'undefined' || !Online.configured || !Online.configured() || !Online.user){ if(el()) el().innerHTML = `<small>Connecte-toi dans <b>Multijoueur</b> pour apparaître dans le classement.</small>`; return; }
  try{
    const L = await Tower.top(); if(!el()) return;
    el().innerHTML = L.length ? `<ol class='twlb'>${L.map((r, i) => `<li class='${r.pseudo === Online.user.pseudo ? 'me' : ''}'><span>${i + 1}.</span><b>${esc(r.pseudo)}</b><span class='tth'>${String(r.team || '').split(',').filter(id => ORDER.includes(id)).slice(0, 3).map(thumb).join('')}</span><em>${r.best}</em></li>`).join('')}</ol>` : '<small>Personne pour l\'instant : sois le premier !</small>';
  }catch(e){ if(el()) el().innerHTML = `<small>Classement indisponible pour l'instant.</small>`; console.warn('tower_top', e.message); }
}
function twNew(){
  const mine = ORDER.filter(id => Owned.has(id));
  menu(`<div class='hd' data-twscene><h1>Ton Pokémon de départ</h1></div><small class='sub'>Il entre seul dans la tour, sans objet.</small>
    <div class='scroll'><div class='twpick'>${mine.map(id => `<button class='twopt' data-pk='${id}'>${thumb(id)}<b>${NAME[id]}</b><small class='ty'>${twTypes(id)}</small></button>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='bk'>Retour</button></div>`);
  bindAll('[data-pk]', el => { Tower.set({ floor:1, team:[{ id:el.dataset.pk, hp:1 }], items:{}, bag:[], atk:1, def:1, spd:1, hpm:1, coins:0, inFight:0, pending:null }); twFloor(); });
  twOn('bk', showTower);
}

// ---------------------------------------------------------------- préparation d'un étage : ordre de l'équipe + objets
let TWSEL = null;      // objet sélectionné : { from:'bag', k } ou { from:'mon', i }
function twFloor(msg){
  const R = Tower.run(); if(!R) return showTower();
  R.items = R.items || {}; R.bag = R.bag || [];
  const f = R.floor, alive = R.team.filter(m => m.hp > 0).length, n = twFoesN(f, alive), boss = twBossFloor(f);
  const selBag = k => TWSEL && TWSEL.from === 'bag' && TWSEL.k === k, selMon = i => TWSEL && TWSEL.from === 'mon' && TWSEL.i === i;
  menu(`<div class='hd' data-twscene><h1>Étage ${f}</h1>${walletHtml()}</div>
    <p class='twnext'>${twI(boss ? 'crown' : 'foes')} ${n} adversaire${n > 1 ? 's' : ''}${boss ? ' — <b>le dernier est un boss !</b>' : ''}</p>
    <div class='twteam ed'>${R.team.map((m, i) => `<div class='twm ${m.hp <= 0 ? 'ko' : ''} ${i === 0 ? 'lead' : ''}'>
        <span class='twn'>${i + 1}</span>${thumb(m.id)}<b>${esc(NAME[m.id] || m.id)}</b>${twHp(m.hp)}
        <span class='twmr'><button class='twa' data-mv='${i},-1' ${i === 0 ? 'disabled' : ''}>◀</button>
        <button class='twslot ${selMon(i) ? 'sel' : ''} ${TWSEL && !selMon(i) ? 'drop' : ''}' data-slot='${i}' title='Objet tenu'>${twItemImg(R.items[m.id]) || '<em>+</em>'}</button>
        <button class='twa' data-mv='${i},1' ${i === R.team.length - 1 ? 'disabled' : ''}>▶</button></span></div>`).join('')}</div>
    <div class='twbag ${TWSEL && TWSEL.from === 'mon' ? 'drop' : ''}' id='twbag'>${twI('bag')}<span>Sac :</span>${R.bag.length ? R.bag.map((id, k) => `<button class='twslot ${selBag(k) ? 'sel' : ''}' data-bag='${k}' title='${esc(HELD_BY_ID[id] ? HELD_BY_ID[id].name : id)}'>${twItemImg(id)}</button>`).join('') : '<small>vide</small>'}</div>
    <small class='sub'>${msg ? `<b>${esc(msg)}</b>` : TWSEL ? 'Touche l\'emplacement d\'un Pokémon pour lui donner cet objet (ou le sac pour le ranger).' : 'Flèches : changer l\'ordre (le 1er commence) · touche un objet puis un Pokémon pour le lui donner.'}</small>
    ${twBuffs(R) ? `<div class='twbs'>${twBuffs(R)}</div>` : ''}
    <div class='row'><button class='btn' id='twgo'>Combattre</button><button class='btn2' id='twm'>Menu</button></div>`);
  const save = m => { Tower.set(R); twFloor(m); };
  bindAll('[data-mv]', el => { const [i, d] = el.dataset.mv.split(',').map(Number), j = i + d; if(j < 0 || j >= R.team.length) return; [R.team[i], R.team[j]] = [R.team[j], R.team[i]]; TWSEL = null; save(); });
  bindAll('[data-bag]', el => { const k = +el.dataset.bag; TWSEL = selBag(k) ? null : { from:'bag', k }; twFloor(); });
  bindAll('[data-slot]', el => {
    const i = +el.dataset.slot, pid = R.team[i].id, cur = R.items[pid];
    if(!TWSEL){ if(cur){ TWSEL = { from:'mon', i }; twFloor(); } else twFloor('Choisis d\'abord un objet dans ton sac.'); return; }
    if(TWSEL.from === 'mon' && TWSEL.i === i){ TWSEL = null; return twFloor(); }
    if(TWSEL.from === 'bag'){ const it = R.bag.splice(TWSEL.k, 1)[0]; if(cur) R.bag.push(cur); R.items[pid] = it; TWSEL = null; return save(`${NAME[pid]} tient ${HELD_BY_ID[it].name}.`); }
    const src = R.team[TWSEL.i].id, it = R.items[src]; R.items[src] = cur || undefined; if(!cur) delete R.items[src]; R.items[pid] = it; TWSEL = null; save(`${NAME[pid]} tient ${HELD_BY_ID[it].name}.`);
  });
  twOn('twbag', ev => { if(!TWSEL || TWSEL.from !== 'mon' || ev.target.closest('[data-bag]')) return; const pid = R.team[TWSEL.i].id; R.bag.push(R.items[pid]); delete R.items[pid]; TWSEL = null; save(); });
  twOn('twgo', () => { TWSEL = null; twFight(); }); twOn('twm', () => { TWSEL = null; showMain(); });
}
function twFight(){
  const R = Tower.run(); if(!R) return showTower();
  const alive = R.team.filter(m => m.hp > 0); if(!alive.length) return twEnd(R, 'ko');
  const f = R.floor, S = twStage(f), foes = twPick(ORDER, twFoesN(f, alive.length));
  R.inFight = 1; Tower.set(R);
  start({ mode:'tower', team:alive.map(m => m.id), items:R.items || {}, size:alive.length, stage:S, arena:S.arena, enemies:foes, twBoss:twBossFloor(f) });
  if(!G) return;
  G.tower = R;
  G.team.forEach(c => { const m = alive.find(x => x.id === c.t); c.max = Math.round(c.max*(R.hpm || 1)); c.hp = Math.max(1, Math.round(c.max*(m ? m.hp : 1))); c.sp *= R.spd || 1; });
  if(typeof setBtns === 'function') setBtns();
  if(typeof musicSet === 'function') musicSet(twBossFloor(f) ? 'tower:boss|boss|battle' : 'tower|battle');
}
// le dernier adversaire d'un étage de boss devient un boss (même avec 1 ou 2 adversaires)
spawn = (prev => function(){
  prev();
  if(!G || !G.cfg || G.cfg.mode !== 'tower' || !G.cfg.twBoss || G.wave !== G.et.length - 1 || !G.e || G.e.boss) return;
  const e = G.e; e.boss = true; e.r = 36; e.hp = e.max = Math.round(e.max*(G.stage.boss || 2));
})(spawn);
hurtE = (prev => function(d, b){ if(G && G.tower && G.cfg && G.cfg.mode === 'tower') d *= G.tower.atk || 1; return prev(d, b); })(hurtE);
hurtP = (prev => function(d, b){ if(G && G.tower && G.cfg && G.cfg.mode === 'tower') d *= G.tower.def || 1; return prev(d, b); })(hurtP);
battleEnd = (prev => function(win, why){
  if(!(G && G.cfg && G.cfg.mode === 'tower')) return prev(win, why);
  const R = G.tower || Tower.run(); if(!R) return showTower();
  const S = Tower.stats(); R.inFight = 0;
  if(!win){ S.foes += G.wave || 0; R.team.forEach(m => m.hp = 0); Save.save(); return setTimeout(() => twEnd(R, 'ko'), 0); }
  R.team.forEach(m => { const c = G.team.find(x => x.t === m.id); if(c) m.hp = Math.max(0, Math.min(1, c.hp/c.max + (c.hp > 0 ? TW.heal : 0))); });
  const f = R.floor, gain = TW.coins(f); Save.addCoins(gain); R.coins = (R.coins || 0) + gain; R.floor = f + 1;
  S.floors++; S.foes += G.et.length; S.coins += gain;
  R.pending = twOffer(R, f); R.last = { f, gain }; Tower.set(R);
  Tower.record(f, R.team.map(m => m.id).join(','));
  setTimeout(() => { if(G && G.over) G = null; twAfter(R); }, 0);
})(battleEnd);

// ---------------------------------------------------------------- après un étage : bonus / recrue
function twAfter(R, note){
  const P = R.pending, L = R.last || { f:R.floor - 1, gain:0 };
  const body = !P ? '' : P.kind === 'bonus'
    ? `<p class='twq'>Choisis un bonus :</p><div class='twopts'>${P.opts.map(k => { const B = TW_BONUS[k]; return `<button class='twopt' data-two='${k}'>${twI(k, 'big')}<b>${B.name}</b><small>${B.desc}</small></button>`; }).join('')}</div>`
    : `<p class='twq'>Un Pokémon veut te rejoindre ! <small>(${R.team.length}/${TW.teamMax}${R.team.length >= TW.teamMax ? ' — l\'un des tiens devra laisser sa place' : ''})</small></p><div class='twopts'>${P.opts.map(id => `<button class='twopt' data-two='${id}'>${thumb(id)}<b>${esc(NAME[id] || id)}</b><small class='ty'>${twTypes(id)}</small></button>`).join('')}
      <button class='twopt skip' data-two=''><em>✖</em><b>Personne</b><small>Garder mon équipe</small></button></div>`;
  menu(`<div class='hd' data-twscene><h1>Étage ${L.f} réussi !</h1>${walletHtml()}</div>
    <p class='twgain'>${twI('coins')} +${money(L.gain)}${note ? ` · <b>${esc(note)}</b>` : ''}</p>${twTeamView(R)}${body}
    ${P ? '' : `<div class='row'><button class='btn' id='twnx'>Préparer l'étage ${R.floor}</button><button class='btn2' id='twm'>Menu</button></div>`}`);
  bindAll('[data-two]', el => {
    const v = el.dataset.two, S = Tower.stats();
    if(P.kind === 'bonus'){ const msg = TW_BONUS[v].go(R) || TW_BONUS[v].name; S.bonus++; R.pending = null; Tower.set(R); return twAfter(R, msg); }
    if(!v){ R.pending = null; Tower.set(R); return twAfter(R); }
    if(R.team.length < TW.teamMax){ R.team.push({ id:v, hp:1 }); S.recruits++; R.pending = null; Tower.set(R); return twAfter(R, `${NAME[v]} rejoint ton équipe !`); }
    twReplace(R, v);
  });
  twOn('twnx', () => twFloor()); twOn('twm', showMain);
}
function twReplace(R, nid){
  menu(`<div class='hd' data-twscene><h1>Qui laisse sa place ?</h1></div><p class='twq'>${thumb(nid)} <b>${esc(NAME[nid])}</b> remplace…</p>
    <div class='twopts'>${R.team.map((m, i) => `<button class='twopt ${m.hp <= 0 ? 'ko' : ''}' data-rp='${i}'>${thumb(m.id)}<b>${esc(NAME[m.id])}</b>${twHp(m.hp)}${R.items[m.id] ? `<small>son objet retourne dans le sac</small>` : ''}</button>`).join('')}</div>
    <div class='row'><button class='btn2' id='bk'>Retour</button></div>`);
  bindAll('[data-rp]', el => { const i = +el.dataset.rp, old = R.team[i]; if(R.items[old.id]){ (R.bag = R.bag || []).push(R.items[old.id]); delete R.items[old.id]; }
    R.team[i] = { id:nid, hp:1 }; Tower.stats().recruits++; R.pending = null; Tower.set(R); twAfter(R, `${NAME[nid]} remplace ${NAME[old.id]} !`); });
  twOn('bk', () => twAfter(R));
}
function twEnd(R, why){
  const f = Math.max(0, R.floor - 1), team = R.team.map(m => m.id).join(','), S = Tower.stats();
  S.runs++; S.last = { f, team }; Tower.set(null); if(f) Tower.record(f, team); else Save.save(); G = null;
  const best = Tower.best();
  menu(`<div class='hd' data-twscene><h1>${why === 'ko' ? 'Ton équipe est K.O.' : 'Fin de la tour'}</h1></div>
    <p>${why === 'abandon' ? 'Tu as quitté un combat : la tour est terminée.<br>' : ''}Tu es arrivé à l'<b>étage ${f}</b>${f && f >= best ? ' — <b class="gold">nouveau record !</b>' : ` (record : étage ${best})`}</p>
    <p class='twgain'>${twI('coins')} Gains de la tour : ${money(R.coins || 0)}</p>${twTeamView(R)}
    <div class='row'><button class='btn' id='twr'>Retour à la tour</button><button class='btn2' id='twm'>Menu</button></div>`);
  twOn('twr', showTower); twOn('twm', showMain);
}
if(!MAIN_MENU.some(m => m.id === 'tower')){ const i = MAIN_MENU.findIndex(m => m.id === 'solo'); MAIN_MENU.splice(i + 1, 0, { id:'tower', label:'Tour de Combat', desc:'Mode infini : monte le plus haut possible', screen:'tower' }); }

// ---------------------------------------------------------------- fond animé : la tour dans l'orage
const TWS = { L:null, t:0, parts:[], bolt:null, nextBolt:3, flash:0 };
function twsBrick(x, X, Y, w, h, base, hi, lo, seed){
  x.fillStyle = base; x.fillRect(X, Y, w, h);
  let s = seed || 7; const rnd = () => (s = (s*9301 + 49297) % 233280)/233280;
  for(let y = Y; y < Y + h; y += 6){ const off = ((y - Y)/6 % 2) ? 5 : 0; for(let bx = X - off; bx < X + w; bx += 10){ const v = rnd();
    x.fillStyle = v < .33 ? hi : v < .66 ? base : lo; x.fillRect(Math.max(X, bx), y, Math.min(9, X + w - Math.max(X, bx)), 5); } }
}
function twsBuild(){
  const L = {};
  // ciel orageux
  const [c, x] = mkcv(VW, VH), g = x.createLinearGradient(0, 0, 0, VH);
  g.addColorStop(0, '#08060f'); g.addColorStop(.45, '#1a1230'); g.addColorStop(.8, '#2e2440'); g.addColorStop(1, '#151020');
  x.fillStyle = g; x.fillRect(0, 0, VW, VH);
  const gl = x.createRadialGradient(470, 120, 10, 470, 120, 260); gl.addColorStop(0, 'rgba(150,200,140,.18)'); gl.addColorStop(1, 'rgba(150,200,140,0)'); x.fillStyle = gl; x.fillRect(0, 0, VW, VH);
  // tours lointaines
  [[300, 120, 46, '#141022'], [628, 60, 70, '#110d1c']].forEach(([cx, top, w, col]) => {
    x.fillStyle = col; x.fillRect(cx - w/2, top, w, VH - top); for(let k = 0; k < 4; k++) x.fillRect(cx - w/2 + k*(w/4) + 1, top - 8, w/8, 8);
    for(let y = top + 20; y < VH - 40; y += 34){ x.fillStyle = Math.random() < .5 ? '#3a2a20' : '#1e1828'; x.fillRect(cx - 4, y, 8, 10); }
  });
  L.sky = c;
  // la grande tour (plus haute que l'écran : on la fait défiler doucement)
  const TH = 760, [t, tx] = mkcv(170, TH); L.th = TH;
  twsBrick(tx, 16, 0, 138, TH, '#3a3448', '#4c4560', '#2a2536', 11);
  tx.fillStyle = 'rgba(0,0,0,.35)'; tx.fillRect(16, 0, 18, TH); tx.fillStyle = 'rgba(255,255,255,.05)'; tx.fillRect(136, 0, 18, TH);
  L.win = [];
  for(let y = 20, k = 0; y < TH - 40; y += 64, k++){
    tx.fillStyle = '#1e1a28'; tx.fillRect(4, y + 50, 162, 8); tx.fillStyle = '#5a5470'; tx.fillRect(4, y + 50, 162, 2); tx.fillStyle = '#14101c'; tx.fillRect(4, y + 57, 162, 2);
    tx.fillStyle = '#16121e'; tx.fillRect(58, y + 6, 54, 42); tx.fillStyle = '#5a5470'; tx.fillRect(56, y + 4, 58, 3); tx.fillRect(56, y + 4, 3, 44); tx.fillRect(111, y + 4, 3, 44);
    tx.fillStyle = '#0c0912'; tx.fillRect(59, y + 7, 52, 40);
    [[30, '#8a3ae8'], [128, '#8a3ae8']].forEach(([bx, col]) => { tx.fillStyle = '#ffd23f'; tx.fillRect(bx - 1, y + 12, 14, 22); tx.fillStyle = col; tx.fillRect(bx, y + 13, 12, 18); tx.beginPath(); tx.moveTo(bx, y + 31); tx.lineTo(bx + 6, y + 36); tx.lineTo(bx + 12, y + 31); tx.fill(); });
    L.win.push({ y:y + 7, id:ORDER[k % ORDER.length] });
  }
  L.tower = t;
  // rochers en pointes au premier plan
  const [r, rx] = mkcv(VW, VH);
  const spike = (bx, w, h, col) => { rx.fillStyle = col; rx.beginPath(); rx.moveTo(bx - w/2, VH); rx.lineTo(bx - w*.1, VH - h); rx.lineTo(bx + w*.15, VH - h*.9); rx.lineTo(bx + w/2, VH); rx.fill(); };
  [[330, 60, 120], [380, 40, 70], [580, 80, 150], [640, 60, 100], [250, 50, 60]].forEach(([b, w, h]) => spike(b, w, h, '#0e0b16'));
  rx.fillStyle = '#0b0912'; rx.fillRect(0, VH - 26, VW, 26);
  L.rocks = r;
  TWS.L = L;
  TWS.clouds = Array.from({ length:7 }, (_, i) => ({ x:Math.random()*VW, y:20 + Math.random()*120, w:120 + Math.random()*160, s:4 + Math.random()*8, a:.18 + Math.random()*.2 }));
}
function drawTowerScene(dt){
  if(!TWS.L) twsBuild();
  const L = TWS.L, t = TWS.t += dt;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.drawImage(L.sky, 0, 0);
  // nuages qui dérivent
  TWS.clouds.forEach(cl => { cl.x += cl.s*dt; if(cl.x - cl.w > VW) cl.x = -cl.w; ctx.fillStyle = `rgba(60,52,80,${cl.a})`; ctx.beginPath(); ctx.ellipse(cl.x, cl.y, cl.w/2, 16, 0, 0, 6.283); ctx.fill(); ctx.beginPath(); ctx.ellipse(cl.x + cl.w*.2, cl.y - 8, cl.w/3, 12, 0, 0, 6.283); ctx.fill(); });
  // éclair
  TWS.nextBolt -= dt;
  if(TWS.nextBolt <= 0){ const bx = 200 + Math.random()*420, pts = [[bx, 0]]; let y = 0, xx = bx; while(y < 200){ y += 12 + Math.random()*18; xx += (Math.random() - .5)*34; pts.push([xx, y]); } TWS.bolt = { pts, t:.35 }; TWS.flash = .5; TWS.nextBolt = 3.5 + Math.random()*5; }
  if(TWS.bolt){ const B = TWS.bolt; B.t -= dt; ctx.strokeStyle = `rgba(230,240,255,${Math.max(0, B.t/.35)})`; ctx.lineWidth = 2; ctx.beginPath(); B.pts.forEach(([a, b], i) => i ? ctx.lineTo(a, b) : ctx.moveTo(a, b)); ctx.stroke(); if(B.t <= 0) TWS.bolt = null; }
  // la tour : elle monte lentement (on « regarde » vers le sommet)
  const scroll = (Math.sin(t*.08) + 1)/2*(L.th - VH + 30), ox = 470 - 85, oy = -scroll;
  ctx.drawImage(L.tower, ox, oy);
  L.win.forEach((w, i) => {
    const wy = oy + w.y; if(wy < -50 || wy > VH) return;
    const fl = .55 + .25*Math.sin(t*6 + i*1.7) + .1*Math.sin(t*13 + i);
    ctx.fillStyle = `rgba(255,150,60,${.18*fl})`; ctx.fillRect(ox + 59, wy, 52, 40);
    const im = SPR[w.id] ? spr(w.id) : null;
    if(im){ const s = Math.min(36/im.width, 36/im.height), bob = Math.sin(t*1.5 + i)*1; ctx.globalAlpha = .9; ctx.drawImage(im, Math.round(ox + 85 - im.width*s/2), Math.round(wy + 40 - im.height*s + bob), Math.round(im.width*s), Math.round(im.height*s)); ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgba(20,10,30,.35)'; ctx.fillRect(ox + 59, wy, 52, 40); }
    ctx.fillStyle = `rgba(255,200,120,${.5*fl})`; ctx.fillRect(ox + 62, wy + 38, 46, 2);
  });
  // pluie
  ctx.strokeStyle = 'rgba(170,180,220,.18)'; ctx.lineWidth = 1; ctx.beginPath();
  for(let i = 0; i < 70; i++){ const rx = (i*97 + t*260) % (VW + 40) - 20, ry = (i*53 + t*420) % (VH + 20) - 10; ctx.moveTo(rx, ry); ctx.lineTo(rx - 4, ry + 10); } ctx.stroke();
  // braises qui montent
  if(TWS.parts.length < 50 && Math.random() < .4) TWS.parts.push({ x:Math.random()*VW, y:VH + 4, vx:(Math.random() - .5)*10, vy:-18 - Math.random()*24, life:5 + Math.random()*3 });
  for(let i = TWS.parts.length - 1; i >= 0; i--){ const p = TWS.parts[i]; p.life -= dt; p.x += (p.vx + Math.sin(t + i)*6)*dt; p.y += p.vy*dt; if(p.life <= 0 || p.y < -10){ TWS.parts.splice(i, 1); continue; }
    ctx.fillStyle = `rgba(255,${150 + (i % 3)*30},60,${Math.min(1, p.life/2)*.8})`; ctx.fillRect(p.x | 0, p.y | 0, 2, 2); }
  ctx.drawImage(L.rocks, 0, 0);
  // flash de l'éclair + vignette
  if(TWS.flash > 0){ TWS.flash -= dt*1.6; ctx.fillStyle = `rgba(200,220,255,${Math.max(0, TWS.flash)*.35})`; ctx.fillRect(0, 0, VW, VH); }
  const vg = ctx.createRadialGradient(VW*.66, VH*.5, VH*.25, VW*.66, VH*.5, VW*.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.6)'); ctx.fillStyle = vg; ctx.fillRect(0, 0, VW, VH);
  ctx.restore();
}
drawMenuScene = (prev => function(dt){ return MBG.scene === 'tower' ? drawTowerScene(dt) : prev(dt); })(drawMenuScene);
menu = (prev => function(h){
  const was = MBG.scene;
  prev(h);
  const m = document.getElementById('menu'), tw = !G && !!h && h.includes('data-twscene');
  m.classList.toggle('twscene', tw);
  if(!tw) return;
  MBG.scene = 'tower'; m.classList.add('mscene');
  if(was !== 'tower'){ m.classList.remove('swin'); void m.offsetWidth; m.classList.add('swin'); if(typeof musicSet === 'function') musicSet('menu'); }
})(menu);

document.head.insertAdjacentHTML('beforeend', `<style>
#menu.twscene h1{background:linear-gradient(180deg,#fffbe6 0%,#ffe27a 45%,#ffb020 75%,#c86a10 100%);-webkit-background-clip:text;background-clip:text;filter:drop-shadow(2px 2px 0 #2a0e04) drop-shadow(0 0 10px rgba(255,170,60,.45))}
#menu.twscene h1::after{background:linear-gradient(90deg,#ffd23f,transparent)}
#menu.twscene .mc>*{max-width:66%}
.twscene button,.twscene .twm,.twscene small,.twscene p{font-family:var(--font)}
.twi{width:20px;height:20px;vertical-align:middle;image-rendering:auto}.twi.big{width:40px;height:40px}
.twhome{gap:8px}.twhome .left{flex:0 0 62%}.twhome .right{flex:1 1 auto}
.twrec{display:flex;align-items:center;gap:10px;padding:8px 10px;border:2px solid #8a5a20;border-radius:10px;background:linear-gradient(180deg,rgba(58,20,32,.75),rgba(26,10,20,.75));box-shadow:inset 0 0 0 1px #2a0a10}
.twrec div{display:flex;flex-direction:column;align-items:flex-start}.twrec small{font-size:9px;letter-spacing:3px;color:var(--txt2,#c9bcd8)}.twrec b{font-size:20px;color:#ffe27a}.twrt img{width:30px;height:30px;image-rendering:pixelated}
.twsts{display:grid;grid-template-columns:repeat(3,1fr);gap:5px;margin:7px 0}.twst{display:flex;flex-direction:column;align-items:center;padding:5px 2px;border:1px solid rgba(255,210,63,.25);border-radius:8px;background:rgba(20,10,30,.6)}
.twst b{font-size:14px;color:#fff3c8}.twst small{font-size:9px;color:var(--txt2,#c9bcd8)}.twst .twi{width:26px;height:26px}
.twlast{font-size:11px;margin:2px 0 6px;display:flex;align-items:center;gap:4px;justify-content:center}.twlast img{width:22px;height:22px;image-rendering:pixelated}
.twrun{margin:4px 0;padding:6px;border:1px solid #8a5a20;border-radius:8px;background:rgba(58,20,32,.5);font-size:12px}
.twlbt{font-size:13px;color:#ffe27a;margin:0 0 4px}
.twteam{display:flex;flex-wrap:wrap;gap:6px;justify-content:center;margin:6px 0}
.twm{position:relative;width:84px;padding:4px 3px;border-radius:10px;border:2px solid #5a3a24;background:linear-gradient(180deg,rgba(58,26,80,.85),rgba(26,12,40,.85));display:flex;flex-direction:column;align-items:center;gap:1px}
.twm img{width:42px;height:42px;image-rendering:pixelated}.twm b{font-size:10px;font-weight:600}
.twhp{display:block;width:66px;height:5px;background:#2a2146;border-radius:3px;overflow:hidden;margin-top:2px;border:1px solid #14101c}.twhp u{display:block;height:100%}
.twm.lead{border-color:#ffd23f;box-shadow:0 0 8px rgba(255,210,63,.45)}.twm.ko{filter:grayscale(1);opacity:.5}
.twm .twit{position:absolute;top:3px;right:3px}.twm .twit img{width:18px;height:18px}
.twn{position:absolute;top:3px;left:5px;font-size:10px;color:#ffe27a}
.twteam.ed .twm{width:104px}.twmr{display:flex;align-items:center;gap:3px;margin-top:3px}
.twa{width:22px;height:22px;padding:0;border-radius:6px;border:1px solid #8a5a20;background:#2a1440;color:#ffe27a;font-size:10px;cursor:pointer}.twa:disabled{opacity:.3;cursor:default}
.twslot{width:30px;height:30px;padding:2px;border-radius:7px;border:2px dashed #8a5a20;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;cursor:pointer;color:#ffe27a}
.twslot img{width:22px;height:22px}.twslot em{font-style:normal;font-size:14px;opacity:.7}.twslot.sel{border-style:solid;border-color:#ffd23f;box-shadow:0 0 8px #ffd23f}.twslot.drop{animation:twdrop 1s ease-in-out infinite}
@keyframes twdrop{50%{border-color:#ffd23f;background:rgba(255,210,63,.2)}}
.twbag{display:flex;align-items:center;gap:5px;justify-content:center;margin:4px auto;padding:4px 10px;border:1px solid #8a5a20;border-radius:10px;background:rgba(20,10,30,.6);font-size:11px;width:max-content;max-width:100%;flex-wrap:wrap}
.twbag.drop{animation:twdrop 1s ease-in-out infinite;cursor:pointer}
.twbs{display:flex;flex-wrap:wrap;gap:4px;justify-content:center;margin:4px 0}.twb{display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:1px 7px 1px 2px;border-radius:9px;background:rgba(255,210,63,.15);color:#ffe9a0}.twb .twi{width:16px;height:16px}
.twnext,.twgain{font-size:13px;margin:4px 0;color:#ffe9a0;display:flex;align-items:center;gap:5px;justify-content:center}.twq{font-size:13px;margin:6px 0 2px;color:#fff3c8}.twq small{font-size:10px;color:var(--txt2,#c9bcd8)}.twq img{width:30px;height:30px;image-rendering:pixelated;vertical-align:middle}
.twopts,.twpick{display:flex;flex-wrap:wrap;gap:7px;justify-content:center;margin:6px 0}
.twopt{width:146px;padding:7px 6px;border-radius:12px;border:2px solid #8a5a20;background:linear-gradient(180deg,#3a1a50,#1c0c28);box-shadow:inset 0 0 0 1px #14081e,0 3px 0 #120818;color:#fff3c8;display:flex;flex-direction:column;align-items:center;gap:3px;cursor:pointer;font-family:var(--font)}
.twopt:hover{border-color:#ffd23f;transform:translateY(-1px)}.twopt b{font-size:12px;color:#ffe27a;font-weight:700}.twopt small{font-size:9px;line-height:1.25;color:#e8dcf4}.twopt img{width:46px;height:46px;image-rendering:pixelated}.twopt .twi.big{width:40px;height:40px;image-rendering:auto}
.twopt em{font-style:normal;font-size:22px;color:#ff8a7a}.twopt.skip{width:112px;opacity:.85}.twopt.ko{filter:grayscale(.8)}
.twpick .twopt{width:104px}
.twrules{max-width:560px;text-align:left}.twrules p{font-size:11px;display:flex;gap:8px;align-items:flex-start;margin:5px 0}.twrules .twi{width:26px;height:26px;flex:0 0 26px}
.twlb{list-style:none;margin:0;padding:0;font-size:11px}.twlb li{display:flex;align-items:center;gap:5px;padding:2px 4px;border-radius:5px}.twlb li:nth-child(odd){background:rgba(255,255,255,.05)}.twlb li.me{background:rgba(255,210,63,.18)}
.twlb b{flex:1;text-align:left}.twlb em{font-style:normal;color:#ffd23f;font-weight:700}.twlb .tth img{width:18px;height:18px;image-rendering:pixelated}
</style>`);
