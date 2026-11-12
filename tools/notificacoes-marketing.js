// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 NOTIFICAÇÕES DE MARKETING — alertas e avisos do sistema
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'notificacoes.json');

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

function criarNotificacao(titulo, mensagem, tipo, jogo, canal) {
  const c = carregar();
  const id = 'not_' + c.proximoId++;
  const n = { id, titulo, mensagem: mensagem || '', tipo: tipo || 'info', jogo: jogo || 'ambos', canal: canal || 'chat', lida: false, criadoEm: new Date().toISOString() };
  c.notificacoes.push(n);
  salvar();
  return { ok: true, notificacao: n };
}

function listarNotificacoes(naoLidas = null, jogo = null) {
  const c = carregar();
  let l = c.notificacoes;
  if (naoLidas !== null) l = l.filter(n => n.lida === !naoLidas);
  if (jogo) l = l.filter(n => n.jogo === jogo || n.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function marcarLida(id) {
  const c = carregar();
  const n = c.notificacoes.find(x => x.id === id);
  if (!n) return { ok: false, erro: 'Notificação não encontrada' };
  n.lida = true;
  salvar();
  return { ok: true, notificacao: n };
}

function estatisticasNotificacoes() {
  const c = carregar();
  const total = c.notificacoes.length;
  const naoLidas = c.notificacoes.filter(n => !n.lida).length;
  return { total, naoLidas, lidas: total - naoLidas };
}

module.exports = { criarNotificacao, listarNotificacoes, marcarLida, estatisticasNotificacoes, carregar, salvar, ARQ };