// ============================================================
//  ENREGISTREMENT : transforme une entrée de data/pokemon.js
//  en données utilisables par le moteur (HERO, MV, NAME, TN, COL, ORDER).
//  Tu n'as normalement pas besoin de modifier ce fichier.
// ============================================================
const LEGACY_KINDS = ['shot','leaf','bolt','flame','meteor','wave','tide','spore','drain','strike','beam'];
// v0.09 : nouveaux kinds (js/moves-plus.js). POINT_KINDS = attaques qui visent un POINT au sol (glisser = choisir l'endroit)
const PLUS_KINDS = ['blink','burrow','shield','trap','buff','boomerang','pulse','stream'];
const POINT_KINDS = ['blink','burrow','trap','strike'];
function toEngineMove(m){
  const o = { n:m.name, tp:m.type, d:m.power, cd:m.cooldown, s:0, k:m.kind };
  if(m.kind === 'melee')
    o.mel = { an:m.anim || 'Attack', hf:m.hits, fx:m.effect || 'impact', ta:m.rushTime, rng:m.range,
              kb:m.knockback, recoil:m.recoil, inv:m.invuln, crit:m.crit, status:m.status };
  else if(m.kind === 'fan') o.fan = { ...m };
  else if(m.kind === 'fly') o.fly = { ...m };
  else if(m.kind === 'pool') o.pool = { ...m };
  else if(m.kind === 'song'){ o.song = { ...m }; o.big = true; }          // chant : signal d'attaque long chez l'ennemi
  else if(PLUS_KINDS.includes(m.kind)){ o.opt = { ...m }; o.s = m.speed || 300; }               // voir js/moves-plus.js
  else if(LEGACY_KINDS.includes(m.kind)){ o.s = m.speed || 300; o.opt = { ...m }; }   // kinds « moteur » : réglages en plus dans o.opt (js/moves-plus.js)
  else throw new Error('kind inconnu pour ' + m.name + ' : ' + m.kind);
  if(POINT_KINDS.includes(m.kind)) o.pt = true;
  if(m.big !== undefined) o.big = m.big;
  return o;
}

function registerPokemon(id){
  const D = POKEMON[id];
  if(D.moves.length !== 3) console.warn(id + ' : il faut exactement 3 attaques');
  NAME[id] = D.name;
  COL[id]  = COL[D.types[0]] || '#cccccc';
  TN[id]   = D.types.map(t => TN[t] || t).join('/');
  HERO[id] = { hp:D.hp, sp:D.speed, ab:D.ability ? D.ability.name : '', abd:D.ability ? D.ability.desc : '' };
  MV[id]   = D.moves.map(toEngineMove);
  if(!ORDER.includes(id)) ORDER.push(id);
}
