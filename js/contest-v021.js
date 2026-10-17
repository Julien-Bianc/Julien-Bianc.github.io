// ============================================================
//  contest-v021.js — CONCOURS POKÉMON v0.21 (à charger après js/contest.js, js/contest-scenes.js, js/menu-contest.js)
//    1. 4e épreuve : IMITATION — le jury montre une suite de poses (Gauche / Saut / Droite / Devant), répète-la !
//    2. Plus de « à tour de rôle » : un concours se joue SEUL (contre l'ordinateur) ou EN LIGNE (2 à 4 joueurs)
//    3. Pokémon SHINY : bonus à l'épreuve de Style (CON_SHINY_STYLE) + il apparaît en shiny sur scène
//    4. Concours EN LIGNE : salon par code ou invitation d'un ami. Chaque joueur joue chaque épreuve en même temps
//       sur son appareil ; les notes sont échangées ; l'ordinateur complète jusqu'à 4 concurrents.
//  Préfixe de tous les noms : cv21 / CV21 (pour ne JAMAIS écraser une fonction du jeu).
// ============================================================
const CON_SHINY_STYLE = 12;                                 // points de Style en plus pour un Pokémon shiny
const CV21_ROUNDS = ['style', 'dance', 'memo', 'perf'];
Object.assign(WEIGHT, { style:.2, dance:.27, memo:.23, perf:.3 });   // poids des 4 épreuves (total = 1)
const CV21_MEMO = { seqs:[[3, 4, 5], [4, 5, 6], [4, 6, 7], [5, 6, 8]], show:.55, limit:3.2 };   // longueurs des suites par rang, durée d'une pose, temps max par appui

ROUND_INFO.memo = { title:'Épreuve d\'Imitation', txt:'Le jury montre une suite de <b>poses</b> (Gauche / Saut / Droite / Devant). <b>Répète-la</b> dans le même ordre (tactile, flèches ou ZQSD). Les suites s\'allongent !' };
const cv21Total = ct => CV21_ROUNDS.reduce((a, k) => a + (ct[k] || 0)*WEIGHT[k], 0);

// ---------- 3. shiny ----------
const CON_SHINY = new Set();
styleCalc = (prev => function(C, ct){
  const r = prev(C, ct);
  if(ct.shiny){ r.score = Math.min(100, r.score + CON_SHINY_STYLE); r.judges = r.judges.map((j, i) => i === 0 ? Math.min(5, j + 1) : j); r.shiny = true; }
  return r;
})(styleCalc);
conFrame = (prev => function(pid, list, sec, row){ const f = prev(pid, list, sec, row); return f && CON_SHINY.has(pid) && typeof shinyCanvas === 'function' ? shinyCanvas(f, pid) : f; })(conFrame);
aiScore = (prev => function(C, ct, kind){
  if(kind === 'memo') return Math.round(clamp((.42 + C.rank*.12 + (Math.random() - .5)*.3)*100, 12, 98));
  return prev(C, ct, kind);
})(aiScore);
banner = (prev => function(x, title, C){ return prev(x, C && C.curKind === 'memo' && /PRESTATIONS/.test(title) ? 'ÉPREUVE D\'IMITATION' : title, C); })(banner);

