/* Точно — офлайн-кеш.
   Стратегия: сразу отдаём из памяти телефона, параллельно тихо проверяем
   обновление и кладём его в кеш. Свежая версия применяется при следующем
   открытии — так приложение никогда не ждёт сеть и не ломается без неё. */

const CACHE = 'tochno-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || !req.url.startsWith('http')) return;

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => {
      const net = fetch(req).then(res => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return res;
      }).catch(() => null);

      // есть в кеше — отдаём мгновенно, сеть обновит фоном
      if (hit) return hit;

      // нет в кеше — ждём сеть, а если её нет, показываем главную страницу
      return net.then(res => res || caches.match('./index.html'));
    })
  );
});
