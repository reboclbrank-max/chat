// Contrato isolado da prova de ciclos: a conta de cobertura, buraco e sobreposição
// tem de ser a mesma sempre, sem rede. A medição ao vivo é GET e fica no CLI.
'use strict';
const assert = require('assert');
const { intervalos, uniao, buracos, sobreposicoes, resumo, intervaloDoTurno,
  tempoForaDosPassos, MINIMO_DE_CICLOS } = require('../prova-ciclos.js');
const casos = [];
function ok(nome, fn) { casos.push({ nome, fn }); }

function run(id, inicioH, minutos, extra = {}) {
  const t0 = Date.UTC(2026, 10, 1, 0, 0, 0) + inicioH * 3600000;
  return Object.assign({
    id: id,
    run_started_at: new Date(t0).toISOString(),
    updated_at: new Date(t0 + minutos * 60000).toISOString(),
    event: 'schedule',
    status: 'completed',
    conclusion: 'success'
  }, extra);
}

ok('dois turnos colados não abrem buraco', () => {
  const lista = intervalos([run(1, 0, 60), run(2, 1, 60)]).validos;
  assert.equal(buracos(lista).length, 0);
  assert.equal(resumo([run(1, 0, 60), run(2, 1, 60)]).cobertura_pct, 100);
});

ok('buraco menor que o limite é fila, não perda', () => {
  const lista = intervalos([run(1, 0, 60), run(2, 1.1, 60)]).validos;
  assert.equal(buracos(lista).length, 0);
});

ok('buraco grande aparece com os minutos certos', () => {
  const lista = intervalos([run(1, 0, 60), run(2, 2, 60)]).validos;
  const achados = buracos(lista);
  assert.equal(achados.length, 1);
  assert.equal(achados[0].minutos, 60);
});

ok('sobreposição longa é vista; sobreposição curta é ignorada', () => {
  const longa = intervalos([run(1, 0, 60), run(2, 0.5, 60)]).validos;
  assert.equal(sobreposicoes(longa).length, 1);
  const curta = intervalos([run(1, 0, 60), run(2, 0.95, 60)]).validos;
  assert.equal(sobreposicoes(curta).length, 0);
});

ok('execução sem data legível é contada como ilegível, não como zero', () => {
  const semData = { id: 9, status: 'completed', updated_at: 'não é data' };
  const conta = intervalos([run(1, 0, 60), semData]);
  assert.equal(conta.validos.length, 1);
  assert.equal(conta.ilegiveis, 1);
  assert.match(resumo([run(1, 0, 60), semData]).razoes.join(' '), /legível/);
});

ok('amostra curta nunca vira cumprido, mesmo com cobertura total', () => {
  const r = resumo([run(1, 0, 60)]);
  assert.equal(r.veredito, 'insuficiente');
  assert.ok(r.ciclos < MINIMO_DE_CICLOS);
});

ok('cem ciclos colados e sem sobreposição cumprem o degrau', () => {
  const lista = [];
  for (let i = 0; i < MINIMO_DE_CICLOS; i++) lista.push(run(1000 + i, i, 60));
  const r = resumo(lista);
  assert.equal(r.ciclos, MINIMO_DE_CICLOS);
  assert.equal(r.cobertura_pct, 100);
  assert.equal(r.veredito, 'cumprido');
  assert.deepEqual(r.razoes, []);
});

ok('cem ciclos com buraco grande ficam em parcial, com a razão dita', () => {
  const lista = [];
  for (let i = 0; i < MINIMO_DE_CICLOS; i++) lista.push(run(2000 + i, i < 50 ? i : i + 3, 60));
  const r = resumo(lista);
  assert.equal(r.veredito, 'parcial');
  assert.match(r.razoes.join(' '), /buraco/);
});

ok('lista vazia não estoura e não finge saúde', () => {
  const r = resumo([]);
  assert.equal(r.ciclos, 0);
  assert.equal(r.cobertura_pct, 0);
  assert.equal(r.veredito, 'insuficiente');
});

