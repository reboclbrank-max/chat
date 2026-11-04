// Contrato offline (04/11/2026): a memória de rota quebrada sobrevive ao fim do processo.
// Sem rede, sem token, sem conversa: localStorage é um objeto falso criado pelo teste.
'use strict';
const assert = require('assert');
const { Roteador } = require('../../roteador-ia.js');

const CHAVE = 'roteador-saude-v1';
function disco(conteudo) {
  const dados = new Map();
  if (conteudo !== undefined) dados.set(CHAVE, conteudo);
  global.localStorage = {
    getItem: (k) => (dados.has(k) ? dados.get(k) : null),
    setItem: (k, v) => { dados.set(k, String(v)); if (k === CHAVE) ultimoDisco = String(v); },
    removeItem: (k) => { dados.delete(k); }
  };
  return dados;
}
let ultimoDisco = null;
const catalogo = [
  { id: 'boa', nome: 'boa', base: 'https://boa.invalid/v1', modelo: 'x', classe: 'forte', peso: 90 },
  { id: 'ruim', nome: 'ruim', base: 'https://ruim.invalid/v1', modelo: 'y', classe: 'forte', peso: 80 }
];
let certos = 0, falhas = 0;
function testa(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
}

const relogioReal = Date.now;
let t = 1_700_000_000_000;
Date.now = () => t;
try {
  testa('rota sã não ocupa espaço no aparelho', () => {
    const d = disco();
    const r = new Roteador({ catalogo });
    r._gravarSaudeDisco();
    const salvo = JSON.parse(d.get(CHAVE));
    assert.deepStrictEqual(Object.keys(salvo), [], 'nada deveria ser gravado sem problema');
  });

  testa('falha de uma sessão é vista pela sessão seguinte', () => {
    const d = disco();
    const primeiro = new Roteador({ catalogo });
    primeiro._castigar('ruim', 'timeout');
    assert(d.get(CHAVE), 'deveria ter gravado a saúde');
    const segundo = new Roteador({ catalogo });
    assert.strictEqual(segundo.saude.ruim.falhasSeguidas, 1, 'contagem de falhas deveria persistir');
    assert.strictEqual(segundo.saude.ruim.timeoutsSeguidos, 1, 'timeouts deveriam persistir');
    assert(segundo.saude.ruim.cooldownAte > t, 'cooldown futuro deveria persistir');
    assert.strictEqual(segundo.saude.boa.falhasSeguidas, 0, 'rota boa não pode ser contaminada');
  });

  testa('rota morta continua marcada na sessão seguinte', () => {
    disco();
    new Roteador({ catalogo })._castigar('ruim', 'morto');
    const depois = new Roteador({ catalogo });
    assert.strictEqual(depois.saude.ruim.morta, true, 'marca de morta deveria persistir');
  });

  testa('sucesso limpa o registro em vez de acumular lixo', () => {
    const d = disco();
    const r = new Roteador({ catalogo });
    const antes = t;
    r._castigar('ruim', 'rede');
    assert(JSON.parse(d.get(CHAVE)).ruim, 'falha deveria estar no disco');
    t += 9000; // passa o cooldown curto da falha de rede
    r._premiar('ruim', 900);
    assert.strictEqual(JSON.parse(d.get(CHAVE)).ruim, undefined, 'rota recuperada sai do registro');
    const depois = new Roteador({ catalogo });
    assert.strictEqual(depois.saude.ruim.falhasSeguidas, 0);
    assert.strictEqual(depois.saude.ruim.cooldownAte, 0, 'cooldown cumprido não volta do disco');
    t = antes;
  });

  testa('cooldown em curso continua valendo mesmo com sucesso em voo', () => {
    const d = disco();
    const r = new Roteador({ catalogo });
    r._castigar('ruim', 'rate');
    r._premiar('ruim', 500);
    const salvo = JSON.parse(d.get(CHAVE)).ruim;
    assert(salvo && salvo.cd > t, 'um 429 recente não pode ser apagado por resposta em voo');
  });

  testa('falhas antigas decaem: 90 min devolvem três créditos e a rota volta limpa', () => {
    disco();
    const r = new Roteador({ catalogo });
    for (let i = 0; i < 3; i++) r._castigar('ruim', 'rede');
    assert.strictEqual(r.saude.ruim.falhasSeguidas, 3);
    t += 90 * 60 * 1000;
    const depois = new Roteador({ catalogo });
    assert.strictEqual(depois.saude.ruim.falhasSeguidas, 0, 'três janelas de 30 min zeram três falhas');
  });

  testa('trinta minutos devolvem só um crédito', () => {
    t -= 90 * 60 * 1000;
    disco();
    const r = new Roteador({ catalogo });
    for (let i = 0; i < 4; i++) r._castigar('ruim', 'rede');
    t += 30 * 60 * 1000;
    const depois = new Roteador({ catalogo });
    assert.strictEqual(depois.saude.ruim.falhasSeguidas, 3, '4 falhas menos 1 crédito = 3');
  });

  testa('registro vencido é ignorado', () => {
    const vencido = { ruim: { t: t - (7 * 60 * 60 * 1000), f: 9, to: 9, cd: 0, lat: 40000, n: 5, morta: true } };
    disco(JSON.stringify(vencido));
    const r = new Roteador({ catalogo });
    assert.strictEqual(r.saude.ruim.falhasSeguidas, 0, 'falha de 7 h atrás não pode condenar a rota');
    assert.strictEqual(r.saude.ruim.morta, false, 'morte antiga não pode persistir para sempre');
    assert.strictEqual(r.saude.ruim.timeoutsSeguidos, 0);
  });

  testa('JSON corrompido não derruba o roteador', () => {
    disco('{isso não é json');
    const r = new Roteador({ catalogo });
    assert.strictEqual(r.saude.ruim.falhasSeguidas, 0);
    r._castigar('ruim', 'servidor');
    assert(r.saude.ruim.falhasSeguidas >= 1, 'depois do erro de leitura o roteador segue funcionando');
  });

  testa('rota fora do catálogo no disco é ignorada', () => {
    disco(JSON.stringify({ fantasma: { t, f: 5, to: 5, cd: 0, lat: 1, n: 1 } }));
    const r = new Roteador({ catalogo });
    assert.deepStrictEqual(Object.keys(r.saude).sort(), ['boa', 'ruim'].sort(), 'nenhuma rota inventada entra');
  });

  testa('privacidade: o disco guarda só números por rota', () => {
    const d = disco();
    const r = new Roteador({ catalogo });
    r._castigar('ruim', 'servidor');
    const salvo = d.get(CHAVE);
    assert(!/ultimoErro|servidor|http|pergunta|resposta/i.test(salvo), 'nada de texto, URL ou conteúdo no disco');
    const registro = JSON.parse(salvo).ruim;
    for (const chave of Object.keys(registro)) {
      const v = registro[chave];
      assert(['number', 'boolean'].includes(typeof v), 'campo ' + chave + ' não é número nem booleano');
    }
  });

  /* --- Correção do achado do Chat B (04/11): a morte não pode ser eterna no uso real --- */

  testa('evento em rota sã NÃO renova o relógio da rota morta', () => {
    const d = disco();
    const r = new Roteador({ catalogo });
    const t0 = t;
    r._castigar('ruim', 'morto');
    t = t0 + 30 * 60 * 1000;
    r._premiar('boa', 800);                     // evento em OUTRA rota
    const salvo = JSON.parse(d.get(CHAVE));
    assert.strictEqual(salvo.ruim.t, t0, 'o carimbo da rota morta foi renovado por evento de outra rota');
    assert.strictEqual(salvo.ruim.morta, true, 'a marca de morta deveria estar no disco');
    assert.strictEqual(salvo.ruim.mr, t0, 'a hora da morte deveria ser a do castigo');
    t = t0;
  });

  testa('relendo a memória o carimbo antigo é preservado (senão a morte volta a ser eterna)', () => {
    const d = disco();
    const t0 = t;
    new Roteador({ catalogo })._castigar('ruim', 'morto');
    t = t0 + 5 * 60 * 60 * 1000;
    const segunda = new Roteador({ catalogo });  // releitura 5 h depois
    assert.strictEqual(segunda.saude.ruim.morta, true, 'morte de 5 h ainda vale (validade 6 h)');
    segunda._premiar('boa', 700);                // evento de outra rota na sessão seguinte
    assert.strictEqual(JSON.parse(d.get(CHAVE)).ruim.t, t0, 'a releitura não pode rejuvenescer o carimbo');
    t = t0;
  });

  testa('morte vence sozinha em 6 h, mesmo com o chat em uso regular (repro do Chat B)', () => {
    disco();
    const t0 = t;
    new Roteador({ catalogo })._castigar('ruim', 'morto');
    const visto = [];
    for (let ciclo = 1; ciclo <= 6; ciclo++) {   // h5, h10, ... h30 com evento em rota sã a cada 5 h
      t = t0 + ciclo * 5 * 60 * 60 * 1000;
      const r = new Roteador({ catalogo });
      visto.push(r.saude.ruim.morta);
      r._premiar('boa', 600);
    }
    assert.strictEqual(visto[0], true, 'em h5 a morte ainda deveria valer');
    assert.strictEqual(visto[1], false, 'em h10 a rota morta tem de voltar (morte eterna é o defeito)');
    assert.strictEqual(visto[5], false, 'depois de 30 h de uso a rota continua fora do limbo');
    t = t0;
  });

  testa('rota que respondeu deixa de ser morta na mesma sessão', () => {
    const d = disco();
    const r = new Roteador({ catalogo });
    r._castigar('ruim', 'morto');
    assert.strictEqual(r.saude.ruim.morta, true);
    r._premiar('ruim', 400);
    assert.strictEqual(r.saude.ruim.morta, false, 'sucesso não pode conviver com a marca de morta');
    const salvo = JSON.parse(d.get(CHAVE));
    assert(!salvo.ruim || salvo.ruim.morta !== true, 'o disco não pode manter a marca depois do sucesso');
  });

  testa('morte vencida sai do disco sem levar as outras rotas junto', () => {
    const t0 = t;
    disco();
    const r = new Roteador({ catalogo });
    r._castigar('ruim', 'morto');
    t = t0 + 10 * 60 * 60 * 1000;
    const depois = new Roteador({ catalogo });
    depois._castigar('boa', 'timeout');          // rota sã com problema recente
    const salvo = JSON.parse(ultimoDisco);
    assert.strictEqual(salvo.ruim, undefined, 'a morta vencida não pode voltar do disco');
    assert(salvo.boa && salvo.boa.to === 1, 'a rota com problema recente continua registrada');
    t = t0;
  });
} finally {
  Date.now = relogioReal;
  delete global.localStorage;
}
console.log(certos + '/' + (certos + falhas) + ' testes de saúde persistente passaram');
if (falhas) process.exitCode = 1;
