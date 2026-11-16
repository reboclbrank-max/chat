// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 ANÁLISE DE DESEMPENHO DE CONTEÚDO — métricas de conteúdo individual
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'desempenho-conteudo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { conteudos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarDesempenhoConteudo(titulo, rede, jogo, tipo, impressoes, alcance, engajamento, cliques, conversoes) {
  const c = carregar();
  const id = 'dc_' + c.proximoId++;
  const d = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', tipo: tipo || 'post', impressoes: Number(impressoes) || 0, alcance: Number(alcance) || 0, engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, taxaEngajamento: Number(impressoes) > 0 ? ((Number(engajamento) / Number(impressoes)) * 100).toFixed(2) : 0, criadoEm: new Date().toISOString() };
  c.conteudos.push(d);
  salvar();
  return { ok: true, desempenho: d };
}

function listarDesempenhoConteudo(jogo = null, rede = null, tipo = null) {
  const c = carregar();
  let l = c.conteudos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (tipo) l = l.filter(x => x.tipo === tipo);
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasDesempenhoConteudo() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalEngajamento = c.conteudos.reduce((s, c) => s + c.engajamento, 0);
  const totalCliques = c.conteudos.reduce((s, c) => s + c.cliques, 0);
  return { total, totalEngajamento, totalCliques, mediaTaxaEngajamento: total > 0 ? (c.conteudos.reduce((s, c) => s + parseFloat(c.taxaEngajamento), 0) / total).toFixed(2) : 0 };
}

module.exports = { registrarDesempenhoConteudo, listarDesempenhoConteudo, estatisticasDesempenhoConteudo, carregar, salvar, ARQ };