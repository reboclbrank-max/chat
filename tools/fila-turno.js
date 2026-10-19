// Decisão pura para manter a corrente do turno sem substituir um sucessor já confirmado.
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

module.exports = { haSucessorDoTurnoNaFila, decisaoDeProximoTurno };
