// Contrato offline: abrir o Chat não agenda vigia, catálogos ou estudo remoto.
// As automações continuam disponíveis, mas só começam por comando explícito na aba.
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
function blocoVigia(html) { return trecho(html, 'let vigiaTimer = null;', '\n\n/* ---------- SISTEMA NERVOSO'); }
function blocoCatalogos(html) { return trecho(html, '(function () {\n  const FONTES = [', '\n})();;\n\n(function () { const CHAVE =') + '\n})();'; }
function blocoEstudo(html) { return trecho(html, "(function () { const CHAVE = 'rebocl_caderno';", '\n\n;\n\n(function () { window.profundaSys'); }
function blocoModo(html) { return trecho(html, 'function textoFaixaModoLocal()', '\nfunction mostrarProgressoLocal(t)'); }
const fontes = Object.fromEntries(rotas.map((rota) => [rota, fonte(rota)]));

for (const rota of rotas) {
  const html = fontes[rota];
  testa(rota + ' não agenda rede de vigia, catálogo ou estudo na abertura', () => {
    const vigia = blocoVigia(html);
    const inicio = trecho(vigia, 'function iniciarVigia() {', '\nfunction iniciarVigiaDeRede()');
    assert.doesNotMatch(inicio, /cicloVigiaSeguro\(|beberCanal\(|setTimeout\(|setInterval\(/);
    assert.match(vigia, /function iniciarVigiaDeRede\(\)/);
    assert.match(vigia, /cicloVigiaSeguro\(\);/);
    assert.match(vigia, /vigiaCanalTimer = setTimeout/);
    assert.match(vigia, /vigiaTimer = setInterval/);
    assert.doesNotMatch(html, /setTimeout\(rodar, 15000\)/);
    assert.doesNotMatch(html, /setTimeout\(\(\) => \{ try \{ if \(!window\.estudoRodando\)/);
    assert.match(blocoCatalogos(html), /window\.iniciarVigiaCatalogos = function/);
    assert.match(blocoEstudo(html), /window\.iniciarEstudoAutomatico = function/);
  });
  testa(rota + ' usa comandos explícitos e modo somente-local para controlar automações', () => {
    assert.match(html, /if \(m\.startsWith\('!vigia'\)\) \{ if \(modoSomenteLocalAtivo\(\)\)/);
    assert.match(html, /const ativou = iniciarVigiaDeRede\(\);/);
    assert.match(html, /if \(m\.startsWith\('!estudar'\)\) \{ if \(modoSomenteLocalAtivo\(\)\)/);
    assert.match(html, /window\.iniciarEstudoAutomatico\(te\)/);
    const modo = blocoModo(html);
    assert.match(modo, /pararVigiaDeRede\(\)/);
    assert.match(modo, /window\.pararEstudoAutomatico\(\)/);
  });
}

testa('os blocos críticos mantêm paridade entre as quatro rotas', () => {
  for (const extrair of [blocoVigia, blocoCatalogos, blocoEstudo, blocoModo]) {
    assert.equal(new Set(Object.values(fontes).map(extrair)).size, 1);
  }
});

testa('a inicialização isolada registra só o listener local do PWA', () => {
  const html = fontes['index.html'];
  const timers = { timeout: 0, interval: 0, fetch: 0, listener: 0 };
  const contexto = {
    setTimeout: () => { timers.timeout++; return 1; },
    setInterval: () => { timers.interval++; return 2; },
    clearTimeout: () => {}, clearInterval: () => {},
    fetch: () => { timers.fetch++; return Promise.resolve({ ok: true }); },
    modoSomenteLocalAtivo: () => false,
    window: { addEventListener: () => { timers.listener++; } }
  };
  vm.createContext(contexto);
  vm.runInContext(blocoVigia(html) + '\nglobalThis.iniciarTeste = iniciarVigia;', contexto);
  contexto.iniciarTeste();
  assert.deepEqual(timers, { timeout: 0, interval: 0, fetch: 0, listener: 1 });
});

testa('catálogo e estudo não criam timer antes da escolha; estudo cria após escolha', () => {
  const html = fontes['index.html'];
  const timers = { timeout: 0, interval: 0, estudos: 0 };
  const contexto = {
    Promise, Object, String, Number, Array, JSON, Date, Math,
    setTimeout: () => { timers.timeout++; return 1; },
    setInterval: () => { timers.interval++; return 2; },
    clearInterval: () => {},
    modoSomenteLocalAtivo: () => false,
    localStorage: { getItem: () => null, setItem: () => {} },
    window: {}
  };
  contexto.window.window = contexto.window;
  vm.createContext(contexto);
  vm.runInContext(blocoCatalogos(html) + blocoEstudo(html), contexto);
  assert.equal(timers.timeout, 0);
  assert.equal(timers.interval, 0);
  contexto.window.estudoDaCasa = async () => { timers.estudos++; return 1; };
  assert.equal(contexto.window.iniciarEstudoAutomatico('tema escolhido'), true);
  assert.equal(timers.estudos, 1);
  assert.equal(timers.interval, 1);
});

console.log(`${certos}/${certos + falhas} testes de inicialização com rede explícita passaram`);
process.exitCode = falhas ? 1 : 0;
