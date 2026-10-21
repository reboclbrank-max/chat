/* Service worker v84 — casca estática versionada, nunca URL com consulta ou API. */
const CACHE = 'rebocl-chat-v84';
const CASCA = [
  './', './index.html', './direto.html', './ligar.html', './limpar.html', './console.html', './chat-estilos.css', './chat-pwa.js', './chat-comandos-locais.js', './chat-filtro-chips.js', './chat-organizacao-local.js', './chat-colecoes-local.js', './chat-workspace.js', './manifest.json',
  './icone-192.png', './icone-512.png'
];
const ARQUIVOS_CACHEAVEIS = new Set(CASCA.map((caminho) => new URL(caminho, self.location.href).pathname));

self.addEventListener('install', (evento) => {
  // Não ativa no meio de uma escrita. A tela oferece atualização explícita
  // depois de confirmar que não há envio, importação, sincronização ou rascunho.
  evento.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(CASCA)));
});

self.addEventListener('message', (evento) => {
  if (evento.data && evento.data.tipo === 'REBOCL_ATIVAR_ATUALIZACAO') self.skipWaiting();
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
