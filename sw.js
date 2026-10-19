/* Service worker v4 — só guarda a casca estática e nunca uma URL com consulta. */
const CACHE = 'rebocl-chat-v5';
const CASCA = [
  './', './index.html', './direto.html', './ligar.html', './limpar.html', './console.html', './manifest.json',
  './icone-192.png', './icone-512.png'
];
const ARQUIVOS_CACHEAVEIS = new Set(CASCA.map((caminho) => new URL(caminho, self.location.href).pathname));

self.addEventListener('install', (evento) => {
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CASCA)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (evento) => {
  evento.waitUntil(
    caches.keys()
      .then((chaves) => Promise.all(chaves.filter((chave) => chave !== CACHE).map((chave) => caches.delete(chave))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (evento) => {
  const requisicao = evento.request;
  const url = new URL(requisicao.url);
  // API, terceiros, POSTs, páginas com query e qualquer recurso não previsto
  // seguem direto para a rede e jamais ficam no Cache Storage.
  if (requisicao.method !== 'GET' || url.origin !== self.location.origin || url.search || !ARQUIVOS_CACHEAVEIS.has(url.pathname)) return;

  evento.respondWith(
    fetch(requisicao, { cache: 'no-store' })
      .then((resposta) => {
        if (resposta && resposta.ok) {
          const copia = resposta.clone();
          caches.open(CACHE).then((cache) => cache.put(requisicao, copia)).catch(() => {});
        }
        return resposta;
      })
      .catch(() => caches.match(requisicao).then((resposta) => resposta || caches.match('./index.html')))
  );
});
