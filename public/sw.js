// Service Worker désactivé - supprime le cache existant
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(cacheNames.map((cache) => caches.delete(cache)))
    ).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  // Toujours aller chercher depuis le réseau (pas de cache)
  event.respondWith(fetch(event.request));
});
