// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 RELATÓRIO DE CONTEÚDO POR ANO — conteúdo por ano
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-ano.json');

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

function gerarRelatorioConteudoPorAno(ano, jogo, quantidade, engajamento, visualizacoes, conversoes) {
  const c = carregar();
  const id = 'rca_' + c.proximoId++;
  const r = { id, ano: Number(ano) || new Date().getFullYear(), jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, engajamento: Number(engajamento) || 0, visualizacoes: Number(visualizacoes) || 0, conversoes: Number(conversoes) || 0, taxaConversao: Number(visualizacoes) > 0 ? ((Number(conversoes) / Number(visualizacoes)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorAno(jogo = null, ano = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ano) l = l.filter(x => x.ano === Number(ano));
  return l.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
}

function marcarConteudoPorAnoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorAno() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalEngajamento = c.relatorios.reduce((s, r) => s + r.engajamento, 0);
  return { total, totalEngajamento, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorAno, listarRelatoriosConteudoPorAno, marcarConteudoPorAnoEnviado, estatisticasConteudoPorAno, carregar, salvar, ARQ };