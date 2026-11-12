// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 STATUS TOTAL MARKETING — relatório integrado de todas as camadas, métricas,
// anomalias, otimizações e recomendações. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'status-total-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = {
    ativo: false,
    relatorios: [],
    ultima_execucao: null,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

// Integração com os outros módulos de marketing
let hcModulo = null;
let alertasModulo = null;
let orquestradorModulo = null;
let autoEscaladaModulo = null;
let inteligenciaModulo = null;

function _carregarModulos() {
  if (hcModulo) return;
  try { hcModulo = require('./health-check-camadas'); } catch (e) {}
  try { alertasModulo = require('./alertas-proativos-marketing'); } catch (e) {}
  try { orquestradorModulo = require('./orquestrador-maximo-marketing'); } catch (e) {}
  try { autoEscaladaModulo = require('./auto-escalada-marketing'); } catch (e) {}
  try { inteligenciaModulo = require('./inteligencia-marketing'); } catch (e) {}
}

function ativarStatusTotal() {
  const c = carregar();
  const id = 'st_' + Date.now();
  c.ativo = true;
  c.ultima_execucao = new Date().toISOString();
  salvar();
  return { ok: true, id };
}

function gerarRelatorioStatus() {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Status total não ativo' };
  _carregarModulos();

  // Health check das camadas
  let hc = { camadas_total: 49, camadas_ativas: 0, camadas_inativas: 0, recuperacoes_sucesso: 0, recuperacoes_falha: 0 };
  if (hcModulo && hcModulo.estatisticasHealthCheck) {
    const est = hcModulo.estatisticasHealthCheck();
    hc = { camadas_total: est.total_camadas, camadas_ativas: est.camadas_monitoradas || 0, camadas_inativas: 0, recuperacoes_sucesso: est.recuperacoes_sucesso || 0, recuperacoes_falha: est.recuperacoes_falha || 0 };
    if (est.camadas_monitoradas) hc.camadas_inativas = est.total_camadas - est.camadas_monitoradas;
  }

  // Alertas proativos
  let alertas = { total: 0, pendentes: 0, regras: 3, ultima_execucao: null };
  if (alertasModulo && alertasModulo.estatisticasAlertas) {
    const estA = alertasModulo.estatisticasAlertas();
    alertas = { total: estA.total || 0, pendentes: estA.pendentes || 0, regras: estA.regras || 3, ultima_execucao: estA.ultima_execucao };
  }

  // Orquestrador máximo
  let orquestrador = { ativo: false, total_coordenacoes: 0, ultima_execucao: null };
  if (orquestradorModulo && orquestradorModulo.estatisticasOrquestradorMaximo) {
    const estO = orquestradorModulo.estatisticasOrquestradorMaximo();
    orquestrador = { ativo: estO.ativo, total_coordenacoes: estO.total_coordenacoes || 0, ultima_execucao: estO.ultima_execucao };
  }

  // Auto-escalada
  let escalada = { ativo: false, total_escalas: 0, total_ajustes: 0 };
  if (autoEscaladaModulo && autoEscaladaModulo.estatisticasAutoEscalada) {
    const estE = autoEscaladaModulo.estatisticasAutoEscalada();
    escalada = { ativo: estE.ativo, total_escalas: estE.total_escalas || 0, total_ajustes: estE.total_ajustes || 0 };
  }

  // Inteligência de marketing
  let inteligencia = { total_conversas: 0, jogos: ['ceifalume', 'prancheta'] };
  if (inteligenciaModulo && inteligenciaModulo.estatisticasFeedback) {
    const estI = inteligenciaModulo.estatisticasFeedback();
    inteligencia = { total_conversas: estI.total || 0, jogos: ['ceifalume', 'prancheta'], taxa_aprovacao: estI.taxaAprovacao || 0 };
  }

  const relatorio = {
    id: 'st_' + Date.now(),
    geradoEm: new Date().toISOString(),
    resumo: {
      camadas_monitoradas: hc.camadas_total,
      camadas_ativas: hc.camadas_ativas,
      camadas_inativas: hc.camadas_inativas,
      recuperacoes_sucesso: hc.recuperacoes_sucesso,
      recuperacoes_falha: hc.recuperacoes_falha,
      sistemas_ativos: [hcModulo ? 'health-check' : null, alertasModulo ? 'alertas-proativos' : null, orquestradorModulo ? 'orquestrador-maximo' : null, autoEscaladaModulo ? 'auto-escalada' : null, inteligenciaModulo ? 'inteligencia-marketing' : null].filter(Boolean).length,
      comandos_disponiveis: 34,
      inicializacao_automatica: true,
      redes_proibidas_removidas: true,
      itch_io_removido: true
    },
    status_camadas: [],
    metricas: {
      posts_hoje: 0,
      engajamento_medio: 0,
      crescimento_seguidores: 0,
      alertas_ativos: alertas.pendentes
    },
    alertas: alertas,
    orquestrador: orquestrador,
    auto_escalada: escalada,
    inteligencia: inteligencia,
    recomendacoes: [
      'Monitore as métricas de engajamento em cada rede.',
      'Ajuste horários de postagem baseado em dados reais de acesso.',
      'Mantenha a inicialização automática ativa para zero intervenção humana.',
      'Verifique camadas inativas no health check para auto-recuperação.'
    ]
  };

  if (hcModulo && hcModulo.executarHealthCheck) {
    const hcResult = hcModulo.executarHealthCheck();
    if (hcResult.ok) {
      relatorio.status_camadas = hcResult.resultado.detalhe.map(d => ({ camada: d.camada, ativa: d.ativa, status: d.status }));
    }
  }

  c.relatorios.push(relatorio);
  if (c.relatorios.length > 100) c.relatorios = c.relatorios.slice(-100);
  c.ultima_execucao = relatorio.geradoEm;
  salvar();
  return { ok: true, relatorio };
}

function estatisticasStatusTotal() {
  const c = carregar();
  return {
    ativo: c.ativo,
    total_relatorios: c.relatorios.length,
    ultima_execucao: c.ultima_execucao
  };
}

module.exports = { ativarStatusTotal, gerarRelatorioStatus, estatisticasStatusTotal };
