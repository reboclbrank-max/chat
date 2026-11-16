// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 INTEGRAÇÃO DISCORD — envio de mensagens para servidor Discord
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'discord-integracao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { mensagens: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarMensagemDiscord(canal, mensagem, jogo, embed) {
  const c = carregar();
  const id = 'dc_' + c.proximoId++;
  const m = { id, canal: canal || 'geral', mensagem: mensagem || '', jogo: jogo || 'ambos', embed: embed || '', enviado: false, criadoEm: new Date().toISOString() };
  c.mensagens.push(m);
  salvar();
  return { ok: true, mensagem: m };
}

function listarMensagens(enviado = null, jogo = null) {
  const c = carregar();
  let l = c.mensagens;
  if (enviado !== null) l = l.filter(x => x.enviado === enviado);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function marcarMensagemEnviada(id) {
  const c = carregar();
  const m = c.mensagens.find(x => x.id === id);
  if (!m) return { ok: false, erro: 'Mensagem não encontrada' };
  m.enviado = true;
  salvar();
  return { ok: true, mensagem: m };
}

function estatisticasDiscord() {
  const c = carregar();
  const total = c.mensagens.length;
  const enviados = c.mensagens.filter(x => x.enviado).length;
  return { total, enviados, pendentes: total - enviados };
}

module.exports = { registrarMensagemDiscord, listarMensagens, marcarMensagemEnviada, estatisticasDiscord, carregar, salvar, ARQ };