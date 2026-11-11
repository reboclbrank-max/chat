// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 GERENCIAMENTO DE EVENTO DE MARKETING — controle de eventos e campanhas sazonais
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'evento-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { eventos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarEventoMarketing(nome, jogo, tipo, dataInicio, dataFim, descricao, status) {
  const c = carregar();
  const id = 'evt_' + c.proximoId++;
  const e = { id, nome: nome || '', jogo: jogo || 'ambos', tipo: tipo || 'sazonal', dataInicio: dataInicio || '', dataFim: dataFim || '', descricao: descricao || '', status: status || 'planejado', participantes: 0, criadoEm: new Date().toISOString() };
  c.eventos.push(e);
  salvar();
  return { ok: true, evento: e };
}

function adicionarParticipanteEvento(id, jogo) {
  const c = carregar();
  const e = c.eventos.find(x => x.id === id);
  if (!e) return { ok: false, erro: 'Evento não encontrado' };
  e.participantes++;
  salvar();
  return { ok: true, evento: e };
}

function listarEventosMarketing(jogo = null, status = null) {
  const c = carregar();
  let l = c.eventos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasEventoMarketing() {
  const c = carregar();
  const total = c.eventos.length;
  const totalParticipantes = c.eventos.reduce((s, e) => s + (e.participantes || 0), 0);
  return { total, totalParticipantes, planejados: c.eventos.filter(x => x.status === 'planejado').length };
}

module.exports = { criarEventoMarketing, adicionarParticipanteEvento, listarEventosMarketing, estatisticasEventoMarketing, carregar, salvar, ARQ };