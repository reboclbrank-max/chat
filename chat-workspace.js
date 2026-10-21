/* Workspace local do Chat — arquivos permanecem neste navegador até uma escolha explícita. */
(function () {
  'use strict';

  const BANCO = 'rebocl-workspace-local-v1';
  const VERSAO_BANCO = 1;
  const LOJAS = Object.freeze({ projetos: 'projetos', arquivos: 'arquivos', revisoes: 'revisoes', meta: 'meta' });
  const LIMITES = Object.freeze({
    projetos: 20,
    arquivos: 100,
    arquivoBytes: 512 * 1024,
    totalBytes: 5 * 1024 * 1024,
    importacaoBytes: 5 * 1024 * 1024,
    revisoesPorArquivo: 12,
    trechoParaChat: 8000
  });
  const EXTENSOES_TEXTO = /\.(?:txt|md|markdown|json|csv|html|css|js|py|ts|tsx|jsx|yml|yaml|xml|log)$/i;
  const FORMATO_EXPORTACAO = 'rebocl-workspace-local';
  const VERSAO_EXPORTACAO = 1;
  // O arquivo completo é separado do backup aditivo de arquivos ativos: ele é
  // opt-in porque inclui versões e itens recuperáveis da lixeira.
  const FORMATO_ARQUIVO_COMPLETO = 'rebocl-workspace-arquivo-completo';
  const VERSAO_ARQUIVO_COMPLETO = 1;
  const LIMITES_ARQUIVO_COMPLETO = Object.freeze({
    bytes: 12 * 1024 * 1024,
    projetos: 200,
    arquivos: 500,
    revisoes: 4000
  });
  // Projeto portátil é aditivo e preserva versões/lixeira do projeto escolhido,
  // sem confundir-se com a recuperação destrutiva do Workspace inteiro.
  const FORMATO_PROJETO_PORTATIL = 'rebocl-workspace-projeto';
  const VERSAO_PROJETO_PORTATIL = 1;
  const LIMITES_PROJETO_PORTATIL = Object.freeze({
    bytes: 8 * 1024 * 1024,
    arquivos: 500,
    revisoes: 4000
  });

  const estado = {
    banco: null,
    promessaBanco: null,
    projetos: [],
    arquivos: [],
    projetoAtivo: '',
    arquivoAtivo: '',
    bytesOcupados: 0,
    itensLixeira: 0,
    operacaoLixeira: false,
    lixeiraRenderizacao: 0,
    operacaoArquivoCompleto: false,
    // Ponto apenas em memória: permite desfazer a última restauração completa
    // nesta página, sem criar cópia persistente ou sincronizada.
    reversaoArquivoCompleto: null,
    alterado: false,
    // Quando outra guia atualizada salva primeiro, o rascunho desta guia fica
    // no editor até a pessoa escolher recarregar, copiar ou baixar; nunca há
    // substituição silenciosa por último gravador.
    conflitoArquivo: null,
    edicao: 0,
    salvando: false,
    temporizadorSalvar: null,
    telaAnterior: 'lista',
    pronto: false
  };
  let elementos = null;

  function idNovo(prefixo) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return prefixo + '-' + window.crypto.randomUUID();
    return prefixo + '-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }
  function agora() { return new Date().toISOString(); }
  function texto(valor) { return String(valor == null ? '' : valor); }
  function bytes(valor) { return new TextEncoder().encode(texto(valor)).length; }
  function bytesRegistro(registro) {
    if (!registro) return 0;
    const declarado = Number(registro.bytes);
    return Number.isFinite(declarado) && declarado >= 0 ? declarado : bytes(registro.conteudo);
  }
  function estaNaLixeira(registro) { return !!(registro && registro.lixeiraEm); }
  function tirarDaLixeira(registro) {
    const limpo = Object.assign({}, registro);
    delete limpo.lixeiraEm;
    delete limpo.lixeiraRaiz;
    delete limpo.lixeiraProjetoId;
    return limpo;
  }
  function chavesExatas(valor, chaves) {
    if (!valor || typeof valor !== 'object' || Array.isArray(valor)) return false;
    const recebidas = Object.keys(valor).sort();
    const esperadas = chaves.slice().sort();
    return recebidas.length === esperadas.length && recebidas.every((chave, indice) => chave === esperadas[indice]);
  }
  function textoEstrito(valor, limite) {
    if (typeof valor !== 'string' || !valor || valor.length > limite) throw erro('arquivo-completo-invalido');
    return valor;
  }
  function idEstrito(valor) {
    const id = textoEstrito(valor, 180);
    if (!/^[a-z][a-z0-9_-]*$/i.test(id)) throw erro('arquivo-completo-invalido');
    return id;
  }
  function dataEstrita(valor) {
    const textoData = textoEstrito(valor, 40);
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(textoData) || new Date(textoData).toISOString() !== textoData) throw erro('arquivo-completo-invalido');
    return textoData;
  }
  function inteiroEstrito(valor) {
    if (!Number.isSafeInteger(valor) || valor < 1) throw erro('arquivo-completo-invalido');
    return valor;
  }
  function busca(valor) {
    return texto(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  }
  function nomeSeguro(valor, limite, padrao) {
    const limpo = texto(valor).replace(/[\u0000-\u001f\u007f<>:"\\|?*]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, limite);
    return limpo || padrao;
  }
  function nomeArquivoSeguro(valor) {
    let nome = nomeSeguro(valor, 80, 'novo-arquivo.md').replace(/^\.+/, '');
    if (!nome) nome = 'novo-arquivo.md';
    return nome;
  }
  function formatarBytes(valor) {
    const n = Math.max(0, Number(valor) || 0);
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(n < 10 * 1024 ? 1 : 0) + ' KB';
    return (n / (1024 * 1024)).toFixed(1) + ' MB';
  }
  function formatarData(valor) {
    const data = new Date(valor || 0);
    if (Number.isNaN(data.getTime())) return 'agora';
    return data.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
  }
  function erro(codigo) {
    const e = new Error(codigo);
    e.codigoWorkspace = codigo;
    return e;
  }
  function mensagemErro(e) {
    const codigo = e && e.codigoWorkspace;
    const mensagens = {
      'sem-indexeddb': 'Este navegador não oferece o armazenamento local necessário para o Workspace.',
      'limite-projetos': 'O Workspace já chegou ao limite local de projetos.',
      'limite-arquivos': 'O Workspace já chegou ao limite local de arquivos.',
      'arquivo-grande': 'O arquivo passa do limite local de 512 KB.',
      'workspace-cheio': 'O Workspace chegou ao limite local de 5 MB, incluindo histórico e itens recuperáveis. Exporte um backup ou exclua itens definitivamente para liberar espaço.',
      'arquivo-invalido': 'Esse arquivo não tem um formato de texto aceito pelo Workspace.',
      'backup-invalido': 'O backup do Workspace não tem um formato reconhecido.',
      'arquivo-completo-invalido': 'O arquivo completo do Workspace está inválido. Nada foi substituído.',
      'arquivo-completo-grande': 'O arquivo completo passa do limite local de 12 MB e não foi aberto.',
      'arquivo-completo-excesso': 'O arquivo completo excede os limites locais de registros recuperáveis.',
      'projeto-portatil-invalido': 'O arquivo portátil do projeto está inválido. Nada foi importado.',
      'projeto-portatil-grande': 'O arquivo portátil do projeto passa do limite local de 8 MB e não foi aberto.',
      'projeto-portatil-excesso': 'O arquivo portátil do projeto excede os limites locais de registros recuperáveis.',
      'sem-reversao-arquivo-completo': 'Não há uma restauração completa temporária para desfazer nesta página.',
      'projeto-ausente': 'O projeto local de origem não está disponível. O arquivo continua na lixeira.',
      'importacao-grande': 'O arquivo de importação passa do limite local permitido.',
      'sem-selecao': 'Selecione um trecho no editor antes de levá-lo ao Chat.',
      'trecho-grande': 'O trecho selecionado passa do limite local para revisão no Chat.',
      'token-detectado': 'Esse trecho parece conter um token. Ele não foi colocado no Chat.',
      'compositor-cheio': 'O trecho não cabe no compositor atual. Encurte-o ou limpe o texto do Chat primeiro.',
      'sem-arquivo': 'Escolha ou crie um arquivo primeiro.'
    };
    return mensagens[codigo] || 'Não consegui concluir essa operação local agora. Nada foi enviado.';
  }

  function abrirBanco() {
    if (!('indexedDB' in window)) return Promise.reject(erro('sem-indexeddb'));
    if (estado.banco) return Promise.resolve(estado.banco);
    if (estado.promessaBanco) return estado.promessaBanco;
    estado.promessaBanco = new Promise((resolve, reject) => {
      const pedido = indexedDB.open(BANCO, VERSAO_BANCO);
      pedido.onupgradeneeded = () => {
        const banco = pedido.result;
        if (!banco.objectStoreNames.contains(LOJAS.projetos)) banco.createObjectStore(LOJAS.projetos, { keyPath: 'id' });
        if (!banco.objectStoreNames.contains(LOJAS.arquivos)) {
          const arquivos = banco.createObjectStore(LOJAS.arquivos, { keyPath: 'id' });
          arquivos.createIndex('projetoId', 'projetoId', { unique: false });
        }
        if (!banco.objectStoreNames.contains(LOJAS.revisoes)) {
          const revisoes = banco.createObjectStore(LOJAS.revisoes, { keyPath: 'id' });
          revisoes.createIndex('arquivoId', 'arquivoId', { unique: false });
        }
        if (!banco.objectStoreNames.contains(LOJAS.meta)) banco.createObjectStore(LOJAS.meta, { keyPath: 'chave' });
      };
      pedido.onsuccess = () => {
        estado.banco = pedido.result;
        estado.banco.onversionchange = () => { try { estado.banco.close(); } catch (_) {} estado.banco = null; };
        resolve(estado.banco);
      };
      pedido.onerror = () => reject(pedido.error || erro('sem-indexeddb'));
      pedido.onblocked = () => reject(erro('sem-indexeddb'));
    });
    return estado.promessaBanco;
  }

  function lerTodos(loja, indice, chave) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction(loja, 'readonly');
      const store = tx.objectStore(loja);
      const origem = indice ? store.index(indice) : store;
      const pedido = indice ? origem.getAll(chave) : origem.getAll();
      let resultado = [];
      pedido.onsuccess = () => { resultado = Array.isArray(pedido.result) ? pedido.result : []; };
      pedido.onerror = () => reject(pedido.error || erro('sem-indexeddb'));
      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function lerUm(loja, chave) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction(loja, 'readonly');
      const pedido = tx.objectStore(loja).get(chave);
      let resultado = null;
      pedido.onsuccess = () => { resultado = pedido.result || null; };
      pedido.onerror = () => reject(pedido.error || erro('sem-indexeddb'));
      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function gravar(loja, registro) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction(loja, 'readwrite');
      tx.objectStore(loja).put(registro);
      tx.oncomplete = () => resolve(registro);
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function arquivoAindaIgual(persistido, anterior) {
    return !!persistido && !estaNaLixeira(persistido) &&
      persistido.id === anterior.id && persistido.projetoId === anterior.projetoId &&
      persistido.nome === anterior.nome && persistido.conteudo === anterior.conteudo &&
      bytesRegistro(persistido) === bytesRegistro(anterior) &&
      Number(persistido.versao || 1) === Number(anterior.versao || 1) &&
      persistido.atualizadoEm === anterior.atualizadoEm;
  }
  function gravarArquivoComRevisao(arquivo, anterior, plano) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      // A leitura e a escrita dividem a mesma transação readwrite: assim duas
      // guias atuais não passam pela mesma versão e gravam uma sobre a outra.
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
      const projetos = tx.objectStore(LOJAS.projetos);
      const arquivos = tx.objectStore(LOJAS.arquivos);
      const revisoes = tx.objectStore(LOJAS.revisoes);
      let resultado = { conflito: false, arquivo: null, projeto: null };
      const leituraArquivo = arquivos.get(anterior.id);
      leituraArquivo.onsuccess = () => {
        const persistido = leituraArquivo.result || null;
        if (!arquivoAindaIgual(persistido, anterior)) {
          resultado = { conflito: true, arquivo: null, projeto: null };
          return;
        }
        const leituraProjeto = projetos.get(anterior.projetoId);
        leituraProjeto.onsuccess = () => {
          const projetoPersistido = leituraProjeto.result || null;
          if (!projetoPersistido || estaNaLixeira(projetoPersistido)) {
            resultado = { conflito: true, arquivo: null, projeto: null };
            return;
          }
          const projetoAtualizado = Object.assign({}, projetoPersistido, { atualizadoEm: arquivo.atualizadoEm });
          arquivos.put(arquivo);
          projetos.put(projetoAtualizado);
          (plano.removerRevisoes || []).forEach((revisao) => revisoes.delete(revisao.id));
          if (plano.guardarRevisao && anterior.conteudo !== arquivo.conteudo) {
            revisoes.put({
              id: idNovo('rev'), arquivoId: anterior.id, conteudo: anterior.conteudo,
              bytes: bytes(anterior.conteudo), quando: anterior.atualizadoEm, versao: anterior.versao
            });
          }
          resultado = { conflito: false, arquivo, projeto: projetoAtualizado };
        };
        leituraProjeto.onerror = () => reject(leituraProjeto.error || erro('sem-indexeddb'));
      };
      leituraArquivo.onerror = () => reject(leituraArquivo.error || erro('sem-indexeddb'));
      tx.oncomplete = () => resolve(resultado);
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function gravarLote(projetos, arquivos) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos], 'readwrite');
      const lojaProjetos = tx.objectStore(LOJAS.projetos);
      const lojaArquivos = tx.objectStore(LOJAS.arquivos);
      projetos.forEach((projeto) => lojaProjetos.put(projeto));
      arquivos.forEach((arquivo) => lojaArquivos.put(arquivo));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function gravarCopiaConflito(copia) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos], 'readwrite');
      const projetos = tx.objectStore(LOJAS.projetos);
      const arquivos = tx.objectStore(LOJAS.arquivos);
      let gravada = false;
      const leituraProjeto = projetos.get(copia.projetoId);
      leituraProjeto.onsuccess = () => {
        const projeto = leituraProjeto.result || null;
        if (!projeto || estaNaLixeira(projeto)) return;
        arquivos.put(copia);
        projetos.put(Object.assign({}, projeto, { atualizadoEm: copia.atualizadoEm }));
        gravada = true;
      };
      leituraProjeto.onerror = () => reject(leituraProjeto.error || erro('sem-indexeddb'));
      tx.oncomplete = () => resolve(gravada);
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function guardarMeta(chave, valor) { return gravar(LOJAS.meta, { chave, valor }); }

  function projetoAtivo() { return estado.projetos.find((p) => p.id === estado.projetoAtivo) || null; }
  function arquivoAtivo() { return estado.arquivos.find((a) => a.id === estado.arquivoAtivo) || null; }
  function arquivosDoProjeto(id) { return estado.arquivos.filter((a) => a.projetoId === id); }
  function medirOcupacao(arquivos, revisoes) {
    return (arquivos || []).reduce((total, arquivo) => total + bytesRegistro(arquivo), 0) +
      (revisoes || []).reduce((total, revisao) => total + bytesRegistro(revisao), 0);
  }
  function contarRaizesLixeira(projetos, arquivos) {
    return (projetos || []).filter((projeto) => estaNaLixeira(projeto) && projeto.lixeiraRaiz === 'projeto').length +
      (arquivos || []).filter((arquivo) => estaNaLixeira(arquivo) && arquivo.lixeiraRaiz === 'arquivo').length;
  }
  async function atualizarOcupacao() {
    const [projetos, arquivos, revisoes] = await Promise.all([lerTodos(LOJAS.projetos), lerTodos(LOJAS.arquivos), lerTodos(LOJAS.revisoes)]);
    estado.bytesOcupados = medirOcupacao(arquivos, revisoes);
    estado.itensLixeira = contarRaizesLixeira(projetos, arquivos);
    return { projetos, arquivos, revisoes };
  }
  async function planejarArmazenamentoParaSalvar(anterior, atualizado) {
    const revisoes = await lerTodos(LOJAS.revisoes);
    const remover = new Map();
    let ocupacao = Math.max(0, Number(estado.bytesOcupados) || 0) - bytesRegistro(anterior) + bytesRegistro(atualizado);
    const marcarRemocao = (revisao) => {
      if (!revisao || remover.has(revisao.id)) return;
      remover.set(revisao.id, revisao);
      ocupacao = Math.max(0, ocupacao - bytesRegistro(revisao));
    };
    const antigasPrimeiro = (lista) => lista.slice().sort((a, b) =>
      texto(a.quando).localeCompare(texto(b.quando)) || texto(a.id).localeCompare(texto(b.id)));
    const mudouConteudo = anterior.conteudo !== atualizado.conteudo;
    const desteArquivo = antigasPrimeiro(revisoes.filter((revisao) => revisao.arquivoId === anterior.id));
    const excessoPorArquivo = Math.max(0, desteArquivo.length + (mudouConteudo ? 1 : 0) - LIMITES.revisoesPorArquivo);
    desteArquivo.slice(0, excessoPorArquivo).forEach(marcarRemocao);
    antigasPrimeiro(revisoes).forEach((revisao) => {
      if (ocupacao > LIMITES.totalBytes) marcarRemocao(revisao);
    });
    if (ocupacao > LIMITES.totalBytes) throw erro('workspace-cheio');
    let guardarRevisao = mudouConteudo;
    if (guardarRevisao) {
      const custoRevisao = bytes(anterior.conteudo);
      antigasPrimeiro(revisoes).forEach((revisao) => {
        if (ocupacao + custoRevisao > LIMITES.totalBytes) marcarRemocao(revisao);
      });
      if (ocupacao + custoRevisao <= LIMITES.totalBytes) ocupacao += custoRevisao;
      else guardarRevisao = false;
    }
    return { removerRevisoes: [...remover.values()], guardarRevisao, ocupacaoFinal: ocupacao };
  }

  function ordenarProjetos(lista) {
    return lista.slice().sort((a, b) => texto(b.atualizadoEm).localeCompare(texto(a.atualizadoEm)) || texto(a.nome).localeCompare(texto(b.nome), 'pt-BR'));
  }
  function ordenarArquivos(lista) {
    return lista.slice().sort((a, b) => texto(b.atualizadoEm).localeCompare(texto(a.atualizadoEm)) || texto(a.nome).localeCompare(texto(b.nome), 'pt-BR'));
  }
  async function guardarSelecao() {
    await guardarMeta('selecao', { projetoId: estado.projetoAtivo, arquivoId: estado.arquivoAtivo });
  }
  function nomeDisponivel(base, existentes) {
    const limpo = nomeSeguro(base, 50, 'Projeto sem nome');
    let tentativa = limpo;
    let n = 2;
    while (existentes.has(busca(tentativa))) {
      const sufixo = ' (' + n + ')';
      tentativa = limpo.slice(0, Math.max(1, 50 - sufixo.length)) + sufixo;
      n++;
    }
    existentes.add(busca(tentativa));
    return tentativa;
  }
  function nomeArquivoDisponivel(base, projetoId) {
    const usados = new Set(arquivosDoProjeto(projetoId).map((arquivo) => busca(arquivo.nome)));
    const limpo = nomeArquivoSeguro(base);
    if (!usados.has(busca(limpo))) return limpo;
    const ponto = limpo.lastIndexOf('.');
    const raiz = ponto > 0 ? limpo.slice(0, ponto) : limpo;
    const extensao = ponto > 0 ? limpo.slice(ponto) : '';
    let n = 2;
    let tentativa = limpo;
    while (usados.has(busca(tentativa))) {
      const sufixo = ' (' + n + ')';
      tentativa = raiz.slice(0, Math.max(1, 80 - extensao.length - sufixo.length)) + sufixo + extensao;
      n++;
    }
    return tentativa;
  }

  function definirStatus(tipo, mensagem) {
    if (!elementos || !elementos.status) return;
    elementos.status.className = 'workspace-status' + (tipo ? ' ' + tipo : '');
    elementos.status.textContent = mensagem || '';
  }
  function mostrarErro(e) { definirStatus('erro', mensagemErro(e)); }
  function atualizarResumo() {
    if (!elementos) return;
    elementos.resumo.textContent = estado.arquivos.length + '/' + LIMITES.arquivos + ' ativo(s) · ' + formatarBytes(estado.bytesOcupados) + '/' + formatarBytes(LIMITES.totalBytes) + ' usados';
  }
  function limpar(elemento) { while (elemento && elemento.firstChild) elemento.removeChild(elemento.firstChild); }
  function botao(textoBotao, classe, rotulo) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = classe || '';
    b.textContent = textoBotao;
    if (rotulo) b.setAttribute('aria-label', rotulo);
    return b;
  }

  function atualizarControlesProjetoPortatil() {
    if (!elementos) return;
    const indisponivel = !projetoAtivo() || estado.operacaoArquivoCompleto;
    if (elementos.exportarProjetoPortatil) elementos.exportarProjetoPortatil.disabled = indisponivel;
    if (elementos.restaurarProjetoPortatil) elementos.restaurarProjetoPortatil.disabled = estado.operacaoArquivoCompleto;
  }
  function buscaGlobalAtiva() {
    return !!(elementos && elementos.buscaGlobal && elementos.buscaGlobal.getAttribute('aria-pressed') === 'true');
  }
  function atualizarAjudaBuscaGlobal() {
    if (!elementos || !elementos.buscaArquivos || !elementos.ajudaBusca) return;
    const global = buscaGlobalAtiva();
    elementos.buscaArquivos.placeholder = global ? 'Buscar em todos os projetos…' : 'Buscar nome ou conteúdo…';
    elementos.buscaArquivos.setAttribute('aria-label', global ? 'Buscar arquivos ativos em todos os projetos locais' : 'Buscar arquivos no projeto atual');
    elementos.ajudaBusca.textContent = global
      ? 'A busca procura somente arquivos ativos em todos os projetos deste navegador; versões e Lixeira ficam fora.'
      : 'A busca fica no projeto atual. Ative Todos os projetos para localizar arquivos ativos em outro projeto.';
  }
  function alternarBuscaGlobal() {
    if (!elementos || estado.operacaoArquivoCompleto) return;
    const global = !buscaGlobalAtiva();
    elementos.buscaGlobal.setAttribute('aria-pressed', global ? 'true' : 'false');
    atualizarAjudaBuscaGlobal();
    renderArquivos();
    definirStatus('', global ? 'Busca em todos os projetos ativada somente neste navegador.' : 'Busca limitada ao projeto atual somente neste navegador.');
  }
  function renderProjetos() {
    if (!elementos) return;
    limpar(elementos.listaProjetos);
    const projetos = ordenarProjetos(estado.projetos);
    projetos.forEach((projeto) => {
      const item = botao('', 'workspace-item workspace-projeto', 'Abrir projeto: ' + projeto.nome);
      item.dataset.projetoId = projeto.id;
      item.setAttribute('aria-pressed', projeto.id === estado.projetoAtivo ? 'true' : 'false');
      const nome = document.createElement('strong');
      nome.textContent = projeto.nome;
      const meta = document.createElement('span');
      meta.textContent = arquivosDoProjeto(projeto.id).length + ' arquivo(s)';
      item.append(nome, meta);
      item.onclick = () => selecionarProjeto(projeto.id);
      elementos.listaProjetos.appendChild(item);
    });
    const projeto = projetoAtivo();
    elementos.nomeProjeto.value = projeto ? projeto.nome : '';
    elementos.renomearProjeto.disabled = !projeto || estado.operacaoArquivoCompleto;
    elementos.apagarProjeto.disabled = !projeto || estado.operacaoArquivoCompleto;
    atualizarControlesProjetoPortatil();
  }
  function renderArquivos() {
    if (!elementos) return;
    limpar(elementos.listaArquivos);
    const termo = busca(elementos.buscaArquivos.value);
    // O escopo global só entra quando há termo: sem ele a lista continua sendo
    // a do projeto atual, em vez de transformar a abertura em um catálogo amplo.
    const global = !!termo && buscaGlobalAtiva();
    const projetosPorId = new Map(estado.projetos.map((projeto) => [projeto.id, projeto]));
    const candidatos = global ? estado.arquivos.filter((arquivo) => projetosPorId.has(arquivo.projetoId)) : arquivosDoProjeto(estado.projetoAtivo);
    const arquivos = ordenarArquivos(candidatos).filter((arquivo) => {
      if (!termo) return true;
      return busca(arquivo.nome).includes(termo) || busca(arquivo.conteudo).includes(termo);
    });
    elementos.contadorArquivos.textContent = arquivos.length + (termo ? ' resultado(s)' + (global ? ' em todos os projetos' : ' neste projeto') : ' arquivo(s)');
    if (!arquivos.length) {
      const vazio = document.createElement('p');
      vazio.className = 'workspace-vazio';
      vazio.textContent = termo
        ? (global ? 'Nenhum arquivo ativo em seus projetos locais corresponde à busca.' : 'Nenhum arquivo local deste projeto corresponde à busca.')
        : 'Ainda não há arquivo neste projeto.';
      elementos.listaArquivos.appendChild(vazio);
    }
    arquivos.forEach((arquivo) => {
      const projeto = projetosPorId.get(arquivo.projetoId);
      const rotulo = global && projeto ? 'Abrir arquivo: ' + arquivo.nome + ' do projeto: ' + projeto.nome : 'Abrir arquivo: ' + arquivo.nome;
      const item = botao('', 'workspace-item workspace-arquivo', rotulo);
      item.dataset.arquivoId = arquivo.id;
      item.dataset.projetoId = arquivo.projetoId;
      item.setAttribute('aria-pressed', arquivo.id === estado.arquivoAtivo ? 'true' : 'false');
      const nome = document.createElement('strong');
      nome.textContent = arquivo.nome;
      const meta = document.createElement('span');
      meta.textContent = (global && projeto ? 'Projeto: ' + projeto.nome + ' · ' : '') + formatarBytes(arquivo.bytes) + ' · ' + formatarData(arquivo.atualizadoEm);
      item.append(nome, meta);
      item.onclick = () => selecionarArquivo(arquivo.id);
      elementos.listaArquivos.appendChild(item);
    });
  }
  function renderConflitoArquivo() {
    if (!elementos || !elementos.conflitoArquivo) return;
    const ativo = !!estado.conflitoArquivo;
    elementos.conflitoArquivo.classList.toggle('oculto', !ativo);
    elementos.baixarConflito.disabled = !ativo || estado.operacaoArquivoCompleto;
    elementos.copiarConflito.disabled = !ativo || estado.operacaoArquivoCompleto;
    elementos.recarregarConflito.disabled = !ativo || estado.operacaoArquivoCompleto;
  }
  function atualizarControlesEditor(ativo) {
    if (!elementos) return;
    const bloqueado = estado.operacaoArquivoCompleto;
    const conflito = !!estado.conflitoArquivo;
    // O texto continua editável/copíavel para que a pessoa não perca o rascunho,
    // mas gravar ou mover o registro original fica bloqueado até resolver.
    elementos.nomeArquivo.disabled = !ativo || bloqueado;
    elementos.editor.disabled = !ativo || bloqueado;
    elementos.salvar.disabled = !ativo || estado.salvando || bloqueado || conflito;
    elementos.apagarArquivo.disabled = !ativo || estado.salvando || bloqueado || conflito;
    elementos.copiar.disabled = !ativo || estado.salvando || bloqueado;
    elementos.levarAoChat.disabled = !ativo || estado.salvando || bloqueado;
    renderConflitoArquivo();
  }
  function renderEditor() {
    if (!elementos) return;
    const arquivo = arquivoAtivo();
    const ativo = !!arquivo;
    atualizarControlesEditor(ativo);
    elementos.revisoes.classList.toggle('oculto', !ativo);
    if (!ativo) {
      elementos.nomeArquivo.value = '';
      elementos.editor.value = '';
      elementos.tituloEditor.textContent = 'Escolha ou crie um arquivo';
      elementos.metaEditor.textContent = 'O conteúdo do Workspace fica somente neste navegador.';
      limpar(elementos.listaRevisoes);
      return;
    }
    elementos.nomeArquivo.value = arquivo.nome;
    elementos.editor.value = arquivo.conteudo;
    elementos.tituloEditor.textContent = arquivo.nome;
    elementos.metaEditor.textContent = formatarBytes(arquivo.bytes) + ' · salvo localmente em ' + formatarData(arquivo.atualizadoEm) + ' · versão ' + arquivo.versao;
    renderRevisoes(arquivo.id);
  }
  async function renderRevisoes(idArquivo) {
    if (!elementos) return;
    limpar(elementos.listaRevisoes);
    try {
      const revisoes = (await lerTodos(LOJAS.revisoes, 'arquivoId', idArquivo)).sort((a, b) => texto(b.quando).localeCompare(texto(a.quando))).slice(0, LIMITES.revisoesPorArquivo);
      if (idArquivo !== estado.arquivoAtivo) return;
      if (!revisoes.length) {
        const vazio = document.createElement('span');
        vazio.className = 'workspace-meta-pequena';
        vazio.textContent = 'As versões anteriores aparecerão aqui quando você alterar o conteúdo.';
        elementos.listaRevisoes.appendChild(vazio);
        return;
      }
      revisoes.forEach((revisao) => {
        const item = botao('Restaurar versão ' + revisao.versao + ' · ' + formatarData(revisao.quando), 'workspace-revisao', 'Restaurar versão local ' + revisao.versao);
        item.onclick = () => restaurarRevisao(revisao);
        elementos.listaRevisoes.appendChild(item);
      });
    } catch (_) {
      if (idArquivo === estado.arquivoAtivo) definirStatus('erro', 'Não consegui ler o histórico local deste arquivo. O conteúdo atual não foi enviado.');
    }
  }
  async function renderLixeira() {
    if (!elementos || !elementos.listaLixeira) return;
    const versaoRender = ++estado.lixeiraRenderizacao;
    try {
      const [projetos, arquivos] = await Promise.all([lerTodos(LOJAS.projetos), lerTodos(LOJAS.arquivos)]);
      if (!elementos || versaoRender !== estado.lixeiraRenderizacao) return;
      const raizes = [
        ...projetos.filter((projeto) => estaNaLixeira(projeto) && projeto.lixeiraRaiz === 'projeto').map((projeto) => ({ tipo: 'projeto', item: projeto })),
        ...arquivos.filter((arquivo) => estaNaLixeira(arquivo) && arquivo.lixeiraRaiz === 'arquivo').map((arquivo) => ({ tipo: 'arquivo', item: arquivo }))
      ].sort((a, b) => texto(b.item.lixeiraEm).localeCompare(texto(a.item.lixeiraEm)) || texto(a.item.nome).localeCompare(texto(b.item.nome), 'pt-BR'));
      estado.itensLixeira = raizes.length;
      elementos.contadorLixeira.textContent = raizes.length ? '(' + raizes.length + ')' : '(vazia)';
      elementos.esvaziarLixeira.disabled = !raizes.length || estado.operacaoLixeira || estado.operacaoArquivoCompleto;
      limpar(elementos.listaLixeira);
      if (!raizes.length) {
        const vazio = document.createElement('p');
        vazio.className = 'workspace-vazio';
        vazio.textContent = 'Nenhum arquivo ou projeto aguarda recuperação local.';
        elementos.listaLixeira.appendChild(vazio);
        return;
      }
      raizes.forEach(({ tipo, item }) => {
        const linha = document.createElement('div');
        linha.className = 'workspace-lixeira-item';
        const textoItem = document.createElement('div');
        const nome = document.createElement('strong');
        nome.textContent = item.nome;
        const meta = document.createElement('span');
        meta.textContent = (tipo === 'projeto' ? 'Projeto' : 'Arquivo') + ' · movido em ' + formatarData(item.lixeiraEm);
        textoItem.append(nome, meta);
        const acoes = document.createElement('div');
        acoes.className = 'workspace-lixeira-acoes';
        const restaurar = botao('Restaurar', '', 'Restaurar ' + (tipo === 'projeto' ? 'projeto' : 'arquivo') + ' local ' + item.nome);
        restaurar.disabled = estado.operacaoLixeira || estado.operacaoArquivoCompleto;
        restaurar.onclick = () => restaurarDaLixeira(tipo, item.id);
        const descartar = botao('Excluir de vez', 'workspace-perigo', 'Excluir definitivamente ' + (tipo === 'projeto' ? 'projeto' : 'arquivo') + ' local ' + item.nome);
        descartar.disabled = estado.operacaoLixeira || estado.operacaoArquivoCompleto;
        descartar.onclick = () => descartarDaLixeira(tipo, item.id);
        acoes.append(restaurar, descartar);
        linha.append(textoItem, acoes);
        elementos.listaLixeira.appendChild(linha);
      });
    } catch (_) {
      if (versaoRender === estado.lixeiraRenderizacao) definirStatus('erro', 'Não consegui ler a lixeira local. Nenhum dado foi enviado.');
    }
  }

  function renderTudo() {
    renderProjetos();
    renderArquivos();
    renderEditor();
    atualizarResumo();
    renderLixeira();
    if (estado.operacaoArquivoCompleto) bloquearOperacaoArquivoCompleto(true);
  }

  async function iniciarDados() {
    const [todosProjetos, todosArquivos, revisoes, selecao] = await Promise.all([
      lerTodos(LOJAS.projetos),
      lerTodos(LOJAS.arquivos),
      lerTodos(LOJAS.revisoes),
      lerUm(LOJAS.meta, 'selecao')
    ]);
    estado.projetos = todosProjetos.filter((projeto) => projeto && projeto.id && projeto.nome && !estaNaLixeira(projeto));
    estado.arquivos = todosArquivos.filter((arquivo) => arquivo && arquivo.id && arquivo.projetoId && typeof arquivo.conteudo === 'string' && !estaNaLixeira(arquivo));
    estado.bytesOcupados = medirOcupacao(todosArquivos, revisoes);
    estado.itensLixeira = contarRaizesLixeira(todosProjetos, todosArquivos);
    if (!estado.projetos.length) {
      const criado = { id: idNovo('projeto'), nome: 'Meu workspace', criadoEm: agora(), atualizadoEm: agora() };
      await gravar(LOJAS.projetos, criado);
      estado.projetos = [criado];
    }
    const preferencia = selecao && selecao.valor ? selecao.valor : null;
    estado.projetoAtivo = preferencia && estado.projetos.some((projeto) => projeto.id === preferencia.projetoId)
      ? preferencia.projetoId : ordenarProjetos(estado.projetos)[0].id;
    estado.arquivoAtivo = preferencia && estado.arquivos.some((arquivo) => arquivo.id === preferencia.arquivoId && arquivo.projetoId === estado.projetoAtivo)
      ? preferencia.arquivoId : '';
    await guardarSelecao();
  }

  async function criarProjeto() {
    try {
      if (estado.projetos.length >= LIMITES.projetos) throw erro('limite-projetos');
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      const existentes = new Set(estado.projetos.map((projeto) => busca(projeto.nome)));
      const nome = nomeDisponivel(elementos.novoProjeto.value || 'Novo projeto', existentes);
      const projeto = { id: idNovo('projeto'), nome, criadoEm: agora(), atualizadoEm: agora() };
      await gravar(LOJAS.projetos, projeto);
      estado.projetos.push(projeto);
      estado.projetoAtivo = projeto.id;
      estado.arquivoAtivo = '';
      elementos.novoProjeto.value = '';
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Projeto criado localmente. Nada foi enviado.');
      elementos.nomeProjeto.focus();
      elementos.nomeProjeto.select();
    } catch (e) { mostrarErro(e); }
  }
  async function selecionarProjeto(id) {
    if (!id || id === estado.projetoAtivo) return;
    try {
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      estado.projetoAtivo = id;
      estado.arquivoAtivo = '';
      await guardarSelecao();
      renderTudo();
    } catch (e) { mostrarErro(e); }
  }
  async function renomearProjeto() {
    const projeto = projetoAtivo();
    if (!projeto) return;
    try {
      const nome = nomeSeguro(elementos.nomeProjeto.value, 50, projeto.nome);
      if (busca(nome) !== busca(projeto.nome) && estado.projetos.some((outro) => outro.id !== projeto.id && busca(outro.nome) === busca(nome))) {
        elementos.nomeProjeto.value = projeto.nome;
        definirStatus('erro', 'Já existe um projeto local com esse nome.');
        return;
      }
      projeto.nome = nome;
      projeto.atualizadoEm = agora();
      await gravar(LOJAS.projetos, projeto);
      renderProjetos();
      definirStatus('ok', 'Nome do projeto atualizado somente neste navegador.');
    } catch (e) { mostrarErro(e); }
  }
  function registrarOperacaoLixeira(ocupada) {
    estado.operacaoLixeira = ocupada;
    renderLixeira();
  }
  async function apagarProjeto() {
    const projeto = projetoAtivo();
    if (!projeto) return;
    try {
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      if (!confirm('Mover o projeto local “' + projeto.nome + '” e seus arquivos para a lixeira? Nada será enviado. Você poderá restaurá-lo ou excluí-lo de vez depois.')) return;
      const quando = agora();
      const todosArquivos = await lerTodos(LOJAS.arquivos);
      const arquivos = todosArquivos.filter((arquivo) => arquivo.projetoId === projeto.id);
      const projetoLixeira = Object.assign({}, projeto, { lixeiraEm: quando, lixeiraRaiz: 'projeto', lixeiraProjetoId: projeto.id });
      const arquivosLixeira = arquivos.map((arquivo) => Object.assign({}, arquivo, { lixeiraEm: quando, lixeiraRaiz: '', lixeiraProjetoId: projeto.id }));
      await abrirBanco().then((banco) => new Promise((resolve, reject) => {
        const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos], 'readwrite');
        tx.objectStore(LOJAS.projetos).put(projetoLixeira);
        arquivosLixeira.forEach((arquivo) => tx.objectStore(LOJAS.arquivos).put(arquivo));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
        tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
      }));
      estado.projetos = estado.projetos.filter((item) => item.id !== projeto.id);
      estado.arquivos = estado.arquivos.filter((item) => item.projetoId !== projeto.id);
      if (!estado.projetos.length) {
        const padrao = { id: idNovo('projeto'), nome: 'Meu workspace', criadoEm: agora(), atualizadoEm: agora() };
        await gravar(LOJAS.projetos, padrao);
        estado.projetos = [padrao];
      }
      estado.projetoAtivo = ordenarProjetos(estado.projetos)[0].id;
      estado.arquivoAtivo = '';
      estado.alterado = false;
      await atualizarOcupacao();
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Projeto movido para a lixeira local. Nada foi enviado.');
    } catch (e) { mostrarErro(e); }
  }
  async function criarArquivo(nomeInicial, conteudoInicial) {
    try {
      const projeto = projetoAtivo();
      if (!projeto) return;
      if (estado.arquivos.length >= LIMITES.arquivos) throw erro('limite-arquivos');
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      const conteudo = texto(conteudoInicial);
      const tamanho = bytes(conteudo);
      if (tamanho > LIMITES.arquivoBytes) throw erro('arquivo-grande');
      if (estado.bytesOcupados + tamanho > LIMITES.totalBytes) throw erro('workspace-cheio');
      const arquivo = {
        id: idNovo('arquivo'), projetoId: projeto.id,
        nome: nomeArquivoDisponivel(nomeInicial || 'novo-arquivo.md', projeto.id),
        conteudo, bytes: tamanho, versao: 1, criadoEm: agora(), atualizadoEm: agora()
      };
      await gravar(LOJAS.arquivos, arquivo);
      projeto.atualizadoEm = agora();
      await gravar(LOJAS.projetos, projeto);
      estado.arquivos.push(arquivo);
      estado.bytesOcupados += tamanho;
      estado.arquivoAtivo = arquivo.id;
      estado.alterado = false;
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Arquivo criado localmente. Nada foi enviado.');
      elementos.nomeArquivo.focus();
      elementos.nomeArquivo.select();
    } catch (e) { mostrarErro(e); }
  }
  async function selecionarArquivo(id) {
    const proximo = estado.arquivos.find((arquivo) => arquivo.id === id) || null;
    const projeto = proximo && estado.projetos.find((candidato) => candidato.id === proximo.projetoId);
    if (!proximo || !projeto || (id === estado.arquivoAtivo && proximo.projetoId === estado.projetoAtivo)) return;
    try {
      // Um resultado global troca projeto e arquivo juntos somente depois de
      // preservar a edição atual; se o salvamento falhar, a seleção não muda.
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      estado.projetoAtivo = proximo.projetoId;
      estado.arquivoAtivo = proximo.id;
      estado.alterado = false;
      await guardarSelecao();
      renderTudo();
      elementos.editor.focus();
    } catch (e) { mostrarErro(e); }
  }
  function agendarSalvarAutomatico() {
    if (estado.temporizadorSalvar) clearTimeout(estado.temporizadorSalvar);
    estado.temporizadorSalvar = setTimeout(() => {
      estado.temporizadorSalvar = null;
      salvarArquivoAtual('automatico');
    }, 900);
  }
  function registrarConflitoArquivo(anterior) {
    if (estado.temporizadorSalvar) { clearTimeout(estado.temporizadorSalvar); estado.temporizadorSalvar = null; }
    estado.conflitoArquivo = { arquivoId: anterior.id, projetoId: anterior.projetoId };
    estado.alterado = true;
    atualizarControlesEditor(true);
    definirStatus('erro', 'Este arquivo mudou em outra guia. Seu texto continua no editor e nada foi substituído. Salve uma cópia, baixe o rascunho ou recarregue a versão salva.');
  }
  function nomeRascunhoConflito() {
    const original = nomeArquivoSeguro(elementos && elementos.nomeArquivo ? elementos.nomeArquivo.value : 'rascunho.txt');
    const ponto = original.lastIndexOf('.');
    const raiz = ponto > 0 ? original.slice(0, ponto) : original;
    const extensao = ponto > 0 ? original.slice(ponto) : '.txt';
    return raiz.slice(0, Math.max(1, 80 - extensao.length - 22)) + '-rascunho-conflito' + extensao;
  }
  function baixarRascunhoConflito() {
    if (!estado.conflitoArquivo || !elementos) return;
    baixar(texto(elementos.editor.value), nomeRascunhoConflito(), 'text/plain;charset=utf-8');
    definirStatus('ok', 'Seu rascunho em conflito foi baixado neste aparelho. Nada foi enviado pelo Chat.');
  }
  function nomeCopiaConflito(base, arquivos) {
    const limpo = nomeArquivoSeguro(base);
    const usados = new Set((arquivos || []).filter((arquivo) => !estaNaLixeira(arquivo)).map((arquivo) => busca(arquivo.nome)));
    const ponto = limpo.lastIndexOf('.');
    const raiz = ponto > 0 ? limpo.slice(0, ponto) : limpo;
    const extensao = ponto > 0 ? limpo.slice(ponto) : '';
    let n = 1;
    let tentativa = limpo;
    do {
      const sufixo = n === 1 ? ' (minha cópia)' : ' (minha cópia ' + n + ')';
      tentativa = raiz.slice(0, Math.max(1, 80 - extensao.length - sufixo.length)) + sufixo + extensao;
      n++;
    } while (usados.has(busca(tentativa)));
    return tentativa;
  }
  async function salvarConflitoComoCopia() {
    const conflito = estado.conflitoArquivo;
    if (!conflito || !elementos || estado.operacaoArquivoCompleto) return;
    try {
      const [arquivos, revisoes] = await Promise.all([lerTodos(LOJAS.arquivos), lerTodos(LOJAS.revisoes)]);
      const conteudo = texto(elementos.editor.value);
      const tamanho = bytes(conteudo);
      if (tamanho > LIMITES.arquivoBytes) throw erro('arquivo-grande');
      if (arquivos.filter((arquivo) => !estaNaLixeira(arquivo)).length >= LIMITES.arquivos) throw erro('limite-arquivos');
      if (medirOcupacao(arquivos, revisoes) + tamanho > LIMITES.totalBytes) throw erro('workspace-cheio');
      const quando = agora();
      const copia = {
        id: idNovo('arquivo'), projetoId: conflito.projetoId,
        nome: nomeCopiaConflito(elementos.nomeArquivo.value, arquivos.filter((arquivo) => arquivo.projetoId === conflito.projetoId)),
        conteudo, bytes: tamanho, versao: 1, criadoEm: quando, atualizadoEm: quando
      };
      if (!(await gravarCopiaConflito(copia))) throw erro('projeto-ausente');
      if (estado.temporizadorSalvar) { clearTimeout(estado.temporizadorSalvar); estado.temporizadorSalvar = null; }
      estado.edicao++;
      await iniciarDados();
      estado.projetoAtivo = copia.projetoId;
      estado.arquivoAtivo = copia.id;
      estado.conflitoArquivo = null;
      estado.alterado = false;
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Seu texto foi salvo como “' + copia.nome + '” somente neste navegador. O arquivo original não foi substituído.');
      elementos.editor.focus();
    } catch (e) { mostrarErro(e); }
  }
  async function recarregarArquivoConflito() {
    const conflito = estado.conflitoArquivo;
    if (!conflito || !elementos || estado.operacaoArquivoCompleto) return;
    if (!confirm('Recarregar a versão salva deste arquivo? O texto que ficou neste editor será descartado. Baixe ou salve uma cópia antes se quiser mantê-lo. Nada será enviado.')) {
      definirStatus('', 'Conflito mantido: seu texto continua no editor. Nada foi alterado.');
      return;
    }
    try {
      if (estado.temporizadorSalvar) { clearTimeout(estado.temporizadorSalvar); estado.temporizadorSalvar = null; }
      estado.edicao++;
      await iniciarDados();
      const recarregado = estado.arquivos.find((arquivo) => arquivo.id === conflito.arquivoId) || null;
      if (recarregado) {
        estado.projetoAtivo = recarregado.projetoId;
        estado.arquivoAtivo = recarregado.id;
      }
      estado.conflitoArquivo = null;
      estado.alterado = false;
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', recarregado
        ? 'Versão salva recarregada somente neste navegador. O rascunho em conflito foi descartado por sua escolha.'
        : 'O arquivo não está mais ativo neste navegador. O rascunho em conflito foi descartado por sua escolha.');
      if (recarregado) elementos.editor.focus();
    } catch (e) { mostrarErro(e); }
  }
  function marcarAlterado() {
    if (!arquivoAtivo()) return;
    estado.alterado = true;
    estado.edicao++;
    if (estado.conflitoArquivo) {
      definirStatus('erro', 'Este arquivo mudou em outra guia. Seu texto continua no editor; salve uma cópia, baixe o rascunho ou recarregue a versão salva.');
      return;
    }
    definirStatus('', 'Alterações pendentes: o Workspace vai salvar apenas neste navegador.');
    agendarSalvarAutomatico();
  }
  async function salvarArquivoAtual(origem) {
    const anterior = arquivoAtivo();
    if (!anterior) { if (origem !== 'automatico') mostrarErro(erro('sem-arquivo')); return false; }
    if (estado.conflitoArquivo) {
      atualizarControlesEditor(true);
      if (origem !== 'automatico') definirStatus('erro', 'Este arquivo mudou em outra guia. Resolva o conflito antes de salvar o original.');
      return false;
    }
    if (estado.salvando) return false;
    const edicaoNoInicio = estado.edicao;
    let houveEdicaoDurante = false;
    try {
      const nome = nomeArquivoSeguro(elementos.nomeArquivo.value);
      const conteudo = texto(elementos.editor.value);
      const tamanho = bytes(conteudo);
      if (tamanho > LIMITES.arquivoBytes) throw erro('arquivo-grande');
      if (busca(nome) !== busca(anterior.nome) && arquivosDoProjeto(anterior.projetoId).some((outro) => outro.id !== anterior.id && busca(outro.nome) === busca(nome))) {
        definirStatus('erro', 'Já existe um arquivo local com esse nome neste projeto.');
        return false;
      }
      const mudou = anterior.nome !== nome || anterior.conteudo !== conteudo;
      if (!mudou) {
        estado.alterado = false;
        if (origem !== 'automatico') definirStatus('ok', 'Já estava salvo somente neste navegador.');
        return true;
      }
      estado.salvando = true;
      atualizarControlesEditor(true);
      const atualizado = Object.assign({}, anterior, { nome, conteudo, bytes: tamanho, versao: Number(anterior.versao || 1) + 1, atualizadoEm: agora() });
      const plano = await planejarArmazenamentoParaSalvar(anterior, atualizado);
      const resultado = await gravarArquivoComRevisao(atualizado, anterior, plano);
      if (resultado.conflito) {
        registrarConflitoArquivo(anterior);
        return false;
      }
      estado.bytesOcupados = plano.ocupacaoFinal;
      estado.arquivos = estado.arquivos.map((arquivo) => arquivo.id === atualizado.id ? atualizado : arquivo);
      if (resultado.projeto) estado.projetos = estado.projetos.map((projeto) => projeto.id === resultado.projeto.id ? resultado.projeto : projeto);
      houveEdicaoDurante = estado.edicao !== edicaoNoInicio;
      if (!houveEdicaoDurante) {
        estado.alterado = false;
        renderTudo();
        const historicoLimitado = plano.removerRevisoes.length || (anterior.conteudo !== atualizado.conteudo && !plano.guardarRevisao);
        definirStatus('ok', historicoLimitado ? 'Arquivo salvo localmente; versões antigas foram reduzidas para respeitar o limite de espaço.' : (origem === 'automatico' ? 'Salvo localmente neste navegador.' : 'Arquivo salvo localmente. Nada foi enviado.'));
      } else {
        estado.alterado = true;
        renderProjetos();
        renderArquivos();
        atualizarResumo();
        definirStatus('', 'Novas alterações ainda estão pendentes e serão salvas somente neste navegador.');
      }
      return !houveEdicaoDurante;
    } catch (e) {
      if (origem !== 'automatico') mostrarErro(e);
      else definirStatus('erro', mensagemErro(e));
      return false;
    } finally {
      estado.salvando = false;
      if (estado.alterado) {
        atualizarControlesEditor(!!arquivoAtivo());
        if (houveEdicaoDurante) agendarSalvarAutomatico();
      } else {
        renderEditor();
      }
      atualizarResumo();
    }
  }
  async function apagarArquivo() {
    const arquivo = arquivoAtivo();
    if (!arquivo) return;
    try {
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      if (!confirm('Mover o arquivo local “' + arquivo.nome + '” para a lixeira? As versões locais serão preservadas para recuperação. Nada será enviado.')) return;
      const lixeira = Object.assign({}, arquivo, { lixeiraEm: agora(), lixeiraRaiz: 'arquivo', lixeiraProjetoId: arquivo.projetoId });
      await gravar(LOJAS.arquivos, lixeira);
      estado.arquivos = estado.arquivos.filter((item) => item.id !== arquivo.id);
      estado.arquivoAtivo = '';
      estado.alterado = false;
      estado.itensLixeira++;
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Arquivo movido para a lixeira local. Nada foi enviado.');
    } catch (e) { mostrarErro(e); }
  }
  async function restaurarProjetoDaLixeira(id) {
    const [todosProjetos, todosArquivos] = await Promise.all([lerTodos(LOJAS.projetos), lerTodos(LOJAS.arquivos)]);
    const projeto = todosProjetos.find((item) => item.id === id && estaNaLixeira(item) && item.lixeiraRaiz === 'projeto');
    if (!projeto) return;
    const arquivos = todosArquivos.filter((arquivo) => arquivo.projetoId === projeto.id && estaNaLixeira(arquivo) && arquivo.lixeiraProjetoId === projeto.id);
    if (estado.projetos.length >= LIMITES.projetos) throw erro('limite-projetos');
    if (estado.arquivos.length + arquivos.length > LIMITES.arquivos) throw erro('limite-arquivos');
    const nomes = new Set(estado.projetos.map((item) => busca(item.nome)));
    const restaurado = tirarDaLixeira(projeto);
    restaurado.nome = nomeDisponivel(restaurado.nome, nomes);
    restaurado.atualizadoEm = agora();
    const arquivosRestaurados = arquivos.map(tirarDaLixeira);
    await abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos], 'readwrite');
      tx.objectStore(LOJAS.projetos).put(restaurado);
      arquivosRestaurados.forEach((arquivo) => tx.objectStore(LOJAS.arquivos).put(arquivo));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
    estado.projetos.push(restaurado);
    estado.arquivos.push(...arquivosRestaurados);
    estado.projetoAtivo = restaurado.id;
    estado.arquivoAtivo = '';
    estado.itensLixeira = Math.max(0, estado.itensLixeira - 1);
    await guardarSelecao();
    renderTudo();
    definirStatus('ok', 'Projeto restaurado localmente' + (restaurado.nome !== projeto.nome ? ' com um nome disponível' : '') + '. Nada foi enviado.');
  }
  async function restaurarArquivoDaLixeira(id) {
    const arquivo = await lerUm(LOJAS.arquivos, id);
    if (!arquivo || !estaNaLixeira(arquivo) || arquivo.lixeiraRaiz !== 'arquivo') return;
    const projeto = estado.projetos.find((item) => item.id === arquivo.projetoId);
    if (!projeto) throw erro('projeto-ausente');
    if (estado.arquivos.length >= LIMITES.arquivos) throw erro('limite-arquivos');
    const restaurado = tirarDaLixeira(arquivo);
    restaurado.nome = nomeArquivoDisponivel(restaurado.nome, restaurado.projetoId);
    restaurado.atualizadoEm = agora();
    await gravar(LOJAS.arquivos, restaurado);
    estado.arquivos.push(restaurado);
    estado.projetoAtivo = restaurado.projetoId;
    estado.arquivoAtivo = restaurado.id;
    estado.itensLixeira = Math.max(0, estado.itensLixeira - 1);
    await guardarSelecao();
    renderTudo();
    definirStatus('ok', 'Arquivo restaurado localmente' + (restaurado.nome !== arquivo.nome ? ' com um nome disponível' : '') + '. Nada foi enviado.');
  }
  async function restaurarDaLixeira(tipo, id) {
    if (estado.operacaoLixeira) return;
    registrarOperacaoLixeira(true);
    try {
      if (tipo === 'projeto') await restaurarProjetoDaLixeira(id);
      else await restaurarArquivoDaLixeira(id);
    } catch (e) { mostrarErro(e); }
    finally { registrarOperacaoLixeira(false); }
  }
  async function apagarDefinitivamenteProjeto(id) {
    const [todosProjetos, todosArquivos] = await Promise.all([lerTodos(LOJAS.projetos), lerTodos(LOJAS.arquivos)]);
    const projeto = todosProjetos.find((item) => item.id === id && estaNaLixeira(item) && item.lixeiraRaiz === 'projeto');
    if (!projeto) return;
    const arquivos = todosArquivos.filter((arquivo) => arquivo.projetoId === id);
    const revisoes = [];
    for (const arquivo of arquivos) revisoes.push(...await lerTodos(LOJAS.revisoes, 'arquivoId', arquivo.id));
    await abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
      tx.objectStore(LOJAS.projetos).delete(projeto.id);
      arquivos.forEach((arquivo) => tx.objectStore(LOJAS.arquivos).delete(arquivo.id));
      revisoes.forEach((revisao) => tx.objectStore(LOJAS.revisoes).delete(revisao.id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  async function apagarDefinitivamenteArquivo(id) {
    const arquivo = await lerUm(LOJAS.arquivos, id);
    if (!arquivo || !estaNaLixeira(arquivo) || arquivo.lixeiraRaiz !== 'arquivo') return;
    const revisoes = await lerTodos(LOJAS.revisoes, 'arquivoId', arquivo.id);
    await abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
      tx.objectStore(LOJAS.arquivos).delete(arquivo.id);
      revisoes.forEach((revisao) => tx.objectStore(LOJAS.revisoes).delete(revisao.id));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  async function descartarDaLixeira(tipo, id) {
    if (estado.operacaoLixeira) return;
    const item = tipo === 'projeto' ? await lerUm(LOJAS.projetos, id) : await lerUm(LOJAS.arquivos, id);
    if (!item || !estaNaLixeira(item) || item.lixeiraRaiz !== tipo) return;
    if (!confirm('Excluir definitivamente ' + (tipo === 'projeto' ? 'o projeto' : 'o arquivo') + ' local “' + item.nome + '” e todas as versões dele? Isso não poderá ser desfeito neste navegador e nada será enviado.')) return;
    registrarOperacaoLixeira(true);
    try {
      if (tipo === 'projeto') await apagarDefinitivamenteProjeto(id);
      else await apagarDefinitivamenteArquivo(id);
      await atualizarOcupacao();
      renderTudo();
      definirStatus('ok', 'Item removido definitivamente apenas deste navegador. Nada foi enviado.');
    } catch (e) { mostrarErro(e); }
    finally { registrarOperacaoLixeira(false); }
  }
  async function esvaziarLixeira() {
    if (estado.operacaoLixeira || !estado.itensLixeira) return;
    if (!confirm('Esvaziar a lixeira local? Todos os projetos, arquivos e versões que estão nela serão excluídos definitivamente deste navegador. Isso não poderá ser desfeito e nada será enviado.')) return;
    registrarOperacaoLixeira(true);
    try {
      const [projetos, arquivos, revisoes] = await Promise.all([lerTodos(LOJAS.projetos), lerTodos(LOJAS.arquivos), lerTodos(LOJAS.revisoes)]);
      const projetosLixeira = projetos.filter(estaNaLixeira);
      const idsProjetosLixeira = new Set(projetosLixeira.map((projeto) => projeto.id));
      const arquivosLixeira = arquivos.filter((arquivo) => estaNaLixeira(arquivo) || idsProjetosLixeira.has(arquivo.projetoId));
      const idsArquivos = new Set(arquivosLixeira.map((arquivo) => arquivo.id));
      await abrirBanco().then((banco) => new Promise((resolve, reject) => {
        const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
        projetosLixeira.forEach((projeto) => tx.objectStore(LOJAS.projetos).delete(projeto.id));
        arquivosLixeira.forEach((arquivo) => tx.objectStore(LOJAS.arquivos).delete(arquivo.id));
        revisoes.filter((revisao) => idsArquivos.has(revisao.arquivoId)).forEach((revisao) => tx.objectStore(LOJAS.revisoes).delete(revisao.id));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
        tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
      }));
      await atualizarOcupacao();
      renderTudo();
      definirStatus('ok', 'Lixeira local esvaziada definitivamente. Nada foi enviado.');
    } catch (e) { mostrarErro(e); }
    finally { registrarOperacaoLixeira(false); }
  }
  async function restaurarRevisao(revisao) {
    if (!revisao || revisao.arquivoId !== estado.arquivoAtivo) return;
    if (!confirm('Colocar esta versão anterior no editor? O conteúdo atual continuará salvo até você confirmar Salvar.')) return;
    elementos.editor.value = texto(revisao.conteudo);
    marcarAlterado();
    definirStatus('', 'Versão anterior colocada no editor. Revise e salve quando quiser.');
    elementos.editor.focus();
  }

  function baixar(textoArquivo, nome, tipo) {
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([textoArquivo], { type: tipo }));
    link.download = nome;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 4000);
  }
  function marcaLixeiraParaArquivoCompleto(registro) {
    return {
      lixeiraEm: registro && registro.lixeiraEm ? texto(registro.lixeiraEm) : null,
      lixeiraRaiz: registro && (registro.lixeiraRaiz === 'projeto' || registro.lixeiraRaiz === 'arquivo') ? registro.lixeiraRaiz : null,
      lixeiraProjetoId: registro && registro.lixeiraProjetoId ? texto(registro.lixeiraProjetoId) : null
    };
  }
  function normalizarMarcaLixeiraArquivoCompleto(registro, tipo, id, projetoId) {
    const lixeiraEm = registro.lixeiraEm;
    const lixeiraRaiz = registro.lixeiraRaiz;
    const lixeiraProjetoId = registro.lixeiraProjetoId;
    if (lixeiraEm === null && lixeiraRaiz === null && lixeiraProjetoId === null) {
      return { lixeiraEm: null, lixeiraRaiz: null, lixeiraProjetoId: null };
    }
    const quando = dataEstrita(lixeiraEm);
    const raiz = lixeiraRaiz;
    const dono = textoEstrito(lixeiraProjetoId, 180);
    if (tipo === 'projeto') {
      if (raiz !== 'projeto' || dono !== id) throw erro('arquivo-completo-invalido');
    } else if ((raiz !== null && raiz !== 'arquivo') || dono !== projetoId) {
      throw erro('arquivo-completo-invalido');
    }
    return { lixeiraEm: quando, lixeiraRaiz: raiz, lixeiraProjetoId: dono };
  }
  function validarArquivoCompleto(dados, tamanho) {
    try {
      const chavesRaiz = ['formato', 'versao', 'exportadoEm', 'projetos', 'arquivos', 'revisoes'];
      const chavesProjeto = ['id', 'nome', 'criadoEm', 'atualizadoEm', 'lixeiraEm', 'lixeiraRaiz', 'lixeiraProjetoId'];
      const chavesArquivo = ['id', 'projetoId', 'nome', 'conteudo', 'bytes', 'versao', 'criadoEm', 'atualizadoEm', 'lixeiraEm', 'lixeiraRaiz', 'lixeiraProjetoId'];
      const chavesRevisao = ['id', 'arquivoId', 'conteudo', 'bytes', 'quando', 'versao'];
      const tamanhoNumero = tamanho;
      if (!Number.isSafeInteger(tamanhoNumero) || tamanhoNumero < 0) throw erro('arquivo-completo-invalido');
      if (tamanhoNumero > LIMITES_ARQUIVO_COMPLETO.bytes) throw erro('arquivo-completo-grande');
      if (!chavesExatas(dados, chavesRaiz) || dados.formato !== FORMATO_ARQUIVO_COMPLETO || dados.versao !== VERSAO_ARQUIVO_COMPLETO) throw erro('arquivo-completo-invalido');
      const exportadoEm = dataEstrita(dados.exportadoEm);
      if (!Array.isArray(dados.projetos) || !Array.isArray(dados.arquivos) || !Array.isArray(dados.revisoes)) throw erro('arquivo-completo-invalido');
      if (dados.projetos.length > LIMITES_ARQUIVO_COMPLETO.projetos || dados.arquivos.length > LIMITES_ARQUIVO_COMPLETO.arquivos || dados.revisoes.length > LIMITES_ARQUIVO_COMPLETO.revisoes) throw erro('arquivo-completo-excesso');
      const idsProjetos = new Set();
      const nomesProjetosAtivos = new Set();
      const projetos = dados.projetos.map((projeto) => {
        if (!chavesExatas(projeto, chavesProjeto)) throw erro('arquivo-completo-invalido');
        const id = idEstrito(projeto.id);
        const nome = textoEstrito(projeto.nome, 50);
        if (nomeSeguro(nome, 50, '') !== nome || idsProjetos.has(id)) throw erro('arquivo-completo-invalido');
        const marca = normalizarMarcaLixeiraArquivoCompleto(projeto, 'projeto', id, id);
        if (!marca.lixeiraEm) {
          const chaveNome = busca(nome);
          if (nomesProjetosAtivos.has(chaveNome)) throw erro('arquivo-completo-invalido');
          nomesProjetosAtivos.add(chaveNome);
        }
        idsProjetos.add(id);
        return Object.assign({ id, nome, criadoEm: dataEstrita(projeto.criadoEm), atualizadoEm: dataEstrita(projeto.atualizadoEm) }, marca);
      });
      const porProjeto = new Map(projetos.map((projeto) => [projeto.id, projeto]));
      const idsArquivos = new Set();
      const nomesArquivosAtivos = new Map();
      let arquivosAtivos = 0;
      const arquivos = dados.arquivos.map((arquivo) => {
        if (!chavesExatas(arquivo, chavesArquivo)) throw erro('arquivo-completo-invalido');
        const id = idEstrito(arquivo.id);
        const projetoId = idEstrito(arquivo.projetoId);
        const projeto = porProjeto.get(projetoId);
        const nome = textoEstrito(arquivo.nome, 80);
        const conteudo = arquivo.conteudo;
        if (!projeto || idsArquivos.has(id) || typeof conteudo !== 'string' || nomeArquivoSeguro(nome) !== nome) throw erro('arquivo-completo-invalido');
        const tamanhoConteudo = bytes(conteudo);
        if (!Number.isSafeInteger(arquivo.bytes) || arquivo.bytes !== tamanhoConteudo || tamanhoConteudo > LIMITES.arquivoBytes) throw erro('arquivo-completo-invalido');
        const marca = normalizarMarcaLixeiraArquivoCompleto(arquivo, 'arquivo', id, projetoId);
        if (marca.lixeiraEm && marca.lixeiraRaiz === null && (!projeto.lixeiraEm || marca.lixeiraEm !== projeto.lixeiraEm)) throw erro('arquivo-completo-invalido');
        if (marca.lixeiraEm && marca.lixeiraRaiz === 'arquivo' && projeto.lixeiraEm) throw erro('arquivo-completo-invalido');
        if (!marca.lixeiraEm && projeto.lixeiraEm) throw erro('arquivo-completo-invalido');
        if (!marca.lixeiraEm) {
          arquivosAtivos++;
          const nomes = nomesArquivosAtivos.get(projetoId) || new Set();
          const chaveNome = busca(nome);
          if (nomes.has(chaveNome)) throw erro('arquivo-completo-invalido');
          nomes.add(chaveNome);
          nomesArquivosAtivos.set(projetoId, nomes);
        }
        idsArquivos.add(id);
        return Object.assign({ id, projetoId, nome, conteudo, bytes: tamanhoConteudo, versao: inteiroEstrito(arquivo.versao), criadoEm: dataEstrita(arquivo.criadoEm), atualizadoEm: dataEstrita(arquivo.atualizadoEm) }, marca);
      });
      const projetosAtivos = projetos.filter((projeto) => !projeto.lixeiraEm).length;
      if (!projetosAtivos) throw erro('arquivo-completo-invalido');
      if (projetosAtivos > LIMITES.projetos || arquivosAtivos > LIMITES.arquivos) throw erro('arquivo-completo-excesso');
      const porArquivo = new Map(arquivos.map((arquivo) => [arquivo.id, arquivo]));
      const idsRevisoes = new Set();
      const revisoesPorArquivo = new Map();
      const versoesRevisaoPorArquivo = new Map();
      const revisoes = dados.revisoes.map((revisao) => {
        if (!chavesExatas(revisao, chavesRevisao)) throw erro('arquivo-completo-invalido');
        const id = idEstrito(revisao.id);
        const arquivoId = idEstrito(revisao.arquivoId);
        const conteudo = revisao.conteudo;
        const arquivo = porArquivo.get(arquivoId);
        if (!arquivo || idsRevisoes.has(id) || typeof conteudo !== 'string') throw erro('arquivo-completo-invalido');
        const tamanhoConteudo = bytes(conteudo);
        if (!Number.isSafeInteger(revisao.bytes) || revisao.bytes !== tamanhoConteudo || tamanhoConteudo > LIMITES.arquivoBytes) throw erro('arquivo-completo-invalido');
        const versao = inteiroEstrito(revisao.versao);
        const versoesArquivo = versoesRevisaoPorArquivo.get(arquivoId) || new Set();
        if (versao >= arquivo.versao || versoesArquivo.has(versao)) throw erro('arquivo-completo-invalido');
        versoesArquivo.add(versao);
        versoesRevisaoPorArquivo.set(arquivoId, versoesArquivo);
        const totalArquivo = (revisoesPorArquivo.get(arquivoId) || 0) + 1;
        if (totalArquivo > LIMITES.revisoesPorArquivo) throw erro('arquivo-completo-excesso');
        revisoesPorArquivo.set(arquivoId, totalArquivo);
        idsRevisoes.add(id);
        return { id, arquivoId, conteudo, bytes: tamanhoConteudo, quando: dataEstrita(revisao.quando), versao };
      });
      const total = arquivos.reduce((soma, arquivo) => soma + arquivo.bytes, 0) + revisoes.reduce((soma, revisao) => soma + revisao.bytes, 0);
      if (total > LIMITES.totalBytes) throw erro('workspace-cheio');
      return { formato: FORMATO_ARQUIVO_COMPLETO, versao: VERSAO_ARQUIVO_COMPLETO, exportadoEm, projetos, arquivos, revisoes };
    } catch (causa) {
      if (causa && ['arquivo-completo-invalido', 'arquivo-completo-grande', 'arquivo-completo-excesso', 'workspace-cheio'].includes(causa.codigoWorkspace)) throw causa;
      throw erro('arquivo-completo-invalido');
    }
  }
  function registroArquivoCompletoParaBanco(registro) {
    const salvo = Object.assign({}, registro);
    if (!salvo.lixeiraEm) {
      delete salvo.lixeiraEm;
      delete salvo.lixeiraRaiz;
      delete salvo.lixeiraProjetoId;
    } else if (salvo.lixeiraRaiz === null) {
      salvo.lixeiraRaiz = '';
    }
    return salvo;
  }
  async function montarArquivoCompleto() {
    const [projetos, arquivos, revisoes] = await Promise.all([lerTodos(LOJAS.projetos), lerTodos(LOJAS.arquivos), lerTodos(LOJAS.revisoes)]);
    const dados = {
      formato: FORMATO_ARQUIVO_COMPLETO,
      versao: VERSAO_ARQUIVO_COMPLETO,
      exportadoEm: agora(),
      projetos: projetos.sort((a, b) => texto(a.id).localeCompare(texto(b.id))).map((projeto) => Object.assign({
        id: texto(projeto.id), nome: texto(projeto.nome), criadoEm: texto(projeto.criadoEm), atualizadoEm: texto(projeto.atualizadoEm)
      }, marcaLixeiraParaArquivoCompleto(projeto))),
      arquivos: arquivos.sort((a, b) => texto(a.id).localeCompare(texto(b.id))).map((arquivo) => Object.assign({
        id: texto(arquivo.id), projetoId: texto(arquivo.projetoId), nome: texto(arquivo.nome), conteudo: texto(arquivo.conteudo), bytes: bytes(arquivo.conteudo), versao: Number(arquivo.versao), criadoEm: texto(arquivo.criadoEm), atualizadoEm: texto(arquivo.atualizadoEm)
      }, marcaLixeiraParaArquivoCompleto(arquivo))),
      revisoes: revisoes.sort((a, b) => texto(a.id).localeCompare(texto(b.id))).map((revisao) => ({
        id: texto(revisao.id), arquivoId: texto(revisao.arquivoId), conteudo: texto(revisao.conteudo), bytes: bytes(revisao.conteudo), quando: texto(revisao.quando), versao: Number(revisao.versao)
      }))
    };
    const textoArquivo = JSON.stringify(dados);
    const valido = validarArquivoCompleto(dados, bytes(textoArquivo));
    const serializado = JSON.stringify(valido);
    if (bytes(serializado) > LIMITES_ARQUIVO_COMPLETO.bytes) throw erro('arquivo-completo-grande');
    return { dados: valido, texto: serializado };
  }
  function substituirArquivoCompleto(backup) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos, LOJAS.revisoes, LOJAS.meta], 'readwrite');
      const projetos = tx.objectStore(LOJAS.projetos);
      const arquivos = tx.objectStore(LOJAS.arquivos);
      const revisoes = tx.objectStore(LOJAS.revisoes);
      const meta = tx.objectStore(LOJAS.meta);
      projetos.clear();
      arquivos.clear();
      revisoes.clear();
      meta.clear();
      backup.projetos.forEach((projeto) => projetos.put(registroArquivoCompletoParaBanco(projeto)));
      backup.arquivos.forEach((arquivo) => arquivos.put(registroArquivoCompletoParaBanco(arquivo)));
      backup.revisoes.forEach((revisao) => revisoes.put(Object.assign({}, revisao)));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function atualizarControleReversaoArquivoCompleto() {
    if (!elementos || !elementos.desfazerArquivoCompleto) return;
    elementos.desfazerArquivoCompleto.disabled = estado.operacaoArquivoCompleto || !estado.reversaoArquivoCompleto;
  }
  function bloquearOperacaoArquivoCompleto(ocupada) {
    estado.operacaoArquivoCompleto = !!ocupada;
    if (!elementos) return;
    elementos.raiz.setAttribute('aria-busy', ocupada ? 'true' : 'false');
    const controles = [...elementos.raiz.querySelectorAll('button,input,textarea'), elementos.botaoAbrir].filter(Boolean);
    controles.forEach((controle) => {
      if (ocupada) {
        if (!Object.prototype.hasOwnProperty.call(controle.dataset, 'workspaceArquivoCompletoAntes')) {
          controle.dataset.workspaceArquivoCompletoAntes = controle.disabled ? '1' : '0';
        }
        controle.disabled = true;
      } else if (Object.prototype.hasOwnProperty.call(controle.dataset, 'workspaceArquivoCompletoAntes')) {
        controle.disabled = controle.dataset.workspaceArquivoCompletoAntes === '1';
        delete controle.dataset.workspaceArquivoCompletoAntes;
      }
    });
    if (!ocupada) {
      atualizarControleReversaoArquivoCompleto();
      atualizarControlesProjetoPortatil();
    }
  }
  function resumoArquivoCompleto(backup) {
    return backup.projetos.length + ' projeto(s), ' + backup.arquivos.length + ' arquivo(s) e ' + backup.revisoes.length + ' versão(ões)';
  }
  async function exportarArquivoCompleto() {
    if (estado.operacaoArquivoCompleto) return;
    bloquearOperacaoArquivoCompleto(true);
    try {
      if (estado.alterado && !(await salvarArquivoAtual('automatico'))) return;
      definirStatus('', 'Preparando o arquivo completo local do Workspace…');
      const arquivo = await montarArquivoCompleto();
      baixar(arquivo.texto, 'workspace-completo-rebocl-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
      definirStatus('ok', 'Arquivo completo de ' + resumoArquivoCompleto(arquivo.dados) + ' gerado neste aparelho. Ele inclui lixeira e versões locais e não foi enviado pelo Chat.');
    } catch (e) { mostrarErro(e); }
    finally { bloquearOperacaoArquivoCompleto(false); }
  }
  async function importarArquivoCompleto(file) {
    if (estado.operacaoArquivoCompleto) return;
    bloquearOperacaoArquivoCompleto(true);
    try {
      if (estado.alterado && !(await salvarArquivoAtual('automatico'))) return;
      const tamanho = Number(file && file.size);
      if (!file || typeof file.text !== 'function' || !Number.isFinite(tamanho) || tamanho < 0) throw erro('arquivo-completo-invalido');
      if (tamanho > LIMITES_ARQUIVO_COMPLETO.bytes) throw erro('arquivo-completo-grande');
      definirStatus('', 'Lendo e conferindo o arquivo completo neste navegador…');
      const conteudo = await file.text();
      if (bytes(conteudo) > LIMITES_ARQUIVO_COMPLETO.bytes) throw erro('arquivo-completo-grande');
      const backup = validarArquivoCompleto(JSON.parse(conteudo), bytes(conteudo));
      const resumo = resumoArquivoCompleto(backup);
      if (!confirm('Restaurar o arquivo completo com ' + resumo + '? Isso substituirá projetos, arquivos ativos, versões e lixeira deste navegador. Nada será enviado ao Chat, GitHub ou motor.')) {
        definirStatus('', 'Restauração do arquivo completo cancelada. Nada foi alterado.');
        return;
      }
      if (estado.temporizadorSalvar) { clearTimeout(estado.temporizadorSalvar); estado.temporizadorSalvar = null; }
      estado.edicao++;
      definirStatus('', 'Criando ponto temporário para desfazer esta restauração…');
      const pontoAnterior = await montarArquivoCompleto();
      definirStatus('', 'Restaurando o arquivo completo somente neste navegador…');
      await substituirArquivoCompleto(backup);
      estado.reversaoArquivoCompleto = pontoAnterior.dados;
      estado.alterado = false;
      estado.projetoAtivo = '';
      estado.arquivoAtivo = '';
      await iniciarDados();
      renderTudo();
      definirStatus('ok', 'Arquivo completo restaurado: ' + resumo + '. Você pode desfazer esta restauração enquanto esta página permanecer aberta. Nada foi enviado pelo Chat.');
    } catch (e) { mostrarErro(e); }
    finally { bloquearOperacaoArquivoCompleto(false); }
  }
  async function desfazerUltimaRestauracaoArquivoCompleto() {
    if (estado.operacaoArquivoCompleto) return;
    if (estado.salvando) {
      definirStatus('erro', 'Aguarde o salvamento local terminar antes de desfazer a restauração. Nada foi enviado.');
      return;
    }
    const ponto = estado.reversaoArquivoCompleto;
    if (!ponto) { mostrarErro(erro('sem-reversao-arquivo-completo')); return; }
    if (!confirm('Desfazer a última restauração completa? O Workspace voltará ao estado anterior desta página. Alterações feitas depois da restauração serão substituídas. Nada será enviado ao Chat, GitHub ou motor.')) {
      definirStatus('', 'Desfazer a restauração completa foi cancelado. Nada foi alterado.');
      return;
    }
    bloquearOperacaoArquivoCompleto(true);
    try {
      if (estado.temporizadorSalvar) { clearTimeout(estado.temporizadorSalvar); estado.temporizadorSalvar = null; }
      estado.edicao++;
      definirStatus('', 'Desfazendo a restauração completa somente neste navegador…');
      await substituirArquivoCompleto(ponto);
      estado.reversaoArquivoCompleto = null;
      estado.alterado = false;
      estado.projetoAtivo = '';
      estado.arquivoAtivo = '';
      await iniciarDados();
      renderTudo();
      definirStatus('ok', 'Última restauração completa desfeita neste navegador. O ponto temporário foi consumido e nada foi enviado pelo Chat.');
    } catch (e) { mostrarErro(e); }
    finally { bloquearOperacaoArquivoCompleto(false); }
  }

  function validarProjetoPortatil(dados, tamanho) {
    try {
      const chavesRaiz = ['formato', 'versao', 'exportadoEm', 'projeto', 'arquivos', 'revisoes'];
      const chavesProjeto = ['id', 'nome', 'criadoEm', 'atualizadoEm'];
      const chavesArquivo = ['id', 'projetoId', 'nome', 'conteudo', 'bytes', 'versao', 'criadoEm', 'atualizadoEm', 'lixeiraEm', 'lixeiraRaiz', 'lixeiraProjetoId'];
      const chavesRevisao = ['id', 'arquivoId', 'conteudo', 'bytes', 'quando', 'versao'];
      if (!Number.isSafeInteger(tamanho) || tamanho < 0) throw erro('projeto-portatil-invalido');
      if (tamanho > LIMITES_PROJETO_PORTATIL.bytes) throw erro('projeto-portatil-grande');
      if (!chavesExatas(dados, chavesRaiz) || dados.formato !== FORMATO_PROJETO_PORTATIL || dados.versao !== VERSAO_PROJETO_PORTATIL) throw erro('projeto-portatil-invalido');
      const exportadoEm = dataEstrita(dados.exportadoEm);
      if (!chavesExatas(dados.projeto, chavesProjeto) || !Array.isArray(dados.arquivos) || !Array.isArray(dados.revisoes)) throw erro('projeto-portatil-invalido');
      if (dados.arquivos.length > LIMITES_PROJETO_PORTATIL.arquivos || dados.revisoes.length > LIMITES_PROJETO_PORTATIL.revisoes) throw erro('projeto-portatil-excesso');
      const projeto = {
        id: idEstrito(dados.projeto.id),
        nome: textoEstrito(dados.projeto.nome, 50),
        criadoEm: dataEstrita(dados.projeto.criadoEm),
        atualizadoEm: dataEstrita(dados.projeto.atualizadoEm)
      };
      if (nomeSeguro(projeto.nome, 50, '') !== projeto.nome) throw erro('projeto-portatil-invalido');
      const idsArquivos = new Set();
      const nomesAtivos = new Set();
      let arquivosAtivos = 0;
      const arquivos = dados.arquivos.map((arquivo) => {
        if (!chavesExatas(arquivo, chavesArquivo)) throw erro('projeto-portatil-invalido');
        const id = idEstrito(arquivo.id);
        const projetoId = idEstrito(arquivo.projetoId);
        const nome = textoEstrito(arquivo.nome, 80);
        const conteudo = arquivo.conteudo;
        if (projetoId !== projeto.id || idsArquivos.has(id) || typeof conteudo !== 'string' || nomeArquivoSeguro(nome) !== nome) throw erro('projeto-portatil-invalido');
        const tamanhoConteudo = bytes(conteudo);
        if (!Number.isSafeInteger(arquivo.bytes) || arquivo.bytes !== tamanhoConteudo || tamanhoConteudo > LIMITES.arquivoBytes) throw erro('projeto-portatil-invalido');
        const marca = normalizarMarcaLixeiraArquivoCompleto(arquivo, 'arquivo', id, projeto.id);
        if (marca.lixeiraEm && marca.lixeiraRaiz !== 'arquivo') throw erro('projeto-portatil-invalido');
        if (!marca.lixeiraEm) {
          arquivosAtivos++;
          const chaveNome = busca(nome);
          if (nomesAtivos.has(chaveNome)) throw erro('projeto-portatil-invalido');
          nomesAtivos.add(chaveNome);
        }
        idsArquivos.add(id);
        return Object.assign({ id, projetoId, nome, conteudo, bytes: tamanhoConteudo, versao: inteiroEstrito(arquivo.versao), criadoEm: dataEstrita(arquivo.criadoEm), atualizadoEm: dataEstrita(arquivo.atualizadoEm) }, marca);
      });
      if (arquivosAtivos > LIMITES.arquivos) throw erro('projeto-portatil-excesso');
      const porArquivo = new Map(arquivos.map((arquivo) => [arquivo.id, arquivo]));
      const idsRevisoes = new Set();
      const revisoesPorArquivo = new Map();
      const versoesPorArquivo = new Map();
      const revisoes = dados.revisoes.map((revisao) => {
        if (!chavesExatas(revisao, chavesRevisao)) throw erro('projeto-portatil-invalido');
        const id = idEstrito(revisao.id);
        const arquivoId = idEstrito(revisao.arquivoId);
        const arquivo = porArquivo.get(arquivoId);
        const conteudo = revisao.conteudo;
        if (!arquivo || idsRevisoes.has(id) || typeof conteudo !== 'string') throw erro('projeto-portatil-invalido');
        const tamanhoConteudo = bytes(conteudo);
        if (!Number.isSafeInteger(revisao.bytes) || revisao.bytes !== tamanhoConteudo || tamanhoConteudo > LIMITES.arquivoBytes) throw erro('projeto-portatil-invalido');
        const versao = inteiroEstrito(revisao.versao);
        const versoes = versoesPorArquivo.get(arquivoId) || new Set();
        if (versao >= arquivo.versao || versoes.has(versao)) throw erro('projeto-portatil-invalido');
        versoes.add(versao);
        versoesPorArquivo.set(arquivoId, versoes);
        const totalArquivo = (revisoesPorArquivo.get(arquivoId) || 0) + 1;
        if (totalArquivo > LIMITES.revisoesPorArquivo) throw erro('projeto-portatil-excesso');
        revisoesPorArquivo.set(arquivoId, totalArquivo);
        idsRevisoes.add(id);
        return { id, arquivoId, conteudo, bytes: tamanhoConteudo, quando: dataEstrita(revisao.quando), versao };
      });
      const total = arquivos.reduce((soma, arquivo) => soma + arquivo.bytes, 0) + revisoes.reduce((soma, revisao) => soma + revisao.bytes, 0);
      if (total > LIMITES.totalBytes) throw erro('workspace-cheio');
      return { formato: FORMATO_PROJETO_PORTATIL, versao: VERSAO_PROJETO_PORTATIL, exportadoEm, projeto, arquivos, revisoes };
    } catch (causa) {
      if (causa && ['projeto-portatil-invalido', 'projeto-portatil-grande', 'projeto-portatil-excesso', 'workspace-cheio'].includes(causa.codigoWorkspace)) throw causa;
      throw erro('projeto-portatil-invalido');
    }
  }
  async function montarProjetoPortatil() {
    const projeto = projetoAtivo();
    if (!projeto) throw erro('sem-arquivo');
    const [todosArquivos, todasRevisoes] = await Promise.all([lerTodos(LOJAS.arquivos), lerTodos(LOJAS.revisoes)]);
    const arquivosDoProjetoPortatil = todosArquivos.filter((arquivo) => arquivo && arquivo.projetoId === projeto.id);
    const idsArquivos = new Set(arquivosDoProjetoPortatil.map((arquivo) => texto(arquivo.id)));
    const dados = {
      formato: FORMATO_PROJETO_PORTATIL,
      versao: VERSAO_PROJETO_PORTATIL,
      exportadoEm: agora(),
      projeto: { id: texto(projeto.id), nome: texto(projeto.nome), criadoEm: texto(projeto.criadoEm), atualizadoEm: texto(projeto.atualizadoEm) },
      arquivos: arquivosDoProjetoPortatil.sort((a, b) => texto(a.id).localeCompare(texto(b.id))).map((arquivo) => Object.assign({
        id: texto(arquivo.id), projetoId: texto(arquivo.projetoId), nome: texto(arquivo.nome), conteudo: texto(arquivo.conteudo), bytes: bytes(arquivo.conteudo), versao: Number(arquivo.versao), criadoEm: texto(arquivo.criadoEm), atualizadoEm: texto(arquivo.atualizadoEm)
      }, marcaLixeiraParaArquivoCompleto(arquivo))),
      revisoes: todasRevisoes.filter((revisao) => revisao && idsArquivos.has(texto(revisao.arquivoId))).sort((a, b) => texto(a.id).localeCompare(texto(b.id))).map((revisao) => ({
        id: texto(revisao.id), arquivoId: texto(revisao.arquivoId), conteudo: texto(revisao.conteudo), bytes: bytes(revisao.conteudo), quando: texto(revisao.quando), versao: Number(revisao.versao)
      }))
    };
    const textoArquivo = JSON.stringify(dados);
    const valido = validarProjetoPortatil(dados, bytes(textoArquivo));
    const serializado = JSON.stringify(valido);
    if (bytes(serializado) > LIMITES_PROJETO_PORTATIL.bytes) throw erro('projeto-portatil-grande');
    return { dados: valido, texto: serializado };
  }
  function resumoProjetoPortatil(backup) {
    const ativos = backup.arquivos.filter((arquivo) => !arquivo.lixeiraEm).length;
    const lixeira = backup.arquivos.length - ativos;
    return '“' + backup.projeto.nome + '” com ' + ativos + ' arquivo(s) ativo(s), ' + lixeira + ' na lixeira e ' + backup.revisoes.length + ' versão(ões)';
  }
  function validarCapacidadeProjetoPortatil(backup) {
    const ativos = backup.arquivos.filter((arquivo) => !arquivo.lixeiraEm).length;
    const bytesConteudo = backup.arquivos.reduce((soma, arquivo) => soma + arquivo.bytes, 0) + backup.revisoes.reduce((soma, revisao) => soma + revisao.bytes, 0);
    if (estado.projetos.length + 1 > LIMITES.projetos) throw erro('limite-projetos');
    if (estado.arquivos.length + ativos > LIMITES.arquivos) throw erro('limite-arquivos');
    if (estado.bytesOcupados + bytesConteudo > LIMITES.totalBytes) throw erro('workspace-cheio');
  }
  function prepararImportacaoProjetoPortatil(backup) {
    validarCapacidadeProjetoPortatil(backup);
    const existentes = new Set(estado.projetos.map((projeto) => busca(projeto.nome)));
    const quando = agora();
    const projeto = { id: idNovo('projeto'), nome: nomeDisponivel(backup.projeto.nome, existentes), criadoEm: backup.projeto.criadoEm, atualizadoEm: quando };
    const mapaArquivos = new Map();
    const arquivos = backup.arquivos.map((arquivo) => {
      const id = idNovo('arquivo');
      mapaArquivos.set(arquivo.id, id);
      const novo = { id, projetoId: projeto.id, nome: arquivo.nome, conteudo: arquivo.conteudo, bytes: arquivo.bytes, versao: arquivo.versao, criadoEm: arquivo.criadoEm, atualizadoEm: arquivo.atualizadoEm };
      if (arquivo.lixeiraEm) Object.assign(novo, { lixeiraEm: arquivo.lixeiraEm, lixeiraRaiz: 'arquivo', lixeiraProjetoId: projeto.id });
      return novo;
    });
    const revisoes = backup.revisoes.map((revisao) => ({ id: idNovo('rev'), arquivoId: mapaArquivos.get(revisao.arquivoId), conteudo: revisao.conteudo, bytes: revisao.bytes, quando: revisao.quando, versao: revisao.versao }));
    return { projeto, arquivos, revisoes };
  }
  function gravarProjetoPortatil(plano) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.projetos, LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
      tx.objectStore(LOJAS.projetos).put(plano.projeto);
      plano.arquivos.forEach((arquivo) => tx.objectStore(LOJAS.arquivos).put(arquivo));
      plano.revisoes.forEach((revisao) => tx.objectStore(LOJAS.revisoes).put(revisao));
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  async function exportarProjetoPortatil() {
    if (estado.operacaoArquivoCompleto) return;
    bloquearOperacaoArquivoCompleto(true);
    try {
      if (estado.alterado && !(await salvarArquivoAtual('automatico'))) return;
      definirStatus('', 'Preparando o projeto portátil somente neste navegador…');
      const arquivo = await montarProjetoPortatil();
      baixar(arquivo.texto, 'workspace-projeto-rebocl-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
      definirStatus('ok', 'Projeto portátil ' + resumoProjetoPortatil(arquivo.dados) + ' gerado neste aparelho. Ele não foi enviado pelo Chat.');
    } catch (e) { mostrarErro(e); }
    finally { bloquearOperacaoArquivoCompleto(false); }
  }
  async function importarProjetoPortatil(file) {
    if (estado.operacaoArquivoCompleto) return;
    bloquearOperacaoArquivoCompleto(true);
    try {
      if (estado.alterado && !(await salvarArquivoAtual('automatico'))) return;
      const tamanho = Number(file && file.size);
      if (!file || typeof file.text !== 'function' || !Number.isFinite(tamanho) || tamanho < 0) throw erro('projeto-portatil-invalido');
      if (tamanho > LIMITES_PROJETO_PORTATIL.bytes) throw erro('projeto-portatil-grande');
      definirStatus('', 'Lendo e conferindo o projeto portátil neste navegador…');
      const conteudo = await file.text();
      if (bytes(conteudo) > LIMITES_PROJETO_PORTATIL.bytes) throw erro('projeto-portatil-grande');
      const backup = validarProjetoPortatil(JSON.parse(conteudo), bytes(conteudo));
      validarCapacidadeProjetoPortatil(backup);
      const resumo = resumoProjetoPortatil(backup);
      if (!confirm('Adicionar o projeto portátil ' + resumo + '? Ele criará outro projeto local com arquivos, versões e lixeira; nada atual será substituído ou enviado.')) {
        definirStatus('', 'Importação do projeto portátil cancelada. Nada foi alterado.');
        return;
      }
      const plano = prepararImportacaoProjetoPortatil(backup);
      definirStatus('', 'Adicionando o projeto portátil somente neste navegador…');
      await gravarProjetoPortatil(plano);
      estado.projetos.push(plano.projeto);
      estado.arquivos.push(...plano.arquivos.filter((arquivo) => !estaNaLixeira(arquivo)));
      estado.projetoAtivo = plano.projeto.id;
      estado.arquivoAtivo = plano.arquivos.find((arquivo) => !estaNaLixeira(arquivo))?.id || '';
      estado.alterado = false;
      await atualizarOcupacao();
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Projeto portátil adicionado: ' + resumoProjetoPortatil(backup) + '. Nada foi enviado pelo Chat.');
    } catch (e) { mostrarErro(e); }
    finally { bloquearOperacaoArquivoCompleto(false); }
  }

  async function exportarWorkspace() {
    try {
      if (estado.alterado && !(await salvarArquivoAtual('automatico'))) return;
      const dados = {
        formato: FORMATO_EXPORTACAO,
        versao: VERSAO_EXPORTACAO,
        exportadoEm: agora(),
        projetos: estado.projetos.map((projeto) => ({ id: projeto.id, nome: projeto.nome, criadoEm: projeto.criadoEm, atualizadoEm: projeto.atualizadoEm })),
        arquivos: estado.arquivos.map((arquivo) => ({ projetoId: arquivo.projetoId, nome: arquivo.nome, conteudo: arquivo.conteudo, criadoEm: arquivo.criadoEm, atualizadoEm: arquivo.atualizadoEm }))
      };
      baixar(JSON.stringify(dados, null, 2), 'workspace-rebocl-' + new Date().toISOString().slice(0, 10) + '.json', 'application/json');
      definirStatus('ok', 'Backup gerado no seu aparelho. Ele não foi enviado pelo Chat.');
    } catch (e) { mostrarErro(e); }
  }
  function validarBackup(dados, tamanho) {
    if (!dados || typeof dados !== 'object' || Array.isArray(dados) || dados.formato !== FORMATO_EXPORTACAO || Number(dados.versao) !== VERSAO_EXPORTACAO) throw erro('backup-invalido');
    if (Number(tamanho) > LIMITES.importacaoBytes) throw erro('importacao-grande');
    if (!Array.isArray(dados.projetos) || !Array.isArray(dados.arquivos) || dados.projetos.length > LIMITES.projetos || dados.arquivos.length > LIMITES.arquivos) throw erro('backup-invalido');
    const ids = new Set();
    const projetos = dados.projetos.map((projeto) => {
      if (!projeto || typeof projeto !== 'object' || !texto(projeto.id)) throw erro('backup-invalido');
      ids.add(texto(projeto.id));
      return { id: texto(projeto.id), nome: nomeSeguro(projeto.nome, 50, 'Projeto importado') };
    });
    const arquivos = dados.arquivos.map((arquivo) => {
      if (!arquivo || typeof arquivo !== 'object' || !ids.has(texto(arquivo.projetoId)) || typeof arquivo.conteudo !== 'string') throw erro('backup-invalido');
      const tamanhoArquivo = bytes(arquivo.conteudo);
      if (tamanhoArquivo > LIMITES.arquivoBytes) throw erro('arquivo-grande');
      return { projetoId: texto(arquivo.projetoId), nome: nomeArquivoSeguro(arquivo.nome), conteudo: arquivo.conteudo, bytes: tamanhoArquivo };
    });
    const total = arquivos.reduce((soma, arquivo) => soma + arquivo.bytes, 0);
    if (total > LIMITES.totalBytes || estado.bytesOcupados + total > LIMITES.totalBytes) throw erro('workspace-cheio');
    if (estado.projetos.length + projetos.length > LIMITES.projetos || estado.arquivos.length + arquivos.length > LIMITES.arquivos) throw erro('limite-arquivos');
    return { projetos, arquivos };
  }
  async function importarBackup(dados, tamanho) {
    const valido = validarBackup(dados, tamanho);
    const existentes = new Set(estado.projetos.map((projeto) => busca(projeto.nome)));
    const mapaProjetos = new Map();
    const projetosNovos = valido.projetos.map((projeto) => {
      const novo = { id: idNovo('projeto'), nome: nomeDisponivel(projeto.nome, existentes), criadoEm: agora(), atualizadoEm: agora() };
      mapaProjetos.set(projeto.id, novo.id);
      return novo;
    });
    const nomesPorProjeto = new Map();
    const arquivosNovos = valido.arquivos.map((arquivo) => {
      const projetoId = mapaProjetos.get(arquivo.projetoId);
      const usados = nomesPorProjeto.get(projetoId) || new Set();
      let nome = arquivo.nome;
      let n = 2;
      const ponto = nome.lastIndexOf('.');
      const raiz = ponto > 0 ? nome.slice(0, ponto) : nome;
      const extensao = ponto > 0 ? nome.slice(ponto) : '';
      while (usados.has(busca(nome))) {
        const sufixo = ' (' + n + ')';
        nome = raiz.slice(0, Math.max(1, 80 - extensao.length - sufixo.length)) + sufixo + extensao;
        n++;
      }
      usados.add(busca(nome));
      nomesPorProjeto.set(projetoId, usados);
      return { id: idNovo('arquivo'), projetoId, nome, conteudo: arquivo.conteudo, bytes: arquivo.bytes, versao: 1, criadoEm: agora(), atualizadoEm: agora() };
    });
    await gravarLote(projetosNovos, arquivosNovos);
    estado.projetos.push(...projetosNovos);
    estado.arquivos.push(...arquivosNovos);
    estado.bytesOcupados += arquivosNovos.reduce((soma, arquivo) => soma + bytesRegistro(arquivo), 0);
    estado.projetoAtivo = projetosNovos[0] ? projetosNovos[0].id : estado.projetoAtivo;
    estado.arquivoAtivo = arquivosNovos.find((arquivo) => arquivo.projetoId === estado.projetoAtivo)?.id || '';
    await guardarSelecao();
    renderTudo();
    definirStatus('ok', projetosNovos.length + ' projeto(s) e ' + arquivosNovos.length + ' arquivo(s) foram importados somente neste navegador.');
  }
  async function importarArquivo(file) {
    try {
      if (!file || typeof file.text !== 'function') throw erro('arquivo-invalido');
      if (Number(file.size) > LIMITES.importacaoBytes) throw erro('importacao-grande');
      const conteudo = await file.text();
      if (bytes(conteudo) > LIMITES.importacaoBytes) throw erro('importacao-grande');
      let backup = null;
      if (/\.json$/i.test(texto(file.name))) {
        try { backup = JSON.parse(conteudo); } catch (_) { backup = null; }
      }
      if (backup && backup.formato === FORMATO_EXPORTACAO) {
        if (!confirm('Importar esse backup local do Workspace? Os arquivos serão adicionados ao navegador atual; nada será enviado.')) return;
        await importarBackup(backup, file.size);
        return;
      }
      if (!EXTENSOES_TEXTO.test(texto(file.name))) throw erro('arquivo-invalido');
      await criarArquivo(file.name || 'arquivo-importado.txt', conteudo);
      definirStatus('ok', 'Arquivo importado somente neste navegador. Nada foi enviado.');
    } catch (e) { mostrarErro(e); }
  }
  async function copiarArquivo() {
    const arquivo = arquivoAtivo();
    if (!arquivo) return;
    const conteudo = texto(elementos.editor.value);
    try {
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw erro('sem-indexeddb');
      await navigator.clipboard.writeText(conteudo);
      definirStatus('ok', 'Conteúdo copiado localmente para a área de transferência.');
    } catch (_) {
      elementos.editor.focus();
      elementos.editor.select();
      definirStatus('', 'Selecione e copie o texto manualmente. Nada foi enviado.');
    }
  }
  async function levarSelecaoAoChat() {
    const arquivo = arquivoAtivo();
    if (!arquivo) return mostrarErro(erro('sem-arquivo'));
    const inicio = Number(elementos.editor.selectionStart);
    const fim = Number(elementos.editor.selectionEnd);
    const trecho = texto(elementos.editor.value).slice(inicio, fim);
    if (!trecho.trim()) return mostrarErro(erro('sem-selecao'));
    if (trecho.length > LIMITES.trechoParaChat) return mostrarErro(erro('trecho-grande'));
    if (typeof window.pareceTokenDeAcesso === 'function' && window.pareceTokenDeAcesso(trecho)) return mostrarErro(erro('token-detectado'));
    const entrada = document.getElementById('entrada');
    if (!entrada) return;
    const anterior = texto(entrada.value).trim();
    const unido = anterior ? anterior + '\n\n' + trecho : trecho;
    const limiteCompositor = Number(window.LIMITE_MENSAGEM_COMPOSITOR) || 12000;
    if (unido.length > limiteCompositor) return mostrarErro(erro('compositor-cheio'));
    entrada.value = unido;
    if (typeof window.ajustarCampoDeEntrada === 'function') window.ajustarCampoDeEntrada();
    if (typeof window.atualizarContador === 'function') window.atualizarContador();
    if (typeof window.atualizarAvisoRascunho === 'function') window.atualizarAvisoRascunho();
    if (typeof window.agendarSalvarRascunho === 'function') window.agendarSalvarRascunho();
    fechar('chat');
    setTimeout(() => entrada.focus(), 0);
  }

  function telaVisivel() {
    const conv = document.getElementById('tela-conv');
    if (conv && !conv.classList.contains('oculto') && conv.style.display !== 'none') return 'chat';
    const config = document.getElementById('tela-config');
    if (config && !config.classList.contains('oculto')) return 'config';
    return 'lista';
  }
  function esconderTelasDoChat() {
    const principal = document.getElementById('principal');
    const config = document.getElementById('tela-config');
    const conv = document.getElementById('tela-conv');
    if (principal) principal.classList.add('oculto');
    if (config) config.classList.add('oculto');
    if (conv) { conv.classList.add('oculto'); conv.style.display = 'none'; }
  }
  function restaurarTela(destino) {
    const principal = document.getElementById('principal');
    const config = document.getElementById('tela-config');
    const conv = document.getElementById('tela-conv');
    if (destino === 'chat' && typeof window.abrirConversa === 'function') { window.abrirConversa(); return; }
    if (destino === 'config' && typeof window.mostrarConfig === 'function') { window.mostrarConfig(true, false); return; }
    if (principal) principal.classList.remove('oculto');
    if (config) config.classList.add('oculto');
    if (conv) { conv.classList.add('oculto'); conv.style.display = 'none'; }
    setTimeout(() => { const buscaChat = document.getElementById('busca'); if (buscaChat) buscaChat.focus(); }, 0);
  }
  async function abrir() {
    if (!elementos) return;
    estado.telaAnterior = telaVisivel();
    esconderTelasDoChat();
    elementos.raiz.classList.remove('oculto');
    elementos.botaoAbrir.setAttribute('aria-pressed', 'true');
    elementos.botaoAbrir.setAttribute('aria-label', 'Fechar Workspace local');
    if (!estado.pronto) {
      definirStatus('', 'Preparando Workspace local neste navegador…');
      try {
        await iniciarDados();
        estado.pronto = true;
        renderTudo();
        definirStatus('', 'Workspace local: arquivos não são enviados automaticamente.');
      } catch (e) {
        mostrarErro(e);
        return;
      }
    } else if (!estado.alterado) {
      renderTudo();
    } else {
      renderProjetos();
      renderArquivos();
      atualizarResumo();
      atualizarControlesEditor(!!arquivoAtivo());
    }
    setTimeout(() => elementos.novoProjeto.focus(), 0);
  }
  function ocultarParaNavegacao() {
    if (!elementos || elementos.raiz.classList.contains('oculto')) return;
    elementos.raiz.classList.add('oculto');
    elementos.botaoAbrir.setAttribute('aria-pressed', 'false');
    elementos.botaoAbrir.setAttribute('aria-label', 'Abrir Workspace local');
  }
  function fechar(destino) {
    if (!elementos) return;
    if (estado.temporizadorSalvar) { clearTimeout(estado.temporizadorSalvar); estado.temporizadorSalvar = null; }
    if (estado.alterado) salvarArquivoAtual('automatico');
    ocultarParaNavegacao();
    restaurarTela(destino || estado.telaAnterior || 'lista');
  }

  function montarInterface() {
    const botaoAbrir = document.getElementById('btn-workspace');
    if (!botaoAbrir || document.getElementById('tela-workspace')) return;
    const raiz = document.createElement('section');
    raiz.id = 'tela-workspace';
    raiz.className = 'workspace oculto';
    raiz.setAttribute('aria-labelledby', 'titulo-workspace');
    raiz.innerHTML = `
      <div class="workspace-topo">
        <button type="button" id="btn-fechar-workspace" class="workspace-voltar" aria-label="Voltar ao Chat">← Chat</button>
        <div><h2 id="titulo-workspace" tabindex="-1">🗂️ Workspace</h2><p>Projetos e arquivos locais deste navegador</p></div>
        <span id="workspace-resumo" class="workspace-resumo" aria-live="polite"></span>
      </div>
      <div class="workspace-privacidade" role="note">🔒 Nada daqui é enviado para conversa, Issue, GitHub ou motor automaticamente. Use <b>Levar seleção ao Chat</b> apenas para colocar um trecho no compositor e revisar antes de enviar.</div>
      <div id="workspace-status" class="workspace-status" role="status" aria-live="polite" aria-atomic="true"></div>
      <div class="workspace-corpo">
        <aside class="workspace-painel workspace-projetos" aria-label="Projetos locais">
          <div class="workspace-painel-cabecalho"><h3>Projetos</h3></div>
          <div class="workspace-adicionar"><label class="visualmente-oculto" for="workspace-novo-projeto">Nome do novo projeto</label><input id="workspace-novo-projeto" maxlength="50" placeholder="Novo projeto" autocomplete="off"><button type="button" id="btn-workspace-criar-projeto">＋</button></div>
          <div id="workspace-lista-projetos" class="workspace-lista" role="group" aria-label="Lista de projetos"></div>
          <label class="workspace-rotulo" for="workspace-nome-projeto">Projeto atual</label>
          <div class="workspace-linha"><input id="workspace-nome-projeto" maxlength="50" autocomplete="off"><button type="button" id="btn-workspace-renomear-projeto">Renomear</button></div>
          <button type="button" id="btn-workspace-apagar-projeto" class="workspace-perigo">Mover projeto para lixeira</button>
          <details class="workspace-arquivo-completo workspace-projeto-portatil">
            <summary>Projeto portátil e histórico</summary>
            <p>Baixe somente o projeto atual com arquivos, versões locais e itens dele na lixeira. Ao importar, outro projeto será adicionado aqui; nada atual será substituído ou enviado.</p>
            <div class="workspace-arquivo-completo-acoes"><button type="button" id="btn-workspace-exportar-projeto" disabled>⇩ Baixar projeto portátil</button><button type="button" id="btn-workspace-importar-projeto" disabled>↥ Adicionar projeto portátil</button></div>
          </details>
          <input id="workspace-projeto-portatil-importar" type="file" accept="application/json,.json" class="oculto" aria-label="Escolher projeto portátil JSON para adicionar ao Workspace">
          <details class="workspace-lixeira">
            <summary>Lixeira local <span id="workspace-contador-lixeira"></span></summary>
            <p class="workspace-meta-pequena">Itens recuperáveis continuam ocupando espaço local até serem excluídos definitivamente.</p>
            <div id="workspace-lista-lixeira" class="workspace-lista-lixeira" role="group" aria-label="Itens na lixeira local"></div>
            <button type="button" id="btn-workspace-esvaziar-lixeira" class="workspace-perigo">Esvaziar lixeira definitivamente</button>
          </details>
        </aside>
        <aside class="workspace-painel workspace-arquivos" aria-label="Arquivos locais">
          <div class="workspace-painel-cabecalho"><h3>Arquivos</h3><span id="workspace-contador-arquivos"></span></div>
          <div class="workspace-busca"><label class="visualmente-oculto" for="workspace-busca-arquivos">Buscar arquivos no projeto atual</label><input id="workspace-busca-arquivos" type="search" placeholder="Buscar nome ou conteúdo…" autocomplete="off" aria-describedby="workspace-ajuda-busca"><button type="button" id="btn-workspace-busca-global" aria-pressed="false" aria-controls="workspace-lista-arquivos">Todos os projetos</button></div>
          <p id="workspace-ajuda-busca" class="workspace-meta-pequena">A busca fica no projeto atual. Ative Todos os projetos para localizar arquivos ativos em outro projeto.</p>
          <div class="workspace-acoes-arquivos"><button type="button" id="btn-workspace-novo-arquivo">＋ Novo</button><button type="button" id="btn-workspace-importar">⇪ Importar</button></div>
          <div id="workspace-lista-arquivos" class="workspace-lista" role="group" aria-label="Lista de arquivos"></div>
          <button type="button" id="btn-workspace-exportar" class="workspace-secundario">⇩ Exportar Workspace ativo</button>
          <details class="workspace-arquivo-completo">
            <summary>Arquivo completo e recuperação</summary>
            <p>Inclui arquivos ativos, versões locais e itens recuperáveis da lixeira. Pode conter seu conteúdo. Restaurar exige escolher o arquivo e substitui todo o Workspace deste navegador; nada é enviado.</p>
            <div class="workspace-arquivo-completo-acoes"><button type="button" id="btn-workspace-exportar-completo">⇩ Baixar arquivo completo</button><button type="button" id="btn-workspace-restaurar-completo" class="workspace-perigo">↥ Restaurar arquivo completo</button><button type="button" id="btn-workspace-desfazer-restauracao" disabled aria-describedby="workspace-aviso-reversao-completa">↶ Desfazer última restauração</button></div>
            <p id="workspace-aviso-reversao-completa" class="workspace-aviso">Depois de restaurar, o ponto de retorno fica apenas nesta página até você desfazer, atualizar ou fechar o Chat. Baixe um arquivo completo antes se precisar de uma cópia duradoura.</p>
          </details>
          <input id="workspace-arquivo-importar" type="file" accept=".txt,.md,.markdown,.json,.csv,.html,.css,.js,.py,.ts,.tsx,.jsx,.yml,.yaml,.xml,.log,text/plain,application/json,text/markdown,text/csv" class="oculto" aria-label="Importar arquivo de texto ou backup ativo do Workspace">
          <input id="workspace-arquivo-completo-importar" type="file" accept="application/json,.json" class="oculto" aria-label="Escolher arquivo completo JSON para restaurar o Workspace">
        </aside>
        <section class="workspace-editor" aria-label="Editor de arquivo local">
          <div class="workspace-editor-cabecalho"><div><h3 id="workspace-titulo-editor">Escolha ou crie um arquivo</h3><p id="workspace-meta-editor"></p></div><button type="button" id="btn-workspace-salvar">Salvar localmente</button></div>
          <section id="workspace-conflito-arquivo" class="workspace-conflito oculto" role="alert" aria-labelledby="workspace-conflito-titulo">
            <strong id="workspace-conflito-titulo">Este arquivo mudou em outra guia.</strong>
            <p>Seu texto continua neste editor e nada foi substituído. Salve uma cópia ou baixe o rascunho antes de recarregar a versão salva.</p>
            <div class="workspace-conflito-acoes"><button type="button" id="btn-workspace-baixar-conflito">⇩ Baixar meu rascunho</button><button type="button" id="btn-workspace-copiar-conflito">⧉ Salvar meu texto como cópia</button><button type="button" id="btn-workspace-recarregar-conflito">↻ Recarregar versão salva</button></div>
          </section>
          <label class="workspace-rotulo" for="workspace-nome-arquivo">Nome do arquivo</label>
          <input id="workspace-nome-arquivo" maxlength="80" autocomplete="off" disabled>
          <label class="visualmente-oculto" for="workspace-editor">Conteúdo do arquivo</label>
          <textarea id="workspace-editor" spellcheck="true" placeholder="O conteúdo deste arquivo fica só neste navegador até uma ação explícita sua." disabled></textarea>
          <div class="workspace-editor-acoes"><button type="button" id="btn-workspace-copiar">Copiar arquivo</button><button type="button" id="btn-workspace-levar-chat">Levar seleção ao Chat</button><button type="button" id="btn-workspace-apagar-arquivo" class="workspace-perigo">Mover para lixeira</button></div>
          <details id="workspace-revisoes" class="workspace-revisoes"><summary>Versões locais anteriores</summary><div id="workspace-lista-revisoes"></div></details>
          <p class="workspace-aviso">Limites locais: até 20 projetos ativos, 100 arquivos ativos, 512 KB por arquivo e 5 MB de conteúdo no total. O cálculo inclui arquivos, versões locais e itens recuperáveis da lixeira. Exporte backups para levar os arquivos ativos a outro navegador. Este espaço não é um cofre de senhas.</p>
        </section>
      </div>`;
    document.body.appendChild(raiz);
    elementos = {
      raiz, botaoAbrir, resumo: raiz.querySelector('#workspace-resumo'), status: raiz.querySelector('#workspace-status'),
      novoProjeto: raiz.querySelector('#workspace-novo-projeto'), listaProjetos: raiz.querySelector('#workspace-lista-projetos'),
      nomeProjeto: raiz.querySelector('#workspace-nome-projeto'), renomearProjeto: raiz.querySelector('#btn-workspace-renomear-projeto'), apagarProjeto: raiz.querySelector('#btn-workspace-apagar-projeto'),
      exportarProjetoPortatil: raiz.querySelector('#btn-workspace-exportar-projeto'), restaurarProjetoPortatil: raiz.querySelector('#btn-workspace-importar-projeto'), projetoPortatil: raiz.querySelector('#workspace-projeto-portatil-importar'),
      contadorLixeira: raiz.querySelector('#workspace-contador-lixeira'), listaLixeira: raiz.querySelector('#workspace-lista-lixeira'), esvaziarLixeira: raiz.querySelector('#btn-workspace-esvaziar-lixeira'),
      buscaArquivos: raiz.querySelector('#workspace-busca-arquivos'), buscaGlobal: raiz.querySelector('#btn-workspace-busca-global'), ajudaBusca: raiz.querySelector('#workspace-ajuda-busca'), contadorArquivos: raiz.querySelector('#workspace-contador-arquivos'), listaArquivos: raiz.querySelector('#workspace-lista-arquivos'),
      nomeArquivo: raiz.querySelector('#workspace-nome-arquivo'), editor: raiz.querySelector('#workspace-editor'), salvar: raiz.querySelector('#btn-workspace-salvar'), apagarArquivo: raiz.querySelector('#btn-workspace-apagar-arquivo'),
      conflitoArquivo: raiz.querySelector('#workspace-conflito-arquivo'), baixarConflito: raiz.querySelector('#btn-workspace-baixar-conflito'), copiarConflito: raiz.querySelector('#btn-workspace-copiar-conflito'), recarregarConflito: raiz.querySelector('#btn-workspace-recarregar-conflito'),
      copiar: raiz.querySelector('#btn-workspace-copiar'), levarAoChat: raiz.querySelector('#btn-workspace-levar-chat'), revisoes: raiz.querySelector('#workspace-revisoes'), listaRevisoes: raiz.querySelector('#workspace-lista-revisoes'),
      tituloEditor: raiz.querySelector('#workspace-titulo-editor'), metaEditor: raiz.querySelector('#workspace-meta-editor'),
      importar: raiz.querySelector('#workspace-arquivo-importar'), arquivoCompleto: raiz.querySelector('#workspace-arquivo-completo-importar'),
      desfazerArquivoCompleto: raiz.querySelector('#btn-workspace-desfazer-restauracao')
    };
    botaoAbrir.setAttribute('aria-pressed', 'false');
    botaoAbrir.onclick = () => raiz.classList.contains('oculto') ? abrir() : fechar();
    raiz.querySelector('#btn-fechar-workspace').onclick = () => fechar();
    raiz.querySelector('#btn-workspace-criar-projeto').onclick = criarProjeto;
    elementos.novoProjeto.addEventListener('keydown', (evento) => { if (evento.key === 'Enter') { evento.preventDefault(); criarProjeto(); } });
    elementos.renomearProjeto.onclick = renomearProjeto;
    elementos.apagarProjeto.onclick = apagarProjeto;
    elementos.exportarProjetoPortatil.onclick = exportarProjetoPortatil;
    elementos.restaurarProjetoPortatil.onclick = () => elementos.projetoPortatil.click();
    elementos.projetoPortatil.onchange = (evento) => {
      const arquivo = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      if (arquivo) importarProjetoPortatil(arquivo);
    };
    elementos.esvaziarLixeira.onclick = esvaziarLixeira;
    raiz.querySelector('#btn-workspace-novo-arquivo').onclick = () => criarArquivo('novo-arquivo.md', '');
    raiz.querySelector('#btn-workspace-importar').onclick = () => elementos.importar.click();
    elementos.importar.onchange = (evento) => {
      const arquivo = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      if (arquivo) importarArquivo(arquivo);
    };
    raiz.querySelector('#btn-workspace-exportar').onclick = exportarWorkspace;
    raiz.querySelector('#btn-workspace-exportar-completo').onclick = exportarArquivoCompleto;
    raiz.querySelector('#btn-workspace-restaurar-completo').onclick = () => elementos.arquivoCompleto.click();
    elementos.desfazerArquivoCompleto.onclick = desfazerUltimaRestauracaoArquivoCompleto;
    atualizarControleReversaoArquivoCompleto();
    elementos.arquivoCompleto.onchange = (evento) => {
      const arquivo = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      if (arquivo) importarArquivoCompleto(arquivo);
    };
    atualizarAjudaBuscaGlobal();
    elementos.buscaArquivos.addEventListener('input', renderArquivos);
    elementos.buscaGlobal.onclick = alternarBuscaGlobal;
    elementos.nomeArquivo.addEventListener('input', marcarAlterado);
    elementos.editor.addEventListener('input', marcarAlterado);
    elementos.salvar.onclick = () => salvarArquivoAtual('manual');
    elementos.baixarConflito.onclick = baixarRascunhoConflito;
    elementos.copiarConflito.onclick = salvarConflitoComoCopia;
    elementos.recarregarConflito.onclick = recarregarArquivoConflito;
    elementos.apagarArquivo.onclick = apagarArquivo;
    elementos.copiar.onclick = copiarArquivo;
    elementos.levarAoChat.onclick = levarSelecaoAoChat;
    document.addEventListener('keydown', (evento) => {
      if (!elementos || elementos.raiz.classList.contains('oculto') || estado.operacaoArquivoCompleto) return;
      if (evento.key === 'Escape') { evento.preventDefault(); evento.stopImmediatePropagation(); fechar(); return; }
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') { evento.preventDefault(); salvarArquivoAtual('manual'); }
    }, true);
  }

  window.ReboclWorkspace = Object.freeze({
    abrir,
    fechar,
    ocultarParaNavegacao,
    limites: Object.freeze({ projetos: LIMITES.projetos, arquivos: LIMITES.arquivos, arquivoBytes: LIMITES.arquivoBytes, totalBytes: LIMITES.totalBytes }),
    arquivoCompleto: Object.freeze({
      formato: FORMATO_ARQUIVO_COMPLETO,
      versao: VERSAO_ARQUIVO_COMPLETO,
      limites: Object.freeze(Object.assign({}, LIMITES_ARQUIVO_COMPLETO)),
      validar: validarArquivoCompleto
    }),
    projetoPortatil: Object.freeze({
      formato: FORMATO_PROJETO_PORTATIL,
      versao: VERSAO_PROJETO_PORTATIL,
      limites: Object.freeze(Object.assign({}, LIMITES_PROJETO_PORTATIL)),
      validar: validarProjetoPortatil
    })
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarInterface, { once: true });
  else montarInterface();
})();
