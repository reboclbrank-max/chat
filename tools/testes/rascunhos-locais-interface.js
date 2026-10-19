// Rascunhos e prévia textual: contrato local/opt-in, sem API, token, navegador real ou arquivo real.
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
const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
function blocoRascunhos(html) {
  return trecho(html, "const CHAVE_OPTIN_RASCUNHOS", "\nfunction mensagemRascunho");
}
function blocoCompletoRascunhos(html) {
  return trecho(html, "/* ---------- rascunhos locais e prévia de texto anexado (P1D/P1E) ---------- */", "/* ---------- lightbox das imagens (v1.6) ---------- */");
}
function blocoEnviar(html) { return trecho(html, 'async function enviar()', '\n// Quando o workflow privado falha'); }
function blocoNova(html) { return trecho(html, 'async function novaConversa()', '\n\n/* ---------- conversa ---------- */'); }

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' oferece opt-in e restauração sem exibir o conteúdo do rascunho', () => {
    assert.match(html, /id="optin-rascunhos"/);
    assert.match(html, /id="btn-apagar-rascunhos"/);
    assert.match(html, /id="aviso-rascunho"/);
    assert.match(html, /id="btn-restaurar-rascunho"/);
    assert.match(html, /id="btn-descartar-rascunho"/);
    assert.match(html, /nunca é enviado, sincronizado ou mostrado automaticamente/);
    assert.match(html, /Ele não foi enviado\./);
  });
  testa(rota + ' pré-visualiza trecho textual sem tratar como anexo enviado', () => {
    const drop = trecho(html, 'function lerArquivoDrop(ev)', '\n\n/* ---------- rascunhos locais');
    assert.match(html, /id="previsao-arquivo-texto"/);
    assert.match(drop, /mostrarPreviaArquivoTexto\(arq\.name, arq\.size, trecho\.length, trecho\.length < texto\.length\)/);
    assert.match(html, /Nada foi enviado\./);
    assert.doesNotMatch(drop, /caixa\.value\s*=\s*[^;]*arq\.name/);
  });
  testa(rota + ' salva antes de limpar a tela e só remove após confirmação conhecida', () => {
    const enviar = blocoEnviar(html);
    assert.match(enviar, /salvarRascunhoAtual\(caixa\.value\);/);
    assert.match(enviar, /registrarComentario\(c\);\n\s*limparRascunhoPorChave\(chaveRascunhoAtual\(\), texto\);/);
    assert.match(enviar, /limparRascunhoPorChave\(chaveRascunhoAtual\(\), texto\);\n\s*limparPreviaArquivoTexto\(\);/);
    assert.match(enviar, /limparRascunhoPorChave\(chaveRascunhoAtual\(\), texto\);\n\s*limparPreviaArquivoTexto\(\);\n\s*caixa\.value = ''/);
    assert.match(enviar, /encerrarEstadoEntrega\(estadoEntregaParaErro\(e\), '⚠️ entrega', mensagemErroSeguro\(e\)\);\n\s*avisarRascunhoPreservadoAposFalha\(\);/);
  });
  testa(rota + ' permite recuperar uma nova conversa explicitamente no prompt', () => {
    const nova = blocoNova(html);
    assert.match(nova, /const rascunhoNovo = optinRascunhosAtivo\(\) \? lerRascunhosLocais\(\)\.itens\.nova : null;/);
    assert.match(nova, /prompt\('Primeira mensagem:', rascunhoNovo \? rascunhoNovo\.texto : ''\)/);
    assert.match(nova, /salvarRascunhoAtual\(texto\);/);
    assert.match(nova, /limparRascunhoPorChave\('nova', texto\);/);
  });
}

