// ============================================================
//  patch-v025.js — rapport de test n°4 (v0.24.0) → v0.25.0
// ============================================================
// Solo : dégâts ennemis 1,6 → 1,25 (la difficulté vient maintenant du comportement de l'IA, js/ai-brain.js)
DIFFICULTY.solo.dmg = 1.25;
//
//  Ce qui change (détails dans chaque section) :
//    1. Pokémon : Raichu 90 → 100 PV ; Azumarill adversaire : Roulade Aqua annoncée plus tôt et −20 % de dégâts
//    2. Rôles écrits à la main (Lucario Attaquant, Cizayox Attaquant…)
//    3. Récap ×10 des caisses : le nom sous chaque objet
//    4. Badge : la notification attend 2 s après la victoire et se place en bas sur téléphone
//    5. Chapitre 2 : équipes rangées de la plus faible à la plus forte + courbe adoucie (niveaux 6 à 10)
//    6. Fin du chapitre 1 : écran « Chapitre 1 terminé ! » + animation de l'Œuf Mystère donné directement
//    7. Écran du niveau Solo : niveau de l'IA + conseil d'équipe
//    8. 3 défaites d'affilée sur le même niveau Solo → un objet offert
//    9. Pension : notification quand l'œuf est prêt ; chaque victoire avance l'œuf d'1 minute
//   10. Collection : statistiques par Pokémon (combats, victoires, dégâts)
//   11. Mode développeur : « Simuler 20 combats » sur l'écran Solo
//   12. Mes équipes : filtre par rôle (Attaquant, Distance, Tank, Soutien, Rapide)
// ============================================================

// ---------------------------------------------------------------- 1. Pokémon
if(POKEMON.raichu) POKEMON.raichu.hp = 100;
// annonces de l'IA allongées pour certaines attaques (multiplicateur, lu par js/ai-brain.js) — « pokémon:type d'attaque »
const AIB_TELE_X = { 'azumarill:hug':1.3, 'azumarill:roll':1.3 };
hurtP = (prev => function(d, b){ if(b && b.k === 'roll' && !b.own && G && G.e && G.e.t === 'azumarill' && !(G.cfg && G.cfg.mode === 'online')) d *= .8; return prev(d, b); })(hurtP);

// ---------------------------------------------------------------- 2. rôles écrits à la main
const ROLE_DEF = {
  att:{ n:'Attaquant', c:'#e8503a', d:'corps à corps, gros dégâts' },
  dist:{ n:'Distance', c:'#ffb020', d:'attaque de loin' },
  tank:{ n:'Tank', c:'#8a9aaa', d:'beaucoup de PV, encaisse' },
  sout:{ n:'Soutien', c:'#5ad8ff', d:'protège, endort ou affaiblit' },
  rap:{ n:'Rapide', c:'#c86bff', d:'vif, harcèle et esquive' }
};
const ROLES = { farfuret:'rap', dracaufeu:'att', fouinar:'att', tortank:'tank', florizarre:'dist', raichu:'rap', lucario:'att', rondoudou:'sout',
  ectoplasma:'dist', alakazam:'dist', carchacrok:'att', tyranocif:'tank', cizayox:'att', gardevoir:'sout', dracolosse:'att', tartard:'tank', togekiss:'dist', azumarill:'tank' };
pkRole = (prev => function(id){ const D = POKEMON[id], r = (D && D.role) || ROLES[id]; return r && ROLE_DEF[r] ? ROLE_DEF[r] : prev(id); })(pkRole);

// ---------------------------------------------------------------- 3. récap ×10 : nom de l'objet
const v25ItemName = it => !it ? '' : it.kind === 'card' && it.poke ? (it.legend ? 'Légendaire ' : 'Carte ') + (NAME[it.poke] || it.poke) : (it.name || it.id);

// ---------------------------------------------------------------- 4. badges : pas par-dessus « Victoire ! »
badgeToast = (prev => function(list){
  const res = G && G.over || document.querySelector('#menu .gain');
  if(res && !badgeToast.later){ badgeToast.later = 1; setTimeout(() => { badgeToast.later = 0; prev(list); }, 2000); return; }
  return prev(list);
})(badgeToast);

