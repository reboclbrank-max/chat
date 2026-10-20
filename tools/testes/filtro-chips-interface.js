// Contrato do filtro local: facilita descoberta sem transformar digitação em envio.
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
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }

const fonte = ler('chat-filtro-chips.js');
function ambiente(chips) {
  const ouvintes = {};
  const entrada = {
    value: '',
    addEventListener(tipo, fn) { (ouvintes[tipo] || (ouvintes[tipo] = [])).push(fn); }
  };
  const resultado = { textContent: '' };
  const caixa = {
    querySelectorAll(seletor) {
      assert.equal(seletor, 'button.chip');
      return chips;
    }
  };
  const elementos = { 'filtro-chips': entrada, chips: caixa, 'resultado-filtro-chips': resultado };
  const contexto = { window: {}, document: { getElementById: (id) => elementos[id] || null }, String, Array, Object };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  return { iniciar: contexto.window.iniciarFiltroChips, entrada, resultado, ouvintes, chips };
}
function disparar(ouvintes, tipo, evento = {}) {
  for (const fn of ouvintes[tipo] || []) fn(evento);
}

ok('filtro executável não tem rede, escrita, rascunho ou armazenamento', () => {
  const executavel = fonte.replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(executavel, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|localStorage|sessionStorage|enviar|agendarSalvarRascunho|api)\b/i);
});

ok('filtra por texto sem acento, informa resultado e restaura todos os chips', () => {
  const e = ambiente([
    { textContent: '🧭 trabalho', hidden: false },
    { textContent: '⛏ caça', hidden: false },
    { textContent: '🌤 clima', hidden: false }
  ]);
  assert.equal(typeof e.iniciar, 'function');
  assert.equal(e.iniciar(), true);
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [false, false, false]);
  assert.equal(e.resultado.textContent, '');

  e.entrada.value = 'caca';
  disparar(e.ouvintes, 'input');
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [true, false, true]);
  assert.equal(e.resultado.textContent, '1 atalho');

  e.entrada.value = 'não existe';
  disparar(e.ouvintes, 'input');
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [true, true, true]);
  assert.equal(e.resultado.textContent, 'Nenhum atalho');

  let prevenido = false;
  let propagacaoParada = false;
  disparar(e.ouvintes, 'keydown', { key: 'Escape', preventDefault() { prevenido = true; }, stopPropagation() { propagacaoParada = true; } });
  assert.equal(prevenido, true);
  assert.equal(propagacaoParada, true);
  assert.equal(e.entrada.value, '');
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [false, false, false]);
  assert.equal(e.resultado.textContent, '');
});

ok('teclas do filtro não disparam os atalhos globais de envio, nova conversa ou foco', () => {
  const e = ambiente([{ textContent: '🧭 trabalho', hidden: false }]);
  e.iniciar();
  for (const eventoBase of [
    { key: 'Enter', ctrlKey: true },
    { key: 'n', metaKey: true },
    { key: '/' }
  ]) {
    let prevenido = false;
    let propagacaoParada = false;
    disparar(e.ouvintes, 'keydown', Object.assign({}, eventoBase, {
      preventDefault() { prevenido = true; },
      stopPropagation() { propagacaoParada = true; }
    }));
    assert.equal(propagacaoParada, true, 'evento precisa parar: ' + eventoBase.key);
    assert.equal(prevenido, eventoBase.key !== '/', 'prevenção esperada: ' + eventoBase.key);
  }
});

ok('falha fechada se a casca não trouxer os elementos esperados', () => {
  const contexto = { window: {}, document: { getElementById: () => null }, String, Array, Object };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  assert.equal(contexto.window.iniciarFiltroChips(), false);
});

ok('as quatro rotas expõem busca acessível e só a iniciam após montar os chips', () => {
  for (const rota of rotas) {
    const html = ler(rota);
    assert.equal((html.match(/id="filtro-chips"/g) || []).length, 1, rota + ': campo único');
    assert.match(html, /<label class="visualmente-oculto" for="filtro-chips">Procurar comando rápido<\/label>/);
    assert.match(html, /type="search" autocomplete="off"/);
    assert.match(html, /aria-controls="chips" aria-describedby="resultado-filtro-chips"/);
    assert.match(html, /id="resultado-filtro-chips"[^>]*role="status"[^>]*aria-live="polite"/);
    const montar = html.indexOf('montarChips();');
    const iniciar = html.indexOf('window.iniciarFiltroChips();');
    assert(montar >= 0 && iniciar > montar, rota + ': filtro só inicia depois dos botões');
    const pwa = html.indexOf('<script src="chat-pwa.js"></script>');
    const local = html.indexOf('<script src="chat-comandos-locais.js"></script>');
    const filtro = html.indexOf('<script src="chat-filtro-chips.js"></script>');
    const inline = html.indexOf('<script>', filtro);
    assert(pwa >= 0 && local > pwa && filtro > local && inline > filtro, rota + ': ativos locais precisam carregar antes do código da rota');
    assert.equal((html.match(/chat-filtro-chips\.js/g) || []).length, 1, rota + ': ativo único');
  }
});

ok('PWA, workflow e continuidade observam o filtro local', () => {
  const sw = ler('sw.js');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  const continuidade = ler('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v16/);
  assert.match(sw, /'\.\/chat-filtro-chips\.js'/);
  assert.match(workflow, /'chat-filtro-chips\.js'/);
  assert.match(workflow, /chat-filtro-chips\.js tools\/testes\/\*\.js/);
  assert(continuidade.includes('chat-filtro-chips\\.js'));
  const pasta = fs.mkdtempSync(path.join(os.tmpdir(), 'continuidade-filtro-chips-'));
  try {
    const evento = path.join(pasta, 'push.json');
    fs.writeFileSync(evento, JSON.stringify({ commits: [{ added: ['chat-filtro-chips.js'] }] }));
    const r = spawnSync('node', [path.join(raiz, 'tools', 'testes', 'continuidade.js')], {
      cwd: raiz, encoding: 'utf8', env: Object.assign({}, process.env, { GITHUB_EVENT_PATH: evento })
    });
    assert.notEqual(r.status, 0, 'ativo operacional sem continuidade não pode passar');
    assert.match(String(r.stdout || '') + String(r.stderr || ''), /push operacional atualiza CONTINUIDADE\.md/);
  } finally { fs.rmSync(pasta, { recursive: true, force: true }); }
});

console.log(`${certos}/${certos + falhas} testes do filtro local de chips passaram`);
process.exitCode = falhas ? 1 : 0;
