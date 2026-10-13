// ============================================================
//  ai-swap.js — L'IA PEUT CHANGER DE POKÉMON EN COMBAT (mode Solo, équipes adverses de 2 Pokémon ou plus)
//    • Elle rappelle son Pokémon (rayon rouge) et en envoie un autre (Pokéball) :
//        – quand ton Pokémon a l'avantage de type sur le sien et qu'elle a mieux en réserve
//        – parfois quand son Pokémon a peu de PV (pour le garder pour plus tard)
//    • Un Pokémon rappelé garde ses PV et son statut ; il pourra revenir.
//    • Le boss du niveau (dernier adversaire) n'entre JAMAIS par une relève et ne fuit jamais.
//    • Plus le niveau est difficile (G.stage.aim), plus l'IA change souvent et intelligemment.
//  Réglages : AI_SWAP ci-dessous.
// ============================================================
const AI_SWAP = {
  on:true,
  think:.5,          // l'IA réfléchit toutes les 0,5 s
  cooldown:7,        // délai minimum entre deux relèves de l'IA (secondes)
  stay:5,            // un Pokémon qui vient d'entrer reste au moins 5 s
  firstDelay:3,      // pas de relève dans les 3 premières secondes d'un adversaire
  gain:1.5,          // écart de « match-up » nécessaire pour changer (1 = un avantage de type x2)
  lowHp:.3,          // sous 30 % de PV : peut se replier…
  lowHpOther:.6,     // …si un équipier a plus de 60 % de PV
  chance:.35,        // probabilité de changer à chaque réflexion (x la difficulté du niveau)
  lowChance:.12
};
const swapActive = () => AI_SWAP.on && G && G.cfg && G.cfg.mode === 'solo' && !G.training && G.et && G.et.length >= 2;
const bossIdx = () => (G.et.length >= 3 ? G.et.length - 1 : -1);

// ---------- évaluation des types ----------
const lg2 = x => Math.log2(Math.max(.25, x));
function bestHit(att, def){                               // meilleur multiplicateur des attaques de `att` contre `def`
  let b = .25; for(const m of MV[att] || []) if(m.d > 0) b = Math.max(b, typeMult(m.tp || att, def)); return b;
}
// > 0 : bon pour l'IA (son Pokémon `eid` contre ton `pid`)
const matchup = (eid, pid) => lg2(bestHit(eid, pid)) - lg2(bestHit(pid, eid));

// ---------- état de l'équipe adverse ----------
function asInit(){ if(G.es) return; G.es = G.et.map(() => null); G.eko = G.et.map(() => 0); G.ei = -1; G.asT = 0; }
function nextIndex(){
  const B = bossIdx(), free = G.et.map((_, i) => i).filter(i => !G.eko[i] && i !== G.ei);
  return free.find(i => i !== B) ?? free[0] ?? Math.min(G.wave, G.et.length - 1);
}
// entrée d'un adversaire après un K.O. (ou au début) : on choisit lequel, et on lui rend ses PV s'il était déjà sorti
const _spawnAS = spawn;
spawn = function(){
  if(!swapActive()) return _spawnAS();
  asInit();
  if(G.ei >= 0 && G.e && G.e.hp <= 0) G.eko[G.ei] = 1;
  const idx = nextIndex(), w = G.wave, sv = G.es[idx];
  G.wave = idx;                                           // le moteur crée l'adversaire G.et[G.wave]
  try{ _spawnAS(); } finally { G.wave = w; }
  G.ei = idx; G.e.idx = idx; G.e.inT = G.time;
  if(sv){ G.e.hp = sv.hp; G.e.max = sv.max; G.e.st = sv.st; G.e.stT = sv.stT; G.e.lsUsed = sv.lsUsed; G.e.rage = sv.rage || 0; }
  G.es[idx] = G.e;
};

