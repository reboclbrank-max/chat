// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✉️ GERENCIAMENTO DE CONVITE — convites para eventos e campanhas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'convites.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { convites: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarConvite(destinatario, jogo, evento, mensagem, status) {
  const c = carregar();
  const id = 'cnv_' + c.proximoId++;
  const cnv = { id, destinatario: destinatario || '', jogo: jogo || 'ambos', evento: evento || '', mensagem: mensagem || '', status: status || 'pendente', respondido: false, criadoEm: new Date().toISOString() };
  c.convites.push(cnv);
  salvar();
  return { ok: true, convite: cnv };
}

function responderConvite(id, resposta) {
  const c = carregar();
  const cnv = c.convites.find(x => x.id === id);
  if (!cnv) return { ok: false, erro: 'Convite não encontrado' };
  cnv.respondido = true;
  cnv.status = resposta || 'respondido';
  salvar();
  return { ok: true, convite: cnv };
}

function listarConvites(jogo = null, status = null) {
  const c = carregar();
  let l = c.convites;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasConvite() {
  const c = carregar();
  const total = c.convites.length;
  const respondidos = c.convites.filter(x => x.respondido).length;
  return { total, respondidos, pendentes: total - respondidos };
}

module.exports = { criarConvite, responderConvite, listarConvites, estatisticasConvite, carregar, salvar, ARQ };