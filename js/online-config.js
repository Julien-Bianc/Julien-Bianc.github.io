// ============================================================
//  online-config.js — RÉGLAGES DU MULTIJOUEUR (le seul fichier à remplir pour activer le jeu en ligne)
//
//  1. Crée un projet gratuit sur https://supabase.com
//  2. Supabase → SQL Editor → colle le fichier supabase/schema.sql → Run
//  3. Supabase → Authentication → Sign In / Providers → Email : DÉSACTIVE « Confirm email »
//     (les joueurs se connectent avec un pseudo, aucun e-mail n'est envoyé)
//  4. Supabase → Project Settings → API : copie « Project URL » et la clé « anon public » ci-dessous.
//     (La clé anon est faite pour être publique : la sécurité est assurée par supabase/schema.sql.)
//
//  Tant que url / key sont vides, le menu Multijoueur propose seulement le TEST LOCAL (2 onglets du même navigateur).
// ============================================================
const ONLINE_CFG = {
  url: '',                                   // ex. 'https://abcdefghijkl.supabase.co'
  key: '',                                   // ex. 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....'

  emailDomain: 'joueurs.arene-des-creatures.app',   // adresse interne : <pseudo>@<emailDomain> (jamais utilisée pour envoyer d'e-mail)
  saveDelay: 2,                              // secondes entre une modification et l'envoi de la sauvegarde
  sendRate: 15,                              // positions envoyées par seconde pendant un combat (Supabase gratuit : ~3 combats simultanés à 15)
  challengeTimeout: 45,                      // secondes avant qu'un défi sans réponse soit annulé
  disconnectAfter: 20,                       // secondes sans nouvelles de l'adversaire = victoire par abandon
  hiddenForfeit: 12                          // secondes avec le jeu en arrière-plan pendant un combat = abandon
};
