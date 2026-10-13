// ============================================================
//  abilities-plus.js — NOUVELLES CAPACITÉS (v0.09), champ `ability` dans data/pokemon*.js :
//    immune      : ['sol']             -> immunisé aux attaques de ces types (Lévitation)
//    magicGuard  : true                -> ne perd pas de PV par brûlure / poison / tempête de sable (Garde Magik)
//    roughSkin   : .05                 -> qui le frappe AU CONTACT perd 5 % de ses PV max (Peau Dure)
//    technician  : { max:10, mult:1.5 }-> attaques de puissance ≤ max : dégâts x mult (Technicien)
//    synchro     : true                -> quand il subit un statut, l'adversaire subit le même (Synchro)
//    sandStream  : { dps:.5, resist:.8 } -> tempête de sable tant qu'il est au combat : l'adversaire perd dps PV/s
//                                         (sauf Roche, Sol, Acier) et lui subit x resist des attaques à distance (Sable Volant)
//  + castMult() : multiplicateur de dégâts appliqué à chaque attaque (Technicien, Danse-Lames, bonus de Téléport).
// ============================================================
function castMult(s, m){
  let k = 1; const ab = abilityOf(s);
  if(ab && ab.technician && m.d > 0 && m.d <= ab.technician.max) k *= ab.technician.mult || 1.5;
  if(s.buf && G.time < s.buf.until && m.d > 0){ k *= s.buf.dmg; if(s.buf.once) s.buf = null; }
  return k;
}

// ---------- immunités, peau dure, résistance du sable ----------
let IMM_T = 0;
function hurtPlus(inner, tgt, att, d, b){
  const ab = abilityOf(tgt);
  if(ab && tgt.hp > 0 && b){
    if(ab.immune && ab.immune.includes(b.t)){ if(G.time - IMM_T > .4){ IMM_T = G.time; dmgTxt(tgt.x, tgt.y - 50, ab.name.toUpperCase() + ' : IMMUNISÉ', '#c8c8d0'); } return; }
    if(ab.sandStream && b.k !== 'melee') d *= ab.sandStream.resist || .8;
  }
  const r = inner(d, b);
  if(ab && ab.roughSkin && b && b.k === 'melee' && att && att.hp > 0){
    const lost = Math.max(1, att.max*ab.roughSkin); att.hp -= lost; dmgTxt(att.x, att.y - 48, '-' + Math.round(lost*10) + ' ' + ab.name, '#ffb08a');
  }
  return r;
}
const _hEab = hurtE; hurtE = function(d, b){ return G ? hurtPlus(_hEab, G.e, G.p, d, b) : _hEab(d, b); };
const _hPab = hurtP; hurtP = function(d, b){ return G ? hurtPlus(_hPab, G.p, G.e, d, b) : _hPab(d, b); };

// ---------- Synchro ----------
let SYNC_LOCK = 0;
const _applyStatusAb = applyStatus;
applyStatus = function(o, kind){
  const had = o && o.st; _applyStatusAb(o, kind);
  if(had || !o || !o.st || SYNC_LOCK || !G) return;
  const ab = abilityOf(o), other = o === G.p ? G.e : G.p;
  if(ab && ab.synchro && other && other.hp > 0 && !other.st){ SYNC_LOCK = 1; dmgTxt(o.x, o.y - 70, 'SYNCHRO !', '#ffb8e8'); applyStatus(other, kind); SYNC_LOCK = 0; }
};

// ---------- Garde Magik + Sable Volant ----------
const sandOf = () => G && [G.p, G.e].find(o => o && o.hp > 0 && !o.hid && abilityOf(o) && abilityOf(o).sandStream);
const _stepAb = step;
step = function(dt){
  if(!G || G.over || G.paused) return _stepAb(dt);
  const p = G.p, e = G.e, hp0 = p.hp, he0 = e.hp, hs = HS > 0;
  _stepAb(dt);
  if(!G || G.over || G.paused || hs) return;
  for(const [o, h0, dot] of [[p, hp0, 2.5*dt], [e, he0, 3*dt]]){
    const ab = abilityOf(o);
    if(ab && ab.magicGuard && o.hp > 0 && (o.st === 'burn' || o.st === 'psn') && o.hp <= h0 - dot*.99) o.hp = Math.min(o.max, o.hp + dot);
  }
  const S = sandOf();
  if(S){
    const tg = S === G.p ? G.e : G.p, ab = abilityOf(tg);
    if(tg && tg.hp > 0 && !tg.hid && G.intro <= 0 && !typesOf(tg.t).some(t => ['roche', 'sol', 'acier'].includes(t)) && !(ab && ab.magicGuard))
      tg.hp -= abilityOf(S).sandStream.dps*dt;
  }
};
// tempête de sable à l'écran
const _dfAb = drawFx;
drawFx = function(){
  _dfAb();
  if(!sandOf()) return;
  ctx.save(); ctx.fillStyle = 'rgba(210,170,100,.10)'; ctx.fillRect(CAM.x - 20, CAM.y - 20, VW + 40, VH + 40);
  ctx.strokeStyle = 'rgba(240,215,160,.55)'; ctx.lineWidth = 1.5; ctx.beginPath();
  for(let i = 0; i < 60; i++){
    const x = CAM.x - 40 + ((i*97 + G.time*(320 + (i%5)*40)) % (VW + 80)), y = CAM.y - 20 + ((i*53 + i*i*7 + G.time*70) % (VH + 40));
    ctx.moveTo(x, y); ctx.lineTo(x - 10, y - 2);
  }
  ctx.stroke(); ctx.restore();
};
