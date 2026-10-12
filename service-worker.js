// ==========================================
// SERVICE WORKER - BR TEST PDV - v1.3
// ==========================================
const CACHE_NAME = 'brtest-pdv-v1.3';
const ARQUIVOS_CACHE = [
    './',
    './index.html',
    './style.css',
    './app.js',
    './manifest.json',
    'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2',
    'https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

self.addEventListener('install', (event) => {
    console.log('🔧 SW v39 instalando...');
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return Promise.all(
                ARQUIVOS_CACHE.map(url => 
                    cache.add(url).catch(err => console.warn('Falha ao cachear:', url, err))
                )
            );
        }).then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    console.log('✅ SW v39 ativado!');
    event.waitUntil(
        caches.keys().then((nomes) => Promise.all(
            nomes.map((nome) => {
                if (nome !== CACHE_NAME) {
                    console.log('🗑️ Removendo cache:', nome);
                    return caches.delete(nome);
                }
            })
        )).then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);
    if (url.hostname.includes('supabase.co')) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});