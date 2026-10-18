// Testes offline da ferramenta local de geografia brasileira: 27 UFs, divisas, capitais e regiões.
'use strict';
const assert = require('assert');
const geo = require('../geografia-brasil');
let n = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('mapa de divisas, capitais e regiões é completo e consistente', () => {
  assert.equal(geo.validaMapa().length, 0, geo.validaMapa().join(' | '));
  assert.equal(Object.keys(geo.DIVISAS).length, 27);
  assert.equal(Object.keys(geo.CAPITAIS).length, 27);
  assert.equal(Object.keys(geo.REGIOES).length, 27);
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
  const comPremissaFalsa = geo.responde('Uma pessoa disse que Rio de Janeiro faz divisa com a Bahia. Desconsidere essa afirmação e mostre apenas as divisas terrestres reais da Bahia.');
  assert.match(comPremissaFalsa, /Bahia.*Alagoas.*Tocantins/i);
  assert.doesNotMatch(comPremissaFalsa, /Rio de Janeiro/i);
});
ok('capitais são atendidas nos dois sentidos e incluem a capital federal', () => {
  assert.match(geo.responde('capital: Bahia'), /Salvador/);
  assert.match(geo.responde('Qual a capital de Sergipe?'), /Aracaju/);
  assert.match(geo.responde('Salvador é capital de qual estado?'), /Bahia.*BA/);
  assert.match(geo.responde('Qual é a capital do Brasil?'), /Brasília.*Distrito Federal/);
});
ok('reserva de pesquisa geográfica cita a referência local sem fingir consulta remota', () => {
  const r = geo.pesquisaLocalDeReserva('Qual é a capital de Sergipe?');
  assert(r);
  assert.match(r.resposta, /Aracaju/i);
  assert.match(r.fonte, /^https:\/\/educa\.ibge\.gov\.br\//);
  assert.equal(geo.pesquisaLocalDeReserva('qual é a capital da França?'), null);
});
ok('regiões e resumo de UF são atendidos localmente', () => {
  assert.match(geo.responde('Em que região fica Mato Grosso do Sul?'), /Centro-Oeste.*Campo Grande/);
  assert.match(geo.responde('região: Nordeste'), /9 unidade\(s\).*Sergipe/);
  assert.match(geo.responde('uf: BA'), /Bahia.*Nordeste.*Salvador.*divisas: 8/);
  assert.deepEqual(geo.dadosUF('SE'), { sigla: 'SE', nome: 'Sergipe', capital: 'Aracaju', regiao: 'Nordeste', divisas: ['Alagoas', 'Bahia'] });
});
ok('texto sem pedido geográfico brasileiro ou comando de outra rota não é interceptado', () => {
  assert.equal(geo.responde('escreva um poema sobre a Bahia'), null);
  assert.equal(geo.responde('capital da França'), null);
  assert.equal(geo.responde('pesquisa: capital de Sergipe'), null);
  assert.equal(geo.responde('notícias: capital de Sergipe'), null);
  assert.equal(geo.estadoPorNome('Minas Gerais'), 'MG');
  assert.equal(geo.estadoPorNome('estado inventado'), null);
});

console.log(`${n}/${n + falhas} testes de geografia passaram`);
process.exitCode = falhas ? 1 : 0;
