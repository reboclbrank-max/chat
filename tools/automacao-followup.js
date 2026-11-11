// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 AUTOMAÇÃO DE FOLLOW-UP — sequência de mensagens após interação
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'followup.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { sequencias: [], execucoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarSequencia(nome, jogo, mensagemInicial, intervaloHoras, rede) {
  const c = carregar();
  const id = 'fol_' + c.proximoId++;
  const s = { id, nome: nome || '', jogo: jogo || 'ambos', mensagemInicial: mensagemInicial || '', intervaloHoras: Number(intervaloHoras) || 24, rede: rede || 'todos', ativo: true, execucoes: 0, criadoEm: new Date().toISOString() };
  c.sequencias.push(s);
  salvar();
  return { ok: true, sequencia: s };
}

function executarFollowup(sequenciaId, idUsuario, jogo) {
  const c = carregar();
  const seq = c.sequencias.find(x => x.id === sequenciaId);
  if (!seq) return { ok: false, erro: 'Sequência não encontrada' };
  const id = 'exe_' + c.proximoId++;
  const e = { id, sequenciaId, idUsuario, jogo: jogo || 'ambos', status: 'enviado', enviadoEm: new Date().toISOString() };
  c.execucoes.push(e);
  seq.execucoes++;
  salvar();
  return { ok: true, execucao: e };
}

function listarSequencias(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.sequencias;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l;
}

function estatisticasFollowup() {
  const c = carregar();
  const total = c.sequencias.length;
  const totalExecucoes = c.execucoes.length;
  return { total, totalExecucoes, ativas: c.sequencias.filter(x => x.ativo).length };
}

module.exports = { criarSequencia, executarFollowup, listarSequencias, estatisticasFollowup, carregar, salvar, ARQ };