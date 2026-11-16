// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 RELATÓRIO DE CONTEÚDO POR OBJETIVO — desempenho por objetivo de campanha
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-objetivo.json');

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

function gerarRelatorioConteudoPorObjetivo(objetivo, jogo, quantidade, conversoes, receita, custo) {
  const c = carregar();
  const id = 'obj_' + c.proximoId++;
  const cst = Number(custo) || 0;
  const rec = Number(receita) || 0;
  const r = { id, objetivo: objetivo || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, conversoes: Number(conversoes) || 0, receita: rec, custo: cst, roi: cst > 0 ? ((rec - cst) / cst * 100).toFixed(2) : 0, custoPorConversao: cst > 0 ? (cst / Math.max(Number(conversoes) || 1, 1)).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorObjetivo(jogo = null, objetivo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (objetivo) l = l.filter(x => x.objetivo === objetivo);
  return l.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
}

function marcarConteudoPorObjetivoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorObjetivo() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalCusto = c.relatorios.reduce((s, r) => s + r.custo, 0);
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receita, 0);
  return { total, totalCusto, totalReceita, lucroTotal: totalReceita - totalCusto, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorObjetivo, listarRelatoriosConteudoPorObjetivo, marcarConteudoPorObjetivoEnviado, estatisticasConteudoPorObjetivo, carregar, salvar, ARQ };