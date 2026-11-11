// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 RESPOSTAS AUTOMÁTICAS A COMENTÁRIOS — autoresponder por sentimento
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'respostas-comentarios.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { respostas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarResposta(comentarioId, rede, textoComentario, sentimento, resposta, jogo) {
  const c = carregar();
  const id = 'resp_' + c.proximoId++;
  const r = { id, comentarioId, rede: rede || 'todos', textoComentario, sentimento: sentimento || 'neutro', resposta, jogo: jogo || 'ambos', criadoEm: new Date().toISOString(), enviado: false };
  c.respostas.push(r);
  salvar();
  return { ok: true, resposta: r };
}

function listarRespostas(sentimento = null, enviado = null) {
  const c = carregar();
  let lista = c.respostas;
  if (sentimento) lista = lista.filter(r => r.sentimento === sentimento);
  if (enviado !== null) lista = lista.filter(r => r.enviado === enviado);
  return lista;
}

function marcarEnviado(id) {
  const c = carregar();
  const r = c.respostas.find(r => r.id === id);
  if (!r) return { ok: false, erro: 'Resposta não encontrada' };
  r.enviado = true;
  salvar();
  return { ok: true, resposta: r };
}

function estatisticasRespostas() {
  const c = carregar();
  const total = c.respostas.length;
  const enviados = c.respostas.filter(r => r.enviado).length;
  const porSentimento = {};
  for (const r of c.respostas) { if (!porSentimento[r.sentimento]) porSentimento[r.sentimento] = 0; porSentimento[r.sentimento]++; }
  return { total, enviados, naoEnviados: total - enviados, porSentimento };
}

module.exports = { registrarResposta, listarRespostas, marcarEnviado, estatisticasRespostas, carregar, salvar, ARQ };