// ---------- 1. épreuve d'imitation ----------
function sceneMemo(C, ct, idx, done){
  const lens = CV21_MEMO.seqs[C.rank] || CV21_MEMO.seqs[0], seqs = lens.map(n => Array.from({ length:n }, () => Math.floor(Math.random()*4)));
  let si = 0, ph = 'intro', tt = 0, pos = 0, ok = 0, total = lens.reduce((a, b) => a + b, 0), flash = -1, flT = -9, judge = '', jT = -9, inT = 0, speed = 0;
  const BTN = () => [{ x:CV.cx - 42, y:142 }, { x:CV.cx, y:120 }, { x:CV.cx + 42, y:142 }, { x:CV.cx, y:162 }], btnT = [-9, -9, -9, -9];
  const tone = l => [330, 440, 523, 659][l];
  const sc = {
    en:.35, enT:.35,
    key(k){ const l = { arrowleft:0, q:0, a:0, arrowup:1, z:1, w:1, ' ':1, arrowright:2, d:2, arrowdown:3, s:3 }[k]; if(l != null){ press(l); return true; } },
    down(a, b){ BTN().forEach((p, i) => { if(hit(a, b, p.x, p.y, 18)) press(i); }); },
    update(dt){
      tt += dt;
      if(ph === 'intro' && tt > 1.2){ ph = 'show'; tt = 0; }
      else if(ph === 'show'){
        const S = seqs[si], k = Math.floor(tt/CV21_MEMO.show), inStep = tt - k*CV21_MEMO.show;
        if(k < S.length){ if(flash !== k*10 + S[k] && inStep < .05){ flash = k*10 + S[k]; flT = sc.t; snd(tone(S[k]), .2, 'triangle', .09); btnT[S[k]] = sc.t; } }
        else if(tt > S.length*CV21_MEMO.show + .3){ ph = 'input'; tt = 0; pos = 0; inT = 0; }
      } else if(ph === 'input'){
        inT += dt;
        if(inT > CV21_MEMO.limit){ judge = 'Trop lent !'; jT = sc.t; snd(150, .2, 'sawtooth', .06); next(false); }
      } else if(ph === 'judge' && tt > .9){ si++; if(si >= seqs.length){ ph = 'end'; tt = 0; const acc = ok/total; cheer(acc); sc.enT = .3 + acc*.7; fxWord(sc, acc >= .8 ? 'BRAVO !' : acc >= .5 ? 'PAS MAL' : 'COURAGE', CV.cx - 20, 50, '#ffe27a', 16); if(acc >= .8) ctKick(sc, .5, .4, '255,220,120'); } else { ph = 'show'; tt = 0; } }
      else if(ph === 'end' && tt > 2){ sc.finished = true; const acc = ok/total, score = Math.round(clamp(acc*88 + Math.min(12, speed) + (ct.stats[C.cat] || 0)/STAT_MAX*4, 0, 100)); done({ score, ok, total }); }
    },
    draw(x, dt){
      const t = sc.t, footY = 90, px = CV.cx - 20; drawStage(x, t, footY, sc); drawSpot(x, px, footY, t, .8 + sc.en*.4);
      const since = t - flT, act = since < .4, l = flash >= 0 ? flash % 10 : -1;
      const row = act && l >= 0 ? [6, 0, 2, 0][l] : 0, ox = act && l >= 0 ? [-14, 0, 14, 0][l]*Math.sin(since/.4*3.14) : 0, lift = act && l === 1 ? Math.sin(since/.4*3.14)*10 : 0;
      conMon(x, ct.pid, act ? ANIM.hop : ANIM.idle, t, row, px + ox, footY, act && l === 3 ? 2.3 : 2, { lift });
      banner(x, 'ÉPREUVE D\'IMITATION', C); drawBoard(x, C, idx);
      x.fillStyle = '#7ac8ff'; x.fillRect(CV.l, 94, CV.W, CV.b - 94); for(let yy = 94; yy < CV.b; yy += 8) for(let xx = CV.l + ((yy/8 | 0) % 2)*8; xx < CV.r; xx += 16) cRect(x, '#5ab0f0', xx, yy, 8, 8);
      cRect(x, '#14101c', CV.l, 94, CV.W, 1);
      // la suite : pastilles (montrée → couleurs ; à toi → remplies au fur et à mesure)
      const S = seqs[Math.min(si, seqs.length - 1)], w = S.length*14, sx = CV.cx - w/2 + 7;
      cPanel(x, sx - 12, 99, w + 10, 16, '#1b3b7a');
      S.forEach((v, i) => { const shown = ph === 'show' && i <= Math.floor(tt/CV21_MEMO.show), done2 = ph !== 'show' && i < pos;
        cDisc(x, '#14101c', sx + i*14, 107, 6); cDisc(x, shown ? DANCE_COL[v] : done2 ? '#ffffff' : '#3a4a7a', sx + i*14, 107, 5); });
      cTxt(x, `Suite ${Math.min(si + 1, seqs.length)}/${seqs.length}`, CV.l + 10, CV.t + 50, { sz:9, col:'#ffe27a' });
      const msg = ph === 'intro' ? 'Regarde bien…' : ph === 'show' ? 'Regarde la suite…' : ph === 'input' ? 'À toi ! Répète la suite' : '';
      if(msg && Math.sin(t*6) > -.4) cTxt(x, msg, CV.cx, 84, { sz:9, al:'center', col:'#fff3a0' });
      if(ph === 'input'){ const u = 1 - inT/CV21_MEMO.limit; cRect(x, '#14101c', CV.cx - 40, 88, 80, 3); cRect(x, u > .35 ? '#7ae07a' : '#ff7a6a', CV.cx - 40, 88, 80*u, 3); }
      if(t - jT < .9 && judge){ cTxt(x, judge, px + 52, 52 - (t - jT)*8, { sz:12, al:'center', col:judge === 'Parfait !' ? '#ffe27a' : judge === 'Bien !' ? '#9fe8ff' : '#ff8a8a' }); }
      BTN().forEach((p, i) => {
        const pr = t - btnT[i] < .14, dy = pr ? 2 : 0; cDisc(x, '#14101c', p.x, p.y + 2, 17); cDisc(x, '#16315e', p.x, p.y + 2, 16);
        cDisc(x, '#14101c', p.x, p.y + dy, 17); cDisc(x, DANCE_COL[i], p.x, p.y + dy, 15); cRect(x, 'rgba(255,255,255,.3)', p.x - 9, p.y - 10 + dy, 18, 3);
        if(pr){ x.save(); x.globalCompositeOperation = 'lighter'; cDisc(x, 'rgba(255,255,255,.45)', p.x, p.y + dy, 15); x.restore(); }
        cTxt(x, DANCE_NAME[i], p.x, p.y + 3 + dy, { sz:6, al:'center' });
      });
    }
  };
  function next(good){ ph = 'judge'; tt = 0; if(good){ judge = 'Parfait !'; jT = sc.t; ctKick(sc, .35, .3, '255,230,140'); fxBurst(sc, CV.cx - 20, 70, 24, null, 90, { life:.9 }); cheer(.3); sc.enT = Math.min(1, sc.enT + .1); } }
  function press(l){
    if(ph !== 'input') return;
    const S = seqs[si], t = sc.t; btnT[l] = t; flash = 99*10 + l; flT = t;
    if(S[pos] === l){ ok++; pos++; snd(tone(l), .14, 'square', .08); speed += Math.max(0, (CV21_MEMO.limit - inT)/CV21_MEMO.limit)*12/total; inT = 0; fxRing(sc, CV.cx - 20, 92, DANCE_COL[l], 50, 2);
      if(pos >= S.length) next(true); }
    else { judge = 'Raté !'; jT = t; snd(140, .2, 'sawtooth', .07); sc.enT = Math.max(.2, sc.enT - .1); next(false); }
  }
  return conRun(sc);
}

