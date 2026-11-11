// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 RELATÓRIO DE ROI POR CANAL — retorno sobre investimento por canal
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-roi-canal.json');

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

function gerarRelatorioROICanal(canal, jogo, periodo, investimento, receita, conversoes) {
  const c = carregar();
  const id = 'rcic_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const rec = Number(receita) || 0;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', periodo: periodo || '', investimento: inv, receita: rec, lucro: rec - inv, roi: inv > 0 ? ((rec - inv) / inv * 100).toFixed(2) : 0, conversoes: Number(conversoes) || 0, custoPorConversao: inv > 0 ? (inv / Math.max(Number(conversoes) || 1, 1)).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosROICanal(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
}

function marcarROICanalEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasROICanal() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestido = c.relatorios.reduce((s, r) => s + r.investimento, 0);
  const totalReceita = c.relatorios.reduce((s, r) => s + r.receita, 0);
  return { total, totalInvestido, totalReceita, lucroTotal: totalReceita - totalInvestido, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioROICanal, listarRelatoriosROICanal, marcarROICanalEnviado, estatisticasROICanal, carregar, salvar, ARQ };