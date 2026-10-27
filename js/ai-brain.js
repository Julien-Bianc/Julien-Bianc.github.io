// ============================================================
//  ai-brain.js — UN SEUL « CERVEAU » D'IA À 5 NIVEAUX, POUR TOUS LES MODES (v0.25)
//    La difficulté vient du COMPORTEMENT de l'adversaire, pas seulement de ses stats.
//    Niveaux :  1 Novice · 2 Entraîné · 3 Expert · 4 Champion · 5 Maître   (AIB.LV ci-dessous, réglable)
//    Branché sur : Solo, Safari, Tour de Combat, Tournoi. (Raid et Défi Mewtwo gardent leurs attaques scriptées.)
//    Ce qu'il fait selon le niveau :
//      • réaction : il voit arriver tes tirs, ruées et zones et esquive sur le côté (temps de réaction + chance d'esquive)
//      • placement : distance idéale selon ses attaques et les tiennes, tourne autour de toi, se replie quand il est faible
//      • choix d'attaque : selon la distance (Novice), le type le plus efficace (Entraîné+), le statut, achever, punir…
//      • cadence : un minuteur commun (Novice / Entraîné) ou des recharges INDÉPENDANTES par attaque, comme toi (Expert+)
//      • Expert+ : vise où tu vas · Champion+ : punit (attaque pendant ta recharge d'esquive ou ta charge), enchaîne petit + gros coup
//      • Maître : feintes (annonce courte), garde son gros coup pour t'achever
//    Mêmes règles de dégâts en Tournoi : tes PV ne sont plus protégés 0,35 s après un coup (chaque projectile d'une rafale compte,
//    comme pour l'IA), et ses grosses attaques ne sont plus réduites de 25 %.
// ============================================================
const AIB = {
  NAMES:['', 'Novice', 'Entraîné', 'Expert', 'Champion', 'Maître'],
  COLS: ['', '#8dff9a', '#7ab8ff', '#ffd23f', '#ff9a3c', '#ff5a6a'],
  //      réaction(s) esquive  pause entre 2 attaques  recharges indép.  annonce×  anticipe  type  portée  punit  feinte
  LV:[null,
    { react:.5,  dodge:.15, gap:1.6,  small:.6,  indep:false, tele:1.2,  lead:0,   type:false, range:false, punish:false, feint:0 },
    { react:.35, dodge:.35, gap:1.2,  small:.55, indep:false, tele:1.08, lead:.4,  type:true,  range:true,  punish:false, feint:0 },
    { react:.25, dodge:.55, gap:.05,  small:.3,  indep:true,  tele:1,    lead:.8,  type:true,  range:true,  punish:false, feint:0, tour:{ small:.22, cdK:.5 } },
    { react:.18, dodge:.7,  gap:0,    small:.18, indep:true,  tele:.93,  lead:.9,  type:true,  range:true,  punish:true,  feint:0, tour:{ small:.15, cdK:.4 } },
    { react:.12, dodge:.85, gap:0,    small:.12, indep:true,  tele:.75,  lead:.95, type:true,  range:true,  punish:true,  feint:.3, tour:{ small:.1, cdK:.2, tele:.7, react:.08, dodge:.95 } }],
  // tour:{…} = réglages en plus pour le Tournoi (annonces plus courtes, recharges ×cdK) — calibrés au simulateur « joueur moyen »
  cur(){ const B = G && G.brain, L = this.LV[B]; if(!L) return null; if(!(G.cfg && G.cfg.mode === 'tourney' && L.tour)) return L; return this._c && this._c.b === B ? this._c.L : (this._c = { b:B, L:{ ...L, ...L.tour } }).L; },
  // niveau selon le mode
  level(cfg){
    if(!cfg) return 0;
    const m = cfg.mode;
    if(m === 'solo'){ const i = cfg.stageIndex || 0; return i <= 2 ? 1 : i <= 6 ? 2 : i <= 14 ? 3 : 4; }
    if(m === 'safari') return cfg.tuto ? 1 : cfg.zone === 'decouverte' ? 1 : 2;
    if(m === 'tower'){ const f = (typeof Tower !== 'undefined' && Tower.run() && Tower.run().floor) || 1; return f <= 10 ? 2 : f <= 30 ? 3 : 4; }
    if(m === 'tourney'){ const sk = (G && G.tour && G.tour.skill) || 1; return sk >= 1.36 ? 5 : sk >= 1.1 ? 4 : 3; }
    return 0;
  },
  on(){ return !!(G && G.brain && G.e && !G.over && !G.paused); }
};
const aibBig = m => !!m && (m.big === true || (m.big !== false && (m.cd || 1) >= 3));          // « gros coup » = longue recharge
const aibMel = m => !!(m && (m.mel || ['melee', 'uppercut', 'roll', 'hug', 'xspeed', 'burrow', 'skydive'].includes(m.k)));

