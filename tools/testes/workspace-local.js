// Contrato do Workspace do Chat: local-first, delimitado e sem transporte automático.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0, falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio), b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}

const workspace = ler('chat-workspace.js');
const sw = ler('sw.js');
const workflow = ler('.github/workflows/testes-rapidos.yml');
const continuidade = ler('tools/testes/continuidade.js');
const retrato = ler('CONTINUIDADE.md');
const corredor = ler('tools/testes/roda-testes.js');
const copias = rotas.map((rota) => ({ rota, html: ler(rota) }));

testa('Workspace usa apenas IndexedDB local e não introduz transporte ou storage legado', () => {
  assert.match(workspace, /indexedDB\.open\(BANCO, VERSAO_BANCO\)/);
  assert.match(workspace, /const BANCO = 'rebocl-workspace-local-v1'/);
  assert.match(workspace, /projetos: 'projetos', arquivos: 'arquivos', revisoes: 'revisoes', meta: 'meta'/);
  assert.doesNotMatch(workspace, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon)\s*\(?/);
  assert.doesNotMatch(workspace, /\b(localStorage|sessionStorage|Authorization|github_pat_|gh[pousr]_)\b/i);
  assert.doesNotMatch(workspace, /https?:\/\//i);
});

testa('Workspace limita dados locais e mantém exportação/importação validada', () => {
  assert.match(workspace, /projetos: 20/);
  assert.match(workspace, /arquivos: 100/);
  assert.match(workspace, /arquivoBytes: 512 \* 1024/);
  assert.match(workspace, /totalBytes: 5 \* 1024 \* 1024/);
  assert.match(workspace, /revisoesPorArquivo: 12/);
  assert.match(workspace, /FORMATO_EXPORTACAO = 'rebocl-workspace-local'/);
  assert.match(workspace, /function validarBackup\(dados, tamanho\)/);
  assert.match(workspace, /Number\(tamanho\) > LIMITES\.importacaoBytes/);
  assert.match(workspace, /EXTENSOES_TEXTO/);
  assert.match(workspace, /URL\.createObjectURL\(new Blob/);
  assert.match(workspace, /function medirOcupacao\(arquivos, revisoes\)/);
  const planejador = entre(workspace, 'function planejarArmazenamentoParaSalvar(anterior, atualizado, arquivos, revisoes)', '\n\n  function ordenarProjetos');
  assert.match(planejador, /medirOcupacao\(arquivosAtuais, revisoesAtuais\)/);
  const planejadorSemComentarios = planejador.replace(/\/\/.*$/gm, '');
  assert.doesNotMatch(planejadorSemComentarios, /estado\.bytesOcupados|lerTodos\(/);
  assert.doesNotMatch(entre(workspace, 'function validarBackup(dados, tamanho)', '\n  async function importarBackup'), /estado\.(projetos|arquivos|bytesOcupados)/);
  assert.match(workspace, /incluindo histórico e itens recuperáveis/);
});

testa('backup ativo decide o lote aditivo no readwrite persistido e reconcilia o rascunho local', () => {
  const validar = entre(workspace, 'function validarBackup(dados, tamanho)', '\n  async function importarBackup');
  assert.match(validar, /ids\.has\(texto\(projeto\.id\)\)/);
  assert.doesNotMatch(validar, /estado\.(projetos|arquivos|bytesOcupados)/);
  const lote = entre(workspace, 'function gravarLote(backup, quando)', '\n  function guardarMeta');
  assert.match(lote, /transaction\(\[LOJAS\.projetos, LOJAS\.arquivos, LOJAS\.revisoes\], 'readwrite'\)/);
  assert.match(lote, /const leituraProjetos = projetos\.getAll\(\)/);
  assert.match(lote, /const leituraArquivos = arquivos\.getAll\(\)/);
  assert.match(lote, /const leituraRevisoes = revisoes\.getAll\(\)/);
  assert.match(lote, /projetoAtivoPersistido/);
  assert.match(lote, /medirOcupacao\(todosArquivos, todasRevisoes\) \+ bytesNovos/);
  const antesDasEscritas = lote.slice(0, lote.indexOf('projetosNovos.forEach'));
  assert(antesDasEscritas.includes('resultado = { erro:'), 'limites precisam terminar antes da escrita');
  assert.doesNotMatch(antesDasEscritas, /\.put\(/);
  const importar = entre(workspace, 'async function importarArquivo(file)', '\n  async function copiarArquivo');
  const posValidar = importar.indexOf('const valido = validarBackup(backup, file.size);');
  const posBloquear = importar.indexOf('bloquearOperacaoArquivoCompleto(true);');
  const posSalvar = importar.indexOf("await salvarArquivoAtual('automatico')");
  const posConfirmar = importar.indexOf("confirm('Importar esse backup local do Workspace?");
  const posLote = importar.indexOf('await importarBackup(valido);');
  assert(posValidar >= 0 && posBloquear > posValidar && posSalvar > posBloquear && posConfirmar > posSalvar && posLote > posConfirmar, 'ordem valida, protege rascunho, confirma e só então grava');
  const reconciliar = entre(workspace, 'async function importarBackup(backup)', '\n  async function importarArquivo');
  assert.match(reconciliar, /await iniciarDados\(\)/);
  assert.match(reconciliar, /estado\.conflitoArquivo = null/);
  assert.match(reconciliar, /await guardarSelecao\(\)/);
  assert.match(reconciliar, /renderTudo\(\)/);
});

testa('Arquivo completo do Workspace é separado, explícito e cobre recuperação de versões e lixeira', () => {
  assert.match(workspace, /const FORMATO_ARQUIVO_COMPLETO = 'rebocl-workspace-arquivo-completo'/);
  assert.match(workspace, /bytes: 12 \* 1024 \* 1024/);
  assert.match(workspace, /function validarArquivoCompleto\(dados, tamanho\)/);
  assert.match(workspace, /function substituirArquivoCompleto\(backup, fotografiaEsperada\)/);
  assert.match(workspace, /function lerFotografiaArquivoCompleto\(\)/);
  assert.match(workspace, /fotografiaArquivoCompletoAindaIgual\(atual, fotografiaEsperada\)/);
  assert.match(workspace, /id=\"btn-workspace-exportar-completo\"/);
  assert.match(workspace, /id=\"btn-workspace-restaurar-completo\"/);
  assert.match(workspace, /id=\"btn-workspace-desfazer-restauracao\"[^>]*disabled/);
  assert.match(workspace, /function desfazerUltimaRestauracaoArquivoCompleto\(\)/);
  assert.match(workspace, /ponto de retorno fica apenas nesta página/);
  assert.match(workspace, /id=\"workspace-arquivo-completo-importar\"/);
  assert.match(workspace, /lixeira e versões locais/);
  assert.match(workspace, /substituirá projetos, arquivos ativos, versões e lixeira deste navegador/);
});

testa('Projeto portátil é separado do arquivo completo e adiciona histórico local sem substituir o Workspace', () => {
  assert.match(workspace, /const FORMATO_PROJETO_PORTATIL = 'rebocl-workspace-projeto'/);
  assert.match(workspace, /bytes: 8 \* 1024 \* 1024/);
  assert.match(workspace, /function validarProjetoPortatil\(dados, tamanho\)/);
  assert.match(workspace, /async function montarProjetoPortatil\(\)/);
  assert.match(workspace, /function gravarProjetoPortatil\(plano\)/);
  assert.match(workspace, /function prepararImportacaoProjetoPortatil\(backup\)/);
  assert.match(workspace, /id=\"btn-workspace-exportar-projeto\"/);
  assert.match(workspace, /id=\"btn-workspace-importar-projeto\"/);
  assert.match(workspace, /id=\"workspace-projeto-portatil-importar\"/);
  const importar = entre(workspace, 'async function importarProjetoPortatil(file)', '\n\n  async function exportarWorkspace');
  assert.match(importar, /Adicionar o projeto portátil/);
  assert.match(importar, /nada atual será substituído ou enviado/);
  assert.match(importar, /await gravarProjetoPortatil\(plano\)/);
  assert.doesNotMatch(importar, /substituirArquivoCompleto|\.clear\(/);
});

testa('Busca global do Workspace é explícita, local e abre o resultado no projeto correspondente', () => {
  assert.match(workspace, /function buscaGlobalAtiva\(\)/);
  assert.match(workspace, /function alternarBuscaGlobal\(\)/);
  assert.match(workspace, /id=\"btn-workspace-busca-global\"[^>]*aria-pressed=\"false\"/);
  assert.match(workspace, /id=\"workspace-ajuda-busca\"/);
  const render = entre(workspace, 'function renderArquivos()', '\n  function atualizarControlesEditor');
  assert.match(render, /const global = !!termo && buscaGlobalAtiva\(\)/);
  assert.match(render, /const candidatos = global \? estado\.arquivos\.filter\(\(arquivo\) => projetosPorId\.has\(arquivo\.projetoId\)\) : arquivosDoProjeto\(estado\.projetoAtivo\)/);
  assert.match(render, /Projeto: ' \+ projeto\.nome/);
  const selecionar = entre(workspace, 'async function selecionarArquivo(id)', '\n  function agendarSalvarAutomatico');
  assert.match(selecionar, /estado\.projetoAtivo = proximo\.projetoId/);
  assert.match(selecionar, /estado\.arquivoAtivo = proximo\.id/);
  assert.doesNotMatch(render + selecionar, /\b(fetch|api\s*\(|localStorage|sessionStorage)\b/);
});

testa('Workspace detecta conflito entre edições locais e oferece resolução explícita', () => {
  assert.match(workspace, /conflitoArquivo: null/);
  assert.match(workspace, /function arquivoAindaIgual\(persistido, anterior\)/);
  const salvarTransacional = entre(workspace, 'function gravarArquivoComRevisao(arquivo, anterior)', '\n  function gravarLote');
  assert.match(salvarTransacional, /const leituraArquivos = arquivos\.getAll\(\)/);
  assert.match(salvarTransacional, /const leituraRevisoes = revisoes\.getAll\(\)/);
  assert.match(salvarTransacional, /planejarArmazenamentoParaSalvar\(persistido, atualizado, todosArquivos, todasRevisoes\)/);
  const copiaTransacional = entre(workspace, 'function gravarCopiaConflito(projetoId, nomeBase, conteudo, quando)', '\n  function guardarMeta');
  assert.match(copiaTransacional, /const leituraArquivos = arquivos\.getAll\(\)/);
  assert.match(copiaTransacional, /const leituraRevisoes = revisoes\.getAll\(\)/);
  assert.match(copiaTransacional, /nomeCopiaConflito\(nomeBase, ativos\.filter/);
  assert.match(workspace, /function salvarConflitoComoCopia\(\)/);
  assert.match(workspace, /function recarregarArquivoConflito\(\)/);
  assert.match(workspace, /id="workspace-conflito-arquivo"/);
  assert.match(workspace, /Seu texto continua neste editor e nada foi substituído/);
});

testa('trecho só vai ao compositor por escolha explícita e não é enviado automaticamente', () => {
  const bloco = entre(workspace, 'async function levarSelecaoAoChat()', '\n\n  function telaVisivel()');
  const token = bloco.indexOf('pareceTokenDeAcesso(trecho)');
  const entrada = bloco.indexOf('entrada.value = unido;');
  const fechar = bloco.indexOf("fechar('chat');");
  assert(token >= 0 && entrada > token && fechar > entrada, 'ordem local da transferência');
  assert.doesNotMatch(bloco, /window\.abrirConversa\(\)/);
  assert.match(bloco, /if \(!trecho\.trim\(\)\) return mostrarErro\(erro\('sem-selecao'\)\)/);
  assert.match(bloco, /if \(trecho\.length > LIMITES\.trechoParaChat\)/);
  assert.match(bloco, /if \(unido\.length > limiteCompositor\)/);
  assert.doesNotMatch(bloco, /\b(fetch|api\s*\(|enviar\s*\(|localStorage|sessionStorage)\b/);
});

testa('itens recebidos do usuário entram na interface por texto, não por HTML interpolado', () => {
  const projetos = entre(workspace, 'function renderProjetos()', '\n  function renderArquivos()');
  const arquivos = entre(workspace, 'function renderArquivos()', '\n  function renderEditor()');
  assert.match(projetos, /nome\.textContent = projeto\.nome/);
  assert.match(arquivos, /nome\.textContent = arquivo\.nome/);
  assert.doesNotMatch(projetos + arquivos, /innerHTML\s*\+=|`[^`]*\$\{/);
  assert.match(workspace, /nomeSeguro\(valor, limite, padrao\)/);
  assert.match(workspace, /nomeArquivoSeguro\(valor\)/);
});

testa('as quatro rotas expõem o mesmo acesso e carregam uma só cópia do Workspace', () => {
  const blocos = [];
  for (const { rota, html } of copias) {
    const botao = '<button type="button" class="hbtn" id="btn-workspace"';
    const script = '<script src="chat-workspace.js"></script>';
    const pwa = html.indexOf('<script src="chat-pwa.js"></script>');
    const filtro = html.indexOf('<script src="chat-filtro-chips.js"></script>');
    const ativo = html.indexOf(script);
    assert(html.includes(botao), rota + ': botão de Workspace ausente');
    assert.equal((html.match(/id="btn-workspace"/g) || []).length, 1, rota + ': botão duplicado');
    assert.equal((html.match(/chat-workspace\.js/g) || []).length, 1, rota + ': ativo duplicado');
    assert(pwa >= 0 && filtro > pwa && ativo > filtro, rota + ': ordem dos ativos locais');
    assert.match(html, /conversas no GitHub · Workspace neste aparelho · grátis/);
    assert.match(html, /Workspace local não são alterados/);
    assert.match(html, /window\.ReboclWorkspace\) window\.ReboclWorkspace\.ocultarParaNavegacao\(\)/);
    blocos.push(entre(html, '<button type="button" class="hbtn" id="btn-workspace"', '</header>') + entre(html, '<script src="chat-workspace.js"></script>', '\n<script>\nfunction paginaFinalComentarios'));
  }
  const hashes = blocos.map((bloco) => crypto.createHash('sha256').update(bloco).digest('hex'));
  assert.equal(new Set(hashes).size, 1, 'as quatro rotas precisam manter o mesmo acesso ao Workspace');
});

testa('casca PWA, workflow, corredor e porta de continuidade observam o ativo', () => {
  assert.match(sw, /rebocl-chat-v92/);
  assert.match(sw, /'\.\/chat-workspace\.js'/);
  assert.match(workflow, /'chat-workspace\.js'/);
  assert.match(workflow, /chat-workspace\.js tools\/testes\/\*\.js/);
  assert.match(workflow, /chat-comandos-locais\.js chat-filtro-chips\.js chat-organizacao-local\.js chat-colecoes-local\.js chat-workspace\.js/);
  assert.match(continuidade, /chat-workspace\\\.js/);
  assert.match(corredor, /'workspace-local\.js'/);
  assert.match(corredor, /'workspace-integridade-local\.js'/);
  assert.match(retrato, /Workspace interno local-first/);
  assert.match(retrato, /rebocl-workspace-local-v1/);
  assert.match(retrato, /rebocl-chat-v92/);
});

testa('porta de continuidade exige retrato quando o ativo local muda', () => {
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'workspace-continuidade-'));
  try {
    const evento = path.join(pasta, 'push.json');
    fs.writeFileSync(evento, JSON.stringify({ commits: [{ modified: ['chat-workspace.js'] }] }));
    const resultado = spawnSync(process.execPath, [path.join(raiz, 'tools/testes/continuidade.js')], {
      env: Object.assign({}, process.env, { GITHUB_EVENT_PATH: evento }), encoding: 'utf8'
    });
    assert.notEqual(resultado.status, 0, 'ativo operacional sem retrato não pode passar');
    assert.match(resultado.stdout + resultado.stderr, /push operacional atualiza CONTINUIDADE\.md/);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});

testa('autosave preserva edição pendente e a ação escolhida aguarda gravação já iniciada', () => {
  const salvar = entre(workspace, 'async function salvarArquivoAtual(origem)', '\n  async function apagarArquivo');
  assert.match(workspace, /edicao: 0/);
  assert.match(workspace, /promessaSalvar: null/);
  assert.match(workspace, /function agendarSalvarAutomatico\(\)/);
  assert.match(workspace, /estado\.edicao\+\+/);
  assert.match(salvar, /const pendente = estado\.promessaSalvar/);
  assert.match(salvar, /await pendente/);
  assert.match(salvar, /return !estado\.salvando && !estado\.alterado && !estado\.conflitoArquivo/);
  assert.match(salvar, /estado\.promessaSalvar = new Promise/);
  assert.match(salvar, /estado\.promessaSalvar = null/);
  assert.match(salvar, /const edicaoNoInicio = estado\.edicao/);
  assert.match(salvar, /houveEdicaoDurante = estado\.edicao !== edicaoNoInicio/);
  assert.match(salvar, /if \(estado\.alterado\) \{\n        atualizarControlesEditor/);
  assert.doesNotMatch(salvar, /estado\.salvando = true;\n      renderEditor\(\)/);
});

testa('Workspace oferece retorno seguro, histórico local e lixeira deliberada', () => {
  assert.match(workspace, /function ocultarParaNavegacao\(\)/);
  assert.match(workspace, /function fechar\(destino\)/);
  assert.match(workspace, /function renderRevisoes\(idArquivo\)/);
  assert.match(workspace, /function restaurarRevisao\(revisao\)/);
  assert.match(workspace, /async function renderLixeira\(\)/);
  assert.match(workspace, /async function restaurarDaLixeira\(tipo, id\)/);
  assert.match(workspace, /async function descartarDaLixeira\(tipo, id\)/);
  assert.match(workspace, /async function esvaziarLixeira\(\)/);
  assert.match(workspace, /function estaNaLixeira\(registro\) \{ return !!\(registro && registro\.lixeiraEm\); \}/);
  const lixeira = entre(workspace, 'async function renderLixeira()', '\n\n  function renderTudo()');
  assert.match(lixeira, /nome\.textContent = item\.nome/);
  assert.doesNotMatch(lixeira, /innerHTML\s*\+=|`[^`]*\$\{/);
  assert.match(workspace, /Mover projeto para lixeira/);
  assert.match(workspace, /Mover para lixeira/);
  assert.match(workspace, /Excluir definitivamente/);
  assert.match(workspace, /Nada foi enviado/);
  assert.match(workspace, /Workspace local: arquivos não são enviados automaticamente/);
});


testa('lixeira preserva hierarquia, versões e espaço até descarte explícito', () => {
  const apagarProjeto = entre(workspace, 'async function apagarProjeto()', '\n  async function criarArquivo');
  const apagarArquivo = entre(workspace, 'async function apagarArquivo()', '\n  async function restaurarProjetoDaLixeira');
  const moverProjeto = entre(workspace, 'function moverProjetoParaLixeira(projeto, arquivosEsperados, quando)', '\n\n  function projetoAtivo');
  const moverArquivo = entre(workspace, 'function moverArquivoParaLixeira(arquivo, quando)', '\n  function moverProjetoParaLixeira');
  const descarte = entre(workspace, 'async function descartarDaLixeira(tipo, id)', '\n  function esvaziarLixeiraTransacional');
  assert.match(apagarProjeto, /await moverProjetoParaLixeira\(projeto, arquivosEsperados, agora\(\)\)/);
  assert.match(moverProjeto, /lixeiraRaiz: 'projeto'/);
  assert.match(moverProjeto, /arquivos\.index\('projetoId'\)\.getAll\(projeto\.id\)/);
  assert.match(apagarArquivo, /await moverArquivoParaLixeira\(arquivo, agora\(\)\)/);
  assert.match(moverArquivo, /lixeiraRaiz: 'arquivo'/);
  assert.doesNotMatch(moverArquivo, /revisoes\.delete/);
  assert.match(descarte, /confirm\('Excluir definitivamente/);
  assert.match(workspace, /itens recuperáveis continuam ocupando espaço local/i);
  assert.match(workspace, /O cálculo inclui arquivos, versões locais e itens recuperáveis da lixeira/);
});
console.log(`${certos}/${certos + falhas} testes do Workspace local passaram`);
process.exitCode = falhas ? 1 : 0;
