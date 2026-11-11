// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌟 RELATÓRIO DE CONTEÚDO POR GERENCIAMENTO INFLUENCIADORES — conteúdo por gerenciamento de influenciadores
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-gerenciamento-influenciadores.json');

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

function gerarRelatorioConteudoPorGerenciamentoInfluenciadores(nome, jogo, posts, alcance, conversoes) {
  const c = carregar();
  const id = 'rinf_' + c.proximoId++;
  const r = { id, nome: nome || '', jogo: jogo || 'ambos', posts: Number(posts) || 0, alcance: Number(alcance) || 0, conversoes: Number(conversoes) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorGerenciamentoInfluenciadores(jogo = null, nome = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nome) l = l.filter(x => x.nome === nome);
  return l.sort((a, b) => b.alcance - a.alcance);
}

function marcarConteudoPorGerenciamentoInfluenciadoresEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorGerenciamentoInfluenciadores() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAlcance = c.relatorios.reduce((s, r) => s + r.alcance, 0);
  return { total, totalAlcance, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorGerenciamentoInfluenciadores, listarRelatoriosConteudoPorGerenciamentoInfluenciadores, marcarConteudoPorGerenciamentoInfluenciadoresEnviado, estatisticasConteudoPorGerenciamentoInfluenciadores, carregar, salvar, ARQ };