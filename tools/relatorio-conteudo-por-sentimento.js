// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💭 RELATÓRIO DE CONTEÚDO POR SENTIMENTO — conteúdo por sentimento de comentários
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-sentimento.json');

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

function gerarRelatorioConteudoPorSentimento(sentimento, jogo, quantidade, positivos, negativos, neutros) {
  const c = carregar();
  const id = 'rsn_' + c.proximoId++;
  const r = { id, sentimento: sentimento || '', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, positivos: Number(positivos) || 0, negativos: Number(negativos) || 0, neutros: Number(neutros) || 0, taxaPositiva: Number(quantidade) > 0 ? ((Number(positivos) / Number(quantidade)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorSentimento(jogo = null, sentimento = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (sentimento) l = l.filter(x => x.sentimento === sentimento);
  return l.sort((a, b) => b.positivos - a.positivos);
}

function marcarConteudoPorSentimentoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorSentimento() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalPositivos = c.relatorios.reduce((s, r) => s + r.positivos, 0);
  return { total, totalPositivos, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorSentimento, listarRelatoriosConteudoPorSentimento, marcarConteudoPorSentimentoEnviado, estatisticasConteudoPorSentimento, carregar, salvar, ARQ };