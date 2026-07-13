/* Service worker: offline para la PWA de repaso CFA */
const VERSION = 'cfa-repaso-v2';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './refstyles.css',
  './app.js',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './index.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Cache-first con relleno en runtime (los vol*.json nuevos se cachean al primer fetch online)
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => hit);
    })
  );
});
