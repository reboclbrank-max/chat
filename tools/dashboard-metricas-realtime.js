// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 DASHBOARD DE MÉTRICAS EM TEMPO REAL — snapshot de métricas atuais
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'dashboard-realtime.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { metricas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarMetricaRealtime(nome, valor, jogo, rede, unidade) {
  const c = carregar();
  const id = 'drt_' + c.proximoId++;
  const m = { id, nome: nome || '', valor: Number(valor) || 0, jogo: jogo || 'ambos', rede: rede || 'todos', unidade: unidade || '', timestamp: new Date().toISOString() };
  c.metricas.push(m);
  salvar();
  return { ok: true, metrica: m };
}

function listarMetricasRealtime(jogo = null, rede = null, limite = 50) {
  const c = carregar();
  let l = c.metricas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, Number(limite));
}

function estatisticasDashboardRealtime() {
  const c = carregar();
  const total = c.metricas.length;
  const ultimas24h = c.metricas.filter(x => Date.now() - new Date(x.timestamp).getTime() < 86400000).length;
  return { total, ultimas24h };
}

module.exports = { registrarMetricaRealtime, listarMetricasRealtime, estatisticasDashboardRealtime, carregar, salvar, ARQ };