// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📑 RELATÓRIO DE CONTEÚDO POR RELATÓRIO EXECUTIVO — conteúdo por relatório executivo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-relatorio-executivo.json');

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

function gerarRelatorioConteudoPorRelatorioExecutivo(periodo, jogo, resumo, pontosChave, recomendacoes) {
  const c = carregar();
  const id = 'rex_' + c.proximoId++;
  const r = { id, periodo: periodo || '', jogo: jogo || 'ambos', resumo: resumo || '', pontosChave: pontosChave || '', recomendacoes: recomendacoes || '', geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorRelatorioExecutivo(jogo = null, periodo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (periodo) l = l.filter(x => x.periodo === periodo);
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarConteudoPorRelatorioExecutivoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorRelatorioExecutivo() {
  const c = carregar();
  const total = c.relatorios.length;
  return { total, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorRelatorioExecutivo, listarRelatoriosConteudoPorRelatorioExecutivo, marcarConteudoPorRelatorioExecutivoEnviado, estatisticasConteudoPorRelatorioExecutivo, carregar, salvar, ARQ };