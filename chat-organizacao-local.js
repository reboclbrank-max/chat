/*
 * Organização local de conversas v1.
 * Favoritos guardam somente o número da Issue neste navegador. Não há rede,
 * token, título, conteúdo, telemetria ou sincronização neste módulo.
 */
(function () {
  'use strict';

  const BANCO = 'rebocl-organizacao-conversas-v1';
  const VERSAO_BANCO = 1;
  const LOJA = 'favoritos';
  const LIMITE_FAVORITOS = 100;
  let banco = null;
  let favoritos = new Set();
  let inicio = null;
  let fila = Promise.resolve();
  let estado = 'novo';

  function erro(codigo) {
    const falha = new Error(codigo);
    falha.codigo = codigo;
    return falha;
  }

  function numeroValido(valor) {
    const numero = Number(valor);
    if (!Number.isSafeInteger(numero) || numero < 1) throw erro('favorito-invalido');
    return numero;
  }

  function detalhe() {
    return Object.freeze({
      estado,
      quantidade: favoritos.size,
      limite: LIMITE_FAVORITOS
    });
  }

  function avisar(nome) {
    if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') return;
    let evento;
    try {
      evento = new CustomEvent('rebocl-organizacao-conversas-' + nome, { detail: detalhe() });
    } catch (e) {
      try {
        evento = document.createEvent('CustomEvent');
        evento.initCustomEvent('rebocl-organizacao-conversas-' + nome, false, false, detalhe());
      } catch (ignorar) { return; }
    }
    document.dispatchEvent(evento);
  }

  function abrirBanco() {
    return new Promise((resolver, rejeitar) => {
      if (typeof indexedDB === 'undefined' || !indexedDB || typeof indexedDB.open !== 'function') {
        rejeitar(erro('armazenamento-indisponivel'));
        return;
      }
      let pedido;
      try { pedido = indexedDB.open(BANCO, VERSAO_BANCO); }
      catch (e) { rejeitar(erro('armazenamento-indisponivel')); return; }
      pedido.onupgradeneeded = () => {
        const db = pedido.result;
        if (!db.objectStoreNames.contains(LOJA)) db.createObjectStore(LOJA, { keyPath: 'numero' });
      };
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rejeitar(erro('armazenamento-indisponivel'));
      pedido.onblocked = () => rejeitar(erro('armazenamento-indisponivel'));
    });
  }

  function lerFavoritos() {
    return new Promise((resolver, rejeitar) => {
      let transacao;
      try { transacao = banco.transaction(LOJA, 'readonly'); }
      catch (e) { rejeitar(erro('armazenamento-indisponivel')); return; }
      const pedido = transacao.objectStore(LOJA).getAll();
      pedido.onsuccess = () => {
        const numeros = new Set();
        for (const item of Array.isArray(pedido.result) ? pedido.result : []) {
          try { numeros.add(numeroValido(item && item.numero)); } catch (e) {}
        }
        resolver(numeros);
      };
      pedido.onerror = () => rejeitar(erro('armazenamento-indisponivel'));
      transacao.onabort = () => rejeitar(erro('armazenamento-indisponivel'));
    });
  }

  function gravar(acao, numero) {
    return new Promise((resolver, rejeitar) => {
      let transacao;
      try { transacao = banco.transaction(LOJA, 'readwrite'); }
      catch (e) { rejeitar(erro('armazenamento-indisponivel')); return; }
      const loja = transacao.objectStore(LOJA);
      try {
        if (acao === 'adicionar') loja.put({ numero });
        else if (acao === 'remover') loja.delete(numero);
        else if (acao === 'limpar') loja.clear();
        else throw erro('favorito-invalido');
      } catch (e) { rejeitar(e && e.codigo ? e : erro('armazenamento-indisponivel')); return; }
      transacao.oncomplete = () => resolver();
      transacao.onerror = () => rejeitar(erro('armazenamento-indisponivel'));
      transacao.onabort = () => rejeitar(erro('armazenamento-indisponivel'));
    });
  }

  function iniciar() {
    if (inicio) return inicio;
    estado = 'carregando';
    inicio = abrirBanco()
      .then((db) => {
        banco = db;
        return lerFavoritos();
      })
      .then((numeros) => {
        favoritos = numeros;
        estado = 'pronto';
        avisar('pronta');
        return detalhe();
      })
      .catch((causa) => {
        estado = 'falhou';
        avisar('falhou');
        throw causa && causa.codigo ? causa : erro('armazenamento-indisponivel');
      });
    return inicio;
  }

  function enfileirar(tarefa) {
    const proxima = fila.catch(() => {}).then(tarefa);
    fila = proxima;
    return proxima;
  }

  function temFavorito(numero) {
    try { return favoritos.has(numeroValido(numero)); }
    catch (e) { return false; }
  }

  function alternarFavorito(numero) {
    let seguro;
    try { seguro = numeroValido(numero); }
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('favorito-invalido')); }
    return enfileirar(async () => {
      await iniciar();
      const jaExiste = favoritos.has(seguro);
      if (!jaExiste && favoritos.size >= LIMITE_FAVORITOS) throw erro('limite-favoritos');
      await gravar(jaExiste ? 'remover' : 'adicionar', seguro);
      if (jaExiste) favoritos.delete(seguro);
      else favoritos.add(seguro);
      avisar('mudou');
      return !jaExiste;
    });
  }

  function limparFavoritos() {
    return enfileirar(async () => {
      await iniciar();
      await gravar('limpar');
      favoritos.clear();
      avisar('mudou');
      return detalhe();
    });
  }

  window.ReboclOrganizacaoConversas = Object.freeze({
    iniciar,
    pronto: iniciar,
    estado: () => estado,
    detalhe,
    temFavorito,
    alternarFavorito,
    limparFavoritos
  });

  iniciar().catch(() => {});
})();
