// Contrato executável do planejamento de capacidade do Workspace local.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const fonte = fs.readFileSync(path.join(raiz, 'chat-workspace.js'), 'utf8');
let certos = 0, falhas = 0;
function testa(nome, fn) {
  return Promise.resolve().then(fn).then(() => {
    certos++;
    console.log('✔ ' + nome);
  }, (erro) => {
    falhas++;
    console.error('✘ ' + nome + ' — ' + erro.message);
  });
}
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio), b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
const planejadorFonte = entre(fonte, 'function planejarArmazenamentoParaSalvar(anterior, atualizado, arquivos, revisoes)', '\n\n  function ordenarProjetos');

function planejar({ ocupacao, anterior, atualizado, revisoes, total = 12, porArquivo = 2 }) {
  const bytesRegistro = (registro) => {
    const declarado = Number(registro && registro.bytes);
    return Number.isFinite(declarado) && declarado >= 0 ? declarado : String((registro && registro.conteudo) || '').length;
  };
  // A lista imita a fotografia persistida que o readwrite entrega ao planejador:
  // o preenchimento representa os demais registros do Workspace, não estado RAM.
  const custoRevisoes = (revisoes || []).reduce((totalAtual, revisao) => totalAtual + bytesRegistro(revisao), 0);
  const residual = Math.max(0, ocupacao - bytesRegistro(anterior) - custoRevisoes);
  const arquivos = [anterior];
  if (residual) arquivos.push({ id: 'ocupacao-controlada', conteudo: '', bytes: residual });
  const contexto = {
    LIMITES: { totalBytes: total, revisoesPorArquivo: porArquivo },
    medirOcupacao: (listaArquivos, listaRevisoes) => (listaArquivos || []).reduce((totalAtual, arquivo) => totalAtual + bytesRegistro(arquivo), 0) +
      (listaRevisoes || []).reduce((totalAtual, revisao) => totalAtual + bytesRegistro(revisao), 0),
    bytesRegistro,
    bytes: (valor) => String(valor == null ? '' : valor).length,
    texto: (valor) => String(valor == null ? '' : valor),
    erro: (codigo) => { const e = new Error(codigo); e.codigoWorkspace = codigo; return e; },
    Map, Math, Number, String, Array
  };
  contexto.globalThis = contexto;
  vm.runInNewContext(planejadorFonte + '\nglobalThis.planejarTeste = planejarArmazenamentoParaSalvar;', contexto);
  return contexto.planejarTeste(anterior, atualizado, arquivos, revisoes);
}

