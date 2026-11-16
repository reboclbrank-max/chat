// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 SISTEMA DE INDICAÇÃO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_indicacoes_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { indicacoes: [], proximoId: 1 }; } catch (e) { return { indicacoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ind_registrarIndicacao = function (indicator, indicado, jogo, codigo, recompensa) {
    const d = c(); const id = 'ind_' + d.proximoId++;
    const ind = { id, indicator, indicado, jogo: jogo || 'ambos', codigo: codigo || '', recompensa: recompensa || '', status: 'pendente', criadoEm: new Date().toISOString(), convertidoEm: null };
    d.indicacoes.push(ind); s(d); return { ok: true, indicacao: ind };
  };
  window.__ind_converterIndicacao = function (id) {
    const d = c(); const ind = d.indicacoes.find(i => i.id === id); if (!ind) return { ok: false, erro: 'Indicação não encontrada' };
    ind.status = 'convertido'; ind.convertidoEm = new Date().toISOString(); s(d); return { ok: true, indicacao: ind };
  };
  window.__ind_listarIndicacoes = function (jogo, status) {
    const d = c(); let l = d.indicacoes; if (jogo) l = l.filter(i => i.jogo === jogo || i.jogo === 'ambos'); if (status) l = l.filter(i => i.status === status); return l;
  };
  window.__ind_estatisticasIndicacoes = function () { const d = c(); const total = d.indicacoes.length; const conv = d.indicacoes.filter(i => i.status === 'convertido').length; return { total, convertidos: conv, pendentes: total - conv, taxaConversao: total > 0 ? ((conv / total) * 100).toFixed(2) : 0 }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);