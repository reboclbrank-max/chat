// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 RELATÓRIO DE CONTEÚDO POR GAMIFICAÇÃO — conteúdo por gamificação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-gamificacao.json');

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

function gerarRelatorioConteudoPorGamificacao(nivel, jogo, quantidade, pontosTotal, mediaPontos) {
  const c = carregar();
  const id = 'rgam_' + c.proximoId++;
  const r = { id, nivel: nivel || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, pontosTotal: Number(pontosTotal) || 0, mediaPontos: Number(mediaPontos) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorGamificacao(jogo = null, nivel = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivel) l = l.filter(x => x.nivel === nivel);
  return l.sort((a, b) => b.pontosTotal - a.pontosTotal);
}

function marcarConteudoPorGamificacaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorGamificacao() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalPontos = c.relatorios.reduce((s, r) => s + r.pontosTotal, 0);
  return { total, totalPontos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorGamificacao, listarRelatoriosConteudoPorGamificacao, marcarConteudoPorGamificacaoEnviado, estatisticasConteudoPorGamificacao, carregar, salvar, ARQ };