// ==========================================
// SERVICE WORKER - BR TEST PDV - v2
// ==========================================
const CACHE_NAME = 'brtest-pdv-v2'; // <-- MUDOU DE v1 PARA v2!
const ARQUIVOS_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker v2 instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(ARQUIVOS_CACHE);
        }).then(() => self.skipWaiting()) // Força ativação imediata
    );
});

self.addEventListener('activate', (event) => {
    console.log('✅ Service Worker v2 ativado!');
    event.waitUntil(
        caches.keys().then((nomes) => {
            return Promise.all(
                nomes.map((nome) => {
                    if (nome !== CACHE_NAME) {
                        console.log('🗑️ Removendo cache antigo:', nome);
                        return caches.delete(nome);
                    }
                })
            );
        }).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.hostname.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, responseClone);
                });
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});