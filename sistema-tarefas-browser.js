// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ SISTEMA DE TAREFAS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_tarefas_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { tarefas: [], proximoId: 1 }; } catch (e) { return { tarefas: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__tar_criarTarefa = function (titulo, descricao, prioridade, jogo, prazo, tipo) {
    const d = c(); const id = 'tarefa_' + d.proximoId++;
    const t = { id, titulo, descricao: descricao || '', prioridade: prioridade || 'media', jogo: jogo || 'ambos', prazo: prazo || null, tipo: tipo || 'geral', status: 'pendente', criadoEm: new Date().toISOString(), concluidaEm: null };
    d.tarefas.push(t); s(d); return { ok: true, tarefa: t };
  };
  window.__tar_concluirTarefa = function (id) {
    const d = c(); const t = d.tarefas.find(x => x.id === id); if (!t) return { ok: false, erro: 'Tarefa não encontrada' };
    t.status = 'concluida'; t.concluidaEm = new Date().toISOString(); s(d); return { ok: true, tarefa: t };
  };
  window.__tar_listarTarefas = function (status, jogo) {
    const d = c(); let l = d.tarefas; if (status) l = l.filter(x => x.status === status); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
    const p = { alta: 3, media: 2, baixa: 1 }; return l.sort((a, b) => (p[b.prioridade] || 0) - (p[a.prioridade] || 0));
  };
  window.__tar_estatisticasTarefas = function () { const d = c(); const total = d.tarefas.length; return { total, pendentes: d.tarefas.filter(x => x.status === 'pendente').length, concluidas: d.tarefas.filter(x => x.status === 'concluida').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);