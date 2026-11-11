// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💸 RELATÓRIO DE CUSTO DE AQUISIÇÃO — CAC por canal e período
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-cac.json');

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

function gerarRelatorioCAC(canal, jogo, periodo, investimento, novosClientes) {
  const c = carregar();
  const id = 'cac_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const nc = Number(novosClientes) || 1;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', periodo: periodo || '', investimento: inv, novosClientes: nc, cac: inv / nc, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosCAC(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => a.cac - b.cac);
}

function marcarCACEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasCAC() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestido = c.relatorios.reduce((s, r) => s + r.investimento, 0);
  const totalClientes = c.relatorios.reduce((s, r) => s + r.novosClientes, 0);
  return { total, totalInvestido, totalClientes, cacMedio: totalClientes > 0 ? (totalInvestido / totalClientes).toFixed(2) : 0, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioCAC, listarRelatoriosCAC, marcarCACEnviado, estatisticasCAC, carregar, salvar, ARQ };