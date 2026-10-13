// ============================================================
//  boss-defi.js — DÉFI : MEWTWO en 3 difficultés (réglages : data/boss-defi.js)
//    • Première victoire dans une difficulté : Pokédollars + une carte Mewtwo « ÉDITION LIMITÉE »
//      (Normal → commune, Difficile → peu commune, Extrême → rare). Une seule fois par difficulté.
//    • Les cartes Mewtwo ont leur page dans le Classeur, avec un cadre argenté spécial.
//  Remplace l'écran « Défi : Mewtwo » de js/boss.js (à charger APRÈS js/boss.js et js/shop.js).
// ============================================================
const BOSS_TEAM_MAX = 3;                         // le défi se joue avec 3 Pokémon maximum
const LIMITED = { mewtwo:BOSS_DIFFS.map(d => ({ r:d.card, diff:d.id, label:d.label })) };
const diffOf = id => BOSS_DIFFS.find(d => d.id === id) || BOSS_DIFFS[0];
const limCardId = (pid, diff) => `card:${pid}:${diffOf(diff).card}`;
const BossWins = {
  all(){ const d = Save.load(); if(!d.bossWins) d.bossWins = {}; return d.bossWins; },
  has(pid, diff){ return !!this.all()[pid + ':' + diff]; },
  mark(pid, diff, time){ const w = this.all(), k = pid + ':' + diff; w[k] = { t:Date.now(), time:Math.min(time, (w[k] && w[k].time) || 1e9) }; Save.save(); },
  best(pid, diff){ const w = this.all()[pid + ':' + diff]; return w && w.time; }
};
const CARD_FEM = { C:'commune', PC:'peu commune', R:'rare', UR:'ultra rare' };
const mmss = s => Math.floor(s/60) + ':' + String(Math.floor(s)%60).padStart(2, '0');

// ---------- cartes « édition limitée » dans le catalogue ----------
const _shopBuildLim = shopBuild;
shopBuild = function(){
  _shopBuildLim();
  for(const pid in LIMITED){
    if(!POKEMON[pid]) continue;
    LIMITED[pid].forEach(L => {
      const id = `card:${pid}:${L.r}`, src = `boss:${pid}:${L.diff}`;
      CRATE[src] = CRATE[src] || { name:`Défi : ${NAME[pid] || POKEMON[pid].name} — ${L.label} (1re victoire)` };
      ITEM[id] = { id, kind:'card', poke:pid, name:'Carte ' + (NAME[pid] || POKEMON[pid].name) + ' (édition limitée)', r:L.r, crates:[src], limited:true, diff:L.label };
    });
  }
};
const _cardHtmlLim = cardHtml;
cardHtml = function(it, s){
  const h = _cardHtmlLim(it, s), L = it && ITEM[it.id] && ITEM[it.id].limited ? ITEM[it.id] : null;
  if(!L) return h;
  return h.replace("class='cw ", "class='cw lim ")
          .replace(/<div class='tf'><span>[^<]*<\/span>/, `<div class='tf'><span class='ltx'>ÉD. LIMITÉE · ${esc(L.diff.toUpperCase())}</span>`)
          .replace("<u class='rb'>", "<i class='lrb'>ÉDITION LIMITÉE</i><u class='rb'>");
};
// Classeur : ajoute la page des Pokémon à cartes limitées (Mewtwo)
const _binderLim = binderBody;
binderBody = function(o, inv){
  const extra = Object.keys(LIMITED).filter(pid => POKEMON[pid] && !ORDER.includes(pid));
  ORDER.push(...extra);
  try{
    let h = _binderLim(o, inv);
    extra.forEach(pid => { h = h.replace(`<span>#${String(ORDER.indexOf(pid) + 1).padStart(2, '0')}</span> ${esc(NAME[pid])}`, `<span>★</span> ${esc(NAME[pid])} <small class='ltx2'>édition limitée</small>`); });
    return h;
  } finally { ORDER.splice(ORDER.length - extra.length, extra.length); }
};

