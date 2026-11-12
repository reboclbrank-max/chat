// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 INTEGRAÇÃO EMAIL — envio de relatórios e alertas por Gmail
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'email-integracao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { emails: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarEmail(destinatario, assunto, corpo, jogo, tipo) {
  const c = carregar();
  const id = 'em_' + c.proximoId++;
  const e = { id, destinatario, assunto: assunto || '', corpo: corpo || '', jogo: jogo || 'ambos', tipo: tipo || 'relatorio', enviado: false, criadoEm: new Date().toISOString() };
  c.emails.push(e);
  salvar();
  return { ok: true, email: e };
}

function listarEmails(enviado = null, jogo = null) {
  const c = carregar();
  let l = c.emails;
  if (enviado !== null) l = l.filter(x => x.enviado === enviado);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function marcarEmailEnviado(id) {
  const c = carregar();
  const e = c.emails.find(x => x.id === id);
  if (!e) return { ok: false, erro: 'Email não encontrado' };
  e.enviado = true;
  salvar();
  return { ok: true, email: e };
}

function estatisticasEmails() {
  const c = carregar();
  const total = c.emails.length;
  const enviados = c.emails.filter(x => x.enviado).length;
  return { total, enviados, naoEnviados: total - enviados };
}

module.exports = { registrarEmail, listarEmails, marcarEmailEnviado, estatisticasEmails, carregar, salvar, ARQ };