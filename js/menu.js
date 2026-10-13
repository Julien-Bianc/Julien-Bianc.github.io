// ============================================================
//  ÉCRANS DU MENU : principal, équipes (liste + éditeur), solo.
//  Le menu principal est piloté par data/menu.js (MAIN_MENU) ; les écrans sont enregistrés dans SCREENS.
// ============================================================
const SCREENS = {};
let MENU_WARN = '';
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));
const thumb = id => ORDER.includes(id) ? `<img src='${spr(id).toDataURL()}'>` : '';
// miniature + petite icône de l'objet tenu
const thumbH = (id, itemId) => `<span class='th2'>${thumb(id)}${itemId && HELD_BY_ID[itemId] ? `<img class='hi' src='${heldImg(HELD_BY_ID[itemId])}'>` : ''}</span>`;
const bindAll = (sel, fn) => document.querySelectorAll(sel).forEach(el => el.onclick = () => fn(el));
const teamOk = t => t.members.length >= 1 && t.members.length <= t.size && t.members.every(id => ORDER.includes(id));   // de 1 à 3 (3v3) ou de 1 à 6 (6v6) Pokémon

function showMain(){
  G = null;
  menu(`<div class='hd'><h1>Arène des Créatures</h1>${walletHtml()}</div><div class='mlist'>${MAIN_MENU.map(m =>
    `<button class='mbtn' data-id='${m.id}' ${m.soon ? 'disabled' : ''}><b>${m.label}</b><small>${m.soon ? 'Bientôt' : m.desc}</small></button>`).join('')}</div>${MENU_WARN}<p class='ver'>v${GAME_VERSION}</p>`);
  bindAll('.mbtn', el => {
    const it = MAIN_MENU.find(m => m.id === el.dataset.id), fn = SCREENS[it.screen];
    if(fn) fn(); else console.warn('Écran inconnu : ' + it.screen);
  });
}
function pick(){ showMain(); }          // (nom historique utilisé par le moteur)

