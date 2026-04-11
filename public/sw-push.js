// Service Worker — Web Push Notifications pour le chat ByValsue Admin
// Ce fichier est servi depuis la racine du site (/sw-push.js)

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: 'Nouveau message', body: event.data.text() };
  }

  const title = data.title || 'Nouveau message chat';
  const options = {
    body: data.body || '',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: data.conversation_id || 'chat',
    renotify: true,
    data: {
      url: data.url || '/admin/chat',
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur la notification → ouvre/focus l'onglet admin chat
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/admin/chat';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Si un onglet admin est déjà ouvert, on le focus
      for (const client of windowClients) {
        if (client.url.includes('/admin') && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // Sinon on ouvre un nouvel onglet
      return clients.openWindow(targetUrl);
    })
  );
});
