// ============================================================
//  SAUVEGARDE (localStorage du navigateur) : équipes + progression du mode Solo + inventaire (objets du magasin)
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
  get lastTeam(){ return this.load().lastTeam; },
  set lastTeam(v){ this.load().lastTeam = v; this.save(); },
  // Répare les équipes dont des Pokémon n'existent plus, puis crée 2 équipes de départ s'il n'y en a aucune
  ensureDefaults(){
    const d = this.load();
    d.teams.forEach(t => {
      t.members = t.members.filter((id, i, arr) => ORDER.includes(id) && arr.indexOf(id) === i);
      if(!t.members.length && ORDER.length) t.members.push(ORDER[0]);        // une équipe garde toujours au moins 1 Pokémon
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
