// ============================================================
//  ÉCONOMIE — monnaie (Pokédollars), gains en Solo, prix de revente. Modifie les nombres pour équilibrer.
// ============================================================
const ECONOMY = {
  name:'Pokédollars', sym:'₽',
  start:100,                 // solde de départ (de quoi ouvrir une première caisse)

  // Victoire en Solo, niveau 1 → 10. Gain prévu pour 3 adversaires : il est multiplié par (adversaires / 3)
  // → 1 adversaire = 1/3 du gain, 6 adversaires (6v6) = gain x2.
  soloWin:   [ 20, 25, 30, 35, 45, 55, 65, 80, 100, 130 ],
  // Bonus de PREMIER passage (une fois par niveau, en 3v3 et en 6v6), indépendant de la taille de l'équipe.
  firstClear:[ 50, 60, 70, 80, 100, 120, 140, 170, 200, 300 ],

  // Revente d'un doublon (on garde toujours au moins 1 exemplaire)
  sell:{ C:5, PC:15, R:40, UR:120 }
};

// Gain d'une victoire en Solo : { win, bonus, total }
function soloReward(stageIndex, enemies, first){
  const i = Math.min(stageIndex, ECONOMY.soloWin.length - 1);
  const win = Math.max(5, Math.round(ECONOMY.soloWin[i]*enemies/3/5)*5);
  const bonus = first ? ECONOMY.firstClear[Math.min(stageIndex, ECONOMY.firstClear.length - 1)] : 0;
  return { win, bonus, total:win + bonus };
}
// « 1 250 ₽ »
const money = n => String(Math.floor(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' ' + ECONOMY.sym;