ok('a medida boa é o job do turno, não a execução inteira', () => {
  const execucao = run(7, 0, 700); // execução longa por fila
  const jobs = [
    { name: 'reserva', status: 'completed', conclusion: 'success',
      started_at: new Date(Date.UTC(2026, 10, 1, 0, 0)).toISOString(),
      completed_at: new Date(Date.UTC(2026, 10, 1, 0, 2)).toISOString() },
    { name: 'turno', status: 'completed', conclusion: 'success',
      started_at: new Date(Date.UTC(2026, 10, 1, 0, 5)).toISOString(),
      completed_at: new Date(Date.UTC(2026, 10, 1, 1, 5)).toISOString() }
  ];
  const soTurno = intervaloDoTurno(execucao, jobs);
  assert.equal(new Date(soTurno.run_started_at).getUTCHours(), 0);
  assert.equal(new Date(soTurno.updated_at).getUTCHours(), 1);
  assert.equal(soTurno.segundos, undefined); // ainda cru: quem normaliza é intervalos()
  assert.equal(intervalos([soTurno]).validos[0].segundos, 3600);
  // execução sem job de turno não inventa medida
  assert.equal(intervaloDoTurno(execucao, [{ name: 'reserva' }]), null);
});

ok('tempo de job depois do último passo é medido, não engolido', () => {
  // o caso real de 01/11: turno de 346 min dentro de um job de 406 min
  const job = {
    started_at: '2026-11-01T03:09:24Z',
    completed_at: '2026-11-01T09:55:14Z',
    steps: [
      { started_at: '2026-11-01T03:09:25Z', completed_at: '2026-11-01T03:10:25Z' },
      { started_at: '2026-11-01T03:10:25Z', completed_at: '2026-11-01T08:55:25Z' }
    ]
  };
  const fora = tempoForaDosPassos(job);
  assert.equal(fora.job_min, 406);
  assert.equal(fora.passos_min, 346);
  assert.equal(fora.depois_do_ultimo_min, 60);
  assert.equal(fora.fora_min, 60);
});

ok('job sem passos legíveis não inventa anomalia nem esconde o total', () => {
  const fora = tempoForaDosPassos({ started_at: '2026-11-01T00:00:00Z', completed_at: '2026-11-01T00:10:00Z', steps: [] });
  assert.equal(fora.job_min, 10);
  assert.equal(fora.passos_min, 0);
  assert.equal(fora.fora_min, 10);
  assert.equal(tempoForaDosPassos({}), null);
  assert.equal(tempoForaDosPassos(null), null);
});

ok('turno abortado é distinguido de tempo morto', () => {
  const abortado = tempoForaDosPassos({
    started_at: '2026-11-02T15:37:58Z',
    completed_at: '2026-11-02T16:53:31Z',
    steps: [
      { status: 'completed', started_at: '2026-11-02T15:37:58Z', completed_at: '2026-11-02T15:38:39Z' },
      { status: 'in_progress', started_at: '2026-11-02T15:38:39Z', completed_at: null },
      { status: 'pending', started_at: null, completed_at: null }
    ]
  });
  assert.equal(abortado.passos_incompletos, 2);
  assert.ok(abortado.fora_min >= 70);
});

ok('job normal (passos cobrindo o tempo) não gera anomalia', () => {
  const fora = tempoForaDosPassos({
    started_at: '2026-11-01T00:00:00Z',
    completed_at: '2026-11-01T01:00:00Z',
    steps: [{ started_at: '2026-11-01T00:00:00Z', completed_at: '2026-11-01T01:00:00Z' }]
  });
  assert.equal(fora.fora_min, 0);
});

(async () => {
  let certos = 0;
  let falhas = 0;
  for (const { nome, fn } of casos) {
    try { await fn(); certos++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); }
  }
  console.log(`${certos}/${certos + falhas} testes da prova de ciclos passaram`);
  process.exitCode = falhas ? 1 : 0;
})();
