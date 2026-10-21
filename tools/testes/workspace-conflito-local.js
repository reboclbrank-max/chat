// Contrato de concorrência do Workspace: uma guia atual não pode sobrescrever
// silenciosamente o arquivo salvo por outra guia; a pessoa escolhe a resolução.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const workspace = fs.readFileSync(path.join(raiz, 'chat-workspace.js'), 'utf8');
const estilos = fs.readFileSync(path.join(raiz, 'chat-estilos.css'), 'utf8');
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

testa('decide base, nome, cota e histórico na transação local antes de gravar arquivo, revisão e projeto', () => {
  const gravar = entre(workspace, 'function gravarArquivoComRevisao(arquivo, anterior)', '\n  function gravarLote');
  assert.match(workspace, /function arquivoAindaIgual\(persistido, anterior\)/);
  assert.match(gravar, /\[LOJAS\.projetos, LOJAS\.arquivos, LOJAS\.revisoes\], 'readwrite'/);
  assert.match(gravar, /const leituraArquivo = arquivos\.get\(anterior\.id\)/);
  assert.match(gravar, /const leituraArquivos = arquivos\.getAll\(\)/);
  assert.match(gravar, /const leituraRevisoes = revisoes\.getAll\(\)/);
  assert.match(gravar, /if \(!arquivoAindaIgual\(persistido, anterior\) \|\| !projetoAtivoPersistido\(projetoPersistido\)\)/);
  assert.match(gravar, /const nomeOcupado = busca\(atualizado\.nome\)/);
  assert.match(gravar, /planejarArmazenamentoParaSalvar\(persistido, atualizado, todosArquivos, todasRevisoes\)/);
  assert(gravar.indexOf('if (!arquivoAindaIgual') < gravar.indexOf('arquivos.put(atualizado)'), 'a verificação precisa ocorrer antes da escrita');
  assert(gravar.indexOf('planejarArmazenamentoParaSalvar') < gravar.indexOf('arquivos.put(atualizado)'), 'a cota precisa ser decidida antes da escrita');
  assert.match(gravar, /projetos\.put\(projetoAtualizado\)/);
});

