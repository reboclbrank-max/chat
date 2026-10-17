// Persistência econômica do estado do vigia: registra mudança imediatamente e pulso saudável a cada hora.
'use strict';

const INTERVALO_PULSO_MS = 60 * 60 * 1000;

function deveSalvarEstado(antigo, novos, referencia = Date.now()) {
  const antes = JSON.stringify((antigo && antigo.itens) || {});
  const depois = JSON.stringify(novos || {});
  if (antes !== depois) return true;
  const quando = Date.parse((antigo && antigo.verificado_em) || '');
  if (!Number.isFinite(quando)) return true;
  // Relógio muito adiantado também não deve congelar o pulso para sempre.
  if (quando > referencia + 5 * 60 * 1000) return true;
  return referencia - quando >= INTERVALO_PULSO_MS;
}

module.exports = { INTERVALO_PULSO_MS, deveSalvarEstado };
