const CACHE = 'teleio-v2';
const PRECACHE = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/main.js',
  '/images/teleio-logo.png',
  '/images/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE).then(function(c) { return c.addAll(PRECACHE); })
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.filter(function(k) { return k !== CACHE; }).map(function(k) { return caches.delete(k); }));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;
  if (e.request.url.includes('/api/')) return; /* never cache API calls */
  e.respondWith(
    fetch(e.request)
      .then(function(res) {
        var clone = res.clone();
        caches.open(CACHE).then(function(c) { c.put(e.request, clone); });
        return res;
      })
      .catch(function() { return caches.match(e.request); })
  );
});
