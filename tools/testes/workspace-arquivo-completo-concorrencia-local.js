// Contrato executável da recuperação completa: uma fotografia confirmada não
// pode limpar projetos, arquivos ou versões que outra guia mudou depois.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const fonte = fs.readFileSync(path.join(raiz, 'chat-workspace.js'), 'utf8');
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  return Promise.resolve().then(fn).then(() => {
    certos++;
    console.log('✔ ' + nome);
  }, (erro) => {
    falhas++;
    console.error('✘ ' + nome + ' — ' + erro.message);
  });
}
function copia(valor) { return JSON.parse(JSON.stringify(valor)); }
function normalizar(valor) { return JSON.parse(JSON.stringify(valor)); }

function bancoControlado(registros) {
  const lojas = ['projetos', 'arquivos', 'revisoes', 'meta'];
  const chave = (registro) => registro.id || registro.chave;
  const mapas = Object.fromEntries(lojas.map((loja) => [
    loja,
    new Map((registros[loja] || []).map((registro) => [chave(registro), copia(registro)]))
  ]));
  const banco = {
    transaction: () => {
      let pendentes = 0;
      let fimAgendado = false;
      let concluida = false;
      const tx = {};
      const concluir = () => {
        if (fimAgendado || concluida) return;
        fimAgendado = true;
        queueMicrotask(() => {
          fimAgendado = false;
          if (!pendentes && !concluida) {
            concluida = true;
            if (typeof tx.oncomplete === 'function') tx.oncomplete();
          }
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
            concluir();
          }
        });
        return requisicao;
      };
      tx.objectStore = (loja) => ({
        getAll: () => pedido(() => [...mapas[loja].values()].map(copia)),
        clear: () => mapas[loja].clear(),
        put: (registro) => mapas[loja].set(chave(registro), copia(registro))
      });
      concluir();
      return tx;
    }
  };
  return { banco, mapas };
}