// ---------- la relève de l'IA ----------
function canSwapNow(e){
  return e && e.hp > 0 && !e.boss && !G.wait && !G.em && !G.erc && G.intro <= 0 && !G.over && !G.paused && HS <= 0
    && !e.hid && !busy(e) && !(typeof bossBusy === 'function' && bossBusy(e)) && !e.jail && !e.lifted && !e.kb && !e.rs && !e.fl
    && e.st !== 'frz' && e.st !== 'slp'
    && G.time - (e.inT || 0) > Math.max(AI_SWAP.stay, AI_SWAP.firstDelay) && G.time - (G.asLast || -99) > AI_SWAP.cooldown;
}
function aiThink(){
  const e = G.e, p = G.p; if(!canSwapNow(e) || !p || p.hp <= 0 || G.sw) return;
  const smart = .35 + .65*Math.min(1, G.stage.aim || 0), B = bossIdx();
  const bench = G.et.map((t, i) => ({ t, i, o:G.es[i] })).filter(c => c.i !== G.ei && c.i !== B && !G.eko[c.i] && (!c.o || c.o.hp > 0));
  if(!bench.length) return;
  const hpR = c => c.o ? c.o.hp/c.o.max : 1, cur = matchup(e.t, p.t);
  bench.forEach(c => c.s = matchup(c.t, p.t) + (hpR(c) - .5)*.6);
  bench.sort((a, b) => b.s - a.s);
  const best = bench[0];
  if(best.s - cur >= AI_SWAP.gain && Math.random() < AI_SWAP.chance*smart) return aiSwap(best.i, 'type');
  if(e.hp/e.max < AI_SWAP.lowHp){
    const safe = bench.filter(c => hpR(c) > AI_SWAP.lowHpOther && c.s > cur - .5)[0];
    if(safe && Math.random() < AI_SWAP.lowChance*smart) return aiSwap(safe.i, 'low');
  }
}
function freshEnemy(idx, x, y){
  const t = G.et[idx], S = G.stage, hp = Math.round(HERO[t].hp*S.hp*(1 + .05*idx));
  const o = { t, x, y, hp, max:hp, r:24, tele:0, next:1.2, pat:0, ph:Math.random()*6, boss:false, intro:0, st:null, stT:0, bcd:{}, rage:0, idx };
  return o;
}
function aiSwap(idx, why){
  const o = G.e, x = o.x, y = o.y;
  // on range le Pokémon actuel (il garde ses PV et son statut)
  if(typeof clearPlus === 'function') clearPlus(o);
  o.tele = 0; o.rs = null; o.fl = null; o.ann = null; o.hitT = 0; o.kb = null; o.stz = o.grb = o.mb = o.jail = null; o.buf = null;
  G.es[G.ei] = o;
  // l'autre Pokémon arrive au même endroit
  let n = G.es[idx];
  if(n){ n.x = x; n.y = y; n.tele = 0; n.next = 1.2; n.hid = false; n.koDone = 0; n.rs = null; n.fl = null; n.kb = null; n.lx = x; n.ly = y; n.bcd = n.bcd || {}; }
  else n = G.es[idx] = freshEnemy(idx, x, y);
  n.inT = G.time; n.invT = G.time + .9; n.ann = null;
  if(SPR[n.t]) n.ann = { an:animName(SPR[n.t], 'spawn', 'Idle'), t0:G.time };
  G.erc = { o, t0:G.time, x, y };                         // animation de rappel
  G.e = n; G.ei = idx; G.asLast = G.time;
  n.hid = true; G.em = { e:n, t0:G.time, ev:false };      // la Pokéball s'ouvre (js/pokeball.js)
  lbl(1, NAME[o.t] + ', reviens !', o.t);
  dmgTxt(x, y - 60, why === 'low' ? 'REPLI !' : 'RELÈVE !', '#ffd0a0');
  playSfx('recall');
  if(typeof musicSet === 'function' && n.boss) musicSet('boss');
}
// animation : silhouette rouge aspirée vers le haut
function drawRecallE(){
  const R = G && G.erc; if(!R) return;
  const t = G.time - R.t0; if(t > .45){ G.erc = null; return; }
  const u = Math.min(1, t/.4), fr = mon(R.o, 1), sc = 2*(1 - u*.92);
  ctx.save(); ctx.globalAlpha = .9 - u*.4; ctx.translate(R.x, R.y - 60*u); ctx.drawImage(tint(fr, '#ff4a3a'), -fr.width*sc/2, -fr.height*sc/2, fr.width*sc, fr.height*sc); ctx.restore();
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = `rgba(255,70,50,${.8*(1 - u)})`; ctx.lineWidth = 8*(1 - u) + 2;
  ctx.beginPath(); ctx.moveTo(R.x, R.y); ctx.lineTo(R.x, R.y - 70); ctx.stroke(); ctx.restore();
}
const _dbAS = drawBullets; drawBullets = function(){ _dbAS(); drawRecallE(); };

const _stepAS = step;
step = function(dt){
  _stepAS(dt);
  if(!swapActive() || !G.es || G.over || G.paused) return;
  G.asT -= dt; if(G.asT > 0) return; G.asT = AI_SWAP.think;
  aiThink();
};

// ---------- HUD : les Pokéballs adverses montrent qui est K.O. / en jeu / en réserve ----------
const _hudAS = hud;
hud = function(){
  _hudAS();
  if(!G.es) return;
  const HW = VW/UIK.hud;
  for(let i = 0; i < G.et.length; i++){
    const st = G.eko[i] || (G.es[i] && G.es[i].hp <= 0 && i !== G.ei) ? 2 : i === G.ei ? 1 : 0, cx = HW - 54 - i*18, cy = 58;
    ctx.fillStyle = '#14101c'; ctx.beginPath(); ctx.arc(cx, cy, 10, 0, 6.283); ctx.fill();
    ctx.fillStyle = st == 2 ? '#666' : '#e23b3b'; ctx.beginPath(); ctx.arc(cx, cy, 6, Math.PI, 6.283); ctx.fill();
    ctx.fillStyle = st == 2 ? '#999' : '#fff'; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#14101c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 6, 0, 6.283); ctx.moveTo(cx - 6, cy); ctx.lineTo(cx + 6, cy); ctx.stroke();
    if(st == 1){ ctx.strokeStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(cx, cy, 9, 0, 6.283); ctx.stroke(); }
    const o = G.es[i]; if(o && st == 0 && o.hp < o.max){ ctx.fillStyle = '#14101c'; ctx.fillRect(cx - 7, cy + 9, 14, 3); ctx.fillStyle = o.hp/o.max < .3 ? '#d9503f' : '#4fd16a'; ctx.fillRect(cx - 7, cy + 9, 14*o.hp/o.max, 3); }
  }
};
