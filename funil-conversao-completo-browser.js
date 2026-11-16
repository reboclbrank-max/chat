// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📉 FUNIL DE CONVERSÃO COMPLETO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_funil_conversao_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { funis: [], proximoId: 1 }; } catch (e) { return { funis: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__fnl_registrarEtapa = function (nome, jogo, impressoes, cliques, downloads, instalacoes, primeiroJogo, retencao1, retencao7) {
    const d = c(); const id = 'fnl_' + d.proximoId++;
    const f = { id, nome: nome || '', jogo: jogo || 'ambos', impressoes: Number(impressoes) || 0, cliques: Number(cliques) || 0, downloads: Number(downloads) || 0, instalacoes: Number(instalacoes) || 0, primeiroJogo: Number(primeiroJogo) || 0, retencao1: Number(retencao1) || 0, retencao7: Number(retencao7) || 0, criadoEm: new Date().toISOString() };
    d.funis.push(f); s(d); return { ok: true, funil: f };
  };
  window.__fnl_listarFunis = function (jogo) { const d = c(); if (jogo) return d.funis.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.funis; };
  window.__fnl_estatisticasFunilConversao = function () { const d = c(); const total = d.funis.length; const ultimo = total > 0 ? d.funis[total - 1] : null; if (!ultimo) return { total: 0 }; const ctr = ultimo.impressoes > 0 ? ((ultimo.cliques / ultimo.impressoes) * 100).toFixed(2) : 0; const conversao = ultimo.cliques > 0 ? ((ultimo.downloads / ultimo.cliques) * 100).toFixed(2) : 0; const instalacao = ultimo.downloads > 0 ? ((ultimo.instalacoes / ultimo.downloads) * 100).toFixed(2) : 0; return { total, ultimo: ultimo.nome, ctr, conversao, taxaInstalacao: instalacao, retencao1: ultimo.retencao1, retencao7: ultimo.retencao7 }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);