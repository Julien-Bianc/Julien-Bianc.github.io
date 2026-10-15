// ============================================================
//  solo-chapters.js — MODE SOLO EN CHAPITRES (v0.17) — réglages : data/chapters.js
//    • Solo 3v3 et Solo 6v6 : deux modes séparés, chacun sa progression (3 ou 6 adversaires par niveau)
//    • Chapitre 1 « Le Grand Départ » (niveaux 1-10) : uniquement les 7 Pokémon du grand départ
//    • Chapitre 2 « L'Éveil des Titans » (niveaux 11-20) : les autres Pokémon, boss final Mewtwo
// ============================================================
const CH_SIZE = 10;
// ---------- les niveaux des chapitres suivants (générés : de plus en plus durs) ----------
CHAPTERS.forEach((C, ci) => {
  if(!ci || !C.stages) return;
  const arena = a => typeof a === 'number' ? a : a === 'raid' && typeof RAID_ARENA !== 'undefined' ? RAID_ARENA : (typeof WILD !== 'undefined' && WILD[a] != null ? WILD[a] : 5);
  C.stages.forEach((name, i) => {
    const t = i/(C.stages.length - 1), f = x => +x.toFixed(2), k = ci;
    STAGES.push({ name, level:Math.min(5, 3 + Math.ceil((i + 1)/4)), arena:arena(C.arenas[i]), chapter:ci,
      hp:f(1.55 + t*.7 + (k - 1)*.4), dmg:f(1.35 + t*.55 + (k - 1)*.3), speed:f(1 + t*.25), pspeed:f(1.3 + t*.25),
      rate:f(.74 - t*.18), tele:f(.8 - t*.14), aim:1, boss:f(3 + t*.9) });
    ECONOMY.soloWin.push((C.win || [])[i] || 150 + i*20); ECONOMY.firstClear.push((C.first || [])[i] || 300 + i*40);
  });
  for(const n in (C.boss || {})) STAGE_BOSS[ci*CH_SIZE + (+n)] = C.boss[n];
});
STAGES.forEach((S, i) => { if(S.chapter == null) S.chapter = Math.floor(i/CH_SIZE); });
const chapterOf = idx => Math.min(CHAPTERS.length - 1, Math.floor(idx/CH_SIZE));
const chapterPool = ci => (CHAPTERS[ci].pool || []).filter(id => SPR[id] && MV[id]);

// ---------- adversaires : seulement ceux du chapitre, 3 ou 6 selon le mode ----------
let SOLO_CTX = null;
const _startSoloCh = startSolo;
startSolo = function(team, stageIndex){
  SOLO_CTX = { size:team.size === 6 ? 6 : 3, ch:chapterOf(stageIndex) };
  try{ return _startSoloCh(team, stageIndex); } finally { SOLO_CTX = null; }
};
const _enemyTeamCh = enemyTeam;
enemyTeam = function(size){
  if(!SOLO_CTX) return _enemyTeamCh(size);
  let pool = chapterPool(SOLO_CTX.ch); if(!pool.length) pool = ORDER.slice();
  const out = [], n = SOLO_CTX.size; let bag = [];
  for(let i = 0; i < n; i++){ if(!bag.length) bag = pool.slice().sort(() => Math.random() - .5); out.push(bag.pop()); }
  if(typeof PENDING_BOSS !== 'undefined' && PENDING_BOSS && BOSSES.includes(PENDING_BOSS)) out[n - 1] = PENDING_BOSS;
  return out;
};

