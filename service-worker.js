importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// Incremented version for new Gun.js and SEA.js scripts
const CACHE_NAME = 'pioneer-tracker-cache-v2.10';
const offlineFallbackPage = './index.html';

const urlsToCache = [
  './',
  './index.html',
  // './style.css', // Mantido comentado conforme seu script
  './manifest.json',
  './translations.json',
  './icon-192x192.png',
  './icon-512x512.png',
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  // Adicionados os scripts do GunDB:
  'https://cdn.jsdelivr.net/npm/gun/gun.js',
  'https://cdn.jsdelivr.net/npm/gun/sea.js', // Essencial se Gun usa criptografia (SEA)
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener('install', (event) => {
  console.log(`Service Worker: Instalando (${CACHE_NAME})...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // Adiciona a página de fallback à lista de URLs se não estiver já lá.
        const allUrlsToCache = [...new Set([...urlsToCache, offlineFallbackPage])];
        console.log(`Service Worker (${CACHE_NAME}): Cache aberto, adicionando arquivos principais:`, allUrlsToCache);
        return cache.addAll(allUrlsToCache); // Se algum falhar, a instalação falha.
      })
      .catch(error => {
        console.error(`Service Worker (${CACHE_NAME}): Falha ao cachear arquivos na instalação:`, error);
        // A instalação do SW falhará se cache.addAll() rejeitar.
      })
  );
});

self.addEventListener('activate', (event) => {
  console.log(`Service Worker: Ativando (${CACHE_NAME})...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log(`Service Worker (${CACHE_NAME}): Removendo cache antigo:`, cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log(`Service Worker (${CACHE_NAME}): Ativado e caches antigos removidos.`);
      return self.clients.claim();
    })
  );
});

if (workbox.navigationPreload && workbox.navigationPreload.isSupported()) {
  try {
      console.log(`Service Worker (${CACHE_NAME}): Habilitando Navigation Preload.`);
      workbox.navigationPreload.enable();
  } catch(e) {
      console.error(`SW (${CACHE_NAME}): Falha ao habilitar Navigation Preload:`, e);
  }
} else {
    console.log(`Service Worker (${CACHE_NAME}): Navigation Preload não suportado ou workbox não definido.`);
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
          // console.log(`SW (${CACHE_NAME}): Servindo Navigation Preload response para: ${event.request.url}`);
          return preloadResp;
        }
        // console.log(`SW (${CACHE_NAME}): Buscando na rede (navigate): ${event.request.url}`);
        const networkResp = await fetch(event.request);
        // Apenas cacheia a resposta da navegação principal se ela for bem-sucedida.
        // O index.html já é adicionado explicitamente em urlsToCache.
        // Este cache.put() aqui é mais para se a URL navegada for algo dinâmico não listado.
        if (networkResp && networkResp.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(event.request, networkResp.clone());
        }
        return networkResp;
      } catch (error) {
        console.warn(`SW (${CACHE_NAME}): Rede falhou para navegação ${event.request.url}. Servindo fallback:`, error);
        const cache = await caches.open(CACHE_NAME);
        const cachedResp = await cache.match(offlineFallbackPage);
        return cachedResp || new Response("Offline fallback page not found in cache.", { status: 404, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
  }
  else { // Para todos os outros recursos (JS, CSS, imagens, JSON etc.)
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // console.log(`SW (${CACHE_NAME}): Servindo do cache: ${event.request.url}`);
            return cachedResponse;
          }
          // console.log(`SW (${CACHE_NAME}): Não encontrado no cache, buscando na rede: ${event.request.url}`);
          return fetch(event.request).then(
            (networkResponse) => {
              // Não tentar cachear respostas de erro da rede ou respostas opacas (no-cors)
              // a menos que você saiba o que está fazendo.
              if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic' && networkResponse.type !== 'cors') {
                // Para CDNs, uma resposta 'opaque' pode ser esperada para requisições no-cors
                // e ainda pode ser útil cacheá-las se elas forem OK para isso.
                // Se o tipo for 'opaque', é uma resposta a uma requisição cross-origin no-cors.
                // Não podemos ver o status, então é arriscado cachear a menos que confiemos na fonte.
                if(networkResponse && networkResponse.ok && networkResponse.type === 'opaque' && urlsToCache.includes(event.request.url)) {
                    // É uma URL CDN que especificamos, tipo opaca, vamos cachear
                } else {
                    // console.warn(`SW (${CACHE_NAME}): Resposta da rede não OK para cache: ${event.request.url}, status: ${networkResponse ? networkResponse.status : 'undefined'}`);
                    return networkResponse;
                }
              }
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  // console.log(`SW (${CACHE_NAME}): Cacheando resposta da rede: ${event.request.url}`);
                  cache.put(event.request, responseToCache);
                });
              return networkResponse;
            }
          ).catch(error => {
            // A rede falhou ou o fetch foi rejeitado.
            console.error(`SW (${CACHE_NAME}): Fetch de recurso falhou (rede, e não estava no cache inicialmente):`, error, event.request.url);
            // Aqui você pode decidir se quer retornar uma resposta genérica de erro para tipos específicos de recursos
            // Por exemplo, para fontes ou scripts CDN, falhar silenciosamente ou com erro HTTP pode ser melhor que nada.
            if (event.request.destination === 'script' || event.request.destination === 'style' || event.request.url.includes('fonts.gstatic.com')) {
                // console.warn(`SW (${CACHE_NAME}): Não foi possível buscar o recurso ${event.request.destination}: ${event.request.url}`);
                return new Response('', { status: 503, statusText: 'Service Unavailable', headers: { 'Content-Type': 'text/plain' } });
            }
            // Para outros tipos, como imagens, pode ser melhor falhar completamente para que o app possa lidar com a imagem ausente.
            return new Response(`Resource not available offline and network failed: ${event.request.url}`, {
                 status: 404,
                 headers: { 'Content-Type': 'text/plain' },
               });
          });
        })
    );
  }
});

console.log(`Service Worker (${CACHE_NAME}) carregado.`);