// ---------------------------------------------------------------- 5. chapitre 2 : ordre des équipes + courbe
(() => {
  const C = CHAPTERS[1]; if(!C) return;
  // classées de la plus faible à la plus forte (simulateur « joueur moyen », rapport n°4) — le décor de chaque niveau ne change pas
  const ORD3 = [2, 4, 7, 8, 3, 5, 1, 0, 6, 9];      // v0.26 : équipes 17 et 20 échangées (Ectoplasma, Tyranocif, Carchacrok = boss final)
  if(C.teams3 && C.teams3.length === 10) C.teams3 = ORD3.map(i => C.teams3[i]);
  if(C.teams6 && C.teams6.length === 10) C.teams6 = ORD3.map(i => C.teams6[i]);
  // courbe : l'IA (Expert puis Champion) fait déjà la difficulté → stats moins gonflées en fin de chapitre
  const S = STAGES, r2 = v => +v.toFixed(2);
  const from = { hp:1.08, dmg:.92, rate:.95, tele:.95, aim:.75, boss:2.2 }, to = { hp:1.38, dmg:1.12, rate:.85, tele:.9, aim:1, boss:2.5 };
  for(let i = 10; i < 20 && i < S.length; i++){ const t = (i - 10)/9; Object.keys(from).forEach(k => S[i][k] = r2(from[k] + (to[k] - from[k])*t)); }
})();

// ---------------------------------------------------------------- 6. fin du chapitre 1 : écran + Œuf Mystère donné directement
// l'objectif débutant « Termine le chapitre 1 » ne redonne pas l'œuf s'il a déjà été donné par cet écran
// (v0.26 : l'œuf est maintenant la récompense finale des objectifs du nouvel arrivant — js/patch-v026.js)
function v25Chapter1Scene(){
  const app = document.getElementById('app'); if(!app || document.getElementById('v25egg')) return;
  const egg = typeof PEN !== 'undefined' ? `assets/items/${PEN.egg}.png` : '';
  const C2 = CHAPTERS[1] ? CHAPTERS[1].name : 'Chapitre 2';
  const list = [['📖', `Chapitre 2 : ${C2}`], ['📦', 'Caisse des Titans (Boutique)'], ['🌋', 'Safari des Titans + son ticket'], ['🥚', 'Un Œuf Mystère à faire éclore à la Pension']];
  const parts = Array.from({ length:18 }, (_, i) => `<i style='--a:${i*20}deg;--d:${(i%6)*.12}s'></i>`).join('');
  app.insertAdjacentHTML('beforeend', `<div id='v25egg'><div class='v25in'>
    <h2>Chapitre 1 terminé !</h2>
    <div class='v25stage'><div class='v25glow'></div><div class='v25parts'>${parts}</div><img class='v25e' src='${egg}' alt=''></div>
    <p class='v25got'>Tu as reçu un <b>Œuf Mystère</b> !</p>
    <ul>${list.map(([i, t]) => `<li><span>${i}</span>${esc(t)}</li>`).join('')}</ul>
    <div class='row'><button class='btn' id='v25pen'>Aller à la Pension</button><button class='btn2' id='v25later'>Plus tard</button></div></div></div>`);
  const close = () => { const o = document.getElementById('v25egg'); if(o) o.remove(); };
  document.getElementById('v25pen').onclick = () => { close(); G = null; if(SCREENS.pension) SCREENS.pension(); };
  document.getElementById('v25later').onclick = close;
  if(typeof AU !== 'undefined' && AU.ctx && typeof tone === 'function'){ [523, 659, 784, 1047].forEach((f, i) => tone(f, .3, 'square', .08, 0, 1.1 + i*.11)); tone(1568, .8, 'triangle', .1, 0, 1.6); }
}
battleEnd = (prev => function(win, why){
  const c = G && G.cfg, before = Math.max(Save.cleared(3), Save.cleared(6)), first = !!(win && c && c.mode === 'solo' && c.stageIndex === CH_SIZE - 1 && before < CH_SIZE && !Save.load().v25egg);
  const r = prev(win, why);
  if(first && Math.max(Save.cleared(3), Save.cleared(6)) >= CH_SIZE){
    const d = Save.load(); d.v25egg = 'scene'; Save.save();      // v0.26 : plus d'œuf ici (récompense finale des objectifs)
    setTimeout(v25Chapter1Scene, 1400);
  }
  return r;
})(battleEnd);
// les joueurs qui avaient déjà fini le chapitre 1 ne revoient pas l'écran (l'œuf reste dans l'objectif débutant)
setTimeout(() => { try{ const d = Save.load(); if(!d.v25egg && Math.max(Save.cleared(3), Save.cleared(6)) >= CH_SIZE && !(typeof DEV !== 'undefined' && DEV.is('levels'))){ d.v25egg = 'old'; Save.save(); } }catch(e){} }, 2500);

