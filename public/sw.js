// Service Worker for Solutz PWA (Offline Support + Push Notifications)

const CACHE_NAME = 'solutz-pwa-v2';
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/manifest.webmanifest',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/pwa-maskable-512x512.png',
  '/apple-touch-icon.png',
  '/logo.png',
  '/logo-icon.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-caching non-fatal warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch event listener required by Chromium / Android / Xiaomi PWA installability criteria
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Only intercept same-origin requests (don't block Firestore / Google APIs)
  if (url.origin === self.location.origin) {
    // Skip API routes so push / db calls go straight to network
    if (url.pathname.startsWith('/api/')) {
      return;
    }

    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              if (
                url.pathname.match(/\.(png|jpg|jpeg|svg|css|js|woff2?|json)$/) ||
                url.pathname === '/' ||
                url.pathname === '/index.html'
              ) {
                cache.put(event.request, responseClone);
              }
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            if (event.request.headers.get('accept')?.includes('text/html')) {
              return caches.match('/');
            }
          });
        })
    );
  }
});

// Push Notifications Handling
self.addEventListener('push', (event) => {
  let payload = {
    title: 'Solutz',
    body: 'Nova atualização do sistema!',
    url: '/'
  };

  if (event.data) {
    try {
      payload = event.data.json();
    } catch (e) {
      payload = {
        title: 'Solutz',
        body: event.data.text() || 'Nova atualização do sistema!',
        url: '/'
      };
    }
  }

  const options = {
    body: payload.body,
    icon: payload.icon || '/pwa-192x192.png',
    badge: payload.badge || '/pwa-192x192.png',
    vibrate: [150, 80, 120],
    data: payload.url || '/',
    actions: payload.actions || [],
    tag: payload.tag || 'solutz-notification'
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data || '/', self.location.origin).href;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});
