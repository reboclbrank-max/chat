// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✉️ AUTOMAÇÃO DE EMAIL MARKETING — campanhas de email automatizadas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'automacao-email.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { campanhas: [], envios: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarCampanhaEmail(nome, assunto, conteudo, jogo, segmento, status) {
  const c = carregar();
  const id = 'cem_' + c.proximoId++;
  const camp = { id, nome: nome || '', assunto: assunto || '', conteudo: conteudo || '', jogo: jogo || 'ambos', segmento: segmento || 'todos', status: status || 'rascunho', envios: 0, aberturas: 0, cliques: 0, criadoEm: new Date().toISOString() };
  c.campanhas.push(camp);
  salvar();
  return { ok: true, campanha: camp };
}

function registrarEnvioEmail(campanhaId, destinatario, jogo) {
  const c = carregar();
  const camp = c.campanhas.find(x => x.id === campanhaId);
  if (!camp) return { ok: false, erro: 'Campanha não encontrada' };
  const id = 'env_' + c.proximoId++;
  const e = { id, campanhaId, destinatario, jogo: jogo || 'ambos', status: 'enviado', enviadoEm: new Date().toISOString() };
  c.envios.push(e);
  camp.envios++;
  salvar();
  return { ok: true, envio: e };
}

function listarCampanhasEmail(jogo = null, status = null) {
  const c = carregar();
  let l = c.campanhas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => b.envios - a.envios);
}

function estatisticasEmailMarketing() {
  const c = carregar();
  const total = c.campanhas.length;
  const totalEnvios = c.campanhas.reduce((s, c) => s + c.envios, 0);
  const totalAberturas = c.campanhas.reduce((s, c) => s + c.aberturas, 0);
  return { total, totalEnvios, totalAberturas, ativas: c.campanhas.filter(x => x.status === 'ativa').length };
}

module.exports = { criarCampanhaEmail, registrarEnvioEmail, listarCampanhasEmail, estatisticasEmailMarketing, carregar, salvar, ARQ };