// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIO DE CONTEÚDO POR ENGAJAMENTO — conteúdo por nível de engajamento
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-engajamento.json');

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

function gerarRelatorioConteudoPorEngajamento(nivelEngajamento, jogo, quantidade, mediaEngajamento, totalEngajamento) {
  const c = carregar();
  const id = 'ren_' + c.proximoId++;
  const r = { id, nivelEngajamento: nivelEngajamento || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, mediaEngajamento: Number(mediaEngajamento) || 0, totalEngajamento: Number(totalEngajamento) || 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorEngajamento(jogo = null, nivelEngajamento = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (nivelEngajamento) l = l.filter(x => x.nivelEngajamento === nivelEngajamento);
  return l.sort((a, b) => b.totalEngajamento - a.totalEngajamento);
}

function marcarConteudoPorEngajamentoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorEngajamento() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalEngajamento = c.relatorios.reduce((s, r) => s + r.totalEngajamento, 0);
  return { total, totalEngajamento, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorEngajamento, listarRelatoriosConteudoPorEngajamento, marcarConteudoPorEngajamentoEnviado, estatisticasConteudoPorEngajamento, carregar, salvar, ARQ };