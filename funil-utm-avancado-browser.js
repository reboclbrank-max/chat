// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔗 FUNIL UTM AVANÇADO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_funil_utm_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { links: [], cliques: [], conversoes: [], proximoId: 1 }; } catch (e) { return { links: [], cliques: [], conversoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__utm_criarLink = function (campanha, fonte, medio, conteudo, termo, urlDestino, jogo) {
    const d = c(); const id = 'utm_' + d.proximoId++;
    const utm = '?utm_source=' + fonte + '&utm_medium=' + medio + '&utm_campaign=' + campanha + '&utm_content=' + conteudo + '&utm_term=' + termo;
    const l = { id, campanha, fonte, medio, conteudo, termo, urlDestino, urlCompleta: urlDestino + utm, jogo: jogo || 'ambos', cliques: 0, conversoes: 0, criadoEm: new Date().toISOString() };
    d.links.push(l); s(d); return { ok: true, link: l };
  };
  window.__utm_registrarClique = function (linkId) {
    const d = c(); const l = d.links.find(x => x.id === linkId); if (!l) return { ok: false, erro: 'Link não encontrado' };
    l.cliques++; d.cliques.push({ linkId, criadoEm: new Date().toISOString() }); s(d); return { ok: true, cliques: l.cliques };
  };
  window.__utm_registrarConversao = function (linkId) {
    const d = c(); const l = d.links.find(x => x.id === linkId); if (!l) return { ok: false, erro: 'Link não encontrado' };
    l.conversoes++; d.conversoes.push({ linkId, criadoEm: new Date().toISOString() }); s(d); return { ok: true, conversoes: l.conversoes };
  };
  window.__utm_listarLinks = function (jogo) { const d = c(); if (jogo) return d.links.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.links; };
  window.__utm_estatisticasFunil = function () { const d = c(); const tc = d.links.reduce((s, l) => s + l.cliques, 0); const tconv = d.links.reduce((s, l) => s + l.conversoes, 0); return { totalLinks: d.links.length, totalCliques: tc, totalConversoes: tconv, taxaConversao: tc > 0 ? ((tconv / tc) * 100).toFixed(2) : 0 }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);