// Contrato da lixeira concorrente: ações recuperáveis ou definitivas não podem
// reaproveitar uma fotografia velha para apagar/restaurar dados de outra guia.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..', '..');
const workspace = fs.readFileSync(path.join(raiz, 'chat-workspace.js'), 'utf8');
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

testa('compara também as marcas recuperáveis antes de reutilizar um registro', () => {
  const arquivo = entre(workspace, 'function arquivoRegistroAindaIgual(persistido, anterior)', '\n  function projetoRegistroAindaIgual');
  const projeto = entre(workspace, 'function projetoRegistroAindaIgual(persistido, anterior)', '\n  function listaRegistrosAindaIgual');
  assert.match(workspace, /function marcasLixeiraIguais\(persistido, anterior\)/);
  assert.match(arquivo, /marcasLixeiraIguais\(persistido, anterior\)/);
  assert.match(projeto, /marcasLixeiraIguais\(persistido, anterior\)/);
  assert.match(workspace, /function listaRegistrosAindaIgual\(persistidos, anteriores, comparar\)/);
  assert.match(workspace, /function filhosDoProjetoEstaoRecuperaveis\(arquivos, projetoId\)/);
});

testa('mover arquivo confere a base na própria transação antes de marcar lixeira', () => {
  const mover = entre(workspace, 'function moverArquivoParaLixeira(arquivo, quando)', '\n  function moverProjetoParaLixeira');
  assert.match(mover, /transaction\(LOJAS\.arquivos, 'readwrite'\)/);
  assert.match(mover, /const leitura = arquivos\.get\(arquivo\.id\)/);
  assert.match(mover, /if \(!arquivoAindaIgual\(persistido, arquivo\)\) return/);
  assert(mover.indexOf('if (!arquivoAindaIgual') < mover.indexOf('arquivos.put(lixeira)'), 'comparação precisa anteceder put');
  assert.match(mover, /resultado = \{ conflito: false, arquivo: lixeira \}/);
});

testa('mover projeto exige que projeto e todos os filhos ainda coincidam', () => {
  const mover = entre(workspace, 'function moverProjetoParaLixeira(projeto, arquivosEsperados, quando)', '\n\n  function projetoAtivo');
  assert.match(mover, /\[LOJAS\.projetos, LOJAS\.arquivos\], 'readwrite'/);
  assert.match(mover, /projetos\.get\(projeto\.id\)/);
  assert.match(mover, /arquivos\.index\('projetoId'\)\.getAll\(projeto\.id\)/);
  assert.match(mover, /!projetoRegistroAindaIgual\(projetoPersistido, projeto\) \|\| !listaRegistrosAindaIgual\(arquivosPersistidos, arquivosEsperados, arquivoRegistroAindaIgual\)/);
  assert(mover.indexOf('listaRegistrosAindaIgual') < mover.indexOf('projetos.put(projetoLixeira)'), 'filhos precisam ser comparados antes da escrita');
  const fotografia = entre(workspace, 'async function fotografiaFilhosProjetoParaLixeira(projetoId)', '\n  function arquivoAindaIgual');
  const apagarProjeto = entre(workspace, 'async function apagarProjeto()', '\n  async function criarArquivo');
  assert.match(fotografia, /estado\.arquivos\.filter/);
  assert.match(fotografia, /estaNaLixeira\(arquivo\)/);
  assert.match(apagarProjeto, /await fotografiaFilhosProjetoParaLixeira\(projeto\.id\)/);
  assert(apagarProjeto.indexOf('fotografiaFilhosProjetoParaLixeira') < apagarProjeto.indexOf("if (!confirm"), 'fotografia precisa anteceder a confirmação');
});

testa('restauração, descarte definitivo e esvaziamento derivam o alvo dentro da transação', () => {
  const restaurarProjeto = entre(workspace, 'async function restaurarProjetoDaLixeira(id)', '\n  async function restaurarArquivoDaLixeira');
  const restaurarArquivo = entre(workspace, 'async function restaurarArquivoDaLixeira(id)', '\n  async function restaurarDaLixeira');
  const descartarProjeto = entre(workspace, 'function apagarDefinitivamenteProjeto(id)', '\n  function apagarDefinitivamenteArquivo');
  const descartarArquivo = entre(workspace, 'function apagarDefinitivamenteArquivo(id)', '\n  async function descartarDaLixeira');
  const esvaziar = entre(workspace, 'function esvaziarLixeiraTransacional()', '\n  async function esvaziarLixeira');
  assert.match(restaurarProjeto, /projetos\.getAll\(\)/);
  assert.match(restaurarArquivo, /arquivos\.getAll\(\)/);
  assert.match(descartarProjeto, /const leituraProjeto = projetos\.get\(id\)/);
  assert.match(descartarArquivo, /const leituraArquivo = arquivos\.get\(id\)/);
  assert.match(esvaziar, /const leituraProjetos = lojaProjetos\.getAll\(\)/);
  assert.match(esvaziar, /const leituraArquivos = lojaArquivos\.getAll\(\)/);
});

testa('não descarta edição pendente para operar a lixeira e recarrega só sem rascunho', () => {
  const preparar = entre(workspace, 'async function preservarEdicaoAntesDeAlterarLixeira()', '\n  async function recarregarAposAlteracaoLixeira');
  const recarregar = entre(workspace, 'async function recarregarAposAlteracaoLixeira(selecao)', '\n  async function informarLixeiraDesatualizada');
  const informar = entre(workspace, 'async function informarLixeiraDesatualizada()', '\n  function moverArquivoParaLixeira');
  assert.match(preparar, /return salvarArquivoAtual\('troca'\)/);
  assert.match(recarregar, /await iniciarDados\(\)/);
  assert.match(informar, /if \(estado\.alterado \|\| estado\.conflitoArquivo\)/);
  assert.match(informar, /Seu texto continua no editor/);
  assert.match(workspace, /registrarConflitoArquivo\(arquivo\)/);
});

testa('guarda da lixeira permanece local e não introduz transporte ou armazenamento legado', () => {
  const trecho = entre(workspace, 'function marcasLixeiraIguais(persistido, anterior)', '\n  async function restaurarRevisao');
  assert.doesNotMatch(trecho, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|Authorization)\b/);
  assert.doesNotMatch(trecho, /https?:\/\//i);
});

console.log(`${certos}/${certos + falhas} testes da concorrência da lixeira local passaram`);
process.exitCode = falhas ? 1 : 0;
