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
  assert.match(sw, /rebocl-chat-v67/);
  assert.match(sw, /'\.\/chat-workspace\.js'/);
  assert.match(workflow, /'chat-workspace\.js'/);
  assert.match(workflow, /chat-workspace\.js tools\/testes\/\*\.js/);
  assert.match(workflow, /chat-workspace\.js chat-comandos-locais\.js|chat-comandos-locais\.js chat-filtro-chips\.js chat-workspace\.js/);
  assert.match(continuidade, /chat-workspace\\\.js/);
  assert.match(corredor, /'workspace-local\.js'/);
  assert.match(retrato, /Workspace interno local-first/);
  assert.match(retrato, /rebocl-workspace-local-v1/);
  assert.match(retrato, /rebocl-chat-v67/);
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

testa('autosave preserva edição pendente se a validação falhar ou houver nova digitação', () => {
  const salvar = entre(workspace, 'async function salvarArquivoAtual(origem)', '\n  async function limitarRevisoes');
  assert.match(workspace, /edicao: 0/);
  assert.match(workspace, /function agendarSalvarAutomatico\(\)/);
  assert.match(workspace, /estado\.edicao\+\+/);
  assert.match(salvar, /const edicaoNoInicio = estado\.edicao/);
  assert.match(salvar, /houveEdicaoDurante = estado\.edicao !== edicaoNoInicio/);
  assert.match(salvar, /if \(estado\.alterado\) \{\n        atualizarControlesEditor/);
  assert.doesNotMatch(salvar, /estado\.salvando = true;\n      renderEditor\(\)/);
});

testa('Workspace oferece retorno seguro, histórico local e limpeza deliberada', () => {
  assert.match(workspace, /function ocultarParaNavegacao\(\)/);
  assert.match(workspace, /function fechar\(destino\)/);
  assert.match(workspace, /function renderRevisoes\(idArquivo\)/);
  assert.match(workspace, /function restaurarRevisao\(revisao\)/);
  assert.match(workspace, /Apagar o projeto local/);
  assert.match(workspace, /Apagar o arquivo local/);
  assert.match(workspace, /Nada foi enviado/);
  assert.match(workspace, /Workspace local: arquivos não são enviados automaticamente/);
});

console.log(`${certos}/${certos + falhas} testes do Workspace local passaram`);
process.exitCode = falhas ? 1 : 0;
