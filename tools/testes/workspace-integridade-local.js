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
const planejadorFonte = entre(fonte, 'async function planejarArmazenamentoParaSalvar(anterior, atualizado)', '\n\n  function ordenarProjetos');

function planejar({ ocupacao, anterior, atualizado, revisoes, total = 12, porArquivo = 2 }) {
  const contexto = {
    estado: { bytesOcupados: ocupacao },
    LIMITES: { totalBytes: total, revisoesPorArquivo: porArquivo },
    lerTodos: async () => revisoes,
    LOJAS: { revisoes: 'revisoes' },
    bytesRegistro: (registro) => {
      const declarado = Number(registro && registro.bytes);
      return Number.isFinite(declarado) && declarado >= 0 ? declarado : String((registro && registro.conteudo) || '').length;
    },
    bytes: (valor) => String(valor == null ? '' : valor).length,
    texto: (valor) => String(valor == null ? '' : valor),
    erro: (codigo) => { const e = new Error(codigo); e.codigoWorkspace = codigo; return e; },
    Map, Math, Number, String
  };
  contexto.globalThis = contexto;
  vm.runInNewContext(planejadorFonte + '\nglobalThis.planejarTeste = planejarArmazenamentoParaSalvar;', contexto);
  return contexto.planejarTeste(anterior, atualizado);
}

// Executa o módulo real em VM com IndexedDB/DOM substituídos apenas para conferir
// as transições locais; o ativo de produção não recebe ganchos de teste.
function criarModuloComBanco(registros) {
  const marcador = '  window.ReboclWorkspace = Object.freeze';
  const inicio = fonte.indexOf(marcador);
  assert(inicio >= 0, 'ponto de montagem do módulo não encontrado');
  const fonteTestavel = fonte.slice(0, inicio) + `  window.__workspaceTeste = {
    estado, apagarArquivo, apagarProjeto, restaurarDaLixeira, descartarDaLixeira, esvaziarLixeira,
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
      const tx = {
        objectStore: (loja) => ({
          put: (item) => mapas[loja].set(item.id || item.chave, Object.assign({}, item)),
          delete: (chave) => mapas[loja].delete(chave)
        })
      };
      queueMicrotask(() => { if (typeof tx.oncomplete === 'function') tx.oncomplete(); });
      return tx;
    }
  };
  let status = '';
  const contexto = {
    window: { crypto: { randomUUID: () => 'id-controlado' } },
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

  await testa('recusa apenas quando o conteúdo atual por si só ultrapassa a capacidade', async () => {
    await assert.rejects(() => planejar({
      ocupacao: 5,
      anterior: { id: 'a', conteudo: 'aa', bytes: 2 },
      atualizado: { id: 'a', conteudo: 'bbbbbb', bytes: 6 },
      revisoes: [],
      total: 5
    }), (erro) => erro && erro.codigoWorkspace === 'workspace-cheio');
  });

  await testa('metadados de lixeira não usam rede nem removem revisões durante o movimento recuperável', () => {
    assert.match(fonte, /function estaNaLixeira\(registro\) \{ return !!\(registro && registro\.lixeiraEm\); \}/);
    const moverArquivo = entre(fonte, 'async function apagarArquivo()', '\n  async function restaurarProjetoDaLixeira');
    assert.match(moverArquivo, /lixeiraRaiz: 'arquivo'/);
    assert.doesNotMatch(moverArquivo, /\.delete\(arquivo\.id\)|revisoes\.delete/);
    assert.match(fonte, /async function apagarDefinitivamenteArquivo\(id\)/);
    assert.match(fonte, /async function esvaziarLixeira\(\)/);
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

  console.log(`${certos}/${certos + falhas} testes de integridade local passaram`);
  process.exitCode = falhas ? 1 : 0;
}
principal();
