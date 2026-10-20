// Decisão pura para não repetir a sonda do vigia quando uma execução recente já a cobriu.
'use strict';

const JANELA_VIGIA_RECENTE_MS = 20 * 60 * 1000;
const ESTADOS_EM_ANDAMENTO = new Set(['queued', 'pending', 'in_progress']);

function inicioValido(run, agora) {
  const inicio = new Date(run && run.created_at || '').getTime();
  if (!Number.isFinite(inicio)) return false;
  const idade = agora - inicio;
  return idade >= 0 && idade <= JANELA_VIGIA_RECENTE_MS;
}

// Um sucesso recente ou uma sonda ainda em andamento impede somente o pulso redundante do e-mail.
// Falha, dado malformado ou relógio futuro não viram saúde e mantêm a tentativa de continuidade já existente.
function haVigiaRecente(runs, agora = Date.now()) {
  if (!Array.isArray(runs) || !Number.isFinite(agora)) return false;
  return runs.some(run => {
    if (!inicioValido(run, agora)) return false;
    if (ESTADOS_EM_ANDAMENTO.has(run.status)) return true;
    return run.status === 'completed' && run.conclusion === 'success';
  });
}

function decisaoDePulsoVigia(runs, opcoes = {}) {
  if (!opcoes.consultaDisponivel) return 'despachar-sem-confirmacao';
  return haVigiaRecente(runs, opcoes.agora) ? 'preservar' : 'despachar';
}

async function coordenaPulsoVigia({ consultaRuns, pedirVigia, registrar = () => {}, agora = Date.now() }) {
  let runs = null;
  if (typeof consultaRuns === 'function') {
    try { runs = await consultaRuns(); } catch (e) {}
  }
  const decisao = decisaoDePulsoVigia(runs, { consultaDisponivel: Array.isArray(runs), agora });
  if (decisao === 'preservar') {
    registrar('🛡 vigia recente ou em andamento; preservo a sonda existente');
    return { decisao, despachado: false };
  }
  if (decisao === 'despachar-sem-confirmacao') registrar('🛡 não consegui confirmar o vigia; mantenho o pulso de continuidade');
  await pedirVigia(decisao);
  return { decisao, despachado: true };
}

module.exports = { JANELA_VIGIA_RECENTE_MS, haVigiaRecente, decisaoDePulsoVigia, coordenaPulsoVigia };
