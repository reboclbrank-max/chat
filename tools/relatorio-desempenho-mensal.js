// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 RELATÓRIO DE DESEMPENHO MENSAL — desempenho consolidado por mês
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-desempenho-mensal.json');

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

function gerarRelatorioDesempenho(mes, ano, jogo, impressoes, cliques, conversoes, investimento, receita) {
  const c = carregar();
  const id = 'rdm_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const rec = Number(receita) || 0;
  const r = { id, mes: Number(mes) || 1, ano: Number(ano) || new Date().getFullYear(), jogo: jogo || 'ambos', impressoes: Number(impressoes) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, investimento: inv, receita: rec, lucro: rec - inv, ctr: Number(impressoes) > 0 ? ((Number(cliques) / Number(impressoes)) * 100).toFixed(2) : 0, cpa: inv > 0 ? (inv / Math.max(Number(conversoes) || 1, 1)).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosDesempenho(jogo = null, ano = null, mes = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ano) l = l.filter(x => x.ano === Number(ano));
  if (mes) l = l.filter(x => x.mes === Number(mes));
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarDesempenhoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasDesempenhoMensal() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestido = c.relatorios.reduce((s, r) => s + r.investimento, 0);
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receita, 0);
  return { total, totalInvestido, totalReceita, lucroTotal: totalReceita - totalInvestido, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioDesempenho, listarRelatoriosDesempenho, marcarDesempenhoEnviado, estatisticasDesempenhoMensal, carregar, salvar, ARQ };