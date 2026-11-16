// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 RELATÓRIO DE CONTEÚDO POR EMAIL — conteúdo por email
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-email.json');

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

function gerarRelatorioConteudoPorEmail(tipo, jogo, quantidade, enviados, abertos, cliques) {
  const c = carregar();
  const id = 'rem_' + c.proximoId++;
  const r = { id, tipo: tipo || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, enviados: Number(enviados) || 0, abertos: Number(abertos) || 0, cliques: Number(cliques) || 0, taxaAbertura: Number(enviados) > 0 ? ((Number(abertos) / Number(enviados)) * 100).toFixed(2) : 0, taxaClique: Number(enviados) > 0 ? ((Number(cliques) / Number(enviados)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorEmail(jogo = null, tipo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.abertos - a.abertos);
}

function marcarConteudoPorEmailEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorEmail() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAbertos = c.relatorios.reduce((s, r) => s + r.abertos, 0);
  return { total, totalAbertos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorEmail, listarRelatoriosConteudoPorEmail, marcarConteudoPorEmailEnviado, estatisticasConteudoPorEmail, carregar, salvar, ARQ };