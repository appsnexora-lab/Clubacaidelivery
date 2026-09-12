const CACHE_NAME = 'acai-delivery-v9-exact-image-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.json?v=3',
  '/manifest.json?v=2',
  '/manifest.webmanifest',
  '/favicon-v3.ico',
  '/favicon-v2.ico',
  '/favicon.ico',
  '/favicon-16x16-v3.png',
  '/favicon-32x32-v3.png',
  '/icon-48-v3.png',
  '/icon-72-v3.png',
  '/icon-96-v3.png',
  '/icon-128-v3.png',
  '/icon-144-v3.png',
  '/icon-152-v3.png',
  '/icon-192-v3.png',
  '/icon-384-v3.png',
  '/icon-512-v3.png',
  '/icon-maskable-192-v3.png',
  '/icon-maskable-512-v3.png',
  '/apple-touch-icon-v3.png',
  '/apple-touch-icon-192-v3.png',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install Event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map((asset) =>
          cache.add(asset).catch((err) => {
            console.warn('[SW] Aviso no cache inicial:', asset, err);
          })
        )
      );
    }).then(() => self.skipWaiting())
  );
});

// Activate Event - immediately delete all older caches to ensure old icons are replaced
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => {
            console.log('[ServiceWorker] Removendo cache antigo:', name);
            return caches.delete(name);
          })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Skip caching for external API calls, Firebase Firestore, etc.
  if (
    url.hostname.includes('firestore.googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('identitytoolkit') ||
    url.pathname.startsWith('/api')
  ) {
    return;
  }

  // Network-first strategy for page navigation
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            return cachedResponse || caches.match('/index.html');
          });
        })
    );
    return;
  }

  // Stale-while-revalidate strategy for static resources
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, networkResponse);
              });
            }
          })
          .catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          event.request.url.startsWith(self.location.origin)
        ) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return networkResponse;
      });
    })
  );
});