// ---------- écran Solo ----------
function showSoloCh(sel){
  sel = sel || {};
  const d = Save.load(), size = sel.size || d.soloSize || 3; d.soloSize = size;
  const teams = Save.teams().filter(t => teamOk(t) && t.size === size), cleared = Save.cleared(size);
  const maxCh = Math.min(CHAPTERS.length - 1, Math.floor(Math.min(cleared, STAGES.length - 1)/CH_SIZE));
  const ch = Math.min(sel.ch ?? (d.soloCh && d.soloCh[size] != null ? d.soloCh[size] : maxCh), CHAPTERS.length - 1);
  d.soloCh = d.soloCh || {}; d.soloCh[size] = ch;
  const C = CHAPTERS[ch], locked = ch > maxCh, i0 = ch*CH_SIZE, i1 = Math.min(STAGES.length, i0 + CH_SIZE);
  const stage = Math.max(i0, Math.min(sel.stage ?? Math.min(cleared, i1 - 1), i1 - 1));
  const t = teams.find(x => x.id === (sel.team && sel.team.id)) || teams.find(x => x.id === Save.lastTeam) || teams[0];
  const done = Math.max(0, Math.min(CH_SIZE, cleared - i0));
  menu(`<div class='hd'><h1>Solo</h1><div class='tabs'>${[3, 6].map(n => `<button class='btn2 ${n === size ? 'on' : ''}' data-size='${n}'>Solo ${n}v${n}</button>`).join('')}</div>${walletHtml()}</div>
    <div class='row chtabs'>${CHAPTERS.map((c, i) => `<button class='btn2 sm ${i === ch ? 'on' : ''}' data-ch='${i}'>${i > maxCh ? '🔒 ' : ''}Chapitre ${i + 1} · ${esc(c.name)}</button>`).join('')}</div>
    <div class='chhead'><span class='chpool'>${chapterPool(ch).map(id => thumb(id)).join('')}${Object.values(C.boss || {}).map(id => `<img class='bossmini' src='${spr(id, 1).toDataURL()}'>`).join('')}</span>
      <small>${esc(C.desc)} · ${done}/${CH_SIZE} niveaux</small></div>
    ${locked ? `<p class='hint bad'>Termine le chapitre ${ch} en Solo ${size}v${size} pour débloquer ce chapitre.</p>` : `
    <div class='scroll'><div class='stages'>${STAGES.slice(i0, i1).map((s, k) => { const i = i0 + k, lk = i > cleared, ok = i < cleared;
      return `<button class='stg ${i === stage ? 'on' : ''} ${ok ? 'done' : ''}' data-stage='${i}' ${lk ? 'disabled' : ''}><b>${i + 1}</b><small>${lk ? '🔒' : esc(s.name)}</small><span class='stars'>${'★'.repeat(s.level || 0)}</span>${ok ? `<i class='ck'>✔</i>` : ''}${STAGE_BOSS[i] ? `<i class='bk'>BOSS</i>` : ''}</button>`; }).join('')}</div></div>`}
    ${teams.length ? `<div class='row'>${teams.map(x => `<button class='btn2 sm ${t && x.id === t.id ? 'on' : ''}' data-team='${x.id}'>${esc(x.name)} (${x.members.length}/${x.size})</button>`).join('')}</div>`
      : `<p class='hint bad'>Aucune équipe ${size}v${size} : crée-en une dans Mes équipes.</p>`}
    <div class='row'>${!locked && t ? `<button class='btn' id='go'>Jouer : ${esc(STAGES[stage].name)}</button>` : ''}${teams.length ? '' : `<button class='btn' id='mk'>Mes équipes</button>`}<button class='btn2' id='back'>Retour</button></div>`);
  Save.save();
  bindAll('[data-size]', el => showSoloCh({ size:+el.dataset.size }));
  bindAll('[data-ch]', el => showSoloCh({ size, ch:+el.dataset.ch, team:t }));
  bindAll('[data-team]', el => showSoloCh({ size, ch, stage, team:Save.team(el.dataset.team) }));
  bindAll('[data-stage]', el => showSoloCh({ size, ch, team:t, stage:+el.dataset.stage }));
  const go = document.getElementById('go'); if(go) go.onclick = () => startSolo(t, stage);
  const mk = document.getElementById('mk'); if(mk) mk.onclick = showTeams;
  document.getElementById('back').onclick = showMain;
  const f = document.querySelector('.stg.on'); if(f) f.scrollIntoView({ block:'nearest' });
}
showSolo = showSoloCh; SCREENS.solo = showSoloCh;
{ const m = MAIN_MENU.find(x => x.id === 'solo'); if(m) m.desc = '2 chapitres · Solo 3v3 et Solo 6v6'; }
document.head.insertAdjacentHTML('beforeend', `<style>
.chtabs .btn2{max-width:48%;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.chhead{display:flex;flex-direction:column;align-items:center;gap:1px;margin:1px 0}.chhead small{font-size:10px;color:var(--txt2,#c9bcd8)}
.chpool img{width:26px;height:26px;image-rendering:pixelated}.chpool .bossmini{filter:drop-shadow(0 0 4px #c070ff)}
.stg{position:relative}.stg.done{border-color:rgba(106,224,138,.6)!important}
.stg .ck{position:absolute;right:3px;top:1px;font-size:9px;color:#6ae08a;font-style:normal}
.stg .bk{position:absolute;left:3px;top:1px;font-size:7px;color:#e0b0ff;font-style:normal;font-weight:700}
</style>`);
