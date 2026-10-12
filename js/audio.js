// ============================================================
//  audio.js — Effets sonores générés par le navigateur + musique (fichiers de data/music.js,
//  avec repli sur une petite boucle générée si le fichier est absent).
//  Volumes réglables dans Options (général / effets / musique).
//  playSfx('nom') joue un effet. Noms : voir la liste au-dessus de playSfx().
// ============================================================
const AU = { ctx:null, mg:null, sg:null, mu:null, nb:null };
function audioInit(){
  if(AU.ctx) return;
  try{
    const C = window.AudioContext || window.webkitAudioContext; AU.ctx = new C();
    AU.mg = AU.ctx.createGain(); AU.sg = AU.ctx.createGain(); AU.mu = AU.ctx.createGain();
    AU.sg.connect(AU.mg); AU.mu.connect(AU.mg); AU.mg.connect(AU.ctx.destination);
    const n = AU.ctx.sampleRate; AU.nb = AU.ctx.createBuffer(1, n, n); const d = AU.nb.getChannelData(0); for(let i = 0; i < n; i++) d[i] = Math.random()*2 - 1;
    applyAudio();
  }catch(e){ AU.ctx = null; }
}
function applyAudio(){
  if(!AU.ctx) return; const s = Settings.get();
  AU.mg.gain.value = s.master; AU.sg.gain.value = s.sfx; AU.mu.gain.value = s.music*.6;
}
['pointerdown', 'keydown'].forEach(ev => addEventListener(ev, () => { audioInit(); if(AU.ctx && AU.ctx.state === 'suspended') AU.ctx.resume(); musicGo(); }));

function tone(f, d, type, v, slide, delay, dest){
  if(!AU.ctx) return; const t = AU.ctx.currentTime + (delay || 0), o = AU.ctx.createOscillator(), g = AU.ctx.createGain();
  o.type = type || 'square'; o.frequency.setValueAtTime(f, t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f + slide), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(dest || AU.sg); o.start(t); o.stop(t + d + .02);
}
function noise(d, v, f0, f1, type, delay){
  if(!AU.ctx) return; const t = AU.ctx.currentTime + (delay || 0), s = AU.ctx.createBufferSource(), fl = AU.ctx.createBiquadFilter(), g = AU.ctx.createGain();
  s.buffer = AU.nb; fl.type = type || 'lowpass'; fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + d);
  g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); s.connect(fl); fl.connect(g); g.connect(AU.sg); s.start(t); s.stop(t + d + .02);
}

