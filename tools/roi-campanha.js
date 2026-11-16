// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 ROI DE CAMPANHA — retorno sobre investimento por campanha
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'roi-campanha.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { campanhas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarCampanha(nome, jogo, investimento, receita, impressoes, cliques, conversoes, rede) {
  const c = carregar();
  const id = 'roi_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const rec = Number(receita) || 0;
  const camp = { id, nome: nome || '', jogo: jogo || 'ambos', investimento: inv, receita: rec, lucro: rec - inv, roi: inv > 0 ? ((rec - inv) / inv * 100).toFixed(2) : 0, impressoes: Number(impressoes) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, rede: rede || 'todos', custoPorClique: inv > 0 ? (inv / Math.max(Number(cliques) || 1, 1)).toFixed(2) : 0, criadoEm: new Date().toISOString() };
  c.campanhas.push(camp);
  salvar();
  return { ok: true, campanha: camp };
}

function listarCampanhas(jogo = null, rede = null) {
  const c = carregar();
  let l = c.campanhas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => parseFloat(b.roi) - parseFloat(a.roi));
}

function estatisticasROI() {
  const c = carregar();
  const total = c.campanhas.length;
  const totalInvestido = c.campanhas.reduce((s, c) => s + c.investimento, 0);
  const totalReceita = c.campanhas.reduce((s, c) => s + c.receita, 0);
  const medioROI = total > 0 ? (c.campanhas.reduce((s, c) => s + parseFloat(c.roi), 0) / total).toFixed(2) : 0;
  return { total, totalInvestido, totalReceita, lucroTotal: totalReceita - totalInvestido, roiMedio: medioROI };
}

module.exports = { registrarCampanha, listarCampanhas, estatisticasROI, carregar, salvar, ARQ };