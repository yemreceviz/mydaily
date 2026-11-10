// My Daily — service worker (çevrimdışı açılma ve bildirimler)
const CACHE = 'mydaily-v2';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-180.png', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Önce internetten en güncel hali al, internet yoksa kayıtlı kopyayı göster
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        const kopya = res.clone();
        caches.open(CACHE).then((c) => c.put(req, kopya));
        return res;
      })
      .catch(() => caches.match(req).then((r) => r || caches.match('./index.html')))
  );
});

// Sunucudan bildirim gelince ekranda göster
self.addEventListener('push', (e) => {
  let p = {};
  try { p = e.data ? e.data.json() : {}; } catch (err) { p = { body: e.data ? e.data.text() : '' }; }
  const d = p.data || p.notification || p;
  e.waitUntil(
    self.registration.showNotification(d.title || 'My Daily', {
      body: d.body || '',
      icon: 'icon-192.png',
      badge: 'icon-192.png',
      data: { url: d.url || './' }
    })
  );
});

// Bildirime dokununca uygulamayı aç
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || './';
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      for (const c of list) { if ('focus' in c) return c.focus(); }
      return self.clients.openWindow(url);
    })
  );
});
