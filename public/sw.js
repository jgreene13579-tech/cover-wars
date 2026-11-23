// Keeps the game playable offline once it has loaded once.
// Pages are fetched fresh when online (so updates show up right away); everything else is cache-first.
const CACHE = 'cover-wars-v3';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const page = req.mode === 'navigate';
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    if (!page) {
      const hit = await cache.match(req);
      if (hit) return hit;
    }
    try {
      const res = await fetch(req);
      if (res.ok || res.type === 'opaque') cache.put(req, res.clone());
      return res;
    } catch (err) {
      const hit = await cache.match(req);
      if (hit) return hit;
      throw err;
    }
  })());
});
