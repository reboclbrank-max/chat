// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏷️ TAGS E CATEGORIZAÇÃO — marketing Prancheta + Ceifalume
// Tags para posts, campanhas e conteúdos com rastreamento de desempenho.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'tags.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { tags: [], postagens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarTag(nome, descricao, cor) {
  const c = carregar();
  const id = 'tag_' + c.proximoId++;
  const tag = { id, nome, descricao: descricao || '', cor: cor || '#00d4aa', criadoEm: new Date().toISOString(), usos: 0 };
  c.tags.push(tag);
  salvar();
  return { ok: true, tag };
}

function associarTag(postId, tagId, rede, jogo) {
  const c = carregar();
  const id = 'post_tag_' + c.proximoId++;
  const assoc = { id, postId, tagId, rede: rede || 'todos', jogo: jogo || 'ambos', criadoEm: new Date().toISOString(), engajamento: null };
  c.postagens.push(assoc);
  const tag = c.tags.find(t => t.id === tagId);
  if (tag) tag.usados = (tag.usados || 0) + 1;
  salvar();
  return { ok: true, associacao: assoc };
}

function listarTags() {
  const c = carregar();
  return c.tags.sort((a, b) => (b.usados || 0) - (a.usados || 0));
}

function atualizarEngajamentoTag(postId, engajamento) {
  const c = carregar();
  const assoc = c.postagens.find(p => p.postId === postId);
  if (!assoc) return { ok: false, erro: 'Post não encontrado' };
  assoc.engajamento = engajamento;
  salvar();
  return { ok: true, associacao: assoc };
}

function estatisticasTags() {
  const c = carregar();
  return { totalTags: c.tags.length, totalPostagens: c.postagens.length, maisUsada: c.tags[0] || null };
}

module.exports = { criarTag, associarTag, listarTags, atualizarEngajamentoTag, estatisticasTags, carregar, salvar, ARQ };