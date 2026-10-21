// Contrato da busca global do Workspace: produtividade local explícita,
// sem ampliar o escopo para Lixeira, versões, rede ou armazenamento novo.
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

testa('mantém busca global explicitamente desligada e limitada ao projeto atual por padrão', () => {
  assert.match(workspace, /id="btn-workspace-busca-global" aria-pressed="false" aria-controls="workspace-lista-arquivos"/);
  assert.match(workspace, /A busca fica no projeto atual\. Ative Todos os projetos/);
  const alternar = entre(workspace, 'function alternarBuscaGlobal()', '\n  function renderProjetos');
  assert.match(alternar, /elementos\.buscaGlobal\.setAttribute\('aria-pressed', global \? 'true' : 'false'\)/);
  assert.match(alternar, /Busca em todos os projetos ativada somente neste navegador/);
  assert.doesNotMatch(alternar, /guardarMeta|localStorage|sessionStorage|fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon/);
});

testa('aplica escopo global somente a uma consulta digitada e usa apenas arquivos ativos carregados', () => {
  const render = entre(workspace, 'function renderArquivos()', '\n  function atualizarControlesEditor');
  assert.match(render, /const global = !!termo && buscaGlobalAtiva\(\)/);
  assert.match(render, /const candidatos = global \? estado\.arquivos\.filter\(\(arquivo\) => projetosPorId\.has\(arquivo\.projetoId\)\) : arquivosDoProjeto\(estado\.projetoAtivo\)/);
  assert.match(render, /sem ele a lista continua sendo[\s\S]*projeto atual/);
  assert.doesNotMatch(render, /lerTodos|LOJAS\.revisoes|lixeiraEm|indexedDB|fetch/);
  const iniciar = entre(workspace, 'async function iniciarDados()', '\n\n  async function criarProjeto');
  assert.match(iniciar, /todosArquivos\.filter\(\(arquivo\) => [^;]*!estaNaLixeira\(arquivo\)\)/);
});

testa('identifica o projeto de cada resultado global sem interpolar texto no HTML', () => {
  const render = entre(workspace, 'function renderArquivos()', '\n  function atualizarControlesEditor');
  assert.match(render, /const projetosPorId = new Map\(estado\.projetos\.map/);
  assert.match(render, /'Abrir arquivo: ' \+ arquivo\.nome \+ ' do projeto: ' \+ projeto\.nome/);
  assert.match(render, /'Projeto: ' \+ projeto\.nome/);
  assert.match(render, /nome\.textContent = arquivo\.nome/);
  assert.match(render, /meta\.textContent =/);
  assert.doesNotMatch(render, /innerHTML\s*\+=|`[^`]*\$\{/);
});

testa('abrir um resultado global preserva edição pendente antes de trocar projeto e arquivo juntos', () => {
  const selecionar = entre(workspace, 'async function selecionarArquivo(id)', '\n  function agendarSalvarAutomatico');
  assert.match(selecionar, /const proximo = estado\.arquivos\.find/);
  assert.match(selecionar, /estado\.alterado && !\(await salvarArquivoAtual\('troca'\)\)/);
  const projeto = selecionar.indexOf('estado.projetoAtivo = proximo.projetoId;');
  const arquivo = selecionar.indexOf('estado.arquivoAtivo = proximo.id;');
  const selecao = selecionar.indexOf('await guardarSelecao();');
  assert(projeto >= 0 && arquivo > projeto && selecao > arquivo, 'a seleção precisa persistir os dois IDs coerentes');
  assert.doesNotMatch(selecionar, /fetch|localStorage|sessionStorage|substituirArquivoCompleto/);
});

testa('ajuda acessível declara a fronteira de arquivos ativos, Lixeira e versões', () => {
  const ajuda = entre(workspace, 'function atualizarAjudaBuscaGlobal()', '\n  function alternarBuscaGlobal');
  assert.match(ajuda, /Buscar arquivos ativos em todos os projetos locais/);
  assert.match(ajuda, /somente arquivos ativos em todos os projetos deste navegador; versões e Lixeira ficam fora/);
  assert.match(workspace, /id="workspace-ajuda-busca" class="workspace-meta-pequena"/);
  assert.match(workspace, /aria-describedby="workspace-ajuda-busca"/);
});

testa('controle mantém foco/estado visual local sem introduzir nova superfície de rede', () => {
  assert.match(estilos, /\.workspace-busca(?:,|\{)/);
  assert.match(estilos, /\.workspace-busca button\[aria-pressed="true"\]\{border-color:var\(--ouro-fraco\);background:#15130a;color:var\(--ouro\)\}/);
  assert.doesNotMatch(workspace, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(?/);
});

console.log(`${certos}/${certos + falhas} testes da busca global do Workspace passaram`);
process.exitCode = falhas ? 1 : 0;
