// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 CALENDÁRIO EDITORIAL — planejamento de posts por data
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'calendario-editorial.json');

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

function agendarPostEditorial(data, rede, texto, jogo, tema) {
  const c = carregar();
  const id = 'cal_' + c.proximoId++;
  const p = { id, data, rede: rede || 'todos', texto: texto || '', jogo: jogo || 'ambos', tema: tema || '', status: 'agendado', publicado: false, criadoEm: new Date().toISOString() };
  c.posts.push(p);
  salvar();
  return { ok: true, post: p };
}

function listarPostsCalendar(dataInicial, dataFinal, jogo = null) {
  const c = carregar();
  let l = c.posts;
  if (dataInicial) l = l.filter(x => x.data >= dataInicial);
  if (dataFinal) l = l.filter(x => x.data <= dataFinal);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => a.data.localeCompare(b.data));
}

function marcarPostPublicado(id) {
  const c = carregar();
  const p = c.posts.find(x => x.id === id);
  if (!p) return { ok: false, erro: 'Post não encontrado' };
  p.publicado = true;
  p.status = 'publicado';
  salvar();
  return { ok: true, post: p };
}

function estatisticasCalendario() {
  const c = carregar();
  const total = c.posts.length;
  const publicados = c.posts.filter(x => x.publicado).length;
  return { total, publicados, pendentes: total - publicados };
}

module.exports = { agendarPostEditorial, listarPostsCalendar, marcarPostPublicado, estatisticasCalendario, carregar, salvar, ARQ };