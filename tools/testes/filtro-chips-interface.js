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
  const ouvintesCaixa = {};
  const caixa = {
    scrollLeft: 0,
    querySelectorAll(seletor) {
      assert.equal(seletor, 'button.chip');
      return chips;
    },
    getBoundingClientRect() { return { left: 10, right: 380 }; },
    addEventListener(tipo, fn) { (ouvintesCaixa[tipo] || (ouvintesCaixa[tipo] = [])).push(fn); }
  };
  const elementos = { 'filtro-chips': entrada, chips: caixa, 'resultado-filtro-chips': resultado };
  const contexto = { window: {}, document: { getElementById: (id) => elementos[id] || null }, String, Array, Object };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  return { iniciar: contexto.window.iniciarFiltroChips, entrada, resultado, ouvintes, ouvintesCaixa, caixa, chips };
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
    { textContent: '🧭 trabalho', hidden: false, dataset: { busca: '🧭 trabalho trabalho: prioridades:' } },
    { textContent: '⛏ caça', hidden: false, dataset: { busca: '⛏ caça !caça' } },
    { textContent: '💱 dólar', hidden: false, dataset: { busca: '💱 dólar cambio: USD' } }
  ]);
  assert.equal(typeof e.iniciar, 'function');
  assert.equal(e.iniciar(), true);
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [false, false, false]);
  assert.equal(e.resultado.textContent, '');

  e.entrada.value = 'caca';
  disparar(e.ouvintes, 'input');
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [true, false, true]);
  assert.equal(e.resultado.textContent, '1 atalho');

  e.entrada.value = 'cambio';
  disparar(e.ouvintes, 'input');
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [true, true, false]);
  assert.equal(e.resultado.textContent, '1 atalho');

  e.entrada.value = 'prioridades';
  disparar(e.ouvintes, 'input');
  assert.deepEqual(e.chips.map((chip) => chip.hidden), [false, true, true]);
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

ok('foco por teclado mantém o chip visível sem acionar comando', () => {
  const direita = {
    textContent: '💱 dólar', hidden: false, dataset: { busca: '💱 dólar cambio: USD' },
    matches(seletor) { return seletor === 'button.chip'; },
    getBoundingClientRect() { return { left: 354.9, right: 429.5 }; }
  };
  const esquerda = {
    textContent: '🗄 dados', hidden: false, dataset: { busca: '🗄 dados dados:' },
    matches(seletor) { return seletor === 'button.chip'; },
    getBoundingClientRect() { return { left: 2.2, right: 75 }; }
  };
  const e = ambiente([direita, esquerda]);
  e.iniciar();
  disparar(e.ouvintesCaixa, 'focusin', { target: direita });
  assert.equal(e.caixa.scrollLeft, 50, 'leva a borda direita inteira à visão');
  disparar(e.ouvintesCaixa, 'focusin', { target: esquerda });
  assert.equal(e.caixa.scrollLeft, 42, 'também corrige retorno por Shift+Tab');
});

ok('filtro usa rótulo como fallback se uma casca antiga não tiver metadado de busca', () => {
  const e = ambiente([{ textContent: '🌤 clima', hidden: false }]);
  e.iniciar();
  e.entrada.value = 'clima';
  disparar(e.ouvintes, 'input');
  assert.equal(e.chips[0].hidden, false);
  assert.equal(e.resultado.textContent, '1 atalho');
});

ok('falha fechada se a casca não trouxer os elementos esperados', () => {
  const contexto = { window: {}, document: { getElementById: () => null }, String, Array, Object };
  vm.createContext(contexto);
  vm.runInContext(fonte, contexto);
  assert.equal(contexto.window.iniciarFiltroChips(), false);
});

ok('as quatro rotas declaram busca por nome ou comando e só a iniciam após montar os chips', () => {
  for (const rota of rotas) {
    const html = ler(rota);
    assert.equal((html.match(/id="filtro-chips"/g) || []).length, 1, rota + ': campo único');
    assert.match(html, /<label class="visualmente-oculto" for="filtro-chips">Procurar por nome ou comando<\/label>/);
    assert.match(html, /type="search" autocomplete="off" placeholder="🔎 nome ou comando…"/);
    assert.match(html, /title="Pesquise pelo nome do atalho ou pelo comando que ele preenche"/);
    assert.match(html, /aria-controls="chips" aria-describedby="resultado-filtro-chips"/);
    assert.match(html, /id="resultado-filtro-chips"[^>]*role="status"[^>]*aria-live="polite"/);
    const construcao = html.slice(html.indexOf('function montarChips() {'), html.indexOf('/* ---------- sino'));
    assert.match(construcao, /const sintaxes = prefixo === 'trabalho:' \? \['trabalho:', 'prioridades:'\] : \[prefixo\];/);
    assert.match(construcao, /const descricaoComando = sintaxes\.length === 1/);
    assert.match(construcao, /b\.dataset\.busca = rotulo \+ ' ' \+ sintaxes\.join\(' '\);/);
    assert.match(construcao, /b\.title = descricaoComando;/);
    assert.match(construcao, /b\.setAttribute\('aria-label', rotulo \+ '\. ' \+ descricaoComando\);/);
    const montar = html.indexOf('montarChips();');
    const iniciar = html.indexOf('window.iniciarFiltroChips();');
    assert(montar >= 0 && iniciar > montar, rota + ': filtro só inicia depois dos botões');
    const pwa = html.indexOf('<script src="chat-pwa.js"></script>');
    const local = html.indexOf('<script src="chat-comandos-locais.js"></script>');
    const filtro = html.indexOf('<script src="chat-filtro-chips.js"></script>');
    const organizacao = html.indexOf('<script src="chat-organizacao-local.js"></script>');
    const colecoes = html.indexOf('<script src="chat-colecoes-local.js"></script>');
    const workspace = html.indexOf('<script src="chat-workspace.js"></script>');
    const inline = html.indexOf('<script>', workspace);
    assert(pwa >= 0 && local > pwa && filtro > local && organizacao > filtro && colecoes > organizacao && workspace > colecoes && inline > workspace, rota + ': ativos locais precisam carregar antes do código da rota');
    assert.equal((html.match(/chat-filtro-chips\.js/g) || []).length, 1, rota + ': ativo único');
    assert.equal((html.match(/chat-workspace\.js/g) || []).length, 1, rota + ': Workspace único');
  }
});

ok('PWA, workflow e continuidade observam o filtro local', () => {
  const sw = ler('sw.js');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  const continuidade = ler('tools/testes/continuidade.js');
  assert.match(sw, /rebocl-chat-v77/);
  assert.match(sw, /'\.\/chat-filtro-chips\.js'/);
  assert.match(sw, /'\.\/chat-organizacao-local\.js'/);
  assert.match(workflow, /'chat-filtro-chips\.js'/);
  assert.match(workflow, /chat-filtro-chips\.js chat-organizacao-local\.js chat-colecoes-local\.js chat-workspace\.js tools\/testes\/\*\.js/);
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
