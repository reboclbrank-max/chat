// Reserva leve: não lê a caixa; só pede o turno longo quando consegue confirmar que não há outro vivo.
'use strict';

const REPO = 'reboclbrank-max/chat';
const WORKFLOW = 'email.yml';

// A consulta da fila é um GET: pode se repetir. O pedido de turno é POST: nunca se repete.
// Repetir escrita duplica turno; repetir leitura só custa segundos.
const TENTATIVAS_CONSULTA = 3;
const ESPERA_ENTRE_TENTATIVAS_MS = 400;

// Só causa passageira merece nova tentativa. 401/403 são credencial/permissão e vão falhar
// igual nas três vezes — insistir só gasta o tempo do turno e esconde o motivo verdadeiro.
function falhaPassageira(status) {
  if (status === undefined || status === null) return true; // erro de rede: não há status
  const numero = Number(status);
  if (!Number.isFinite(numero) || numero <= 0) return true;
  return numero >= 500 || numero === 429 || numero === 408;
}

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
  let motivo = '';
  if (typeof consultaRuns === 'function') {
    try { runs = await consultaRuns(); } catch (e) {
      // Antes isto era catch (e) {}: a decisão continuava segura (preserva), mas o motivo
      // do "não confirmei" desaparecia e ninguém sabia se foi rede, 403 ou corpo estranho.
      motivo = 'a consulta da fila lançou: ' + ((e && e.message) || String(e));
    }
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
    registrar('🔗 reserva não confirmou a corrente; não lê a caixa nem despacha às cegas'
      + (motivo ? ' · motivo: ' + motivo : ''));
    return { decisao, despachado: false, confirmado: false, motivo: motivo };
  }
  await pedirTurno();
  registrar('🔗 reserva sem turno vivo; pedi o turno longo existente');
  return { decisao, despachado: true, confirmado: true };
}

// Consulta com repetição limitada, só para GET e só em causa passageira. Devolve sempre
// { runs, motivo, tentativas } — nunca engole o motivo em silêncio.
async function consultaComRetry({ buscar, esperar, tentativas = TENTATIVAS_CONSULTA, registrar = () => {} }) {
  const dormir = typeof esperar === 'function'
    ? esperar
    : (ms) => new Promise(resolve => setTimeout(resolve, ms));
  let motivo = 'a consulta não devolveu lista de execuções';
  for (let tentativa = 1; tentativa <= tentativas; tentativa++) {
    let resultado;
    try {
      resultado = await buscar();
    } catch (e) {
      resultado = { erro: (e && e.message) || String(e) };
    }
    if (resultado && Array.isArray(resultado.runs)) {
      return { runs: resultado.runs, motivo: '', tentativas: tentativa };
    }
    motivo = (resultado && (resultado.motivo || resultado.erro)) || motivo;
    const status = resultado && resultado.status;
    const definitiva = !falhaPassageira(status);
    if (definitiva) {
      motivo += ' (causa definitiva' + (status ? ': HTTP ' + status : '') + ' — não repito)';
      return { runs: null, motivo, tentativas: tentativa };
    }
    if (tentativa === tentativas) break;
    registrar('↻ reserva: consulta da fila falhou (' + motivo + '); tentativa '
      + (tentativa + 1) + ' de ' + tentativas);
    await dormir(ESPERA_ENTRE_TENTATIVAS_MS * tentativa);
  }
  return { runs: null, motivo, tentativas };
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
    const consulta = await consultaComRetry({
      registrar: mensagem => console.log(mensagem),
      buscar: async () => {
        const resposta = await fetch('https://api.github.com/repos/' + REPO + '/actions/workflows/' + WORKFLOW + '/runs?per_page=20', {
          headers: cabecalhos(token),
          signal: AbortSignal.timeout(30000)
        });
        if (!resposta.ok) return { status: resposta.status, motivo: 'HTTP ' + resposta.status };
        const corpo = await resposta.json();
        if (!Array.isArray(corpo.workflow_runs)) return { status: resposta.status, motivo: 'corpo sem workflow_runs' };
        return { runs: corpo.workflow_runs };
      }
    });
    if (!Array.isArray(consulta.runs)) {
      // A decisão continua a mesma (preservar). O que muda é que agora existe uma frase
      // dizendo por que não deu — e ela vai para o log e para o resultado.
      throw new Error(consulta.motivo + ' após ' + consulta.tentativas + ' tentativa(s)');
    }
    return consulta.runs;
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
  principal().catch(erro => {
    // O motivo importa: sem ele, "não concluiu" é indistinguível de qualquer coisa.
    console.error('⚠️ reserva não concluiu a coordenação: ' + ((erro && erro.message) || String(erro)));
    process.exitCode = 1;
  });
}

module.exports = {
  haOutroTurnoVivo, decisaoDaReserva, coordenaReservaDeTurno,
  consultaComRetry, falhaPassageira, TENTATIVAS_CONSULTA
};
