// Offline-first service worker: caches the app shell so the sideline tools
// open with zero connection after the first visit. Stale-while-revalidate so
// new deploys propagate whenever a connection exists, without ever blocking
// offline use.
const CACHE = 'ohs-coach-v2';
const SHELL = ['./', './coach.html', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './apple-touch-icon.png', './logo.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // same-origin: cache-first with background refresh (the offline guarantee)
  if (url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then(cached => {
        const refresh = fetch(e.request).then(res => {
          if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          return res;
        }).catch(() => cached);
        return cached || refresh;
      })
    );
    return;
  }
  // cross-origin (CDN libs for exports): network, cached fallback so a lib
  // fetched once (e.g. XLSX) keeps working offline too
  e.respondWith(
    fetch(e.request).then(res => {
      if (res && res.ok) caches.open(CACHE).then(c => c.put(e.request, res.clone()));
      return res;
    }).catch(() => caches.match(e.request))
  );
});