// ---------------------------------------------------------------- 7. écran du niveau Solo : niveau de l'IA + conseil d'équipe
showSoloCh = (prev => function(sel){
  prev(sel);
  try{
    const on = document.querySelector('.stg.on[data-stage]'); if(!on || on.disabled || typeof AIB === 'undefined') return;
    const i = +on.dataset.stage, lv = AIB.level({ mode:'solo', stageIndex:i });
    let tip = '';
    const tb = document.querySelector("[data-team].on"), t = tb ? Save.team(tb.dataset.team) : null, size = Save.load().soloSize || 3, ch = Math.floor(i/CH_SIZE), C = CHAPTERS[ch];
    let foes = ((C && C['teams' + size]) || [])[i - ch*CH_SIZE] || [];
    if(typeof STAGE_BOSS !== 'undefined' && STAGE_BOSS[i] && !foes.includes(STAGE_BOSS[i])) foes = foes.slice(0, -1).concat(STAGE_BOSS[i]);
    foes = [...new Set(foes.filter(id => HERO[id]))];
    if(t && foes.length && typeof v22Adv === 'function'){
      const sc = id => foes.reduce((a, f) => a + v22Adv(id, f), 0)/foes.length, mem = t.members.filter(id => HERO[id]);
      const worst = mem.slice().sort((a, b) => sc(a) - sc(b))[0], alt = Owned.list().filter(id => HERO[id] && !mem.includes(id)).sort((a, b) => sc(b) - sc(a))[0];
      if(worst && sc(worst) < -.3 && alt && sc(alt) > sc(worst) + .3) tip = `💡 Essaie <b>${esc(NAME[alt] || alt)}</b> à la place de <b>${esc(NAME[worst] || worst)}</b> (meilleurs types contre ce niveau).`;
      else if(mem.every(id => sc(id) >= -.3)) tip = '👍 Bonne équipe pour ce niveau.';
    }
    if(lv >= 3 && !tip) tip = 'Il esquive tes attaques : tire quand il vient de lancer la sienne.';
    const html = `<p class='v25ai'>Adversaire : <b style='color:${AIB.COLS[lv]}'>${AIB.NAMES[lv]}</b>${tip ? ` · <span>${tip}</span>` : ''}</p>`;
    const box = document.querySelector('.v22ty'), tr = tb && tb.closest('.row');
    if(box) box.insertAdjacentHTML('afterend', html); else if(tr) tr.insertAdjacentHTML('afterend', html);
    else { const st = document.querySelector('.stages'); if(st) st.insertAdjacentHTML('afterend', html); }
  }catch(e){ console.warn('v25 ia', e); }
})(showSoloCh);
showSolo = sel => showSoloCh(sel); SCREENS.solo = sel => showSoloCh(sel);

// ---------------------------------------------------------------- 8. 3 défaites d'affilée sur le même niveau → un objet offert
battleEnd = (prev => function(win, why){
  const c = G && G.cfg; let gift = null;
  if(c && c.mode === 'solo'){ const d = Save.load(), L = d.v25lose || {};
    if(win) d.v25lose = {}; else { const n = L.st === c.stageIndex ? (L.n || 0) + 1 : 1; d.v25lose = { st:c.stageIndex, n };
      if(n % 3 === 0){ const pool = HELD.filter(h => (h.r === 'C' || h.r === 'PC') && !h.set && !/^baie-/.test(h.id)); /* v0.26 : pas de baie (même nom que les baies de Concours) */ gift = pool[Math.floor(Math.random()*pool.length)]; if(gift) Save.addItem(gift.id, 1); } }
    Save.save(); }
  const r = prev(win, why);
  if(gift) setTimeout(() => Notif.toast(`🎁 3 défaites sur ce niveau : on t'offre l'objet tenu <b>${esc(gift.name)}</b> ! Donne-le à un Pokémon dans Mes équipes.`, '#ffd23f'), 2600);
  return r;
})(battleEnd);

