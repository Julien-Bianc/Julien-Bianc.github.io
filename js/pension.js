// ============================================================
//  pension.js — PENSION POKÉMON : sauvegarde, temps réel (besoins, éclosion, évolution), chargement des sprites,
//  écrans du menu (accueil de la pension, boutique, lignées). Le camp jouable en plein écran est dans js/pension-scene.js.
//  Données et réglages : data/pension.js.   Écran enregistré : SCREENS.pension (entrée « Pension » de data/menu.js).
//  Sauvegarde : Save.load().pension = { egg, mon, food, items, done, seen, hatched }
// ============================================================
const PEN_H = 3600e3;
const Pen = {
  d(){
    const s = Save.load();
    if(!s.pension){ s.pension = { egg:null, mon:null, food:{ oran:3 }, items:{}, done:{}, seen:{}, hatched:0 }; Save.save(); }
    const p = s.pension; p.food = p.food || {}; p.items = p.items || {}; p.done = p.done || {}; p.seen = p.seen || {};
    return p;
  },
  save(){ Save.save(); },
  eggs(){ return Save.itemCount(PEN.egg); },
  form(m){ return PEN_LINE[m.line].forms[m.stage]; },
  formName(id){ return PEN_FORMS[id] ? PEN_FORMS[id].name : id; }
};
const penClamp = v => Math.max(0, Math.min(100, v));

// ---------- temps réel : les besoins baissent, l'œuf chauffe, l'âge augmente (même hors-ligne) ----------
function penRates(P){
  const it = P.items || {};
  return { hunger:PEN.rate.hunger*(it.bowl ? .75 : 1), joy:PEN.rate.joy*(it.plant ? .75 : 1), energy:PEN.rate.energy, clean:PEN.rate.clean*(it.soap ? .8 : 1) };
}
function penStep(P, m, dt){
  const r = penRates(P), full = dt;
  if(m.sleeping){
    const rec = PEN.sleepRate*(P.items.bed ? 1.6 : 1), need = (100 - m.energy)/rec, s = Math.min(dt, need);
    m.energy = Math.min(100, m.energy + rec*s); m.hunger -= r.hunger*.4*s; m.clean -= r.clean*.3*s; m.joy -= r.joy*.3*s; dt -= s;
    if(m.energy >= 99.9){ m.sleeping = false; m.woke = true; }
  }
  if(dt > 0 && !m.sleeping){
    const low = (m.hunger < 25) + (m.clean < 25) + (m.energy < 25);
    m.hunger -= r.hunger*dt; m.clean -= r.clean*dt; m.energy -= r.energy*dt; m.joy -= r.joy*dt*(1 + low*.8);
    if(m.energy <= 0){ m.energy = 0; m.sleeping = true; m.collapsed = true; }
  }
  ['hunger', 'joy', 'energy', 'clean'].forEach(k => m[k] = penClamp(m[k])); m.age += full;
}
function penTick(P, now){
  now = now || Date.now();
  if(P.egg){ const e = P.egg, dt = Math.min(Math.max(0, now - e.t)/PEN_H, PEN.maxOffline)*PEN.speed; e.t = now; e.prog += dt; return; }
  const m = P.mon; if(!m) return;
  const dt = Math.min(Math.max(0, now - m.t)/PEN_H, PEN.maxOffline)*PEN.speed; m.t = now; if(dt > 0) penStep(P, m, dt);
}
function penMood(m){
  if(m.sleeping) return 'sleep'; if(m.hunger < 25) return 'hungry'; if(m.energy < 20) return 'tired'; if(m.clean < 25) return 'dirty'; if(m.joy < 30) return 'sad'; if(m.joy > 80) return 'happy'; return 'ok';
}
const PEN_MOOD_TXT = { sleep:'Il dort…', hungry:'Il a très faim !', tired:'Il est épuisé.', dirty:'Il est sale…', sad:'Il est triste.', happy:'Il est ravi !', ok:'Tout va bien.' };
function penEvoState(P){
  const m = P.mon; if(!m || m.stage >= 2) return null; const e = PEN_LINE[m.line].evo[m.stage];
  return { age:e.age, joy:e.joy, ageOK:m.age >= e.age, joyOK:m.joy >= e.joy, ready:m.age >= e.age && m.joy >= e.joy };
}

