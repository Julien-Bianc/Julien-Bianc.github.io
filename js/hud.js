// ============================================================
//  hud.js — NOUVEL ATH DE COMBAT (v0.13), au style des menus (verre sombre, liserés dorés, police pixel)
//    • Panneau de chaque Pokémon : portrait sur fond de son type, nom, types, barre de PV segmentée
//      avec « traînée » blanche des dégâts, PV en chiffres, statut en pastille, Pokéballs de l'équipe
//    • Boss : couronne et cadre violet       • Chrono au centre       • Nom des attaques en bandeaux
//    • Gère aussi les relèves de l'IA (js/ai-swap.js) et le multijoueur (pseudos, ping : js/online-battle.js)
//  Remplace entièrement l'ancien ATH (fonction hud de js/render.js). À charger après js/online-battle.js.
// ============================================================
const HUDF = (w, s) => `${w} ${s}px "Silkscreen","Pixelify Sans","Courier New",monospace`;
function rrect(x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function htext(s, x, y, size, col, al, w){ ctx.font = HUDF(w || 700, size); ctx.textAlign = al || 'left'; ctx.lineJoin = 'round'; ctx.lineWidth = 3; ctx.strokeStyle = '#0c0818'; ctx.strokeText(s, x, y); ctx.fillStyle = col || '#fff'; ctx.fillText(s, x, y); }
function glassPanel(x, y, w, h, edge){
  ctx.save(); rrect(x, y, w, h, 7);
  const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(46,34,86,.9)'); g.addColorStop(1, 'rgba(16,10,34,.9)');
  ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 1.5; ctx.strokeStyle = edge || 'rgba(255,220,160,.45)'; ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x + 7, y + 1.5); ctx.lineTo(x + w - 7, y + 1.5); ctx.strokeStyle = 'rgba(255,255,255,.12)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
}
function hudBall(cx, cy, st){                                        // 0 en réserve, 1 en jeu, 2 K.O.
  ctx.save(); ctx.translate(cx, cy);
  if(st === 1){ ctx.fillStyle = 'rgba(255,210,63,.35)'; ctx.beginPath(); ctx.arc(0, 0, 8.5, 0, 6.283); ctx.fill(); }
  const top = st === 2 ? '#5a5466' : '#e8403c', bot = st === 2 ? '#8a8496' : '#f4f4f8';
  ctx.fillStyle = top; ctx.beginPath(); ctx.arc(0, 0, 5.5, Math.PI, 6.283); ctx.fill();
  ctx.fillStyle = bot; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI); ctx.fill();
  ctx.strokeStyle = '#0c0818'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, 6.283); ctx.moveTo(-5.5, 0); ctx.lineTo(5.5, 0); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 1.6, 0, 6.283); ctx.fill(); ctx.stroke();
  if(st !== 2){ ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.fillRect(-3, -4, 2, 1.5); }
  if(st === 2){ ctx.strokeStyle = '#ff6a5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -4); ctx.lineTo(4, 4); ctx.moveTo(4, -4); ctx.lineTo(-4, 4); ctx.stroke(); }
  ctx.restore();
}
// panneau d'un Pokémon. right = côté adversaire (miroir)
function hudSide(o, right, HW, BW, title, pips, sub){
  const PW = BW + 52, x = right ? HW - PW - 6 : 6, y = 5, boss = !!o.boss, t0 = typesOf(o.t)[0], tc = COL[t0] || '#888';
  glassPanel(x, y, PW, 44, boss ? 'rgba(200,140,255,.8)' : null);
  // portrait
  const px = right ? x + PW - 42 : x + 4, py = y + 4;
  ctx.save(); rrect(px, py, 36, 36, 6); const pg = ctx.createRadialGradient(px + 18, py + 26, 4, px + 18, py + 18, 28);
  pg.addColorStop(0, shade(tc, .25)); pg.addColorStop(1, shade(tc, -.45)); ctx.fillStyle = pg; ctx.fill(); ctx.clip();
  ctx.imageSmoothingEnabled = false; ctx.drawImage(spr(o.t, boss), px + 2, py + 2, 32, 32); ctx.restore();
  ctx.save(); rrect(px, py, 36, 36, 6); ctx.lineWidth = 1.5; ctx.strokeStyle = boss ? '#c88aff' : 'rgba(255,220,160,.7)'; ctx.stroke(); ctx.restore();
  if(boss){ ctx.fillStyle = '#ffd23f'; const cx = px + 18, cy = py - 1; ctx.beginPath(); ctx.moveTo(cx - 8, cy + 3); ctx.lineTo(cx - 8, cy - 4); ctx.lineTo(cx - 4, cy); ctx.lineTo(cx, cy - 6); ctx.lineTo(cx + 4, cy); ctx.lineTo(cx + 8, cy - 4); ctx.lineTo(cx + 8, cy + 3); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#3a2008'; ctx.lineWidth = 1; ctx.stroke(); }
  // nom + types
  const bx = right ? x + 6 : x + 46, al = right ? 'right' : 'left', nx = right ? px - 5 : bx;
  htext(title, nx, y + 15, 12, boss ? '#e8c8ff' : '#fff6e0', al);
  ctx.font = HUDF(700, 12); const tw = ctx.measureText(title).width; let cx0 = right ? nx - tw - 6 : nx + tw + 6;
  ctx.font = HUDF(700, 7); ctx.textAlign = 'center';
  typesOf(o.t).forEach(tp => { const n = (TN[tp] || tp).toUpperCase(), cw = ctx.measureText(n).width + 8; if(right) cx0 -= cw;
    ctx.save(); rrect(cx0, y + 7, cw, 9, 3); ctx.fillStyle = COL[tp] || '#888'; ctx.fill(); ctx.restore(); ctx.fillStyle = '#fff'; ctx.fillText(n, cx0 + cw/2, y + 14); cx0 += right ? -3 : cw + 3; });
  // barre de PV
  const hp = Math.max(0, o.hp), mx = o.max || 1, k = hp/mx; o.hpg = o.hpg == null ? k : (o.hpg > k ? Math.max(k, o.hpg - DT*.45) : k);
  const bw = BW, by = y + 20, bxx = right ? x + 6 : x + 46;
  ctx.save(); rrect(bxx - 1, by - 1, bw + 2, 10, 4); ctx.fillStyle = '#0a0614'; ctx.fill(); ctx.clip();
  const fill = (v, c) => { const w = bw*v; ctx.fillStyle = c; ctx.fillRect(right ? bxx + bw - w : bxx, by, w, 8); };
  fill(o.hpg, 'rgba(255,255,255,.85)');
  const c1 = k < .25 ? '#e8503c' : k < .5 ? '#f0c030' : '#46d468', c2 = k < .25 ? '#a82a1c' : k < .5 ? '#b88a10' : '#209a44';
  const gg = ctx.createLinearGradient(0, by, 0, by + 8); gg.addColorStop(0, c1); gg.addColorStop(1, c2); fill(k, gg);
  ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(right ? bxx + bw - bw*k : bxx, by, bw*k, 2);
  ctx.fillStyle = 'rgba(10,6,20,.55)'; for(let i = 1; i < 10; i++) ctx.fillRect(bxx + Math.round(bw*i/10), by, 1, 8);
  if(k < .25 && Math.sin(G.time*10) > 0){ ctx.fillStyle = 'rgba(255,80,60,.25)'; ctx.fillRect(bxx, by, bw, 8); }
  ctx.restore();
  // PV en chiffres + statut
  htext(String(Math.ceil(hp*10)), right ? bxx : bxx + bw, y + 40, 11, '#fff', right ? 'left' : 'right');
  if(o.st && typeof ST_TAG !== 'undefined' && ST_TAG[o.st]){ let [s, c] = ST_TAG[o.st]; if(o.st === 'par' && o.slowOnly){ s = 'RALENTI'; c = '#9fe3ff'; }
    ctx.font = HUDF(700, 7); const w = ctx.measureText(s).width + 8, sx = right ? bxx + bw - w : bxx; ctx.save(); rrect(sx, y + 32, w, 9, 3); ctx.fillStyle = c; ctx.fill(); ctx.restore();
    ctx.fillStyle = '#14101c'; ctx.textAlign = 'center'; ctx.fillText(s, sx + w/2, y + 39); }
  // Pokéballs de l'équipe
  pips.forEach((st, i) => hudBall(right ? x + PW - 8 - i*15 : x + 8 + i*15, y + 54, st));
  if(sub) htext(sub, right ? x + PW - 6 : x + 6, y + 70, 8, right ? '#ffb0a0' : '#9fe3ff', right ? 'right' : 'left');
}
function hudEnemyPips(){
  if(typeof NET !== 'undefined' && NET.m && G.cfg && G.cfg.mode === 'online' && NET.m.foe && NET.m.foe.tm) return NET.m.foe.tm.map(r => r[1] <= 0 ? 2 : r[0] === G.e.t ? 1 : 0);
  if(G.es && G.eko) return G.et.map((_, i) => G.eko[i] || (G.es[i] && G.es[i].hp <= 0 && i !== G.ei) ? 2 : i === G.ei ? 1 : 0);
  return G.et.map((_, i) => i < G.wave ? 2 : i === G.wave ? 1 : 0);
}
hud = function(){
  const p = G.p, e = G.e, HW = VW/UIK.hud, BW = Math.max(80, Math.min(170, Math.floor((HW - 2*58 - 80)/2)));
  const on = typeof NET !== 'undefined' && NET.m && G.cfg && G.cfg.mode === 'online';
  hudSide(p, 0, HW, BW, NAME[p.t], G.team.map(c => c.hp <= 0 ? 2 : c === p ? 1 : 0), on ? NET.m.me.pseudo : '');
  hudSide(e, 1, HW, BW, (e.boss ? 'BOSS ' : '') + NAME[e.t], hudEnemyPips(), on ? NET.m.foe.pseudo : '');
  // chrono
  const s = Math.floor(G.time), tm = Math.floor(s/60) + ':' + String(s%60).padStart(2, '0');
  glassPanel(HW/2 - 26, 5, 52, 18); htext(tm, HW/2, 18, 11, '#ffe9a0', 'center');
  if(on){ const M = NET.m, pc = M.ping < 90 ? '#8dff9a' : M.ping < 180 ? '#ffe27a' : '#ff8a7a'; htext(M.lost ? 'connexion perdue…' : (M.ping ? M.ping + ' ms' : ''), HW/2, 33, 8, M.lost ? '#ff8a7a' : pc, 'center'); }
  // noms des attaques
  [0, 1].forEach(i => {
    const l = lb[i]; if(!l || l.ttl <= 0) return;
    ctx.font = HUDF(700, 11); const txt = l.s, w = ctx.measureText(txt).width + 22, a = Math.min(1, l.ttl*3), slide = (1 - Math.min(1, (1.1 - l.ttl)*8))*20;
    const x = i ? HW - w - 6 + slide : 6 - slide, y = 80;
    ctx.save(); ctx.globalAlpha = a; glassPanel(x, y, w, 18, COL[l.t] || null);
    ctx.fillStyle = COL[l.t] || '#ffd23f'; ctx.fillRect(i ? x + w - 5 : x + 2, y + 3, 3, 12);
    htext(txt, x + w/2, y + 13, 11, '#fff', 'center'); ctx.restore();
  });
};
