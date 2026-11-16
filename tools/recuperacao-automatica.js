// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RECUPERAÇÃO AUTOMÁTICA DE QUEDAS
// Quando uma queda de métrica é detectada, cria automaticamente:
// 1. Uma campanha de reativação
// 2. Posts agendados de recuperação
// 3. Backoff exponencial para tentativas (1min → 4min → 24h)
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_RECUPERACAO = path.join(MARKETING_DIR, 'recuperacao-automatica.json');

const alertaQueda = require('./alerta-queda-recuperacao');
const campanhas = require('./campanhas-automatizadas');
const agendamento = require('./agendamento-inteligente');

let cacheRec = null;
function carregar() {
  if (cacheRec) return cacheRec;
  try {
    if (fs.existsSync(ARQUIVO_RECUPERACAO)) {
      cacheRec = JSON.parse(fs.readFileSync(ARQUIVO_RECUPERACAO, 'utf8'));
      return cacheRec;
    }
  } catch (e) {}
  cacheRec = {
    recuperacoes: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cacheRec;
}
function salvar() {
  try {
    cacheRec.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_RECUPERACAO, JSON.stringify(cacheRec, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PROCESSAR QUEDA — cria campanha de reativação automaticamente
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function processarQueda(alerta) {
  const c = carregar();

  // Só processar alertas ativos de severidade media ou alta
  if (alerta.status !== 'ativo') return { ok: false, motivo: 'alerta não ativo' };
  if (!['media', 'alta'].includes(alerta.severidade)) {
    return { ok: false, motivo: 'severidade baixa — não cria campanha automaticamente' };
  }

  // Verificar se já existe recuperação para este alerta
  const existente = c.recuperacoes.find(r => r.idAlerta === alerta.id && r.status !== 'cancelada');
  if (existente) {
    return { ok: false, motivo: 'recuperação já existe para este alerta' };
  }

  const id = 'rec_auto_' + c.proximoId++;

  // Determinar jogo baseado na métrica (ambos por padrão)
  const jogo = 'ambos';

  // Criar campanha de reativação
  const nomeCampanha = 'Recuperação automática — ' + alerta.metrica + ' (' + alerta.severidade + ')';
  const campResult = campanhas.criarCampanha(nomeCampanha, 'reativacao', jogo, new Date().toISOString());

  if (!campResult.ok) {
    return { ok: false, erro: 'não foi possível criar campanha: ' + campResult.erro };
  }

  const campanha = campResult.campanha;

  // Criar posts de recuperação para as principais redes
  const redes = ['instagram', 'x', 'nostr'];
  const postsCriados = [];

  const textosRecuperacao = {
    downloads: '📥 Baixe o jogo novamente! Tem novidades esperando por você.',
    inscritos: '👥 Volte a fazer parte da nossa comunidade. Novidades por aí!',
    ctr: '🎮 Confira as novidades do jogo — clique para saber mais!',
    conversao: '📥 O download é gratuito e rápido. Baixe agora!',
    churn: '🔄 Sentimos sua falta! Volte a jogar e descubra o que há de novo.',
    receita: '💰 Oferta especial por tempo limitado. Não perca!',
  };

  for (const rede of redes) {
    const texto = textosRecuperacao[alerta.metrica] || 'Confira as novidades do jogo!';
    const agendResult = agendamento.agendarPost(texto, rede, jogo);
    if (agendResult.ok) {
      postsCriados.push({ rede, id: agendResult.id, horario: agendResult.horarioAgendado });
    }
  }

  // Registrar recuperação
  const recuperacao = {
    id,
    idAlerta: alerta.id,
    idCampanha: campanha.id,
    metrica: alerta.metrica,
    severidade: alerta.severidade,
    status: 'ativa',
    tentativa: 0,
    maxTentativas: 3,
    backoffNiveis: [1, 4, 24], // horas: 1min, 4min, 24h (aproximado)
    proximaTentativa: null,
    postsCriados,
    campanhaId: campanha.id,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    resolvidaEm: null,
  };

  c.recuperacoes.push(recuperacao);
  salvar();

  // Marcar alerta como em recuperação
  alertaQueda.resolverAlerta(alerta.id, false); // não resolvido ainda, em recuperação
  alertaQueda.listarAlertas(); // recarregar cache

  return {
    ok: true,
    recuperacao,
    campanha,
    postsCriados,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// VERIFICAR RECUPERAÇÕES PENDENTES
// Verifica se alguma recuperação precisa de nova tentativa (backoff)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function verificarRecuperacoesPendentes() {
  const c = carregar();
  const agora = new Date();
  const resultados = [];

  for (const rec of c.recuperacoes) {
    if (rec.status !== 'ativa') continue;
    if (rec.tentativa >= rec.maxTentativas) {
      rec.status = 'exaurida';
      rec.atualizadoEm = agora.toISOString();
      continue;
    }

    // Verificar se chegou a hora da próxima tentativa
    if (rec.proximaTentativa && new Date(rec.proximaTentativa) > agora) continue;

    // Executar tentativa de recuperação
    const tentativasPrevias = rec.tentativa;
    const nivelBackoff = rec.backoffNiveis[tentativasPrevias] || 24;

    // Tentar executar passos da campanha
    const camp = campanhas.obterCampanha(rec.campanhaId);
    if (camp) {
      const passosPendentes = camp.passos.filter(p => p.status === 'pendente');
      if (passosPendentes.length > 0) {
        // Executar o próximo passo pendente
        const passo = passosPendentes[0];
        const execResult = campanhas.executarPasso(camp.id, passo.id, {
          acao: 'recuperacao_automatica_tentativa_' + (tentativasPrevias + 1),
          backoffHoras: nivelBackoff,
        }, true);

        rec.tentativa++;
        rec.atualizadoEm = new Date().toISOString();

        // Calcular próxima tentativa com backoff
        const proxima = new Date();
        proxima.setHours(proxima.getHours() + nivelBackoff);
        rec.proximaTentativa = proxima.toISOString();

        salvar();

        resultados.push({
          idRecuperacao: rec.id,
          tentativa: rec.tentativa,
          backoffHoras: nivelBackoff,
          passoExecutado: passo.acao,
          proximaTentativa: rec.proximaTentativa,
        });
      } else {
        // Todos os passos executados — marcar como resolvida
        rec.status = 'resolvida';
        rec.resolvidaEm = new Date().toISOString();
        salvar();
        resultados.push({
          idRecuperacao: rec.id,
          status: 'resolvida',
          motivo: 'todos os passos da campanha executados',
        });
      }
    }
  }

  return resultados;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR RECUPERAÇÕES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarRecuperacoes(status = null) {
  const c = carregar();
  if (status) return c.recuperacoes.filter(r => r.status === status);
  return c.recuperacoes;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS DE RECUPERAÇÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasRecuperacao() {
  const c = carregar();
  const total = c.recuperacoes.length;
  const ativas = c.recuperacoes.filter(r => r.status === 'ativa').length;
  const resolvidas = c.recuperacoes.filter(r => r.status === 'resolvida').length;
  const exauridas = c.recuperacoes.filter(r => r.status === 'exaurida').length;
  const canceladas = c.recuperacoes.filter(r => r.status === 'cancelada').length;

  const porMetrica = {};
  for (const r of c.recuperacoes) {
    if (!porMetrica[r.metrica]) porMetrica[r.metrica] = { total: 0, resolvidas: 0, exauridas: 0 };
    porMetrica[r.metrica].total++;
    if (r.status === 'resolvida') porMetrica[r.metrica].resolvidas++;
    if (r.status === 'exaurida') porMetrica[r.metrica].exauridas++;
  }

  return {
    total, ativas, resolvidas, exauridas, canceladas, porMetrica,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CANCELAR RECUPERAÇÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function cancelarRecuperacao(id) {
  const c = carregar();
  const rec = c.recuperacoes.find(r => r.id === id);
  if (!rec) return { ok: false, erro: 'Recuperação não encontrada' };
  rec.status = 'cancelada';
  rec.atualizadoEm = new Date().toISOString();
  salvar();
  return { ok: true };
}

module.exports = {
  processarQueda,
  verificarRecuperacoesPendentes,
  listarRecuperacoes,
  estatisticasRecuperacao,
  cancelarRecuperacao,
  carregar,
  salvar,
  ARQUIVO_RECUPERACAO,
};