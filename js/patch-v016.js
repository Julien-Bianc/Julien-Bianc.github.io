// ============================================================
//  patch-v016.js — Rapport de test v0.15
//    1. Visée : appui BREF = tir automatique sur l'adversaire ; appui LONG sans glisser = la zone de visée
//       s'affiche et part dans TA direction (celle du joystick, ou ta dernière direction) — plus d'effet « aimant »
//    2. Opacité des commandes tactiles (Options → Confort)
//    3. Les menus déroulants ne défilent plus de côté
//    4. Mode développeur : « Donner un objet » au choix, dans la quantité voulue
//    5. Écran d'accueil : un Pokémon shiny de ton équipe apparaît bien shiny
// ============================================================
Object.assign(SETTINGS_DEFAULT, { ctlAlpha:1 });

// ---------- 1. visée ----------
const AIM_TAP16 = .2;
AIM.t0 = AIM.t0 || [0, 0, 0];
const _pressV16 = press;
press = function(i){ const was = down[i]; _pressV16(i); if(!was && down[i]) AIM.t0[i] = performance.now(); };
const held16 = i => (performance.now() - (AIM.t0[i] || 0))/1000;
const faceDir16 = () => { const d = moveInput() || LASTDIR; return Math.atan2(d.y, d.x); };
const reach16 = m => isFreeBlink(m) ? 1 : .55;
const _dasV16 = drawAimShape;
drawAimShape = function(p, i){
  if(AIM.on[i]) return _dasV16(p, i);
  if(held16(i) < AIM_TAP16) return;                                          // tout début d'appui : rien (ce sera peut-être un tir auto)
  AIM.on[i] = 1; AIM.a[i] = faceDir16(); AIM.r[i] = reach16(p.mv[i]);
  try{ _dasV16(p, i); } finally { AIM.on[i] = 0; }
};
const _drawAimV16 = drawAim;                                                 // l'aperçu s'affiche aussi pendant la charge
drawAim = function(){
  if(!G || G.over || G.sw || !Settings.get().aimGuides) return;
  const p = G.p; for(let i = 0; i < 3; i++) if(down[i] && (p.cd[i] <= 0 || p.ch[i] > 0)) drawAimShape(p, i);
};
const _fireV16 = fire;
fire = function(m, c, i){
  if(!AIM.on[i] && held16(i) > AIM_TAP16){ AIM.on[i] = 1; AIM.a[i] = faceDir16(); AIM.r[i] = reach16(m); }
  return _fireV16(m, c, i);
};

// ---------- 2. opacité des commandes ----------
function applyCtlAlpha(){ document.getElementById('app').style.setProperty('--ctla', Settings.get().ctlAlpha ?? 1); }
applyCtlAlpha();
const _optV16 = showOptions;
showOptions = function(back){
  _optV16(back);
  const s = Settings.get(), lyt = document.getElementById('o-lyt'); if(!lyt) return;
  const row = lyt.closest('.row') || lyt.parentElement, pct = v => Math.round(v*100) + '%';
  row.insertAdjacentHTML('afterend', `<label class='opt'><span>Opacité des commandes</span><input type='range' id='o-cta' min='.2' max='1' step='.05' value='${s.ctlAlpha ?? 1}'><b id='o-ctav'>${pct(s.ctlAlpha ?? 1)}</b></label>`);
  const el = document.getElementById('o-cta');
  el.oninput = () => { Settings.set('ctlAlpha', +el.value); applyCtlAlpha(); document.getElementById('o-ctav').textContent = pct(+el.value); };
};
SCREENS.options = showOptions;