// ---------- effets sonores ----------
// Existants : click, ko, crit, recall, throw, ball_open, cast:<type>, hit:<type> (k = intensité)
// Nouveaux  : dodge, miss, eff (super efficace), resist (peu efficace), charge, rock (rocher brisé),
//             status:brule|para|poison|slow, swap (relève), select, back, victory, defeat, hurt
// Types     : feu glace eau foudre plante poison dragon tenebres acier vol combat psy sol roche spectre fee insecte (autre = normal)
const _lastSfx = {};
function playSfx(name, k){
  if(!AU.ctx) return; k = k || 1; const [kind, tp] = name.split(':');
  const now = AU.ctx.currentTime; if(_lastSfx[name] && now - _lastSfx[name] < .035) return; _lastSfx[name] = now; // anti-saturation
  const R = Math.random, J = () => .94 + R()*.12; // légère variation de hauteur
  if(kind === 'click') tone(660*J(), .05, 'square', .07);
  else if(kind === 'select'){ tone(880, .06, 'square', .08); tone(1320, .09, 'square', .07, 0, .05); }
  else if(kind === 'back') tone(520, .08, 'square', .07, -200);
  else if(kind === 'ko'){ tone(420, .6, 'sawtooth', .22, -360); noise(.5, .35, 1800, 120); tone(70, .5, 'sine', .4, -30); tone(900, .25, 'triangle', .08, -700, .05); }
  else if(kind === 'crit'){ tone(1500, .14, 'square', .12, 500); noise(.12, .22, 7000, 1200, 'highpass'); tone(2200, .1, 'triangle', .07, -600, .05); }
  else if(kind === 'eff'){ tone(880, .08, 'square', .1); tone(1320, .16, 'square', .1, 0, .07); noise(.2, .18, 6000, 1200, 'highpass', .02); }
  else if(kind === 'resist'){ tone(210, .2, 'triangle', .13, -70); noise(.1, .1, 900, 300); }
  else if(kind === 'miss') noise(.16, .1, 1800, 500, 'bandpass');
  else if(kind === 'hurt'){ tone(260*J(), .12, 'sawtooth', .1, -140); noise(.08, .12, 2000, 400); }
  else if(kind === 'dodge'){ noise(.2, .2, 500, 3200, 'bandpass'); tone(480, .14, 'sine', .06, 520); noise(.12, .08, 4000, 1500, 'highpass', .08); }
  else if(kind === 'charge'){ tone(180, .5, 'sawtooth', .05, 700); tone(360, .5, 'sine', .05, 900); }
  else if(kind === 'rock'){ noise(.4, .32, 1400, 120); tone(95, .3, 'sine', .32, -45); noise(.2, .12, 3500, 600, 'highpass', .08); }
  else if(kind === 'recall') tone(1300, .35, 'sine', .1, -1000);
  else if(kind === 'throw') tone(280, .28, 'sine', .08, 500);
  else if(kind === 'swap'){ tone(1300, .25, 'sine', .08, -900); tone(300, .25, 'sine', .08, 500, .28); noise(.12, .15, 5000, 800, 'highpass', .5); tone(700, .22, 'triangle', .12, 800, .5); }
  else if(kind === 'ball_open'){ noise(.12, .2, 5000, 800, 'highpass'); tone(700, .25, 'triangle', .13, 900); tone(1400, .2, 'sine', .06, 600, .08); }
  else if(kind === 'victory') [523, 659, 784, 1047, 784, 1047].forEach((f, i) => { tone(f, .22, 'square', .09, 0, i*.13); tone(f/2, .22, 'triangle', .12, 0, i*.13); });
  else if(kind === 'defeat') [392, 349, 311, 262, 196].forEach((f, i) => tone(f, .35, 'sawtooth', .08, -20, i*.2));
  else if(kind === 'status'){
    switch(tp){
      case 'brule': noise(.3, .15, 3000, 600); tone(320, .25, 'sawtooth', .06, -120); break;
      case 'para': for(let i = 0; i < 4; i++) tone(1000 + R()*600, .04, 'square', .08, 0, i*.04); break;
      case 'poison': tone(170, .35, 'sine', .12, 140); tone(230, .25, 'sine', .08, 100, .1); break;
      case 'slow': tone(520, .45, 'sine', .1, -380); noise(.3, .06, 1500, 300); break;
    }
  }
  else if(kind === 'cast' || kind === 'hit'){
    const hit = kind === 'hit', v = (hit ? .3 : .2)*k;
    if(hit){ tone(120, .13, 'sine', .3*k, -70); noise(.05, .15*k, 4000, 800, 'highpass'); }
    switch(tp){
      case 'feu': noise(hit ? .25 : .5, v, 1400, 300); tone(130, .3, 'sawtooth', .08*k, -70); if(!hit) noise(.4, v*.4, 3500, 900, 'bandpass', .05); else tone(420, .12, 'sawtooth', .05*k, -250); break;
      case 'glace': noise(.4, v*.7, 7000, 2200, 'bandpass'); tone(1500, .3, 'sine', .06*k, -700); tone(2200, .2, 'sine', .04*k, -900, .06); if(hit){ tone(3000, .12, 'triangle', .05*k, -1500, .02); tone(2600, .1, 'triangle', .04*k, -1200, .07); } break;
      case 'eau': for(let i = 0; i < 3; i++) tone(380 + R()*500, .12, 'sine', .1*k, 250, i*.05); noise(.2, v*.5, 2500, 600); if(hit) noise(.18, v*.5, 1200, 300, 'lowpass', .03); break;
      case 'foudre': tone(950, .16, 'sawtooth', .14*k, -800); noise(.15, v, 6000, 1500, 'highpass'); for(let i = 0; i < 3; i++) tone(1500 + R()*1500, .03, 'square', .05*k, 0, i*.035); break;
      case 'plante': noise(.22, v*.6, 3200, 1800, 'bandpass'); tone(500, .1, 'triangle', .05*k, 300, .04); break;
      case 'poison': tone(190, .28, 'sine', .12*k, 160); tone(260, .2, 'sine', .08*k, 120, .08); for(let i = 0; i < 2; i++) tone(500 + R()*300, .07, 'sine', .05*k, 300, .1 + i*.07); break;
      case 'dragon': tone(95, .5, 'sawtooth', .2*k, -35); noise(.4, v*.7, 900, 200); tone(190, .4, 'square', .05*k, -80, .05); break;
      case 'tenebres': tone(190, .38, 'triangle', .15*k, -120); noise(.3, v*.4, 700, 150); tone(95, .45, 'sine', .12*k, -30, .05); break;
      case 'acier': tone(1900, .12, 'square', .06*k, -900); tone(2600, .1, 'square', .04*k, -1200, .03); if(hit) tone(1100, .25, 'triangle', .06*k, -300, .02); break;
      case 'vol': noise(.32, v*.6, 800, 3500, 'bandpass'); noise(.2, v*.3, 3000, 900, 'bandpass', .15); break;
      case 'combat': tone(90, .2, 'sine', .35*k, -45); noise(.09, v*1.1, 1800, 250); if(hit) tone(160, .1, 'square', .08*k, -80, .04); break;
      case 'psy': tone(600, .5, 'sine', .08*k, 500); tone(604, .5, 'sine', .08*k, 500); tone(900, .4, 'triangle', .04*k, -400, .1); break;
      case 'sol': noise(.4, v*.9, 700, 100); tone(70, .4, 'sine', .3*k, -25); break;
      case 'roche': noise(.25, v, 1500, 200); tone(110, .2, 'square', .1*k, -60); noise(.15, v*.5, 4000, 800, 'highpass', .06); break;
      case 'spectre': tone(300, .5, 'triangle', .09*k, -200); tone(310, .5, 'sine', .09*k, 180, .05); noise(.4, v*.3, 1200, 300, 'bandpass'); break;
      case 'fee': [1200, 1600, 2000].forEach((f, i) => tone(f, .18, 'sine', .06*k, 300, i*.05)); break;
      case 'insecte': for(let i = 0; i < 5; i++) tone(900 + R()*300, .04, 'sawtooth', .04*k, 0, i*.03); noise(.15, v*.3, 3500, 1800, 'bandpass'); break;
      default: noise(.09, v, 2500, 500); tone(230, .09, 'square', .08*k, -110);
    }
  }
}

