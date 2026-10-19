// Contrato offline: transparência de rede e bloqueio temporário de novas requisições da página.
// Não usa token, conversa, navegador real, API, modelo ou rede.
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
function fonte(rota) { return fs.readFileSync(path.join(raiz, rota), 'utf8'); }
function trecho(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}
function blocoRede(html) { return trecho(html, 'function erroDaApi(status) {', '\nconst TAMANHO_PAGINA_COMENTARIOS'); }
function blocoModo(html) { return trecho(html, 'function textoFaixaModoLocal()', '\nfunction mostrarProgressoLocal(t)'); }
function blocoConfig(html) { return trecho(html, 'function mostrarConfig(', '\n/* ---------- lista ---------- */'); }
function blocoCacheUm(html) {
  const inicio = html.indexOf('(function(){\n  const MEM = new Map()');
  const fim = html.indexOf('\n})();\n\n(function(){\n  const ALVO', inicio);
  assert(inicio >= 0 && fim > inicio, 'encadeamento de cache um ausente');
  return html.slice(inicio, fim + '\n})();'.length);
}
function blocoCacheDois(html) {
  const inicio = html.indexOf('(function(){\n  const ALVO =');
  const fim = html.indexOf('\n})();\n(function () { const K', inicio);
  assert(inicio >= 0 && fim > inicio, 'encadeamento de cache dois ausente');
  return html.slice(inicio, fim + '\n})();'.length);
}
const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' explica preparo local, rede e limites sem prometer firewall', () => {
    assert.match(html, /id="btn-somente-local"/);
    assert.match(html, /id="status-somente-local" role="status"/);
    assert.match(html, /Na primeira preparação, a biblioteca e o modelo podem ser baixados/);
    assert.match(html, /Não é um firewall do aparelho/);
    assert.match(html, /Ao recarregar, ele desliga/);
    assert.match(html, /title="Cérebro local; a primeira preparação pode baixar biblioteca e modelo"/);
    for (const [tipo, propriedade] of [['HTMLImageElement', 'src'], ['HTMLMediaElement', 'src'], ['HTMLScriptElement', 'src'], ['HTMLIFrameElement', 'src'], ['HTMLSourceElement', 'src'], ['HTMLLinkElement', 'href']]) {
      assert.match(html, new RegExp("protegerAtribuicaoDeRecurso\\(window\\." + tipo + ", '" + propriedade + "'\\)"));
    }
  });
  testa(rota + ' exige cérebro preparado e confirmação antes de bloquear a rede', () => {
    const modo = blocoModo(html);
    assert.match(modo, /if \(!conversa\)/);
    assert.match(modo, /if \(!MODO_LOCAL\.engine\)/);
    assert.match(modo, /if \(!confirm\('Ligar modo somente-local nesta página\?/);
    assert.match(modo, /somenteLocalNestaPagina = true/);
    assert.match(modo, /pararPolling\(\)/);
    assert.match(modo, /clearInterval\(intervaloAtualizacaoPwa\)/);
    assert.match(modo, /sincronizar\.disabled = ativo/);
    assert.match(modo, /modoSomenteLocalAtivo\(\)\) return Promise\.reject\(erroLocal\('preparo-local-necessario'\)\)/);
  });
  testa(rota + ' não deixa modo estrito cair para turbo, sync, troca de modelo ou link externo', () => {
    assert.match(html, /if \(modoSomenteLocalAtivo\(\)\) \{ alert\('O modo somente-local bloqueia sincronização/);
    assert.match(html, /if \(modoSomenteLocalAtivo\(\)\) \{ alert\('O modo somente-local está ativo\. Desligue-o antes de usar o TURBO de rede/);
    assert.match(html, /if \(modoSomenteLocalAtivo\(\)\) \{ alert\('Desligue o modo somente-local antes de trocar o cérebro preparado/);
    assert.match(html, /evento\.target\.closest\('a\[href\]'\)/);
    assert.match(html, /evento\.preventDefault\(\);\n\s*avisarRedeBloqueada\(\);/);
    assert.match(html, /\$\('btn-console'\)\.onclick = \(\) => \{ if \(modoSomenteLocalAtivo\(\)\) \{ avisarRedeBloqueada\(\); return; \} location\.href = 'console\.html'; \};/);
  });
  testa(rota + ' tem saída acessível das configurações para voltar à conversa ou lista', () => {
    assert.match(html, /id="btn-voltar-config" aria-label="Voltar ao Chat"/);
    assert.match(html, /function fecharConfiguracao\(\)/);
    assert.match(html, /\$\('btn-voltar-config'\)\.onclick = fecharConfiguracao;/);
    assert.match(html, /else if \(!\$\('tela-config'\)\.classList\.contains\('oculto'\)\) fecharConfiguracao\(\)/);
  });
}

testa('núcleos de rede, modo e retorno de configuração mantêm paridade nas quatro rotas', () => {
  assert.equal(new Set(Object.values(fontes).map(blocoRede)).size, 1);
  assert.equal(new Set(Object.values(fontes).map(blocoModo)).size, 1);
  assert.equal(new Set(Object.values(fontes).map(blocoConfig)).size, 1);
});
testa('modo somente-local é temporário, sem chave persistente própria', () => {
  const combinado = fontes['index.html'];
  assert.match(combinado, /let somenteLocalNestaPagina = false/);
  assert.doesNotMatch(combinado, /(?:localStorage|sessionStorage)\.(?:setItem|getItem|removeItem)\([^\n]*somente[_-]?local/i);
});

function runtimeRede(html, fetchOriginal, extras = {}) {
  const contexto = {
    API: 'https://api.exemplo.test', token: 'inerte', Promise, Object, Number, String, JSON, Math, URL,
    setTimeout: (fn) => { fn(); return 0; }, clearInterval: () => {}, console, location: { href: 'https://chat.exemplo.test/' },
    ...extras
  };
  contexto.window = contexto;
  contexto.fetch = fetchOriginal;
  vm.createContext(contexto);
  vm.runInContext(blocoRede(html) + '\nglobalThis.ativarTeste = () => { somenteLocalNestaPagina = true; }; globalThis.desativarTeste = () => { somenteLocalNestaPagina = false; }; globalThis.apiTeste = api; globalThis.carregarTeste = typeof carregarScript;', contexto);
  return contexto;
}
function instalarEncadeamentoCache(html, contexto) {
  vm.runInContext(blocoCacheUm(html), contexto);
  vm.runInContext(blocoCacheDois(html), contexto);
}


async function principal() {
  await testaAsync('guarda bloqueia fetch novo e API antes de chamar a rede', async () => {
    let chamadas = 0;
    const contexto = runtimeRede(fontes['index.html'], () => {
      chamadas++;
      return Promise.resolve({ ok: true, text: async () => '{"ok":true}' });
    });
    contexto.ativarTeste();
    await assert.rejects(() => contexto.window.fetch('https://exemplo.test/rede'), (erro) => erro && erro.codigoLocal === 'rede-bloqueada-local');
    await assert.rejects(() => contexto.apiTeste('/repos/exemplo'), (erro) => erro && erro.codigoLocal === 'rede-bloqueada-local');
    assert.equal(chamadas, 0);
  });
  await testaAsync('ao desligar, a guarda volta a delegar a fetch normal', async () => {
    let chamadas = 0;
    const contexto = runtimeRede(fontes['index.html'], () => {
      chamadas++;
      return Promise.resolve({ ok: true, text: async () => '{"ok":true}' });
    });
    contexto.ativarTeste();
    contexto.desativarTeste();
    const resposta = await contexto.window.fetch('https://exemplo.test/permitida');
    assert.equal(resposta.ok, true);
    assert.equal(chamadas, 1);
  });
  await testaAsync('encadeamentos posteriores de cache continuam delegando à guarda', async () => {
    let chamadas = 0;
    const contexto = runtimeRede(fontes['index.html'], () => {
      chamadas++;
      return Promise.resolve({ ok: true, headers: { get: () => 'text/plain' }, clone: () => ({ text: async () => 'inerte' }), text: async () => 'inerte' });
    });
    instalarEncadeamentoCache(fontes['index.html'], contexto);
    contexto.ativarTeste();
    await assert.rejects(() => contexto.window.fetch('https://fonte.exemplo.test/dado'), (erro) => erro && erro.codigoLocal === 'rede-bloqueada-local');
    assert.equal(chamadas, 0);
  });
  await testaAsync('atribuição nova de imagem ou mídia externa também é bloqueada enquanto estrito', async () => {
    function ImagemFalsa() {}
    function MidiaFalsa() {}
    for (const Tipo of [ImagemFalsa, MidiaFalsa]) {
      Object.defineProperty(Tipo.prototype, 'src', { configurable: true, get() { return this._src || ''; }, set(valor) { this._src = String(valor); } });
    }
    const contexto = runtimeRede(fontes['index.html'], () => Promise.resolve({ ok: true, text: async () => '' }), {
      HTMLImageElement: ImagemFalsa, HTMLMediaElement: MidiaFalsa
    });
    const imagem = new ImagemFalsa();
    const midia = new MidiaFalsa();
    contexto.ativarTeste();
    imagem.src = 'https://imagem.exemplo.test/a.png';
    midia.src = 'https://audio.exemplo.test/a.mp3';
    assert.equal(imagem.src, '');
    assert.equal(midia.src, '');
    contexto.desativarTeste();
    imagem.src = 'https://imagem.exemplo.test/liberada.png';
    assert.equal(imagem.src, 'https://imagem.exemplo.test/liberada.png');
  });
  console.log(`${certos}/${certos + falhas} testes de transparência e modo somente-local passaram`);
  process.exitCode = falhas ? 1 : 0;
}
principal().catch((erro) => { console.error(erro && erro.stack ? erro.stack : erro); process.exitCode = 1; });
