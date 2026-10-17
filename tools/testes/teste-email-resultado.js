// Regressão da honestidade da rodada real: item sem resposta não pode desaparecer do resultado.
'use strict';
const assert = require('assert');
const { notaSemResposta, notaDoCaso, resumoDasNotas } = require('../teste-email-resultado');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

const avalia = (e, texto) => e.check(texto);
const textoDe = x => x.r && x.r.texto;

ok('resposta ausente entra como falha explícita', () => {
  const x = { e: { id: 'a', check: () => 'PASS (irrelevante)' }, r: null };
  assert.match(notaDoCaso(x, { sumico: new Map([['a', 'o e-mail continua NÃO LIDO']]), avalia, textoDe }), /^FALHOU .*NÃO LIDO/);
});
ok('e-mail automático só passa quando foi lido e não recebeu resposta', () => {
  const x = { e: { id: 'b', semResposta: true }, r: null };
  assert.match(notaSemResposta(x, new Map([['b', 'o e-mail está LIDO sem resposta']])) , /^PASS/);
  assert.match(notaSemResposta({ e: x.e, r: { texto: 'indevida' } }, new Map()), /^FALHOU/);
});
ok('resumo conserva todos os itens no denominador', () => {
  const r = resumoDasNotas(['PASS (um)', 'FALHOU (dois)', 'PASS (três)']);
  assert.deepEqual(r, { total: 3, passou: 2, falhou: 1, tudoPassou: false });
});
ok('resposta presente usa o avaliador do caso', () => {
  const x = { e: { id: 'c', check: t => t === 'certo' ? 'PASS (conteúdo)' : 'FALHOU (conteúdo)' }, r: { texto: 'certo' } };
  assert.match(notaDoCaso(x, { sumico: new Map(), avalia, textoDe }), /^PASS/);
});

console.log(`${certos}/${certos + falhas} testes do resultado de e-mail passaram`);
process.exitCode = falhas ? 1 : 0;
