const CACHE_NAME = 'brtest-pdv-v1.2';
const ARQUIVOS_CACHE = ['./', './index.html', './style.css', './app.js', './manifest.json', 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'];

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then(c => c.addAll(ARQUIVOS_CACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (event) => {
    event.waitUntil(caches.keys().then(nomes => Promise.all(nomes.map(n => n !== CACHE_NAME ? caches.delete(n) : null))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.hostname.includes('supabase.co')) return;
    event.respondWith(
        fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
        }).catch(() => caches.match(event.request))
    );
});