// ---------- Mes équipes ----------
function showTeams(){
  const teams = Save.teams();
  menu(`<h1>Mes équipes</h1><div class='scroll'>${teams.length ? teams.map(t => `
    <div class='trow'><div class='tinfo'><b>${esc(t.name)}</b> <span class='tag'>${t.size}v${t.size}</span>${teamOk(t) ? (t.members.length < t.size ? ` <span class='tag'>${t.members.length}/${t.size}</span>` : '') : ' <span class="tag bad">vide</span>'}
    <div class='tmem'>${t.members.map(id => thumbH(id, Save.teamItem(t, id))).join('')}</div></div>
    <button class='btn2' data-edit='${t.id}'>Modifier</button><button class='btn2' data-del='${t.id}'>✕</button></div>`).join('') : '<p>Aucune équipe.</p>'}</div>
    <div class='row'><button class='btn2' data-new='3'>+ Équipe 3v3</button><button class='btn2' data-new='6'>+ Équipe 6v6</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-edit]', el => showTeamEditor(Save.team(el.dataset.edit)));
  bindAll('[data-del]', el => { Save.deleteTeam(el.dataset.del); showTeams(); });
  bindAll('[data-new]', el => showTeamEditor({ id:null, name:'Équipe ' + (Save.teams().length + 1), size:+el.dataset.new, members:[], items:{} }));
  document.getElementById('back').onclick = showMain;
}

function pokeDetail(id){
  const D = POKEMON[id]; if(!D) return `<p>${NAME[id] || id}</p>`;
  const bar = (label, v, max, txt) => `<div class='stat'><span>${label}</span><div class='bar'><i style='width:${Math.min(100, v/max*100)}%'></i></div><b>${txt}</b></div>`;
  const chips = D.types.map(t => `<span class='tc' style='background:${COL[t]}'>${TN[t] || t}</span>`).join('');
  const mv = D.moves.map(m => `<div class='mvd'><div class='mvh'><span class='tc' style='background:${(m.color || COL[m.type])}'>${TN[m.type] || m.type}</span><b>${esc(m.name)}</b><small>${KIND_LABEL[m.kind] || m.kind} · puiss. ${m.power} · ${m.cooldown}s</small></div><em>${esc(moveDesc(m))}</em></div>`).join('');
  return `<div class='dh'>${thumb(id)}<div><b>${esc(D.name)}</b><br>${chips}</div></div>
    ${bar('PV', D.hp, 140, D.hp*10)}${bar('Vitesse', D.speed, 230, D.speed)}
    ${D.ability ? `<p class='abl'><b>${esc(D.ability.name)}</b> — ${esc(D.ability.desc)}</p>` : ''}${mv}`;
}
// ---------- objet tenu dans l'éditeur d'équipe ----------
function heldBox(ed){
  const h = HELD_BY_ID[ed.items[ed.focus]];
  return `<div class='held'><span>Objet tenu</span>${h ? `<img src='${heldImg(h)}'><div><b style='color:${RAR[h.r].col}'>${esc(h.name)}</b><small>${esc(h.desc)}</small></div>` : `<div><i>Aucun</i></div>`}
    <button class='btn2 sm' id='hc'>${h ? 'Changer' : 'Équiper'}</button>${h ? `<button class='btn2 sm' id='hx'>✕</button>` : ''}</div>`;
}
function heldPicker(ed){
  const inv = Save.inv(), mine = HELD.filter(h => inv[h.id] > 0).sort((a, b) => RANK[b.r] - RANK[a.r]);
  const takenBy = id => Object.keys(ed.items).find(pid => pid !== ed.focus && ed.items[pid] === id);
  return `<div class='hpk'><b>Objet tenu pour ${esc(NAME[ed.focus])}</b>
    <button class='hit' data-hold=''><div><b>Aucun objet</b></div></button>
    ${mine.length ? mine.map(h => { const tb = takenBy(h.id); return `<button class='hit ${ed.items[ed.focus] === h.id ? 'on' : ''}' data-hold='${h.id}' ${tb ? 'disabled' : ''} style='${rarCss(h.r)}'><img src='${heldImg(h)}'><div><b>${esc(h.name)} <em>×${inv[h.id]}</em></b><small>${tb ? 'Déjà porté par ' + esc(NAME[tb]) : esc(h.desc)}</small></div></button>`; }).join('')
      : `<p>Tu n'as encore aucun objet tenu : ouvre des caisses au Magasin !</p>`}
    <div class='row'><button class='btn2' id='hq'>Annuler</button></div></div>`;
}
function showTeamEditor(team){
  const ed = { id:team.id, name:team.name, size:team.size, members:team.members.filter(id => ORDER.includes(id)), focus:null, pick:false };
  ed.items = {}; ed.members.forEach(id => { const it = Save.teamItem(team, id); if(it) ed.items[id] = it; });
  ed.focus = ed.members[0] || ORDER[0];
  const sync = () => { const el = document.getElementById('tn'); if(el) ed.name = el.value; };
  const render = () => {
    const inTeam = ed.members.includes(ed.focus);
    menu(`<h1>${ed.id ? 'Modifier' : 'Nouvelle'} équipe</h1>
    <div class='row'><input id='tn' value="${esc(ed.name)}" maxlength='18'>
      <button class='btn2 ${ed.size === 3 ? 'on' : ''}' data-size='3'>3v3</button><button class='btn2 ${ed.size === 6 ? 'on' : ''}' data-size='6'>6v6</button>
      ${Array.from({ length:ed.size }, (_, i) => `<div class='slot' data-rm='${i}'>${ed.members[i] ? thumbH(ed.members[i], ed.items[ed.members[i]]) : '+'}</div>`).join('')}</div>
    <div class='edit'>
      <div class='scroll left'><div class='grid2c'>${ORDER.map(id => `<button class='card ${ed.members.includes(id) ? 'sel' : ''} ${id === ed.focus ? 'foc' : ''}' data-add='${id}'>${thumb(id)}<small>${NAME[id]}</small></button>`).join('')}</div></div>
      <div class='scroll right'>${ed.pick && inTeam ? heldPicker(ed) : `<button class='btn2 ${inTeam ? 'on' : ''}' id='tg'>${inTeam ? 'Retirer de l\'équipe' : (ed.members.length < ed.size ? 'Ajouter à l\'équipe' : 'Équipe pleine')}</button>${inTeam ? heldBox(ed) : ''}${pokeDetail(ed.focus)}`}</div>
    </div>
    <div class='row'><button class='btn' id='sv'>Enregistrer (${ed.members.length}/${ed.size})</button><button class='btn2' id='cn'>Annuler</button></div>`);
    bindAll('[data-size]', el => { sync(); ed.size = +el.dataset.size; ed.members = ed.members.slice(0, ed.size); render(); });
    bindAll('[data-rm]', el => { sync(); const id = ed.members.splice(+el.dataset.rm, 1)[0]; delete ed.items[id]; ed.pick = false; render(); });
    bindAll('[data-add]', el => { sync(); ed.focus = el.dataset.add; ed.pick = false; render(); });                // toucher une carte = voir ses statistiques
    const tg = document.getElementById('tg');
    if(tg) tg.onclick = () => {
      sync(); const i = ed.members.indexOf(ed.focus);
      if(i >= 0){ ed.members.splice(i, 1); delete ed.items[ed.focus]; } else if(ed.members.length < ed.size) ed.members.push(ed.focus);
      render();
    };
    // objet tenu
    const hc = document.getElementById('hc'); if(hc) hc.onclick = () => { sync(); ed.pick = true; render(); };
    const hx = document.getElementById('hx'); if(hx) hx.onclick = () => { sync(); delete ed.items[ed.focus]; render(); };
    bindAll('[data-hold]', el => { sync(); const v = el.dataset.hold; if(v) ed.items[ed.focus] = v; else delete ed.items[ed.focus]; ed.pick = false; render(); });
    const hq = document.getElementById('hq'); if(hq) hq.onclick = () => { sync(); ed.pick = false; render(); };
    document.getElementById('sv').onclick = () => { sync(); if(!ed.members.length){ alert('Ajoute au moins 1 Pokémon.'); return; } Save.saveTeam({ id:ed.id, name:ed.name.trim() || 'Équipe', size:ed.size, members:ed.members, items:{ ...ed.items } }); showTeams(); };
    document.getElementById('cn').onclick = showTeams;
  };
  render();
}

function showSolo(sel){
  const teams = Save.teams().filter(teamOk);
  if(!teams.length){
    menu(`<h1>Solo</h1><p>Crée d'abord une équipe (de 1 à 3 Pokémon en 3v3, de 1 à 6 en 6v6).</p><div class='row'><button class='btn' id='mk'>Mes équipes</button><button class='btn2' id='back'>Retour</button></div>`);
    document.getElementById('mk').onclick = showTeams; document.getElementById('back').onclick = showMain; return;
  }
  sel = sel || {};
  const t = sel.team || teams.find(x => x.id === Save.lastTeam) || teams[0];
  const cleared = Save.cleared(t.size), stage = Math.min(sel.stage ?? cleared, STAGES.length - 1);
  menu(`<h1>Solo — ${t.members.length}v${t.members.length}</h1>
    <div class='row'>${teams.map(x => `<button class='btn2 ${x.id === t.id ? 'on' : ''}' data-team='${x.id}'>${esc(x.name)} (${x.members.length}/${x.size})</button>`).join('')}</div>
    <div class='scroll'><div class='stages'>${STAGES.map((s, i) => `<button class='stg ${i === stage ? 'on' : ''}' data-stage='${i}' ${i > cleared ? 'disabled' : ''}><b>${i + 1}</b><small>${i > cleared ? '🔒' : esc(s.name)}</small><span class='stars'>${'★'.repeat(s.level || 0)}</span></button>`).join('')}</div></div>
    <div class='row'><button class='btn' id='go'>Jouer : ${esc(STAGES[stage].name)}</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-team]', el => showSolo({ team:Save.team(el.dataset.team) }));
  bindAll('[data-stage]', el => showSolo({ team:t, stage:+el.dataset.stage }));
  document.getElementById('go').onclick = () => startSolo(t, stage);
  document.getElementById('back').onclick = showMain;
}

SCREENS.solo = showSolo;
SCREENS.teams = showTeams;
