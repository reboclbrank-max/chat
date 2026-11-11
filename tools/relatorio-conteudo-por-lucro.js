// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💵 RELATÓRIO DE CONTEÚDO POR LUCRO — conteúdo por nível de lucro
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-lucro.json');

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

function gerarRelatorioConteudoPorLucro(nivelLucro, jogo, quantidade, lucroTotal, mediaLucro) {
  const c = carregar();
  const id = 'rlc_' + c.proximoId++;
  const r = { id, nivelLucro: nivelLucro || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, lucroTotal: Number(lucroTotal) || 0, mediaLucro: Number(mediaLucro) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorLucro(jogo = null, nivelLucro = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelLucro) l = l.filter(x => x.nivelLucro === nivelLucro);
  return l.sort((a, b) => b.lucroTotal - a.lucroTotal);
}

function marcarConteudoPorLucroEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorLucro() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalLucro = c.relatorios.reduce((s, r) => s + r.lucroTotal, 0);
  return { total, totalLucro, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorLucro, listarRelatoriosConteudoPorLucro, marcarConteudoPorLucroEnviado, estatisticasConteudoPorLucro, carregar, salvar, ARQ };