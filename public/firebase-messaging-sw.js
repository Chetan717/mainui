importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js');


// ---------------------------------------------------------------------------
// Offline navigation fallback
// ---------------------------------------------------------------------------
// This service worker is already used for Firebase Messaging. Keeping the
// offline fallback here avoids registering a second worker for the same scope.
// Once the app has been opened online at least once, top-level navigations can
// show this self-contained screen even when Vercel/the network is unreachable.
const OFFLINE_CACHE = 'mlmlive-offline-v1';
const OFFLINE_KEY = '/__mlmlive_offline__';
const OFFLINE_HTML = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
  <meta name="theme-color" content="#0f2b5b" />
  <title>MLM LIVE - No Internet</title>
  <style>
    *{box-sizing:border-box}html,body{margin:0;min-height:100%;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#0f2b5b;color:#fff}
    body{min-height:100vh;min-height:100dvh;display:flex;align-items:center;justify-content:center;padding:24px;background:linear-gradient(135deg,#0f2b5b 0%,#1a3a8a 50%,#0e4fa8 100%)}
    .card{width:min(100%,360px);padding:36px 30px;border-radius:20px;text-align:center;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);box-shadow:0 20px 60px rgba(0,0,0,.18);backdrop-filter:blur(16px)}
    .icon{width:76px;height:76px;margin:0 auto 20px;border-radius:999px;background:rgba(255,255,255,.12);display:grid;place-items:center;color:#93c5fd}
    h1{font-size:22px;line-height:1.25;margin:0 0 9px;font-weight:750;letter-spacing:-.3px}
    p{margin:0 0 28px;color:rgba(255,255,255,.68);font-size:14px;line-height:1.6}
    button{appearance:none;border:0;border-radius:12px;padding:12px 26px;background:#fff;color:#0f2b5b;font-weight:700;font-size:15px;cursor:pointer;display:inline-flex;align-items:center;gap:8px;min-height:44px}
    button:active{transform:scale(.98)}
    .status{min-height:20px;margin-top:15px;margin-bottom:0;font-size:12px;color:rgba(255,255,255,.58)}
  </style>
</head>
<body>
  <main class="card" role="main" aria-live="polite">
    <div class="icon" aria-hidden="true">
      <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
        <path d="M1 1l22 22"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a11 11 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><path d="M12 20h.01"/>
      </svg>
    </div>
    <h1>No Internet Connection</h1>
    <p>Please check your Wi-Fi or mobile data. MLM LIVE will reconnect automatically when internet is available.</p>
    <button id="retry" type="button" onclick="retryConnection()">
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.55a11 11 0 0114.08 0"/><path d="M1.42 9a16 16 0 0121.16 0"/><path d="M8.53 16.11a6 6 0 016.95 0"/><path d="M12 20h.01"/></svg>
      Try Again
    </button>
    <div id="status" class="status"></div>
  </main>
  <script>
    function retryConnection(){
      var status=document.getElementById('status');
      if(navigator.onLine){status.textContent='Internet is back. Reconnecting…';location.reload();return;}
      status.textContent='Still offline. Please check your connection.';
      setTimeout(function(){status.textContent='';},2200);
    }
    window.addEventListener('online',function(){
      var status=document.getElementById('status');
      status.textContent='Internet is back. Reconnecting…';
      setTimeout(function(){location.reload();},250);
    });
  </script>
</body>
</html>`;

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(OFFLINE_CACHE);
    await cache.put(
      OFFLINE_KEY,
      new Response(OFFLINE_HTML, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Cache-Control': 'no-store',
        },
      }),
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith('mlmlive-offline-') && key !== OFFLINE_CACHE)
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || request.mode !== 'navigate') return;

  event.respondWith((async () => {
    try {
      return await fetch(request);
    } catch (error) {
      const cache = await caches.open(OFFLINE_CACHE);
      const fallback = await cache.match(OFFLINE_KEY);
      return fallback || new Response(OFFLINE_HTML, {
        status: 503,
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      });
    }
  })());
});

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