// ---------- déroulement (solo et en ligne) ----------
startContest = function(cat, rank, picks, net){
  const C = { cat, rank, cts:[], rounds:CV21_ROUNDS.slice(), ri:0, ci:0, shown:{}, humans:1, chartN:CONTEST_RANKS[rank].notes, net:net || null, played:{} };
  CON_SHINY.clear();
  if(net){
    net.list.forEach(p => { const me = p.id === net.me; C.cts.push({ pid:p.pid, name:p.pseudo, human:me ? 0 : -2, netId:p.id, stats:p.stats, cap:p.cap ? CAPSULE_BY_ID[p.cap] : null, shiny:!!p.shiny, style:0, dance:0, memo:0, perf:0, total:0 }); if(p.shiny) CON_SHINY.add(p.pid); });
    net.ai.forEach(a => C.cts.push({ pid:a.pid, name:a.name, human:-1, stats:a.stats, cap:a.cap ? CAPSULE_BY_ID[a.cap] : null, pre:a.pre, style:0, dance:0, memo:0, perf:0, total:0 }));
  } else {
    picks.forEach((pid, h) => { const sh = typeof Shiny !== 'undefined' && Shiny.has(pid); if(sh) CON_SHINY.add(pid); C.cts.push({ pid, name:NAME[pid] || pid, human:h, stats:{ ...Con.stat(pid) }, cap:Con.cap(pid), shiny:sh, style:0, dance:0, memo:0, perf:0, total:0 }); });
    while(C.cts.length < 4) C.cts.push(aiContestant(C, C.cts.map(c => c.pid)));
    C.cts.forEach(c => { c.memo = 0; });
  }
  Con.d().played++; Save.save();
  CV21.C = C;
  contestStep(C);
};
function cv21Play(C, ct, kind, idx, fin){
  C.curKind = kind;
  if(kind === 'style'){ const r = styleCalc(C, ct); return sceneStyle(C, ct, idx, r, res => { ct.style = res.score; ct.total = cv21Total(ct); fin(); }); }
  if(kind === 'dance') return sceneDance(C, ct, idx, r => { ct.dance = danceScore(C, ct, r.acc, r.maxCombo, r.N); ct.total = cv21Total(ct); fin(); });
  if(kind === 'memo') return sceneMemo(C, ct, idx, r => { ct.memo = r.score; ct.total = cv21Total(ct); fin(); });
  return scenePerf(C, ct, idx, appealCalc(C, ct), r => { ct.perf = Math.round(Math.min(100, r.sum*1.15)); ct.total = cv21Total(ct); fin(); });
}
contestStep = function(C){
  if(C.ri >= C.rounds.length) return contestEnd(C);
  const kind = C.rounds[C.ri]; C.curKind = kind;
  if(!C.shown[kind]){ C.shown[kind] = 1; return roundIntro(C, kind, () => contestStep(C)); }
  if(C.net) return cv21NetRound(C, kind);
  const ct = C.cts[C.ci];
  const next = () => { C.ci++; if(C.ci >= C.cts.length){ C.ci = 0; C.ri++; roundStandings(C); } else contestStep(C); };
  if(ct.human < 0){ const sc = aiScore(C, ct, kind); ct[kind] = sc; ct.total = cv21Total(ct); return sceneShow(C, ct, C.ci, kind, sc, next); }
  cv21Play(C, ct, kind, C.ci, next);
};
roundIntro = function(C, kind, go){
  const I = ROUND_INFO[kind], me = C.cts.find(c => c.human === 0);
  menu(`<h1>${I.title}</h1><div class='cin'><div class='cinh'>${ribbonTag(C.cat, C.rank, true)}<div><b style='color:${catColor(C.cat)}'>${CSTAT[C.cat].name}</b> · ${CONTEST_RANKS[C.rank].name}${C.net ? ' · <span class="tag">EN LIGNE</span>' : ''}<br><small>Épreuve ${C.ri + 1} sur ${C.rounds.length}</small></div></div><p>${I.txt}</p>
    ${kind === 'style' && me && me.shiny ? `<p class='cv21sh'>✦ ${esc(me.name)} est <b>shiny</b> : +${CON_SHINY_STYLE} points de Style !</p>` : ''}</div>${standingsHtml(C)}<div class='row'><button class='btn' id='go'>C'est parti !</button></div>`);
  document.getElementById('go').onclick = go;
};
standingsHtml = function(C){
  const o = C.cts.map((c, i) => i).sort((a, b) => C.cts[b].total - C.cts[a].total), done = k => C.rounds.indexOf(k) < C.ri || (C.net && C.played && C.played[k]);
  const lab = { style:'Style', dance:'Rythme', memo:'Imit.', perf:'Prest.' };
  return `<table class='ctab'><tr><th></th><th></th>${C.rounds.map(k => `<th>${lab[k]}</th>`).join('')}<th>Total</th></tr>${o.map((i, rk) => { const c = C.cts[i];
    return `<tr style='--cc:${CT_COL[i % 4]}'><td>${rk + 1}</td><td class='nm'>${thumb(c.pid)} ${esc(c.name)}${c.human === 0 ? ' <span class="tag">Toi</span>' : c.human === -2 ? ' <span class="tag">En ligne</span>' : ''}${c.shiny ? ' <span class="cv21s">✦</span>' : ''}</td>${C.rounds.map(k => `<td>${c[k] ? Math.round(c[k]) : '—'}</td>`).join('')}<td><b>${Math.round(c.total)}</b></td></tr>`; }).join('')}</table>`;
};
roundStandings = function(C){
  if(C.ri >= C.rounds.length) return contestEnd(C);
  menu(`<h1>Classement provisoire</h1>${standingsHtml(C)}<div class='row'><button class='btn' id='go'>Épreuve suivante</button></div>`);
  document.getElementById('go').onclick = () => contestStep(C);
  if(C.net) setTimeout(() => { const b = document.getElementById('go'); if(b && CV21.C === C) b.click(); }, 5000);   // en ligne : on enchaîne tout seul
};
contestEnd = (prev => function(C){
  C.cts.forEach(c => { if(c.human === -2) c.human = -1; });                                   // les autres joueurs en ligne : pas de gain chez toi
  const r = prev(C);
  document.querySelectorAll('.cp small').forEach(sm => { if(sm.textContent === 'Joueur 1') sm.textContent = 'Toi'; });
  document.querySelectorAll('.cprize p').forEach(p => { p.innerHTML = p.innerHTML.replace('Joueur 1 —', 'Toi —'); });
  if(C.net){
    document.querySelectorAll('.cp small').forEach((s, k) => { const o = C.cts.map((c, i) => i).sort((a, b) => C.cts[b].total - C.cts[a].total); const c = C.cts[o[k]]; if(c && c.netId) s.textContent = c.netId === CV21.m?.me.id ? 'Toi' : 'En ligne'; });
    document.querySelectorAll('.cprize p').forEach(p => { p.textContent = p.textContent.replace('Joueur 1', 'Toi'); });
    const again = document.getElementById('again'); if(again){ again.textContent = 'Concours en ligne'; again.onclick = () => { cv21Close(); cv21Online(); }; }
    const hub = document.getElementById('hub'); if(hub) hub.onclick = () => { cv21Close(); showContest(); };
  }
  CV21.C = null;
  return r;
})(contestEnd);

