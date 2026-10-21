// Contrato do projeto portátil do Workspace: cópia aditiva de um projeto,
// com versões e lixeira locais, sem substituir o Workspace ou usar rede.
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
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio), b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
function bytes(valor) { return Buffer.byteLength(String(valor), 'utf8'); }
function copia(valor) { return JSON.parse(JSON.stringify(valor)); }
function runtime() {
  const document = { readyState: 'complete', getElementById: () => null, addEventListener: () => {} };
  const window = { crypto: { randomUUID: () => 'fixture' } };
  const contexto = {
    window, document, TextEncoder, Date, Number, String, Object, Array, Set, Map,
    Promise, JSON, Math, console, setTimeout, clearTimeout
  };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto, { filename: 'chat-workspace.js' });
  return contexto.window.ReboclWorkspace.projetoPortatil;
}
function erroCodigo(fn, codigo) {
  assert.throws(fn, (erro) => erro && erro.codigoWorkspace === codigo);
}
function fixture(api) {
  const quando = '2026-10-21T12:00:00.000Z';
  return {
    formato: api.formato,
    versao: api.versao,
    exportadoEm: quando,
    projeto: { id: 'projeto-origem', nome: 'Projeto portátil', criadoEm: quando, atualizadoEm: quando },
    arquivos: [
      { id: 'arquivo-ativo', projetoId: 'projeto-origem', nome: 'nota.md', conteudo: 'conteúdo ativo', bytes: bytes('conteúdo ativo'), versao: 2, criadoEm: quando, atualizadoEm: quando, lixeiraEm: null, lixeiraRaiz: null, lixeiraProjetoId: null },
      { id: 'arquivo-lixeira', projetoId: 'projeto-origem', nome: 'apagado.md', conteudo: 'conteúdo recuperável', bytes: bytes('conteúdo recuperável'), versao: 2, criadoEm: quando, atualizadoEm: quando, lixeiraEm: quando, lixeiraRaiz: 'arquivo', lixeiraProjetoId: 'projeto-origem' }
    ],
    revisoes: [
      { id: 'revisao-ativa', arquivoId: 'arquivo-ativo', conteudo: 'conteúdo anterior', bytes: bytes('conteúdo anterior'), quando, versao: 1 },
      { id: 'revisao-lixeira', arquivoId: 'arquivo-lixeira', conteudo: 'conteúdo recuperável anterior', bytes: bytes('conteúdo recuperável anterior'), quando, versao: 1 }
    ]
  };
}

testa('expõe um formato separado, finito e sem transporte para projeto portátil', () => {
  const api = runtime();
  assert.equal(api.formato, 'rebocl-workspace-projeto');
  assert.equal(api.versao, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(api.limites)), { bytes: 8388608, arquivos: 500, revisoes: 4000 });
  assert.equal(typeof api.validar, 'function');
  assert.doesNotMatch(fonte, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(?/);
  assert.doesNotMatch(fonte, /\b(localStorage|sessionStorage|Authorization|github_pat_|gh[pousr]_)\b/i);
});

testa('aceita um projeto com arquivo ativo, versões e arquivo recuperável na lixeira', () => {
  const api = runtime();
  const dados = fixture(api);
  const valido = api.validar(dados, bytes(JSON.stringify(dados)));
  assert.equal(valido.projeto.nome, 'Projeto portátil');
  assert.equal(valido.arquivos.length, 2);
  assert.equal(valido.revisoes.length, 2);
  assert.equal(valido.arquivos.find((arquivo) => arquivo.id === 'arquivo-ativo').lixeiraEm, null);
  assert.equal(valido.arquivos.find((arquivo) => arquivo.id === 'arquivo-lixeira').lixeiraRaiz, 'arquivo');
  assert.equal(JSON.stringify(valido), JSON.stringify(dados), 'normalização não deve acrescentar campos ao arquivo portátil');
});

testa('rejeita esquema aberto, outro projeto, lixo hierárquico e revisões quebradas antes da escrita', () => {
  const api = runtime();
  const base = fixture(api);
  const aberto = copia(base);
  aberto.extra = true;
  erroCodigo(() => api.validar(aberto, bytes(JSON.stringify(aberto))), 'projeto-portatil-invalido');

  const outroProjeto = copia(base);
  outroProjeto.arquivos[0].projetoId = 'projeto-estranho';
  erroCodigo(() => api.validar(outroProjeto, bytes(JSON.stringify(outroProjeto))), 'projeto-portatil-invalido');

  const lixoProjeto = copia(base);
  lixoProjeto.arquivos[1].lixeiraRaiz = 'projeto';
  erroCodigo(() => api.validar(lixoProjeto, bytes(JSON.stringify(lixoProjeto))), 'projeto-portatil-invalido');

  const revisaoOrfa = copia(base);
  revisaoOrfa.revisoes[0].arquivoId = 'arquivo-ausente';
  erroCodigo(() => api.validar(revisaoOrfa, bytes(JSON.stringify(revisaoOrfa))), 'projeto-portatil-invalido');

  const revisaoAtual = copia(base);
  revisaoAtual.revisoes[0].versao = 2;
  erroCodigo(() => api.validar(revisaoAtual, bytes(JSON.stringify(revisaoAtual))), 'projeto-portatil-invalido');

  const bytesFalsos = copia(base);
  bytesFalsos.arquivos[0].bytes++;
  erroCodigo(() => api.validar(bytesFalsos, bytes(JSON.stringify(bytesFalsos))), 'projeto-portatil-invalido');
});

