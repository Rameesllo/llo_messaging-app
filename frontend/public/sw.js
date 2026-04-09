const CACHE_NAME = 'llo-cache-v2';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

self.addEventListener('fetch', event => {
  const { url } = event.request;
  
  // Skip caching/intervention for development/internal modules
  const isLocal = url.includes('localhost') || url.includes('127.0.0.1');
  
  if (
    isLocal ||
    url.includes('socket.io') || 
    url.includes('/api/') ||
    url.includes('/@vite/') || 
    url.includes('/@react-refresh') ||
    url.includes('node_modules') ||
    !url.startsWith(self.location.origin)
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then(response => {
        // If it's a valid response, maybe cache it (optional for v2 simplicity)
        return response;
      })
      .catch(() => {
        // Fallback to cache if network fails
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            return cachedResponse;
          }
          // If neither works, must return a Response to avoid TypeError
          return new Response('Network error occurred', {
            status: 408,
            headers: { 'Content-Type': 'text/plain' }
          });
        });
      })
  );
});
