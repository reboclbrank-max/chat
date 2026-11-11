// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏆 SISTEMA DE RECOMPENSAS DE ENGAJAMENTO — recompensas por interação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'recompensas-engajamento.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { recompensas: [], resgates: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function cadastrarRecompensa(nome, tipo, pontosNecessarios, descricao, jogo) {
  const c = carregar();
  const id = 'rec_' + c.proximoId++;
  const r = { id, nome, tipo: tipo || 'desconto', pontosNecessarios: Number(pontosNecessarios) || 0, descricao: descricao || '', jogo: jogo || 'ambos', ativa: true, criadoEm: new Date().toISOString() };
  c.recompensas.push(r);
  salvar();
  return { ok: true, recompensa: r };
}

function resgatarRecompensa(idUsuario, recompensaId, jogo) {
  const c = carregar();
  const r = c.recompensas.find(x => x.id === recompensaId);
  if (!r) return { ok: false, erro: 'Recompensa não encontrada' };
  if (!r.ativa) return { ok: false, erro: 'Recompensa inativa' };
  const id = 'resg_' + c.proximoId++;
  const resgate = { id, idUsuario, recompensaId, jogo: jogo || 'ambos', pontosGastos: r.pontosNecessarios, criadoEm: new Date().toISOString(), status: 'pendente' };
  c.resgates.push(resgate);
  salvar();
  return { ok: true, resgate: resgate };
}

function listarRecompensas(jogo = null, ativa = null) {
  const c = carregar();
  let l = c.recompensas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativa !== null) l = l.filter(x => x.ativa === ativa);
  return l;
}

function estatisticasRecompensas() {
  const c = carregar();
  const total = c.recompensas.length;
  const ativas = c.recompensas.filter(x => x.ativa).length;
  const totalResgates = c.resgates.length;
  return { total, ativas, totalResgates };
}

module.exports = { cadastrarRecompensa, resgatarRecompensa, listarRecompensas, estatisticasRecompensas, carregar, salvar, ARQ };