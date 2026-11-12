// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔔 NOTIFICAÇÕES DE MARKETING — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_notificacoes_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { notificacoes: [], proximoId: 1 }; } catch (e) { return { notificacoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__not_criarNotificacao = function (titulo, mensagem, tipo, jogo, canal) {
    const d = c(); const id = 'not_' + d.proximoId++;
    const n = { id, titulo, mensagem: mensagem || '', tipo: tipo || 'info', jogo: jogo || 'ambos', canal: canal || 'chat', lida: false, criadoEm: new Date().toISOString() };
    d.notificacoes.push(n); s(d); return { ok: true, notificacao: n };
  };
  window.__not_listarNotificacoes = function (naoLidas, jogo) {
    const d = c(); let l = d.notificacoes; if (naoLidas !== null) l = l.filter(x => x.lida === !naoLidas); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
  };
  window.__not_marcarLida = function (id) {
    const d = c(); const n = d.notificacoes.find(x => x.id === id); if (!n) return { ok: false, erro: 'Notificação não encontrada' };
    n.lida = true; s(d); return { ok: true, notificacao: n };
  };
  window.__not_estatisticasNotificacoes = function () { const d = c(); const total = d.notificacoes.length; return { total, naoLidas: d.notificacoes.filter(x => !x.lida).length, lidas: d.notificacoes.filter(x => x.lida).length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);