// ---------- musique ----------
// 1) fichier de data/music.js (fondu enchaîné, boucle)  2) sinon petite boucle générée.
// MU.kind = ce qui est demandé ; MU.playing = ce qui joue réellement.
const MU = { id:null, step:0, kind:null, playing:null, cur:null };
const SCALE = [0, 3, 5, 7, 10], PAT = { menu:[0, 2, 4, 2, 3, 2, 1, 2], battle:[0, 4, 2, 4, 3, 4, 1, 3, 0, 4, 2, 4, 5, 4, 3, 1] };
function musicFile(kind){
  if(typeof MUSIC === 'undefined' || !kind) return null;
  return MUSIC[kind] || MUSIC[kind.split(':')[0]] || null;
}
function musicFadeOut(fade){
  const c = MU.cur; MU.cur = null; if(!c || !AU.ctx) return; const t = AU.ctx.currentTime;
  c.g.gain.cancelScheduledValues(t); c.g.gain.setValueAtTime(c.g.gain.value, t); c.g.gain.linearRampToValueAtTime(0, t + fade);
  setTimeout(() => { c.el.pause(); try{ c.g.disconnect(); }catch(e){} }, fade*1000 + 100);
}
function musicGen(kind){
  clearInterval(MU.id); MU.id = null; MU.step = 0; MU.playing = kind;
  const base = (kind || '').split(':')[0], pk = base === 'boss' ? 'battle' : base, pat = PAT[pk]; if(!pat) return;
  const bpm = pk === 'battle' ? 160 : 100, dt = 60/bpm/2;
  MU.id = setInterval(() => {
    if(!AU.ctx || AU.ctx.state !== 'running') return;
    const n = pat[MU.step % pat.length], oct = (MU.step % 32 > 15) ? 12 : 0;
    const f = 196*Math.pow(2, (SCALE[n % 5] + oct + Math.floor(n/5)*12)/12);
    tone(f, dt*1.7, pk === 'battle' ? 'square' : 'triangle', pk === 'battle' ? .09 : .12, 0, 0, AU.mu);
    if(MU.step % 2 === 0) tone(f/4, dt*3, 'triangle', .22, 0, 0, AU.mu);
    MU.step++;
  }, dt*1000);
}
function musicPlayFile(kind, url){
  MU.playing = kind;
  const el = new Audio(url); el.loop = !(kind === 'victory' || kind === 'defeat'); el.preload = 'auto';
  const g = AU.ctx.createGain(); g.gain.value = 0;
  try{ AU.ctx.createMediaElementSource(el).connect(g); g.connect(AU.mu); }catch(e){ musicGen(kind); return; }
  const c = { el, g, kind }; MU.cur = c;
  const fallback = () => { if(MU.cur === c){ MU.cur = null; musicGen(kind); } };
  el.addEventListener('error', fallback);
  el.play().then(() => { if(MU.cur !== c) return; const t = AU.ctx.currentTime; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(1.6, t + 1.2); })
    .catch(e => { if(e && e.name === 'NotAllowedError'){ if(MU.cur === c){ MU.cur = null; MU.playing = null; } } else fallback(); });
}
function musicGo(){
  const kind = MU.kind; if(!AU.ctx || MU.playing === kind) return;
  clearInterval(MU.id); MU.id = null; musicFadeOut(.8); MU.playing = null;
  if(!kind) return;
  const f = musicFile(kind); if(f) musicPlayFile(kind, f); else musicGen(kind);
}
function musicSet(kind){ if(MU.kind === kind) return; MU.kind = kind; musicGo(); }

// la musique suit l'écran : menu / combat (clé 'battle:<niveau>' si le niveau est identifiable)
const _showMainA = showMain; showMain = function(){ _showMainA(); musicSet('menu'); };
const _startA = start; start = function(cfg){
  _startA(cfg); const st = cfg && cfg.stage, id = (st && typeof st === 'object') ? (st.arena != null ? st.arena : (st.id != null ? st.id : st.n)) : st;
  musicSet('battle' + (id != null ? ':' + id : ''));
};
document.getElementById('menu').addEventListener('click', e => { if(e.target.closest('button')) playSfx('click'); });