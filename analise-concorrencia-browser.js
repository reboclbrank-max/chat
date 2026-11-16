// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 ANÁLISE DE CONCORRÊNCIA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_concorrencia_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { concorrentes: [], comparativos: [], proximoId: 1 }; } catch (e) { return { concorrentes: [], comparativos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__conc_registrarConcorrente = function (nome, jogo, url, preco, tags, notas) {
    const d = c(); const id = 'conc_' + d.proximoId++;
    const conc = { id, nome, jogo: jogo || 'ambos', url, preco, tags: tags || [], notas: notas || '', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
    d.concorrentes.push(conc); s(d); return { ok: true, concorrente: conc };
  };
  window.__conc_listarConcorrentes = function (jogo) {
    const d = c(); if (jogo) return d.concorrentes.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.concorrentes;
  };
  window.__conc_adicionarComparativo = function (jogo, metrica, nosso, concorrente, conclusao) {
    const d = c(); const id = 'comp_' + d.proximoId++;
    const comp = { id, jogo, metrica, nossoValor: nosso, valorConcorrente: concorrente, conclusao, criadoEm: new Date().toISOString() };
    d.comparativos.push(comp); s(d); return { ok: true, comparativo: comp };
  };
  window.__conc_estatisticasConcorrencia = function () { const d = c(); return { totalConcorrentes: d.concorrentes.length, totalComparativos: d.comparativos.length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);