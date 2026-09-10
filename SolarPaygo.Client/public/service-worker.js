// Keeps the install-as-an-app promise (an icon, no browser chrome) without ever serving stale
// data. Meter balances, virtual account status and generator capacity all change constantly,
// so nothing here touches the API or the app shell's own HTML/JS - only static assets (icons,
// SVGs) are cached, and even those are served network-first so a deploy is picked up on the
// next visit rather than being stuck behind an old cache.
const CACHE_NAME = 'solarpaygo-static-v1';
const STATIC_PATHS = ['/images/', '/favicon.svg', '/icons.svg'];

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((names) =>
            Promise.all(names.filter((n) => n !== CACHE_NAME).map((n) => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;
    if (!STATIC_PATHS.some((p) => url.pathname.startsWith(p))) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const copy = response.clone();
                caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
