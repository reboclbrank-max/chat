// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 LTV POR COHORTE — valor vitalício por grupo de usuários
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'ltv-cohorte.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { cohortes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarCohorte(mes, jogo, usuarios, receita, periodoMeses) {
  const c = carregar();
  const id = 'coh_' + c.proximoId++;
  const ltv = usuarios > 0 ? receita / usuarios : 0;
  const co = { id, mes, jogo: jogo || 'ambos', usuarios: Number(usuarios), receita: Number(receita), periodoMeses: Number(periodoMeses) || 1, ltv: ltv.toFixed(4), criadoEm: new Date().toISOString() };
  c.cohortes.push(co);
  salvar();
  return { ok: true, cohorte: co };
}

function listarCohortes(jogo = null) {
  const c = carregar();
  if (jogo) return c.cohortes.filter(c => c.jogo === jogo || c.jogo === 'ambos');
  return c.cohortes;
}

function estatisticasLTV() {
  const c = carregar();
  const total = c.cohortes.length;
  const medioLTV = total > 0 ? (c.cohortes.reduce((s, c) => s + parseFloat(c.ltv), 0) / total).toFixed(4) : 0;
  return { total, medioLTV };
}

module.exports = { registrarCohorte, listarCohortes, estatisticasLTV, carregar, salvar, ARQ };