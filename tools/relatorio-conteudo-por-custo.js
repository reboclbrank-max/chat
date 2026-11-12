// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 RELATÓRIO DE CONTEÚDO POR CUSTO — conteúdo por nível de custo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-custo.json');

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

function gerarRelatorioConteudoPorCusto(nivelCusto, jogo, quantidade, custoTotal, mediaCusto) {
  const c = carregar();
  const id = 'rcs_' + c.proximoId++;
  const r = { id, nivelCusto: nivelCusto || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, custoTotal: Number(custoTotal) || 0, mediaCusto: Number(mediaCusto) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCusto(jogo = null, nivelCusto = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelCusto) l = l.filter(x => x.nivelCusto === nivelCusto);
  return l.sort((a, b) => b.custoTotal - a.custoTotal);
}

function marcarConteudoPorCustoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCusto() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalCusto = c.relatorios.reduce((s, r) => s + r.custoTotal, 0);
  return { total, totalCusto, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCusto, listarRelatoriosConteudoPorCusto, marcarConteudoPorCustoEnviado, estatisticasConteudoPorCusto, carregar, salvar, ARQ };