// Executa o módulo real em VM com IndexedDB/DOM substituídos apenas para conferir
// as transições locais; o ativo de produção não recebe ganchos de teste.
function criarModuloComBanco(registros) {
  const marcador = '  window.ReboclWorkspace = Object.freeze';
  const inicio = fonte.indexOf(marcador);
  assert(inicio >= 0, 'ponto de montagem do módulo não encontrado');
  const fonteTestavel = fonte.slice(0, inicio) + `  window.__workspaceTeste = {
    estado, criarProjetoTransacional, renomearProjetoTransacional, criarArquivoTransacional, gravarArquivoComRevisao, gravarCopiaConflito, gravarLote,
    moverArquivoParaLixeira, moverProjetoParaLixeira, apagarArquivo, apagarProjeto, restaurarDaLixeira, descartarDaLixeira, esvaziarLixeira,
    substituir: (dependencias) => {
      if (dependencias.lerTodos) lerTodos = dependencias.lerTodos;
      if (dependencias.lerUm) lerUm = dependencias.lerUm;
      if (dependencias.gravar) gravar = dependencias.gravar;
      if (dependencias.abrirBanco) abrirBanco = dependencias.abrirBanco;
      if (dependencias.guardarSelecao) guardarSelecao = dependencias.guardarSelecao;
      if (dependencias.renderTudo) renderTudo = dependencias.renderTudo;
      if (dependencias.renderLixeira) renderLixeira = dependencias.renderLixeira;
      if (dependencias.definirStatus) definirStatus = dependencias.definirStatus;
    }
  };
})();\n`;
  const mapas = Object.fromEntries(['projetos', 'arquivos', 'revisoes', 'meta'].map((loja) => [loja, new Map((registros[loja] || []).map((item) => [item.id || item.chave, Object.assign({}, item)]))]));
  const todos = async (loja, indice, chave) => [...mapas[loja].values()].filter((item) => !indice || item[indice] === chave).map((item) => Object.assign({}, item));
  const banco = {
    transaction: () => {
      let pendentes = 0;
      let conclusaoAgendada = false;
      const tx = {};
      const agendarConclusao = () => {
        if (conclusaoAgendada) return;
        conclusaoAgendada = true;
        queueMicrotask(() => {
          conclusaoAgendada = false;
          if (!pendentes && typeof tx.oncomplete === 'function') tx.oncomplete();
        });
      };
      const pedido = (ler) => {
        pendentes++;
        const requisicao = { result: undefined, error: null, onsuccess: null, onerror: null };
        queueMicrotask(() => {
          try {
            requisicao.result = ler();
            if (typeof requisicao.onsuccess === 'function') requisicao.onsuccess();
          } catch (erro) {
            requisicao.error = erro;
            if (typeof requisicao.onerror === 'function') requisicao.onerror();
          } finally {
            pendentes--;
            agendarConclusao();
          }
        });
        return requisicao;
      };
      tx.objectStore = (loja) => {
        const valores = () => [...mapas[loja].values()].map((item) => Object.assign({}, item));
        return {
          put: (item) => mapas[loja].set(item.id || item.chave, Object.assign({}, item)),
          delete: (chave) => mapas[loja].delete(chave),
          get: (chave) => pedido(() => mapas[loja].has(chave) ? Object.assign({}, mapas[loja].get(chave)) : undefined),
          getAll: () => pedido(valores),
          index: (indice) => ({ getAll: (chave) => pedido(() => valores().filter((item) => item[indice] === chave)) })
        };
      };
      agendarConclusao();
      return tx;
    }
  };
  let status = '';
  let proximoIdControlado = 0;
  const contexto = {
    window: { crypto: { randomUUID: () => 'id-controlado-' + (++proximoIdControlado) } },
    TextEncoder, Map, Set, Promise, Date, Math, Number, String, Object, Array,
    confirm: () => true
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(fonteTestavel, contexto);
  const modulo = contexto.window.__workspaceTeste;
  modulo.substituir({
    lerTodos: todos,
    lerUm: async (loja, chave) => mapas[loja].has(chave) ? Object.assign({}, mapas[loja].get(chave)) : null,
    gravar: async (loja, item) => { mapas[loja].set(item.id || item.chave, Object.assign({}, item)); return item; },
    abrirBanco: async () => banco,
    guardarSelecao: async () => {},
    renderTudo: () => {},
    renderLixeira: () => {},
    definirStatus: (_, mensagem) => { status = mensagem; }
  });
  return { modulo, mapas, status: () => status };
}

async function principal() {
  await testa('preserva a edição atual e libera as revisões mais antigas quando o limite exige', async () => {
    const resultado = await planejar({
      ocupacao: 12,
      anterior: { id: 'a', conteudo: 'aaaa', bytes: 4 },
      atualizado: { id: 'a', conteudo: 'bbbbb', bytes: 5 },
      revisoes: [
        { id: 'r-antiga', arquivoId: 'a', conteudo: 'cccc', bytes: 4, quando: '2026-01-01T00:00:00.000Z' },
        { id: 'r-outra', arquivoId: 'b', conteudo: 'ddd', bytes: 3, quando: '2026-01-02T00:00:00.000Z' }
      ]
    });
    assert.equal(resultado.guardarRevisao, true);
    assert.deepEqual(resultado.removerRevisoes.map((r) => r.id), ['r-antiga', 'r-outra']);
    assert.equal(resultado.ocupacaoFinal, 10);
  });

  await testa('mantém no máximo o histórico configurado por arquivo antes de gravar a nova versão', async () => {
    const resultado = await planejar({
      ocupacao: 6,
      anterior: { id: 'a', conteudo: 'aa', bytes: 2 },
      atualizado: { id: 'a', conteudo: 'bb', bytes: 2 },
      revisoes: [
        { id: 'r-1', arquivoId: 'a', conteudo: 'cc', bytes: 2, quando: '2026-01-01T00:00:00.000Z' },
        { id: 'r-2', arquivoId: 'a', conteudo: 'dd', bytes: 2, quando: '2026-01-02T00:00:00.000Z' }
      ]
    });
    assert.equal(resultado.guardarRevisao, true);
    assert.deepEqual(resultado.removerRevisoes.map((r) => r.id), ['r-1']);
    assert.equal(resultado.ocupacaoFinal, 6);
  });

  await testa('salva o conteúdo atual mesmo se não houver espaço para uma nova revisão', async () => {
    const resultado = await planejar({
      ocupacao: 3,
      anterior: { id: 'a', conteudo: 'aaa', bytes: 3 },
      atualizado: { id: 'a', conteudo: 'bbbbb', bytes: 5 },
      revisoes: [],
      total: 5
    });
    assert.equal(resultado.guardarRevisao, false);
    assert.equal(resultado.ocupacaoFinal, 5);
    assert.deepEqual(resultado.removerRevisoes, []);
  });

  await testa('recusa apenas quando o conteúdo atual por si só ultrapassa a capacidade', () => {
    assert.throws(() => planejar({
      ocupacao: 5,
      anterior: { id: 'a', conteudo: 'aa', bytes: 2 },
      atualizado: { id: 'a', conteudo: 'bbbbbb', bytes: 6 },
      revisoes: [],
      total: 5
    }), (erro) => erro && erro.codigoWorkspace === 'workspace-cheio');
  });

  await testa('salvamento decide o nome entre irmãos que já existem no readwrite atual', async () => {
    const quando = '2026-10-21T13:00:00.000Z';
    const anterior = { id: 'a', projetoId: 'p', nome: 'base.md', conteudo: 'antes', bytes: 5, versao: 1, criadoEm: quando, atualizadoEm: quando };
    const irmaoAtual = { id: 'b', projetoId: 'p', nome: 'alvo.md', conteudo: 'outra guia', bytes: 10, versao: 1, criadoEm: quando, atualizadoEm: '2026-10-21T13:01:00.000Z' };
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: quando, atualizadoEm: irmaoAtual.atualizadoEm };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projeto], arquivos: [anterior, irmaoAtual] });
    const tentativa = Object.assign({}, anterior, { nome: 'alvo.md', conteudo: 'edição local', bytes: 12, versao: 2, atualizadoEm: '2026-10-21T13:02:00.000Z' });
    const resultado = await modulo.gravarArquivoComRevisao(tentativa, anterior);
    assert.equal(resultado.conflito, false);
    assert.equal(resultado.nomeOcupado, true);
    assert.equal(resultado.erro, '');
    assert.equal(mapas.arquivos.get('a').nome, 'base.md');
    assert.equal(mapas.arquivos.get('a').conteudo, 'antes');
    assert.equal(mapas.arquivos.get('b').nome, 'alvo.md');
    assert.equal(mapas.projetos.get('p').atualizadoEm, projeto.atualizadoEm);
    assert.equal(mapas.revisoes.size, 0);
  });

  await testa('salvamento bem-sucedido devolve os irmãos ativos que chegaram antes do commit', async () => {
    const quando = '2026-10-21T13:00:00.000Z';
    const anterior = { id: 'a', projetoId: 'p', nome: 'base.md', conteudo: 'antes', bytes: 5, versao: 1, criadoEm: quando, atualizadoEm: quando };
    const irmaoAtual = { id: 'b', projetoId: 'p', nome: 'chegou.md', conteudo: 'outra guia', bytes: 10, versao: 1, criadoEm: quando, atualizadoEm: '2026-10-21T13:01:00.000Z' };
    const projeto = { id: 'p', nome: 'Projeto da outra guia', criadoEm: quando, atualizadoEm: irmaoAtual.atualizadoEm };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projeto], arquivos: [anterior, irmaoAtual] });
    const tentativa = Object.assign({}, anterior, { nome: 'salvo.md', conteudo: 'edição local', bytes: 12, versao: 2, atualizadoEm: '2026-10-21T13:02:00.000Z' });
    const resultado = await modulo.gravarArquivoComRevisao(tentativa, anterior);
    assert.equal(resultado.conflito, false);
    assert.equal(resultado.nomeOcupado, false);
    assert.equal(resultado.erro, '');
    assert.equal(mapas.arquivos.get('a').nome, 'salvo.md');
    assert.equal(mapas.arquivos.get('b').nome, 'chegou.md');
    assert.equal(resultado.arquivosAtivos.length, 2);
    assert.equal(resultado.arquivosAtivos.some((arquivo) => arquivo.id === 'b' && arquivo.nome === 'chegou.md'), true);
    assert.equal(resultado.projeto.nome, projeto.nome);
    assert.equal(mapas.revisoes.size, 1);
  });

  await testa('salvamento usa a ocupação persistida atual e não ultrapassa 5 MB após outra gravação', async () => {
    const quando = '2026-10-21T13:00:00.000Z';
    const anterior = { id: 'a', projetoId: 'p', nome: 'base.md', conteudo: 'a', bytes: 1, versao: 1, criadoEm: quando, atualizadoEm: quando };
    const cheio = { id: 'b', projetoId: 'p', nome: 'ocupado.md', conteudo: '', bytes: 5 * 1024 * 1024, versao: 1, criadoEm: quando, atualizadoEm: '2026-10-21T13:01:00.000Z' };
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: quando, atualizadoEm: cheio.atualizadoEm };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projeto], arquivos: [anterior, cheio] });
    const tentativa = Object.assign({}, anterior, { conteudo: 'bb', bytes: 2, versao: 2, atualizadoEm: '2026-10-21T13:02:00.000Z' });
    const resultado = await modulo.gravarArquivoComRevisao(tentativa, anterior);
    assert.equal(resultado.conflito, false);
    assert.equal(resultado.nomeOcupado, false);
    assert.equal(resultado.erro, 'workspace-cheio');
    assert.equal(mapas.arquivos.get('a').conteudo, 'a');
    assert.equal(mapas.arquivos.get('a').versao, 1);
    assert.equal(mapas.arquivos.get('b').bytes, 5 * 1024 * 1024);
    assert.equal(mapas.projetos.get('p').atualizadoEm, projeto.atualizadoEm);
    assert.equal(mapas.revisoes.size, 0);
  });

  await testa('cópia de conflito escolhe o próximo nome pela fotografia persistida do projeto', async () => {
    const quando = '2026-10-21T14:00:00.000Z';
    const projeto = { id: 'p', nome: 'Projeto renomeado remotamente', criadoEm: quando, atualizadoEm: '2026-10-21T14:01:00.000Z' };
    const original = { id: 'a', projetoId: 'p', nome: 'nota.md', conteudo: 'versão remota', bytes: 13, versao: 2, criadoEm: quando, atualizadoEm: projeto.atualizadoEm };
    const copiaOcupada = { id: 'b', projetoId: 'p', nome: 'nota (minha cópia).md', conteudo: 'irmão atual', bytes: 11, versao: 1, criadoEm: quando, atualizadoEm: projeto.atualizadoEm };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projeto], arquivos: [original, copiaOcupada] });
    const resultado = await modulo.gravarCopiaConflito('p', 'nota.md', 'rascunho preservado', '2026-10-21T14:02:00.000Z');
    assert.equal(resultado.gravada, true);
    assert.equal(resultado.erro, '');
    assert.equal(resultado.copia.nome, 'nota (minha cópia 2).md');
    assert.equal(resultado.copia.conteudo, 'rascunho preservado');
    assert.equal(mapas.arquivos.get('a').conteudo, original.conteudo);
    assert.equal(mapas.arquivos.get('b').nome, copiaOcupada.nome);
    assert.equal(mapas.arquivos.get(resultado.copia.id).nome, 'nota (minha cópia 2).md');
    assert.equal(resultado.projeto.nome, projeto.nome);
  });

  await testa('cópia de conflito consulta quantidade e capacidade persistidas antes de criar novo arquivo', async () => {
    const quando = '2026-10-21T14:00:00.000Z';
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: quando, atualizadoEm: quando };
    const lotados = Array.from({ length: 100 }, (_, indice) => ({
      id: 'a' + indice, projetoId: 'p', nome: 'nota-' + indice + '.md', conteudo: '', bytes: 0, versao: 1, criadoEm: quando, atualizadoEm: quando
    }));
    const porQuantidade = criarModuloComBanco({ projetos: [projeto], arquivos: lotados });
    const limiteArquivos = await porQuantidade.modulo.gravarCopiaConflito('p', 'nota.md', 'rascunho', '2026-10-21T14:02:00.000Z');
    assert.equal(limiteArquivos.gravada, false);
    assert.equal(limiteArquivos.erro, 'limite-arquivos');
    assert.equal(porQuantidade.mapas.arquivos.size, 100);

    const porCapacidade = criarModuloComBanco({
      projetos: [projeto],
      arquivos: [{ id: 'ocupado', projetoId: 'p', nome: 'ocupado.md', conteudo: '', bytes: 5 * 1024 * 1024, versao: 1, criadoEm: quando, atualizadoEm: quando }]
    });
    const limiteEspaco = await porCapacidade.modulo.gravarCopiaConflito('p', 'nota.md', 'rascunho', '2026-10-21T14:02:00.000Z');
    assert.equal(limiteEspaco.gravada, false);
    assert.equal(limiteEspaco.erro, 'workspace-cheio');
    assert.equal(porCapacidade.mapas.arquivos.size, 1);
  });

  await testa('cópia de conflito não cria filho sob projeto que outra guia moveu à lixeira', async () => {
    const quando = '2026-10-21T14:00:00.000Z';
    const projeto = { id: 'p', nome: 'Projeto recuperável', criadoEm: quando, atualizadoEm: quando, lixeiraEm: '2026-10-21T14:01:00.000Z', lixeiraRaiz: 'projeto', lixeiraProjetoId: 'p' };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projeto] });
    const resultado = await modulo.gravarCopiaConflito('p', 'nota.md', 'rascunho', '2026-10-21T14:02:00.000Z');
    assert.equal(resultado.gravada, false);
    assert.equal(resultado.erro, 'copia-conflito-projeto-inativo');
    assert.equal(mapas.arquivos.size, 0);
    assert.equal(mapas.projetos.get('p').lixeiraEm, projeto.lixeiraEm);
  });

  await testa('backup ativo decide o nome do projeto pela fotografia persistida antes do lote aditivo', async () => {
    const quando = '2026-10-21T15:00:00.000Z';
    const projetoAtual = { id: 'p-atual', nome: 'Projeto importado', criadoEm: quando, atualizadoEm: quando };
    const backup = {
      projetos: [{ id: 'origem', nome: 'Projeto importado' }],
      arquivos: [{ projetoId: 'origem', nome: 'entrada.md', conteudo: 'conteúdo do backup', bytes: 19 }]
    };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projetoAtual] });
    const resultado = await modulo.gravarLote(backup, '2026-10-21T15:01:00.000Z');
    assert.equal(resultado.erro, '');
    assert.equal(resultado.projetos.length, 1);
    assert.equal(resultado.arquivos.length, 1);
    assert.equal(resultado.projetos[0].nome, 'Projeto importado (2)');
    assert.equal(mapas.projetos.get('p-atual').nome, projetoAtual.nome);
    assert.equal(mapas.projetos.get(resultado.projetos[0].id).nome, 'Projeto importado (2)');
    assert.equal(mapas.arquivos.get(resultado.arquivos[0].id).projetoId, resultado.projetos[0].id);
    assert.equal(mapas.arquivos.get(resultado.arquivos[0].id).conteudo, 'conteúdo do backup');
  });

  await testa('backup ativo consulta os tetos persistidos e recusa o lote inteiro sem escrita parcial', async () => {
    const quando = '2026-10-21T15:00:00.000Z';
    const backup = {
      projetos: [{ id: 'origem', nome: 'Projeto importado' }],
      arquivos: [{ projetoId: 'origem', nome: 'entrada.md', conteudo: 'novo', bytes: 4 }]
    };
    const projetosLotados = Array.from({ length: 20 }, (_, indice) => ({ id: 'p' + indice, nome: 'Projeto ' + indice, criadoEm: quando, atualizadoEm: quando }));
    const porProjetos = criarModuloComBanco({ projetos: projetosLotados });
    const limiteProjetos = await porProjetos.modulo.gravarLote(backup, '2026-10-21T15:01:00.000Z');
    assert.equal(limiteProjetos.erro, 'limite-projetos');
    assert.equal(porProjetos.mapas.projetos.size, 20);
    assert.equal(porProjetos.mapas.arquivos.size, 0);

    const projeto = { id: 'p', nome: 'Projeto atual', criadoEm: quando, atualizadoEm: quando };
    const arquivosLotados = Array.from({ length: 100 }, (_, indice) => ({ id: 'a' + indice, projetoId: 'p', nome: 'nota-' + indice + '.md', conteudo: '', bytes: 0, versao: 1, criadoEm: quando, atualizadoEm: quando }));
    const porArquivos = criarModuloComBanco({ projetos: [projeto], arquivos: arquivosLotados });
    const limiteArquivos = await porArquivos.modulo.gravarLote(backup, '2026-10-21T15:01:00.000Z');
    assert.equal(limiteArquivos.erro, 'limite-arquivos');
    assert.equal(porArquivos.mapas.projetos.size, 1);
    assert.equal(porArquivos.mapas.arquivos.size, 100);

    const porCapacidade = criarModuloComBanco({
      projetos: [projeto],
      revisoes: [{ id: 'r', arquivoId: 'antigo', conteudo: '', bytes: 5 * 1024 * 1024, quando, versao: 1 }]
    });
    const limiteEspaco = await porCapacidade.modulo.gravarLote(backup, '2026-10-21T15:01:00.000Z');
    assert.equal(limiteEspaco.erro, 'workspace-cheio');
    assert.equal(porCapacidade.mapas.projetos.size, 1);
    assert.equal(porCapacidade.mapas.arquivos.size, 0);
    assert.equal(porCapacidade.mapas.revisoes.size, 1);
  });

  await testa('metadados de lixeira não usam rede nem removem revisões durante o movimento recuperável', () => {
    assert.match(fonte, /function estaNaLixeira\(registro\) \{ return !!\(registro && registro\.lixeiraEm\); \}/);
    const moverArquivo = entre(fonte, 'function moverArquivoParaLixeira(arquivo, quando)', '\n  function moverProjetoParaLixeira');
    assert.match(moverArquivo, /lixeiraRaiz: 'arquivo'/);
    assert.match(moverArquivo, /const leitura = arquivos\.get\(arquivo\.id\)/);
    assert.doesNotMatch(moverArquivo, /\.delete\(arquivo\.id\)|revisoes\.delete/);
    assert.match(fonte, /function apagarDefinitivamenteArquivo\(id\)/);
    assert.match(fonte, /async function esvaziarLixeira\(\)/);
  });

  await testa('não move arquivo desatualizado para a lixeira e conserva a versão persistida', async () => {
    const base = { id: 'a', projetoId: 'p', nome: 'nota.txt', conteudo: 'antes', bytes: 6, versao: 1, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' };
    const remoto = Object.assign({}, base, { conteudo: 'depois', bytes: 7, versao: 2, atualizadoEm: '2026-01-02T00:00:00.000Z' });
    const { modulo, mapas } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto', criadoEm: base.criadoEm, atualizadoEm: base.atualizadoEm }], arquivos: [remoto]
    });
    const resultado = await modulo.moverArquivoParaLixeira(base, '2026-01-03T00:00:00.000Z');
    assert.equal(resultado.conflito, true);
    assert.equal(mapas.arquivos.get('a').conteudo, 'depois');
    assert.equal(mapas.arquivos.get('a').lixeiraEm, undefined);
  });

  await testa('não move projeto quando um filho mudou depois da fotografia confirmada', async () => {
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' };
    const arquivo = { id: 'a', projetoId: 'p', nome: 'nota.txt', conteudo: 'antes', bytes: 6, versao: 1, criadoEm: projeto.criadoEm, atualizadoEm: projeto.atualizadoEm };
    const remoto = Object.assign({}, arquivo, { conteudo: 'depois', bytes: 7, versao: 2, atualizadoEm: '2026-01-02T00:00:00.000Z' });
    const { modulo, mapas } = criarModuloComBanco({ projetos: [projeto], arquivos: [remoto] });
    const resultado = await modulo.moverProjetoParaLixeira(projeto, [arquivo], '2026-01-03T00:00:00.000Z');
    assert.equal(resultado.conflito, true);
    assert.equal(mapas.projetos.get('p').lixeiraEm, undefined);
    assert.equal(mapas.arquivos.get('a').conteudo, 'depois');
    assert.equal(mapas.arquivos.get('a').lixeiraEm, undefined);
  });

  await testa('clique de projeto em tela antiga não move filho que outra guia atualizou', async () => {
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' };
    const antigo = { id: 'a', projetoId: 'p', nome: 'nota.txt', conteudo: 'antes', bytes: 6, versao: 1, criadoEm: projeto.criadoEm, atualizadoEm: projeto.atualizadoEm };
    const remoto = Object.assign({}, antigo, { conteudo: 'depois', bytes: 7, versao: 2, atualizadoEm: '2026-01-02T00:00:00.000Z' });
    const { modulo, mapas, status } = criarModuloComBanco({ projetos: [projeto], arquivos: [remoto] });
    Object.assign(modulo.estado, { projetos: [projeto], arquivos: [antigo], projetoAtivo: 'p', arquivoAtivo: '', alterado: false, itensLixeira: 0 });
    await modulo.apagarProjeto();
    assert.equal(mapas.projetos.get('p').lixeiraEm, undefined);
    assert.equal(mapas.arquivos.get('a').conteudo, 'depois');
    assert.equal(mapas.arquivos.get('a').lixeiraEm, undefined);
    assert.match(status(), /mudou em outra guia/i);
  });

  await testa('clique de projeto em tela antiga não devolve à lixeira filho restaurado por outra guia', async () => {
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' };
    const restaurado = { id: 'a', projetoId: 'p', nome: 'voltou.txt', conteudo: 'ativo', bytes: 5, versao: 1, criadoEm: projeto.criadoEm, atualizadoEm: '2026-01-02T00:00:00.000Z' };
    const { modulo, mapas, status } = criarModuloComBanco({ projetos: [projeto], arquivos: [restaurado] });
    // Esta guia só tinha visto o arquivo quando ele ainda era uma raiz da Lixeira.
    Object.assign(modulo.estado, { projetos: [projeto], arquivos: [], projetoAtivo: 'p', arquivoAtivo: '', alterado: false, itensLixeira: 1 });
    await modulo.apagarProjeto();
    assert.equal(mapas.projetos.get('p').lixeiraEm, undefined);
    assert.equal(mapas.arquivos.get('a').lixeiraEm, undefined);
    assert.match(status(), /mudou em outra guia/i);
  });

  await testa('restauração resolve nome com a fotografia atual da transação', async () => {
    const { modulo, mapas } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto', criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      arquivos: [
        { id: 'a', projetoId: 'p', nome: 'nota.txt', conteudo: 'recuperar', bytes: 10, versao: 1, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-01T00:00:00.000Z', lixeiraEm: '2026-01-02T00:00:00.000Z', lixeiraRaiz: 'arquivo', lixeiraProjetoId: 'p' },
        { id: 'b', projetoId: 'p', nome: 'nota.txt', conteudo: 'atual', bytes: 5, versao: 1, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-03T00:00:00.000Z' }
      ]
    });
    Object.assign(modulo.estado, { projetos: [{ id: 'p', nome: 'Projeto' }], arquivos: [], projetoAtivo: 'p', arquivoAtivo: '', alterado: false, itensLixeira: 1 });
    await modulo.restaurarDaLixeira('arquivo', 'a');
    assert.equal(mapas.arquivos.get('a').nome, 'nota (2).txt');
    assert.equal(mapas.arquivos.get('a').lixeiraEm, undefined);
  });

  await testa('não descarta projeto da lixeira se um filho voltou a ficar ativo em outra guia', async () => {
    const { modulo, mapas, status } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto', criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-02T00:00:00.000Z', lixeiraEm: '2026-01-02T00:00:00.000Z', lixeiraRaiz: 'projeto', lixeiraProjetoId: 'p' }],
      arquivos: [{ id: 'a', projetoId: 'p', nome: 'voltou.txt', conteudo: 'ativo', bytes: 5, versao: 1, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-03T00:00:00.000Z' }]
    });
    Object.assign(modulo.estado, { projetos: [], arquivos: [], alterado: false, itensLixeira: 1 });
    await modulo.descartarDaLixeira('projeto', 'p');
    assert.equal(mapas.projetos.has('p'), true);
    assert.equal(mapas.arquivos.has('a'), true);
    assert.match(status(), /mudou em outra guia/i);
  });

  await testa('esvaziar lixeira também preserva projeto com filho ativo surgido em outra guia', async () => {
    const { modulo, mapas, status } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto', criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-02T00:00:00.000Z', lixeiraEm: '2026-01-02T00:00:00.000Z', lixeiraRaiz: 'projeto', lixeiraProjetoId: 'p' }],
      arquivos: [{ id: 'a', projetoId: 'p', nome: 'voltou.txt', conteudo: 'ativo', bytes: 5, versao: 1, criadoEm: '2026-01-01T00:00:00.000Z', atualizadoEm: '2026-01-03T00:00:00.000Z' }]
    });
    Object.assign(modulo.estado, { projetos: [], arquivos: [], alterado: false, itensLixeira: 1 });
    await modulo.esvaziarLixeira();
    assert.equal(mapas.projetos.has('p'), true);
    assert.equal(mapas.arquivos.has('a'), true);
    assert.match(status(), /mudou em outra guia/i);
  });

  await testa('arquivo vai à lixeira, mantém revisão, restaura e só libera espaço no descarte definitivo', async () => {
    const { modulo, mapas, status } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto', atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      arquivos: [{ id: 'a', projetoId: 'p', nome: 'nota.txt', conteudo: 'atual', bytes: 6, versao: 1, atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      revisoes: [{ id: 'r', arquivoId: 'a', conteudo: 'antes', bytes: 6, quando: '2026-01-01T00:00:00.000Z' }]
    });
    Object.assign(modulo.estado, {
      projetos: [{ id: 'p', nome: 'Projeto', atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      arquivos: [{ id: 'a', projetoId: 'p', nome: 'nota.txt', conteudo: 'atual', bytes: 6, versao: 1, atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      projetoAtivo: 'p', arquivoAtivo: 'a', alterado: false, bytesOcupados: 12
    });
    await modulo.apagarArquivo();
    assert.equal(modulo.estado.arquivos.length, 0);
    assert.equal(mapas.arquivos.get('a').lixeiraRaiz, 'arquivo');
    assert.equal(mapas.revisoes.has('r'), true, 'a revisão fica recuperável');
    await modulo.restaurarDaLixeira('arquivo', 'a');
    assert.equal(modulo.estado.arquivoAtivo, 'a');
    assert.equal(mapas.arquivos.get('a').lixeiraEm, undefined);
    await modulo.apagarArquivo();
    await modulo.descartarDaLixeira('arquivo', 'a');
    assert.equal(mapas.arquivos.has('a'), false);
    assert.equal(mapas.revisoes.has('r'), false);
    assert.equal(modulo.estado.bytesOcupados, 0);
    assert.match(status(), /removido definitivamente/i);
  });

  await testa('esvaziar lixeira remove apenas raízes descartadas e suas versões', async () => {
    const { modulo, mapas } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto ativo' }],
      arquivos: [
        { id: 'a', projetoId: 'p', nome: 'na-lixeira.txt', conteudo: 'A', bytes: 1, lixeiraEm: '2026-01-01T00:00:00.000Z', lixeiraRaiz: 'arquivo', lixeiraProjetoId: 'p' },
        { id: 'b', projetoId: 'p', nome: 'ativo.txt', conteudo: 'B', bytes: 1 }
      ],
      revisoes: [{ id: 'ra', arquivoId: 'a', conteudo: 'AA', bytes: 2 }, { id: 'rb', arquivoId: 'b', conteudo: 'BB', bytes: 2 }]
    });
    Object.assign(modulo.estado, { projetos: [{ id: 'p', nome: 'Projeto ativo' }], arquivos: [{ id: 'b', projetoId: 'p', nome: 'ativo.txt', conteudo: 'B', bytes: 1 }], itensLixeira: 1, bytesOcupados: 6 });
    await modulo.esvaziarLixeira();
    assert.equal(mapas.arquivos.has('a'), false);
    assert.equal(mapas.revisoes.has('ra'), false);
    assert.equal(mapas.arquivos.has('b'), true);
    assert.equal(mapas.revisoes.has('rb'), true);
    assert.equal(modulo.estado.bytesOcupados, 3);
  });

  await testa('projeto absorve filho já removido, restaura a hierarquia e preserva revisões', async () => {
    const arquivoAtivo = { id: 'a', projetoId: 'p', nome: 'ativo.txt', conteudo: 'A', bytes: 1, versao: 1, atualizadoEm: '2026-01-01T00:00:00.000Z' };
    const arquivoJaNaLixeira = { id: 'b', projetoId: 'p', nome: 'antes.txt', conteudo: 'B', bytes: 1, versao: 1, atualizadoEm: '2026-01-01T00:00:00.000Z', lixeiraEm: '2026-01-02T00:00:00.000Z', lixeiraRaiz: 'arquivo', lixeiraProjetoId: 'p' };
    const { modulo, mapas } = criarModuloComBanco({
      projetos: [{ id: 'p', nome: 'Projeto A', atualizadoEm: '2026-01-01T00:00:00.000Z' }, { id: 'q', nome: 'Projeto B', atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      arquivos: [arquivoAtivo, arquivoJaNaLixeira],
      revisoes: [{ id: 'ra', arquivoId: 'a', conteudo: 'AA', bytes: 2 }, { id: 'rb', arquivoId: 'b', conteudo: 'BB', bytes: 2 }]
    });
    Object.assign(modulo.estado, {
      projetos: [{ id: 'p', nome: 'Projeto A', atualizadoEm: '2026-01-01T00:00:00.000Z' }, { id: 'q', nome: 'Projeto B', atualizadoEm: '2026-01-01T00:00:00.000Z' }],
      arquivos: [Object.assign({}, arquivoAtivo)], projetoAtivo: 'p', arquivoAtivo: 'a', alterado: false, bytesOcupados: 6
    });
    await modulo.apagarProjeto();
    assert.equal(mapas.projetos.get('p').lixeiraRaiz, 'projeto');
    assert.equal(mapas.arquivos.get('a').lixeiraRaiz, '');
    assert.equal(mapas.arquivos.get('b').lixeiraRaiz, '', 'filho previamente removido deixa de ser raiz órfã');
    await modulo.restaurarDaLixeira('projeto', 'p');
    assert.equal(modulo.estado.projetos.some((projeto) => projeto.id === 'p'), true);
    assert.equal(modulo.estado.arquivos.filter((arquivo) => arquivo.projetoId === 'p').length, 2);
    assert.equal(mapas.arquivos.get('b').lixeiraEm, undefined);
    assert.equal(mapas.revisoes.has('ra'), true);
    assert.equal(mapas.revisoes.has('rb'), true);
    await modulo.apagarProjeto();
    await modulo.descartarDaLixeira('projeto', 'p');
    assert.equal(mapas.projetos.has('p'), false);
    assert.equal(mapas.arquivos.has('a'), false);
    assert.equal(mapas.arquivos.has('b'), false);
    assert.equal(mapas.revisoes.has('ra'), false);
    assert.equal(mapas.revisoes.has('rb'), false);
  });

  await testa('criações de projeto decidem nome e projeto inicial dentro da transação atual', async () => {
    const quando = '2026-10-21T12:00:00.000Z';
    const criacoes = criarModuloComBanco({ projetos: [] });
    const primeiro = await criacoes.modulo.criarProjetoTransacional('Projeto', quando, false);
    const segundo = await criacoes.modulo.criarProjetoTransacional('Projeto', quando, false);
    assert.equal(primeiro.criado, true);
    assert.equal(segundo.criado, true);
    assert.equal(primeiro.projeto.nome, 'Projeto');
    assert.equal(segundo.projeto.nome, 'Projeto (2)');
    assert.equal(criacoes.mapas.projetos.size, 2);

    const aberturaVazia = criarModuloComBanco({ projetos: [] });
    const inicial = await aberturaVazia.modulo.criarProjetoTransacional('Meu workspace', quando, true);
    const inicialRepetido = await aberturaVazia.modulo.criarProjetoTransacional('Meu workspace', quando, true);
    assert.equal(inicial.criado, true);
    assert.equal(inicialRepetido.criado, false);
    assert.equal(aberturaVazia.mapas.projetos.size, 1, 'a segunda abertura vazia reutiliza um projeto ativo em vez de duplicá-lo');
  });

  await testa('criação de arquivo não reativa projeto que outra guia já levou à lixeira', async () => {
    const antes = { id: 'p', nome: 'Projeto antigo', criadoEm: '2026-10-21T10:00:00.000Z', atualizadoEm: '2026-10-21T10:00:00.000Z' };
    const naLixeira = Object.assign({}, antes, { lixeiraEm: '2026-10-21T10:01:00.000Z', lixeiraRaiz: 'projeto', lixeiraProjetoId: 'p' });
    const { modulo, mapas } = criarModuloComBanco({ projetos: [naLixeira] });
    const resultado = await modulo.criarArquivoTransacional('p', 'novo.md', 'texto local', '2026-10-21T10:02:00.000Z');
    assert.equal(resultado.conflito, true);
    assert.equal(mapas.projetos.get('p').lixeiraEm, naLixeira.lixeiraEm);
    assert.equal(mapas.projetos.get('p').nome, naLixeira.nome);
    assert.equal(mapas.arquivos.size, 0, 'o filho não pode ser criado sob projeto recuperável');
  });

  await testa('criação preserva o projeto persistido que outra guia renomeou e calcula o nome corrente', async () => {
    const antigo = { id: 'p', nome: 'Nome visto antes', criadoEm: '2026-10-21T10:00:00.000Z', atualizadoEm: '2026-10-21T10:00:00.000Z' };
    const remoto = Object.assign({}, antigo, { nome: 'Nome definido na outra guia', atualizadoEm: '2026-10-21T10:01:00.000Z' });
    const existente = { id: 'a', projetoId: 'p', nome: 'novo.md', conteudo: 'anterior', bytes: 8, versao: 1, criadoEm: antigo.criadoEm, atualizadoEm: antigo.atualizadoEm };
    const { modulo, mapas } = criarModuloComBanco({ projetos: [remoto], arquivos: [existente] });
    const resultado = await modulo.criarArquivoTransacional('p', 'novo.md', 'texto', '2026-10-21T10:02:00.000Z');
    assert.equal(resultado.conflito, false);
    assert.equal(resultado.arquivo.nome, 'novo (2).md');
    assert.equal(mapas.projetos.get('p').nome, remoto.nome, 'a criação não regrava nome da fotografia antiga');
    assert.equal(mapas.arquivos.size, 2);
  });

  await testa('criação consulta as cotas persistidas antes de escrever sob fotografia antiga', async () => {
    const projeto = { id: 'p', nome: 'Projeto', criadoEm: '2026-10-21T10:00:00.000Z', atualizadoEm: '2026-10-21T10:00:00.000Z' };
    const lotados = Array.from({ length: 100 }, (_, indice) => ({
      id: 'a' + indice, projetoId: 'p', nome: 'nota-' + indice + '.md', conteudo: '', bytes: 0, versao: 1, criadoEm: projeto.criadoEm, atualizadoEm: projeto.atualizadoEm
    }));
    const porQuantidade = criarModuloComBanco({ projetos: [projeto], arquivos: lotados });
    await assert.rejects(
      () => porQuantidade.modulo.criarArquivoTransacional('p', 'nova.md', 'texto', '2026-10-21T10:02:00.000Z'),
      (erro) => erro && erro.codigoWorkspace === 'limite-arquivos'
    );
    assert.equal(porQuantidade.mapas.arquivos.size, 100);

    const cheio = criarModuloComBanco({
      projetos: [projeto],
      arquivos: [{ id: 'ocupado', projetoId: 'p', nome: 'ocupado.md', conteudo: '', bytes: 5 * 1024 * 1024, versao: 1, criadoEm: projeto.criadoEm, atualizadoEm: projeto.atualizadoEm }]
    });
    await assert.rejects(
      () => cheio.modulo.criarArquivoTransacional('p', 'nova.md', 'texto', '2026-10-21T10:02:00.000Z'),
      (erro) => erro && erro.codigoWorkspace === 'workspace-cheio'
    );
    assert.equal(cheio.mapas.arquivos.size, 1);
  });

  await testa('renomeação de tela antiga não recupera nem sobrescreve projeto alterado por outra guia', async () => {
    const antes = { id: 'p', nome: 'Projeto antigo', criadoEm: '2026-10-21T10:00:00.000Z', atualizadoEm: '2026-10-21T10:00:00.000Z' };
    const removido = Object.assign({}, antes, { lixeiraEm: '2026-10-21T10:01:00.000Z', lixeiraRaiz: 'projeto', lixeiraProjetoId: 'p' });
    const { modulo, mapas } = criarModuloComBanco({ projetos: [removido] });
    const lixeira = await modulo.renomearProjetoTransacional(antes, 'Tentativa antiga', '2026-10-21T10:02:00.000Z');
    assert.equal(lixeira.conflito, true);
    assert.equal(mapas.projetos.get('p').nome, removido.nome);
    assert.equal(mapas.projetos.get('p').lixeiraEm, removido.lixeiraEm);

    const remoto = Object.assign({}, antes, { nome: 'Nome definido na outra guia', atualizadoEm: '2026-10-21T10:03:00.000Z' });
    const outro = criarModuloComBanco({ projetos: [remoto] });
    const alterado = await outro.modulo.renomearProjetoTransacional(antes, 'Tentativa antiga', '2026-10-21T10:04:00.000Z');
    assert.equal(alterado.conflito, true);
    assert.equal(outro.mapas.projetos.get('p').nome, remoto.nome);
  });

  console.log(`${certos}/${certos + falhas} testes de integridade local passaram`);
  process.exitCode = falhas ? 1 : 0;
}
principal();
