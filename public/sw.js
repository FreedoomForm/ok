const SW_VERSION = 'autofood-v3';
const STATIC_CACHE = `${SW_VERSION}-static`;
const RUNTIME_CACHE = `${SW_VERSION}-runtime`;
const IMAGE_CACHE = `${SW_VERSION}-images`;
const OFFLINE_FALLBACK_URL = '/offline';

const PRECACHE_URLS = [
    '/',
    '/login',
    '/manifest.json',
    '/logo.svg',
    '/favicon.ico',
    '/icon-192.png',
    '/icon-512.png',
    OFFLINE_FALLBACK_URL,
];

const STATIC_DESTINATIONS = new Set(['style', 'script', 'font', 'worker']);

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(STATIC_CACHE);
            await cache.addAll(PRECACHE_URLS);
            await self.skipWaiting();
        })()
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter((name) => ![STATIC_CACHE, RUNTIME_CACHE, IMAGE_CACHE].includes(name))
                    .map((name) => caches.delete(name))
            );

            if (self.registration.navigationPreload) {
                await self.registration.navigationPreload.enable();
            }

            await self.clients.claim();
        })()
    );
});

self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

self.addEventListener('fetch', (event) => {
    const { request } = event;
    if (!shouldHandleRequest(request)) return;

    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/')) return;

    if (request.mode === 'navigate') {
        event.respondWith(networkFirstNavigation(event));
        return;
    }

    if (url.origin !== self.location.origin) return;

    if (request.destination === 'image') {
        event.respondWith(cacheFirst(request, IMAGE_CACHE));
        return;
    }

    if (STATIC_DESTINATIONS.has(request.destination)) {
        event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
        return;
    }

    event.respondWith(networkFirstRuntime(request, RUNTIME_CACHE));
});

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-orders') {
        event.waitUntil(syncOrders());
    }
});

self.addEventListener('push', (event) => {
    if (!event.data) return;

    const data = event.data.json();
    const options = {
        body: data.body || 'New notification from AutoFood',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [100, 50, 100],
        data: {
            url: data.url || '/',
        },
        actions: [
            { action: 'open', title: 'Open' },
            { action: 'close', title: 'Close' },
        ],
    };

    event.waitUntil(
        self.registration.showNotification(data.title || 'AutoFood', options)
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    if (event.action === 'open' || !event.action) {
        event.waitUntil(
            clients.openWindow(event.notification.data.url || '/')
        );
    }
});

function shouldHandleRequest(request) {
    return request.method === 'GET' && request.url.startsWith('http');
}

async function networkFirstNavigation(event) {
    const { request } = event;
    const runtimeCache = await caches.open(RUNTIME_CACHE);

    try {
        const preloadResponse = await event.preloadResponse;
        if (preloadResponse) {
            runtimeCache.put(request, preloadResponse.clone());
            return preloadResponse;
        }

        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            runtimeCache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        const cached = await runtimeCache.match(request);
        if (cached) return cached;

        const offlinePage = await caches.match(OFFLINE_FALLBACK_URL);
        if (offlinePage) return offlinePage;

        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

async function networkFirstRuntime(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        const cached = await cache.match(request);
        if (cached) return cached;
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });
    }
}

async function staleWhileRevalidate(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    const networkPromise = fetch(request)
        .then((response) => {
            if (response && response.ok) {
                cache.put(request, response.clone());
            }
            return response;
        })
        .catch(() => undefined);

    return cachedResponse || networkPromise || new Response('Offline', {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) return cachedResponse;

    try {
        const networkResponse = await fetch(request);
        if (networkResponse && networkResponse.ok) {
            cache.put(request, networkResponse.clone());
        }
        return networkResponse;
    } catch {
        return new Response('', { status: 504, statusText: 'Gateway Timeout' });
    }
}

async function syncOrders() {
    return Promise.resolve();
}

