// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤝 RELATÓRIO DE CONTEÚDO POR GESTÃO COMUNIDADE — conteúdo por gestão de comunidade
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-gestao-comunidade.json');

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

function gerarRelatorioConteudoPorGestaoComunidade(plataforma, jogo, membros, novos, ativos) {
  const c = carregar();
  const id = 'rgcm_' + c.proximoId++;
  const r = { id, plataforma: plataforma || '', jogo: jogo || 'ambos', membros: Number(membros) || 0, novos: Number(novos) || 0, ativos: Number(ativos) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorGestaoComunidade(jogo = null, plataforma = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (plataforma) l = l.filter(x => x.plataforma === plataforma);
  return l.sort((a, b) => b.membros - a.membros);
}

function marcarConteudoPorGestaoComunidadeEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorGestaoComunidade() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalMembros = c.relatorios.reduce((s, r) => s + r.membros, 0);
  return { total, totalMembros, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorGestaoComunidade, listarRelatoriosConteudoPorGestaoComunidade, marcarConteudoPorGestaoComunidadeEnviado, estatisticasConteudoPorGestaoComunidade, carregar, salvar, ARQ };