self.addEventListener('install', e => e.waitUntil(
  caches.open('nagara-v1').then(cache => cache.addAll(['/', '/LOGO4721.png']))
));
self.addEventListener('fetch', e => e.respondWith(
  caches.match(e.request).then(res => res || fetch(e.request))
));