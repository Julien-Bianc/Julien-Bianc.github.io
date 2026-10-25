// ============================================================
//  CHARGEUR DE SPRITES (format PMDCollab / sprites.pmdcollab.org)
//  Lit  <folder>/AnimData.xml  puis les feuilles  <Anim>-Anim.png  et  <Anim>-Shadow.png.
//  Aucune conversion à faire : il suffit de déposer le dossier dans assets/pokemon/.
//  ⚠ Il faut lancer le jeu via un serveur local (Live Server de VS Code), pas en double-cliquant.
// ============================================================
const SPR = {};   // SPR[id] = { def, D:{anim,anc,cs,sw,sh}, IM:{nom:Image}, TOT, CUM, SC, alias }

function loadImg(src){
  return new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error(src)); i.src = src; });
}

// Point d'ancrage (au sol) de chaque image = centre du pixel d'ombre de la feuille *-Shadow.png
function shadowAnchors(img, fw, fh, nf){
  const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const x = c.getContext('2d', { willReadFrequently:true }); x.drawImage(img, 0, 0);
  const d = x.getImageData(0, 0, c.width, c.height).data, Wd = c.width, nr = Math.max(1, Math.floor(c.height / fh)), rows = [];
  for(let r = 0; r < nr; r++){
    const row = [];
    for(let f = 0; f < nf; f++){
      let sx = 0, sy = 0, n = 0;
      for(let y = 0; y < fh; y++) for(let xx = 0; xx < fw; xx++) if(d[((r*fh + y)*Wd + f*fw + xx)*4 + 3] > 0){ sx += xx; sy += y; n++; }
      row.push(n ? [Math.round(sx/n), Math.round(sy/n)] : null);
    }
    rows.push(row);
  }
  return rows;
}

// animations utilisées quelque part dans le jeu (combat, menus, concours, pension) ; les autres feuilles ne sont plus chargées
const ANIM_USED = ['Idle', 'Walk', 'Hurt', 'Faint', 'Charge', 'Hop', 'Pain', 'Wake', 'Double', 'Attack', 'Shoot', 'Swing', 'Strike', 'Sleep', 'EventSleep', 'Eat', 'Pose',
  'Appeal', 'Rotate', 'RearUp', 'QuickStrike', 'Hover', 'Float', 'MultiScratch', 'Twirl', 'SpAttack'];
