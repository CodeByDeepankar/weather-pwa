const CACHE_NAME = 'weather-app-v1';
const OFFLINE_URL = '/';

const ASSETS_TO_CACHE = [
  OFFLINE_URL,
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      // Try to fetch and cache each asset individually. If one fails, don't fail the whole install.
      await Promise.allSettled(
        ASSETS_TO_CACHE.map(async (url) => {
          try {
            const res = await fetch(url, { cache: 'no-cache' });
            if (!res || !res.ok) throw new Error(`Bad response for ${url}`);
            await cache.put(url, res.clone());
          } catch (err) {
            // Log and continue; missing optional assets shouldn't block install.
            console.warn('Failed to cache', url, err);
          }
        })
      );
    })()
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.map((key) => {
        if (key !== CACHE_NAME) return caches.delete(key);
      })
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Try network first for API requests, otherwise fall back to cache
  if (request.url.includes('api.openweathermap.org')) {
    event.respondWith(
      fetch(request)
        .then((res) => {
          // optionally cache the response
          const resClone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, resClone));
          return res;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  // For navigation requests, fall back to the offline page. For other requests, don't return
  // the HTML fallback (that would break CSS/images). Instead try cache then network.
  const acceptHeader = request.headers.get('accept') || '';
  const isNavigation = request.mode === 'navigate' || acceptHeader.includes('text/html');

  if (isNavigation) {
    event.respondWith(
      fetch(request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  // Non-navigation assets: prefer cache, otherwise fetch; if both fail, respond with 404-like response.
  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request).catch(() => new Response(null, { status: 404 })))
  );
});
