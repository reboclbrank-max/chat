// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📝 ANÁLISE DE CONTEÚDO DE POST — desempenho de posts comuns
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'conteudo-post.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { posts: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarPost(titulo, rede, jogo, curtidas, comentarios, compartilhamentos, alcancado, cliques) {
  const c = carregar();
  const id = 'pst_' + c.proximoId++;
  const eng = Number(curtidas) + Number(comentarios) + Number(compartilhamentos);
  const p = { id, titulo: titulo || '', rede: rede || 'todos', jogo: jogo || 'ambos', curtidas: Number(curtidas) || 0, comentarios: Number(comentarios) || 0, compartilhamentos: Number(compartilhamentos) || 0, alcancado: Number(alcancado) || 0, cliques: Number(cliques) || 0, engajamento: eng, taxaEngajamento: Number(alcancado) > 0 ? ((eng / Number(alcancado)) * 100).toFixed(2) : 0, ativo: true, criadoEm: new Date().toISOString() };
  c.posts.push(p);
  salvar();
  return { ok: true, post: p };
}

function listarPosts(jogo = null, rede = null) {
  const c = carregar();
  let l = c.posts;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasConteudoPost() {
  const c = carregar();
  const total = c.posts.length;
  const totalEngajamento = c.posts.reduce((s, p) => s + p.engajamento, 0);
  const totalCliques = c.posts.reduce((s, p) => s + p.cliques, 0);
  return { total, totalEngajamento, totalCliques, ativos: c.posts.filter(x => x.ativo).length };
}

module.exports = { registrarPost, listarPosts, estatisticasConteudoPost, carregar, salvar, ARQ };