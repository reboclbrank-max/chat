// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💸 RELATÓRIO DE CUSTO POR CLIQUE — CPC por campanha e canal
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-cpc.json');

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

function gerarRelatorioCPC(canal, jogo, periodo, investimento, cliques) {
  const c = carregar();
  const id = 'cpc_' + c.proximoId++;
  const inv = Number(investimento) || 0;
  const qtdCliques = Number(cliques) || 1;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', periodo: periodo || '', investimento: inv, cliques: qtdCliques, cpc: inv / qtdCliques, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosCPC(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => a.cpc - b.cpc);
}

function marcarCPCEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasCPC() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInvestido = c.relatorios.reduce((s, r) => s + r.investimento, 0);
  const totalCliques = c.relatorios.reduce((s, r) => s + r.cliques, 0);
  return { total, totalInvestido, totalCliques, cpcMedio: totalCliques > 0 ? (totalInvestido / totalCliques).toFixed(2) : 0, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioCPC, listarRelatoriosCPC, marcarCPCEnviado, estatisticasCPC, carregar, salvar, ARQ };