// Minimaler Service Worker: zeigt eingehende Web-Push-Nachrichten an und
// öffnet beim Klick das betroffene Fahrzeug.
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
