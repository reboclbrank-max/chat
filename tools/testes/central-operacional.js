// 🧪 Contrato da Central segura: mapa fechado e quatro pontes manuais literais.
'use strict';
const assert = require('assert');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const raiz = path.resolve(__dirname, '..', '..');
const rotas = ['index.html', 'direto.html', 'ligar.html', 'limpar.html'];
let certos = 0;
let falhas = 0;
const casos = [];
function testa(nome, fn) { casos.push({ nome, fn }); }
function ler(nome) { return fs.readFileSync(path.join(raiz, nome), 'utf8'); }
function entre(texto, inicio, fim) {
  const a = texto.indexOf(inicio);
  const b = texto.indexOf(fim, a);
  assert(a >= 0 && b > a, 'trecho ausente: ' + inicio);
  return texto.slice(a, b);
}

function criarPonteCentralControlada(fonte, opcoes) {
  const chamadas = [];
  const bolhas = [];
  const contexto = {
    token: opcoes && Object.prototype.hasOwnProperty.call(opcoes, 'token') ? opcoes.token : 'acesso-controlado',
    Date,
    JSON,
    Promise,
    console,
    modoSomenteLocalAtivo: () => !!(opcoes && opcoes.somenteLocal),
    respostaComandoOperacionalLocal: () => 'mapa local controlado',
    mensagemErroSeguro: () => 'falha controlada',
    bolha: (...args) => bolhas.push(args),
    rolarFim: () => {},
    api: (url, init) => {
      chamadas.push({ url, init });
      return opcoes && opcoes.api ? opcoes.api(url, init) : Promise.resolve({ ok: true });
    }
  };
  const sandbox = vm.createContext(contexto);
  vm.runInContext(fonte + '\n}\nglobalThis.__ponteCentral = maosDaCasa;', sandbox, { timeout: 1000 });
  return { chamadas, bolhas, chamar: sandbox.__ponteCentral };
}
async function liberarMicrotarefas() {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

const blocosCentral = [];
const helpersPrivados = [];
for (const rota of rotas) {
  const html = ler(rota);
  const central = entre(html, 'let operacaoCentralEmCurso = false;', "  if (m.startsWith('!statuscasa'))");
  blocosCentral.push(central);
  testa(rota + ' limita a Central a comandos fechados e às quatro receitas aprovadas', () => {
    assert.match(central, /m === '!operacoes' \|\| m === '!operar' \|\| m === '!central'/);
    assert.match(central, /respostaComandoOperacionalLocal\('operar:'\)/);
    for (const comando of ['testarchat', 'prepararchat', 'dossiechat', 'reforcardossie']) {
      assert.match(central, new RegExp('\\^!' + comando + '\\(\\?:\\\\s\\|\\$\\)\\/\\.test\\(m\\)'));
      assert.match(central, new RegExp("if \\(m !== '!" + comando + "'\\) return '⚠️ uso: !" + comando));
    }
    assert.match(central, /modoSomenteLocalAtivo\(\)/);
    assert.match(central, /if \(!token\) return/);
    assert.match(central, /operacaoCentralEmCurso/);
    assert.match(central, /testeChatEmCurso/);
    assert.match(central, /preparoChatEmCurso/);
    assert.match(central, /dossieChatEmCurso/);
    assert.match(central, /reforcoDossieEmCurso/);
    assert.match(central, /5 \* 60 \* 1000/);
    assert.match(central, /24 \* 60 \* 60 \* 1000/);
    assert.match(central, /api\('\/repos\/reboclbrank-max\/chat\/actions\/workflows\/testes-rapidos\.yml\/dispatches'/);
    assert.match(central, /api\('\/repos\/reboclbrank-max\/chat\/actions\/workflows\/preparo-controlado\.yml\/dispatches'/);
    assert.match(central, /api\('\/repos\/reboclbrank-max\/chat\/actions\/workflows\/dossie-preparo-controlado\.yml\/dispatches'/);
    assert.match(central, /api\('\/repos\/reboclbrank-max\/chat\/actions\/workflows\/reforco-dossie-controlado\.yml\/dispatches'/);
    assert.match(central, /method: 'POST'/);
    assert.equal((central.match(/JSON\.stringify\(\{ ref: 'main' \}\)/g) || []).length, 4);
    assert.match(central, /pedido não confirma êxito/);
    assert.match(central, /não há PR, merge ou promoção/);
    assert.doesNotMatch(central, /eval\s*\(|new Function|child_process|\/bin\/|workflow\s*:\s*msg|ref\s*:\s*msg|\$\{[^}]*msg/i);
    assert.equal((central.match(/api\s*\(/g) || []).length, 4, 'as quatro pontes fazem somente chamadas de API fixas');
  });
  testa(rota + ' inclui as receitas na allowlist local sem capturar vizinhos', () => {
    const fonte = entre(html, 'function ehComandoPrivadoLocal(texto) {', '\nasync function enviar()');
    const ehPrivado = new Function(fonte + '\nreturn ehComandoPrivadoLocal;')();
    for (const entrada of [
      '!operacoes', '!operar', '!central',
      '!testarchat', '!testarchat qualquer', '!testarchat\tqualquer',
      '!prepararchat', '!prepararchat qualquer', '!prepararchat\tqualquer',
      '!dossiechat', '!dossiechat revisão', '!dossiechat\trevisão',
      '!reforcardossie', '!reforcardossie revisão', '!reforcardossie\trevisão'
    ]) assert.equal(ehPrivado(entrada), true, entrada);
    for (const entrada of ['!operacao', '!testarchats', '!prepararchats', '!dossiechats', '!reforcardossies', '!dossie', '!reforco', '!operador', '!centralizar']) assert.equal(ehPrivado(entrada), false, entrada);
    helpersPrivados.push(fonte);
  });
}

testa('as quatro pontes rejeitam argumento e despacham somente destinos literais em simulação controlada', async () => {
  for (const rota of rotas) {
    const html = ler(rota);
    const fonte = entre(html, 'let operacaoCentralEmCurso = false;', "  if (m.startsWith('!statuscasa'))");

    const preparo = criarPonteCentralControlada(fonte);
    assert.equal(await preparo.chamar('!prepararchat'), '🧩 preparando somente a auditoria fixa do Chat…', rota);
    await liberarMicrotarefas();
    assert.equal(preparo.chamadas.length, 1, rota + ': uma única chamada para preparo');
    assert.equal(preparo.chamadas[0].url, '/repos/reboclbrank-max/chat/actions/workflows/preparo-controlado.yml/dispatches');
    assert.equal(preparo.chamadas[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(preparo.chamadas[0].init.body), { ref: 'main' });
    assert.equal(preparo.bolhas.length, 1, rota + ': retorno sanitizado do preparo');
    assert.match(preparo.bolhas[0][1], /Não criou branch, código, segredo ou promoção/);

    const dossie = criarPonteCentralControlada(fonte);
    assert.equal(await dossie.chamar('!dossiechat'), '🧾 pedindo somente o dossiê revisável do Chat…', rota);
    await liberarMicrotarefas();
    assert.equal(dossie.chamadas.length, 1, rota + ': uma única chamada para dossiê');
    assert.equal(dossie.chamadas[0].url, '/repos/reboclbrank-max/chat/actions/workflows/dossie-preparo-controlado.yml/dispatches');
    assert.equal(dossie.chamadas[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(dossie.chamadas[0].init.body), { ref: 'main' });
    assert.equal(dossie.bolhas.length, 1, rota + ': retorno sanitizado do dossiê');
    assert.match(dossie.bolhas[0][1], /cinco guardas/);
    assert.match(dossie.bolhas[0][1], /não há PR, merge ou promoção/);
    assert.match(await dossie.chamar('!dossiechat'), /últimas 24 horas/, rota + ': cadência longa');
    assert.equal(dossie.chamadas.length, 1, rota + ': cadência não duplica escrita remota');

    const reforco = criarPonteCentralControlada(fonte);
    assert.equal(await reforco.chamar('!reforcardossie'), '🛡️ pedindo somente o reforço revisável do dossiê…', rota);
    await liberarMicrotarefas();
    assert.equal(reforco.chamadas.length, 1, rota + ': uma única chamada para reforço');
    assert.equal(reforco.chamadas[0].url, '/repos/reboclbrank-max/chat/actions/workflows/reforco-dossie-controlado.yml/dispatches');
    assert.equal(reforco.chamadas[0].init.method, 'POST');
    assert.deepEqual(JSON.parse(reforco.chamadas[0].init.body), { ref: 'main' });
    assert.equal(reforco.bolhas.length, 1, rota + ': retorno sanitizado do reforço');
    assert.match(reforco.bolhas[0][1], /patch literal/);
    assert.match(reforco.bolhas[0][1], /não há PR, merge ou promoção/);
    assert.match(await reforco.chamar('!reforcardossie'), /últimas 24 horas/, rota + ': cadência longa do reforço');
    assert.equal(reforco.chamadas.length, 1, rota + ': cadência não duplica patch remoto');

    const argumento = criarPonteCentralControlada(fonte);
    for (const entrada of ['!prepararchat\tarbitrario', '!dossiechat\tarbitrario', '!reforcardossie\tarbitrario']) {
      assert.match(await argumento.chamar(entrada), /uso: !(?:prepararchat|dossiechat|reforcardossie)/, rota + ': tab também é argumento');
    }
    assert.equal(argumento.chamadas.length, 0, rota + ': argumento não alcança API');

    const local = criarPonteCentralControlada(fonte, { somenteLocal: true });
    assert.match(await local.chamar('!reforcardossie'), /Modo somente-local ativo/, rota + ': modo local');
    assert.equal(local.chamadas.length, 0, rota + ': modo local não alcança API');
    const semAcesso = criarPonteCentralControlada(fonte, { token: '' });
    assert.match(await semAcesso.chamar('!reforcardossie'), /Configure o acesso protegido/, rota + ': acesso ausente');
    assert.equal(semAcesso.chamadas.length, 0, rota + ': acesso ausente não alcança API');

    const pendentes = [];
    const concorrente = criarPonteCentralControlada(fonte, { api: (url, init) => new Promise((resolve) => pendentes.push({ resolve, url, init })) });
    assert.equal(await concorrente.chamar('!testarchat'), '🧪 pedindo somente a barreira aprovada do Chat…', rota + ': inicia barreira controlada');
    assert.equal(pendentes.length, 1, rota + ': barreira em voo');
    assert.match(await concorrente.chamar('!reforcardossie'), /ação da Central em andamento/, rota + ': exclusão mútua');
    assert.equal(pendentes.length, 1, rota + ': reforço não corre junto');
    pendentes.shift().resolve({ ok: true });
    await liberarMicrotarefas();
  }
});

testa('a ponte da Central tem paridade byte-a-byte nas quatro rotas', () => {
  assert.equal(new Set(blocosCentral.map((fonte) => crypto.createHash('sha256').update(fonte).digest('hex'))).size, 1);
});
testa('a allowlist da Central tem paridade byte-a-byte nas quatro rotas', () => {
  assert.equal(new Set(helpersPrivados.map((fonte) => crypto.createHash('sha256').update(fonte).digest('hex'))).size, 1);
});

testa('e-mail e Telegram usam o mesmo roteiro fechado sem criar transporte novo', () => {
  const email = ler('tools/email-chat.js');
  assert.match(email, /require\('\.\.\/chat-comandos-locais'\)\.respostaComandoOperacionalLocal\(txt\)/);
  assert.match(email, /Central segura: capacidades atuais, testes e limites; não executa texto livre/);
  const ponte = entre(email, 'async function ferramenta(corpo, retornoNavegacao) {', "  if (/^!?ajuda$/i.test(txt)");
  assert.match(ponte, /operar/);
  assert.doesNotMatch(ponte, /fetch\s*\(|workflow_dispatch|api\.github|child_process/);
});

testa('contrato e política deixam a receita, revisão e rollback explícitos', () => {
  const contrato = ler('OPERACAO-CENTRAL.md');
  const autonomia = ler('AUTONOMIA.md');
  const continuidade = ler('CONTINUIDADE.md');
  const workflow = ler('.github/workflows/testes-rapidos.yml');
  assert.match(contrato, /Central segura em etapas/);
  assert.match(contrato, /executor arbitrário/);
  assert.match(contrato, /branch ou artefato reversível/);
  assert.match(contrato, /!dossiechat/);
  assert.match(contrato, /!reforcardossie/);
  assert.match(contrato, /Rollback/);
  assert.match(autonomia, /OPERACAO-CENTRAL\.md/);
  assert.match(autonomia, /!dossiechat/);
  assert.match(autonomia, /!reforcardossie/);
  assert.match(continuidade, /Central segura em etapas/);
  assert.match(continuidade, /!testarchat/);
  assert.match(continuidade, /!dossiechat/);
  assert.match(continuidade, /!reforcardossie/);
  assert.match(workflow, /'OPERACAO-CENTRAL\.md'/);
  assert.match(workflow, /tools\/dossie-preparo-controlado\.js/);
  assert.match(workflow, /tools\/reforco-dossie-controlado\.js/);
});

testa('a casca atualizada entrega o mapa local sob escolha explícita', () => {
  const sw = ler('sw.js');
  assert.match(sw, /rebocl-chat-v87/);
  assert.match(sw, /'\.\/chat-comandos-locais\.js'/);
});

async function executar() {
  for (const caso of casos) {
    try { await caso.fn(); certos++; console.log('✔ ' + caso.nome); }
    catch (erro) { falhas++; console.error('✘ ' + caso.nome + ' — ' + erro.message); }
  }
  console.log(`${certos}/${certos + falhas} testes da Central operacional passaram`);
  process.exitCode = falhas ? 1 : 0;
}
executar().catch((erro) => { console.error(erro); process.exitCode = 1; });