// ---------------------------------------------------------------- 9. Pension : œuf prêt + chaque victoire avance l'œuf d'1 minute
battleEnd = (prev => function(win, why){
  const c = G && G.cfg; let egg = false;
  try{ if(win && c && c.mode !== 'online' && typeof Pen !== 'undefined'){ const P = Pen.d(); if(P.egg){ P.egg.bonus = (P.egg.bonus || 0) + 60000/PEN_H*PEN.speed; Pen.save(); egg = true; } } }catch(e){}
  const r = prev(win, why);
  if(egg){ let n = 0; const put = () => { const g = document.querySelector('#menu .gain'); if(g){ if(!g.parentNode.querySelector('.v25egg')) g.insertAdjacentHTML('afterend', `<p class='v24st dim v25egg'>🥚 Ton œuf a avancé d'1 minute.</p>`); } else if(n++ < 30) setTimeout(put, 100); }; setTimeout(put, 60); }
  return r;
})(battleEnd);
const v25Dot = () => { const b = document.querySelector(".mmi[data-id='pension']"); if(b) b.classList.toggle('v25dot', !!v25EggReady.on); };
if(typeof renderMainMM === 'function') renderMainMM = (prev => function(){ const r = prev.apply(this, arguments); try{ v25Dot(); }catch(e){} return r; })(renderMainMM);
function v25EggReady(){
  try{ if(typeof Pen === 'undefined') return false; const P = Pen.d(); if(!P.egg) return false; penTick(P); Pen.save(); return penEggLeft(P) <= 0; }catch(e){ return false; }
}
showMain = (prev => function(){
  const r = prev.apply(this, arguments);
  try{ v25EggReady.on = v25EggReady(); v25Dot(); if(v25EggReady.on){ const P = Pen.d();
    if(!P.egg.v25n){ P.egg.v25n = 1; Pen.save(); setTimeout(() => Notif.show({ id:'v25egg', title:'🥚 Ton œuf est prêt à éclore !', text:'Va vite à la Pension pour le voir éclore.', timeout:8, buttons:[{ label:'Aller à la Pension', fn:() => SCREENS.pension && SCREENS.pension() }] }), 900); } } }catch(e){}
  return r;
})(showMain);

// ---------------------------------------------------------------- 10. statistiques par Pokémon (Collection)
battleEnd = (prev => function(win, why){
  try{ const c = G && G.cfg; if(c && c.mode !== 'training' && G.team){ const d = Save.load(), S = d.v25st || (d.v25st = {}), F = G.v23f || {};
    [...new Set(G.team.map(x => x && x.t).filter(Boolean))].forEach(id => { const o = S[id] || (S[id] = { f:0, w:0, dmg:0 }); o.f++; if(win) o.w++; o.dmg += Math.round(((F[id] && F[id].dmg) || 0)*10); });
    Save.save(); } }catch(e){}
  return prev(win, why);
})(battleEnd);
if(typeof pokeDetail === 'function') pokeDetail = (prev => function(id){
  const h = prev(id), o = (Save.load().v25st || {})[id]; if(!o || !o.f) return h + `<p class='v25st'>📊 Pas encore de combat avec ce Pokémon.</p>`;
  return h + `<p class='v25st'>📊 <b>${o.f}</b> combat${o.f > 1 ? 's' : ''} · <b>${o.w}</b> victoire${o.w > 1 ? 's' : ''} (${Math.round(o.w/o.f*100)} %) · <b>${o.dmg}</b> dégâts infligés</p>`;
})(pokeDetail);

