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
    assert.match(blocoCatalogos(html), /window\.atualizarVigiaCatalogos = function/);
    assert.match(blocoEstudo(html), /window\.iniciarEstudoAutomatico = function/);
  });
  testa(rota + ' usa comandos explícitos e modo somente-local para controlar automações', () => {
    const pararVigia = "if (/^!vigia\\s+(?:parar|desligar)\\s*$/.test(m))";
    const atualizarVigia = "if (/^!vigia\\s+(?:atualizar|agora)\\s*$/.test(m))";
    const iniciarVigia = "if (/^!vigia\\s*$/.test(m))";
    const usoVigia = "if (m.startsWith('!vigia')) return 'ℹ️ uso: !vigia para iniciar; !vigia atualizar para varrer; !vigia parar ou !vigia desligar para encerrar nesta aba.';";
    assert(html.includes(pararVigia));
    assert(html.includes(atualizarVigia));
    assert(html.includes(iniciarVigia));
    assert(html.includes(usoVigia));
    assert(html.indexOf(pararVigia) < html.indexOf(atualizarVigia));
    assert(html.indexOf(atualizarVigia) < html.indexOf(iniciarVigia));
    assert(html.indexOf(iniciarVigia) < html.indexOf(usoVigia));
    assert.match(html, /const estavaAtivo = vigiaAtivoNestaPagina; pararVigiaDeRede\(\);/);
    assert.match(html, /window\.atualizarVigiaCatalogos && window\.atualizarVigiaCatalogos\(\)/);
    assert.match(html, /const ativou = iniciarVigiaDeRede\(\);/);
    assert.doesNotMatch(html, /if \(!ativou\) try \{ window\.vigiaMotores\(\);/);
    const pararEstudo = "if (/^!estudar\\s+(?:parar|desligar)\\s*$/.test(m))";
    const iniciarEstudo = "if (m.startsWith('!estudar'))";
    assert(html.includes(pararEstudo));
    assert(html.indexOf(pararEstudo) < html.indexOf(iniciarEstudo));
    assert.match(html, /window\.pararEstudoAutomatico\(\)/);
    assert.match(html, /if \(m\.startsWith\('!estudar'\)\) \{ if \(modoSomenteLocalAtivo\(\)\)/);
    assert.match(html, /window\.iniciarEstudoAutomatico\(te\)/);
    assert.match(html, /'!vigia','!vigia atualizar','!vigia parar','!vigia desligar'/);
    assert.match(html, /'!estudar ','!estudar parar','!estudar desligar'/);
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

testa('parar o vigia cancela os agendamentos rastreáveis sem chamar rede', () => {
  const html = fontes['index.html'];
  const limpos = { intervalo: [], timeout: [], catalogos: 0, fetch: 0 };
  const contexto = {
    setTimeout: () => 1, setInterval: () => 2,
    clearTimeout: (id) => { limpos.timeout.push(id); },
    clearInterval: (id) => { limpos.intervalo.push(id); },
    fetch: () => { limpos.fetch++; return Promise.resolve({ ok: true }); },
    modoSomenteLocalAtivo: () => false,
    window: { addEventListener: () => {}, pararVigiaCatalogos: () => { limpos.catalogos++; } }
  };
  vm.createContext(contexto);
  vm.runInContext(blocoVigia(html) + '\nvigiaTimer = 31; vigiaCanalTimer = 32; vigiaAtivoNestaPagina = true; globalThis.pararTeste = pararVigiaDeRede;', contexto);
  contexto.pararTeste();
  assert.deepEqual(limpos, { intervalo: [31], timeout: [32], catalogos: 1, fetch: 0 });
});

testa('atualização manual do catálogo exige vigia ativo e não duplica varredura em voo', () => {
  const html = fontes['index.html'];
  const estado = { fetch: 0, intervalos: 0 };
  const contexto = {
    Promise, Object, String, Number, Array, JSON, Date, Math,
    AbortSignal: { timeout: () => undefined },
    fetch: () => { estado.fetch++; return new Promise(() => {}); },
    setInterval: () => { estado.intervalos++; return 71; },
    clearInterval: () => {},
    modoSomenteLocalAtivo: () => false,
    window: {}
  };
  contexto.window.window = contexto.window;
  vm.createContext(contexto);
  vm.runInContext(blocoCatalogos(html), contexto);
  assert.equal(contexto.window.atualizarVigiaCatalogos(), false);
  assert.equal(estado.fetch, 0);
  assert.equal(contexto.window.iniciarVigiaCatalogos(), true);
  assert.equal(estado.fetch, 1);
  assert.equal(estado.intervalos, 1);
  assert.equal(contexto.window.atualizarVigiaCatalogos(), false);
  assert.equal(estado.fetch, 1);
});

testa('catálogo e estudo não criam timer antes da escolha; estudo cria e para após escolha', () => {
  const html = fontes['index.html'];
  const timers = { timeout: 0, interval: 0, estudos: 0, limpos: [] };
  const contexto = {
    Promise, Object, String, Number, Array, JSON, Date, Math,
    setTimeout: () => { timers.timeout++; return 1; },
    setInterval: () => { timers.interval++; return 2; },
    clearInterval: (id) => { timers.limpos.push(id); },
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
  contexto.window.pararEstudoAutomatico();
  assert.deepEqual(timers.limpos, [2]);
});

console.log(`${certos}/${certos + falhas} testes de inicialização com rede explícita passaram`);
process.exitCode = falhas ? 1 : 0;
