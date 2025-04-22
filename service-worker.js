// Define um nome e versão para o cache
const CACHE_NAME = 'pioneer-tracker-cache-v1.2'; // Incremente a versão se fizer alterações no SW ou nos arquivos cacheados

// Lista de arquivos essenciais para cachear na instalação
// Inclui o HTML principal e o próprio manifest
const urlsToCache = [
  './', // Atalho para index.html na mesma pasta
  './index.html',
  './manifest.json',
  // Adicione aqui os caminhos para seus ícones, se quiser cacheá-los explicitamente
  // 'https://img7.uploadhouse.com/fileuploads/31946/31946867417857fbae27969edc9a37e92f35d14a.png',
  // 'https://img6.uploadhouse.com/fileuploads/31946/319468660448b03c8a4b1afcf14785e09fc8f828.png',
  // Não cacheamos CDNs explicitamente aqui, pois o browser já faz um bom trabalho
  // e o service worker interceptará os requests de qualquer forma.
];

// Evento de Instalação: Cacheia os arquivos essenciais
self.addEventListener('install', (event) => {
  console.log('Service Worker: Instalando...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Cache aberto, adicionando arquivos principais:', urlsToCache);
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('Service Worker: Arquivos principais cacheados com sucesso.');
        // Força o novo Service Worker a se tornar ativo imediatamente
        return self.skipWaiting();
      })
      .catch(error => {
        console.error('Service Worker: Falha ao cachear arquivos na instalação:', error);
      })
  );
});

// Evento de Ativação: Limpa caches antigos
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Ativando...');
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
        // Garante que o Service Worker controle a página imediatamente
        return self.clients.claim();
    })
  );
});

// Evento Fetch: Intercepta requisições e serve do cache se disponível (Cache First Strategy)
self.addEventListener('fetch', (event) => {
  // Não intercepta requisições que não são GET (ex: POST para salvar dados, que não devem ser cacheadas aqui)
  // E também ignora requisições chrome-extension://
   if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension://')) {
    // console.log('Service Worker: Ignorando fetch não-GET ou chrome-extension:', event.request.url);
    return;
  }

  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        // Se encontrado no cache, retorna a resposta cacheada
        if (cachedResponse) {
          // console.log('Service Worker: Servindo do cache:', event.request.url);
          return cachedResponse;
        }

        // Se não encontrado no cache, busca na rede
        // console.log('Service Worker: Buscando na rede (cache miss):', event.request.url);
        return fetch(event.request).then(
            (networkResponse) => {
                // Clona a resposta porque ela só pode ser consumida uma vez
                const responseToCache = networkResponse.clone();

                // Abre o cache e armazena a nova resposta (opcionalmente, mas bom para futuras requisições offline)
                // Verificamos se a resposta é válida antes de cachear
                if(networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
                    caches.open(CACHE_NAME)
                      .then((cache) => {
                        // console.log('Service Worker: Cacheando nova resposta da rede:', event.request.url);
                        cache.put(event.request, responseToCache);
                      });
                 } else if (networkResponse && networkResponse.status !== 200) {
                    // console.warn('Service Worker: Resposta não OK da rede, não cacheando:', event.request.url, networkResponse.status);
                 } else if (networkResponse && networkResponse.type !== 'basic') {
                     // console.log('Service Worker: Resposta não-basic (ex: CDN, opaca), não cacheando explicitamente:', event.request.url);
                     // Nota: O browser pode cachear respostas opacas, mas o SW tem limitações.
                 }

                // Retorna a resposta original da rede para a página
                return networkResponse;
            }
        ).catch(error => {
            console.error('Service Worker: Fetch falhou (rede e cache):', error);
            // Poderia retornar uma página offline customizada aqui, se desejado
            // return caches.match('/offline.html');
        });
      })
  );
});