// au début du combat : niveau de l'IA (affiché brièvement)
start = (prev => function(cfg){
  const r = prev(cfg);
  if(G && cfg && !['raid', 'boss', 'online', 'training'].includes(cfg.mode)){ G.brain = AIB.level(cfg); }
  return r;
})(start);

// ---------- 1. réflexes : esquive ----------
function aibDodge(e, p, L, dist){
  const Q = e.aq;
  if(G.time < Q.dodge || e.kb || (e.tele > 0 && e.tele < .12) || L.dodge <= 0) return;
  let threat = null;
  for(const b of bullets){ if(!b.own) continue; const dx = e.x - b.x, dy = e.y - b.y, vv = b.vx*b.vx + b.vy*b.vy; if(vv < 1) continue;
    if(!b._aib) b._aib = G.time; if(G.time - b._aib < L.react) continue;                        // temps de réaction
    const t = (dx*b.vx + dy*b.vy)/vv; if(t < 0 || t > .5) continue; const mx = b.x + b.vx*t - e.x, my = b.y + b.vy*t - e.y;
    if(Math.hypot(mx, my) < e.r + (b.r || 5) + 12){ threat = Math.atan2(b.vy, b.vx) + (mx*b.vy - my*b.vx > 0 ? -1 : 1)*Math.PI/2; break; } }
  if(threat == null && p.rs && dist < (G.brain >= 3 ? 330 : 230)){ if(!Q.rsT) Q.rsT = G.time; if(G.time - Q.rsT >= L.react) threat = Math.atan2(e.y - p.y, e.x - p.x) + (Math.random() < .5 ? 1 : -1)*1.25; } else if(!p.rs) Q.rsT = 0;
  if(threat == null && typeof ZONES !== 'undefined') for(const z of ZONES){ if(!z.own || z.done) continue; if(Math.hypot(e.x - z.x, e.y - z.y) < z.R + e.r + 8){ threat = Math.atan2(e.y - z.y, e.x - z.x); break; } }
  if(threat == null) return;
  Q.dodge = G.time + .35;                                                          // on ne retente pas tout de suite, même en cas d'échec
  if(Math.random() >= L.dodge) return;
  const land = a => { const x = e.x + Math.cos(a)*90, y = e.y + Math.sin(a)*90; return Math.min(x - 40, W - 40 - x, y - 50, H - 40 - y); };
  if(land(threat) < 0 && land(threat + Math.PI) > land(threat)) threat += Math.PI;
  throwBack(e, threat, 90, .17); Q.dodge = G.time + .75 + (1 - L.dodge)*.6;
}
// ---------- 2. placement ----------
function aibMove(e, p, L, dt, dist){
  if(!L.range || e.kb) return;
  const Q = e.aq, dx0 = p.x - e.x, dy0 = p.y - e.y, myMel = MV[e.t].filter(aibMel).length, hisMel = (MV[p.t] || []).filter(aibMel).length, low = e.hp < e.max*.35;
  let want = myMel >= 2 ? 120 : myMel === 1 ? 190 : 250;
  if(myMel < 2 && hisMel >= 2) want = 290;
  if(low && myMel < 2 && G.brain >= 3) want += 90;                                 // repli stratégique (Expert+)
  if(p.hp < p.max*.3 && !low) want -= 40;
  const k = (dist - want)*Math.min(1, dt*1.4);
  let nx = e.x + dx0/dist*k*.6, ny = e.y + dy0/dist*k*.6;
  if(G.time > Q.orbT){ Q.orbT = G.time + 1.5 + Math.random()*2; if(Math.random() < .4) Q.orb *= -1; }
  const os = 55*dt*(low ? 1.4 : 1); nx += -dy0/dist*os*Q.orb; ny += dx0/dist*os*Q.orb;
  if(nx < 50 || nx > W - 50 || ny < 60 || ny > H - 50) Q.orb *= -1;
  e.x = clX(nx); e.y = clY(ny);
}
// ---------- 3. choix de l'attaque ----------
function aibPick(e, p, L){
  const M = MV[e.t], dist = Math.hypot(p.x - e.x, p.y - e.y), cd = e.acd, Q = e.aq;
  const stuck = p.st === 'par' || p.st === 'slow' || p.st === 'slp' || p.st === 'frz';
  const punish = L.punish && (p.dC > .3 || (p.ch && p.ch.some(v => v > .2)));
  let best = -1, bs = -1e9;
  M.forEach((m, i) => {
    if(L.indep && (cd[i] || 0) > G.time) return;
    let s = (m.d || 5)/Math.sqrt(Math.max(.6, m.cd || 1));
    if(L.type) s *= typeMult(m.tp || e.t, p.t);
    if(aibMel(m)) s *= dist < 170 ? 1.5 : dist < 230 ? .6 : .1;                                   // tous niveaux : l'attaque selon la distance
    else if(dist < 110 && !aibBig(m)) s *= .8;
    if(aibBig(m)){ s *= (stuck || punish) ? 1.8 : dist > 350 ? .7 : .95;
      if(L.feint && p.hp > p.max*.35 && !stuck && !punish) s *= .55;             // Maître : garde son gros coup pour achever
      if(Q.combo > G.time) s *= 1.6; }                                            // Champion+ : petit coup puis gros coup
    if(L.type && m.k === 'beam') s *= 1.35;                                     // un rayon bien suivi touche presque toujours
    if(m.d <= 0 && (m.st || m.k === 'status')) s = p.st ? 0 : 14;
    if(p.hp < p.max*.25) s *= aibBig(m) ? 1.4 : 1.2;
    s *= .9 + Math.random()*.2;
    if(!L.type && !L.range) s = (aibMel(m) && dist > 230 ? .2 : 1)*(.5 + Math.random());   // Novice : presque au hasard, mais pas un corps-à-corps de loin
    if(s > bs){ bs = s; best = i; }
  });
  if(best < 0) return -1;
  cd[best] = G.time + (M[best].cd || 1)*(G.cfg.mode === 'tourney' ? (L.cdK || 1) : 1);      // cdK : recharges raccourcies en Tournoi seulement
  if(L.punish && !aibBig(M[best])) Q.combo = G.time + 1.4;
  return best;
}
// ---------- la boucle ----------
step = (prev => function(dt){
  const on = AIB.on() && G.brain > 0, e = on ? G.e : null, n0 = e ? e.next : 0, tele0 = e ? e.tele : 0;
  prev(dt);
  if(!on || !G || G.over || G.paused || G.e !== e || (typeof HS !== 'undefined' && HS > 0)) return;
  const L = AIB.cur(), p = G.p; if(!L || !p || e.hp <= 0 || e.hid || !MV[e.t]) return;
  if(e.boss && G.cfg.mode !== 'tourney' && typeof BOSSES !== 'undefined' && BOSSES.includes(e.t)) return;      // boss scriptés (Mewtwo…)
  e.aq = e.aq || { dodge:0, orb:Math.random() < .5 ? 1 : -1, orbT:0, combo:0 }; e.acd = e.acd || {};
  try{
    if(G.cfg.mode === 'tourney' && typeof tAiItemsStep === 'function') tAiItemsStep(e, dt);
    const dist = Math.hypot(p.x - e.x, p.y - e.y) || 1;
    // nouvelle annonce : on choisit l'attaque et la durée de l'annonce
    if(e.tele > 0 && !(tele0 > 0)){
      const k = aibPick(e, p, L);
      if(k < 0){ e.tele = 0; e.next = .15; }
      else { e.pat = k; const big = aibBig(MV[e.t][k]); let T = (big ? .8 : L.small)*L.tele*(G.cfg.mode === 'tourney' ? 1 : (G.stage.tele || 1))*((typeof AIB_TELE_X !== 'undefined' && AIB_TELE_X[e.t + ':' + MV[e.t][k].k]) || 1);
        if(L.feint && Math.random() < L.feint && !big) T *= .6;                    // feinte : annonce très courte
        e.tele = e.tm = Math.max(.25, T);
        if(MV[e.t][k].k === 'beam') e.aim = Math.atan2(p.y - e.y, p.x - e.x); }
    }
    // après un tir : quand attaquer de nouveau ?
    if(e.next > n0 + .1 && !(e.tele > 0)){
      let w = L.gap*(.85 + Math.random()*.3)*(G.cfg.mode === 'tourney' ? 1 : (G.stage.rate || 1));
      if(L.indep){ const ready = MV[e.t].map((m, i) => Math.max(0, (e.acd[i] || 0) - G.time)), soon = Math.min(...ready); w = Math.max(w, soon); }
      if(L.punish && (p.dC > .3 || (p.ch && p.ch.some(v => v > .2)))) w = Math.min(w, .2);
      e.next = w;
    }
    // le rayon suit pendant l'annonce (Expert+)
    if(G.brain >= 3 && e.tele > (G.brain >= 4 ? .07 : .2) && MV[e.t][e.pat] && MV[e.t][e.pat].k === 'beam'){ const T = .25*L.lead; e.aim = Math.atan2(p.y + (p.vy || 0)*T - e.y, p.x + (p.vx || 0)*T - e.x); }
    aibDodge(e, p, L, dist);
    aibMove(e, p, L, dt, dist);
  }catch(err){ console.warn('ia', err); }
})(step);
// visée : anticipe plus ou moins ton déplacement selon le niveau (le moteur vise déjà selon G.stage.aim en Solo)
eFire = (prev => function(){
  if(!(G && G.brain && G.p && G.cfg)) return prev();
  const L = AIB.cur(), p = G.p, vx = p.vx, vy = p.vy, aim = G.stage.aim, m = G.e && MV[G.e.t] && MV[G.e.t][G.e.pat];
  const tour = G.cfg.mode === 'tourney', d0 = G.stage.dmg;
  if(L){ G.stage.aim = Math.max(aim || 0, L.lead*(G.brain < 3 && Math.random() < .25 ? .3 : 1)); }
  if(tour && m && isBig(m)) G.stage.dmg = d0/.75;                                  // Tournoi : plus de −25 % sur ses grosses attaques
  try{ return prev(); } finally { p.vx = vx; p.vy = vy; G.stage.aim = aim; G.stage.dmg = d0; }
})(eFire);
// Tournoi : mêmes règles de dégâts que l'IA (chaque projectile d'une rafale compte)
hurtP = (prev => function(d, b){ const p = G && G.p, h0 = p ? p.hp : 0, r = prev(d, b); if(G && G.cfg && G.cfg.mode === 'tourney' && p && p.hp < h0 && p.hp > 0) p.inv = 0; return r; })(hurtP);
// la relève intelligente (Expert+) en Solo et en Tournoi : réglages selon le niveau
if(typeof AI_SWAP !== 'undefined'){ const D = { ...AI_SWAP };
  step = (prev => function(dt){ if(G && G.brain && !G.over){ const lv = G.brain; Object.assign(AI_SWAP, lv >= 3 ? { chance:.35 + .12*lv, lowChance:.1 + .08*lv, gain:1.6 - .12*lv, cooldown:8 - lv, think:.4 } : { chance:lv === 2 ? .25 : 0, lowChance:0 }); } else Object.assign(AI_SWAP, D); prev(dt); })(step); }
// le niveau de l'adversaire s'affiche au début du combat
drawScreenFx = (prev => function(){
  prev();
  if(!G || !G.brain || G.over || !(G.intro > 0)) return;
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); const k = ctx.canvas.width/VW; ctx.scale(k, k);
  htext('IA : ' + AIB.NAMES[G.brain], VW/2, VH/2 + 34, 10, AIB.COLS[G.brain], 'center'); ctx.restore();
})(drawScreenFx);