// ---------- œuf : dépôt, durée, éclosion ----------
const penHatchTotal = P => PEN.hatchH*(P.items.incubator ? .7 : 1);
const penEggLeft = P => Math.max(0, penHatchTotal(P) - P.egg.prog - P.egg.bonus);        // heures restantes
const penEggPct = P => Math.min(1, (P.egg.prog + P.egg.bonus)/penHatchTotal(P));
function penDeposit(){
  const P = Pen.d(); if(P.egg || P.mon || Pen.eggs() < 1) return false;
  Save.addItem(PEN.egg, -1); P.egg = { t:Date.now(), prog:0, bonus:0 }; Pen.save(); return true;
}
function penHatch(P){       // l'œuf éclot : une lignée au hasard
  const L = PEN_LINES[Math.floor(Math.random()*PEN_LINES.length)], now = Date.now();
  P.mon = { line:L.id, stage:0, age:0, t:now, hunger:70, joy:70, energy:85, clean:95, sleeping:false, born:now };
  P.seen[L.forms[0]] = true; P.egg = null; P.hatched = (P.hatched || 0) + 1; Pen.save(); return P.mon;
}
function penEvolve(P){      // passe à la forme suivante ; renvoie { id, final }
  const m = P.mon, L = PEN_LINE[m.line]; m.stage++; const id = L.forms[m.stage], final = m.stage >= 2; P.seen[id] = true;
  if(final){ P.done[L.id] = true; Owned.add(id); }
  Pen.save(); return { id, final, line:L };
}
function penFinishFinal(P){ P.mon = null; Pen.save(); }       // la dernière forme rejoint tes Pokémon de combat : la pension se libère

// ---------- soins ----------
function penFeed(P, fid){
  const m = P.mon, f = PEN_FOOD[fid]; if(!m || m.sleeping) return 'sleep'; if(!f || (P.food[fid] || 0) < 1) return 'none'; if(m.hunger >= 96) return 'full';
  P.food[fid]--; m.hunger = penClamp(m.hunger + f.v*(P.items.bowl ? 1.2 : 1)); let joy = f.joy || 0; const fav = PEN_LINE[m.line].fav === fid; if(fav) joy += 8; m.joy = penClamp(m.joy + joy); m.energy = penClamp(m.energy - .5); Pen.save(); return fav ? 'fav' : 'ok';
}

// ---------- sprites : charge les 12 formes (sans les inscrire comme Pokémon de combat) ----------
let PEN_LOADED = null;
async function penLoad(id){
  if(typeof SPR !== 'undefined' && SPR[id]) return true;
  const f = PEN_FORMS[id], had = !!POKEMON[id]; if(!had) POKEMON[id] = { name:f.name, folder:f.folder, types:['normal'], hp:1, speed:1, moves:[] };
  try{ await loadPokemon(id); return true; }catch(e){ return false; }
  finally{ if(!had) delete POKEMON[id]; }
}
function penLoadAll(){
  if(PEN_LOADED && PEN_LOADED.done) return Promise.resolve(PEN_LOADED.miss);
  if(PEN_LOADED) return PEN_LOADED.p;
  const o = PEN_LOADED = { done:false, miss:[] };
  o.p = Promise.all(Object.keys(PEN_FORMS).map(async id => { if(!(await penLoad(id))) o.miss.push(id); })).then(() => { o.done = true; return o.miss; });
  return o.p;
}
const penHas = id => typeof SPR !== 'undefined' && !!SPR[id];
const _penTh = {};
function penThumb(id){        // image 1re frame (recadrée) ou « ? » si le sprite manque
  if(_penTh[id]) return _penTh[id];
  let u;
  if(penHas(id)){ const f = conFrame(id, ['Idle'], 0, 0); u = f.cv.toDataURL(); }
  else { const c = mkc(32, 32), x = c.getContext('2d'); cDisc(x, '#14101c', 16, 17, 11); cDisc(x, '#5a5278', 16, 17, 10); cTxt(x, '?', 16, 9, { sz:12, al:'center', sh:false }); u = c.toDataURL(); }
  return _penTh[id] = u;
}

