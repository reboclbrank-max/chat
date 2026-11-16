// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 RELATÓRIO DE CONTEÚDO POR NOTIFICAÇÃO — conteúdo por notificação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-notificacao.json');

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

function gerarRelatorioConteudoPorNotificacao(tipo, jogo, quantidade, lidas, naoLidas) {
  const c = carregar();
  const id = 'rnt_' + c.proximoId++;
  const r = { id, tipo: tipo || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, lidas: Number(lidas) || 0, naoLidas: Number(naoLidas) || 0, taxaLeitura: Number(quantidade) > 0 ? ((Number(lidas) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorNotificacao(jogo = null, tipo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorNotificacaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorNotificacao() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalLidas = c.relatorios.reduce((s, r) => s + r.lidas, 0);
  return { total, totalLidas, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorNotificacao, listarRelatoriosConteudoPorNotificacao, marcarConteudoPorNotificacaoEnviado, estatisticasConteudoPorNotificacao, carregar, salvar, ARQ };