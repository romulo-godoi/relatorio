// Define um nome e versão para o cache
const CACHE_NAME = 'pioneer-tracker-cache-v1.4'; // <<-- INCREMENTE A VERSÃO AO MUDAR ARQUIVOS CACHEADOS

// Lista de arquivos essenciais para cachear na instalação
const urlsToCache = [
  './',                 // Atalho para index.html
  './index.html',       // O arquivo HTML principal
  './style.css',        // SEU ARQUIVO CSS - ESSENCIAL ADICIONAR
  './script.js',        // SEU ARQUIVO JAVASCRIPT - ESSENCIAL ADICIONAR
  './manifest.json',    // Manifest para PWA
  './translations.json',// Arquivo de traduções - RECOMENDADO ADICIONAR

  // Ícones (adicione todos que seu manifest/HTML referencia)
  './icon-192x192.png', // Exemplo, ajuste o caminho se necessário
  // './icon-512x512.png', // Adicione outros tamanhos se existirem

  // Scripts essenciais da CDN (estes já estavam corretos)
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js',
];

// Evento de Instalação: Cacheia os arquivos essenciais
self.addEventListener('install', (event) => {
  console.log(`Service Worker: Instalando (${CACHE_NAME})...`); // Log com versão
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto, adicionando arquivos principais:', urlsToCache);
        // ATENÇÃO: Se algum destes arquivos falhar ao baixar (ex: erro 404),
        // a instalação INTEIRA do Service Worker falhará.
        // Verifique se todos os caminhos estão corretos.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos principais cacheados com sucesso.');
        // Força o novo Service Worker a se tornar ativo imediatamente
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Falha ao cachear arquivos na instalação:', error);
        // A instalação falhará se o addAll() falhar.
      })
  );
});

// Evento de Ativação: Limpa caches antigos (Nenhuma mudança necessária aqui)
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
        return self.clients.claim();
    })
  );
});

// Evento Fetch: Intercepta requisições (Nenhuma mudança necessária aqui, a lógica parece correta para cache-first)
self.addEventListener('fetch', (event) => {
   // Ignora requisições não-GET ou de extensões
   if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // console.log('Service Worker: Servindo do cache:', event.request.url);
          return cachedResponse;
        }

        // console.log('Service Worker: Buscando na rede (cache miss):', event.request.url);
        return fetch(event.request).then(
            (networkResponse) => {
                // Verifica se a resposta da rede é válida
                if (!networkResponse || networkResponse.status !== 200 /*|| networkResponse.type !== 'basic' <- Ok remover para CDNs */) {
                    // console.warn('Service Worker: Resposta da rede não OK ou não cacheável:', event.request.url);
                    return networkResponse;
                }

                // Clona a resposta válida
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME)
                  .then((cache) => {
                    // console.log('Service Worker: Cacheando nova resposta da rede:', event.request.url);
                    cache.put(event.request, responseToCache);
                  });

                return networkResponse;
            }
        ).catch(error => {
            console.error('Service Worker: Fetch falhou (rede e cache):', error, event.request.url);
            // Pode retornar uma resposta offline genérica aqui, se desejar.
            // Ex: return caches.match('./offline.html');
        });
      })
  );
});
