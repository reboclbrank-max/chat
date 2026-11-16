// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌲 BIBLIOTECA EVERGREEN EXPANDIDA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_evergreen_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { conteudos: [], proximoId: 1 }; } catch (e) { return { conteudos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ev_adicionarConteudo = function (titulo, texto, formato, rede, jogo, categoria) {
    const d = c(); const id = 'ev_' + d.proximoId++;
    const ev = { id, titulo, texto, formato: formato || 'texto', rede: rede || 'todos', jogo: jogo || 'ambos', categoria: categoria || 'geral', usos: 0, ultimoUso: null, criadoEm: new Date().toISOString() };
    d.conteudos.push(ev); s(d); return { ok: true, conteudo: ev };
  };
  window.__ev_listarConteudos = function (rede, jogo, categoria) { const d = c(); let l = d.conteudos; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (categoria) l = l.filter(x => x.categoria === categoria); return l; };
  window.__ev_registrarUso = function (id) { const d = c(); const ev = d.conteudos.find(x => x.id === id); if (!ev) return { ok: false, erro: 'Conteúdo não encontrado' }; ev.usados = (ev.usados || 0) + 1; ev.ultimoUso = new Date().toISOString(); s(d); return { ok: true, conteudo: ev }; };
  window.__ev_estatisticasEvergreen = function () { const d = c(); const total = d.conteudos.length; const usos = d.conteudos.reduce((s, x) => s + (x.usados || 0), 0); return { total, totalUsos: usos }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);