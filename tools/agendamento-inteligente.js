// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕐 AGENDAMENTO INTELIGENTE DE POSTS
// Agenda posts automaticamente usando dados de aprendizado (melhor horário por rede).
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_AGENDA = path.join(MARKETING_DIR, 'agenda-inteligente.json');

let cacheAgenda = null;
function carregar() {
  if (cacheAgenda) return cacheAgenda;
  try {
    if (fs.existsSync(ARQUIVO_AGENDA)) {
      cacheAgenda = JSON.parse(fs.readFileSync(ARQUIVO_AGENDA, 'utf8'));
      return cacheAgenda;
    }
  } catch (e) {}
  cacheAgenda = {
    fila: [],        // { id, texto, rede, jogo, horarioAgendado, status, criadoEm }
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cacheAgenda;
}
function salvar() {
  try {
    cacheAgenda.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_AGENDA, JSON.stringify(cacheAgenda, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENDAR POST
// Adiciona um post à fila de agendamento
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function agendarPost(texto, rede, jogo, horarioISO = null, opcoes = {}) {
  const aprendizado = require('./auto-correcao-aprendizado');
  const c = carregar();

  // Se não há horário especificado, usar o melhor horário para a rede
  let horario = horarioISO;
  if (!horario) {
    const melhor = aprendizado.melhorHorarioParaRede(rede);
    if (melhor) {
      const agora = new Date();
      const hora = parseInt(melhor.horario);
      const agendado = new Date(agora);
      agendado.setHours(hora, 0, 0, 0);
      if (agendado <= agora) agendado.setDate(agendado.getDate() + 1);
      horario = agendado.toISOString();
    } else {
      // Sem dados de aprendizado — agendar para daqui a 1 hora
      const agendado = new Date(Date.now() + 60 * 60 * 1000);
      horario = agendado.toISOString();
    }
  }

  const id = 'agend_' + c.proximoId++;
  const item = {
    id,
    texto,
    rede,
    jogo: jogo || 'ambos',
    horarioAgendado: horario,
    status: 'agendado',
    criadoEm: new Date().toISOString(),
    executadoEm: null,
    resultado: null,
    tentativa: 0,
    ...opcoes,
  };

  c.fila.push(item);
  // Ordenar por horário agendado
  c.fila.sort((a, b) => new Date(a.horarioAgendado) - new Date(b.horarioAgendado));
  salvar();
  return { ok: true, id, horarioAgendado: horario };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR FILA DE AGENDAMENTO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarAgendamento(status = null) {
  const c = carregar();
  if (status) {
    return c.fila.filter(item => item.status === status);
  }
  return c.fila;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OBTER PRÓXIMOS POSTS A EXECUTAR
// Retorna posts cujo horário agendado já passou e ainda estão pendentes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function obterPostsParaExecutar() {
  const c = carregar();
  const agora = new Date();
  return c.fila.filter(item => item.status === 'agendado' && new Date(item.horarioAgendado) <= agora);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MARCAR COMO EXECUTADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function marcarExecutado(id, resultado, sucesso) {
  const c = carregar();
  const item = c.fila.find(i => i.id === id);
  if (!item) return { ok: false, erro: 'Item não encontrado na agenda' };

  item.status = sucesso ? 'executado' : 'falhou';
  item.executadoEm = new Date().toISOString();
  item.resultado = resultado;
  salvar();
  return { ok: true, item };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CANCELAR AGENDAMENTO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function cancelarAgendamento(id) {
  const c = carregar();
  const idx = c.fila.findIndex(i => i.id === id);
  if (idx < 0) return { ok: false, erro: 'Item não encontrado na agenda' };
  c.fila[idx].status = 'cancelado';
  salvar();
  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS DA AGENDA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasAgenda() {
  const c = carregar();
  const total = c.fila.length;
  const agendados = c.fila.filter(i => i.status === 'agendado').length;
  const executados = c.fila.filter(i => i.status === 'executado').length;
  const falhos = c.fila.filter(i => i.status === 'falhou').length;
  const cancelados = c.fila.filter(i => i.status === 'cancelado').length;

  const porRede = {};
  for (const item of c.fila) {
    if (!porRede[item.rede]) porRede[item.rede] = { total: 0, executados: 0, falhos: 0 };
    porRede[item.rede].total++;
    if (item.status === 'executado') porRede[item.rede].executados++;
    if (item.status === 'falhou') porRede[item.rede].falhos++;
  }

  return {
    total,
    agendados,
    executados,
    falhos,
    cancelados,
    porRede,
    proximoAgendamento: c.fila
      .filter(i => i.status === 'agendado')
      .sort((a, b) => new Date(a.horarioAgendado) - new Date(b.horarioAgendado))[0],
  };
}

module.exports = {
  agendarPost,
  listarAgendamento,
  obterPostsParaExecutar,
  marcarExecutado,
  cancelarAgendamento,
  estatisticasAgenda,
  carregar,
  salvar,
  ARQUIVO_AGENDA,
};