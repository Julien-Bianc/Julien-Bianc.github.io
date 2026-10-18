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
  await Promise.all(list.map(async ([n, o]) => {
    try{ S.IM[n] = await loadImg(base + n + '-Anim.png'); S.D.anim[n] = o; }catch(e){ return; }   // animation absente : ignorée
    try{ S.D.anc[n] = shadowAnchors(await loadImg(base + n + '-Shadow.png'), o.fw, o.fh, o.dur.length); }catch(e){}
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

// Charge tous les Pokémon de data/pokemon.js. Renvoie { ok:[ids], errors:[messages] }.
async function loadAllPokemon(){
  const ok = [], errors = [];
  await Promise.all(Object.keys(POKEMON).map(async id => {
    try{ await loadPokemon(id); ok.push(id); }
    catch(e){ errors.push(id + ' : ' + e.message); delete POKEMON[id]; }
  }));
  return { ok: Object.keys(POKEMON).filter(id => ok.includes(id)), errors };
}
