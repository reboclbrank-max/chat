// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SISTEMA DE TAREFAS — pendências de marketing e chat
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'tarefas.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { tarefas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarTarefa(titulo, descricao, prioridade, jogo, prazo, tipo) {
  const c = carregar();
  const id = 'tarefa_' + c.proximoId++;
  const t = { id, titulo, descricao: descricao || '', prioridade: prioridade || 'media', jogo: jogo || 'ambos', prazo: prazo || null, tipo: tipo || 'geral', status: 'pendente', criadoEm: new Date().toISOString(), concluidaEm: null };
  c.tarefas.push(t);
  salvar();
  return { ok: true, tarefa: t };
}

function concluirTarefa(id) {
  const c = carregar();
  const t = c.tarefas.find(t => t.id === id);
  if (!t) return { ok: false, erro: 'Tarefa não encontrada' };
  t.status = 'concluida';
  t.concluidaEm = new Date().toISOString();
  salvar();
  return { ok: true, tarefa: t };
}

function listarTarefas(status = null, jogo = null) {
  const c = carregar();
  let lista = c.tarefas;
  if (status) lista = lista.filter(t => t.status === status);
  if (jogo) lista = lista.filter(t => t.jogo === jogo || t.jogo === 'ambos');
  return lista.sort((a, b) => {
    const p = { alta: 3, media: 2, baixa: 1 };
    return (p[b.prioridade] || 0) - (p[a.prioridade] || 0);
  });
}

function estatisticasTarefas() {
  const c = carregar();
  const total = c.tarefas.length;
  const pendentes = c.tarefas.filter(t => t.status === 'pendente').length;
  const concluidas = c.tarefas.filter(t => t.status === 'concluida').length;
  return { total, pendentes, concluidas };
}

module.exports = { criarTarefa, concluirTarefa, listarTarefas, estatisticasTarefas, carregar, salvar, ARQ };