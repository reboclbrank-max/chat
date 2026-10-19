// Contrato offline: PWA espera escolha explícita e nunca atualiza no meio de escrita.
// Sem navegador, token, conversa, API, service worker real ou Cache Storage real.
'use strict';
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
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

const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));
const pwa = fonte('chat-pwa.js');
testa('as quatro rotas usam o mesmo cliente PWA externo local', () => {
  for (const html of Object.values(fontes)) {
    const cliente = html.indexOf('<script src="chat-pwa.js"></script>');
    const bind = html.indexOf("$('btn-aplicar-atualizacao').onclick = solicitarAtualizacaoPwa;");
    assert(cliente >= 0 && cliente < bind, 'cliente precisa definir o handler antes do bind');
    assert.equal((html.match(/chat-pwa\.js/g) || []).length, 1);
    assert.match(html, /iniciarPwaCompartilhado\(\);/);
    assert.doesNotMatch(html, /function marcarAtualizacaoPwa\(registro\)/);
  }
  assert.match(pwa, /function marcarAtualizacaoPwa\(registro\)/);
  assert.match(pwa, /function iniciarPwaCompartilhado\(\)/);
  assert.match(pwa, /navigator\.serviceWorker\.register\('sw\.js', \{ updateViaCache: 'none' \}\)/);
  assert.doesNotMatch(pwa, /https?:\/\//);
});

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' só oferece atualização após espera explícita', () => {
    assert.match(html, /id="aviso-atualizacao"/);
    assert.match(html, /Envie ou copie o rascunho antes de atualizar/);
    assert.match(html, /btn-aplicar-atualizacao/);
    assert.match(pwa, /function solicitarAtualizacaoPwa\(\)/);
    assert.match(pwa, /if \(!atualizacaoPwaPendente \|\| escritaEmAndamento\(\)\)/);
    assert.match(pwa, /worker\.postMessage\(\{ tipo: 'REBOCL_ATIVAR_ATUALIZACAO' \}\)/);
    assert.match(pwa, /if \(recarregarAposAtualizacaoPwa\) window\.location\.reload\(\)/);
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

testa('cliente compartilhado é precacheado e observado pela barreira de continuidade', () => {
  const sw = fonte('sw.js');
  const workflow = fonte('.github/workflows/testes-rapidos.yml');
  const continuidade = fonte('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v10/);
  assert.match(sw, /'\.\/chat-pwa\.js'/);
  assert.match(workflow, /'chat-pwa\.js'/);
  assert(continuidade.includes('chat-pwa\\.js'), 'porta de continuidade não observa chat-pwa.js');
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'continuidade-pwa-'));
  try {
    const evento = path.join(pasta, 'push.json');
    fs.writeFileSync(evento, JSON.stringify({ commits: [{ modified: ['chat-pwa.js'] }] }));
    const r = spawnSync('node', [path.join(raiz, 'tools', 'testes', 'continuidade.js')], {
      cwd: raiz,
      encoding: 'utf8',
      env: Object.assign({}, process.env, { GITHUB_EVENT_PATH: evento })
    });
    assert.notEqual(r.status, 0, 'cliente PWA sem continuidade não pode passar');
    assert.match(String(r.stdout || '') + String(r.stderr || ''), /push operacional atualiza CONTINUIDADE\.md/);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});

testa('service worker v10 instala sem se ativar sozinho', () => {
  const sw = fonte('sw.js');
  const instalacao = trecho(sw, "self.addEventListener('install'", "self.addEventListener('message'");
  const mensagem = trecho(sw, "self.addEventListener('message'", "self.addEventListener('activate'");
  assert.match(sw, /rebocl-chat-v10/);
  assert.match(sw, /'\.\/chat-pwa\.js'/);
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
function runtimePwa() {
  const mensagens = [];
  const entrada = { value: '', focus() {} };
  const botao = { disabled: false, textContent: 'Atualizar agora' };
  const worker = { postMessage: (mensagem) => mensagens.push(mensagem), addEventListener() {} };
  const registro = { waiting: worker, addEventListener() {} };
  let chamadaRegistro = null;
  let intervalo = null;
  const contexto = {
    Promise, Object, String, setTimeout: (fn) => { fn(); return 0; },
    setInterval: (fn, ms) => { intervalo = ms; return 1; },
    navigator: { serviceWorker: {
      controller: null,
      addEventListener() {},
      register: (url, opcoes) => { chamadaRegistro = { url, opcoes }; return Promise.resolve(registro); }
    } },
    window: { location: { reload() {} } },
    globalThis: null
  };
  contexto.globalThis = contexto;
  vm.createContext(contexto);
  vm.runInContext(`
    let registroPwa = null, atualizacaoPwaPendente = null, recarregarAposAtualizacaoPwa = false, intervaloAtualizacaoPwa = null;
    function atualizarAvisoAtualizacaoPwa() {}
    function escritaEmAndamento() { return false; }
    const $ = (id) => id === 'entrada' ? entrada : (id === 'btn-aplicar-atualizacao' ? botao : null);
  `, contexto);
  contexto.entrada = entrada;
  contexto.botao = botao;
  vm.runInContext(pwa + '\nglobalThis.solicitarTeste = solicitarAtualizacaoPwa; globalThis.iniciarTeste = iniciarPwaCompartilhado;', contexto);
  contexto.iniciarTeste();
  return Promise.resolve().then(() => Promise.resolve()).then(() => ({ contexto, mensagens, chamadaRegistro, intervalo }));
}
async function principal() {
  await testaAsync('cliente externo registra somente a casca local e só ativa por escolha', async () => {
    const r = await runtimePwa();
    assert.deepEqual(r.chamadaRegistro, { url: 'sw.js', opcoes: { updateViaCache: 'none' } });
    assert.equal(r.intervalo, 300000);
    assert.equal(r.mensagens.length, 0);
    r.contexto.solicitarTeste();
    assert.deepEqual(r.mensagens, [{ tipo: 'REBOCL_ATIVAR_ATUALIZACAO' }]);
  });
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
