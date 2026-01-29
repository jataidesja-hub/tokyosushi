const CACHE_NAME = 'tokyo-sushi-v3';
const ASSETS = [
    '/',
    '/index.html',
    '/status.html',
    '/css/styles.css?v=1.6',
    '/js/store.js?v=1.6',
    '/assets/logo.png',
    '/manifest.json'
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

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});

