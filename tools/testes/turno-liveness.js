// Regressão pura: erros totais repetidos do ciclo precisam ficar visíveis sem tocar em canal real.
'use strict';
const assert = require('assert');
const {
  LIMITE_FALHAS_CONSECUTIVAS,
  proximaFalhasConsecutivas,
  deveEncerrarTurno
} = require('../turno-liveness');
let certos = 0;
let falhas = 0;
function ok(nome, fn) {
  try { fn(); certos++; console.log('✔ ' + nome); }
  catch (erro) { falhas++; console.error('✘ ' + nome + ' — ' + erro.message); }
}

ok('falha inicial é observada, mas não encerra turno por oscilação isolada', () => {
  const n = proximaFalhasConsecutivas(0, false);
  assert.equal(n, 1);
  assert.equal(deveEncerrarTurno(n), false);
});
ok('sucesso reinicia contador após falha transitória', () => {
  assert.equal(proximaFalhasConsecutivas(2, true), 0);
  assert.equal(deveEncerrarTurno(0), false);
});
ok('limite consecutivo encerra o turno com falha visível', () => {
  let n = 0;
  for (let i = 0; i < LIMITE_FALHAS_CONSECUTIVAS; i++) n = proximaFalhasConsecutivas(n, false);
  assert.equal(n, LIMITE_FALHAS_CONSECUTIVAS);
  assert.equal(deveEncerrarTurno(n), true);
});
ok('contador inválido e falhas adicionais ficam contidos no limite', () => {
  assert.equal(proximaFalhasConsecutivas('invalido', false), 1);
  assert.equal(proximaFalhasConsecutivas(LIMITE_FALHAS_CONSECUTIVAS, false), LIMITE_FALHAS_CONSECUTIVAS);
});

console.log(`${certos}/${certos + falhas} testes de liveness do turno passaram`);
process.exitCode = falhas ? 1 : 0;
