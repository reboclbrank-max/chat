// Regressão pura: pulso de e-mail só acorda o vigia quando não há sonda recente confiável.
'use strict';
const assert = require('assert');
const { JANELA_VIGIA_RECENTE_MS, haVigiaRecente, decisaoDePulsoVigia, coordenaPulsoVigia } = require('../pulso-vigia.js');
const AGORA = Date.parse('2026-10-20T00:00:00.000Z');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }
function run(idade, status, conclusion) {
  return { created_at: new Date(AGORA - idade).toISOString(), status, conclusion };
}

ok('sucesso recente evita dispatch duplicado', async () => {
  const pedidos = [];
  const resultado = await coordenaPulsoVigia({
    consultaRuns: async () => [run(5 * 60 * 1000, 'completed', 'success')],
    pedirVigia: async decisao => pedidos.push(decisao),
    agora: AGORA
  });
  assert.equal(haVigiaRecente([run(5 * 60 * 1000, 'completed', 'success')], AGORA), true);
  assert.equal(resultado.decisao, 'preservar');
  assert.equal(resultado.despachado, false);
  assert.deepEqual(pedidos, []);
});
ok('sonda recente em andamento também evita sobreposição', () => {
  assert.equal(haVigiaRecente([run(2 * 60 * 1000, 'in_progress')], AGORA), true);
  assert.equal(haVigiaRecente([run(2 * 60 * 1000, 'pending')], AGORA), true);
});
ok('sucesso antigo ou falha não vira saúde e mantém pulso', async () => {
  const pedidos = [];
  const antigo = [run(JANELA_VIGIA_RECENTE_MS + 1, 'completed', 'success')];
  const falho = [run(2 * 60 * 1000, 'completed', 'failure')];
  assert.equal(decisaoDePulsoVigia(antigo, { consultaDisponivel: true, agora: AGORA }), 'despachar');
  assert.equal(decisaoDePulsoVigia(falho, { consultaDisponivel: true, agora: AGORA }), 'despachar');
  const resultado = await coordenaPulsoVigia({
    consultaRuns: async () => falho,
    pedirVigia: async decisao => pedidos.push(decisao),
    agora: AGORA
  });
  assert.equal(resultado.despachado, true);
  assert.deepEqual(pedidos, ['despachar']);
});
ok('dado malformado ou futuro não bloqueia continuidade', () => {
  assert.equal(haVigiaRecente([{ created_at: 'invalido', status: 'completed', conclusion: 'success' }], AGORA), false);
  assert.equal(haVigiaRecente([{ created_at: new Date(AGORA + 1).toISOString(), status: 'completed', conclusion: 'success' }], AGORA), false);
});
ok('consulta indisponível preserva fallback sem alegar vigia recente', async () => {
  const pedidos = [];
  const avisos = [];
  const resultado = await coordenaPulsoVigia({
    consultaRuns: async () => { throw new Error('indisponível'); },
    pedirVigia: async decisao => pedidos.push(decisao),
    registrar: aviso => avisos.push(aviso),
    agora: AGORA
  });
  assert.equal(resultado.decisao, 'despachar-sem-confirmacao');
  assert.deepEqual(pedidos, ['despachar-sem-confirmacao']);
  assert.equal(avisos.length, 1);
});

(async () => {
  let certos = 0;
  let falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} testes do pulso do vigia passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
