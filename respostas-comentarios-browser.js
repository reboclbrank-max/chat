// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💬 RESPOSTAS AUTOMÁTICAS A COMENTÁRIOS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_respostas_comentarios_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { respostas: [], proximoId: 1 }; } catch (e) { return { respostas: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__resp_registrarResposta = function (comentarioId, rede, textoComentario, sentimento, resposta, jogo) {
    const d = c(); const id = 'resp_' + d.proximoId++;
    const r = { id, comentarioId, rede: rede || 'todos', textoComentario, sentimento: sentimento || 'neutro', resposta, jogo: jogo || 'ambos', criadoEm: new Date().toISOString(), enviado: false };
    d.respostas.push(r); s(d); return { ok: true, resposta: r };
  };
  window.__resp_listarRespostas = function (sentimento, enviado) {
    const d = c(); let l = d.respostas; if (sentimento) l = l.filter(x => x.sentimento === sentimento); if (enviado !== null) l = l.filter(x => x.enviado === enviado); return l;
  };
  window.__resp_marcarEnviado = function (id) {
    const d = c(); const r = d.respostas.find(x => x.id === id); if (!r) return { ok: false, erro: 'Resposta não encontrada' };
    r.enviado = true; s(d); return { ok: true, resposta: r };
  };
  window.__resp_estatisticasRespostas = function () { const d = c(); const total = d.respostas.length; const enviados = d.respostas.filter(x => x.enviado).length; const ps = {}; for (const r of d.respostas) { if (!ps[r.sentimento]) ps[r.sentimento] = 0; ps[r.sentimento]++; } return { total, enviados, naoEnviados: total - enviados, porSentimento: ps }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);