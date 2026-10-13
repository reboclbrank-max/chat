/* Service worker v3 — rede PRIMEIRO (cache só se a internet cair). Nunca guarda conversas. */
const CACHE = 'rebocl-chat-v3';
const CASCA = ['./', './index.html', './manifest.json', './icone-192.png', './icone-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(CASCA)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then((chaves) => Promise.all(chaves.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.hostname === 'api.github.com') return;
  if (e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request).then((resp) => {
      if (resp && resp.ok && url.origin === location.origin) { const copia = resp.clone(); caches.open(CACHE).then((c) => c.put(e.request, copia)); }
      return resp;
    }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
  );
});
