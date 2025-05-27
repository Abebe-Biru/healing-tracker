// sw.js
const CACHE_NAME = 'healing-tracker-v1.2'; // Increment version for updates
const ASSETS_TO_CACHE = [
    'index.html',
    'style.css',
    'script.js',
    'manifest.json',
    'https://unpkg.com/htmx.org@1.9.12', // Cache HTMX
    'icons/icon-192x192.png',
    'icons/icon-512x512.png'
    // Add other static assets if any (e.g., custom fonts, other icons)
];

// Install event: cache all critical assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache:', CACHE_NAME);
                return cache.addAll(ASSETS_TO_CACHE);
            })
            .then(() => {
                console.log('All essential assets cached.');
                return self.skipWaiting(); // Activate new service worker immediately
            })
            .catch(error => {
                console.error('Failed to cache assets during install:', error);
            })
    );
});

// Activate event: clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => {
            console.log('Service worker activated and old caches cleaned.');
            return self.clients.claim(); // Take control of all open clients
        })
    );
});

// Fetch event: serve from cache first, then network
self.addEventListener('fetch', event => {
    // For HTMX or other CDN requests, try network first, then cache, to get updates if online
    if (event.request.url.startsWith('https://unpkg.com/')) {
        event.respondWith(
            fetch(event.request)
                .then(networkResponse => {
                    // If fetch is successful, clone it and cache it
                    if (networkResponse.ok) {
                        const responseToCache = networkResponse.clone();
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // If network fails, try to serve from cache
                    return caches.match(event.request);
                })
        );
        return;
    }

    // For local assets, use cache-first strategy
    event.respondWith(
        caches.match(event.request)
            .then(cachedResponse => {
                // Cache hit - return response
                if (cachedResponse) {
                    return cachedResponse;
                }
                // Not in cache - fetch from network
                return fetch(event.request).then(
                    networkResponse => {
                        // Check if we received a valid response
                        if(!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // IMPORTANT: Clone the response. A response is a stream
                        // and because we want the browser to consume the response
                        // as well as the cache consuming the response, we need
                        // to clone it so we have two streams.
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(error => {
                    console.error("Fetch failed; returning offline page if available or error.", error);
                    // Optionally, return a custom offline page here:
                    // return caches.match('/offline.html');
                });
            })
    );
});
