// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤖 AUTOMAÇÃO DE REDES SOCIAIS — agendamento e automação de posts
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'automacao-redes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { automacoes: [], execucoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarAutomacao(nome, rede, jogo, mensagem, frequenciaHoras, ativo) {
  const c = carregar();
  const id = 'aut_' + c.proximoId++;
  const a = { id, nome: nome || '', rede: rede || 'todos', jogo: jogo || 'ambos', mensagem: mensagem || '', frequenciaHoras: Number(frequenciaHoras) || 24, ativo: ativo !== false, execucoes: 0, criadoEm: new Date().toISOString() };
  c.automacoes.push(a);
  salvar();
  return { ok: true, automacao: a };
}

function executarAutomacao(id) {
  const c = carregar();
  const a = c.automacoes.find(x => x.id === id);
  if (!a) return { ok: false, erro: 'Automação não encontrada' };
  if (!a.ativo) return { ok: false, erro: 'Automação inativa' };
  const idExec = 'exe_' + c.proximoId++;
  const e = { id: idExec, automacaoId: id, jogo: a.jogo, mensagem: a.mensagem, executadoEm: new Date().toISOString(), status: 'executado' };
  c.execucoes.push(e);
  a.execucoes++;
  salvar();
  return { ok: true, execucao: e };
}

function listarAutomacoes(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.automacoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.execucoes - a.execucoes);
}

function estatisticasAutomacao() {
  const c = carregar();
  const total = c.automacoes.length;
  const ativas = c.automacoes.filter(x => x.ativo).length;
  const totalExecucoes = c.execucoes.length;
  return { total, ativas, totalExecucoes };
}

module.exports = { criarAutomacao, executarAutomacao, listarAutomacoes, estatisticasAutomacao, carregar, salvar, ARQ };