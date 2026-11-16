// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 RELATÓRIO DE CONTEÚDO POR CONTEÚDO VIRAL — conteúdo por conteúdo viral
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-conteudo-viral.json');

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

function gerarRelatorioConteudoPorConteudoViral(titulo, jogo, alcance, compartilhamentos, visualizacoes) {
  const c = carregar();
  const id = 'rvir_' + c.proximoId++;
  const r = { id, titulo: titulo || '', jogo: jogo || 'ambos', alcance: Number(alcance) || 0, compartilhamentos: Number(compartilhamentos) || 0, visualizacoes: Number(visualizacoes) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorConteudoViral(jogo = null, titulo = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (titulo) l = l.filter(x => x.titulo === titulo);
  return l.sort((a, b) => b.alcance - a.alcance);
}

function marcarConteudoPorConteudoViralEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorConteudoViral() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalAlcance = c.relatorios.reduce((s, r) => s + r.alcance, 0);
  return { total, totalAlcance, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorConteudoViral, listarRelatoriosConteudoPorConteudoViral, marcarConteudoPorConteudoViralEnviado, estatisticasConteudoPorConteudoViral, carregar, salvar, ARQ };