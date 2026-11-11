// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📋 AUDITORIA DE AÇÕES — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_auditoria_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { logs: [], proximoId: 1 }; } catch (e) { return { logs: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__aud_registrarAcao = function (acao, entidade, entidadeId, detalhes, usuario) {
    const d = c(); const id = 'aud_' + d.proximoId++;
    const log = { id, acao, entidade, entidadeId, detalhes: detalhes || '', usuario: usuario || 'sistema', criadoEm: new Date().toISOString() };
    d.logs.push(log); s(d); return { ok: true, log };
  };
  window.__aud_listarLogs = function (entidade, acao, limite) {
    const d = c(); let l = d.logs; if (entidade) l = l.filter(x => x.entidade === entidade); if (acao) l = l.filter(x => x.acao === acao); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite || 50);
  };
  window.__aud_estatisticasAuditoria = function () { const d = c(); const total = d.logs.length; const porAcao = {}; for (const l of d.logs) { if (!porAcao[l.acao]) porAcao[l.acao] = 0; porAcao[l.acao]++; } return { total, porAcao }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);