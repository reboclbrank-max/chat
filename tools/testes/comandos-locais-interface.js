// 🧪 Roteiro operacional da interface: paridade das rotas e nenhuma saída de rede/escrita.
'use strict';
const assert = require('assert');
const { spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0, falhas = 0;
const primeirasMensagens = [];
const reenviosLocais = [];
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function trecho(texto, inicio, fim) {
  const a = texto.indexOf(inicio), b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}

const fonte = ler('chat-comandos-locais.js');
ok('roteiro local só reconhece os comandos exatos previstos', () => {
  const contexto = { window: {}, String, Object, RegExp };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  const responder = contexto.window.respostaComandoOperacionalLocal;
  assert.equal(typeof responder, 'function');
  for (const entrada of ['trabalho:', 'prioridades:', 'trabalho', '!prioridades']) {
    const saida = responder(entrada);
    assert.match(saida, /Trabalho da casa/);
    assert.match(saida, /nada obrigatório/i);
    assert.match(saida, /status: por e-mail ou Telegram/i);
    assert.match(saida, /não promete entrega, alcance, uso, satisfação ou SLA/i);
  }
  for (const entrada of ['trabalho agora', 'prioridades: hoje', 'status:', '', 'trabalhos:']) assert.equal(responder(entrada), '');
});
ok('roteiro local executável não contém transporte, segredo ou armazenamento', () => {
  const executavel = fonte.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(executavel, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|token|Authorization|https?:)\b/i);
});
for (const rota of rotas) {
  const html = ler(rota);
  ok(rota + ' intercepta o roteiro antes de rascunho, Issue ou motor', () => {
    const tag = '<script src="chat-comandos-locais.js"></script>';
    const pwa = html.indexOf('<script src="chat-pwa.js"></script>');
    const ativo = html.indexOf(tag);
    const inline = html.indexOf('<script>', ativo);
    assert(ativo > pwa && inline > ativo, 'ativo local deve carregar antes do código da rota');
    assert.equal((html.match(/chat-comandos-locais\.js/g) || []).length, 1);
    const envio = trecho(html, 'async function enviar() {', '\n// Quando o workflow privado falha');
    const comando = envio.indexOf('respostaComandoOperacionalLocal');
    const rascunho = envio.indexOf('salvarRascunhoAtual(caixa.value)');
    const escrita = envio.indexOf('api(');
    assert(comando >= 0 && comando < rascunho, 'interceptação precisa anteceder rascunho');
    if (escrita >= 0) assert(comando < escrita, 'interceptação precisa anteceder API');
    assert.match(envio, /bolha\('user', texto/);
    assert.match(envio, /bolha\('bot', respostaOperacionalLocal/);
    assert.match(envio, /bolha\('bot', respostaOperacionalLocal[\s\S]{0,500}return;/);
    const privado = envio.indexOf('if (ehComandoPrivadoLocal(texto))');
    assert(privado > comando && privado < rascunho, 'porta privada precisa anteceder rascunho');
    const privadoLocal = envio.slice(privado, rascunho);
    assert.match(privadoLocal, /try \{ respostaPrivadaLocal = await maosDaCasa\(texto\); \} catch \(_\) \{\}/);
    assert.match(privadoLocal, /Comando local não concluído/);
    assert.match(privadoLocal, /rolarFim\(\)[\s\S]{0,100}return;/);
    assert.doesNotMatch(privadoLocal, /salvarRascunhoAtual|api\s*\(|fetch\s*\(|localStorage/);
    // A allowlist privada falha fechada; não pode cair no rascunho normal se a mão falhar.
  });
  ok(rota + ' mantém comandos locais da primeira mensagem antes de rascunho ou Issue', () => {
    const nova = trecho(html, "async function novaConversa(sugestao = '') {", '\nasync function abrir(');
    const limite = nova.indexOf('LIMITE_MENSAGEM_COMPOSITOR');
    const token = nova.indexOf('pareceTokenDeAcesso(texto)');
    const operacional = nova.indexOf('if (respostaOperacionalLocal)');
    const privado = nova.indexOf('if (ehComandoPrivadoLocal(texto))');
    const rascunho = nova.indexOf('salvarRascunhoAtual(texto)');
    const issue = nova.indexOf('api(`/repos/${REPO}/issues`');
    assert(limite >= 0 && token > limite && operacional > token && privado > operacional, 'portas locais ficam depois de limite/token');
    assert(rascunho > privado && issue > rascunho, 'rascunho e Issue ficam depois das portas locais');
    const operacionalLocal = nova.slice(operacional, privado);
    assert.match(operacionalLocal, /if \(respostaOperacionalLocal\)/);
    assert.match(operacionalLocal, /abrirConversa\(\)/);
    assert.match(operacionalLocal, /bolha\('user', texto/);
    assert.match(operacionalLocal, /bolha\('bot', respostaOperacionalLocal/);
    assert.match(operacionalLocal, /focoSeguro\('entrada'\)[\s\S]{0,100}return;/);
    assert.doesNotMatch(operacionalLocal, /salvarRascunhoAtual|api\s*\(|fetch\s*\(|localStorage/);
    const privadoLocal = nova.slice(privado, rascunho);
    assert.match(privadoLocal, /if \(ehComandoPrivadoLocal\(texto\)\)/);
    assert.match(privadoLocal, /try \{ respostaPrivadaLocal = await maosDaCasa\(texto\); \} catch \(_\) \{\}/);
    assert.match(privadoLocal, /Comando local não concluído/);
    assert.match(privadoLocal, /focoSeguro\('entrada'\)[\s\S]{0,100}return;/);
    assert.doesNotMatch(privadoLocal, /salvarRascunhoAtual|api\s*\(|fetch\s*\(/);
    primeirasMensagens.push(nova.slice(operacional, rascunho));
  });
  ok(rota + ' reaplica portas locais ao reenviar antes de comentário remoto', () => {
    const reenvio = trecho(html, 'async function reenviarUltima() {', '\nfunction faixaOffline');
    const limite = reenvio.indexOf('if (!mensagemDentroDoLimite(texto))');
    const token = reenvio.indexOf('if (pareceTokenDeAcesso(texto))');
    const operacional = reenvio.indexOf('const respostaOperacionalLocal');
    const privado = reenvio.indexOf('if (ehComandoPrivadoLocal(texto))');
    const comentario = reenvio.indexOf('const c = await api(`/repos/${REPO}/issues/${conversa}/comments`');
    assert(limite >= 0 && token > limite && operacional > token && privado > operacional, 'portas do reenvio ficam depois do limite');
    assert(comentario > privado, 'comentário remoto fica depois das portas locais');
    const tokenLocal = reenvio.slice(token, operacional);
    assert.match(tokenLocal, /Token não foi reenviado/);
    assert.match(tokenLocal, /focoSeguro\('entrada'\)[\s\S]{0,100}return;/);
    assert.doesNotMatch(tokenLocal, /api\s*\(|fetch\s*\(|localStorage/);
    const operacionalLocal = reenvio.slice(operacional, privado);
    assert.match(operacionalLocal, /if \(respostaOperacionalLocal\)/);
    assert.match(operacionalLocal, /bolha\('bot', respostaOperacionalLocal/);
    assert.match(operacionalLocal, /focoSeguro\('entrada'\)[\s\S]{0,100}return;/);
    assert.doesNotMatch(operacionalLocal, /api\s*\(|fetch\s*\(|localStorage/);
    const privadoLocal = reenvio.slice(privado, comentario);
    assert.match(privadoLocal, /try \{ respostaPrivadaLocal = await maosDaCasa\(texto\); \} catch \(_\) \{\}/);
    assert.match(privadoLocal, /Comando local não concluído/);
    assert.match(privadoLocal, /finally \{ if \(botao\) botao\.disabled = false; \}/);
    assert.doesNotMatch(privadoLocal, /api\s*\(|fetch\s*\(|localStorage/);
    reenviosLocais.push(reenvio.slice(token, comentario));
  });
}
ok('porta local do reenvio mantém paridade entre as quatro rotas', () => {
  assert.equal(new Set(reenviosLocais.map((bloco) => bloco)).size, 1);
});

ok('porta local da primeira mensagem mantém paridade entre as quatro rotas', () => {
  assert.equal(new Set(primeirasMensagens.map((bloco) => bloco)).size, 1);
});

ok('chip visual oferece o roteiro local sem agendar rascunho ou escrita', () => {
  for (const rota of rotas) {
    const html = ler(rota);
    const catalogo = trecho(html, 'const CHIPS = [', 'function montarChips()');
    const montagem = trecho(html, 'function montarChips() {', '/* ---------- sino');
    assert.match(catalogo, /\['🧭 trabalho', 'trabalho:'\]/);
    const atalho = montagem.indexOf("prefixo === 'trabalho:'");
    const agendar = montagem.indexOf('agendarSalvarRascunho();');
    assert(atalho >= 0 && atalho < agendar, rota + ': atalho precisa anteceder rascunho');
    assert.match(montagem, /typeof window\.respostaComandoOperacionalLocal === 'function'/);
    assert.match(montagem, /enviar\(\); return;/);
  }
});

ok('casca PWA v79 inclui os ativos locais e a porta de continuidade o observa', () => {
  const sw = ler('sw.js');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  const continuidade = ler('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v79/);
  assert.match(sw, /'\.\/chat-comandos-locais\.js'/);
  assert.match(sw, /'\.\/chat-filtro-chips\.js'/);
  assert.match(sw, /'\.\/chat-organizacao-local\.js'/);
  assert.match(sw, /'\.\/chat-workspace\.js'/);
  assert.match(workflow, /'chat-comandos-locais\.js'/);
  assert.match(workflow, /chat-comandos-locais\.js chat-filtro-chips\.js chat-organizacao-local\.js chat-colecoes-local\.js chat-workspace\.js tools\/testes\/\*\.js/);
  assert(continuidade.includes('chat-comandos-locais\\.js'));
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'continuidade-comandos-'));
  try {
    const evento = path.join(pasta, 'push.json');
    fs.writeFileSync(evento, JSON.stringify({ commits: [{ added: ['chat-comandos-locais.js'] }] }));
    const r = spawnSync('node', [path.join(raiz, 'tools', 'testes', 'continuidade.js')], {
      cwd: raiz, encoding: 'utf8', env: Object.assign({}, process.env, { GITHUB_EVENT_PATH: evento })
    });
    assert.notEqual(r.status, 0, 'ativo novo sem atualização de continuidade não pode passar');
    assert.match(String(r.stdout || '') + String(r.stderr || ''), /push operacional atualiza CONTINUIDADE\.md/);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});

console.log(certos + '/' + (certos + falhas) + ' testes dos comandos locais da interface passaram');
process.exitCode = falhas ? 1 : 0;
