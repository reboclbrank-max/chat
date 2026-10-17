// Testes offline do pulso de estado: vigia verde continua observável sem commit a cada rodada.
'use strict';
const assert = require('assert');
const { INTERVALO_PULSO_MS, deveSalvarEstado } = require('../vigia-estado');
let n = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
const agora = Date.parse('2026-10-17T06:00:00Z');
const verde = { Página: { ok: true, falhas: 0 } };

ok('mudança de saúde é persistida imediatamente', () => {
  assert.equal(deveSalvarEstado({ verificado_em: new Date(agora).toISOString(), itens: verde }, { Página: { ok: false, falhas: 1 } }, agora), true);
});
ok('estado verde idêntico não cria ruído antes de uma hora', () => {
  assert.equal(deveSalvarEstado({ verificado_em: new Date(agora - 30 * 60 * 1000).toISOString(), itens: verde }, verde, agora), false);
});
ok('pulso idêntico é persistido ao completar uma hora', () => {
  assert.equal(deveSalvarEstado({ verificado_em: new Date(agora - INTERVALO_PULSO_MS).toISOString(), itens: verde }, verde, agora), true);
});
ok('estado ausente ou relógio futuro não congela a observabilidade', () => {
  assert.equal(deveSalvarEstado({}, verde, agora), true);
  assert.equal(deveSalvarEstado({ verificado_em: new Date(agora + 10 * 60 * 1000).toISOString(), itens: verde }, verde, agora), true);
});

console.log(`${n}/${n + falhas} testes do pulso do vigia passaram`);
process.exitCode = falhas ? 1 : 0;
