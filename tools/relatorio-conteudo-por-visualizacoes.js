// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👁️ RELATÓRIO DE CONTEÚDO POR VISUALIZAÇÕES — conteúdo por nível de visualizações
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-visualizacoes.json');

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

function gerarRelatorioConteudoPorVisualizacoes(nivelVisualizacoes, jogo, quantidade, totalVisualizacoes, mediaVisualizacoes) {
  const c = carregar();
  const id = 'rvz_' + c.proximoId++;
  const r = { id, nivelVisualizacoes: nivelVisualizacoes || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, totalVisualizacoes: Number(totalVisualizacoes) || 0, mediaVisualizacoes: Number(mediaVisualizacoes) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorVisualizacoes(jogo = null, nivelVisualizacoes = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelVisualizacoes) l = l.filter(x => x.nivelVisualizacoes === nivelVisualizacoes);
  return l.sort((a, b) => b.totalVisualizacoes - a.totalVisualizacoes);
}

function marcarConteudoPorVisualizacoesEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorVisualizacoes() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalVisualizacoes = c.relatorios.reduce((s, r) => s + r.totalVisualizacoes, 0);
  return { total, totalVisualizacoes, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorVisualizacoes, listarRelatoriosConteudoPorVisualizacoes, marcarConteudoPorVisualizacoesEnviado, estatisticasConteudoPorVisualizacoes, carregar, salvar, ARQ };