function moduloComBanco(registros) {
  const marcador = '  window.ReboclWorkspace = Object.freeze';
  const inicio = fonte.indexOf(marcador);
  assert(inicio >= 0, 'ponto de montagem do Workspace não encontrado');
  const fonteTestavel = fonte.slice(0, inicio) + `  window.__arquivoCompletoConcorrencia = {
    lerFotografiaArquivoCompleto, substituirArquivoCompleto, fotografiaArquivoCompletoAindaIgual, fotografiaArquivoCompletoParaBanco,
    substituir: (dependencias) => { if (dependencias.abrirBanco) abrirBanco = dependencias.abrirBanco; }
  };
})();\n`;
  const { banco, mapas } = bancoControlado(registros);
  const contexto = {
    window: { crypto: { randomUUID: () => 'controle' } },
    TextEncoder, Map, Set, Promise, Date, Math, Number, String, Object, Array, JSON
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(fonteTestavel, contexto, { filename: 'chat-workspace.js' });
  const modulo = contexto.window.__arquivoCompletoConcorrencia;
  modulo.substituir({ abrirBanco: async () => banco });
  return { modulo, mapas };
}

const quando = '2026-10-21T12:00:00.000Z';
function origem() {
  return {
    projetos: [{ id: 'projeto-origem', nome: 'Origem', criadoEm: quando, atualizadoEm: quando }],
    arquivos: [{ id: 'arquivo-origem', projetoId: 'projeto-origem', nome: 'nota.md', conteudo: 'texto original', bytes: 14, versao: 2, criadoEm: quando, atualizadoEm: quando }],
    revisoes: [{ id: 'revisao-origem', arquivoId: 'arquivo-origem', conteudo: 'texto anterior', bytes: 14, quando, versao: 1 }],
    meta: [{ chave: 'selecao', valor: { projetoId: 'projeto-origem', arquivoId: 'arquivo-origem' } }]
  };
}
function destino() {
  return {
    projetos: [{ id: 'projeto-destino', nome: 'Destino', criadoEm: quando, atualizadoEm: quando, lixeiraEm: null, lixeiraRaiz: null, lixeiraProjetoId: null }],
    arquivos: [{ id: 'arquivo-destino', projetoId: 'projeto-destino', nome: 'recuperado.md', conteudo: 'texto recuperado', bytes: 16, versao: 1, criadoEm: quando, atualizadoEm: quando, lixeiraEm: null, lixeiraRaiz: null, lixeiraProjetoId: null }],
    revisoes: [{ id: 'revisao-destino', arquivoId: 'arquivo-destino', conteudo: 'versão anterior', bytes: 15, quando, versao: 1 }]
  };
}

async function principal() {
  await testa('fotografia das três lojas é copiada antes de uma alteração concorrente', async () => {
    const { modulo, mapas } = moduloComBanco(origem());
    const fotografia = await modulo.lerFotografiaArquivoCompleto();
    mapas.arquivos.get('arquivo-origem').conteudo = 'mudança de outra guia';
    mapas.arquivos.get('arquivo-origem').bytes = 22;
    assert.equal(fotografia.arquivos[0].conteudo, 'texto original');
    assert.equal(fotografia.revisoes[0].conteudo, 'texto anterior');
  });

  await testa('restauração conflitada não limpa nem substitui conteúdo alterado depois da fotografia', async () => {
    const { modulo, mapas } = moduloComBanco(origem());
    const fotografia = await modulo.lerFotografiaArquivoCompleto();
    const remoto = mapas.arquivos.get('arquivo-origem');
    remoto.conteudo = 'texto que outra guia salvou';
    remoto.bytes = 27;
    remoto.versao = 3;
    remoto.atualizadoEm = '2026-10-21T12:01:00.000Z';
    const resultado = await modulo.substituirArquivoCompleto(destino(), fotografia);
    assert.deepEqual(normalizar(resultado), { substituido: false, conflito: true });
    assert.equal(mapas.projetos.get('projeto-origem').nome, 'Origem');
    assert.equal(mapas.arquivos.get('arquivo-origem').conteudo, 'texto que outra guia salvou');
    assert.equal(mapas.revisoes.get('revisao-origem').conteudo, 'texto anterior');
    assert.equal(mapas.projetos.has('projeto-destino'), false);
    assert.equal(mapas.meta.has('selecao'), true);
  });

  await testa('fotografia idêntica permite troca atômica e só então limpa seleção local', async () => {
    const { modulo, mapas } = moduloComBanco(origem());
    const fotografia = await modulo.lerFotografiaArquivoCompleto();
    const resultado = await modulo.substituirArquivoCompleto(destino(), fotografia);
    assert.deepEqual(normalizar(resultado), { substituido: true, conflito: false });
    assert.equal(mapas.projetos.has('projeto-origem'), false);
    assert.equal(mapas.arquivos.has('arquivo-origem'), false);
    assert.equal(mapas.revisoes.has('revisao-origem'), false);
    assert.equal(mapas.projetos.get('projeto-destino').nome, 'Destino');
    assert.equal(mapas.arquivos.get('arquivo-destino').conteudo, 'texto recuperado');
    assert.equal(mapas.revisoes.get('revisao-destino').conteudo, 'versão anterior');
    assert.equal(mapas.meta.size, 0);
  });

  await testa('ponto de desfazer recusa arquivo, projeto ou revisão que surgiu após a recuperação', async () => {
    const { modulo } = moduloComBanco(origem());
    const esperada = modulo.fotografiaArquivoCompletoParaBanco(destino());
    const atual = copia(esperada);
    atual.projetos[0].nome = 'Projeto alterado depois da restauração';
    assert.equal(modulo.fotografiaArquivoCompletoAindaIgual(atual, esperada), false);
    atual.projetos[0] = copia(esperada.projetos[0]);
    atual.revisoes[0].conteudo = 'revisão alterada depois da restauração';
    assert.equal(modulo.fotografiaArquivoCompletoAindaIgual(atual, esperada), false);
    atual.revisoes[0] = copia(esperada.revisoes[0]);
    atual.arquivos.push({ id: 'arquivo-novo', projetoId: 'projeto-destino', nome: 'novo.md', conteudo: 'novo', bytes: 4, versao: 1, criadoEm: quando, atualizadoEm: quando });
    assert.equal(modulo.fotografiaArquivoCompletoAindaIgual(atual, esperada), false);
  });

  console.log(`${certos}/${certos + falhas} testes da concorrência do arquivo completo local passaram`);
  process.exitCode = falhas ? 1 : 0;
}
principal();
