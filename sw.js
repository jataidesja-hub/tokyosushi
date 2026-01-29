const CACHE_NAME = 'tokyo-sushi-v1';
const ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/store.js',
    '/assets/logo.png',
    '/manifest.json'
];

// Instalação do Service Worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS);
        })
    );
});

// Resposta com Cache
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(response => {
            return response || fetch(event.request);
        })
    );
});
