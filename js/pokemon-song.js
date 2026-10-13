// ============================================================
//  pokemon-song.js — attaque 'song' (chant en cône qui endort) + capacité « onHit » (ex. Joli Sourire de Rondoudou).
//  Données : champ  kind:'song'  dans data/pokemon*.js (range, half, delay, status).
// ============================================================
const songs = [];
function song(s, d, m, c, own, sc, ang){
  const P = m.song, a = ang !== undefined ? ang : Math.atan2(d.y - s.y, d.x - s.x);
  s.ann = { an:P.anim || 'Shoot', t0:G.time };
  songs.push({ x:s.x, y:s.y, a, half:P.half || .6, rng:(P.range || 230)*(1 + c*.25), t:0, delay:P.delay ?? .5, own, status:P.status, col:COL[m.tp] || '#ff9ad8', done:false, s });
  playSfx('cast:fee');
}
function updSongs(dt){
  for(let i = songs.length - 1; i >= 0; i--){
    const q = songs[i]; q.t += dt; q.x = q.s.x; q.y = q.s.y;
    if(!q.done && q.t >= q.delay){
      q.done = true; const tg = q.own ? G.e : G.p;
      const dx = tg.x - q.x, dy = tg.y - q.y, dist = Math.hypot(dx, dy);
      let da = Math.atan2(dy, dx) - q.a; da = Math.atan2(Math.sin(da), Math.cos(da));
      if(tg.hp > 0 && dist < q.rng + tg.r && Math.abs(da) < q.half + Math.atan2(tg.r, Math.max(dist, 1))){
        if(q.status && Math.random() < (q.status.chance ?? 1)) applyStatus(tg, q.status.kind); else dmgTxt(tg.x, tg.y - 50, 'RÉSISTE !', '#c8c8d0');
      } else dmgTxt(q.x, q.y - 60, 'RATÉ', '#c8c8d0');
    }
    if(q.t > q.delay + .9) songs.splice(i, 1);
  }
}
function drawSongs(){
  for(const q of songs){
    const u = Math.min(1, q.t/(q.delay + .6)), fade = q.t > q.delay ? Math.max(0, 1 - (q.t - q.delay)/.9) : 1;
    ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.a);
    const g = ctx.createRadialGradient(0, 0, 10, 0, 0, q.rng); g.addColorStop(0, hexA(q.col, .3*fade)); g.addColorStop(1, hexA(q.col, .05*fade));
    ctx.beginPath(); ctx.moveTo(10, 0); ctx.arc(0, 0, q.rng*Math.min(1, .25 + u*1.2), -q.half, q.half); ctx.closePath(); ctx.fillStyle = g; ctx.fill();
    ctx.font = 'bold 16px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.fillStyle = hexA('#ffffff', .9*fade);
    for(let k = 0; k < 7; k++){ const rr = ((G.time*120 + k*q.rng/7) % q.rng), an = (k%3 - 1)*q.half*.7 + Math.sin(G.time*5 + k)*.12; ctx.save(); ctx.rotate(an); ctx.translate(rr, 0); ctx.rotate(-q.a - an); ctx.fillText(k%2 ? '♪' : '♫', 0, 0); ctx.restore(); }
    ctx.restore();
  }
}
const _castSong = cast;
cast = function(s, d, m, c, own, sc, ang){ if(m.song) return song(s, d, m, c, own, sc, ang); return _castSong(s, d, m, c, own, sc, ang); };
const _stepSong = step;
step = function(dt){ _stepSong(dt); if(G && !G.over && !G.paused) updSongs(dt); };
const _spawnSong = spawn; spawn = function(){ _spawnSong(); songs.length = 0; };
const _dbSong = drawBullets; drawBullets = function(){ _dbSong(); drawSongs(); };

// capacité « onHit » : quand le Pokémon est touché (au contact si melee:true), l'attaquant peut subir un statut
function onHitAbility(target, attacker, b){
  const ab = abilityOf(target); if(!ab || !ab.onHit || !attacker || target.hp <= 0) return;
  if(ab.onHit.melee && b.k !== 'melee') return;
  if(Math.random() < (ab.onHit.status.chance ?? .2)){ applyStatus(attacker, ab.onHit.status.kind); dmgTxt(target.x, target.y - 70, ab.name.toUpperCase() + ' !', '#ff9ad8'); }
}
const _hEsg = hurtE; hurtE = function(d, b){ const e = G && G.e, r = _hEsg(d, b); if(e && b && b.own) onHitAbility(e, G.p, b); return r; };
const _hPsg = hurtP; hurtP = function(d, b){ const p = G && G.p, r = _hPsg(d, b); if(p && b && !b.own) onHitAbility(p, G.e, b); return r; };
