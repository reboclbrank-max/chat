// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📶 RELATÓRIO DE CONTEÚDO POR ALCANCE — conteúdo por nível de alcance
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-alcance.json');

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

function gerarRelatorioConteudoPorAlcance(nivelAlcance, jogo, quantidade, alcanceTotal, mediaAlcance) {
  const c = carregar();
  const id = 'ral_' + c.proximoId++;
  const r = { id, nivelAlcance: nivelAlcance || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, alcanceTotal: Number(alcanceTotal) || 0, mediaAlcance: Number(mediaAlcance) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorAlcance(jogo = null, nivelAlcance = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelAlcance) l = l.filter(x => x.nivelAlcance === nivelAlcance);
  return l.sort((a, b) => b.alcanceTotal - a.alcanceTotal);
}

function marcarConteudoPorAlcanceEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorAlcance() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAlcance = c.relatorios.reduce((s, r) => s + r.alcanceTotal, 0);
  return { total, totalAlcance, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorAlcance, listarRelatoriosConteudoPorAlcance, marcarConteudoPorAlcanceEnviado, estatisticasConteudoPorAlcance, carregar, salvar, ARQ };