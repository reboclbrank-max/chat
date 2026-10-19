// Regressão pura: a corrente evita churn, mas uma reserva agendada não passa por sucessor longo.
'use strict';
const assert = require('assert');
const { haSucessorDoTurnoNaFila, decisaoDeProximoTurno, coordenaProximoTurno } = require('../fila-turno.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

ok('workflow_dispatch pendente confirma sucessor longo sem novo dispatch', async () => {
  const pedidos = [];
  const resultado = await coordenaProximoTurno({
    consultaRuns: async () => [{ event: 'workflow_dispatch', status: 'pending' }],
    pedirSucessor: async decisao => pedidos.push(decisao)
  });
  assert.equal(haSucessorDoTurnoNaFila([{ event: 'workflow_dispatch', status: 'pending' }]), true);
  assert.equal(resultado.decisao, 'preservar');
  assert.equal(resultado.despachado, false);
  assert.deepEqual(pedidos, []);
});
ok('workflow_dispatch enfileirado também preserva o sucessor', () => {
  assert.equal(haSucessorDoTurnoNaFila([{ event: 'workflow_dispatch', status: 'queued' }]), true);
});
ok('reserva agendada e turno ativo não fingem ser sucessor longo', async () => {
  const pedidos = [];
  const runs = [
    { event: 'schedule', status: 'pending' },
    { event: 'workflow_dispatch', status: 'in_progress' }
  ];
  const resultado = await coordenaProximoTurno({
    consultaRuns: async () => runs,
    pedirSucessor: async decisao => pedidos.push(decisao)
  });
  assert.equal(haSucessorDoTurnoNaFila(runs), false);
  assert.equal(resultado.decisao, 'despachar');
  assert.deepEqual(pedidos, ['despachar']);
});
ok('troca aprovada de código substitui o sucessor e não consulta a fila', async () => {
  let consultas = 0;
  const pedidos = [];
  const resultado = await coordenaProximoTurno({
    consultaRuns: async () => { consultas++; return [{ event: 'workflow_dispatch', status: 'pending' }]; },
    pedirSucessor: async decisao => pedidos.push(decisao),
    substituir: true
  });
  assert.equal(resultado.decisao, 'substituir');
  assert.equal(consultas, 0);
  assert.deepEqual(pedidos, ['substituir']);
  assert.equal(decisaoDeProximoTurno([], { consultaDisponivel: true, substituir: true }), 'substituir');
});
ok('consulta indisponível mantém a continuidade sem afirmar que a fila está vazia', async () => {
  const pedidos = [];
  const mensagens = [];
  const resultado = await coordenaProximoTurno({
    consultaRuns: async () => { throw new Error('indisponível'); },
    pedirSucessor: async decisao => pedidos.push(decisao),
    registrar: mensagem => mensagens.push(mensagem)
  });
  assert.equal(resultado.decisao, 'despachar-sem-confirmacao');
  assert.equal(resultado.despachado, true);
  assert.deepEqual(pedidos, ['despachar-sem-confirmacao']);
  assert.equal(mensagens.length, 1);
});

(async () => {
  let certos = 0;
  let falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} testes da fila de turno passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
