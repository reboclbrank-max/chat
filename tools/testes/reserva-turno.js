// Contrato isolado da reserva: ela não lê a caixa nem substitui uma corrente que já existe.
'use strict';
const assert = require('assert');
const { haOutroTurnoVivo, decisaoDaReserva, coordenaReservaDeTurno,
  consultaComRetry, TENTATIVAS_CONSULTA } = require('../reserva-turno.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

ok('a própria reserva em andamento não bloqueia a retomada quando não há outro turno', async () => {
  const pedidos = [];
  const resultado = await coordenaReservaDeTurno({
    runId: '42',
    consultaRuns: async () => [{ id: 42, event: 'schedule', status: 'in_progress' }],
    pedirTurno: async () => pedidos.push('turno')
  });
  assert.equal(haOutroTurnoVivo([{ id: 42, status: 'in_progress' }], '42'), false);
  assert.equal(resultado.decisao, 'despachar');
  assert.equal(resultado.confirmado, true);
  assert.deepEqual(pedidos, ['turno']);
});

ok('turno manual pendente é preservado sem novo dispatch', async () => {
  const pedidos = [];
  const resultado = await coordenaReservaDeTurno({
    runId: '42',
    consultaRuns: async () => [
      { id: 42, event: 'schedule', status: 'in_progress' },
      { id: 99, event: 'workflow_dispatch', status: 'pending' }
    ],
    pedirTurno: async () => pedidos.push('turno')
  });
  assert.equal(resultado.decisao, 'preservar');
  assert.equal(resultado.despachado, false);
  assert.deepEqual(pedidos, []);
});

ok('turno ativo ou estado futuro não concluído também bloqueiam a reserva', () => {
  assert.equal(haOutroTurnoVivo([{ id: 42, status: 'in_progress' }, { id: 99, status: 'in_progress' }], '42'), true);
  assert.equal(haOutroTurnoVivo([{ id: 42, status: 'in_progress' }, { id: 99, status: 'waiting' }], '42'), true);
});

ok('histórico concluído não se passa por corrente viva', () => {
  const runs = [
    { id: 42, status: 'in_progress' },
    { id: 10, status: 'completed', conclusion: 'success' },
    { id: 11, status: 'completed', conclusion: 'failure' }
  ];
  assert.equal(haOutroTurnoVivo(runs, '42'), false);
  assert.equal(decisaoDaReserva(runs, { consultaDisponivel: true, runId: '42' }), 'despachar');
});

ok('consulta indisponível, dado malformado ou identificador ausente não despacham às cegas', async () => {
  for (const configuracao of [
    { runId: '42', consultaRuns: async () => { throw new Error('indisponível'); } },
    { runId: '42', consultaRuns: async () => [{ id: 42, status: 'in_progress' }, { id: '', status: '' }] },
    { runId: '42', consultaRuns: async () => [] },
    { runId: '', consultaRuns: async () => [] }
  ]) {
    const pedidos = [];
    const resultado = await coordenaReservaDeTurno(Object.assign({}, configuracao, {
      pedirTurno: async () => pedidos.push('turno')
    }));
    assert.equal(resultado.decisao, 'preservar-sem-confirmacao');
    assert.equal(resultado.confirmado, false);
    assert.deepEqual(pedidos, []);
  }
});

// --- retry e motivo visível (04/11) -------------------------------------------------
ok('falha passageira na consulta é repetida e a reserva ainda conclui', async () => {
  let chamadas = 0;
  const esperas = [];
  const consulta = await consultaComRetry({
    buscar: async () => {
      chamadas++;
      if (chamadas < 3) return { status: 503, motivo: 'HTTP 503' };
      return { runs: [{ id: 42, status: 'in_progress' }] };
    },
    esperar: async (ms) => esperas.push(ms)
  });
  assert.equal(consulta.tentativas, 3);
  assert.equal(consulta.motivo, '');
  assert.deepEqual(consulta.runs, [{ id: 42, status: 'in_progress' }]);
  assert.deepEqual(esperas, [400, 800]);
});

ok('credencial recusada não se repete: insistir não muda a resposta', async () => {
  let chamadas = 0;
  const consulta = await consultaComRetry({
    buscar: async () => { chamadas++; return { status: 401, motivo: 'HTTP 401' }; },
    esperar: async () => { throw new Error('não deveria esperar antes de desistir'); }
  });
  assert.equal(chamadas, 1);
  assert.equal(consulta.tentativas, 1);
  assert.equal(consulta.runs, null);
  assert.match(consulta.motivo, /401/);
  assert.match(consulta.motivo, /definitiva/);
});

ok('todas as tentativas passageiras caem: preserva, mas diz o motivo', async () => {
  let chamadas = 0;
  const consulta = await consultaComRetry({
    buscar: async () => { chamadas++; throw new Error('RemoteDisconnected'); },
    esperar: async () => {}
  });
  assert.equal(chamadas, TENTATIVAS_CONSULTA);
  assert.equal(consulta.runs, null);
  assert.match(consulta.motivo, /RemoteDisconnected/);
});

ok('o motivo da consulta que falhou chega ao resultado e ao log da reserva', async () => {
  const ditos = [];
  const pedidos = [];
  const resultado = await coordenaReservaDeTurno({
    runId: '42',
    consultaRuns: async () => { throw new Error('HTTP 403 (causa definitiva — não repito)'); },
    pedirTurno: async () => pedidos.push('turno'),
    registrar: (m) => ditos.push(m)
  });
  assert.equal(resultado.decisao, 'preservar-sem-confirmacao');
  assert.equal(resultado.confirmado, false);
  assert.deepEqual(pedidos, []);
  assert.match(resultado.motivo, /403/);
  assert.match(ditos.join(' '), /motivo: .*403/);
});

ok('o pedido de turno é escrita: nunca se repete, mesmo quando falha', async () => {
  let pedidos = 0;
  await assert.rejects(async () => {
    await coordenaReservaDeTurno({
      runId: '42',
      consultaRuns: async () => [{ id: 42, status: 'in_progress' }],
      pedirTurno: async () => { pedidos++; throw new Error('HTTP 502'); }
    });
  }, /502/);
  assert.equal(pedidos, 1);
});

(async () => {
  let certos = 0;
  let falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} testes da reserva de turno passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
