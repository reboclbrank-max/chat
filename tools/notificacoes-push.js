// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📲 NOTIFICAÇÕES PUSH — alertas push para dispositivos móveis
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'notificacoes-push.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { notificacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarPush(titulo, corpo, jogo, dispositivo, tipo) {
  const c = carregar();
  const id = 'push_' + c.proximoId++;
  const n = { id, titulo: titulo || '', corpo: corpo || '', jogo: jogo || 'ambos', dispositivo: dispositivo || 'todos', tipo: tipo || 'alerta', lida: false, enviado: false, criadoEm: new Date().toISOString() };
  c.notificacoes.push(n);
  salvar();
  return { ok: true, notificacao: n };
}

function listarPush(naoLidas = null, jogo = null) {
  const c = carregar();
  let l = c.notificacoes;
  if (naoLidas !== null) l = l.filter(x => x.lida === !naoLidas);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function marcarPushLida(id) {
  const c = carregar();
  const n = c.notificacoes.find(x => x.id === id);
  if (!n) return { ok: false, erro: 'Notificação não encontrada' };
  n.lida = true;
  salvar();
  return { ok: true, notificacao: n };
}

function estatisticasPush() {
  const c = carregar();
  const total = c.notificacoes.length;
  const naoLidas = c.notificacoes.filter(x => !x.lida).length;
  const enviados = c.notificacoes.filter(x => x.enviado).length;
  return { total, naoLidas, lidas: total - naoLidas, enviados };
}

module.exports = { registrarPush, listarPush, marcarPushLida, estatisticasPush, carregar, salvar, ARQ };