// ---------- écran du défi ----------
const mm = MAIN_MENU.find(m => m.id === 'boss'); if(mm) mm.desc = '3 difficultés · cartes en édition limitée';
function showBossDefi(sel){
  sel = sel || {};
  if(!BOSSES.includes('mewtwo')) return showBoss();                       // message « sprites introuvables » de js/boss.js
  const teams = Save.teams().filter(t => teamOk(t) && t.members.length <= BOSS_TEAM_MAX);
  if(!teams.length){ menu(`<h1>Défi : Mewtwo</h1><p>Le défi se joue avec une équipe de ${BOSS_TEAM_MAX} Pokémon maximum.</p><p>Crée une équipe 3v3 dans Mes équipes.</p><div class='row'><button class='btn' id='mk'>Mes équipes</button><button class='btn2' id='back'>Retour</button></div>`); document.getElementById('mk').onclick = showTeams; document.getElementById('back').onclick = showMain; return; }
  shopBuild();
  const t = sel.team || teams.find(x => x.id === Save.lastTeam) || teams[0];
  const D = diffOf(sel.diff || Save.load().bossDiff || BOSS_DIFFS.find(d => !BossWins.has('mewtwo', d.id))?.id), P = POKEMON.mewtwo;
  const it = ITEM[limCardId('mewtwo', D.id)], won = BossWins.has('mewtwo', D.id), best = BossWins.best('mewtwo', D.id);
  menu(`<div class='hd'><h1>Défi : Mewtwo</h1>${walletHtml()}</div>
    <div class='row'>${BOSS_DIFFS.map(d => `<button class='btn2 ${d.id === D.id ? 'on' : ''}' data-diff='${d.id}' style='border-color:${d.col}'>${BossWins.has('mewtwo', d.id) ? '✔ ' : ''}${d.label}</button>`).join('')}</div>
    <div class='edit bdefi'>
      <div class='left bcard ${won ? '' : 'lockc'}'>${it ? cardHtml(it, .62) : ''}</div>
      <div class='scroll right'>
        <p><b style='color:${D.col}'>${D.label}</b> — PV de Mewtwo ×${(D.stage.hp*D.stage.boss).toFixed(1)}, dégâts ×${D.stage.dmg}</p>
        ${won ? `<p class='ok'>✔ Récompense obtenue${best ? ' · meilleur temps ' + mmss(best) : ''}</p>`
              : `<p>Première victoire : <b class='gold'>+${money(D.coins)}</b> et la carte <b style='color:${RAR[D.card].col}'>${CARD_FEM[D.card]}</b> de Mewtwo en <b>édition limitée</b>.</p>`}
        <p class='abl'><i>${esc(P.ability.name)}</i> : ${esc(P.ability.desc)}</p>
        ${P.moves.map(m => `<p class='mvl'><b>${esc(m.name)}</b> — ${esc(m.desc || '')}</p>`).join('')}
      </div></div>
    <div class='row'>${teams.map(x => `<button class='btn2 sm ${x.id === t.id ? 'on' : ''}' data-team='${x.id}'>${esc(x.name)} (${x.members.length})</button>`).join('')}</div>
    <div class='row'><button class='btn' id='go'>Combattre (${D.label})</button><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-diff]', el => { Save.load().bossDiff = el.dataset.diff; Save.save(); showBossDefi({ team:t, diff:el.dataset.diff }); });
  bindAll('[data-team]', el => showBossDefi({ team:Save.team(el.dataset.team), diff:D.id }));
  document.getElementById('go').onclick = () => startBoss(t, D.id);
  document.getElementById('back').onclick = showMain;
}
SCREENS.boss = showBossDefi;

// ---------- lancement : réglages + cerveau de Mewtwo selon la difficulté ----------
const AI_BASE = POKEMON.mewtwo ? { ...POKEMON.mewtwo.ai } : null;
function setBossAI(D){ if(AI_BASE && POKEMON.mewtwo) POKEMON.mewtwo.ai = { ...AI_BASE, ...((D && D.ai) || {}) }; }
startBoss = function(team, diff){
  const D = diffOf(diff); Save.lastTeam = team.id;
  start({ mode:'boss', diff:D.id, team:team.members.slice(0, BOSS_TEAM_MAX), size:team.size, teamId:team.id, stage:D.stage, arena:D.stage.arena, enemies:['mewtwo'] });
};
const _startLim = start;
start = function(cfg){ setBossAI(cfg && cfg.mode === 'boss' ? diffOf(cfg.diff) : null); const r = _startLim(cfg);
  if(cfg && cfg.mode === 'boss' && typeof musicSet === 'function') musicSet('boss');      // musique de boss pour Mewtwo
  return r; };

// ---------- fin du combat : récompenses de la première victoire ----------
const _battleEndLim = battleEnd;
battleEnd = function(win){
  const c = G.cfg; if(c.mode !== 'boss' || !c.diff) return _battleEndLim(win);
  const t = Save.team(c.teamId), D = diffOf(c.diff), s = G.time, i = BOSS_DIFFS.indexOf(D), nx = BOSS_DIFFS[i + 1];
  const first = win && !BossWins.has('mewtwo', D.id), before = Save.coins();
  let rew = '';
  if(win){
    BossWins.mark('mewtwo', D.id, s);
    if(first){
      shopBuild(); const cid = limCardId('mewtwo', D.id); Save.addCoins(D.coins); Save.addItem(cid, 1);
      rew = `<div class='gain'><b>+${money(D.coins)}</b><small>Première victoire en ${D.label}</small></div>
        <div class='bwin'>${cardHtml(ITEM[cid], .8)}<p><b>Nouvelle carte !</b><br>Carte ${CARD_FEM[D.card]} de Mewtwo<br><span class='ltx2'>édition limitée</span></p></div>
        <p>Solde : <span id='gsol'>${money(before)}</span></p>`;
    } else rew = `<p>Récompense de cette difficulté déjà obtenue.</p>`;
  }
  menu(`<h1>${win ? '🏆 Mewtwo est vaincu !' : 'Défaite'} <small>${D.label}</small></h1>
    <p>${win ? 'Temps : ' + mmss(s) : 'PV restants de Mewtwo : ' + Math.round(Math.max(0, G.e.hp)/G.e.max*100) + ' %'}</p>${rew}
    <div class='row'>${win && nx ? `<button class='btn' id='nx'>Essayer en ${nx.label}</button>` : ''}
    <button class='${win && nx ? 'btn2' : 'btn'}' id='rp'>${win ? 'Rejouer' : 'Réessayer'}</button>
    ${first ? `<button class='btn2' id='cl'>Voir le classeur</button>` : ''}<button class='btn2' id='mn'>Menu</button></div>`);
  if(first){ playSfx('crit'); countUp(document.getElementById('gsol'), before, Save.coins()); }
  const b = (id, fn) => { const el = document.getElementById(id); if(el) el.onclick = fn; };
  b('nx', () => startBoss(t, nx.id)); b('rp', () => startBoss(t, D.id)); b('mn', showMain);
  b('cl', () => showInventory({ tab:'binder', sel:limCardId('mewtwo', D.id), back:() => showBossDefi({ team:t, diff:D.id }) }));
};

// ---------- styles (cadre argenté + bandeau « édition limitée ») ----------
document.head.insertAdjacentHTML('beforeend', `<style>
.cw.lim .tcg{background:linear-gradient(135deg,#f4f4fa,#b8b0d8 55%,#6a58a8);box-shadow:0 0 0 1px #fff8 inset}
.cw.lim .ta{border-color:#8a7ac8}.cw.lim .ti{background:#e4e0f4;border-color:#8a7ac8}
.cw.lim .lrb{position:absolute;right:-26px;top:14px;width:100px;transform:rotate(38deg);background:linear-gradient(90deg,#3a1468,#8a3ae0,#3a1468);color:#fff;font:900 6px/9px "Courier New",monospace;text-align:center;letter-spacing:.5px;z-index:5;box-shadow:0 1px 2px #0008;font-style:normal;pointer-events:none}
.cw.lim .ltx{font-size:6px;color:#3a1468}
.ltx2{color:#c8a0ff;font-size:10px;font-weight:700}
.bdefi{flex:1 1 auto;min-height:0;align-items:center}.bdefi .bcard{flex:0 0 auto;display:flex;justify-content:center}
.bdefi .right{max-height:100%;font-size:11px}.bdefi .right p{margin:3px 0}.mvl{font-size:10px;opacity:.9}
.lockc .tcg{filter:grayscale(1) brightness(.5)}.lockc .cw::after{content:"?";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:44px;color:#fffa;text-shadow:0 2px 4px #000;z-index:6}
.bwin{display:flex;align-items:center;gap:10px;justify-content:center;text-align:left}.ok{color:#4fd16a}.gold{color:#ffe27a}
</style>`);
