// Service Worker de Omnilector: guarda toda la aplicación (EPUB + Cómics) para funcionar 100% sin conexión.
const CACHE = 'omnilector-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/material3.css',
  './js/engines/unrar-wasm.js',
  './js/engines/vinetas-core.js',
  './js/engines/folio-core.js',
  './js/db.js',
  './js/cloud.js',
  './js/app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) => {
      const net = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => hit || caches.match('./index.html'));
      return hit || net;
    })
  );
});

