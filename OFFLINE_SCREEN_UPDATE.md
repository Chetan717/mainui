# Offline screen update

- Registers the existing Firebase Messaging service worker for every visitor.
- Adds a self-contained navigation fallback cached inside the service worker.
- Returning users see the MLM LIVE "No Internet Connection" screen instead of a browser/Vercel network error when a navigation happens offline.
- The offline page automatically reloads when connectivity returns and also includes a Try Again button.
- Existing in-app `OnlineProvider` behavior remains unchanged for connectivity loss while React is already running.
- The service worker is served with `max-age=0, must-revalidate` so updates roll out promptly.

Note: like every web app, a device that has never successfully opened the site before cannot receive a custom offline page because no service worker has been installed yet.
