// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💸 RELATÓRIO DE CONTEÚDO POR CAC — conteúdo por nível de CAC
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-cac.json');

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

function gerarRelatorioConteudoPorCAC(nivelCAC, jogo, quantidade, cacMedio, totalClientes, investimentoTotal) {
  const c = carregar();
  const id = 'rcac_' + c.proximoId++;
  const r = { id, nivelCAC: nivelCAC || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, cacMedio: Number(cacMedio) || 0, totalClientes: Number(totalClientes) || 0, investimentoTotal: Number(investimentoTotal) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCAC(jogo = null, nivelCAC = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelCAC) l = l.filter(x => x.nivelCAC === nivelCAC);
  return l.sort((a, b) => a.cacMedio - b.cacMedio);
}

function marcarConteudoPorCACEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCAC() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestimento = c.relatorios.reduce((s, r) => s + r.investimentoTotal, 0);
  return { total, totalInvestimento, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCAC, listarRelatoriosConteudoPorCAC, marcarConteudoPorCACEnviado, estatisticasConteudoPorCAC, carregar, salvar, ARQ };