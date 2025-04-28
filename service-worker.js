// Define um nome e versão para o cache
const CACHE_NAME = 'pioneer-tracker-cache-v1.6'; // <<-- Mantenha esta versão ou incremente se mudar urlsToCache

// Lista de arquivos essenciais para cachear na instalação
const urlsToCache = [
  './',                  // Atalho para index.html
  './index.html',        // O arquivo HTML principal
  './manifest.json',     // Manifest para PWA
  './translations.json', // Arquivo de traduções

  // Ícones (verifique se os caminhos estão corretos e os arquivos existem)
  './icon-192x192.png',
  './icon-512x512.png', // Descomentado - Adicione se existir

  // Scripts essenciais da CDN
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
];

// Evento de Instalação: Cacheia os arquivos essenciais
self.addEventListener('install', (event) => {
  console.log(`Service Worker: Instalando (${CACHE_NAME})...`);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto, adicionando arquivos principais:', urlsToCache);
        // ATENÇÃO: Se algum destes arquivos falhar ao baixar, a instalação falhará.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos principais cacheados com sucesso.');
        return self.skipWaiting(); // Ativa o novo SW imediatamente
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

// Evento Fetch: Intercepta requisições (Estratégia Cache-First)
self.addEventListener('fetch', (event) => {
   // Ignora requisições não-GET ou de extensões
   if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
     return;
   }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Se encontrar no cache, retorna a resposta cacheada
        if (cachedResponse) {
          // console.log('Service Worker: Servindo do cache:', event.request.url);
          return cachedResponse;
        }

        // Se não estiver no cache, busca na rede
        // console.log('Service Worker: Buscando na rede (cache miss):', event.request.url);
        return fetch(event.request).then(
          (networkResponse) => {
            // Verifica se a resposta da rede é válida para cachear
            if (!networkResponse || networkResponse.status !== 200 /* || networkResponse.type !== 'basic' */) {
              // console.warn('Service Worker: Resposta da rede não OK:', event.request.url);
              return networkResponse; // Retorna a resposta não-OK (ex: 404)
            }

            // Clona a resposta válida para poder colocar no cache E retornar ao navegador
            const responseToCache = networkResponse.clone();

            caches.open(CACHE_NAME)
              .then((cache) => {
                // console.log('Service Worker: Cacheando nova resposta da rede:', event.request.url);
                cache.put(event.request, responseToCache); // Adiciona a resposta ao cache
              });

            return networkResponse; // Retorna a resposta original da rede
          }
        ).catch(error => {
          console.error('Service Worker: Fetch falhou (rede e cache):', error, event.request.url);
          // Opcional: Retornar uma página offline genérica
          // return caches.match('./offline.html');

          // Retorna uma resposta de erro genérica se a rede falhar e não houver cache
           return new Response("Network error trying to fetch resource.", {
               status: 408, // Request Timeout
               headers: { 'Content-Type': 'text/plain' },
             });
        });
      })
  );
});

// --- Adicione estes listeners se for implementar notificações ---
/*
self.addEventListener('notificationclick', event => {
  console.log('SW: Notification clicked.');
  event.notification.close();
  // Abre ou foca a janela do app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        const url = new URL(client.url);
        // Ajuste o pathname se o seu app não estiver na raiz '/'
        if (url.pathname === '/' || url.pathname === '/index.html') {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        // Ajuste o caminho se necessário
        return clients.openWindow('/');
      }
    })
  );
});

self.addEventListener('push', event => {
    console.log('SW: Push Received.');
    // Lógica para processar dados do push (se houver)
    const notificationData = event.data ? event.data.json() : {}; // Exemplo

    const title = notificationData.title || 'Nova Notificação';
    const options = {
        body: notificationData.body || 'Você tem uma nova mensagem.',
        icon: notificationData.icon || './icon-192x192.png',
        badge: './icon-72x72.png' // Ícone pequeno (opcional)
        // ... outras opções: actions, data, etc.
    };

    event.waitUntil(self.registration.showNotification(title, options));
});
*/

console.log(`Service Worker (${CACHE_NAME}) carregado.`);
