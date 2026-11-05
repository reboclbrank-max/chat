// Contratos do painel: a revisão inteira tem de ser legível mesmo quando falta dado.
// Um painel que quebra quando algo some é pior que nenhum: ele some junto com o problema.
'use strict';
const assert = require('assert');
const { montarPainel } = require('../painel.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

const cheio = {
  main: 'abcdef1234567890',
  barreira: { execucoes: [
    { conclusion: 'success' }, { conclusion: 'success' }, { conclusion: 'failure' }
  ] },
  turno: { status: 'em andamento', desde: '2026-11-05T12:24:18Z' },
  vigia: { verificado_em: '2026-11-05T14:31:39Z', itens: {
    'Página do chat': { ok: true, evidencia: 'pagina-respondendo' },
    'Casa postando (site)': { ok: false, causa: 'postador-desligado' },
    'Autonomia (nível)': { ok: true, evidencia: 'autonomia-texto' }
  } },
  autonomia: { nivel: 'texto' },
  portoes: { abertos: 1, total: 4, portoes: [
    { numero: 1, nome: 'barreira confiável', aberto: true, porque: 'termômetro aprovado' },
    { numero: 2, nome: 'julgamento com evidência', aberto: false, porque: 'poucos registros: 2 de 30' }
  ] },
  sombra: { total: 2, mesclariaDegrau4: 2, bloqueadasPorEssencial: 0 },
  higiene: { pullsAbertas: 0, ramos: 87 }
};

ok('o painel mostra casa, vigia, autonomia, portões, sombra e higiene', () => {
  const t = montarPainel(cheio);
  assert.match(t, /main: abcdef123456/);
  assert.match(t, /barreira \(últimos ciclos\): 2 verdes · 1 vermelhas/);
  assert.match(t, /turno de e-mail: em andamento/);
  assert.match(t, /vigia: 2\/3 itens ok/);
  assert.match(t, /autonomia: nível texto/);
  assert.match(t, /portões: 1\/4 abertos/);
  assert.match(t, /sombra: 2 registro/);
  assert.match(t, /0 PR\(s\) aberta\(s\) · 87 ramo/);
});

ok('pendências juntam o que está fora do lugar — e citam o motivo', () => {
  const t = montarPainel(cheio);
  assert.match(t, /⚠️ pendências/);
  assert.match(t, /Casa postando \(site\) \(postador-desligado\)/);
  assert.match(t, /portão 2: poucos registros/);
});

ok('painel vazio não explode e diz o que falta', () => {
  const t = montarPainel({});
  assert.match(t, /main: \(desconhecida\)/);
  assert.match(t, /sem dado/);
  assert.match(t, /sombra sem registro ainda/);
});

ok('o painel nunca inventa número quando falta a fonte', () => {
  const t = montarPainel({ main: 'x', higiene: {} });
  assert.match(t, /— PR\(s\) aberta\(s\) · — ramo/);
  assert.match(t, /barreira \(últimos ciclos\): sem dado/);
});

ok('tudo certo mostra "nada pendente" em vez de lista vazia', () => {
  const t = montarPainel({
    main: 'a', barreira: { execucoes: [{ conclusion: 'success' }] },
    vigia: { itens: { 'Página do chat': { ok: true } } },
    autonomia: { nivel: 'texto' }, portoes: { abertos: 4, total: 4, portoes: [] },
    sombra: { total: 30, mesclariaDegrau4: 10, bloqueadasPorEssencial: 20 }
  });
  assert.match(t, /nada pendente/);
  assert.doesNotMatch(t, /⚠️ pendências/);
});

(async () => {
  let certos = 0, falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} contratos do painel passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
