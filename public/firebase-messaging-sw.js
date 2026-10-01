importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');

let messaging = null;

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'FIREBASE_CONFIG') {
    if (!firebase.apps.length) {
      firebase.initializeApp(event.data.config);
    }
    messaging = firebase.messaging();
    messaging.onBackgroundMessage((payload) => {
      const { title = 'MLM Booster', body = 'New template published!', icon } =
        payload.notification || {};
      const clickAction = payload.data?.clickAction || '/alltemp';
      self.registration.showNotification(title, {
        body,
        icon: icon || '/mlmboo2.ico',
        badge: '/mlmboo2.ico',
        tag: 'mlm-new-template',
        renotify: true,
        data: { url: clickAction },
        actions: [{ action: 'view', title: 'View Templates' }],
      });
    });
  }
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/alltemp';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      return clients.openWindow(url);
    })
  );
});
