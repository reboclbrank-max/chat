// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 RELATÓRIO DE CONTEÚDO POR MÉTRICAS RIÇAO — conteúdo por métricas RIÇAO
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-metricas-ricao.json');

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

function gerarRelatorioConteudoPorMetricasRicao(metrica, jogo, valor, meta, atingido) {
  const c = carregar();
  const id = 'rric_' + c.proximoId++;
  const r = { id, metrica: metrica || '', jogo: jogo || 'ambos', valor: Number(valor) || 0, meta: Number(meta) || 0, atingido: atingido === true, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorMetricasRicao(jogo = null, metrica = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (metrica) l = l.filter(x => x.metrica === metrica);
  return l.sort((a, b) => b.valor - a.valor);
}

function marcarConteudoPorMetricasRicaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorMetricasRicao() {
  const c = carregar();
  const total = c.relatorios.length;
  const atingidos = c.relatorios.filter(x => x.atingido).length;
  return { total, atingidos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorMetricasRicao, listarRelatoriosConteudoPorMetricasRicao, marcarConteudoPorMetricasRicaoEnviado, estatisticasConteudoPorMetricasRicao, carregar, salvar, ARQ };