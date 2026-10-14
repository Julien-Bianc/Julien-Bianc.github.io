// ============================================================
//  patch-v012.js — Rapport de test v0.11 (réglages : data/equilibrage.js)
//    1. Magasin : la caisse ne plante plus (contenu des caisses reconstruit s'il manque)
//    2. Récompense de collection : les 3 raretés de cartes d'un même Pokémon → Pokédollars (une fois)
//    3. Plusieurs musiques par situation : dans data/music.js, mets une LISTE de fichiers
//         menu: ['assets/music/menu1.mp3', 'assets/music/menu2.mp3'],
//       → une musique au hasard à chaque fois, puis la suivante quand elle se termine
//    4. Solo : au moins 3 adversaires ; en défaite, un gain partiel par Pokémon battu
//    5. Touches de la Ball (lancer / changer) réglables dans Options → Touches du clavier
//    6. Combats Solo un peu plus durs, Safari bien plus dur
// ============================================================

// ---------- 1. caisses : pools manquants → on reconstruit ----------
const _sbV12 = shopBuild;
shopBuild = function(){
  if(CRATES.some(c => (c.slots || []).some(s => !s.pool))) shopBuild.key = null;   // une caisse ajoutée après coup
  return _sbV12();
};
const _crateV12 = showCrate;
showCrate = function(id){ shopBuild(); (CRATE[id] && CRATE[id].slots || []).forEach(s => { if(!s.pool) s.pool = []; }); return _crateV12(id); };

// ---------- 2. récompense de collection ----------
function toast(html){
  const t = document.createElement('div'); t.className = 'toast'; t.innerHTML = html; document.getElementById('app').appendChild(t);
  setTimeout(() => t.classList.add('out'), 3200); setTimeout(() => t.remove(), 3800);
}
const _addItemV12 = Save.addItem;
Save.addItem = function(id, n){
  const r = _addItemV12.call(this, id, n);
  const m = /^card:([^:]+):/.exec(id);
  if(m && (n || 1) > 0){
    const pid = m[1], d = this.load(); d.setDone = d.setDone || {};
    d.setSeen = d.setSeen || {};
    if(!d.setDone[pid] && !d.setSeen[pid] && CARD_RARITIES.every(rr => this.itemCount(`card:${pid}:${rr}`) > 0)){      // v0.14 : la récompense se récupère dans le Classeur
      d.setSeen[pid] = 1; this.save();
      setTimeout(() => toast(`<b>Collection complète : ${esc(NAME[pid] || pid)} !</b><span style="font-size:11px">🎁 Récupère ta récompense dans le Classeur</span>`), 900);
    }
  }
  return r;
};

// ---------- 3. plusieurs musiques par situation ----------
const _musicFileV12 = musicFile;
musicFile = function(kind){
  const f = _musicFileV12(kind); if(!Array.isArray(f)) return f;
  const L = f.filter(Boolean); if(!L.length) return null; if(L.length === 1) return L[0];
  let pick; do pick = L[Math.floor(Math.random()*L.length)]; while(pick === MU.lastFile && L.length > 1);
  return MU.lastFile = pick;
};
const _playV12 = musicPlayFile;
musicPlayFile = function(kind, url){
  _playV12(kind, url);
  const c = MU.cur, list = typeof MUSIC !== 'undefined' && (MUSIC[kind] || MUSIC[(kind || '').split(':')[0]]);
  if(c && Array.isArray(list) && list.length > 1 && c.el.loop){
    c.el.loop = false;                                                       // à la fin : une autre musique de la liste
    c.el.addEventListener('ended', () => { if(MU.cur === c){ MU.playing = null; musicGo(); } });
  }
};

// ---------- 4. Solo : 3 adversaires minimum + gain partiel en défaite ----------
const _enemyTeamV12 = enemyTeam;
enemyTeam = function(size){ return _enemyTeamV12(Math.max(SOLO_MIN_ENEMIES, size)); };
const _endV12 = battleEnd;
battleEnd = function(win){
  const c = G && G.cfg, beaten = G ? G.wave : 0;
  _endV12(win);
  if(!c || c.mode !== 'solo' || win || beaten <= 0 || !SOLO_DEFEAT_SHARE) return;
  const rw = soloReward(c.stageIndex, beaten, false), gain = Math.max(5, Math.round(rw.win*SOLO_DEFEAT_SHARE/5)*5);
  Save.addCoins(gain);
  const h = document.querySelector('#menu h1');
  if(h) h.insertAdjacentHTML('afterend', `<div class='gain'><b>+${money(gain)}</b><small>${beaten} Pokémon battu${beaten > 1 ? 's' : ''}</small></div>`);
};

// ---------- 5. touches de la Ball ----------
Object.assign(DEFAULT_KEYS, { ball:'KeyE', ballNext:'KeyR' });
Object.assign(KEY_LABELS, { ball:'Lancer une Ball', ballNext:'Changer de Ball' });

// ---------- 6. difficulté ----------
const _startV12 = start;
start = function(cfg){
  const D = cfg && DIFFICULTY[cfg.mode];
  if(D && cfg.stage){
    const S = cfg.stage;
    cfg = { ...cfg, stage:{ ...S, hp:+(S.hp*(D.hp || 1)).toFixed(2), dmg:+(S.dmg*D.dmg).toFixed(2), rate:+(S.rate*D.rate).toFixed(2), tele:+(S.tele*D.tele).toFixed(2), aim:Math.min(1, (S.aim || 0) + D.aim) } };
  }
  return _startV12(cfg);
};

// collections déjà complètes avant la mise à jour : récompense donnée au premier passage au menu
const _mainV12 = showMain;
showMain = function(){
  _mainV12();
  if(showMain.checked || !ORDER.length) return; showMain.checked = true;
  const d = Save.load(); d.setDone = d.setDone || {}; let n = 0;
  [...ORDER, ...(typeof BOSSES !== 'undefined' ? BOSSES : [])].forEach(pid => { if(!d.setDone[pid] && CARD_RARITIES.every(r => Save.itemCount(`card:${pid}:${r}`) > 0)) n++; });
  /* v0.14 : plus de versement automatique, la pastille 🎁 du Classeur s'en charge */
};
// styles de la notification
document.head.insertAdjacentHTML('beforeend', `<style>
.toast{position:absolute;left:50%;top:14%;transform:translateX(-50%);z-index:60;display:flex;flex-direction:column;align-items:center;gap:2px;padding:8px 16px;
  background:linear-gradient(180deg,rgba(54,42,96,.95),rgba(22,16,44,.95));border:2px solid var(--gold,#ffd23f);border-radius:10px;color:#fff;font-family:var(--font,monospace);
  box-shadow:0 0 18px rgba(255,210,63,.45);animation:tin .35s ease-out;pointer-events:none;text-align:center}
.toast b{font-size:13px;color:#ffe9a0}.toast span{font-size:16px;color:#ffe27a;font-weight:700}
.toast.out{opacity:0;transition:opacity .5s}
@keyframes tin{from{transform:translate(-50%,-20px);opacity:0}}
</style>`);