// ---------- icônes pixel art des objets de confort ----------
function penIcon(id){
  const key = 'pic' + id; if(_cs[key]) return _cs[key];
  const B = pxBuilder(32, 32), L = B.layer, e = (cx, cy, rx, ry) => mx => { mx.beginPath(); mx.ellipse(cx, cy, rx, ry, 0, 0, 6.2832); mx.fill(); };
  if(id === 'bed'){ L(pxPoly([[3, 16], [29, 16], [26, 27], [6, 27]]), '#b8793a'); L(e(16, 15, 13, 6), '#ff9ac8'); L(e(16, 13.5, 9, 3.5), '#ffd0e8'); for(let k = 0; k < 4; k++){ B.ox.fillStyle = '#8a5a28'; B.ox.fillRect(8 + k*5, 20, 1, 6); } }
  else if(id === 'bowl'){ L(pxPoly([[3, 13], [29, 13], [24, 26], [8, 26]]), '#e8e8f4'); L(e(16, 13, 12.5, 4.5), '#c98a48'); L(e(14, 11.5, 6, 2), '#e8b070'); B.ox.fillStyle = '#ff7ac8'; B.ox.fillRect(10, 19, 12, 2); }
  else if(id === 'toys'){ L(pxDisc(12, 18, 8), '#e8402c'); B.ox.fillStyle = '#fff'; B.ox.fillRect(5, 17, 15, 3); L(pxPoly([[19, 12], [29, 12], [29, 24], [19, 24]]), '#3b8fd9'); B.ox.fillStyle = '#ffd23f'; B.ox.fillRect(22, 15, 4, 4); }
  else if(id === 'soap'){ L(pxPoly([[4, 16], [26, 16], [26, 26], [4, 26]]), '#7ad8ff'); L(pxDisc(8, 10, 4), '#ffffff'); L(pxDisc(18, 7, 3), '#ffffff'); L(pxDisc(25, 11, 3), '#ffffff'); B.ox.fillStyle = '#fff'; B.ox.fillRect(8, 20, 8, 2); }
  else if(id === 'plant'){ L(pxPoly([[8, 19], [24, 19], [21, 29], [11, 29]]), '#d86a3a'); B.ox.fillStyle = '#3fbf5a'; B.ox.fillRect(15, 9, 2, 10); L(pxDisc(16, 8, 4), '#ff7ac8'); L(pxDisc(9, 13, 3), '#ffd23f'); L(pxDisc(23, 13, 3), '#ff7ac8'); B.ox.fillStyle = '#fff'; B.ox.fillRect(15, 7, 2, 2); }
  else { L(pxDisc(16, 15, 10), '#ffd23f'); L(pxPoly([[7, 25], [25, 25], [25, 29], [7, 29]]), '#6a6a7a'); B.ox.fillStyle = '#fff6b8'; B.ox.fillRect(11, 9, 4, 3); }
  return _cs[key] = B.finish().toDataURL();
}

// ---------- formats ----------
function penFmt(h){ const s = Math.max(0, Math.round(h*3600)); if(s >= 86400) return Math.floor(s/86400) + ' j ' + (Math.floor(s/3600) % 24) + ' h'; if(s >= 3600) return Math.floor(s/3600) + ' h ' + String(Math.floor(s/60) % 60).padStart(2, '0'); if(s >= 60) return Math.floor(s/60) + ' min ' + String(s % 60).padStart(2, '0') + ' s'; return s + ' s'; }
const penBar = (v, col) => `<i class='pbr'><u style='width:${penClamp(v)}%;background:${col}'></u></i>`;

