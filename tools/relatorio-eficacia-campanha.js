// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE EFICÁCIA DE CAMPANHA — eficácia de cada campanha
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-eficacia.json');

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

function gerarRelatorioEficacia(campanha, jogo, periodo, investimento, alcance, conversoes, receita) {
  const c = carregar();
  const id = 'efc_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const rec = Number(receita) || 0;
  const conv = Number(conversoes) || 1;
  const r = { id, campanha: campanha || '', jogo: jogo || 'ambos', periodo: periodo || '', investimento: inv, alcance: Number(alcance) || 0, conversoes: conv, receita: rec, custoPorConversao: inv > 0 ? (inv / conv).toFixed(2) : 0, roi: inv > 0 ? ((rec - inv) / inv * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosEficacia(jogo = null, campanha = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (campanha) l = l.filter(x => x.campanha === campanha);
  return l.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
}

function marcarEficaciaEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasEficacia() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestido = c.relatorios.reduce((s, r) => s + r.investimento, 0);
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receita, 0);
  return { total, totalInvestido, totalReceita, lucroTotal: totalReceita - totalInvestido, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioEficacia, listarRelatoriosEficacia, marcarEficaciaEnviado, estatisticasEficacia, carregar, salvar, ARQ };