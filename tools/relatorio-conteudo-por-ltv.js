// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💎 RELATÓRIO DE CONTEÚDO POR LTV — conteúdo por nível de LTV
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-ltv.json');

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

function gerarRelatorioConteudoPorLTV(nivelLTV, jogo, quantidade, ltvMedio, totalClientes, receitaTotal) {
  const c = carregar();
  const id = 'rltv_' + c.proximoId++;
  const r = { id, nivelLTV: nivelLTV || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, ltvMedio: Number(ltvMedio) || 0, totalClientes: Number(totalClientes) || 0, receitaTotal: Number(receitaTotal) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorLTV(jogo = null, nivelLTV = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelLTV) l = l.filter(x => x.nivelLTV === nivelLTV);
  return l.sort((a, b) => b.ltvMedio - a.ltvMedio);
}

function marcarConteudoPorLTVEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorLTV() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receitaTotal, 0);
  return { total, totalReceita, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorLTV, listarRelatoriosConteudoPorLTV, marcarConteudoPorLTVEnviado, estatisticasConteudoPorLTV, carregar, salvar, ARQ };