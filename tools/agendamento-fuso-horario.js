// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌍 AGENDAMENTO POR FUSO HORÁRIO — ajuste de posts por região do público
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'fuso-horario.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { fusos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function configurarFuso(rede, fuso, horarioPadrao, jogo) {
  const c = carregar();
  const id = 'fuso_' + c.proximoId++;
  const f = { id, rede: rede || 'todos', fuso: fuso || 'America/Sao_Paulo', horarioPadrao: horarioPadrao || '10:00', jogo: jogo || 'ambos', ativo: true, criadoEm: new Date().toISOString() };
  c.fusos.push(f);
  salvar();
  return { ok: true, fuso: f };
}

function converterHorario(horarioLocal, fusoOrigem, fusoDestino) {
  // Conversão simplificada: assume offsets fixos para fusos comuns
  const offsets = { 'America/Sao_Paulo': -3, 'America/New_York': -5, 'Europe/London': 0, 'Asia/Tokyo': 9, 'UTC': 0 };
  const o1 = offsets[fusoOrigem] || -3;
  const o2 = offsets[fusoDestino] || -3;
  const [h, m] = horarioLocal.split(':').map(Number);
  let novaHora = ((h + o2 - o1) % 24 + 24) % 24;
  return { hora: novaHora.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') };
}

function listarFusos(jogo = null) {
  const c = carregar();
  if (jogo) return c.fusos.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return c.fusos;
}

function estatisticasFusos() {
  const c = carregar();
  return { total: c.fusos.length, ativos: c.fusos.filter(x => x.ativo).length };
}

module.exports = { configurarFuso, converterHorario, listarFusos, estatisticasFusos, carregar, salvar, ARQ };