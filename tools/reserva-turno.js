// Reserva leve: não lê a caixa; só pede o turno longo quando consegue confirmar que não há outro vivo.
'use strict';

const REPO = 'reboclbrank-max/chat';
const WORKFLOW = 'email.yml';

function textoSeguro(valor) {
  return String(valor == null ? '' : valor).trim();
}

function dadosDaReservaConfiaveis(runs, runId) {
  const meuId = textoSeguro(runId);
  if (!Array.isArray(runs) || !meuId) return false;
  let encontreiMeuRun = false;
  for (const run of runs) {
    if (!run || typeof run !== 'object') return false;
    const id = textoSeguro(run.id);
    if (!id || !textoSeguro(run.status)) return false;
    if (id === meuId) encontreiMeuRun = true;
  }
  // Se a API ainda não enxerga a própria reserva, a fotografia pode estar atrasada; não inferir vazio.
  return encontreiMeuRun;
}

function haOutroTurnoVivo(runs, runId) {
  const meuId = textoSeguro(runId);
  if (!dadosDaReservaConfiaveis(runs, meuId)) return true;
  return runs.some(run => {
    if (textoSeguro(run.id) === meuId) return false;
    // Qualquer estado ainda não concluído, inclusive um futuro estado desconhecido, bloqueia a reserva.
    return textoSeguro(run.status).toLowerCase() !== 'completed';
  });
}

function decisaoDaReserva(runs, opcoes = {}) {
  if (!opcoes.consultaDisponivel || !dadosDaReservaConfiaveis(runs, opcoes.runId)) return 'preservar-sem-confirmacao';
  return haOutroTurnoVivo(runs, opcoes.runId) ? 'preservar' : 'despachar';
}

async function coordenaReservaDeTurno({ consultaRuns, pedirTurno, registrar = () => {}, runId }) {
  let runs = null;
  if (typeof consultaRuns === 'function') {
    try { runs = await consultaRuns(); } catch (e) {}
  }
  const decisao = decisaoDaReserva(runs, {
    consultaDisponivel: Array.isArray(runs),
    runId
  });
  if (decisao === 'preservar') {
    registrar('🔗 reserva encontrou turno ou fila existente; não disputa a caixa');
    return { decisao, despachado: false, confirmado: true };
  }
  if (decisao === 'preservar-sem-confirmacao') {
    registrar('🔗 reserva não confirmou a corrente; não lê a caixa nem despacha às cegas');
    return { decisao, despachado: false, confirmado: false };
  }
  await pedirTurno();
  registrar('🔗 reserva sem turno vivo; pedi o turno longo existente');
  return { decisao, despachado: true, confirmado: true };
}

function cabecalhos(token) {
  return {
    'Accept': 'application/vnd.github+json',
    'Authorization': 'Bearer ' + token,
    'User-Agent': 'reserva-turno/1'
  };
}

async function principal() {
  const token = textoSeguro(process.env.GITHUB_TOKEN);
  const runId = textoSeguro(process.env.GITHUB_RUN_ID);
  if (!token || !runId) throw new Error('ambiente de coordenação ausente');

  async function consultaRuns() {
    try {
      const resposta = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/runs?per_page=20', {
        headers: cabecalhos(token),
        signal: AbortSignal.timeout(30000)
      });
      if (!resposta.ok) return null;
      const corpo = await resposta.json();
      return Array.isArray(corpo.workflow_runs) ? corpo.workflow_runs : null;
    } catch (e) { return null; }
  }

  async function pedirTurno() {
    const resposta = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/dispatches', {
      method: 'POST',
      headers: Object.assign(cabecalhos(token), { 'Content-Type': 'application/json' }),
      body: JSON.stringify({ ref: 'main' }),
      signal: AbortSignal.timeout(30000)
    });
    if (!resposta.ok) throw new Error('pedido de turno recusado (HTTP ' + resposta.status + ')');
  }

  const resultado = await coordenaReservaDeTurno({
    consultaRuns,
    pedirTurno,
    registrar: mensagem => console.log(mensagem),
    runId
  });
  // Sem a fotografia da fila, a reserva não toca na caixa nem declara uma verificação saudável.
  if (!resultado.confirmado) process.exitCode = 1;
}

if (require.main === module) {
  principal().catch(() => {
    console.error('⚠️ reserva não concluiu a coordenação');
    process.exitCode = 1;
  });
}

module.exports = { haOutroTurnoVivo, decisaoDaReserva, coordenaReservaDeTurno };