testa('o núcleo de rascunhos e prévia é idêntico nas quatro rotas', () => {
  assert.equal(new Set(Object.values(fontes).map(blocoCompletoRascunhos)).size, 1);
});
testa('o núcleo não toca token, sessão, API ou limpeza global de armazenamento', () => {
  const bloco = blocoRascunhos(fontes['index.html']);
  assert.doesNotMatch(bloco, /CHAVE_TOKEN|sessionStorage|localStorage\.clear\(|\bfetch\s*\(|\bapi\s*\(/);
  assert.match(bloco, /localStorage\.setItem\(CHAVE_RASCUNHOS_LOCAIS/);
  assert.match(bloco, /localStorage\.removeItem\(CHAVE_RASCUNHOS_LOCAIS/);
});

function armazenamentoFalso() {
  const dados = Object.create(null);
  return {
    getItem: (chave) => Object.prototype.hasOwnProperty.call(dados, chave) ? dados[chave] : null,
    setItem: (chave, valor) => { dados[chave] = String(valor); },
    removeItem: (chave) => { delete dados[chave]; },
    bruto: () => Object.assign({}, dados)
  };
}
function runtimeRascunhos(html) {
  const localStorage = armazenamentoFalso();
  const contexto = { localStorage, JSON, Object, Number, String, RegExp, Date: { now: () => 1e12 } };
  const codigo = [
    'let conversa = null;',
    'const LIMITE_MENSAGEM_COMPOSITOR = 12000;',
    blocoRascunhos(html),
    'globalThis.definirConversa = (valor) => { conversa = valor; };',
    'globalThis.salvarTeste = salvarRascunhoAtual;',
    'globalThis.lerTeste = lerRascunhosLocais;',
    'globalThis.limparTeste = limparRascunhoPorChave;',
    'globalThis.contarTeste = contarRascunhosLocais;',
    'globalThis.chaveTeste = chaveRascunhoAtual;',
    'globalThis.chaveOptinTeste = CHAVE_OPTIN_RASCUNHOS;',
    'globalThis.chaveDadosTeste = CHAVE_RASCUNHOS_LOCAIS;',
    'globalThis.limiteTeste = LIMITE_RASCUNHOS_LOCAIS;'
  ].join('\n');
  vm.createContext(contexto);
  vm.runInContext(codigo, contexto);
  return { contexto, localStorage };
}

testa('não grava conteúdo antes do opt-in explícito', () => {
  const { contexto, localStorage } = runtimeRascunhos(fontes['index.html']);
  contexto.definirConversa(17);
  assert.equal(contexto.salvarTeste('texto particular'), 'desligado');
  assert.deepEqual(localStorage.bruto(), {});
});
testa('separa rascunhos por conversa e preserva somente campos fechados', () => {
  const { contexto, localStorage } = runtimeRascunhos(fontes['index.html']);
  localStorage.setItem(contexto.chaveOptinTeste, '1');
  contexto.definirConversa(17);
  assert.equal(contexto.salvarTeste('rascunho da conversa 17'), 'salvo');
  contexto.definirConversa(18);
  assert.equal(contexto.salvarTeste('rascunho da conversa 18'), 'salvo');
  const dados = contexto.lerTeste();
  assert.deepEqual(Object.keys(dados.itens).sort(), ['conversa:17', 'conversa:18']);
  assert.equal(dados.itens['conversa:17'].texto, 'rascunho da conversa 17');
  assert.equal(contexto.contarTeste(), 2);
  const bruto = JSON.parse(localStorage.getItem(contexto.chaveDadosTeste));
  assert.deepEqual(Object.keys(bruto), ['versao', 'itens']);
});
testa('ignora armazenamento corrompido, token indevido e texto que ultrapassa o teto do compositor', () => {
  const { contexto, localStorage } = runtimeRascunhos(fontes['index.html']);
  localStorage.setItem(contexto.chaveOptinTeste, '1');
  localStorage.setItem(contexto.chaveDadosTeste, '{quebrado');
  assert.equal(contexto.contarTeste(), 0);
  contexto.definirConversa(19);
  assert.equal(contexto.salvarTeste('github_pat_' + 'a'.repeat(24)), 'proibido');
  assert.equal(contexto.contarTeste(), 0);
  assert.equal(contexto.salvarTeste('x'.repeat(12001)), 'invalido');
  assert.equal(contexto.contarTeste(), 0);
});
testa('não apaga rascunho mais novo ao confirmar texto diferente e respeita o limite local', () => {
  const { contexto, localStorage } = runtimeRascunhos(fontes['index.html']);
  localStorage.setItem(contexto.chaveOptinTeste, '1');
  for (let i = 1; i <= contexto.limiteTeste; i++) {
    contexto.definirConversa(i);
    assert.equal(contexto.salvarTeste('texto ' + i), 'salvo');
  }
  contexto.definirConversa(999);
  assert.equal(contexto.salvarTeste('não cabe'), 'limite');
  contexto.definirConversa(1);
  assert.equal(contexto.limparTeste('conversa:1', 'outro texto'), false);
  assert.equal(contexto.lerTeste().itens['conversa:1'].texto, 'texto 1');
  assert.equal(contexto.limparTeste('conversa:1', 'texto 1'), true);
  assert.equal(contexto.contarTeste(), contexto.limiteTeste - 1);
});

console.log(`${certos}/${certos + falhas} testes de rascunhos locais e prévia passaram`);
process.exitCode = falhas ? 1 : 0;
