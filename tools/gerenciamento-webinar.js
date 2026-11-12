// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎥 GERENCIAMENTO DE WEBINAR — controle de webinars e lives
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'webinars.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { webinars: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarWebinar(titulo, jogo, data, plataforma, inscritos, participantes, status) {
  const c = carregar();
  const id = 'wb_' + c.proximoId++;
  const wb = { id, titulo: titulo || '', jogo: jogo || 'ambos', data: data || '', plataforma: plataforma || '', inscritos: Number(inscritos) || 0, participantes: Number(participantes) || 0, status: status || 'planejado', taxaComparecimento: Number(inscritos) > 0 ? ((Number(participantes) / Number(inscritos)) * 100).toFixed(2) : 0, criadoEm: new Date().toISOString() };
  c.webinars.push(wb);
  salvar();
  return { ok: true, webinar: wb };
}

function listarWebinars(jogo = null, status = null) {
  const c = carregar();
  let l = c.webinars;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasWebinar() {
  const c = carregar();
  const total = c.webinars.length;
  const totalInscritos = c.webinars.reduce((s, w) => s + (w.inscritos || 0), 0);
  return { total, totalInscritos, planejados: c.webinars.filter(x => x.status === 'planejado').length };
}

module.exports = { criarWebinar, listarWebinars, estatisticasWebinar, carregar, salvar, ARQ };