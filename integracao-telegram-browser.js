// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✈️ INTEGRAÇÃO TELEGRAM — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_telegram_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { mensagens: [], proximoId: 1 }; } catch (e) { return { mensagens: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__tg_registrarMensagemTelegram = function (chatId, mensagem, jogo, parseMode) {
    const d = c(); const id = 'tg_' + d.proximoId++;
    const m = { id, chatId: chatId || '', mensagem: mensagem || '', jogo: jogo || 'ambos', parseMode: parseMode || 'HTML', enviado: false, criadoEm: new Date().toISOString() };
    d.mensagens.push(m); s(d); return { ok: true, mensagem: m };
  };
  window.__tg_listarMensagensTelegram = function (enviado, jogo) { const d = c(); let l = d.mensagens; if (enviado !== null) l = l.filter(x => x.enviado === enviado); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__tg_marcarMensagemTelegramEnviada = function (id) { const d = c(); const m = d.mensagens.find(x => x.id === id); if (!m) return { ok: false, erro: 'Mensagem não encontrada' }; m.enviado = true; s(d); return { ok: true, mensagem: m }; };
  window.__tg_estatisticasTelegram = function () { const d = c(); const total = d.mensagens.length; return { total, enviados: d.mensagens.filter(x => x.enviado).length, pendentes: total - d.mensagens.filter(x => x.enviado).length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);