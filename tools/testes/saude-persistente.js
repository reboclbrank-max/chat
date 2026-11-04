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
    setItem: (k, v) => { dados.set(k, String(v)); },
    removeItem: (k) => { dados.delete(k); }
  };
  return dados;
}
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
} finally {
  Date.now = relogioReal;
  delete global.localStorage;
}
console.log(certos + '/' + (certos + falhas) + ' testes de saúde persistente passaram');
if (falhas) process.exitCode = 1;