// ---------- 4. mode développeur : donner un objet ----------
function devItemList(){
  shopBuild();
  const G1 = [['held', 'Objets tenus'], ['capsule', 'Capsules Ball'], ['special', 'Objets spéciaux'], ['card', 'Cartes']], out = [];
  G1.forEach(([k, l]) => out.push([l, Object.values(ITEM).filter(it => it.kind === k).sort((a, b) => byRarity(a, b) || (a.name > b.name) - (a.name < b.name)).map(it => [it.id, it.name + ' (' + (RAR[it.r] ? RAR[it.r].label : it.r) + ')'])]));
  if(typeof SAFARI !== 'undefined') out.push(['Safari', [...SAFARI.zones.map(z => [z.ticket.id, z.ticket.name]), ...SAFARI.balls.map(b => [b.id, b.name])]]);
  out.push(['Raid', [['raid-crate', 'Caisse de raid']]]);
  return out;
}
const devCount = id => id === 'raid-crate' ? (Save.load().raidCrates || 0) : Save.itemCount(id);
function devGive(id, n){
  if(id === 'raid-crate'){ const d = Save.load(); d.raidCrates = Math.max(0, (d.raidCrates || 0) + n); Save.save(); return; }
  if(n < 0) n = -Math.min(-n, Save.itemCount(id));
  if(n) Save.addItem(id, n);
}
const _devV16 = showDev;
showDev = function(){
  _devV16();
  const box = document.querySelector('#menu .devs'); if(!box) return;
  const danger = [...box.querySelectorAll('h3')].find(h => /danger/i.test(h.textContent));
  const last = Save.load().devGive || 'raid-crate';
  const html = `<h3>Donner un objet</h3><div class='row left devgive'>
      <select id='d-gid'>${devItemList().map(([l, L]) => L.length ? `<optgroup label='${esc(l)}'>${L.map(([id, n]) => `<option value='${esc(id)}' ${id === last ? 'selected' : ''}>${esc(n)}</option>`).join('')}</optgroup>` : '').join('')}</select>
      <input type='number' id='d-gn' value='1' step='1'>
      <button class='btn2' id='d-gok'>Donner</button><span class='hint' id='d-gh'></span></div>
    <p class='hint'>Quantité négative = en retirer.</p>`;
  if(danger) danger.insertAdjacentHTML('beforebegin', html); else box.insertAdjacentHTML('beforeend', html);
  const sel = document.getElementById('d-gid'), num = document.getElementById('d-gn'), info = document.getElementById('d-gh');
  const upd = () => { info.textContent = 'Possédé : ×' + devCount(sel.value); };
  sel.onchange = () => { Save.load().devGive = sel.value; Save.save(); upd(); }; upd();
  document.getElementById('d-gok').onclick = () => {
    const n = Math.round(+num.value || 0); if(!n) return; devGive(sel.value, n); upd();
    const m = document.getElementById('d-msg'); if(m) m.textContent = '✔ ' + (n > 0 ? '+' : '') + n + ' × ' + sel.options[sel.selectedIndex].text;
    if(typeof coinSfx === 'function') coinSfx();
  };
};
SCREENS.dev = showDev;

// ---------- 5. accueil : Pokémon shiny ----------
const _mbgV16 = mbgFrame;
mbgFrame = function(id, anim, row, t, rate){
  const f = _mbgV16(id, anim, row, t, rate);
  if(!f || typeof Shiny === 'undefined' || G || !MBG.team || !MBG.team.ids.includes(id) || !Shiny.has(id)) return f;
  const tm = Save.team(Save.lastTeam) || Save.teams()[0];
  return tm && tm.look && tm.look[id] === 'normal' ? f : shinyCanvas(f, id);
};

document.head.insertAdjacentHTML('beforeend', `<style>
/* 2. opacité des commandes */
#app #btns{opacity:var(--ctla,1)}
#app:not(.ctl-modern) #joy{opacity:var(--ctla,1)}
#app.ctl-modern #joy{opacity:calc(.45*var(--ctla,1))}#app.ctl-modern #joy.on{opacity:var(--ctla,1)}
/* 3. défilement vertical uniquement */
#menu .scroll{overflow-x:hidden!important;overscroll-behavior-x:none;touch-action:pan-y}
.btn2.claim{animation:none!important;box-shadow:0 0 8px rgba(255,210,63,.55)}
/* 4. donner un objet */
.devgive select,.devgive input{background:rgba(10,8,24,.85);color:var(--txt,#f4ead6);border:1px solid var(--line,#fff4);border-radius:6px;padding:4px 6px;font:600 11px var(--font,monospace);user-select:auto;-webkit-user-select:auto}
.devgive select{max-width:230px}.devgive input{width:70px}
</style>`);