testa('salvamento interrompe a substituição silenciosa e preserva rascunho também se o nome ou a cota atuais recusarem', () => {
  const salvar = entre(workspace, 'async function salvarArquivoAtual(origem)', '\n  async function apagarArquivo');
  assert.match(salvar, /const resultado = await gravarArquivoComRevisao\(atualizado, anterior\)/);
  assert.doesNotMatch(salvar, /planejarArmazenamentoParaSalvar/);
  assert.match(salvar, /if \(resultado\.conflito\) \{\n        registrarConflitoArquivo\(anterior\);\n        return false;/);
  assert.match(salvar, /if \(resultado\.nomeOcupado\) \{\n        definirStatus\('erro', 'Já existe um arquivo local com esse nome neste projeto\.'\);\n        return false;/);
  assert.match(salvar, /if \(resultado\.erro\) throw erro\(resultado\.erro\)/);
  assert.match(workspace, /function registrarConflitoArquivo\(anterior\)/);
  const registrar = entre(workspace, 'function registrarConflitoArquivo(anterior)', '\n  function nomeRascunhoConflito');
  assert.match(registrar, /estado\.conflitoArquivo = \{ arquivoId: anterior\.id, projetoId: anterior\.projetoId \}/);
  assert.match(registrar, /estado\.alterado = true/);
  assert.match(registrar, /Seu texto continua no editor e nada foi substituído/);
  assert.doesNotMatch(salvar, /await gravar\(LOJAS\.projetos/);
});

testa('bloqueia gravar ou apagar o original, mas conserva edição e cópia local explícita', () => {
  const controles = entre(workspace, 'function atualizarControlesEditor(ativo)', '\n  function renderEditor');
  assert.match(controles, /const conflito = !!estado\.conflitoArquivo/);
  assert.match(controles, /elementos\.salvar\.disabled = !ativo \|\| estado\.salvando \|\| bloqueado \|\| conflito/);
  assert.match(controles, /elementos\.apagarArquivo\.disabled = !ativo \|\| estado\.salvando \|\| bloqueado \|\| conflito/);
  assert.match(controles, /elementos\.editor\.disabled = !ativo \|\| bloqueado/);
  const copiar = entre(workspace, 'async function salvarConflitoComoCopia()', '\n  async function recarregarArquivoConflito');
  assert.match(workspace, /function nomeCopiaConflito\(base, arquivos\)/);
  assert.match(copiar, /const copia = \{/);
  assert.match(copiar, /if \(!\(await gravarCopiaConflito\(copia\)\)\) throw erro\('projeto-ausente'\)/);
  assert.match(copiar, /O arquivo original não foi substituído/);
});

testa('cópia de conflito confirma o projeto atual em transação e não sobrescreve o nome dele', () => {
  const gravar = entre(workspace, 'function gravarCopiaConflito(copia)', '\n  function guardarMeta');
  assert.match(gravar, /const leituraProjeto = projetos\.get\(copia\.projetoId\)/);
  assert.match(gravar, /if \(!projeto \|\| estaNaLixeira\(projeto\)\) return/);
  assert.match(gravar, /arquivos\.put\(copia\)/);
  assert.match(gravar, /Object\.assign\(\{\}, projeto, \{ atualizadoEm: copia\.atualizadoEm \}\)/);
  assert.doesNotMatch(gravar, /nome:/);
});

testa('oferece recuperação deliberada e download local antes de descartar o rascunho', () => {
  assert.match(workspace, /id="workspace-conflito-arquivo" class="workspace-conflito oculto" role="alert" aria-labelledby="workspace-conflito-titulo"/);
  assert.match(workspace, /id="btn-workspace-baixar-conflito"/);
  assert.match(workspace, /id="btn-workspace-copiar-conflito"/);
  assert.match(workspace, /id="btn-workspace-recarregar-conflito"/);
  const baixar = entre(workspace, 'function baixarRascunhoConflito()', '\n  function nomeCopiaConflito');
  assert.match(baixar, /baixar\(texto\(elementos\.editor\.value\), nomeRascunhoConflito\(\), 'text\/plain;charset=utf-8'\)/);
  const recarregar = entre(workspace, 'async function recarregarArquivoConflito()', '\n  function marcarAlterado');
  assert.match(recarregar, /if \(!confirm\('Recarregar a versão salva deste arquivo/);
  assert.match(recarregar, /Baixe ou salve uma cópia antes se quiser mantê-lo/);
  assert.match(recarregar, /await iniciarDados\(\)/);
  assert.match(recarregar, /estado\.conflitoArquivo = null/);
});

testa('anuncia o conflito de forma legível e mantém os controles locais e alcançáveis', () => {
  assert.match(estilos, /\.workspace-conflito\{border:1px solid #6b5a20;border-radius:10px;background:#211d0f;color:#e7d9a8/);
  assert.match(estilos, /\.workspace-conflito-acoes\{display:flex;gap:6px;flex-wrap:wrap\}/);
  assert.match(estilos, /\.workspace-conflito-acoes button\{flex:1 1 150px/);
  assert.match(estilos, /button:focus-visible,input:focus-visible,textarea:focus-visible,select:focus-visible/);
});

testa('não acrescenta rede, token, sincronização ou armazenamento legado à resolução', () => {
  const trecho = entre(workspace, 'function arquivoAindaIgual(persistido, anterior)', '\n  async function apagarArquivo');
  assert.doesNotMatch(trecho, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|Authorization)\b/);
  assert.doesNotMatch(trecho, /https?:\/\//i);
});

console.log(`${certos}/${certos + falhas} testes do conflito local do Workspace passaram`);
process.exitCode = falhas ? 1 : 0;
