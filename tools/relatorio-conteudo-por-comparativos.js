// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE CONTEÚDO POR RELATÓRIOS COMPARATIVOS — conteúdo por comparativos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-comparativos.json');

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

function gerarRelatorioConteudoPorComparativos(metrica, jogo, valorCeifalume, valorPrancheta, vencedor, contexto) {
  const c = carregar();
  const id = 'rcmp_' + c.proximoId++;
  const r = { id, metrica: metrica || '', jogo: jogo || 'ambos', valorCeifalume: Number(valorCeifalume) || 0, valorPrancheta: Number(valorPrancheta) || 0, vencedor: vencedor || 'empate', diferenca: Math.abs(Number(valorCeifalume) - Number(valorPrancheta)), contexto: contexto || '', geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorComparativos(jogo = null, vencedor = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (vencedor) l = l.filter(x => x.vencedor === vencedor);
  return l.sort((a, b) => b.diferenca - a.diferenca);
}

function marcarConteudoPorComparativosEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorComparativos() {
  const c = carregar();
  const total = c.relatorios.length;
  const ceifalume = c.relatorios.filter(x => x.vencedor === 'ceifalume').length;
  const prancheta = c.relatorios.filter(x => x.vencedor === 'prancheta').length;
  return { total, ceifalume, prancheta, empates: total - ceifalume - prancheta, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorComparativos, listarRelatoriosConteudoPorComparativos, marcarConteudoPorComparativosEnviado, estatisticasConteudoPorComparativos, carregar, salvar, ARQ };