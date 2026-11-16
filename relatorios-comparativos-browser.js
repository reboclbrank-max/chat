// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIOS COMPARATIVOS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_relatorios_comp_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { comparativos: [], proximoId: 1 }; } catch (e) { return { comparativos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__cmp_adicionarComparativo = function (metrica, valorCeifalume, valorPrancheta, vencedor, contexto) {
    const d = c(); const id = 'cmp_' + d.proximoId++;
    const comp = { id, metrica, valorCeifalume: Number(valorCeifalume) || 0, valorPrancheta: Number(valorPrancheta) || 0, vencedor: vencedor || 'empate', contexto: contexto || '', diferenca: Math.abs(Number(valorCeifalume) - Number(valorPrancheta)), criadoEm: new Date().toISOString() };
    d.comparativos.push(comp); s(d); return { ok: true, comparativo: comp };
  };
  window.__cmp_listarComparativos = function (metrica) { const d = c(); if (metrica) return d.comparativos.filter(x => x.metrica === metrica); return d.comparativos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__cmp_estatisticasComparativos = function () { const d = c(); const total = d.comparativos.length; return { total, ceifalume: d.comparativos.filter(x => x.vencedor === 'ceifalume').length, prancheta: d.comparativos.filter(x => x.vencedor === 'prancheta').length, empates: d.comparativos.filter(x => x.vencedor === 'empate').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);