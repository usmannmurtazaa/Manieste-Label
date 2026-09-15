/* MANIESTA LABEL — Service worker v2
   Safe fetch handler that never returns undefined.
   Dev-friendly: skips caching on localhost.
*/

const CACHE = 'manieste-v2';
const PRECACHE = [
  './',
  './index.html',
  './shop.html',
  './product.html',
  './cart.html',
  './wishlist.html',
  './about.html',
  './contact.html',
  './assets/css/manieste.css',
  './assets/css/manieste-pages.css',
  './assets/js/main.js',
  './assets/js/manieste-phase2.js',
  './assets/data/products.json',
  './manifest.json'
];

/* Never cache on localhost — Live Server's HMR breaks otherwise */
const IS_DEV = self.location.hostname === 'localhost'
            || self.location.hostname === '127.0.0.1';

self.addEventListener('install', (e) => {
  if (IS_DEV) {
    self.skipWaiting();
    return;
  }
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;

  // In dev: pass through, no caching at all
  if (IS_DEV) return;

  // Only handle GET, only same-origin
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      // Always fire a network request to refresh the cache
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => {
          // Network failed — return cached if we have it, else a valid fallback
          if (cached) return cached;
          return new Response('', { status: 504, statusText: 'Offline' });
        });

      return cached || network;
    }).catch(() => new Response('', { status: 504, statusText: 'Offline' }))
  );
});