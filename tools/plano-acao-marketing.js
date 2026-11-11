// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 PLANO DE AÇÃO DE MARKETING — plano de ações por período
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'plano-acao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { acoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarAcao(titulo, descricao, jogo, responsavel, prazo, prioridade, status) {
  const c = carregar();
  const id = 'pam_' + c.proximoId++;
  const a = { id, titulo: titulo || '', descricao: descricao || '', jogo: jogo || 'ambos', responsavel: responsavel || 'equipe', prazo: prazo || '', prioridade: prioridade || 'media', status: status || 'pendente', criadoEm: new Date().toISOString(), concluidoEm: null };
  c.acoes.push(a);
  salvar();
  return { ok: true, acao: a };
}

function concluirAcao(id) {
  const c = carregar();
  const a = c.acoes.find(x => x.id === id);
  if (!a) return { ok: false, erro: 'Ação não encontrada' };
  a.status = 'concluido';
  a.concluidoEm = new Date().toISOString();
  salvar();
  return { ok: true, acao: a };
}

function listarAcoes(jogo = null, status = null, prioridade = null) {
  const c = carregar();
  let l = c.acoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  if (prioridade) l = l.filter(x => x.prioridade === prioridade);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasPlanoAcao() {
  const c = carregar();
  const total = c.acoes.length;
  const pendentes = c.acoes.filter(x => x.status === 'pendente').length;
  const concluidos = c.acoes.filter(x => x.status === 'concluido').length;
  return { total, pendentes, concluidos };
}

module.exports = { criarAcao, concluirAcao, listarAcoes, estatisticasPlanoAcao, carregar, salvar, ARQ };