// ---------------------------------------------------------------- 11. mode développeur : « Simuler 20 combats » (Solo)
//  Un pilote automatique « joueur moyen » joue le niveau choisi en accéléré (sans image) : tourne autour à ~220 px,
//  lance chaque attaque dès qu'elle est prête, esquive 40 % des annonces. Rien n'est enregistré.
const V25SIM = {
  fight(cfg, P){
    P = P ?? .4; const maxT = 240, dt = 1/60, be = battleEnd; let res = null;
    battleEnd = function(win){ res = { win:!!win, t:G ? G.time : 0 }; if(G) G.over = 1; };
    try{
      G = null; start(cfg); let lastTele = 0, dodgeAt = null, orb = 1, orbT = 0, n = 0;
      while(G && !G.over && G.time < maxT && n++ < maxT*70){
        const p = G.p, e = G.e;
        if(e && p && !G.wait && !(G.intro > 0) && !e.hid){
          const dx = e.x - p.x, dy = e.y - p.y, d = Math.hypot(dx, dy) || 1;
          if(G.time > orbT){ orbT = G.time + 2 + Math.random()*2; if(Math.random() < .4) orb *= -1; }
          let mx = -dy/d*orb, my = dx/d*orb; mx += dx/d*(d - 220)/120; my += dy/d*(d - 220)/120;
          for(const k of ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) keys[k] = false;
          if(mx > .3) keys.KeyD = true; if(mx < -.3) keys.KeyA = true; if(my > .3) keys.KeyS = true; if(my < -.3) keys.KeyW = true;
          for(let i = 0; i < 3; i++) if(p.cd[i] <= 0 && !down[i]){ press(i); rel(i); }
          if(e.tele > 0 && !(lastTele > 0)) dodgeAt = Math.random() < P ? 1 : null;
          if(dodgeAt && e.tele > 0 && e.tele < .16){ dash(); dodgeAt = null; }
          lastTele = e.tele;
        }
        step(dt);
      }
      if(!res) res = { win:false, t:maxT };
    } finally { battleEnd = be; for(const k in keys) keys[k] = false; G = null; if(typeof stopMusic === 'function') try{ stopMusic(); }catch(e){} }
    return res;
  }
};
if(typeof V23_DEV !== 'undefined' && V23_DEV) showSoloCh = (prev => function(sel){
  prev(sel);
  const on = document.querySelector('.stg.on[data-stage]'), tb = document.querySelector("[data-team].on"), back = document.getElementById('back'); if(!on || !tb || !back) return;
  back.insertAdjacentHTML('beforebegin', `<button class='btn2 dev' id='v25sim'>🧪 Simuler 20 combats</button>`);
  document.getElementById('v25sim').onclick = () => {
    const i = +on.dataset.stage, t = Save.team(tb.dataset.team), size = t.size, ch = Math.floor(i/CH_SIZE), C = CHAPTERS[ch], S = STAGES[i], btn = document.getElementById('v25sim');
    let foes = ((C && C['teams' + size]) || [])[i - ch*CH_SIZE] || []; if(SOLO_COUNT && SOLO_COUNT[i] != null) foes = foes.slice(0, SOLO_COUNT[i]); foes = foes.filter(id => HERO[id]);
    const items = {}; t.members.forEach(id => { const it = Save.teamItem && Save.teamItem(t, id); if(it) items[id] = it; });
    let k = 0, w = 0, T = 0; btn.disabled = true;
    const one = () => { const r = V25SIM.fight({ mode:'solo', team:t.members.slice(), items, size, teamId:t.id, stageIndex:i, stage:S, arena:S.arena, enemies:foes.slice() }); k++; if(r.win) w++; T += r.t;
      btn.textContent = `🧪 ${k}/20…`; if(k < 20) return setTimeout(one, 0);
      showSoloCh({ size, ch, stage:i, team:t }); Notif.show({ id:'v25sim', title:`🧪 Niveau ${i + 1} : ${w}/20 victoires (${w*5} %)`, text:`Équipe « ${esc(t.name)} », pilote « joueur moyen » (esquive 40 %). Durée moyenne : ${Math.round(T/20)} s.`, timeout:12 }); };
    setTimeout(one, 30);
  };
})(showSoloCh);
showSolo = sel => showSoloCh(sel); SCREENS.solo = sel => showSoloCh(sel);

// ---------------------------------------------------------------- 12. Mes équipes : filtre par rôle
let V25_RF = '';
function v25RoleFilter(){
  const g = document.querySelector('.edit .grid2c'); if(!g || !g.querySelector('[data-add]') || g.previousElementSibling && g.previousElementSibling.classList.contains('v25rf')) return;
  g.querySelectorAll('[data-add]').forEach(b => { const R = pkRole(b.dataset.add); if(R){ b.dataset.role = R.n; b.insertAdjacentHTML('beforeend', `<i class='v25rt' style='background:${R.c}'>${R.n}</i>`); } });
  g.insertAdjacentHTML('beforebegin', `<div class='v25rf'>${['', ...Object.values(ROLE_DEF).map(r => r.n)].map(n => `<button class='btn2 sm ${n === V25_RF ? 'on' : ''}' data-rf='${n}'>${n || 'Tous'}</button>`).join('')}</div>`);
  const apply = () => { g.querySelectorAll('[data-add]').forEach(b => b.style.display = !V25_RF || b.dataset.role === V25_RF || b.classList.contains('sel') ? '' : 'none');
    document.querySelectorAll('[data-rf]').forEach(b => b.classList.toggle('on', b.dataset.rf === V25_RF)); };
  document.querySelectorAll('[data-rf]').forEach(b => b.onclick = () => { V25_RF = b.dataset.rf; apply(); });
  apply();
}
menu = (prev => function(){ const r = prev.apply(this, arguments); try{ v25RoleFilter(); }catch(e){} return r; })(menu);