async function loadPokemon(id){
  const def = POKEMON[id], base = def.folder.replace(/\/?$/, '/');
  const r = await fetch(base + 'AnimData.xml');
  if(!r.ok) throw new Error('AnimData.xml introuvable dans ' + base);
  const doc = new DOMParser().parseFromString(await r.text(), 'text/xml');
  const ss = parseInt(doc.querySelector('ShadowSize')?.textContent || '1');
  const S = { id, def, D:{ anim:{}, anc:{}, cs:96, sw:[9,13,18][ss] || 13, sh:[4,5,7][ss] || 5 }, IM:{}, TOT:{}, CUM:{}, SC:{}, alias:{} };
  const list = [];
  doc.querySelectorAll('Anims > Anim').forEach(a => {
    const n = a.querySelector('Name')?.textContent, cp = a.querySelector('CopyOf')?.textContent;
    if(!n) return;
    if(cp){ S.alias[n] = cp; return; }
    const g = t => a.querySelector(t)?.textContent;
    const o = { fw:+g('FrameWidth'), fh:+g('FrameHeight'), dur:[...a.querySelectorAll('Durations > Duration')].map(x => +x.textContent) };
    ['RushFrame','HitFrame','ReturnFrame'].forEach(k => { if(g(k) != null) o[k.slice(0, -5).toLowerCase()] = +g(k); });
    list.push([n, o]);
  });
  // v0.22 : on ne télécharge que les animations dont le jeu se sert (avant : toutes → ~1 650 fichiers au démarrage)
  const use = new Set(ANIM_USED); Object.values(def.anims || {}).forEach(v => use.add(v)); (def.moves || []).forEach(m => m.anim && use.add(m.anim));
  Object.entries(S.alias).forEach(([n, cp]) => { if(use.has(n)) use.add(cp); });
  const have = ASSETS && ASSETS.pokemon && ASSETS.pokemon[base.split('/').filter(Boolean).pop()];       // fichiers présents (assets/manifest.json) : plus de 404
  for(let i = list.length - 1; i >= 0; i--) if(!use.has(list[i][0]) || (have && !have.includes(list[i][0] + '-Anim'))) list.splice(i, 1);
  S.noShadow = have ? new Set(list.filter(([n]) => !have.includes(n + '-Shadow')).map(([n]) => n)) : null;
  await Promise.all(list.map(async ([n, o]) => {
    try{ S.IM[n] = await loadImg(base + n + '-Anim.png'); S.D.anim[n] = o; }catch(e){ return; }   // animation absente : ignorée
    if(!(S.noShadow && S.noShadow.has(n))) try{ S.D.anc[n] = shadowAnchors(await loadImg(base + n + '-Shadow.png'), o.fw, o.fh, o.dur.length); }catch(e){}
  }));
  let need = 48;
  Object.keys(S.D.anim).forEach(n => {
    const o = S.D.anim[n]; let c = 0; S.CUM[n] = o.dur.map(x => { const t = c; c += x; return t; }); S.TOT[n] = c;
    (S.D.anc[n] || [null]).forEach(row => o.dur.forEach((_, f) => {
      const a = (row && row[f]) || [o.fw/2, o.fh*.72];
      need = Math.max(need, a[0], o.fw - a[0], (o.fh - a[1]) + 14, a[1] - 14);
    }));
  });
  S.D.cs = Math.ceil(need) * 2;
  // v0.21.5 : une animation « CopyOf » (ex. Idle de Draco = Walk) réutilise l'image de l'autre animation
  Object.entries(S.alias).forEach(([n, cp]) => { if(!S.IM[n] && S.IM[cp]){ S.IM[n] = S.IM[cp]; S.D.anim[n] = S.D.anim[cp]; if(S.D.anc[cp]) S.D.anc[n] = S.D.anc[cp]; S.TOT[n] = S.TOT[cp]; S.CUM[n] = S.CUM[cp]; } });
  if(!S.IM.Idle) throw new Error('Idle-Anim.png manquant dans ' + base);
  SPR[id] = S;
}

// Liste des fichiers présents (générée avec le jeu) : évite de demander des images ou musiques absentes.
let ASSETS = null;
const ASSETS_READY = fetch('assets/manifest.json', { cache:'no-cache' }).then(r => r.ok ? r.json() : null).then(j => { ASSETS = j; return j; }).catch(() => null);

// Charge les Pokémon de data/pokemon.js. Renvoie { ok:[ids], errors:[messages] }.
//  v0.22 : les Pokémon « sauvages seulement » (Safari) se chargent en arrière-plan, après l'affichage du menu → démarrage 2× plus rapide.
let WILD_READY = Promise.resolve();
async function loadAllPokemon(){
  await ASSETS_READY;
  const ok = [], errors = [], ids = Object.keys(POKEMON), wild = ids.filter(id => POKEMON[id].wildOnly), main = ids.filter(id => !POKEMON[id].wildOnly);
  let done = 0; const prog = () => { const el = document.getElementById('ldbar'); if(el) el.style.width = Math.round(++done/main.length*100) + '%'; };
  if(!document.getElementById('ldbar')) menu(`<h1>Chargement des Pokémon…</h1><div class='ldbox'><i id='ldbar'></i></div><small class='hint'>Première visite : quelques secondes</small>`);
  await Promise.all(main.map(async id => {
    try{ await loadPokemon(id); ok.push(id); }
    catch(e){ errors.push(id + ' : ' + e.message); delete POKEMON[id]; }
    prog();
  }));
  WILD_READY = new Promise(res => setTimeout(() => Promise.all(wild.map(id => loadPokemon(id).catch(e => console.warn('sauvage ignoré', id, e.message)))).then(res), 800));
  return { ok: Object.keys(POKEMON).filter(id => ok.includes(id) || wild.includes(id)), errors };
}
document.head.insertAdjacentHTML('beforeend', `<style>.ldbox{width:min(320px,70vw);height:12px;border:2px solid #ffd23f;border-radius:8px;background:rgba(0,0,0,.4);overflow:hidden;margin:8px auto}.ldbox i{display:block;height:100%;width:0;background:linear-gradient(90deg,#ffb020,#ffe27a);transition:width .2s}</style>`);