// ---------- 2. écran « Participer » : solo, ou en ligne ----------
showContestPlay = function(){
  CON_HUM = 1;
  menu(`<div class='hd'><h1>Choisis un concours</h1>${walletHtml()}</div>
    <div class='row cplay'><button class='btn2 on'>Solo</button><button class='btn2' id='cv21on'>🌐 En ligne</button><small>4 épreuves : Style · Rythme · Imitation · Prestations</small></div>
    <div class='scroll ccats'>${CONTEST_STATS.map(s => `<div class='ccat' style='--cc:${s.col}'><b>${s.name}</b>${CONTEST_RANKS.map(r => { const ok = Con.unlocked(s.id, r.id), win = Con.d().wins[s.id + ':' + r.id];
      return `<button class='crk ${ok ? '' : 'lock'}' data-c='${s.id}' data-r='${r.id}' ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${r.name}${win ? ' ✔' : ''}</button>`; }).join('')}</div>`).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-c]', el => pickContestMon(el.dataset.c, +el.dataset.r, [], 0));
  document.getElementById('cv21on').onclick = () => cv21Online();
  document.getElementById('back').onclick = showContest;
};

// ---------- 4. EN LIGNE ----------
const CV21 = { m:null, C:null, seen:new Set() };
const cv21Code = () => Array.from({ length:5 }, () => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[Math.floor(Math.random()*32)]).join('');
const cv21Ready = () => typeof Online !== 'undefined' && Online.sb && Online.user;
const cv21Send = (k, d) => { const M = CV21.m; if(M && M.T) M.T.send(k, d || 0); };
const cv21Pseudo = kind => kind === 'sb' && cv21Ready() ? Online.user.pseudo : (typeof LocalLobby !== 'undefined' && LocalLobby.pseudo) || ('Joueur-' + Math.floor(Math.random()*900 + 100));
function cv21Close(quiet){
  const M = CV21.m; if(!M) return; if(!quiet) cv21Send('leave', { id:M.me.id });
  M.timers.forEach(clearInterval); CV21.m = null; setTimeout(() => { try{ M.T.close(); }catch(e){} }, 400);
}
function cv21Online(){
  const on = cv21Ready();
  menu(`<h1>Concours en ligne</h1><div class='cin'><p>Affronte jusqu'à <b>3 amis</b> : chacun joue les 4 épreuves en même temps sur son appareil, les notes sont comparées à la fin de chaque épreuve. L'ordinateur complète jusqu'à 4 concurrents.</p></div>
    <div class='row'><button class='btn' id='cvc' ${on ? '' : 'disabled'}>Créer un concours</button><input id='cvcode' maxlength='5' placeholder='CODE' autocomplete='off'><button class='btn2' id='cvj' ${on ? '' : 'disabled'}>Rejoindre</button></div>
    ${on ? `<p class='hint'>Connecté en tant que <b>${esc(Online.user.pseudo)}</b>.</p>` : `<p class='hint'>Pour jouer en ligne, connecte-toi dans <b>Multijoueur</b>. <button class='btn2 sm' id='cvlog'>Se connecter</button></p>`}
    <div class='row'><button class='btn2 sm' id='cvlc'>Test local (2 onglets)</button><button class='btn2' id='back'>Retour</button></div>`);
  const inp = document.getElementById('cvcode'); inp.oninput = () => { inp.value = inp.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); inp.classList.remove('bad'); };
  const join = kind => { const c = inp.value; if(c.length !== 5){ inp.classList.add('bad'); return; } cv21PickMon(null, null, pid => cv21Open({ code:c, host:false, kind, pid })); };
  document.getElementById('cvc').onclick = () => cv21PickCat(kind => kind, 'sb');
  document.getElementById('cvj').onclick = () => join('sb');
  document.getElementById('cvlc').onclick = () => { if(inp.value.length === 5) join('local'); else cv21PickCat(null, 'local'); };
  const lg = document.getElementById('cvlog'); if(lg) lg.onclick = () => SCREENS.online();
  document.getElementById('back').onclick = showContestPlay;
}
function cv21PickCat(_, kind){
  menu(`<div class='hd'><h1>Créer un concours en ligne</h1></div><p class='hint'>Choisis la catégorie et le rang (ceux que tu as débloqués).</p>
    <div class='scroll ccats'>${CONTEST_STATS.map(s => `<div class='ccat' style='--cc:${s.col}'><b>${s.name}</b>${CONTEST_RANKS.map(r => { const ok = Con.unlocked(s.id, r.id);
      return `<button class='crk ${ok ? '' : 'lock'}' data-c='${s.id}' data-r='${r.id}' ${ok ? '' : 'disabled'}>${ok ? '' : '🔒 '}${r.name}</button>`; }).join('')}</div>`).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-c]', el => cv21PickMon(el.dataset.c, +el.dataset.r, pid => cv21Open({ code:cv21Code(), host:true, kind, pid, cat:el.dataset.c, rank:+el.dataset.r })));
  document.getElementById('back').onclick = cv21Online;
}
function cv21PickMon(cat, rank, go){
  menu(`<h1>Choisis ton Pokémon</h1>${cat ? `<small class='sub'>${esc(ribbonName(cat, rank))} — stat utile : <b style='color:${catColor(cat)}'>${CSTAT[cat].name}</b></small>` : `<small class='sub'>La catégorie sera choisie par celui qui a créé le concours.</small>`}
    <div class='scroll igrid cmons'>${myMons().map(id => { const s = Con.stat(id); return `<button class='cm' data-id='${id}'>${thumb(id)}<b>${esc(NAME[id] || id)}${typeof Shiny !== 'undefined' && Shiny.has(id) ? ' ✦' : ''}</b><i><u style='width:${(cat ? s[cat] : statSum(s)/5)/STAT_MAX*100}%;background:${cat ? catColor(cat) : '#ffd23f'}'></u></i></button>`; }).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('.cm', el => go(el.dataset.id));
  document.getElementById('back').onclick = cv21Online;
}
function cv21Me(pid){ const id = Math.random().toString(36).slice(2, 10), cap = Con.capId(pid); return { id, pid, stats:{ ...Con.stat(pid) }, cap, shiny:typeof Shiny !== 'undefined' && Shiny.has(pid) }; }
function cv21Open(o){
  cv21Close(true);
  if(o.kind === 'sb' && !cv21Ready()) return cv21Online();
  const me = cv21Me(o.pid); me.pseudo = cv21Pseudo(o.kind);
  const M = CV21.m = { code:o.code, host:!!o.host, kind:o.kind, T:o.kind === 'local' ? NetT.local('con-' + o.code) : NetT.supabase('con-' + o.code), me, list:[me], seen:new Map(), state:'lobby', cat:o.cat, rank:o.rank, timers:[], t0:performance.now(), inv:new Set(), scores:{} };
  M.T.on((k, d) => { if(CV21.m === M) cv21Msg(M, k, d); });
  M.timers.push(setInterval(() => cv21Tick(M), 700));
  cv21Tick(M); cv21Lobby(M);
}
function cv21Tick(M){
  if(M.state !== 'lobby') return;
  const now = performance.now();
  if(!M.host) cv21Send('h', M.me);
  else { M.list = [M.me, ...[...M.seen.values()].filter(p => now - p.at < 4000).map(p => p.d)].slice(0, 4); cv21Send('l', { list:M.list, cat:M.cat, rank:M.rank }); }
  if(!M.host && !M.cat && now - M.t0 > 10000){ cv21Close(true); gameConfirm('Concours introuvable', 'Aucun concours trouvé avec le code <b>' + esc(M.code) + '</b>.', 'OK', cv21Online); return; }
  const sig = JSON.stringify([M.list.map(p => p.id), M.cat, M.rank]); if(sig !== M.sig){ M.sig = sig; cv21Lobby(M); }
}
function cv21Lobby(M){
  if(CV21.m !== M || M.state !== 'lobby') return;
  const F = M.kind === 'sb' && cv21Ready() ? (Online.friends || []).filter(f => f.status === 'accepted' && Online.isOnline(f.other) && !M.list.some(p => p.pseudo === f.pseudo)) : [];
  menu(`<div class='rnl'><h1>Concours en ligne</h1>
    ${M.cat ? `<p class='rnboss'>${ribbonTag(M.cat, M.rank, true)} <b style='color:${catColor(M.cat)}'>${CSTAT[M.cat].name}</b> · ${CONTEST_RANKS[M.rank].name}</p>` : `<p class='hint'>Recherche du concours…</p>`}
    <div class='rncode'><small>CODE DU CONCOURS</small><b>${esc(M.code)}</b><small>${M.kind === 'local' ? 'Test local : ouvre le jeu dans un autre onglet → Concours → En ligne → Rejoindre' : 'Donne ce code à tes amis : Concours → Participer → En ligne → Rejoindre'}</small></div>
    <div class='rnps'>${M.list.map(p => `<div class='rnp ${p.id === M.me.id ? 'me' : ''}'><b>${p === M.list[0] && M.host || (!M.host && p === M.list[0]) ? '★ ' : ''}${esc(p.pseudo)}</b><span>${thumb(p.pid)}${p.shiny ? '✦' : ''}</span></div>`).join('')}${Array.from({ length:Math.max(0, 4 - M.list.length) }, () => `<div class='rnp empty'><i>ordinateur</i></div>`).join('')}</div>
    ${M.list.length < 4 && M.kind === 'sb' ? `<div class='rninv'><small>Inviter un ami :</small>${F.length ? F.map(f => `<button class='btn2 sm' data-cvinv='${f.other}' ${M.inv.has(f.other) ? 'disabled' : ''}>${M.inv.has(f.other) ? '✔ ' : '+ '}${esc(f.pseudo)}</button>`).join('') : `<i>aucun ami en ligne</i>`}</div>` : ''}
    <div class='row'>${M.host ? `<button class='btn' id='cvgo' ${M.list.length >= 2 ? '' : 'disabled'}>Lancer (${M.list.length}/4)</button>` : `<p class='hint'>${M.cat ? 'L\'hôte va lancer le concours…' : ''}</p>`}<button class='btn2' id='cvq'>Quitter</button></div></div>`);
  bindAll('[data-cvinv]', b => { const f = F.find(x => x.other === b.dataset.cvinv); if(!f || !Online.lobby) return;
    try{ Online.lobby.send({ type:'broadcast', event:'cinv', payload:{ to:f.other, p:Online.user.pseudo, c:M.code, cat:M.cat, rank:M.rank, k:M.code + ':' + f.other + ':' + Date.now() } }); }catch(e){}
    M.inv.add(f.other); b.disabled = true; b.textContent = '✔ ' + f.pseudo; Notif.toast(`Invitation envoyée à <b>${esc(f.pseudo)}</b>`, '#8dff9a'); });
  const go = document.getElementById('cvgo'); if(go) go.onclick = () => cv21HostGo(M);
  document.getElementById('cvq').onclick = () => { cv21Close(); cv21Online(); };
}
function cv21HostGo(M){
  const C0 = { cat:M.cat, rank:M.rank, chartN:CONTEST_RANKS[M.rank].notes }, ai = [], used = M.list.map(p => p.pid);
  while(M.list.length + ai.length < 4){ const a = aiContestant(C0, used.concat(ai.map(x => x.pid))); a.pre = {}; CV21_ROUNDS.forEach(k => a.pre[k] = aiScore(C0, a, k)); ai.push({ pid:a.pid, name:a.name, stats:a.stats, cap:a.cap ? a.cap.id : null, pre:a.pre }); }
  const go = { cat:M.cat, rank:M.rank, list:M.list, ai };
  [0, 400, 1200].forEach(ms => setTimeout(() => cv21Send('go', go), ms));
  cv21Start(M, go);
}
function cv21Start(M, go){
  if(M.state !== 'lobby') return;
  M.state = 'play'; M.cat = go.cat; M.rank = go.rank; M.list = go.list; M.scores = M.scores || {};
  startContest(go.cat, go.rank, [], { me:M.me.id, list:go.list, ai:go.ai });
}
function cv21Msg(M, k, d){
  if(!d) return;
  if(k === 'h'){ if(M.host && M.state === 'lobby' && d.id !== M.me.id) M.seen.set(d.id, { d, at:performance.now() }); return; }
  if(k === 'l'){ if(M.host || M.state !== 'lobby') return; M.cat = d.cat; M.rank = d.rank; if(d.list && d.list.length) M.list = d.list.some(p => p.id === M.me.id) ? d.list : d.list.concat(M.me); return; }
  if(k === 'go'){ if(!M.host && M.state === 'lobby' && d.list && d.list.some(p => p.id === M.me.id)) cv21Start(M, d); return; }
  if(k === 'sc'){ const key = d.id + ':' + d.k; if(M.scores[key] != null) return; M.scores[key] = d.v; cv21Apply(M); return; }
  if(k === 'leave'){ M.gone = M.gone || new Set(); M.gone.add(d.id); if(M.state === 'lobby'){ M.seen.delete(d.id); M.list = M.list.filter(p => p.id !== d.id); cv21Lobby(M); } else cv21Apply(M); }
}
function cv21Apply(M){
  const C = CV21.C; if(!C || !C.net) return;
  C.cts.forEach(c => { if(c.human !== -2) return; C.rounds.forEach(k => { const v = M.scores[c.netId + ':' + k]; if(v != null && !c[k + 'Set']){ c[k] = v; c[k + 'Set'] = 1; c.total = cv21Total(c); } }); });
  if(C.waiting) cv21Wait(C, C.waiting);
}
function cv21NetRound(C, kind){
  const M = CV21.m, me = C.cts.find(c => c.human === 0), idx = C.cts.indexOf(me);
  if(C.played[kind]) return cv21Wait(C, kind);
  cv21Play(C, me, kind, idx, () => {
    C.played[kind] = 1;
    const pk = { id:M.me.id, k:kind, v:me[kind] }; M.scores[M.me.id + ':' + kind] = me[kind];
    [0, 600, 1500, 3500].forEach(ms => setTimeout(() => cv21Send('sc', pk), ms));
    C.waitT0 = performance.now(); cv21Wait(C, kind);
  });
}
function cv21Wait(C, kind){
  if(CV21.C !== C) return;
  const M = CV21.m, gone = (M && M.gone) || new Set(), timeout = performance.now() - (C.waitT0 || 0) > 75000;
  const pending = C.cts.filter(c => c.human === -2 && !c[kind + 'Set'] && !gone.has(c.netId) && !timeout);
  if(!pending.length){
    C.waiting = null;
    C.cts.forEach(c => { if(c.human === -1 && c.pre) c[kind] = c.pre[kind]; c.total = cv21Total(c); });
    C.ri++; return roundStandings(C);
  }
  C.waiting = kind;
  if(document.querySelector('#cv21w') && C.wKind === kind){ document.getElementById('cv21w').innerHTML = pending.map(c => esc(c.name)).join(', '); return; }
  C.wKind = kind;
  menu(`<h1>${ROUND_INFO[kind].title}</h1><div class='cin'><p>Ta note : <b class='gold'>${Math.round(C.cts.find(c => c.human === 0)[kind])}</b></p><p>En attente des autres joueurs : <b id='cv21w'>${pending.map(c => esc(c.name)).join(', ')}</b>…</p></div>${standingsHtml(C)}`);
  clearTimeout(C.wTimer); C.wTimer = setTimeout(() => cv21Wait(C, kind), 76000);
}
// invitations reçues (même canal que les invitations de raid : js/online-core.js → Online.lobby)
setInterval(() => {
  const L = typeof Online !== 'undefined' && Online.lobby; if(!L || L.__cinv) return; L.__cinv = 1;
  try{ L.on('broadcast', { event:'cinv' }, m => cv21InviteIn(m && m.payload)); }catch(e){ console.warn(e); }
}, 1500);
function cv21InviteIn(d){
  if(!d || !Online.user || d.to !== Online.user.id || CV21.seen.has(d.k)) return; CV21.seen.add(d.k);
  if(CV21.m || (typeof NET !== 'undefined' && NET.m) || (typeof RNET !== 'undefined' && RNET.m)) return;
  Notif.show({ id:'ci' + d.c, cls:'chal', title:`🎀 ${esc(d.p)} t'invite à un concours !`, timeout:45,
    text:d.cat ? `${esc(CSTAT[d.cat].name)} · ${esc(CONTEST_RANKS[d.rank].name)}` : '',
    buttons:[{ label:'Rejoindre', cls:'btn', fn:() => { G = null; if(typeof CM !== 'undefined'){ CM.on = true; CM.fresh = true; } cv21PickMon(d.cat, d.rank, pid => cv21Open({ code:d.c, host:false, kind:'sb', pid })); } }, { label:'Refuser' }] });
}

document.head.insertAdjacentHTML('beforeend', `<style>
.cv21sh{color:#ffe27a}.cv21s{color:#ffd23f}
input#cvcode{width:110px;text-align:center;font:700 18px var(--font,monospace);letter-spacing:4px;background:rgba(10,8,24,.85);color:#ffe9a0;border:2px solid var(--line,#fff4);border-radius:8px;padding:3px;user-select:text;-webkit-user-select:text}
input#cvcode.bad{border-color:#ff5a4a}
</style>`);
