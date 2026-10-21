// Contrato do arquivo completo do Workspace: recuperação manual local de
// arquivos, versões e lixeira, sem rede, segredo ou armazenamento legado.
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
function runtime() {
  const document = { readyState: 'complete', getElementById: () => null, addEventListener: () => {} };
  const window = { crypto: { randomUUID: () => 'fixture' } };
  const contexto = {
    window, document, TextEncoder, Date, Number, String, Object, Array, Set, Map,
    Promise, JSON, Math, console, setTimeout, clearTimeout
  };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto, { filename: 'chat-workspace.js' });
  return contexto.window.ReboclWorkspace.arquivoCompleto;
}
function erroCodigo(fn, codigo) {
  assert.throws(fn, (erro) => erro && erro.codigoWorkspace === codigo);
}
function copia(valor) { return JSON.parse(JSON.stringify(valor)); }
function fixture(api) {
  const quando = '2026-10-21T12:00:00.000Z';
  return {
    formato: api.formato,
    versao: api.versao,
    exportadoEm: quando,
    projetos: [
      { id: 'projeto-ativo', nome: 'Projeto ativo', criadoEm: quando, atualizadoEm: quando, lixeiraEm: null, lixeiraRaiz: null, lixeiraProjetoId: null },
      { id: 'projeto-lixeira', nome: 'Projeto recuperável', criadoEm: quando, atualizadoEm: quando, lixeiraEm: quando, lixeiraRaiz: 'projeto', lixeiraProjetoId: 'projeto-lixeira' }
    ],
    arquivos: [
      { id: 'arquivo-ativo', projetoId: 'projeto-ativo', nome: 'nota.md', conteudo: 'texto ativo', bytes: bytes('texto ativo'), versao: 2, criadoEm: quando, atualizadoEm: quando, lixeiraEm: null, lixeiraRaiz: null, lixeiraProjetoId: null },
      { id: 'arquivo-projeto-lixeira', projetoId: 'projeto-lixeira', nome: 'filho.md', conteudo: 'texto recuperável', bytes: bytes('texto recuperável'), versao: 1, criadoEm: quando, atualizadoEm: quando, lixeiraEm: quando, lixeiraRaiz: null, lixeiraProjetoId: 'projeto-lixeira' },
      { id: 'arquivo-lixeira', projetoId: 'projeto-ativo', nome: 'apagado.md', conteudo: 'texto removido', bytes: bytes('texto removido'), versao: 2, criadoEm: quando, atualizadoEm: quando, lixeiraEm: quando, lixeiraRaiz: 'arquivo', lixeiraProjetoId: 'projeto-ativo' }
    ],
    revisoes: [
      { id: 'revisao-1', arquivoId: 'arquivo-ativo', conteudo: 'texto anterior', bytes: bytes('texto anterior'), quando, versao: 1 },
      { id: 'revisao-2', arquivoId: 'arquivo-lixeira', conteudo: 'texto removido anterior', bytes: bytes('texto removido anterior'), quando, versao: 1 }
    ]
  };
}

