// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 RELATÓRIO DE CONTEÚDO POR MODERAÇÃO — conteúdo por moderação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-moderacao.json');

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

function gerarRelatorioConteudoPorModeracao(acao, jogo, quantidade, aprovados, rejeitados) {
  const c = carregar();
  const id = 'rmod_' + c.proximoId++;
  const r = { id, acao: acao || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, aprovados: Number(aprovados) || 0, rejeitados: Number(rejeitados) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorModeracao(jogo = null, acao = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (acao) l = l.filter(x => x.acao === acao);
  return l.sort((a, b) => b.quantidade - a.quantidade);
}

function marcarConteudoPorModeracaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorModeracao() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAprovados = c.relatorios.reduce((s, r) => s + r.aprovados, 0);
  return { total, totalAprovados, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorModeracao, listarRelatoriosConteudoPorModeracao, marcarConteudoPorModeracaoEnviado, estatisticasConteudoPorModeracao, carregar, salvar, ARQ };