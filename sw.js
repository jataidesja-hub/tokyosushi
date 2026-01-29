const CACHE_NAME = 'tokyo-sushi-v7';
const ASSETS = [
    './',
    './index.html',
    './status.html',
    './css/styles.css?v=2.1',
    './js/store.js?v=2.1',
    './assets/logo.png',
    './manifest.json'
];

self.addEventListener('install', event => {
    self.skipWaiting(); // Força a ativação imediata
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => {
            return Promise.all(
                keys.filter(key => key !== CACHE_NAME)
                    .map(key => caches.delete(key))
            );
        })
    );
    return self.clients.claim();
});

// Estratégia Network First: Tenta a rede primeiro, se falhar ou demorar, usa o cache.
self.addEventListener('fetch', event => {
    // Apenas para nossos arquivos locais e GET
    if (event.request.method !== 'GET') return;

    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Se a rede respondeu, atualiza o cache e retorna
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => {
                    cache.put(event.request, clone);
                });
                return response;
            })
            .catch(() => {
                // Se a rede falhar, busca no cache
                return caches.match(event.request);
            })
    );
});