testa('rejeita tamanho não estrito e teto portátil antes de parsear ou importar', () => {
  const api = runtime();
  const dados = fixture(api);
  erroCodigo(() => api.validar(dados, String(bytes(JSON.stringify(dados)))), 'projeto-portatil-invalido');
  erroCodigo(() => api.validar(dados, api.limites.bytes + 1), 'projeto-portatil-grande');

  const excesso = copia(dados);
  excesso.arquivos[0].versao = 20;
  for (let indice = 0; indice < 12; indice++) {
    const conteudo = 'r' + indice;
    excesso.revisoes.push({ id: 'extra-' + indice, arquivoId: 'arquivo-ativo', conteudo, bytes: bytes(conteudo), quando: excesso.exportadoEm, versao: indice + 2 });
  }
  erroCodigo(() => api.validar(excesso, bytes(JSON.stringify(excesso))), 'projeto-portatil-excesso');
});

testa('exportação coleta somente o projeto ativo e importação adiciona registros novos numa transação', () => {
  const montar = entre(fonte, 'async function montarProjetoPortatil()', '\n  function resumoProjetoPortatil');
  const preparar = entre(fonte, 'function prepararImportacaoProjetoPortatil(backup)', '\n  function gravarProjetoPortatil');
  const gravar = entre(fonte, 'function gravarProjetoPortatil(plano)', '\n  async function exportarProjetoPortatil');
  const importar = entre(fonte, 'async function importarProjetoPortatil(file)', '\n\n  async function exportarWorkspace');
  assert.match(montar, /arquivo\.projetoId === projeto\.id/);
  assert.match(montar, /idsArquivos\.has\(texto\(revisao\.arquivoId\)\)/);
  assert.match(montar, /validarProjetoPortatil/);
  assert.match(preparar, /idNovo\('projeto'\)/);
  assert.match(preparar, /idNovo\('arquivo'\)/);
  assert.match(preparar, /idNovo\('rev'\)/);
  assert.match(preparar, /nomeDisponivel/);
  assert.match(preparar, /lixeiraProjetoId: projeto\.id/);
  assert.match(gravar, /banco\.transaction\(\[LOJAS\.projetos, LOJAS\.arquivos, LOJAS\.revisoes\], 'readwrite'\)/);
  assert.match(gravar, /objectStore\(LOJAS\.projetos\)\.put/);
  assert.match(gravar, /objectStore\(LOJAS\.arquivos\)\.put/);
  assert.match(gravar, /objectStore\(LOJAS\.revisoes\)\.put/);
  assert.doesNotMatch(gravar, /\.clear\(|\bfetch\b|localStorage|sessionStorage/);
  assert.match(importar, /Adicionar o projeto portátil/);
  assert.match(importar, /nada atual será substituído ou enviado/);
  assert.match(importar, /validarCapacidadeProjetoPortatil\(backup\)/);
  assert.match(importar, /await gravarProjetoPortatil\(plano\)/);
  assert.match(importar, /estado\.projetos\.push\(plano\.projeto\)/);
  assert.doesNotMatch(importar, /substituirArquivoCompleto|\.clear\(|\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\b/);
});

testa('interface exige escolha manual e explica o comportamento aditivo local', () => {
  assert.match(fonte, /id="btn-workspace-exportar-projeto"[^>]*disabled/);
  assert.match(fonte, /id="btn-workspace-importar-projeto"[^>]*disabled/);
  assert.match(fonte, /id="workspace-projeto-portatil-importar"[^>]*accept="application\/json,\.json"/);
  assert.match(fonte, /Projeto portátil e histórico/);
  assert.match(fonte, /nada atual será substituído ou enviado/);
  assert.match(fonte, /function exportarProjetoPortatil\(\)/);
  assert.match(fonte, /function importarProjetoPortatil\(file\)/);
  assert.match(fonte, /bloquearOperacaoArquivoCompleto\(true\)/);
  assert.match(fonte, /Nada foi enviado pelo Chat/);
});

console.log(`${certos}/${certos + falhas} testes do projeto portátil do Workspace passaram`);
process.exitCode = falhas ? 1 : 0;
