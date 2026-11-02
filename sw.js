// Caches the app and the ffmpeg converter so the installed app opens fast and works offline.
const CACHE = 'wma-to-mp3-v1';
const CORE = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd/';
const PRECACHE = [
  './', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png',
  CORE + 'ffmpeg-core.js', CORE + 'ffmpeg-core.wasm',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;

  // The converter is pinned to a version and never changes: serve it from the cache.
  if (req.url.startsWith(CORE)) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }

  // App files: try the network first so updates arrive, fall back to the cache when offline.
  if (new URL(req.url).origin === location.origin) {
    e.respondWith(
      fetch(req)
        .then(res => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        })
        .catch(() => caches.match(req, { ignoreSearch: true }))
    );
  }
});
