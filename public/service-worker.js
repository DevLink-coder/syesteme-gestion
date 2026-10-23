const CACHE_NAME = 'educore-static-v1';
const STATIC_ASSET_PATTERN = /\/build\/assets\//;

self.addEventListener('install', (event) => {
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames
                    .filter(
                        (name) =>
                            name.startsWith('educore-static-') &&
                            name !== CACHE_NAME,
                    )
                    .map((name) => caches.delete(name)),
            );
            await self.clients.claim();
        })(),
    );
});

self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Never cache authenticated HTML or API responses, which contain private school data.
    if (
        request.method !== 'GET' ||
        url.origin !== self.location.origin ||
        !STATIC_ASSET_PATTERN.test(url.pathname)
    )
        return;

    event.respondWith(
        (async () => {
            const cache = await caches.open(CACHE_NAME);
            const cached = await cache.match(request);
            if (cached) return cached;

            const response = await fetch(request);
            if (response.ok) await cache.put(request, response.clone());
            return response;
        })(),
    );
});

self.addEventListener('message', (event) => {
    if (
        event.data?.type === 'SET_BADGE' &&
        Number.isFinite(event.data.count) &&
        'setAppBadge' in self.navigator
    ) {
        void self.navigator.setAppBadge(event.data.count);
    } else if (
        event.data?.type === 'CLEAR_BADGE' &&
        'clearAppBadge' in self.navigator
    ) {
        void self.navigator.clearAppBadge();
    }
});
