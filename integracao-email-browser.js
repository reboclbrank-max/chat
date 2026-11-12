// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📧 INTEGRAÇÃO EMAIL — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_email_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { emails: [], proximoId: 1 }; } catch (e) { return { emails: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__em_registrarEmail = function (destinatario, assunto, corpo, jogo, tipo) {
    const d = c(); const id = 'em_' + d.proximoId++;
    const e = { id, destinatario, assunto: assunto || '', corpo: corpo || '', jogo: jogo || 'ambos', tipo: tipo || 'relatorio', enviado: false, criadoEm: new Date().toISOString() };
    d.emails.push(e); s(d); return { ok: true, email: e };
  };
  window.__em_listarEmails = function (enviado, jogo) { const d = c(); let l = d.emails; if (enviado !== null) l = l.filter(x => x.enviado === enviado); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__em_marcarEmailEnviado = function (id) { const d = c(); const e = d.emails.find(x => x.id === id); if (!e) return { ok: false, erro: 'Email não encontrado' }; e.enviado = true; s(d); return { ok: true, email: e }; };
  window.__em_estatisticasEmails = function () { const d = c(); const total = d.emails.length; return { total, enviados: d.emails.filter(x => x.enviado).length, naoEnviados: d.emails.filter(x => !x.enviado).length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);