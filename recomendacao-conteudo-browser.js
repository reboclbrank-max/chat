// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💡 RECOMENDAÇÃO DE CONTEÚDO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_recomendacoes_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { conteudos: [], recomendacoes: [], proximoId: 1 }; } catch (e) { return { conteudos: [], recomendacoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__rec_registrarConteudo = function (texto, formato, rede, jogo, engajamento, cliques, downloads) {
    const d = c(); const id = 'cont_' + d.proximoId++;
    const con = { id, texto, formato: formato || 'texto', rede: rede || 'todos', jogo: jogo || 'ambos', engajamento: Number(engajamento) || 0, cliques: Number(cliques) || 0, downloads: Number(downloads) || 0, criadoEm: new Date().toISOString() };
    d.conteudos.push(con); s(d); return { ok: true, conteudo: con };
  };
  window.__rec_gerarRecomendacoes = function (rede, jogo) {
    const d = c(); let l = d.conteudos; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
    const o = l.sort((a, b) => b.engajamento - a.engajamento).slice(0, 5);
    return { ok: true, recomendacoes: o.map(con => ({ id: con.id, texto: con.texto.slice(0, 60), formato: con.formato, engajamento: con.engajamento, motivo: 'alto desempenho histórico' })) };
  };
  window.__rec_listarConteudos = function (rede, jogo, limite) {
    const d = c(); let l = d.conteudos; if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos'); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => b.engajamento - a.engajamento).slice(0, limite || 20);
  };
  window.__rec_estatisticasConteudos = function () { const d = c(); const total = d.conteudos.length; const med = total > 0 ? (d.conteudos.reduce((s, c) => s + c.engajamento, 0) / total).toFixed(2) : 0; return { total, medioEngajamento: med, totalCliques: d.conteudos.reduce((s, c) => s + c.cliques, 0), totalDownloads: d.conteudos.reduce((s, c) => s + c.downloads, 0) }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);