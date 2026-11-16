// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 💰 LTV POR COHORTE — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_ltv_cohorte_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { cohortes: [], proximoId: 1 }; } catch (e) { return { cohortes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ltv_registrarCohorte = function (mes, jogo, usuarios, receita, periodoMeses) {
    const d = c(); const id = 'coh_' + d.proximoId++;
    const ltv = usuarios > 0 ? receita / usuarios : 0;
    const co = { id, mes, jogo: jogo || 'ambos', usuarios: Number(usuarios), receita: Number(receita), periodoMeses: Number(periodoMeses) || 1, ltv: ltv.toFixed(4), criadoEm: new Date().toISOString() };
    d.cohortes.push(co); s(d); return { ok: true, cohorte: co };
  };
  window.__ltv_listarCohortes = function (jogo) { const d = c(); if (jogo) return d.cohortes.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.cohortes; };
  window.__ltv_estatisticasLTV = function () { const d = c(); const total = d.cohortes.length; const med = total > 0 ? (d.cohortes.reduce((s, c) => s + parseFloat(c.ltv), 0) / total).toFixed(4) : 0; return { total, medioLTV: med }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);