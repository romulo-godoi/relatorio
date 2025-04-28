// Import Workbox (optional but good practice for PWAs)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/5.1.2/workbox-sw.js');

// Define um nome e versão para o cache
const CACHE_NAME = 'pioneer-tracker-cache-v1.8'; // <-- Increment version

// Define a página principal como fallback offline para navegação
const offlineFallbackPage = './index.html';

// Lista de arquivos essenciais para cachear na instalação
// Certifique-se que offlineFallbackPage está incluído (./ ou ./index.html)
const urlsToCache = [
  './',                  // Atalho para index.html (nosso fallback)
  './index.html',        // O arquivo HTML principal
  './manifest.json',     // Manifest para PWA
  './translations.json', // Arquivo de traduções

  // Ícones (verifique se os caminhos estão corretos e os arquivos existem)
  './icon-192x192.png',
  './icon-512x512.png', // Certifique-se que este existe

  // Scripts essenciais da CDN
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Listener para pular a espera (ativar novo SW mais rápido)
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    console.log('SW: Recebido comando SKIP_WAITING.');
    self.skipWaiting();
  }
});

// Evento de Instalação: Cacheia os arquivos essenciais E a página offline
self.addEventListener('install', (event) => {
  console.log(`Service Worker: Instalando (${CACHE_NAME})...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto, adicionando arquivos principais e fallback offline:', urlsToCache);
        // Adiciona todos os URLs essenciais E garante que a página offline está na lista
        // Se offlineFallbackPage já estiver em urlsToCache (como './' ou './index.html'), não precisa adicionar de novo.
        // Mas adicionar explicitamente não causa problema.
        return cache.addAll(urlsToCache).then(() => cache.add(offlineFallbackPage));
      })
      .then(() => {
        console.log('Service Worker: Arquivos principais e fallback cacheados com sucesso.');
        // Não chamamos skipWaiting aqui, deixamos o message listener cuidar disso
        // para dar controle à página principal.
      })
      .catch(error => {
        console.error('Service Worker: Falha ao cachear arquivos na instalação:', error);
      })
  );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log(`Service Worker: Ativando (${CACHE_NAME})...`);
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Ativado e caches antigos removidos.');
      return self.clients.claim(); // Controla clientes imediatamente
    })
  );
});

// Habilita o Navigation Preload se suportado (melhora performance online)
if (workbox.navigationPreload.isSupported()) {
  console.log('SW: Navigation Preload suportado, habilitando.');
  workbox.navigationPreload.enable();
} else {
   console.log('SW: Navigation Preload não suportado.');
}

// Evento Fetch: Intercepta requisições
self.addEventListener('fetch', (event) => {
  // Ignora requisições não-GET ou de extensões
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    // console.log('SW: Ignorando requisição não-GET ou de extensão:', event.request.url);
    return;
  }

  // Estratégia para requisições de NAVEGAÇÃO (ex: abrir o index.html)
  if (event.request.mode === 'navigate') {
    // console.log('SW: Tratando requisição de navegação:', event.request.url);
    event.respondWith((async () => {
      try {
        // Tenta usar a resposta do Navigation Preload se habilitado
        const preloadResp = await event.preloadResponse;
        if (preloadResp) {
          console.log('SW: Usando resposta do Navigation Preload.');
          return preloadResp;
        }

        // Se não usou preload, tenta buscar na rede
        console.log('SW: Buscando navegação na rede:', event.request.url);
        const networkResp = await fetch(event.request);
        // Cacheia a resposta da navegação principal se for bem-sucedida
        if (networkResp && networkResponse.ok) {
             const cache = await caches.open(CACHE_NAME);
             cache.put(event.request, networkResp.clone());
        }
        return networkResp;
      } catch (error) {
        // Se a rede falhar (offline), serve a página de fallback do cache
        console.warn('SW: Falha na rede para navegação. Servindo fallback offline.', error);
        const cache = await caches.open(CACHE_NAME);
        const cachedResp = await cache.match(offlineFallbackPage);
        // Retorna a página offline ou um erro genérico se nem ela estiver no cache
        return cachedResp || new Response("Offline fallback page not found.", { status: 404, headers: { 'Content-Type': 'text/plain' } });
      }
    })());
  }
  // Estratégia para OUTROS RECURSOS (JS, CSS, Imagens, JSON, etc.) - Cache First
  else {
    // console.log('SW: Tratando requisição de recurso:', event.request.url);
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            // console.log('SW: Servindo recurso do cache:', event.request.url);
            return cachedResponse;
          }

          // Se não está no cache, busca na rede
          // console.log('SW: Buscando recurso na rede:', event.request.url);
          return fetch(event.request).then(
            (networkResponse) => {
              // Verifica se a resposta da rede é válida para cachear
              if (!networkResponse || networkResponse.status !== 200 /* || networkResponse.type !== 'basic' */) {
                 // console.warn('SW: Resposta da rede não OK para recurso:', event.request.url);
                return networkResponse;
              }

              // Clona para colocar no cache e retornar ao navegador
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  // console.log('SW: Cacheando nova resposta de recurso:', event.request.url);
                  cache.put(event.request, responseToCache);
                });

              return networkResponse;
            }
          ).catch(error => {
            console.error('SW: Fetch de recurso falhou (rede e cache):', error, event.request.url);
            // Retorna um erro genérico para recursos não encontrados offline
            return new Response(`Resource ${event.request.url} not available offline.`, {
                 status: 404,
                 headers: { 'Content-Type': 'text/plain' },
               });
          });
        })
    );
  }
});

// --- Listeners de Notificação (mantidos comentados por enquanto) ---
/*
self.addEventListener('notificationclick', event => { ... });
self.addEventListener('push', event => { ... });
*/

console.log(`Service Worker (${CACHE_NAME}) carregado e pronto.`);
