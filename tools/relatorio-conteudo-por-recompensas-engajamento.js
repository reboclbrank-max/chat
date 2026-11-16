// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏆 RELATÓRIO DE CONTEÚDO POR RECOMPENSAS ENGAJAMENTO — conteúdo por recompensas de engajamento
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-recompensas-engajamento.json');

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

function gerarRelatorioConteudoPorRecompensasEngajamento(tipo, jogo, quantidade, pontosEntregues, resgates) {
  const c = carregar();
  const id = 'rrec_' + c.proximoId++;
  const r = { id, tipo: tipo || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, pontosEntregues: Number(pontosEntregues) || 0, resgates: Number(resgates) || 0, taxaResgate: Number(quantidade) > 0 ? ((Number(resgates) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorRecompensasEngajamento(jogo = null, tipo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorRecompensasEngajamentoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorRecompensasEngajamento() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalPontos = c.relatorios.reduce((s, r) => s + r.pontosEntregues, 0);
  return { total, totalPontosEntregues: totalPontos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorRecompensasEngajamento, listarRelatoriosConteudoPorRecompensasEngajamento, marcarConteudoPorRecompensasEngajamentoEnviado, estatisticasConteudoPorRecompensasEngajamento, carregar, salvar, ARQ };