document.head.insertAdjacentHTML('beforeend', `<style>
.v25rf{display:flex;flex-wrap:wrap;gap:3px;margin:0 0 4px}.v25rf .btn2.sm{font-size:10px;padding:2px 7px}
.grid2c .card{position:relative}.v25rt{position:absolute;top:2px;right:2px;font-size:7px;font-style:normal;color:#fff;padding:0 3px;border-radius:4px;opacity:.9}
.v25nm{display:block;font-size:9px;line-height:1.1;color:#fff;text-align:center;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin-top:2px}
.v25ai{font-size:11px;margin:3px 0;opacity:.95}.v25ai span{opacity:.85}
.v25st{font-size:11px;margin:6px 0 0;color:#ffd23f}
.mmi.v25dot::after{content:'🥚';margin-left:6px;animation:v25pulse 1s ease-in-out infinite alternate}
@keyframes v25pulse{from{opacity:.5}to{opacity:1}}
@media (max-height:500px), (max-width:700px){ #netpop:has(.bdgn){top:auto;bottom:calc(6px + env(safe-area-inset-bottom,0px));transform-origin:bottom center} }
#v25egg{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;background:rgba(5,2,12,0);animation:v25dark .6s forwards}
@keyframes v25dark{to{background:rgba(5,2,12,.82)}}
#v25egg .v25in{text-align:center;color:#fff;max-width:420px;padding:10px}
#v25egg h2{margin:0;color:#ffd23f;font-size:22px;opacity:0;animation:v25fade .5s .2s forwards;text-shadow:0 2px 0 #000}
#v25egg .v25stage{position:relative;height:120px;margin:4px auto;width:160px}
#v25egg .v25e{position:absolute;left:50%;bottom:6px;width:72px;margin-left:-36px;image-rendering:pixelated;transform-origin:50% 90%;
  animation:v25drop .7s cubic-bezier(.5,0,.75,0) both, v25bounce .5s .7s ease-out, v25shake .5s 1.3s ease-in-out 3}
@keyframes v25drop{from{transform:translateY(-200px)}to{transform:translateY(0)}}
@keyframes v25bounce{0%{transform:translateY(0) scale(1.15,.85)}40%{transform:translateY(-26px) scale(.95,1.05)}100%{transform:translateY(0)}}
@keyframes v25shake{0%,100%{transform:rotate(0)}25%{transform:rotate(-14deg)}75%{transform:rotate(14deg)}}
#v25egg .v25glow{position:absolute;left:50%;bottom:0;width:150px;height:150px;margin-left:-75px;border-radius:50%;opacity:0;
  background:radial-gradient(circle,rgba(255,220,90,.85),rgba(255,180,40,.25) 45%,transparent 70%);animation:v25glow 1.2s 2.8s ease-out forwards}
@keyframes v25glow{0%{opacity:0;transform:scale(.4)}60%{opacity:1;transform:scale(1.15)}100%{opacity:.6;transform:scale(1)}}
#v25egg .v25parts i{position:absolute;left:50%;bottom:40px;width:6px;height:6px;margin-left:-3px;border-radius:50%;background:#ffe27a;box-shadow:0 0 6px #ffd23f;opacity:0;
  transform:rotate(var(--a)) translateY(0);animation:v25spark 1s calc(2.9s + var(--d)) ease-out forwards}
@keyframes v25spark{0%{opacity:1;transform:rotate(var(--a)) translateY(0)}100%{opacity:0;transform:rotate(var(--a)) translateY(-80px)}}
#v25egg .v25got{font-size:16px;margin:6px 0;opacity:0;animation:v25fade .5s 3s forwards}#v25egg .v25got b{color:#ffd23f}
#v25egg ul{list-style:none;padding:0;margin:6px auto;text-align:left;display:inline-block;font-size:13px;opacity:0;animation:v25fade .5s 3.4s forwards}
#v25egg li{margin:3px 0}#v25egg li span{display:inline-block;width:24px}
#v25egg .row{justify-content:center;opacity:0;animation:v25fade .5s 3.6s forwards}
@keyframes v25fade{to{opacity:1}}
@media (max-height:440px){ #v25egg .v25stage{height:90px} #v25egg .v25e{width:56px;margin-left:-28px} #v25egg h2{font-size:18px} #v25egg ul{font-size:11px} }
</style>`);
