// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 DASHBOARD LIMITE MARKETING — dashboard unificado em tempo real de todas as
// camadas de inteligência. marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'dashboard-limite-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, widgets: [], alertas: [], ultima_atualizacao: null, proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarDashboardLimite() {
  const c = carregar();
  const id = 'dlm_' + c.proximoId++;
  c.ativo = true;
  c.ultima_atualizacao = new Date().toISOString();
  const w = { id, tipo: 'resumo', criadoEm: new Date().toISOString() };
  c.widgets.push(w);
  salvar();
  return { ok: true, dashboard: c, widget: w };
}

function desativarDashboardLimite() {
  const c = carregar(); c.ativo = false; salvar(); return { ok: true };
}

function adicionarWidgetDashboard(tipo, jogo, dados) {
  const c = carregar();
  const id = 'dw_' + c.proximoId++;
  const w = { id, tipo, jogo: jogo || 'ambos', dados: dados || {}, criadoEm: new Date().toISOString() };
  c.widgets.push(w);
  c.ultima_atualizacao = new Date().toISOString();
  salvar();
  return { ok: true, widget: w };
}

function adicionarAlertaDashboard(mensagem, severidade, jogo) {
  const c = carregar();
  const id = 'da_' + c.proximoId++;
  const a = { id, mensagem, severidade: severidade || 'info', jogo: jogo || 'ambos', criadoEm: new Date().toISOString(), lido: false };
  c.alertas.push(a);
  if (c.alertas.length > 100) c.alertas = c.alertas.slice(-100);
  salvar();
  return { ok: true, alerta: a };
}

function listarAlertasDashboard(jogo = null, naoLidos = false) {
  const c = carregar();
  let l = c.alertas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (naoLidos) l = l.filter(x => !x.lido);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasDashboardLimite() {
  const c = carregar();
  return { ativo: c.ativo, total_widgets: c.widgets.length, total_alertas: c.alertas.length, alertas_nao_lidos: c.alertas.filter(x => !x.lido).length, ultima_atualizacao: c.ultima_atualizacao };
}

module.exports = { ativarDashboardLimite, desativarDashboardLimite, adicionarWidgetDashboard, adicionarAlertaDashboard, listarAlertasDashboard, estatisticasDashboardLimite, carregar, salvar, ARQ };