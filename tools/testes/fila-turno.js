// Regressão pura: a corrente evita churn, mas uma reserva agendada não passa por sucessor longo.
'use strict';
const assert = require('assert');
const { haSucessorDoTurnoNaFila, decisaoDeProximoTurno } = require('../fila-turno.js');
let certos = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }

ok('workflow_dispatch pendente confirma sucessor longo', () => {
  assert.equal(haSucessorDoTurnoNaFila([{ event: 'workflow_dispatch', status: 'pending' }]), true);
  assert.equal(decisaoDeProximoTurno([{ event: 'workflow_dispatch', status: 'pending' }], { consultaDisponivel: true }), 'preservar');
});
ok('workflow_dispatch enfileirado também preserva o sucessor', () => {
  assert.equal(haSucessorDoTurnoNaFila([{ event: 'workflow_dispatch', status: 'queued' }]), true);
});
ok('reserva agendada e turno ativo não fingem ser sucessor longo', () => {
  const runs = [
    { event: 'schedule', status: 'pending' },
    { event: 'workflow_dispatch', status: 'in_progress' }
  ];
  assert.equal(haSucessorDoTurnoNaFila(runs), false);
  assert.equal(decisaoDeProximoTurno(runs, { consultaDisponivel: true }), 'despachar');
});
ok('troca aprovada de código substitui o sucessor para adotar checkout novo', () => {
  assert.equal(decisaoDeProximoTurno([{ event: 'workflow_dispatch', status: 'pending' }], { consultaDisponivel: true, substituir: true }), 'substituir');
});
ok('consulta indisponível mantém a continuidade sem afirmar que a fila está vazia', () => {
  assert.equal(decisaoDeProximoTurno([], { consultaDisponivel: false }), 'despachar-sem-confirmacao');
});

console.log(`${certos}/${certos + falhas} testes da fila de turno passaram`);
process.exitCode = falhas ? 1 : 0;
