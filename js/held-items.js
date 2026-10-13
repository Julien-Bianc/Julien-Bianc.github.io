// ============================================================
//  held-items.js — EFFETS DES OBJETS TENUS en combat (données : data/items.js, champ fx).
//  Seuls TES Pokémon portent un objet (choisi dans l'éditeur d'équipe). Les ennemis n'en ont pas (pour l'instant).
//  Chaque objet « à usage unique » (baies, Ceinture Force) sert une fois par combat et par Pokémon :
//  il n'est JAMAIS retiré de l'inventaire.
// ============================================================
const heldOf = o => o && o.item ? HELD_BY_ID[o.item] : null;
const fxOf = o => { const h = heldOf(o); return h ? h.fx : null; };
function heldPop(o, h, col){ if(o && h) dmgTxt(o.x, o.y - 62, h.name.toUpperCase() + ' !', col || '#ffe27a'); }

// ---------- équipement au lancement du combat : cfg.items = { idPokémon: idObjet } ----------
const _startHeld = start;
start = function(cfg){
  _startHeld(cfg);
  if(!G) return;
  const items = cfg.items || {};
  G.team.forEach(c => {
    c.item = items[c.t] && HELD_BY_ID[items[c.t]] ? items[c.t] : null;
    const fx = fxOf(c); if(fx && fx.speed) c.sp *= fx.speed;
  });
  setBtns();
};

// ---------- tes attaques : bonus de dégâts, critiques, Grelot Coque, Orbe Vie ----------
const _hEheld = hurtE;
hurtE = function(d, b){
  const p = G && G.p, e = G && G.e, h = heldOf(p), fx = h && h.fx;
  if(!fx || !b || !e || e.hp <= 0) return _hEheld(d, b);
  if(fx.type && b.t === fx.type) d *= fx.mult || 1.2;
  if(fx.superEff && mult(b.t, e.t) > 1) d *= fx.superEff;
  if(fx.dmg) d *= fx.dmg;
  if(fx.crit && !b.crit && b.k !== 'pool' && G.intro <= 0 && Math.random() < fx.crit){
    d *= CRIT.mult; b.crit = 1; dmgTxt(e.x, e.y - 76, 'COUP CRITIQUE !', '#ffd23f'); critFx(e.x, e.y);
  }
  const before = e.hp, r = _hEheld(d, b), dealt = Math.max(0, before - Math.max(0, e.hp));
  if(dealt > 0 && p.hp > 0){
    if(fx.drainHit){ const g = dealt*fx.drainHit; p.hp = Math.min(p.max, p.hp + g); if(g >= .5) dmgTxt(p.x, p.y - 34, '+' + Math.round(g*10), '#8dff9a'); }
    if(fx.recoil && G.time - (p.recT || -9) > .4){                         // Orbe Vie : 1 fois par attaque (les éventails comptent pour 1)
      p.recT = G.time; const l = p.max*fx.recoil; p.hp -= l; dmgTxt(p.x, p.y - 48, '-' + Math.round(l*10) + ' ' + h.name, '#ff9a9a');
    }
  }
  return r;
};

// ---------- attaques reçues : Ceinture Force, Bandeau, Casque Brut ----------
const _hPheld = hurtP;
hurtP = function(d, b){
  const p = G && G.p, h = heldOf(p), fx = h && h.fx;
  if(!fx || !p || p.hp <= 0) return _hPheld(d, b);
  const sash = fx.sash && !p.sashUsed && p.hp >= p.max - .01, band = fx.endure && Math.random() < fx.endure;
  let r;
  if(sash || band){
    // on « gonfle » les PV le temps du coup pour l'empêcher d'être fatal, puis on regarde s'il l'aurait été
    const BIG = 1e6; p.hp += BIG; p.max += BIG;
    r = _hPheld(d, b);
    p.hp -= BIG; p.max -= BIG;
    if(p.hp <= 0){ p.hp = 1; if(sash) p.sashUsed = 1; heldPop(p, h, '#ffb070'); r = undefined; }
  } else r = _hPheld(d, b);
  const e = G && G.e;
  if(fx.helmet && b && b.k === 'melee' && e && e.hp > 0 && p === G.p){
    const l = Math.max(1, e.max*fx.helmet); e.hp -= l; dmgTxt(e.x, e.y - 48, '-' + Math.round(l*10) + ' ' + h.name, '#ffb08a');
  }
  return r;
};

// ---------- Choix : bloqué sur la première attaque utilisée jusqu'à la relève ----------
let CHOICE_MSG = 0;
const _pressHeld = press;
press = function(i){
  const p = G && G.p, fx = fxOf(p);
  if(fx && fx.choice && p.choice != null && p.choice !== i){
    if(G.time - CHOICE_MSG > .8){ CHOICE_MSG = G.time; dmgTxt(p.x, p.y - 62, 'BLOQUÉ : ' + p.mv[p.choice].n.toUpperCase(), '#ffb070'); }
    return;
  }
  _pressHeld(i);
};
const _relHeld = rel;
rel = function(i){
  const p = G && G.p, was = down[i];
  _relHeld(i);
  const fx = fxOf(p); if(was && fx && fx.choice && p.choice == null) p.choice = i;
};
const _doSwapHeld = doSwap;
doSwap = function(n){ const o = G && G.p; if(o && n && n.hp > 0) o.choice = null; _doSwapHeld(n); };

// ---------- chaque image : Restes, baies, boutons bloqués ----------
const _stepHeld = step;
step = function(dt){
  _stepHeld(dt);
  if(!G || G.over || G.paused) return;
  const p = G.p, h = heldOf(p), fx = h && h.fx;
  for(let i = 0; i < 3; i++) bt[i].classList.toggle('lk', !!(fx && fx.choice && p.choice != null && p.choice !== i));
  if(!fx || p.hp <= 0 || G.sw || p.hid) return;
  if(fx.regen && p.hp < p.max && G.intro <= 0){
    p.hp = Math.min(p.max, p.hp + p.max*fx.regen*dt);
    if(Math.random() < dt*2) vp({ x:p.x + R_(-10, 10), y:p.y - R_(0, 20), vy:-30, life:.6, s:3, s1:1, kind:'star', col:'#8dff9a' });
  }
  if(fx.heal && !p.berryHp && p.hp < p.max*fx.heal.below){
    p.berryHp = 1; const g = p.max*fx.heal.amount; p.hp = Math.min(p.max, p.hp + g);
    heldPop(p, h, '#8dff9a'); dmgTxt(p.x, p.y - 34, '+' + Math.round(g*10), '#8dff9a'); tone(880, .12, 'triangle', .07, 300);
  }
  if(fx.cure && !p.berrySt && p.st && (fx.cure.includes('any') || fx.cure.includes(p.st))){
    p.berrySt = 1; p.st = null; p.stT = 0; p.slowOnly = false; heldPop(p, h, '#9fe3ff'); tone(1100, .12, 'triangle', .07, 200);
  }
};
