// Testes offline da ferramenta local de divisas brasileiras.
'use strict';
const assert = require('assert');
const geo = require('../geografia-brasil');
let n = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('mapa de divisas é simétrico e completo', () => {
  assert.equal(geo.validaMapa().length, 0, geo.validaMapa().join(' | '));
  assert.equal(Object.keys(geo.DIVISAS).length, 27);
});
ok('Bahia é o estado com oito divisas estaduais', () => {
  const r = geo.maiorNumeroDeDivisas();
  assert.equal(r.estado, 'BA'); assert.equal(r.maximo, 8);
  assert.equal(geo.nomesDivisas('BA', false).length, 8);
});
ok('comando local responde divisas sem usar rede ou motor', () => {
  assert.match(geo.responde('divisas: Bahia'), /8 unidade\(s\).*Alagoas.*Tocantins/i);
  assert.match(geo.responde('Qual estado brasileiro faz fronteira com o MAIOR número de outros estados?'), /Bahia.*8/i);
  assert.match(geo.responde('fronteiras do Acre'), /Amazonas.*Rondônia/i);
});
ok('texto sem pedido de geografia não é interceptado', () => {
  assert.equal(geo.responde('escreva um poema sobre a Bahia'), null);
  assert.equal(geo.estadoPorNome('Minas Gerais'), 'MG');
  assert.equal(geo.estadoPorNome('estado inventado'), null);
});

console.log(`${n}/${n + falhas} testes de geografia passaram`);
process.exitCode = falhas ? 1 : 0;
