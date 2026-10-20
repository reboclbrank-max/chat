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
    assert.match(envio, /return;\s*}\s*(?:if \(!conversa\) return;\s*)?salvarRascunhoAtual/);
  });
}
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

ok('casca PWA v16 inclui os ativos locais e a porta de continuidade o observa', () => {
  const sw = ler('sw.js');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  const continuidade = ler('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v16/);
  assert.match(sw, /'\.\/chat-comandos-locais\.js'/);
  assert.match(sw, /'\.\/chat-filtro-chips\.js'/);
  assert.match(workflow, /'chat-comandos-locais\.js'/);
  assert.match(workflow, /chat-comandos-locais\.js chat-filtro-chips\.js tools\/testes\/\*\.js/);
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
