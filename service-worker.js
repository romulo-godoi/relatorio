// Define um nome e versão para o cache
const CACHE_NAME = 'pioneer-tracker-cache-v1.3'; // <<-- VERSÃO INCREMENTADA!

// Lista de arquivos essenciais para cachear na instalação
const urlsToCache = [
  './', // Atalho para index.html na mesma pasta
  './index.html',
  './manifest.json',
  // Adiciona os scripts da CDN que são essenciais
  'https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js',
  'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@3.0.1/dist/chartjs-plugin-annotation.min.js',
  // Adicione aqui os caminhos para seus ícones, se ainda não estiverem lá
  // 'https://img6.uploadhouse.com/fileuploads/31946/319468660448b03c8a4b1afcf14785e09fc8f828.png',
  // 'https://img6.uploadhouse.com/fileuploads/31946/319468660448b03c8a4b1afcf14785e09fc8f828.png',
];

// Evento de Instalação: Cacheia os arquivos essenciais
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando (v1.3)...'); // Log da versão
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto, adicionando arquivos principais:', urlsToCache);
        // Usamos addAll que é atômico: se um falhar, nenhum é adicionado.
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos principais cacheados com sucesso.');
        // Força o novo Service Worker a se tornar ativo imediatamente
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Falha ao cachear arquivos na instalação:', error);
        // Se addAll falhar, a instalação falha, e o SW não será ativado,
        // o que é geralmente o comportamento desejado nesses casos.
      })
  );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando (v1.3)...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          // Deleta todos os caches que NÃO sejam o CACHE_NAME atual
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Removendo cache antigo:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
        console.log('Service Worker: Ativado e caches antigos removidos.');
        // Garante que o Service Worker controle a página imediatamente
        return self.clients.claim();
    })
  );
});

// Evento Fetch: Intercepta requisições e serve do cache se disponível (Cache First Strategy)
self.addEventListener('fetch', (event) => {
   // Ignora requisições não-GET ou de extensões
   if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Retorna do cache se encontrado
        if (cachedResponse) {
          // console.log('Service Worker: Servindo do cache:', event.request.url);
          return cachedResponse;
        }

        // Não encontrado no cache, busca na rede
        // console.log('Service Worker: Buscando na rede (cache miss):', event.request.url);
        return fetch(event.request).then(
            (networkResponse) => {
                // Verifica se a resposta da rede é válida antes de tentar clonar/cachear
                if (!networkResponse || networkResponse.status !== 200 /* || networkResponse.type !== 'basic' <- REMOVIDO PARA CACHEAR CDNs */) {
                    // Se for uma resposta de erro da rede ou algo não cacheável (ex: erro de CORS para tipo 'opaque' que não queremos cachear explicitamente aqui, o browser pode fazer),
                    // apenas retorna a resposta da rede sem tentar cachear.
                    // console.warn('Service Worker: Resposta da rede não OK ou não cacheável, não cacheando:', event.request.url, networkResponse ? networkResponse.status : 'Sem resposta');
                    return networkResponse;
                }

                // Clona a resposta válida para poder usá-la no cache E retorná-la ao browser
                const responseToCache = networkResponse.clone();

                caches.open(CACHE_NAME)
                  .then((cache) => {
                    // console.log('Service Worker: Cacheando nova resposta da rede:', event.request.url);
                    // Cacheia a resposta da rede para futuras requisições offline
                    cache.put(event.request, responseToCache);
                  });

                // Retorna a resposta original da rede para a página
                return networkResponse;
            }
        ).catch(error => {
            console.error('Service Worker: Fetch falhou (rede e cache):', error, event.request.url);
            // Opcional: Retornar uma página offline padrão ou um erro mais informativo
            // return new Response('Erro de rede. Verifique sua conexão.', { status: 503, statusText: 'Service Unavailable' });
        });
      })
  );
});
