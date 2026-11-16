// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE CONTEÚDO POR DASHBOARD REALTIME — conteúdo por dashboard realtime
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-dashboard-realtime.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { relatorios: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function gerarRelatorioConteudoPorDashboardRealtime(metrica, jogo, valor, unidade, timestamp) {
  const c = carregar();
  const id = 'rdrt_' + c.proximoId++;
  const r = { id, metrica: metrica || '', jogo: jogo || 'ambos', valor: Number(valor) || 0, unidade: unidade || '', timestamp: timestamp || new Date().toISOString(), geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorDashboardRealtime(jogo = null, metrica = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (metrica) l = l.filter(x => x.metrica === metrica);
  return l.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

function marcarConteudoPorDashboardRealtimeEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorDashboardRealtime() {
  const c = carregar();
  const total = c.relatorios.length;
  return { total, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorDashboardRealtime, listarRelatoriosConteudoPorDashboardRealtime, marcarConteudoPorDashboardRealtimeEnviado, estatisticasConteudoPorDashboardRealtime, carregar, salvar, ARQ };