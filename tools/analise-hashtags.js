// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// #️⃣ ANÁLISE DE HASHTAGS — rastreamento de desempenho por hashtag
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'hashtags.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { hashtags: [], usos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarHashtag(tag, rede, jogo) {
  const c = carregar();
  let h = c.hashtags.find(x => x.tag === tag && x.rede === rede);
  if (!h) {
    const id = 'ht_' + c.proximoId++;
    h = { id, tag, rede: rede || 'todos', jogo: jogo || 'ambos', usos: 0, engajamentoTotal: 0, criadoEm: new Date().toISOString() };
    c.hashtags.push(h);
  }
  h.usados = (h.usados || 0) + 1;
  h.atualizadoEm = new Date().toISOString();
  salvar();
  return { ok: true, hashtag: h };
}

function adicionarEngajamentoHashtag(tag, rede, engajamento) {
  const c = carregar();
  const h = c.hashtags.find(x => x.tag === tag && x.rede === rede);
  if (!h) return { ok: false, erro: 'Hashtag não encontrada' };
  h.engajamentoTotal = (h.engajamentoTotal || 0) + Number(engajamento) || 0;
  salvar();
  return { ok: true, hashtag: h };
}

function listarHashtags(rede = null, jogo = null) {
  const c = carregar();
  let l = c.hashtags;
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => (b.usados || 0) - (a.usados || 0));
}

function estatisticasHashtags() {
  const c = carregar();
  return { totalHashtags: c.hashtags.length, totalUsos: c.hashtags.reduce((s, h) => s + (h.usados || 0), 0) };
}

module.exports = { registrarHashtag, adicionarEngajamentoHashtag, listarHashtags, estatisticasHashtags, carregar, salvar, ARQ };