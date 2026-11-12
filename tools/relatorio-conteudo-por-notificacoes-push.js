// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📲 RELATÓRIO DE CONTEÚDO POR NOTIFICAÇÕES PUSH — conteúdo por notificações push
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-notificacoes-push.json');

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

function gerarRelatorioConteudoPorNotificacoesPush(canal, jogo, enviadas, entregues, cliques) {
  const c = carregar();
  const id = 'rnf_' + c.proximoId++;
  const r = { id, canal: canal || '', jogo: jogo || 'ambos', enviadas: Number(enviadas) || 0, entregues: Number(entregues) || 0, cliques: Number(cliques) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorNotificacoesPush(jogo = null, canal = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (canal) l = l.filter(x => x.canal === canal);
  return l.sort((a, b) => b.enviadas - a.enviadas);
}

function marcarConteudoPorNotificacoesPushEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorNotificacoesPush() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalEnviadas = c.relatorios.reduce((s, r) => s + r.enviadas, 0);
  return { total, totalEnviadas, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorNotificacoesPush, listarRelatoriosConteudoPorNotificacoesPush, marcarConteudoPorNotificacoesPushEnviado, estatisticasConteudoPorNotificacoesPush, carregar, salvar, ARQ };