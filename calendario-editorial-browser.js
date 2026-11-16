// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 CALENDÁRIO EDITORIAL — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_calendario_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { posts: [], proximoId: 1 }; } catch (e) { return { posts: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__cal_agendarPostEditorial = function (data, rede, texto, jogo, tema) {
    const d = c(); const id = 'cal_' + d.proximoId++;
    const p = { id, data, rede: rede || 'todos', texto: texto || '', jogo: jogo || 'ambos', tema: tema || '', status: 'agendado', publicado: false, criadoEm: new Date().toISOString() };
    d.posts.push(p); s(d); return { ok: true, post: p };
  };
  window.__cal_listarPostsCalendar = function (dataInicial, dataFinal, jogo) { const d = c(); let l = d.posts; if (dataInicial) l = l.filter(x => x.data >= dataInicial); if (dataFinal) l = l.filter(x => x.data <= dataFinal); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => a.data.localeCompare(b.data)); };
  window.__cal_marcarPostPublicado = function (id) { const d = c(); const p = d.posts.find(x => x.id === id); if (!p) return { ok: false, erro: 'Post não encontrado' }; p.publicado = true; p.status = 'publicado'; s(d); return { ok: true, post: p }; };
  window.__cal_estatisticasCalendario = function () { const d = c(); const total = d.posts.length; return { total, publicados: d.posts.filter(x => x.publicado).length, pendentes: total - d.posts.filter(x => x.publicado).length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);