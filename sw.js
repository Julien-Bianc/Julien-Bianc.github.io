// Service worker minimal : permet d'installer le jeu comme une appli (plein écran) et de le lancer hors ligne.
// Stratégie « réseau d'abord » : tu vois toujours la dernière version de tes fichiers quand tu es en ligne
// (pratique avec Live Server), et le cache sert de secours hors connexion.
const CACHE = 'arene-v2';
self.addEventListener('install', e => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(fetch(req, { cache:'no-cache' }).then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return res; }).catch(() => caches.match(req)));
});
