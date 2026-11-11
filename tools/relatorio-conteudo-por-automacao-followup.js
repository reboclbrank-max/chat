// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RELATÓRIO DE CONTEÚDO POR AUTOMAÇÃO FOLLOW-UP — conteúdo por automação de follow-up
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-automacao-followup.json');

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

function gerarRelatorioConteudoPorAutomacaoFollowup(canal, jogo, enviados, respondidos, convertidos) {
  const c = carregar();
  const id = 'rafu_' + c.proximoId++;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', enviados: Number(enviados) || 0, respondidos: Number(respondidos) || 0, convertidos: Number(convertidos) || 0, taxaResposta: Number(enviados) > 0 ? ((Number(respondidos) / Number(enviados)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorAutomacaoFollowup(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => b.respondidos - a.respondidos);
}

function marcarConteudoPorAutomacaoFollowupEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorAutomacaoFollowup() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalEnviados = c.relatorios.reduce((s, r) => s + r.enviados, 0);
  return { total, totalEnviados, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorAutomacaoFollowup, listarRelatoriosConteudoPorAutomacaoFollowup, marcarConteudoPorAutomacaoFollowupEnviado, estatisticasConteudoPorAutomacaoFollowup, carregar, salvar, ARQ };