// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌲 BIBLIOTECA EVERGREEN EXPANDIDA — conteúdos atemporais
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'evergreen.json');

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

function adicionarConteudo(titulo, texto, formato, rede, jogo, categoria) {
  const c = carregar();
  const id = 'ev_' + c.proximoId++;
  const ev = { id, titulo, texto, formato: formato || 'texto', rede: rede || 'todos', jogo: jogo || 'ambos', categoria: categoria || 'geral', usos: 0, ultimoUso: null, criadoEm: new Date().toISOString() };
  c.conteudos.push(ev);
  salvar();
  return { ok: true, conteudo: ev };
}

function listarConteudos(rede = null, jogo = null, categoria = null) {
  const c = carregar();
  let l = c.conteudos;
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (categoria) l = l.filter(x => x.categoria === categoria);
  return l;
}

function registrarUso(id) {
  const c = carregar();
  const ev = c.conteudos.find(x => x.id === id);
  if (!ev) return { ok: false, erro: 'Conteúdo não encontrado' };
  ev.usados = (ev.usados || 0) + 1;
  ev.ultimoUso = new Date().toISOString();
  salvar();
  return { ok: true, conteudo: ev };
}

function estatisticasEvergreen() {
  const c = carregar();
  const total = c.conteudos.length;
  const totalUsos = c.conteudos.reduce((s, x) => s + (x.usados || 0), 0);
  return { total, totalUsos };
}

module.exports = { adicionarConteudo, listarConteudos, registrarUso, estatisticasEvergreen, carregar, salvar, ARQ };