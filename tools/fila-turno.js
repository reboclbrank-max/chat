// Decisão pura e coordenação testável para manter a corrente sem substituir sucessor confirmado.
'use strict';

const ESTADOS_NA_FILA = new Set(['queued', 'pending']);

// Só workflow_dispatch cria o turno longo. Uma execução schedule pendente pode ser a reserva;
// ela não substitui o sucessor longo e, por isso, não conta como corrente confirmada aqui.
function haSucessorDoTurnoNaFila(runs) {
  if (!Array.isArray(runs)) return false;
  return runs.some(run => Boolean(run) && run.event === 'workflow_dispatch' && ESTADOS_NA_FILA.has(run.status));
}

// "substituir" é exclusivo da troca de código aprovada: ela precisa de um checkout novo.
// Sem leitura da API, preservamos o comportamento anterior de pedir sucessor para não romper a continuidade.
function decisaoDeProximoTurno(runs, opcoes = {}) {
  if (opcoes.substituir) return 'substituir';
  if (!opcoes.consultaDisponivel) return 'despachar-sem-confirmacao';
  return haSucessorDoTurnoNaFila(runs) ? 'preservar' : 'despachar';
}

// Mantém o efeito externo atrás de uma função injetada: o contrato testa que sucessor confirmado
// não produz dispatch, e que indisponibilidade da consulta conserva a continuidade já existente.
async function coordenaProximoTurno({ consultaRuns, pedirSucessor, registrar = () => {}, substituir = false }) {
  let runs = null;
  if (!substituir && typeof consultaRuns === 'function') {
    try { runs = await consultaRuns(); } catch (e) {}
  }
  const decisao = decisaoDeProximoTurno(runs, { consultaDisponivel: Array.isArray(runs), substituir: Boolean(substituir) });
  if (decisao === 'preservar') {
    registrar('🔗 próximo turno manual já está na fila; preservo o sucessor');
    return { decisao, despachado: false };
  }
  if (decisao === 'despachar-sem-confirmacao') registrar('🔗 não consegui confirmar a fila; preservo a continuidade com um pedido de sucessor');
  await pedirSucessor(decisao);
  return { decisao, despachado: true };
}

module.exports = { haSucessorDoTurnoNaFila, decisaoDeProximoTurno, coordenaProximoTurno };