testa('expõe formato separado, limites finitos e validador local sem montar a interface', () => {
  const api = runtime();
  assert.equal(api.formato, 'rebocl-workspace-arquivo-completo');
  assert.equal(api.versao, 1);
  assert.deepEqual(JSON.parse(JSON.stringify(api.limites)), { bytes: 12582912, projetos: 200, arquivos: 500, revisoes: 4000 });
  assert.equal(typeof api.validar, 'function');
  assert.doesNotMatch(fonte, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(?/);
  assert.doesNotMatch(fonte, /\b(localStorage|sessionStorage|Authorization|github_pat_|gh[pousr]_)\b/i);
});

testa('aceita arquivo completo mínimo que preserva arquivo ativo, versão e lixeira', () => {
  const api = runtime();
  const dados = fixture(api);
  const valido = api.validar(dados, bytes(JSON.stringify(dados)));
  assert.equal(valido.projetos.length, 2);
  assert.equal(valido.arquivos.length, 3);
  assert.equal(valido.revisoes.length, 2);
  assert.equal(valido.arquivos.find((arquivo) => arquivo.id === 'arquivo-ativo').conteudo, 'texto ativo');
  assert.equal(valido.arquivos.find((arquivo) => arquivo.id === 'arquivo-projeto-lixeira').lixeiraRaiz, null);
  assert.equal(valido.arquivos.find((arquivo) => arquivo.id === 'arquivo-lixeira').lixeiraRaiz, 'arquivo');
});

testa('rejeita esquema aberto, bytes divergentes, relações quebradas e versões em excesso antes da escrita', () => {
  const api = runtime();
  const base = fixture(api);
  const aberto = copia(base);
  aberto.extra = true;
  erroCodigo(() => api.validar(aberto, bytes(JSON.stringify(aberto))), 'arquivo-completo-invalido');

  const bytesFalsos = copia(base);
  bytesFalsos.arquivos[0].bytes++;
  erroCodigo(() => api.validar(bytesFalsos, bytes(JSON.stringify(bytesFalsos))), 'arquivo-completo-invalido');

  const filhoOrfao = copia(base);
  filhoOrfao.projetos[1].lixeiraEm = null;
  filhoOrfao.projetos[1].lixeiraRaiz = null;
  filhoOrfao.projetos[1].lixeiraProjetoId = null;
  erroCodigo(() => api.validar(filhoOrfao, bytes(JSON.stringify(filhoOrfao))), 'arquivo-completo-invalido');

  const repetida = copia(base);
  repetida.arquivos[0].versao = 20;
  for (let indice = 0; indice < 12; indice++) {
    const conteudo = 'v' + indice;
    repetida.revisoes.push({ id: 'extra-' + indice, arquivoId: 'arquivo-ativo', conteudo, bytes: bytes(conteudo), quando: repetida.exportadoEm, versao: indice + 2 });
  }
  erroCodigo(() => api.validar(repetida, bytes(JSON.stringify(repetida))), 'arquivo-completo-excesso');

  const dataImprecisa = copia(base);
  dataImprecisa.exportadoEm = '2026-10-21';
  erroCodigo(() => api.validar(dataImprecisa, bytes(JSON.stringify(dataImprecisa))), 'arquivo-completo-invalido');

  const idPerigoso = copia(base);
  idPerigoso.projetos[0].id = 'projeto com espaço';
  erroCodigo(() => api.validar(idPerigoso, bytes(JSON.stringify(idPerigoso))), 'arquivo-completo-invalido');

  const semAtivo = copia(base);
  semAtivo.projetos[0].lixeiraEm = semAtivo.exportadoEm;
  semAtivo.projetos[0].lixeiraRaiz = 'projeto';
  semAtivo.projetos[0].lixeiraProjetoId = semAtivo.projetos[0].id;
  semAtivo.arquivos[0].lixeiraEm = semAtivo.exportadoEm;
  semAtivo.arquivos[0].lixeiraProjetoId = semAtivo.projetos[0].id;
  erroCodigo(() => api.validar(semAtivo, bytes(JSON.stringify(semAtivo))), 'arquivo-completo-invalido');

  const tamanhoCoagido = copia(base);
  erroCodigo(() => api.validar(tamanhoCoagido, String(bytes(JSON.stringify(tamanhoCoagido)))), 'arquivo-completo-invalido');

  const grande = copia(base);
  erroCodigo(() => api.validar(grande, api.limites.bytes + 1), 'arquivo-completo-grande');
});

testa('a substituição completa usa uma transação única que limpa e recria somente as quatro lojas locais', () => {
  const substituir = entre(fonte, 'function substituirArquivoCompleto(backup)', '\n  function bloquearOperacaoArquivoCompleto');
  assert.match(substituir, /banco\.transaction\(\[LOJAS\.projetos, LOJAS\.arquivos, LOJAS\.revisoes, LOJAS\.meta\], 'readwrite'\)/);
  assert.match(substituir, /projetos\.clear\(\);/);
  assert.match(substituir, /arquivos\.clear\(\);/);
  assert.match(substituir, /revisoes\.clear\(\);/);
  assert.match(substituir, /meta\.clear\(\);/);
  assert.match(substituir, /backup\.projetos\.forEach/);
  assert.match(substituir, /backup\.arquivos\.forEach/);
  assert.match(substituir, /backup\.revisoes\.forEach/);
  assert.doesNotMatch(substituir, /\b(fetch|api\s*\(|localStorage|sessionStorage)\b/);
});

testa('interface exige ação manual explícita e descreve que a restauração substitui o Workspace', () => {
  assert.match(fonte, /id="btn-workspace-exportar-completo"/);
  assert.match(fonte, /id="btn-workspace-restaurar-completo"/);
  assert.match(fonte, /id="workspace-arquivo-completo-importar"[^>]*accept="application\/json,\.json"/);
  assert.match(fonte, /function exportarArquivoCompleto\(\)/);
  assert.match(fonte, /function importarArquivoCompleto\(file\)/);
  assert.match(fonte, /Isso substituirá projetos, arquivos ativos, versões e lixeira deste navegador/);
  assert.match(fonte, /bloquearOperacaoArquivoCompleto\(true\)/);
  assert.match(fonte, /Nada será enviado ao Chat, GitHub ou motor/);
});

console.log(`${certos}/${certos + falhas} testes do arquivo completo do Workspace passaram`);
process.exitCode = falhas ? 1 : 0;
