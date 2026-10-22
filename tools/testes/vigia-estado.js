// Testes offline do estado do vigia: pulso observável e recuperação automática contida.
'use strict';
const assert = require('assert');
const {
  INTERVALO_PULSO_MS,
  MARGEM_RELOGIO_FUTURO_MS,
  INTERVALOS_RECUPERACAO_MS,
  EVIDENCIAS_VIGIA,
  evidenciaVigiaConhecida,
  registrosDeRecuperacao,
  recuperacaoPermitida,
  registraRecuperacao,
  limpaRecuperacao,
  deveSalvarEstado
} = require('../vigia-estado');
let n = 0;
let falhas = 0;
function ok(nome, fn) { try { fn(); n++; console.log('✔ ' + nome); } catch (e) { falhas++; console.error('✘ ' + nome + ' — ' + e.message); } }
const agora = Date.parse('2026-10-19T04:00:00Z');
const verde = { Página: { ok: true, falhas: 0 } };

ok('evidências públicas são fechadas e não aceitam texto arbitrário', () => {
  assert(EVIDENCIAS_VIGIA.includes('postagem-agendada-recente'));
  assert.equal(evidenciaVigiaConhecida('turno-ativo'), 'turno-ativo');
  // Estado público já publicado continua legível, embora o vigia novo não emita esse rótulo.
  assert.equal(evidenciaVigiaConhecida('turno-ativo-com-sucessor'), 'turno-ativo-com-sucessor');
  assert.equal(evidenciaVigiaConhecida('DADO-ARBITRARIO-NAO-REFLETIR'), '');
});
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
ok('recuperações só aceitam famílias explícitas e timestamps sanitizados', () => {
  const registros = registrosDeRecuperacao({
    email: { ultima_tentativa_em: '2026-10-19T03:00:00Z', detalhe_privado: 'não deve sair' },
    desconhecida: { ultima_tentativa_em: '2026-10-19T03:00:00Z' },
    exame: { ultima_tentativa_em: 'data inválida' }
  });
  assert.deepEqual(registros, { email: { ultima_tentativa_em: '2026-10-19T03:00:00.000Z' } });
});
ok('primeira recuperação permitida grava freio persistível', () => {
  assert.equal(recuperacaoPermitida({}, 'email', agora), true);
  const registros = registraRecuperacao({}, 'email', agora);
  assert.deepEqual(registros, { email: { ultima_tentativa_em: '2026-10-19T04:00:00.000Z' } });
  assert.equal(deveSalvarEstado({ verificado_em: new Date(agora).toISOString(), itens: verde }, verde, agora + 1, registros), true);
});
ok('mesma família não re-dispara dentro do intervalo, mas volta a tentar ao vencê-lo', () => {
  const registros = registraRecuperacao({}, 'email', agora);
  assert.equal(recuperacaoPermitida(registros, 'email', agora + INTERVALOS_RECUPERACAO_MS.email - 1), false);
  assert.equal(recuperacaoPermitida(registros, 'email', agora + INTERVALOS_RECUPERACAO_MS.email), true);
});
ok('bateria tem intervalo independente e mais espaçado', () => {
  const registros = registraRecuperacao({}, 'exame', agora);
  assert.equal(INTERVALOS_RECUPERACAO_MS.exame > INTERVALOS_RECUPERACAO_MS.email, true);
  assert.equal(recuperacaoPermitida(registros, 'exame', agora + INTERVALOS_RECUPERACAO_MS.email), false);
  assert.equal(recuperacaoPermitida(registros, 'exame', agora + INTERVALOS_RECUPERACAO_MS.exame), true);
});
ok('relógio impossível não bloqueia recuperação e ação desconhecida nunca é promovida', () => {
  const futuro = registraRecuperacao({}, 'email', agora + MARGEM_RELOGIO_FUTURO_MS + 1);
  assert.equal(recuperacaoPermitida(futuro, 'email', agora), true);
  assert.equal(recuperacaoPermitida({}, 'publicar', agora), false);
});
ok('volta saudável limpa o freio para que uma nova pane tenha primeira tentativa', () => {
  const registros = registraRecuperacao({}, 'email', agora);
  const limpo = limpaRecuperacao(registros, 'email');
  assert.deepEqual(limpo, {});
  assert.equal(recuperacaoPermitida(limpo, 'email', agora + 1), true);
  assert.equal(deveSalvarEstado({ verificado_em: new Date(agora).toISOString(), itens: verde, recuperacoes: registros }, verde, agora + 1, limpo), true);
});
ok('mudança de causa sanitizada é persistida sem depender de detalhe bruto', () => {
  const antigo = { verificado_em: new Date(agora).toISOString(), itens: { Turno: { ok: false, falhas: 2, causa: 'api-indisponivel' } } };
  const novo = { Turno: { ok: false, falhas: 2, causa: 'turno-ausente' } };
  assert.equal(deveSalvarEstado(antigo, novo, agora + 1), true);
});

console.log(`${n}/${n + falhas} testes do estado do vigia passaram`);
process.exitCode = falhas ? 1 : 0;
