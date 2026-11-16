// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 RELATÓRIO SEMANAL AUTOMÁTICO
// Gera relatório de desempenho semanal com métricas, alertas e recomendações.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_RELATORIOS = path.join(MARKETING_DIR, 'relatorios-semanais.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try {
    if (fs.existsSync(ARQUIVO_RELATORIOS)) {
      cache = JSON.parse(fs.readFileSync(ARQUIVO_RELATORIOS, 'utf8'));
      return cache;
    }
  } catch (e) {}
  cache = {
    relatorios: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cache;
}
function salvar() {
  try {
    cache.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_RELATORIOS, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GERAR RELATÓRIO SEMANAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function gerarRelatorioSemanal(dadosExternos = {}) {
  const c = carregar();
  const agora = new Date();
  const semanaInicial = new Date(agora);
  semanaInicial.setDate(agora.getDate() - agora.getDay()); // domingo
  semanaInicial.setHours(0, 0, 0, 0);

  const id = 'rel_' + c.proximoId++;

  const relatorio = {
    id,
    semanaInicio: semanaInicial.toISOString(),
    semanaFim: new Date(semanaInicial.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    geradoEm: agora.toISOString(),
    jogo: 'ambos',
    metricas: {
      inscritos: dadosExternos.inscritos || 0,
      downloads: dadosExternos.downloads || 0,
      cliques: dadosExternos.cliques || 0,
      impressoes: dadosExternos.impressoes || 0,
      receita: dadosExternos.receita || 0,
    },
    alertas: dadosExternos.alertas || [],
    campanhasAtivas: dadosExternos.campanhasAtivas || 0,
    postsAgendados: dadosExternos.postsAgendados || 0,
    imagensCriadas: dadosExternos.imagensCriadas || 0,
    recuperacoesExecutadas: dadosExternos.recuperacoesExecutadas || 0,
    recomendacoes: [],
    conclusao: '',
  };

  // Gerar recomendações baseadas nos dados
  if (relatorio.metricas.downloads < 10) {
    relatorio.recomendacoes.push('📥 Downloads baixos esta semana. Considere criar campanha de reativação.');
  }
  if (relatorio.alertas.length > 0) {
    relatorio.recomendacoes.push('🚨 Há alertas ativos. Priorize recuperação de métricas em queda.');
  }
  if (relatorio.postsAgendados === 0) {
    relatorio.recomendacoes.push('🕐 Nenhum post agendado para a próxima semana. Crie agenda de posts.');
  }
  if (relatorio.recomendacoes.length === 0) {
    relatorio.recomendacoes.push('✅ Semana estável. Continue com a estratégia atual.');
  }

  relatorio.conclusao = relatorio.recomendacoes.join(' ');

  c.relatorios.push(relatorio);
  salvar();
  return { ok: true, relatorio };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR RELATÓRIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarRelatorios(limite = 10) {
  const c = carregar();
  return c.relatorios
    .sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm))
    .slice(0, limite);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS DE RELATÓRIOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasRelatorios() {
  const c = carregar();
  return {
    total: c.relatorios.length,
    ultimo: c.relatorios.length > 0 ? c.relatorios[c.relatorios.length - 1].geradoEm : null,
  };
}

module.exports = {
  gerarRelatorioSemanal,
  listarRelatorios,
  estatisticasRelatorios,
  carregar,
  salvar,
  ARQUIVO_RELATORIOS,
};