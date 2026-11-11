// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🍂 ANÁLISE DE SAZONALIDADE — padrões de engajamento por período
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'sazonalidade.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { periodos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarPeriodo(periodo, jogo, engajamento, posts, rede) {
  const c = carregar();
  const id = 'saz_' + c.proximoId++;
  const p = { id, periodo: periodo || '', jogo: jogo || 'ambos', engajamento: Number(engajamento) || 0, posts: Number(posts) || 0, rede: rede || 'todos', mediaEngajamento: Number(posts) > 0 ? (Number(engajamento) / Number(posts)).toFixed(2) : 0, criadoEm: new Date().toISOString() };
  c.periodos.push(p);
  salvar();
  return { ok: true, periodo: p };
}

function listarPeriodos(jogo = null, rede = null) {
  const c = carregar();
  let l = c.periodos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => b.engajamento - a.engajamento);
}

function estatisticasSazonalidade() {
  const c = carregar();
  const total = c.periodos.length;
  const totalEngajamento = c.periodos.reduce((s, p) => s + p.engajamento, 0);
  return { total, totalEngajamento, mediaEngajamento: total > 0 ? (totalEngajamento / total).toFixed(2) : 0 };
}

module.exports = { registrarPeriodo, listarPeriodos, estatisticasSazonalidade, carregar, salvar, ARQ };