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

  const estado = {
    banco: null,
    promessaBanco: null,
    projetos: [],
    arquivos: [],
    projetoAtivo: '',
    arquivoAtivo: '',
    alterado: false,
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
      'workspace-cheio': 'O Workspace chegou ao limite local de 5 MB. Exporte ou apague arquivos antes de continuar.',
      'arquivo-invalido': 'Esse arquivo não tem um formato de texto aceito pelo Workspace.',
      'backup-invalido': 'O backup do Workspace não tem um formato reconhecido.',
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
  function apagar(loja, chave) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction(loja, 'readwrite');
      tx.objectStore(loja).delete(chave);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
      tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
    }));
  }
  function gravarArquivoComRevisao(arquivo, anterior) {
    return abrirBanco().then((banco) => new Promise((resolve, reject) => {
      const tx = banco.transaction([LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
      tx.objectStore(LOJAS.arquivos).put(arquivo);
      if (anterior && anterior.conteudo !== arquivo.conteudo) {
        tx.objectStore(LOJAS.revisoes).put({
          id: idNovo('rev'), arquivoId: anterior.id, conteudo: anterior.conteudo,
          quando: anterior.atualizadoEm, versao: anterior.versao
        });
      }
      tx.oncomplete = () => resolve(arquivo);
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
  function guardarMeta(chave, valor) { return gravar(LOJAS.meta, { chave, valor }); }

  function projetoAtivo() { return estado.projetos.find((p) => p.id === estado.projetoAtivo) || null; }
  function arquivoAtivo() { return estado.arquivos.find((a) => a.id === estado.arquivoAtivo) || null; }
  function arquivosDoProjeto(id) { return estado.arquivos.filter((a) => a.projetoId === id); }
  function bytesTotais(excetoId) {
    return estado.arquivos.reduce((total, arquivo) => total + (arquivo.id === excetoId ? 0 : Number(arquivo.bytes) || bytes(arquivo.conteudo)), 0);
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
    const total = bytesTotais();
    elementos.resumo.textContent = estado.arquivos.length + '/' + LIMITES.arquivos + ' arquivo(s) · ' + formatarBytes(total) + '/' + formatarBytes(LIMITES.totalBytes) + ' locais';
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
    elementos.renomearProjeto.disabled = !projeto;
    elementos.apagarProjeto.disabled = !projeto;
  }
  function renderArquivos() {
    if (!elementos) return;
    limpar(elementos.listaArquivos);
    const termo = busca(elementos.buscaArquivos.value);
    const arquivos = ordenarArquivos(arquivosDoProjeto(estado.projetoAtivo)).filter((arquivo) => {
      if (!termo) return true;
      return busca(arquivo.nome).includes(termo) || busca(arquivo.conteudo).includes(termo);
    });
    elementos.contadorArquivos.textContent = arquivos.length + (termo ? ' resultado(s)' : ' arquivo(s)');
    if (!arquivos.length) {
      const vazio = document.createElement('p');
      vazio.className = 'workspace-vazio';
      vazio.textContent = termo ? 'Nenhum arquivo local corresponde à busca.' : 'Ainda não há arquivo neste projeto.';
      elementos.listaArquivos.appendChild(vazio);
    }
    arquivos.forEach((arquivo) => {
      const item = botao('', 'workspace-item workspace-arquivo', 'Abrir arquivo: ' + arquivo.nome);
      item.dataset.arquivoId = arquivo.id;
      item.setAttribute('aria-pressed', arquivo.id === estado.arquivoAtivo ? 'true' : 'false');
      const nome = document.createElement('strong');
      nome.textContent = arquivo.nome;
      const meta = document.createElement('span');
      meta.textContent = formatarBytes(arquivo.bytes) + ' · ' + formatarData(arquivo.atualizadoEm);
      item.append(nome, meta);
      item.onclick = () => selecionarArquivo(arquivo.id);
      elementos.listaArquivos.appendChild(item);
    });
  }
  function atualizarControlesEditor(ativo) {
    if (!elementos) return;
    elementos.nomeArquivo.disabled = !ativo;
    elementos.editor.disabled = !ativo;
    elementos.salvar.disabled = !ativo || estado.salvando;
    elementos.apagarArquivo.disabled = !ativo || estado.salvando;
    elementos.copiar.disabled = !ativo || estado.salvando;
    elementos.levarAoChat.disabled = !ativo || estado.salvando;
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
  function renderTudo() {
    renderProjetos();
    renderArquivos();
    renderEditor();
    atualizarResumo();
  }

  async function iniciarDados() {
    const [projetos, arquivos, selecao] = await Promise.all([
      lerTodos(LOJAS.projetos),
      lerTodos(LOJAS.arquivos),
      lerUm(LOJAS.meta, 'selecao')
    ]);
    estado.projetos = projetos.filter((projeto) => projeto && projeto.id && projeto.nome);
    estado.arquivos = arquivos.filter((arquivo) => arquivo && arquivo.id && arquivo.projetoId && typeof arquivo.conteudo === 'string');
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
  async function apagarProjeto() {
    const projeto = projetoAtivo();
    if (!projeto) return;
    if (!confirm('Apagar o projeto local “' + projeto.nome + '” e todos os arquivos dele? Esta ação não envia nada e não pode ser desfeita pelo Chat.')) return;
    try {
      if (estado.alterado) estado.alterado = false;
      const arquivos = arquivosDoProjeto(projeto.id);
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
      estado.projetos = estado.projetos.filter((item) => item.id !== projeto.id);
      estado.arquivos = estado.arquivos.filter((item) => item.projetoId !== projeto.id);
      if (!estado.projetos.length) {
        const padrao = { id: idNovo('projeto'), nome: 'Meu workspace', criadoEm: agora(), atualizadoEm: agora() };
        await gravar(LOJAS.projetos, padrao);
        estado.projetos = [padrao];
      }
      estado.projetoAtivo = ordenarProjetos(estado.projetos)[0].id;
      estado.arquivoAtivo = '';
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Projeto e arquivos locais apagados. Nada foi enviado.');
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
      if (bytesTotais() + tamanho > LIMITES.totalBytes) throw erro('workspace-cheio');
      const arquivo = {
        id: idNovo('arquivo'), projetoId: projeto.id,
        nome: nomeArquivoDisponivel(nomeInicial || 'novo-arquivo.md', projeto.id),
        conteudo, bytes: tamanho, versao: 1, criadoEm: agora(), atualizadoEm: agora()
      };
      await gravar(LOJAS.arquivos, arquivo);
      projeto.atualizadoEm = agora();
      await gravar(LOJAS.projetos, projeto);
      estado.arquivos.push(arquivo);
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
    if (!id || id === estado.arquivoAtivo) return;
    try {
      if (estado.alterado && !(await salvarArquivoAtual('troca'))) return;
      estado.arquivoAtivo = id;
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
  function marcarAlterado() {
    if (!arquivoAtivo()) return;
    estado.alterado = true;
    estado.edicao++;
    definirStatus('', 'Alterações pendentes: o Workspace vai salvar apenas neste navegador.');
    agendarSalvarAutomatico();
  }
  async function salvarArquivoAtual(origem) {
    const anterior = arquivoAtivo();
    if (!anterior) { if (origem !== 'automatico') mostrarErro(erro('sem-arquivo')); return false; }
    if (estado.salvando) return false;
    const edicaoNoInicio = estado.edicao;
    let houveEdicaoDurante = false;
    try {
      const nome = nomeArquivoSeguro(elementos.nomeArquivo.value);
      const conteudo = texto(elementos.editor.value);
      const tamanho = bytes(conteudo);
      if (tamanho > LIMITES.arquivoBytes) throw erro('arquivo-grande');
      if (bytesTotais(anterior.id) + tamanho > LIMITES.totalBytes) throw erro('workspace-cheio');
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
      await gravarArquivoComRevisao(atualizado, anterior);
      estado.arquivos = estado.arquivos.map((arquivo) => arquivo.id === atualizado.id ? atualizado : arquivo);
      const projeto = projetoAtivo();
      if (projeto) { projeto.atualizadoEm = atualizado.atualizadoEm; await gravar(LOJAS.projetos, projeto); }
      await limitarRevisoes(atualizado.id);
      houveEdicaoDurante = estado.edicao !== edicaoNoInicio;
      if (!houveEdicaoDurante) {
        estado.alterado = false;
        renderTudo();
        definirStatus('ok', origem === 'automatico' ? 'Salvo localmente neste navegador.' : 'Arquivo salvo localmente. Nada foi enviado.');
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
  async function limitarRevisoes(idArquivo) {
    const revisoes = (await lerTodos(LOJAS.revisoes, 'arquivoId', idArquivo)).sort((a, b) => texto(b.quando).localeCompare(texto(a.quando)));
    const extras = revisoes.slice(LIMITES.revisoesPorArquivo);
    await Promise.all(extras.map((revisao) => apagar(LOJAS.revisoes, revisao.id)));
  }
  async function apagarArquivo() {
    const arquivo = arquivoAtivo();
    if (!arquivo) return;
    if (!confirm('Apagar o arquivo local “' + arquivo.nome + '”? As versões locais dele também serão removidas.')) return;
    try {
      const revisoes = await lerTodos(LOJAS.revisoes, 'arquivoId', arquivo.id);
      await abrirBanco().then((banco) => new Promise((resolve, reject) => {
        const tx = banco.transaction([LOJAS.arquivos, LOJAS.revisoes], 'readwrite');
        tx.objectStore(LOJAS.arquivos).delete(arquivo.id);
        revisoes.forEach((revisao) => tx.objectStore(LOJAS.revisoes).delete(revisao.id));
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error || erro('sem-indexeddb'));
        tx.onabort = () => reject(tx.error || erro('sem-indexeddb'));
      }));
      estado.arquivos = estado.arquivos.filter((item) => item.id !== arquivo.id);
      estado.arquivoAtivo = '';
      estado.alterado = false;
      await guardarSelecao();
      renderTudo();
      definirStatus('ok', 'Arquivo local apagado. Nada foi enviado.');
    } catch (e) { mostrarErro(e); }
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
    if (total > LIMITES.totalBytes || bytesTotais() + total > LIMITES.totalBytes) throw erro('workspace-cheio');
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
          <button type="button" id="btn-workspace-apagar-projeto" class="workspace-perigo">Apagar projeto local</button>
        </aside>
        <aside class="workspace-painel workspace-arquivos" aria-label="Arquivos locais">
          <div class="workspace-painel-cabecalho"><h3>Arquivos</h3><span id="workspace-contador-arquivos"></span></div>
          <label class="visualmente-oculto" for="workspace-busca-arquivos">Buscar arquivos locais</label><input id="workspace-busca-arquivos" type="search" placeholder="Buscar nome ou conteúdo…" autocomplete="off">
          <div class="workspace-acoes-arquivos"><button type="button" id="btn-workspace-novo-arquivo">＋ Novo</button><button type="button" id="btn-workspace-importar">⇪ Importar</button></div>
          <div id="workspace-lista-arquivos" class="workspace-lista" role="group" aria-label="Lista de arquivos"></div>
          <button type="button" id="btn-workspace-exportar" class="workspace-secundario">⇩ Exportar Workspace</button>
          <input id="workspace-arquivo-importar" type="file" accept=".txt,.md,.markdown,.json,.csv,.html,.css,.js,.py,.ts,.tsx,.jsx,.yml,.yaml,.xml,.log,text/plain,application/json,text/markdown,text/csv" class="oculto" aria-label="Importar arquivo de texto ou backup do Workspace">
        </aside>
        <section class="workspace-editor" aria-label="Editor de arquivo local">
          <div class="workspace-editor-cabecalho"><div><h3 id="workspace-titulo-editor">Escolha ou crie um arquivo</h3><p id="workspace-meta-editor"></p></div><button type="button" id="btn-workspace-salvar">Salvar localmente</button></div>
          <label class="workspace-rotulo" for="workspace-nome-arquivo">Nome do arquivo</label>
          <input id="workspace-nome-arquivo" maxlength="80" autocomplete="off" disabled>
          <label class="visualmente-oculto" for="workspace-editor">Conteúdo do arquivo</label>
          <textarea id="workspace-editor" spellcheck="true" placeholder="O conteúdo deste arquivo fica só neste navegador até uma ação explícita sua." disabled></textarea>
          <div class="workspace-editor-acoes"><button type="button" id="btn-workspace-copiar">Copiar arquivo</button><button type="button" id="btn-workspace-levar-chat">Levar seleção ao Chat</button><button type="button" id="btn-workspace-apagar-arquivo" class="workspace-perigo">Apagar arquivo</button></div>
          <details id="workspace-revisoes" class="workspace-revisoes"><summary>Versões locais anteriores</summary><div id="workspace-lista-revisoes"></div></details>
          <p class="workspace-aviso">Limites locais: até 20 projetos, 100 arquivos, 512 KB por arquivo e 5 MB no total. Exporte backups para levar seus arquivos a outro navegador. Este espaço não é um cofre de senhas.</p>
        </section>
      </div>`;
    document.body.appendChild(raiz);
    elementos = {
      raiz, botaoAbrir, resumo: raiz.querySelector('#workspace-resumo'), status: raiz.querySelector('#workspace-status'),
      novoProjeto: raiz.querySelector('#workspace-novo-projeto'), listaProjetos: raiz.querySelector('#workspace-lista-projetos'),
      nomeProjeto: raiz.querySelector('#workspace-nome-projeto'), renomearProjeto: raiz.querySelector('#btn-workspace-renomear-projeto'), apagarProjeto: raiz.querySelector('#btn-workspace-apagar-projeto'),
      buscaArquivos: raiz.querySelector('#workspace-busca-arquivos'), contadorArquivos: raiz.querySelector('#workspace-contador-arquivos'), listaArquivos: raiz.querySelector('#workspace-lista-arquivos'),
      nomeArquivo: raiz.querySelector('#workspace-nome-arquivo'), editor: raiz.querySelector('#workspace-editor'), salvar: raiz.querySelector('#btn-workspace-salvar'), apagarArquivo: raiz.querySelector('#btn-workspace-apagar-arquivo'),
      copiar: raiz.querySelector('#btn-workspace-copiar'), levarAoChat: raiz.querySelector('#btn-workspace-levar-chat'), revisoes: raiz.querySelector('#workspace-revisoes'), listaRevisoes: raiz.querySelector('#workspace-lista-revisoes'),
      tituloEditor: raiz.querySelector('#workspace-titulo-editor'), metaEditor: raiz.querySelector('#workspace-meta-editor'), importar: raiz.querySelector('#workspace-arquivo-importar')
    };
    botaoAbrir.setAttribute('aria-pressed', 'false');
    botaoAbrir.onclick = () => raiz.classList.contains('oculto') ? abrir() : fechar();
    raiz.querySelector('#btn-fechar-workspace').onclick = () => fechar();
    raiz.querySelector('#btn-workspace-criar-projeto').onclick = criarProjeto;
    elementos.novoProjeto.addEventListener('keydown', (evento) => { if (evento.key === 'Enter') { evento.preventDefault(); criarProjeto(); } });
    elementos.renomearProjeto.onclick = renomearProjeto;
    elementos.apagarProjeto.onclick = apagarProjeto;
    raiz.querySelector('#btn-workspace-novo-arquivo').onclick = () => criarArquivo('novo-arquivo.md', '');
    raiz.querySelector('#btn-workspace-importar').onclick = () => elementos.importar.click();
    elementos.importar.onchange = (evento) => {
      const arquivo = evento.target.files && evento.target.files[0];
      evento.target.value = '';
      if (arquivo) importarArquivo(arquivo);
    };
    raiz.querySelector('#btn-workspace-exportar').onclick = exportarWorkspace;
    elementos.buscaArquivos.addEventListener('input', renderArquivos);
    elementos.nomeArquivo.addEventListener('input', marcarAlterado);
    elementos.editor.addEventListener('input', marcarAlterado);
    elementos.salvar.onclick = () => salvarArquivoAtual('manual');
    elementos.apagarArquivo.onclick = apagarArquivo;
    elementos.copiar.onclick = copiarArquivo;
    elementos.levarAoChat.onclick = levarSelecaoAoChat;
    document.addEventListener('keydown', (evento) => {
      if (!elementos || elementos.raiz.classList.contains('oculto')) return;
      if (evento.key === 'Escape') { evento.preventDefault(); evento.stopImmediatePropagation(); fechar(); return; }
      if ((evento.ctrlKey || evento.metaKey) && evento.key.toLowerCase() === 's') { evento.preventDefault(); salvarArquivoAtual('manual'); }
    }, true);
  }

  window.ReboclWorkspace = Object.freeze({ abrir, fechar, ocultarParaNavegacao, limites: Object.freeze({ projetos: LIMITES.projetos, arquivos: LIMITES.arquivos, arquivoBytes: LIMITES.arquivoBytes, totalBytes: LIMITES.totalBytes }) });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montarInterface, { once: true });
  else montarInterface();
})();
