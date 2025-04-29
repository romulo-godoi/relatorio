importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

const CACHE_NAME = 'pioneer-tracker-cache-v2.8';
const offlineFallbackPage = './index.html';

const urlsToCache = [
  './',
  './index.html',
  /* './style.css', foi removido */
  './manifest.json',
  './translations.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        const allUrlsToCache = [...new Set([...urlsToCache, offlineFallbackPage])];
        return cache.addAll(allUrlsToCache);
      })
      .catch(error => {
        console.error('Service Worker: Falha ao cachear arquivos na instalação:', error);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

if (workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  try {
      workbox.navigationPreload.enable();
  } catch(e) {
      console.error('SW: Falha ao habilitar Navigation Preload:', e);
  }
}

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          return preloadResp;
        }
        const networkResp = await fetch(event.request);
        if (networkResp && networkResp.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResp.clone());
        }
        return networkResp;
      } catch (error) {
        const cache = await caches.open(CACHE_NAME);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp || new Response("Offline fallback page not found in cache.", { status: 404, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
  }
  else {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          return fetch(event.request).then(
            (networkResponse) => {
              if (!networkResponse || networkResponse.status !== 200) {
                return networkResponse;
              }
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch(error => {
            console.error('SW: Fetch de recurso falhou (rede e cache):', error, event.request.url);
            if (event.request.url.includes('fonts.gstatic.com') || event.request.url.includes('cdn.jsdelivr.net')) {
                return new Response('', { status: 503, statusText: 'Service Unavailable' });
            }
            return new Response(`Resource ${event.request.url} not available offline.`, {
                 status: 404,
                 headers: { 'Content-Type': 'text/plain' },
               });
          });
        })
    );
  }
});

console.log(`Service Worker (${CACHE_NAME}) carregado e pronto.`);
