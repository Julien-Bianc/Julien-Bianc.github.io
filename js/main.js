// ============================================================
//  DÉMARRAGE : charge les sprites, enregistre les Pokémon, affiche le menu, lance la boucle.
// ============================================================
(async function main(){
  menu(`<h1>Chargement des Pokémon…</h1><div class='ldbox'><i id='ldbar'></i></div><small class='hint'>Première visite : quelques secondes</small>`);
  let res;
  try{
    res = await loadAllPokemon();
  }catch(e){
    menu('<h1>Erreur de chargement</h1><p>' + e.message + '</p>'); return;
  }
  if(Object.keys(POKEMON).length === 0 && res.errors.length){
    menu('<h1>Impossible de charger les sprites</h1><p>' + res.errors.join('<br>') +
         '</p><p>Lance le jeu avec <b>Live Server</b> (VS Code : clic droit sur index.html → Open with Live Server).<br>Un double-clic sur index.html ne fonctionne pas.</p>');
    return;
  }
  if(res.errors.length){ console.warn('Pokémon ignorés :', res.errors); MENU_WARN = '<p style="color:#ffb0a0">⚠ Ignorés : ' + res.errors.join(' | ') + '</p>'; }
  registerTypes();
  res.ok.forEach(registerPokemon);
  Save.ensureDefaults();
  // multijoueur : reconnexion automatique au compte (la sauvegarde du compte remplace celle du navigateur)
  if(typeof Online !== 'undefined' && Online.configured()){ menu('<h1>Connexion au compte…</h1>'); await Online.boot(); }
  showMain();
  requestAnimationFrame(loop);
})();
