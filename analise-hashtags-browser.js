// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// #️⃣ ANÁLISE DE HASHTAGS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_hashtags_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { hashtags: [], usos: [], proximoId: 1 }; } catch (e) { return { hashtags: [], usos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ht_registrarHashtag = function (tag, rede, jogo) {
    const d = c(); let h = d.hashtags.find(x => x.tag === tag && x.rede === rede);
    if (!h) { const id = 'ht_' + d.proximoId++; h = { id, tag, rede: rede || 'todos', jogo: jogo || 'ambos', usos: 0, engajamentoTotal: 0, criadoEm: new Date().toISOString() }; d.hashtags.push(h); }
    h.usados = (h.usados || 0) + 1; h.atualizadoEm = new Date().toISOString(); s(d); return { ok: true, hashtag: h };
  };
  window.__ht_adicionarEngajamentoHashtag = function (tag, rede, engajamento) {
    const d = c(); const h = d.hashtags.find(x => x.tag === tag && x.rede === rede); if (!h) return { ok: false, erro: 'Hashtag não encontrada' };
    h.engajamentoTotal = (h.engajamentoTotal || 0) + Number(engajamento) || 0; s(d); return { ok: true, hashtag: h };
  };
  window.__ht_listarHashtags = function (rede, jogo) { const d = c(); let l = d.hashtags; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => (b.usados || 0) - (a.usados || 0)); };
  window.__ht_estatisticasHashtags = function () { const d = c(); return { totalHashtags: d.hashtags.length, totalUsos: d.hashtags.reduce((s, h) => s + (h.usados || 0), 0) }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);