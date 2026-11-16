// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🖱️ RELATÓRIO DE CONTEÚDO POR CLIQUES — conteúdo por nível de cliques
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-cliques.json');

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

function gerarRelatorioConteudoPorCliques(nivelCliques, jogo, quantidade, totalCliques, mediaCliques) {
  const c = carregar();
  const id = 'rcl_' + c.proximoId++;
  const r = { id, nivelCliques: nivelCliques || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, totalCliques: Number(totalCliques) || 0, mediaCliques: Number(mediaCliques) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorCliques(jogo = null, nivelCliques = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelCliques) l = l.filter(x => x.nivelCliques === nivelCliques);
  return l.sort((a, b) => b.totalCliques - a.totalCliques);
}

function marcarConteudoPorCliquesEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorCliques() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalCliques = c.relatorios.reduce((s, r) => s + r.totalCliques, 0);
  return { total, totalCliques, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorCliques, listarRelatoriosConteudoPorCliques, marcarConteudoPorCliquesEnviado, estatisticasConteudoPorCliques, carregar, salvar, ARQ };