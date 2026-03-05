const CACHE_NAME = 'pain-quotidien-v2';

const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/favicon.ico'
];

self.addEventListener('install', event => {
    // Forcer le nouveau service worker à prendre le contrôle immédiatement (skip waiting)
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // On met "catch" car si un fichier n'existe pas, ça fait planter toute l'installation
                return cache.addAll(urlsToCache).catch(err => console.log('Erreur de mise en cache initiale:', err));
            })
    );
});

self.addEventListener('activate', event => {
    // Prendre le contrôle de tous les clients (onglets) immédiatement
    event.waitUntil(clients.claim());

    // Purger les anciens caches (ex: pain-quotidien-v1) responsable de l'écran blanc
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Suppression de l\'ancien cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', event => {
    // Ignorer les requêtes qui ne sont pas "GET" (comme les POST pour Supabase) 
    // et ignorer les requêtes d'extensions chrome
    if (event.request.method !== 'GET' || !event.request.url.startsWith('http')) {
        return;
    }

    // Stratégie "Network First, falling back to cache"
    // C'est indispensable pour Vercel et Vite pour obtenir toujours les derniers fichiers Javascript compilés
    event.respondWith(
        fetch(event.request)
            .then(response => {
                // Si la réponse réseau est valide, on la clone et la met en cache (pour le hors-ligne)
                if (response && response.status === 200 && response.type === 'basic') {
                    const responseToCache = response.clone();
                    caches.open(CACHE_NAME).then(cache => {
                        // On ne met pas en cache les appels API critiques
                        if (!event.request.url.includes('/rest/v1/')) {
                            cache.put(event.request, responseToCache);
                        }
                    });
                }
                return response;
            })
            .catch(() => {
                // Si le réseau échoue (hors-ligne), on cherche dans le cache
                return caches.match(event.request).then(cachedResponse => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    // Redirection d'urgence sur index.html si on est hors ligne et qu'on navigue (SPA)
                    if (event.request.mode === 'navigate') {
                        return caches.match('/index.html');
                    }
                });
            })
    );
});
