// ============================================================
//  SAUVEGARDE (localStorage du navigateur) : équipes (+ objets tenus) + progression Solo + inventaire + Pokédollars
// ============================================================
const Save = {
  KEY:'arene.save.v1', data:null,
  load(){
    if(this.data) return this.data;
    try{ this.data = JSON.parse(localStorage.getItem(this.KEY)); }catch(e){}
    if(!this.data) this.data = { teams:[], progress:{ 3:0, 6:0 }, lastTeam:null };
    return this.data;
  },
  save(){ try{ localStorage.setItem(this.KEY, JSON.stringify(this.data)); }catch(e){} },
  teams(){ return this.load().teams; },
  team(id){ return this.teams().find(t => t.id === id); },
  saveTeam(t){
    const d = this.load();
    if(!t.id){ t.id = 't' + Date.now(); d.teams.push(t); }
    else { const i = d.teams.findIndex(x => x.id === t.id); if(i >= 0) d.teams[i] = t; else d.teams.push(t); }
    this.save(); return t;
  },
  deleteTeam(id){ const d = this.load(); d.teams = d.teams.filter(t => t.id !== id); this.save(); },
  cleared(size){ return this.load().progress[size] || 0; },                // nombre de niveaux terminés
  clear(size, idx){ const d = this.load(); d.progress[size] = Math.max(d.progress[size] || 0, idx + 1); this.save(); },
  // Inventaire : { idObjet: quantité }
  inv(){ const d = this.load(); if(!d.inv) d.inv = {}; return d.inv; },
  itemCount(id){ return this.inv()[id] || 0; },
  addItem(id, n){ const v = this.inv(); v[id] = (v[id] || 0) + (n || 1); this.save(); return v[id]; },
  opened(){ return this.load().opened || 0; },                             // nombre de caisses ouvertes
  countOpen(){ const d = this.load(); d.opened = (d.opened || 0) + 1; this.save(); },
  // Pokédollars (data/economy.js)
  coins(){ const d = this.load(); if(d.coins == null){ d.coins = ECONOMY.start; this.save(); } return d.coins; },
  addCoins(n){ const d = this.load(); d.coins = Math.max(0, this.coins() + n); this.save(); return d.coins; },
  spend(n){ if(this.coins() < n) return false; this.addCoins(-n); return true; },
  // Revente : on garde toujours au moins 1 exemplaire. Renvoie le gain (0 si impossible).
  sellable(id){ return Math.max(0, this.itemCount(id) - 1); },
  sell(id, n, price){
    n = Math.min(n || 1, this.sellable(id)); if(n <= 0) return 0;
    const v = this.inv(); v[id] -= n; this.addCoins(n*price); return n*price;
  },
  // Objet tenu par un Pokémon d'une équipe : team.items = { idPokémon: idObjet }
  // Règle : un même objet ne peut être porté que par UN Pokémon de l'équipe (comme en compétition).
  teamItem(t, pid){ return t && t.items && t.items[pid] && HELD_BY_ID[t.items[pid]] && this.itemCount(t.items[pid]) > 0 ? t.items[pid] : null; },
  // Capsule Ball d'un Pokémon d'une équipe : team.caps = { idPokémon: idCapsule } (la même capsule peut servir à plusieurs Pokémon)
  teamCap(t, pid){ const id = t && t.caps && t.caps[pid]; return id && CAPSULE_BY_ID[id] && this.itemCount(id) > 0 ? id : null; },
  capHolders(capId){ return this.teams().flatMap(t => Object.entries(t.caps || {}).filter(([pid, c]) => c === capId && t.members.includes(pid)).map(([pid]) => ({ team:t, pid }))); },
  holders(itemId){ return this.teams().flatMap(t => Object.entries(t.items || {}).filter(([pid, it]) => it === itemId && t.members.includes(pid)).map(([pid]) => ({ team:t, pid }))); },
  get lastTeam(){ return this.load().lastTeam; },
  set lastTeam(v){ this.load().lastTeam = v; this.save(); },
  // Répare les équipes dont des Pokémon n'existent plus, puis crée 2 équipes de départ s'il n'y en a aucune
  ensureDefaults(){
    const d = this.load();
    d.teams.forEach(t => {
      t.members = t.members.filter((id, i, arr) => ORDER.includes(id) && arr.indexOf(id) === i);
      if(!t.members.length && ORDER.length) t.members.push(ORDER[0]);        // une équipe garde toujours au moins 1 Pokémon
      const it = {}, used = new Set();                                         // objets tenus : Pokémon présent, objet possédé, pas de doublon
      Object.entries(t.items || {}).forEach(([pid, id]) => { if(t.members.includes(pid) && HELD_BY_ID[id] && this.itemCount(id) > 0 && !used.has(id)){ it[pid] = id; used.add(id); } });
      t.items = it;
      const cp = {}; Object.entries(t.caps || {}).forEach(([pid, id]) => { if(t.members.includes(pid) && CAPSULE_BY_ID[id] && this.itemCount(id) > 0) cp[pid] = id; });
      t.caps = cp;
    });
    if(!d.teams.length && ORDER.length >= 3){
      const prefer = ['farfuret', 'dracaufeu', 'fouinar'].filter(id => ORDER.includes(id));
      const rest = ORDER.filter(id => !prefer.includes(id));
      d.teams.push({ id:'t-def3', name:'Équipe 3v3', size:3, members:[...prefer, ...rest].slice(0, 3) });
      if(ORDER.length >= 6) d.teams.push({ id:'t-def6', name:'Équipe 6v6', size:6, members:[...prefer, ...rest].slice(0, 6) });
    }
    this.save();
  }
};
