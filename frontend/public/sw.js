// Service Worker: (1) zeigt eingehende Web-Push-Nachrichten an, (2) macht
// die App als PWA installierbar (Samsung Internet/Chrome verlangen dafür
// einen registrierten "fetch"-Handler) und (3) zeigt bei fehlender
// Verbindung eine freundliche Offline-Seite statt des Browser-Fehlers.
// Kein Offline-Caching der eigentlichen App-Daten - die sollen immer
// aktuell vom Server kommen.
const OFFLINE_CACHE = 'servicebuch-offline-v1';
const OFFLINE_URL = '/offline.html';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(OFFLINE_CACHE).then((cache) => cache.add(OFFLINE_URL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  if (event.request.mode !== 'navigate') return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(OFFLINE_URL))
  );
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try {
    payload = event.data.json();
  } catch {
    payload = { title: 'Servicebuch', body: event.data.text() };
  }

  event.waitUntil(
    self.registration.showNotification(payload.title || 'Servicebuch', {
      body: payload.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      data: { url: payload.url || '/dashboard' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(clients.openWindow(url));
});
