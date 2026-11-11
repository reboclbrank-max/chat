// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 RASTREAMENTO DE INDICAÇÕES POR REDE — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_indicacoes_rede_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { indicacoes: [], proximoId: 1 }; } catch (e) { return { indicacoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ir_registrarIndicacaoRede = function (rede, jogo, quantidade, fonte) {
    const d = c(); const id = 'ir_' + d.proximoId++;
    const ind = { id, rede: rede || 'todos', jogo: jogo || 'ambos', quantidade: Number(quantidade) || 0, fonte: fonte || 'orgânico', criadoEm: new Date().toISOString() };
    d.indicacoes.push(ind); s(d); return { ok: true, indicacao: ind };
  };
  window.__ir_listarIndicacoesRede = function (rede, jogo) { const d = c(); let l = d.indicacoes; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__ir_estatisticasIndicacoesRede = function () { const d = c(); const total = d.indicacoes.length; return { total, totalQuantidade: d.indicacoes.reduce((s, i) => s + (i.quantidade || 0), 0) }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);