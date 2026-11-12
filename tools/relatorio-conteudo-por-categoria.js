// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📂 RELATÓRIO DE CONTEÚDO POR CATEGORIA — desempenho por categoria
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-categoria.json');

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

function gerarRelatorioConteudoPorCategoria(categoria, jogo, quantidade, engajamento, visualizacoes, conversoes) {
  const c = carregar();
  const id = 'cpc_' + c.proximoId++;
  const r = { id, categoria: categoria || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, engajamento: Number(engajamento) || 0, visualizacoes: Number(visualizacoes) || 0, conversoes: Number(conversoes) || 0, mediaEngajamento: Number(quantidade) > 0 ? (Number(engajamento) / Number(quantidade)).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCategoria(jogo = null, categoria = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (categoria) l = l.filter(x => x.categoria === categoria);
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function marcarConteudoPorCategoriaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCategoria() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalEngajamento = c.relatorios.reduce((s, r) => s + r.engajamento, 0);
  return { total, totalEngajamento, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCategoria, listarRelatoriosConteudoPorCategoria, marcarConteudoPorCategoriaEnviado, estatisticasConteudoPorCategoria, carregar, salvar, ARQ };