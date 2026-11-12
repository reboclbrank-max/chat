// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 RELATÓRIO DE DESEMPENHO DE CONTEÚDO — desempenho detalhado por conteúdo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorio-desempenho-conteudo.json');

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

function gerarRelatorioDesempenhoConteudo(conteudo, jogo, rede, periodo, visualizacoes, engajamento, cliques, conversoes) {
  const c = carregar();
  const id = 'rdc_' + c.proximoId++;
  const vis = Number(visualizacoes) || 1;
  const r = { id, conteudo: conteudo || '', jogo: jogo || 'ambos', rede: rede || 'todos', periodo: periodo || '', visualizacoes: vis, engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, taxaEngajamento: ((Number(engajamento) / vis) * 100).toFixed(2), taxaConversao: Number(cliques) > 0 ? ((Number(conversoes) / Number(cliques)) * 100).toFixed(2) : 0, geradoEm: new Date().toISOString(), enviado: false };
  c.relatorios.push(r);
  salvar();
  return { ok: true, relatorio: r };
}

function listarRelatoriosDesempenhoConteudo(jogo = null, rede = null) {
  const c = carregar();
  let l = c.relatorios;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function marcarDesempenhoConteudoEnviado(id) {
  const c = carregar();
  const r = c.relatorios.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Relatório não encontrado' };
  r.enviado = true;
  salvar();
  return { ok: true, relatorio: r };
}

function estatisticasDesempenhoConteudo() {
  const c = carregar();
  const total = c.relatorios.length;
  const totalVisualizacoes = c.relatorios.reduce((s, r) => s + r.visualizacoes, 0);
  const totalConversoes = c.relatorios.reduce((s, r) => s + r.conversoes, 0);
  return { total, totalVisualizacoes, totalConversoes, enviados: c.relatorios.filter(x => x.enviado).length };
}

module.exports = { gerarRelatorioDesempenhoConteudo, listarRelatoriosDesempenhoConteudo, marcarDesempenhoConteudoEnviado, estatisticasDesempenhoConteudo, carregar, salvar, ARQ };