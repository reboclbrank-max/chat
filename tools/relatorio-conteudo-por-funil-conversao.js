// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📉 RELATÓRIO DE CONTEÚDO POR FUNIL DE CONVERSÃO — conteúdo por funil de conversão
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-conteudo-por-funil-conversao.json');

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

function gerarRelatorioConteudoPorFunilConversao(etapa, jogo, impressoes, cliques, downloads, instalacoes, primeiroJogo, retencao1, retencao7) {
  const c = carregar();
  const id = 'rfc_' + c.proximoId++;
  const r = { id, etapa: etapa || '', jogo: jogo || 'ambos', impressoes: Number(impressoes) || 0, cliques: Number(cliques) || 0, downloads: Number(downloads) || 0, instalacoes: Number(instalacoes) || 0, primeiroJogo: Number(primeiroJogo) || 0, retencao1: Number(retencao1) || 0, retencao7: Number(retencao7) || 0, ctr: Number(impressoes) > 0 ? ((Number(cliques) / Number(impressoes)) * 100).toFixed(2) : 0, taxaInstalacao: Number(downloads) > 0 ? ((Number(instalacoes) / Number(downloads)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosConteudoPorFunilConversao(jogo = null, etapa = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (etapa) l = l.filter(x => x.etapa === etapa);
  return l.sort((a, b) => b.instalacoes - a.instalacoes);
}

function marcarConteudoPorFunilConversaoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasConteudoPorFunilConversao() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalInstalacoes = c.relatorios.reduce((s, r) => s + r.instalacoes, 0);
  return { total, totalInstalacoes, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioConteudoPorFunilConversao, listarRelatoriosConteudoPorFunilConversao, marcarConteudoPorFunilConversaoEnviado, estatisticasConteudoPorFunilConversao, carregar, salvar, ARQ };