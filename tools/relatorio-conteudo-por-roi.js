// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 RELATÓRIO DE CONTEÚDO POR ROI — conteúdo por nível de ROI
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-roi.json');

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

function gerarRelatorioConteudoPorROI(nivelROI, jogo, quantidade, roiMedio, receitaTotal, custoTotal) {
  const c = carregar();
  const id = 'rroi_' + c.proximoId++;
  const r = { id, nivelROI: nivelROI || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, roiMedio: Number(roiMedio) || 0, receitaTotal: Number(receitaTotal) || 0, custoTotal: Number(custoTotal) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorROI(jogo = null, nivelROI = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelROI) l = l.filter(x => x.nivelROI === nivelROI);
  return l.sort((a, b) => b.roiMedio - a.roiMedio);
}

function marcarConteudoPorROIEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorROI() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receitaTotal, 0);
  return { total, totalReceita, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorROI, listarRelatoriosConteudoPorROI, marcarConteudoPorROIEnviado, estatisticasConteudoPorROI, carregar, salvar, ARQ };