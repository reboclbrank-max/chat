// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 MONITORAMENTO DE MENÇÕES — rastreia menções à marca por rede
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'mencoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { mencoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarMencao(rede, usuario, texto, sentimento, jogo, fonte) {
  const c = carregar();
  const id = 'men_' + c.proximoId++;
  const m = { id, rede: rede || 'todos', usuario: usuario || '', texto: texto || '', sentimento: sentimento || 'neutro', jogo: jogo || 'ambos', fonte: fonte || 'orgânico', lida: false, criadoEm: new Date().toISOString() };
  c.mencoes.push(m);
  salvar();
  return { ok: true, mencao: m };
}

function listarMencoes(naoLidas = null, jogo = null, sentimento = null) {
  const c = carregar();
  let l = c.mencoes;
  if (naoLidas !== null) l = l.filter(x => x.lida === !naoLidas);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (sentimento) l = l.filter(x => x.sentimento === sentimento);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function marcarMencaoLida(id) {
  const c = carregar();
  const m = c.mencoes.find(x => x.id === id);
  if (!m) return { ok: false, erro: 'Menção não encontrada' };
  m.lida = true;
  salvar();
  return { ok: true, mencao: m };
}

function estatisticasMencoes() {
  const c = carregar();
  const total = c.mencoes.length;
  const naoLidas = c.mencoes.filter(x => !x.lida).length;
  const porSentimento = {};
  c.mencoes.forEach(x => { porSentimento[x.sentimento] = (porSentimento[x.sentimento] || 0) + 1; });
  return { total, naoLidas, lidas: total - naoLidas, porSentimento };
}

module.exports = { registrarMencao, listarMencoes, marcarMencaoLida, estatisticasMencoes, carregar, salvar, ARQ };