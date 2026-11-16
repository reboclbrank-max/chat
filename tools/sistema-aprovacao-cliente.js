// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 SISTEMA DE APROVAÇÃO DE CLIENTE — fluxo de aprovação externa
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'aprovacao-cliente.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { solicitacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarSolicitacao(titulo, conteudo, cliente, jogo, tipo) {
  const c = carregar();
  const id = 'cli_' + c.proximoId++;
  const s = { id, titulo: titulo || '', conteudo: conteudo || '', cliente: cliente || '', jogo: jogo || 'ambos', tipo: tipo || 'conteudo', status: 'pendente', resposta: '', criadoEm: new Date().toISOString(), respondidoEm: null };
  c.solicitacoes.push(s);
  salvar();
  return { ok: true, solicitacao: s };
}

function responderSolicitacao(id, resposta, status) {
  const c = carregar();
  const s = c.solicitacoes.find(x => x.id === id);
  if (!s) return { ok: false, erro: 'Solicitação não encontrada' };
  s.resposta = resposta || '';
  s.status = status || 'aprovado';
  s.respondidoEm = new Date().toISOString();
  salvar();
  return { ok: true, solicitacao: s };
}

function listarSolicitacoes(status = null, jogo = null) {
  const c = carregar();
  let l = c.solicitacoes;
  if (status) l = l.filter(x => x.status === status);
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasAprovacaoCliente() {
  const c = carregar();
  const total = c.solicitacoes.length;
  const pendentes = c.solicitacoes.filter(x => x.status === 'pendente').length;
  const aprovados = c.solicitacoes.filter(x => x.status === 'aprovado').length;
  const rejeitados = c.solicitacoes.filter(x => x.status === 'rejeitado').length;
  return { total, pendentes, aprovados, rejeitados };
}

module.exports = { criarSolicitacao, responderSolicitacao, listarSolicitacoes, estatisticasAprovacaoCliente, carregar, salvar, ARQ };