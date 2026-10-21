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
  const FORMATO_BACKUP = 'rebocl-favoritos-conversas';
  const VERSAO_BACKUP = 1;
  const LIMITE_BACKUP_BYTES = 32 * 1024;
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

  function objetoComChaves(valor, chaves) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
    const recebidas = Object.keys(valor).sort();
    const esperadas = chaves.slice().sort();
    return recebidas.length === esperadas.length && recebidas.every((chave, indice) => chave === esperadas[indice]);
  }

  function normalizarBackup(dados) {
    try {
      if (!objetoComChaves(dados, ['formato', 'versao', 'favoritos'])) throw erro('backup-favoritos-invalido');
      if (dados.formato !== FORMATO_BACKUP || dados.versao !== VERSAO_BACKUP) throw erro('backup-favoritos-incompativel');
      if (!Array.isArray(dados.favoritos) || dados.favoritos.length > LIMITE_FAVORITOS) throw erro('backup-favoritos-invalido');
      const vistos = new Set();
      const normalizados = [];
      for (const valor of dados.favoritos) {
        if (typeof valor !== 'number') throw erro('backup-favoritos-invalido');
        const numero = numeroValido(valor);
        if (vistos.has(numero)) throw erro('backup-favoritos-invalido');
        vistos.add(numero);
        normalizados.push(numero);
      }
      normalizados.sort((a, b) => a - b);
      return Object.freeze({
        formato: FORMATO_BACKUP,
        versao: VERSAO_BACKUP,
        favoritos: Object.freeze(normalizados)
      });
    } catch (causa) {
      if (causa && (causa.codigo === 'backup-favoritos-invalido' || causa.codigo === 'backup-favoritos-incompativel')) throw causa;
      throw erro('backup-favoritos-invalido');
    }
  }

  function backupAtual() {
    return Object.freeze({
      formato: FORMATO_BACKUP,
      versao: VERSAO_BACKUP,
      favoritos: Object.freeze(Array.from(favoritos).sort((a, b) => a - b))
    });
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
        else if (acao === 'substituir') {
          loja.clear();
          for (const favorito of numero) loja.put({ numero: favorito });
        } else throw erro('favorito-invalido');
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

  function exportarBackup() {
    return enfileirar(async () => {
      await iniciar();
      return backupAtual();
    });
  }

  function validarBackup(dados) {
    return normalizarBackup(dados);
  }

  function substituirBackup(dados) {
    let backup;
    try { backup = normalizarBackup(dados); }
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('backup-favoritos-invalido')); }
    return enfileirar(async () => {
      await iniciar();
      await gravar('substituir', backup.favoritos);
      favoritos = new Set(backup.favoritos);
      avisar('mudou');
      return detalhe();
    });
  }

  function limitesBackup() {
    return Object.freeze({ formato: FORMATO_BACKUP, versao: VERSAO_BACKUP, bytes: LIMITE_BACKUP_BYTES });
  }

  window.ReboclOrganizacaoConversas = Object.freeze({
    iniciar,
    pronto: iniciar,
    estado: () => estado,
    detalhe,
    temFavorito,
    alternarFavorito,
    limparFavoritos,
    exportarBackup,
    validarBackup,
    substituirBackup,
    limitesBackup
  });

  iniciar().catch(() => {});
})();
