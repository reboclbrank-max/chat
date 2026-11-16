// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// #️⃣ GERENCIAMENTO DE HASHTAGS AVANÇADO — sugestão e rastreamento de hashtags
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'hashtags-avancado.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { hashtags: [], sugestoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarHashtagAvancada(tag, rede, jogo, categoria, alcance) {
  const c = carregar();
  const id = 'hta_' + c.proximoId++;
  const h = { id, tag, rede: rede || 'todos', jogo: jogo || 'ambos', categoria: categoria || 'geral', alcance: Number(alcance) || 0, usos: 1, engajamento: 0, ativo: true, criadoEm: new Date().toISOString() };
  c.hashtags.push(h);
  salvar();
  return { ok: true, hashtag: h };
}

function adicionarSugestaoHashtag(tag, jogo, motivo, origem) {
  const c = carregar();
  const id = 'sug_' + c.proximoId++;
  const s = { id, tag: tag || '', jogo: jogo || 'ambos', motivo: motivo || '', origem: origem || 'sistema', aceita: false, criadoEm: new Date().toISOString() };
  c.sugestoes.push(s);
  salvar();
  return { ok: true, sugestao: s };
}

function listarHashtagsAvancadas(jogo = null, categoria = null, ativo = null) {
  const c = carregar();
  let l = c.hashtags;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (categoria) l = l.filter(x => x.categoria === categoria);
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.usos - a.usos);
}

function estatisticasHashtagsAvancadas() {
  const c = carregar();
  const total = c.hashtags.length;
  const totalUsos = c.hashtags.reduce((s, h) => s + (h.usos || 0), 0);
  return { total, totalUsos, totalSugestoes: c.sugestoes.length, ativas: c.hashtags.filter(x => x.ativo).length };
}

module.exports = { registrarHashtagAvancada, adicionarSugestaoHashtag, listarHashtagsAvancadas, estatisticasHashtagsAvancadas, carregar, salvar, ARQ };