// ============================================================
//  ÉCRANS DU MENU
// ============================================================
function showPension(msg){
  const P = Pen.d(); penTick(P);
  menu(`<h1>Pension Pokémon</h1><p id='penload'>Chargement des sprites…</p>`);
  penLoadAll().then(miss => { if(!document.getElementById('penload')) return; renderPension(msg, miss); });
}
function renderPension(msg, miss){
  const P = Pen.d(); penTick(P); const m = P.mon, e = P.egg;
  let card = '';
  if(e){
    card = `<img class='pegg' src='assets/items/${PEN.egg}.png'><div class='pbody'><b>Œuf en incubation</b>${penBar(penEggPct(P)*100, '#ffd23f')}<small>${Math.round(penEggPct(P)*100)} % · éclosion dans ${penFmt(penEggLeft(P))}${P.items.incubator ? ' (couveuse)' : ''}</small></div>`;
  } else if(m){
    const ev = penEvoState(P), fid = Pen.form(m);
    card = `<img class='pthumb' src='${penThumb(fid)}'><div class='pbody'><b>${esc(Pen.formName(fid))}</b> <small>forme ${m.stage + 1}/3 · âge ${penFmt(m.age)}</small>
      <div class='pgs'><span>Faim</span>${penBar(m.hunger, '#ff9a3c')}<span>Bonheur</span>${penBar(m.joy, '#ff7ac8')}<span>Énergie</span>${penBar(m.energy, '#ffd23f')}<span>Propreté</span>${penBar(m.clean, '#5ad8ff')}</div>
      <small>${PEN_MOOD_TXT[penMood(m)]}${ev ? ` · Évolution : âge ${ev.ageOK ? '✓' : penFmt(ev.age)} · bonheur ${ev.joyOK ? '✓' : ev.joy + ' %'}` : ''}</small></div>`;
  } else {
    card = `<img class='pegg dim' src='assets/items/${PEN.egg}.png'><div class='pbody'><b>La pension est vide</b><small>Œufs Mystère dans ton inventaire : ${Pen.eggs()}</small><small>L'œuf se trouve dans les <b>caisses</b> (rareté secrète dorée) ou en récompense finale des <b>objectifs du nouvel arrivant</b>.</small></div>`;
  }
  menu(`<div class='hd'><h1>Pension Pokémon</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='pcard'>${card}</div>
    <div class='row'>${e || m ? `<button class='btn' id='visit'>Rendre visite</button>` : `<button class='btn' id='dep' ${Pen.eggs() > 0 ? '' : 'disabled'}>Déposer l'œuf</button>`}
      <button class='btn2' id='shop'>Boutique</button><button class='btn2' id='lines'>Lignées</button><button class='btn2' id='back'>Retour</button></div>
    ${miss && miss.length ? `<small class='pwarn'>Sprites manquants dans assets/pokemon/ : ${miss.join(', ')}</small>` : ''}`);
  const $ = id => document.getElementById(id);
  if($('visit')) $('visit').onclick = () => penEnter();
  if($('dep')) $('dep').onclick = () => { if(penDeposit()) showPension('L\'œuf est installé à la pension : il chauffe doucement.'); };
  $('shop').onclick = () => showPenShop(); $('lines').onclick = () => showPenLines(); $('back').onclick = showMain;
}
function penEnter(){ if(typeof scenePension === 'function') scenePension(); }

// ---------- boutique de la pension ----------
function showPenShop(msg){
  const P = Pen.d();
  menu(`<div class='hd'><h1>Boutique de la pension</h1>${walletHtml()}</div>${msg ? `<small class='sub'>${esc(msg)}</small>` : ''}
    <div class='scroll pshop'><h2>Baies</h2><div class='igrid'>${PEN_FOODS.map(f => `<div class='berry'><img class='bimg' src='assets/items/${f.img}.png'><b>${f.name}</b><small>Faim +${f.v}${f.joy ? ' · bonheur +' + f.joy : ''} · <span class='nw'>en stock : ${P.food[f.id] || 0}</span></small><button class='btn2' data-f='${f.id}'>Acheter ${money(f.price)}</button></div>`).join('')}</div>
    <h2>Confort</h2><div class='igrid'>${PEN_COMFORT.map(c => `<div class='berry cf'><img class='bimg big' src='${penIcon(c.id)}'><b>${c.name}</b><small>${c.desc}</small>${P.items[c.id] ? `<button class='btn2' disabled>Acheté ✓</button>` : `<button class='btn2' data-c='${c.id}'>Acheter ${money(c.price)}</button>`}</div>`).join('')}</div></div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  bindAll('[data-f]', el => { const f = PEN_FOOD[el.dataset.f]; if(Save.spend(f.price)){ P.food[f.id] = (P.food[f.id] || 0) + 1; Pen.save(); showPenShop('+1 ' + f.name); } else showPenShop('Pas assez de Pokédollars.'); });
  bindAll('[data-c]', el => { const c = PEN_COMFORT_BY[el.dataset.c]; if(Save.spend(c.price)){ P.items[c.id] = 1; Pen.save(); showPenShop(c.name + ' acheté !'); } else showPenShop('Pas assez de Pokédollars.'); });
  document.getElementById('back').onclick = () => showPension();
}

// ---------- lignées : arbres d'évolution et formes finales débloquées ----------
function showPenLines(){
  const P = Pen.d();
  menu(`<h1>Lignées de la pension</h1><div class='scroll plines'>${PEN_LINES.map(L => `<div class='pline'><b>${L.name}</b>${L.forms.map((id, i) => { const seen = P.seen[id]; return `${i ? `<span class='parr'>▶<small>âge ${L.evo[i - 1].age >= 24 ? L.evo[i - 1].age/24 + ' j' : L.evo[i - 1].age + ' h'} · ${L.evo[i - 1].joy} %</small></span>` : ''}<div class='pform ${seen ? '' : 'unk'}'><img src='${penThumb(id)}'><small>${seen ? PEN_FORMS[id].name : '???'}</small></div>`; }).join('')}<span class='tag ${P.done[L.id] ? 'ok' : ''}'>${P.done[L.id] ? 'Débloqué en combat ✓' : 'Final : combat'}</span></div>`).join('')}</div>
    <div class='row'><button class='btn2' id='back'>Retour</button></div>`);
  document.getElementById('back').onclick = () => showPension();
}

SCREENS.pension = showPension;
