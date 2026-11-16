// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📱 ANÁLISE DE CONTEÚDO DE FEED — desempenho de posts no feed
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-feed.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { feeds: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarFeed(titulo, rede, jogo, visualizacoes, engajamento, cliques, conversoes) {
  const c = carregar();
  const id = 'fd_' + c.proximoId++;
  const f = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', visualizacoes: Number(visualizacoes) || 0, engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, conversoes: Number(conversoes) || 0, ativo: true, criadoEm: new Date().toISOString() };
  c.feeds.push(f);
  salvar();
  return { ok: true, feed: f };
}

function listarFeeds(jogo = null, rede = null) {
  const c = carregar();
  let l = c.feeds;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.visualizacoes - a.visualizacoes);
}

function estatisticasConteudoFeed() {
  const c = carregar();
  const total = c.feeds.length;
  const totalVisualizacoes = c.feeds.reduce((s, f) => s + f.visualizacoes, 0);
  const totalEngajamento = c.feeds.reduce((s, f) => s + f.engajamento, 0);
  return { total, totalVisualizacoes, totalEngajamento, ativos: c.feeds.filter(x => x.ativo).length };
}

module.exports = { registrarFeed, listarFeeds, estatisticasConteudoFeed, carregar, salvar, ARQ };