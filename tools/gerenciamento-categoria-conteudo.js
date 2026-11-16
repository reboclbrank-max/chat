// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📂 GERENCIAMENTO DE CATEGORIA DE CONTEÚDO — categorização de conteúdos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'categoria-conteudo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { categorias: [], conteudos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarCategoria(nome, jogo, descricao) {
  const c = carregar();
  const id = 'cat_' + c.proximoId++;
  const cat = { id, nome: nome || '', jogo: jogo || 'ambos', descricao: descricao || '', totalConteudos: 0, ativa: true, criadoEm: new Date().toISOString() };
  c.categorias.push(cat);
  salvar();
  return { ok: true, categoria: cat };
}

function associarConteudoCategoria(conteudoId, categoriaId, jogo) {
  const c = carregar();
  const cat = c.categorias.find(x => x.id === categoriaId);
  if (!cat) return { ok: false, erro: 'Categoria não encontrada' };
  const id = 'acc_' + c.proximoId++;
  const ac = { id, conteudoId, categoriaId, jogo: jogo || 'ambos', criadoEm: new Date().toISOString() };
  c.conteudos.push(ac);
  cat.totalConteudos++;
  salvar();
  return { ok: true, associacao: ac };
}

function listarCategorias(jogo = null, ativa = null) {
  const c = carregar();
  let l = c.categorias;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativa !== null) l = l.filter(x => x.ativa === ativa);
  return l.sort((a, b) => b.totalConteudos - a.totalConteudos);
}

function estatisticasCategoriaConteudo() {
  const c = carregar();
  const total = c.categorias.length;
  const totalConteudos = c.conteudos.length;
  return { total, totalConteudos, ativas: c.categorias.filter(x => x.ativa).length };
}

module.exports = { criarCategoria, associarConteudoCategoria, listarCategorias, estatisticasCategoriaConteudo, carregar, salvar, ARQ };