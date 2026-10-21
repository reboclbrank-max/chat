/*
 * Coleções locais de conversas v1.
 * Guarda somente nomes escolhidos pela pessoa e associações número-da-Issue → coleção
 * neste navegador. Não há rede, token, título, conteúdo, telemetria ou sincronização.
 */
(function () {
  'use strict';

  const BANCO = 'rebocl-colecoes-conversas-v1';
  const VERSAO_BANCO = 1;
  const LOJA_COLECOES = 'colecoes';
  const LOJA_ITENS = 'itens';
  const LIMITE_COLECOES = 20;
  const LIMITE_NOME = 48;
  const LIMITE_ITENS_COLECAO = 100;
  const LIMITE_ITENS_TOTAL = 400;
  const FORMATO_BACKUP = 'rebocl-colecoes-conversas';
  const VERSAO_BACKUP = 1;
  const LIMITE_BACKUP_BYTES = 128 * 1024;
  let banco = null;
  let colecoes = new Map();
  let itens = new Map();
  let inicio = null;
  let fila = Promise.resolve();
  let estado = 'novo';

  function erro(codigo) {
    const falha = new Error(codigo);
    falha.codigo = codigo;
    return falha;
  }

  function idValido(valor) {
    const id = Number(valor);
    if (!Number.isSafeInteger(id) || id < 1) throw erro('colecao-invalida');
    return id;
  }

  function numeroValido(valor) {
    const numero = Number(valor);
    if (!Number.isSafeInteger(numero) || numero < 1) throw erro('conversa-invalida');
    return numero;
  }

  function normalizarNome(valor) {
    if (typeof valor !== 'string') throw erro('nome-colecao-invalido');
    const nome = valor.replace(/\s+/g, ' ').trim();
    if (!nome || nome.length > LIMITE_NOME || /[\u0000-\u001f\u007f]/.test(nome)) throw erro('nome-colecao-invalido');
    return nome;
  }

  function chaveNome(nome) {
    const base = typeof nome.normalize === 'function' ? nome.normalize('NFKC') : nome;
    return base.toLowerCase();
  }

  function chaveItem(colecao, numero) {
    return String(colecao) + ':' + String(numero);
  }

  function objetoComChaves(valor, chaves) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
    const recebidas = Object.keys(valor).sort();
    const esperadas = chaves.slice().sort();
    return recebidas.length === esperadas.length && recebidas.every((chave, indice) => chave === esperadas[indice]);
  }

  function normalizarBackup(dados) {
    try {
      if (!objetoComChaves(dados, ['formato', 'versao', 'colecoes'])) throw erro('backup-invalido');
      if (dados.formato !== FORMATO_BACKUP || dados.versao !== VERSAO_BACKUP) throw erro('backup-incompativel');
      if (!Array.isArray(dados.colecoes) || dados.colecoes.length > LIMITE_COLECOES) throw erro('backup-invalido');
      const nomes = new Set();
      const normalizadas = [];
      let total = 0;
      for (const bruta of dados.colecoes) {
        if (!objetoComChaves(bruta, ['nome', 'numeros'])) throw erro('backup-invalido');
        const nome = normalizarNome(bruta.nome);
        const chave = chaveNome(nome);
        if (nomes.has(chave) || !Array.isArray(bruta.numeros) || bruta.numeros.length > LIMITE_ITENS_COLECAO) throw erro('backup-invalido');
        nomes.add(chave);
        const vistos = new Set();
        const numeros = [];
        for (const valor of bruta.numeros) {
          if (typeof valor !== 'number') throw erro('backup-invalido');
          const numero = numeroValido(valor);
          if (vistos.has(numero)) throw erro('backup-invalido');
          vistos.add(numero);
          numeros.push(numero);
        }
        total += numeros.length;
        if (total > LIMITE_ITENS_TOTAL) throw erro('backup-invalido');
        normalizadas.push(Object.freeze({ nome, numeros: Object.freeze(numeros.sort((a, b) => a - b)) }));
      }
      normalizadas.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
      return Object.freeze({
        formato: FORMATO_BACKUP,
        versao: VERSAO_BACKUP,
        colecoes: Object.freeze(normalizadas)
      });
    } catch (causa) {
      if (causa && (causa.codigo === 'backup-invalido' || causa.codigo === 'backup-incompativel')) throw causa;
      throw erro('backup-invalido');
    }
  }

  function planoDoBackup(backup) {
    const proximasColecoes = [];
    const proximosItens = [];
    let id = 1;
    for (const colecao of backup.colecoes) {
      proximasColecoes.push({ id, nome: colecao.nome });
      for (const numero of colecao.numeros) proximosItens.push({ chave: chaveItem(id, numero), colecao: id, numero });
      id++;
    }
    return { colecoes: proximasColecoes, itens: proximosItens };
  }

  function backupAtual() {
    const colecoesExportadas = listarColecoes().map((colecao) => {
      const numeros = Array.from(itens.values())
        .filter((item) => item.colecao === colecao.id)
        .map((item) => item.numero)
        .sort((a, b) => a - b);
      return Object.freeze({ nome: colecao.nome, numeros: Object.freeze(numeros) });
    });
    return Object.freeze({
      formato: FORMATO_BACKUP,
      versao: VERSAO_BACKUP,
      colecoes: Object.freeze(colecoesExportadas)
    });
  }

  function quantidadeDaColecao(id) {
    let quantidade = 0;
    for (const item of itens.values()) if (item.colecao === id) quantidade++;
    return quantidade;
  }

  function detalhe() {
    return Object.freeze({
      estado,
      colecoes: colecoes.size,
      itens: itens.size,
      limiteColecoes: LIMITE_COLECOES,
      limiteItensPorColecao: LIMITE_ITENS_COLECAO,
      limiteItensTotal: LIMITE_ITENS_TOTAL
    });
  }

  function avisar(nome) {
    if (typeof document === 'undefined' || typeof document.dispatchEvent !== 'function') return;
    let evento;
    try {
      evento = new CustomEvent('rebocl-colecoes-conversas-' + nome, { detail: detalhe() });
    } catch (e) {
      try {
        evento = document.createEvent('CustomEvent');
        evento.initCustomEvent('rebocl-colecoes-conversas-' + nome, false, false, detalhe());
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
        if (!db.objectStoreNames.contains(LOJA_COLECOES)) db.createObjectStore(LOJA_COLECOES, { keyPath: 'id' });
        if (!db.objectStoreNames.contains(LOJA_ITENS)) db.createObjectStore(LOJA_ITENS, { keyPath: 'chave' });
      };
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rejeitar(erro('armazenamento-indisponivel'));
      pedido.onblocked = () => rejeitar(erro('armazenamento-indisponivel'));
    });
  }

  function lerEstado() {
    return new Promise((resolver, rejeitar) => {
      let transacao;
      try { transacao = banco.transaction([LOJA_COLECOES, LOJA_ITENS], 'readonly'); }
      catch (e) { rejeitar(erro('armazenamento-indisponivel')); return; }
      let colecoesLidas = null;
      let itensLidos = null;
      function concluirSePronto() {
        if (!colecoesLidas || !itensLidos) return;
        try {
          const proximasColecoes = new Map();
          for (const bruto of colecoesLidas) {
            const id = idValido(bruto && bruto.id);
            const nome = normalizarNome(bruto && bruto.nome);
            if (proximasColecoes.has(id)) throw erro('armazenamento-invalido');
            proximasColecoes.set(id, { id, nome });
          }
          if (proximasColecoes.size > LIMITE_COLECOES) throw erro('armazenamento-invalido');
          const proximosItens = new Map();
          const contagem = new Map();
          for (const bruto of itensLidos) {
            const colecao = idValido(bruto && bruto.colecao);
            const numero = numeroValido(bruto && bruto.numero);
            const chave = chaveItem(colecao, numero);
            if (!proximasColecoes.has(colecao) || bruto.chave !== chave || proximosItens.has(chave)) throw erro('armazenamento-invalido');
            const quantidade = (contagem.get(colecao) || 0) + 1;
            if (quantidade > LIMITE_ITENS_COLECAO) throw erro('armazenamento-invalido');
            contagem.set(colecao, quantidade);
            proximosItens.set(chave, { chave, colecao, numero });
          }
          if (proximosItens.size > LIMITE_ITENS_TOTAL) throw erro('armazenamento-invalido');
          resolver({ colecoes: proximasColecoes, itens: proximosItens });
        } catch (causa) {
          rejeitar(causa && causa.codigo ? causa : erro('armazenamento-invalido'));
        }
      }
      let pedidoColecoes, pedidoItens;
      try {
        pedidoColecoes = transacao.objectStore(LOJA_COLECOES).getAll();
        pedidoItens = transacao.objectStore(LOJA_ITENS).getAll();
      } catch (e) { rejeitar(erro('armazenamento-indisponivel')); return; }
      pedidoColecoes.onsuccess = () => { colecoesLidas = Array.isArray(pedidoColecoes.result) ? pedidoColecoes.result : []; concluirSePronto(); };
      pedidoItens.onsuccess = () => { itensLidos = Array.isArray(pedidoItens.result) ? pedidoItens.result : []; concluirSePronto(); };
      pedidoColecoes.onerror = pedidoItens.onerror = () => rejeitar(erro('armazenamento-indisponivel'));
      transacao.onabort = () => rejeitar(erro('armazenamento-indisponivel'));
    });
  }

  function gravar(acao, dados) {
    return new Promise((resolver, rejeitar) => {
      let transacao;
      try { transacao = banco.transaction([LOJA_COLECOES, LOJA_ITENS], 'readwrite'); }
      catch (e) { rejeitar(erro('armazenamento-indisponivel')); return; }
      let colecoesLoja, itensLoja;
      try {
        colecoesLoja = transacao.objectStore(LOJA_COLECOES);
        itensLoja = transacao.objectStore(LOJA_ITENS);
        if (acao === 'criar' || acao === 'renomear') colecoesLoja.put(dados);
        else if (acao === 'alternar-item') {
          if (dados.adicionar) itensLoja.put(dados.item);
          else itensLoja.delete(dados.item.chave);
        } else if (acao === 'limpar') {
          colecoesLoja.clear();
          itensLoja.clear();
        } else if (acao === 'substituir') {
          colecoesLoja.clear();
          itensLoja.clear();
          for (const colecao of dados.colecoes) colecoesLoja.put(colecao);
          for (const item of dados.itens) itensLoja.put(item);
        } else if (acao === 'apagar-colecao') {
          colecoesLoja.delete(dados.id);
          const pedido = itensLoja.getAll();
          pedido.onsuccess = () => {
            try {
              for (const item of Array.isArray(pedido.result) ? pedido.result : []) {
                if (item && Number(item.colecao) === dados.id && typeof item.chave === 'string') itensLoja.delete(item.chave);
              }
            } catch (e) { try { transacao.abort(); } catch (ignorar) {} }
          };
          pedido.onerror = () => { try { transacao.abort(); } catch (ignorar) {} };
        } else throw erro('colecao-invalida');
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
      .then((db) => { banco = db; return lerEstado(); })
      .then((lido) => {
        colecoes = lido.colecoes;
        itens = lido.itens;
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

  function proximoId() {
    let maior = 0;
    for (const id of colecoes.keys()) if (id > maior) maior = id;
    if (maior >= Number.MAX_SAFE_INTEGER) throw erro('armazenamento-invalido');
    return maior + 1;
  }

  function nomeEmUso(nome, excetoId) {
    const alvo = chaveNome(nome);
    for (const colecao of colecoes.values()) {
      if (colecao.id !== excetoId && chaveNome(colecao.nome) === alvo) return true;
    }
    return false;
  }

  function listarColecoes() {
    return Object.freeze(Array.from(colecoes.values())
      .map((colecao) => Object.freeze({ id: colecao.id, nome: colecao.nome, quantidade: quantidadeDaColecao(colecao.id) }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR') || a.id - b.id));
  }

  function colecaoExiste(id) {
    try { return colecoes.has(idValido(id)); }
    catch (e) { return false; }
  }

  function temConversa(colecao, numero) {
    try { return itens.has(chaveItem(idValido(colecao), numeroValido(numero))); }
    catch (e) { return false; }
  }

  function criarColecao(nome) {
    let seguro;
    try { seguro = normalizarNome(nome); }
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('nome-colecao-invalido')); }
    return enfileirar(async () => {
      await iniciar();
      if (colecoes.size >= LIMITE_COLECOES) throw erro('limite-colecoes');
      if (nomeEmUso(seguro)) throw erro('colecao-duplicada');
      const registro = { id: proximoId(), nome: seguro };
      await gravar('criar', registro);
      colecoes.set(registro.id, registro);
      avisar('mudou');
      return Object.freeze({ id: registro.id, nome: registro.nome, quantidade: 0 });
    });
  }

  function renomearColecao(id, nome) {
    let seguroId, seguroNome;
    try { seguroId = idValido(id); seguroNome = normalizarNome(nome); }
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('colecao-invalida')); }
    return enfileirar(async () => {
      await iniciar();
      if (!colecoes.has(seguroId)) throw erro('colecao-nao-encontrada');
      if (nomeEmUso(seguroNome, seguroId)) throw erro('colecao-duplicada');
      const registro = { id: seguroId, nome: seguroNome };
      await gravar('renomear', registro);
      colecoes.set(seguroId, registro);
      avisar('mudou');
      return Object.freeze({ id: registro.id, nome: registro.nome, quantidade: quantidadeDaColecao(seguroId) });
    });
  }

  function apagarColecao(id) {
    let seguro;
    try { seguro = idValido(id); }
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('colecao-invalida')); }
    return enfileirar(async () => {
      await iniciar();
      if (!colecoes.has(seguro)) throw erro('colecao-nao-encontrada');
      await gravar('apagar-colecao', { id: seguro });
      colecoes.delete(seguro);
      for (const [chave, item] of itens) if (item.colecao === seguro) itens.delete(chave);
      avisar('mudou');
      return detalhe();
    });
  }

  function alternarConversa(colecao, numero) {
    let seguroColecao, seguroNumero;
    try { seguroColecao = idValido(colecao); seguroNumero = numeroValido(numero); }
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('colecao-invalida')); }
    return enfileirar(async () => {
      await iniciar();
      if (!colecoes.has(seguroColecao)) throw erro('colecao-nao-encontrada');
      const chave = chaveItem(seguroColecao, seguroNumero);
      const existe = itens.has(chave);
      if (!existe && quantidadeDaColecao(seguroColecao) >= LIMITE_ITENS_COLECAO) throw erro('limite-itens-colecao');
      if (!existe && itens.size >= LIMITE_ITENS_TOTAL) throw erro('limite-itens-total');
      const item = { chave, colecao: seguroColecao, numero: seguroNumero };
      await gravar('alternar-item', { adicionar: !existe, item });
      if (existe) itens.delete(chave);
      else itens.set(chave, item);
      avisar('mudou');
      return !existe;
    });
  }

  function limparColecoes() {
    return enfileirar(async () => {
      await iniciar();
      await gravar('limpar');
      colecoes.clear();
      itens.clear();
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
    catch (e) { return Promise.reject(e && e.codigo ? e : erro('backup-invalido')); }
    return enfileirar(async () => {
      await iniciar();
      const plano = planoDoBackup(backup);
      await gravar('substituir', plano);
      colecoes = new Map(plano.colecoes.map((colecao) => [colecao.id, Object.assign({}, colecao)]));
      itens = new Map(plano.itens.map((item) => [item.chave, Object.assign({}, item)]));
      avisar('mudou');
      return detalhe();
    });
  }

  function limitesBackup() {
    return Object.freeze({ formato: FORMATO_BACKUP, versao: VERSAO_BACKUP, bytes: LIMITE_BACKUP_BYTES });
  }

  window.ReboclColecoesConversas = Object.freeze({
    iniciar,
    pronto: iniciar,
    estado: () => estado,
    detalhe,
    listarColecoes,
    colecaoExiste,
    temConversa,
    criarColecao,
    renomearColecao,
    apagarColecao,
    alternarConversa,
    limparColecoes,
    exportarBackup,
    validarBackup,
    substituirBackup,
    limitesBackup
  });

  iniciar().catch(() => {});
})();
