// Limites locais da interface: não leem arquivo grande, não enviam texto excessivo
// e não deixam uma mensagem remota gigantesca virar trabalho ilimitado de Markdown.
// Contrato offline: sem token, navegador real, API, arquivo real ou rede.
'use strict';
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(rota) { return fs.readFileSync(path.join(raiz, rota), 'utf8'); }
function trecho(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
function renderizar(rota, entrada) {
  const html = fonte(rota);
  const inicio = html.indexOf('function escapar(');
  const fim = html.indexOf('const DONO_GITHUB', inicio);
  assert(inicio >= 0 && fim > inicio, 'renderizador ausente');
  return vm.runInNewContext(html.slice(inicio, fim) + '\nmarkdown(' + JSON.stringify(entrada) + ');');
}

const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' declara limites fechados para texto, arquivo e Markdown', () => {
    assert.match(html, /const LIMITE_MENSAGEM_COMPOSITOR = 12000;/);
    assert.match(html, /const LIMITE_ARQUIVO_TEXTO = 1024 \* 1024;/);
    assert.match(html, /const LIMITE_RENDERIZACAO_MARKDOWN = 60000;/);
    assert.match(html, /function limitarMarkdownParaTela\(t\)/);
    assert.match(html, /let s = escapar\(limitarMarkdownParaTela\(t\)\);/);
  });
  testa(rota + ' barra texto longo antes de cada envio, criação e reenvio', () => {
    const enviar = trecho(html, 'async function enviar()', '\nfunction iniciarPolling');
    const nova = trecho(html, 'async function novaConversa()', '\n/* ---------- conversa ---------- */');
    const reenvio = trecho(html, 'async function reenviarUltima()', '\nfunction faixaOffline');
    assert.match(enviar, /if \(!mensagemDentroDoLimite\(texto\)\) \{ avisoMensagemLonga\(\); caixa\.focus\(\); return; \}/);
    assert.match(nova, /texto\)\.trim\(\)\.length > LIMITE_MENSAGEM_COMPOSITOR/);
    assert.match(reenvio, /if \(!mensagemDentroDoLimite\(texto\)\)/);
    assert.match(html, /nada foi enviado/);
  });
  testa(rota + ' não lê arquivo grande e anexa apenas o que ainda cabe', () => {
    const drop = trecho(html, 'function lerArquivoDrop(ev)', '\n\n/* ---------- lightbox');
    assert.match(drop, /Number\(arq\.size\) > LIMITE_ARQUIVO_TEXTO/);
    assert.match(drop, /nada foi lido ou enviado/);
    assert.match(drop, /const espaco = Math\.max\(0, LIMITE_MENSAGEM_COMPOSITOR - caixa\.value\.length - separador\.length\)/);
    assert.match(drop, /texto\.slice\(0, Math\.min\(8000, espaco\)\)/);
    assert.match(drop, /Nada foi enviado/);
  });
  testa(rota + ' mostra contador com limite e estado visual de excesso', () => {
    assert.match(html, /id="contador"/);
    assert.match(html, /tamanho\.toLocaleString\('pt-BR'\) \+ '\/' \+ LIMITE_MENSAGEM_COMPOSITOR/);
    assert.match(html, /el\.classList\.toggle\('excedido', tamanho > LIMITE_MENSAGEM_COMPOSITOR\)/);
    assert.match(html, /\.composer #contador\.excedido/);
  });
}

testa('o bloco de limitação de Markdown é idêntico nas quatro rotas', () => {
  const blocos = Object.values(fontes).map((html) => trecho(html, 'const LIMITE_RENDERIZACAO_MARKDOWN', '\nfunction markdown(t)'));
  assert.equal(new Set(blocos).size, 1);
});
testa('a tela limita resposta remota antes de processar Markdown e preserva escape', () => {
  const entrada = '<script>não executar</script> ' + 'x'.repeat(70000);
  const html = renderizar('index.html', entrada);
  assert.match(html, /&lt;script&gt;não executar&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>/i);
  assert.match(html, /Exibição limitada a 60\.000 caracteres/);
  assert(html.length < 61000, 'a saída renderizada precisa permanecer limitada');
});
testa('o corte de Markdown também vale para as demais rotas', () => {
  for (const rota of rotas.slice(1)) {
    const html = renderizar(rota, 'z'.repeat(60001));
    assert.match(html, /Exibição limitada a 60\.000 caracteres/);
    assert(html.length < 61000);
  }
});

console.log(`${certos}/${certos + falhas} testes de limites de conteúdo da interface passaram`);
process.exitCode = falhas ? 1 : 0;
