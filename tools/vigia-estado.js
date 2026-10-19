// Estado mínimo e sanitizado do vigia: pulso observável e contenção das recuperações automáticas.
'use strict';

const INTERVALO_PULSO_MS = 60 * 60 * 1000;
const MARGEM_RELOGIO_FUTURO_MS = 5 * 60 * 1000;
// Uma falha pode durar mais que uma sonda. Estes intervalos evitam que o próprio vigia
// transforme uma indisponibilidade em rajada de dispatches e consumo de cota gratuita.
const INTERVALOS_RECUPERACAO_MS = Object.freeze({
  email: 60 * 60 * 1000,
  exame: 6 * 60 * 60 * 1000
});

// Evidências fechadas e sem conteúdo externo. Elas qualificam uma fotografia saudável sem
// transformar texto de API, caixa ou plataforma em estado público ou mensagem ao dono.
const EVIDENCIAS_VIGIA = Object.freeze([
  'pagina-respondendo',
  'postagem-agendada-recente',
  'postagem-em-andamento',
  'turno-ativo',
  'turno-ativo-com-sucessor',
  'fila-recente-sem-executor',
  'turno-recente',
  'bateria-recem-executada',
  'bateria-em-andamento',
  'checagem-limitada',
  'caixa-sem-pendencia',
  'caixa-recem-chegada'
]);

function evidenciaVigiaConhecida(valor) {
  return EVIDENCIAS_VIGIA.includes(valor) ? valor : '';
}

function registrosDeRecuperacao(valor) {
  const bruto = valor && typeof valor === 'object' && valor.recuperacoes && typeof valor.recuperacoes === 'object'
    ? valor.recuperacoes : valor;
  const saida = {};
  for (const chave of Object.keys(INTERVALOS_RECUPERACAO_MS)) {
    const quando = bruto && bruto[chave] && bruto[chave].ultima_tentativa_em;
    const ms = Date.parse(String(quando || ''));
    if (Number.isFinite(ms)) saida[chave] = { ultima_tentativa_em: new Date(ms).toISOString() };
  }
  return saida;
}

function recuperacaoPermitida(registros, chave, referencia = Date.now()) {
  const intervalo = INTERVALOS_RECUPERACAO_MS[chave];
  if (!Number.isFinite(intervalo)) return false; // ação desconhecida não deve ser promovida por engano
  const registro = registrosDeRecuperacao(registros)[chave];
  const quando = Date.parse(String(registro && registro.ultima_tentativa_em || ''));
  // Estado ausente/corrompido ou relógio impossível não pode bloquear recuperação para sempre.
  if (!Number.isFinite(quando) || quando > referencia + MARGEM_RELOGIO_FUTURO_MS) return true;
  return referencia - quando >= intervalo;
}

function registraRecuperacao(registros, chave, referencia = Date.now()) {
  const proximo = registrosDeRecuperacao(registros);
  if (!Object.prototype.hasOwnProperty.call(INTERVALOS_RECUPERACAO_MS, chave)) return proximo;
  proximo[chave] = { ultima_tentativa_em: new Date(referencia).toISOString() };
  return proximo;
}

function limpaRecuperacao(registros, chave) {
  const proximo = registrosDeRecuperacao(registros);
  delete proximo[chave];
  return proximo;
}

function deveSalvarEstado(antigo, novos, referencia = Date.now(), recuperacoes = (antigo && antigo.recuperacoes) || {}) {
  const antes = JSON.stringify((antigo && antigo.itens) || {});
  const depois = JSON.stringify(novos || {});
  if (antes !== depois) return true;
  // A tentativa ou a limpeza do freio também precisa sobreviver ao próximo cron.
  const antesRecuperacoes = JSON.stringify(registrosDeRecuperacao(antigo && antigo.recuperacoes));
  const depoisRecuperacoes = JSON.stringify(registrosDeRecuperacao(recuperacoes));
  if (antesRecuperacoes !== depoisRecuperacoes) return true;
  const quando = Date.parse((antigo && antigo.verificado_em) || '');
  if (!Number.isFinite(quando)) return true;
  // Relógio muito adiantado também não deve congelar o pulso para sempre.
  if (quando > referencia + MARGEM_RELOGIO_FUTURO_MS) return true;
  return referencia - quando >= INTERVALO_PULSO_MS;
}

module.exports = {
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
};
