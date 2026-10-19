// Contrato offline: PWA espera escolha explícita e nunca atualiza no meio de escrita.
// Sem navegador, token, conversa, API, service worker real ou Cache Storage real.
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
async function testaAsync(nome, fn) {
  try { await fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function fonte(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function trecho(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
function blocoApi(html) { return trecho(html, 'function erroDaApi(status) {', '\nconst TAMANHO_PAGINA_COMENTARIOS'); }
function blocoPwa(html) { return trecho(html, 'function marcarAtualizacaoPwa(registro) {', '\n(async function iniciar()'); }

const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
testa('as quatro rotas mantêm o mesmo cliente de atualização segura', () => {
  assert.equal(new Set(Object.values(fontes).map(blocoPwa)).size, 1);
  assert.equal(new Set(Object.values(fontes).map(blocoApi)).size, 1);
});

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' só oferece atualização após espera explícita', () => {
    assert.match(html, /id="aviso-atualizacao"/);
    assert.match(html, /function solicitarAtualizacaoPwa\(\)/);
    assert.match(html, /if \(!atualizacaoPwaPendente \|\| escritaEmAndamento\(\)\)/);
    assert.match(html, /Envie ou copie o rascunho antes de atualizar/);
    assert.match(html, /worker\.postMessage\(\{ tipo: 'REBOCL_ATIVAR_ATUALIZACAO' \}\)/);
    assert.match(html, /if \(recarregarAposAtualizacaoPwa\) window\.location\.reload\(\)/);
  });
  testa(rota + ' contabiliza POST/PATCH até a confirmação ou falha', () => {
    const api = blocoApi(html);
    assert.match(api, /function acompanharEscrita\(promessa\)/);
    assert.match(api, /escritasEmAndamento\+\+/);
    assert.match(api, /escritasEmAndamento = Math\.max\(0, escritasEmAndamento - 1\)/);
    assert.match(api, /return metodo === 'GET' \? tentativa : acompanharEscrita\(tentativa\)/);
    assert.match(html, /importacaoEmAndamento = true/);
    assert.match(html, /sincronizacaoLocalEmAndamento = true/);
  });
  testa(rota + ' oferece limpeza estreita de cópias offline sem apagar token', () => {
    assert.match(html, /id="btn-limpar-copias"/);
    assert.match(html, /const CHAVES_COPIAS_OFFLINE = Object\.freeze/);
    assert.match(html, /function limparCopiasOffline\(\)/);
    assert.match(html, /limparCacheConversasOffline\(\)/);
    assert.match(html, /limparTrocasLocaisOffline\(\)/);
    assert.doesNotMatch(trecho(html, 'const CHAVES_COPIAS_OFFLINE', '/* ---------- sugestões'), /CHAVE_TOKEN|localStorage\.clear\(|sessionStorage\.clear\(/);
  });
}

testa('service worker v8 instala sem se ativar sozinho', () => {
  const sw = fonte('sw.js');
  const instalacao = trecho(sw, "self.addEventListener('install'", "self.addEventListener('message'");
  const mensagem = trecho(sw, "self.addEventListener('message'", "self.addEventListener('activate'");
  assert.match(sw, /rebocl-chat-v8/);
  assert.doesNotMatch(instalacao, /skipWaiting/);
  assert.match(mensagem, /evento\.data\.tipo === 'REBOCL_ATIVAR_ATUALIZACAO'/);
  assert.match(mensagem, /self\.skipWaiting\(\)/);
  assert.match(sw, /requisicao\.method !== 'GET'/);
  assert.match(sw, /url\.search/);
  assert.match(sw, /cache: 'no-store'/);
});

function runtimeApi(html, fetchFalso) {
  const contexto = {
    API: 'https://api.exemplo.test', token: 'inerte', Promise, Object, Number, String, JSON, Math,
    setTimeout: (fn) => { fn(); return 0; }, fetch: fetchFalso
  };
  vm.createContext(contexto);
  vm.runInContext(blocoApi(html) + '\nglobalThis.apiTeste = api; globalThis.escritasTeste = () => escritasEmAndamento;', contexto);
  return contexto;
}
async function principal() {
  await testaAsync('POST mantém trava de atualização enquanto a confirmação está pendente', async () => {
    let liberar;
    const contexto = runtimeApi(fontes['index.html'], () => new Promise((res) => { liberar = res; }));
    const pendente = contexto.apiTeste('/escrita', { method: 'POST', body: '{}' });
    assert.equal(contexto.escritasTeste(), 1);
    liberar({ ok: true, text: async () => '{"ok":true}' });
    await pendente;
    assert.equal(contexto.escritasTeste(), 0);
  });
  await testaAsync('falha POST também solta a trava sem repetir escrita', async () => {
    let chamadas = 0;
    const contexto = runtimeApi(fontes['index.html'], () => { chamadas++; return Promise.reject(new Error('rede inerte')); });
    await assert.rejects(() => contexto.apiTeste('/escrita', { method: 'PATCH', body: '{}' }));
    assert.equal(chamadas, 1);
    assert.equal(contexto.escritasTeste(), 0);
  });
  console.log(`${certos}/${certos + falhas} testes de atualização PWA segura passaram`);
  process.exitCode = falhas ? 1 : 0;
}
principal().catch((erro) => { console.error(erro && erro.stack ? erro.stack : erro); process.exitCode = 1; });
