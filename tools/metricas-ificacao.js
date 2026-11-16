// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 MÉTRICAS DE IFICACAO — métricas de conversão e funil
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'metricas-ificacao.json');

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

function registraMetrica(jogo, rede, impressoes, cliques, downloads, instalacoes, periodo) {
  const c = carregar();
  const id = 'met_' + c.proximoId++;
  const m = { id, jogo: jogo || 'ambos', rede: rede || 'todos', impressoes: Number(impressoes) || 0, cliques: Number(cliques) || 0, downloads: Number(downloads) || 0, instalacoes: Number(instalacoes) || 0, periodo: periodo || '', ctr: Number(impressoes) > 0 ? ((Number(cliques) / Number(impressoes)) * 100).toFixed(2) : 0, taxaInstalacao: Number(downloads) > 0 ? ((Number(instalacoes) / Number(downloads)) * 100).toFixed(2) : 0, criadoEm: new Date().toISOString() };
  c.metricas.push(m);
  salvar();
  return { ok: true, metrica: m };
}

function listarMetricasIificacao(jogo = null, rede = null) {
  const c = carregar();
  let l = c.metricas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasIificacao() {
  const c = carregar();
  const total = c.metricas.length;
  const totalImpressoes = c.metricas.reduce((s, m) => s + m.impressoes, 0);
  const totalCliques = c.metricas.reduce((s, m) => s + m.cliques, 0);
  const totalInstalacoes = c.metricas.reduce((s, m) => s + m.instalacoes, 0);
  return { total, totalImpressoes, totalCliques, totalInstalacoes, mediaCTR: total > 0 ? (c.metricas.reduce((s, m) => s + parseFloat(m.ctr), 0) / total).toFixed(2) : 0 };
}

module.exports = { registraMetrica, listarMetricasIificacao, estatisticasIificacao, carregar, salvar, ARQ };