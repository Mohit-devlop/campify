const CACHE_NAME = 'campify-cache-v1';
const ASSETS_TO_CACHE = [
  '/',
  '/logo.svg',
  '/favicon.ico',
];

// Get environment from URL query parameter
const urlParams = new URL(self.location.href).searchParams;
const isDev = urlParams.get('env') === 'development';

// Install Service Worker
self.addEventListener('install', (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app shell');
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activate Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[Service Worker] Removing old cache', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch Interception
self.addEventListener('fetch', (event) => {
  if (isDev) {
    return; // Bypass caching and interception in development to prevent HMR and reload loops
  }

  // Avoid intercepting API routes, WebSockets, or Next.js development hot reloads
  if (
    event.request.url.includes('/api/') ||
    event.request.url.includes('/_next/') ||
    event.request.url.includes('hot-update') ||
    event.request.url.startsWith('chrome-extension:')
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((response) => {
        // Cache dynamic assets (like profile pictures or icons) that are loaded
        if (
          response &&
          response.status === 200 &&
          (event.request.url.includes('/uploads/') || event.request.url.includes('unsplash.com'))
        ) {
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return response;
      }).catch(() => {
        // Fallback for offline (can add custom offline page if needed)
      });
    })
  );
});
