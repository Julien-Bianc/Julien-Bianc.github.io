// ============================================================
//  data/status.js — Statuts altérés : chances, durées, immunités. Modifie les nombres pour régler l'équilibrage.
//  Chaque coup d'une attaque d'un type listé ici peut infliger le statut (chance par coup ; réduite de 40 % pour
//  chaque projectile d'un éventail). Une attaque peut définir son propre `status:{kind,chance}` (prioritaire).
//  Un Pokémon ne peut avoir qu'un seul statut à la fois.
// ============================================================
const STATUS_BY_TYPE = {
  feu:    { kind:'burn',    chance:.10 },     // brûlure : dégâts sur la durée, attaques -15 %
  poison: { kind:'poison',  chance:.30 },     // poison : dégâts sur la durée
  glace:  { kind:'freeze',  chance:.08 },     // gel : immobilisé, ne peut pas agir (dégel immédiat avec une attaque Feu)
  foudre: { kind:'par',     chance:.10 },     // paralysie : ralenti et 1 attaque sur 4 échoue
  psy:    { kind:'confuse', chance:.10 },     // confusion : titube et tire de travers
  spectre:{ kind:'confuse', chance:.08 }
};
const STATUS_DEF = {
  burn:    { label:'BRÛLÉ',      col:'#ff8a5a', dur:4,   immune:['feu'] },
  poison:  { label:'EMPOISONNÉ', col:'#c070e0', dur:5,   immune:['poison', 'acier'] },
  freeze:  { label:'GELÉ',       col:'#9fe3ff', dur:1.6, immune:['glace'] },
  par:     { label:'PARALYSÉ',   col:'#ffe24a', dur:2.5, immune:['foudre'] },
  confuse: { label:'CONFUS',     col:'#ff9ad8', dur:3.5, immune:[] },
  slow:    { label:'RALENTI',    col:'#9fe3ff', dur:2.5, immune:[] }       // ralentissement seul (Vent Glace, Surf)
};
