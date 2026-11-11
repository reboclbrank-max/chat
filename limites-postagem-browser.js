// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛑 LIMITES DE POSTAGEM — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_limites_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { limitePostsDia: 10, limiteHorasSemana: 40, limiteFalhasConsecutivas: 3, postsPorDia: {}, horasPorSemana: {}, falhasConsecutivas: 0, ultimoResetDia: new Date().toISOString().slice(0, 10), proximoId: 1 }; } catch (e) { return { limitePostsDia: 10, limiteHorasSemana: 40, limiteFalhasConsecutivas: 3, postsPorDia: {}, horasPorSemana: {}, falhasConsecutivas: 0, ultimoResetDia: new Date().toISOString().slice(0, 10), proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__lim_registrarPost = function (rede, jogo) {
    const d = c(); const hoje = new Date().toISOString().slice(0, 10);
    if (d.ultimoResetDia !== hoje) { d.postsPorDia = {}; d.ultimoResetDia = hoje; }
    const chave = `${rede}|${jogo}`; d.postsPorDia[chave] = (d.postsPorDia[chave] || 0) + 1;
    const total = Object.values(d.postsPorDia).reduce((a, b) => a + b, 0); const excedeu = total > d.limitePostsDia;
    s(d); return { ok: !excedeu, totalHoje: total, limite: d.limitePostsDia, excedeu };
  };
  window.__lim_registrarFalha = function () { const d = c(); d.falhasConsecutivas = (d.falhasConsecutivas || 0) + 1; const b = d.falhasConsecutivas >= d.limiteFalhasConsecutivas; s(d); return { ok: !b, falhasConsecutivas: d.falhasConsecutivas, limite: d.limiteFalhasConsecutivas, bloqueado: b }; };
  window.__lim_resetarFalhas = function () { const d = c(); d.falhasConsecutivas = 0; s(d); return { ok: true }; };
  window.__lim_definirLimite = function (tipo, valor) { const d = c(); if (tipo === 'postsDia') d.limitePostsDia = Number(valor); if (tipo === 'horasSemana') d.limiteHorasSemana = Number(valor); if (tipo === 'falhasConsecutivas') d.limiteFalhasConsecutivas = Number(valor); s(d); return { ok: true }; };
  window.__lim_estatisticasLimites = function () { const d = c(); return { limitePostsDia: d.limitePostsDia, limiteHorasSemana: d.limiteHorasSemana, limiteFalhasConsecutivas: d.limiteFalhasConsecutivas, falhasConsecutivas: d.falhasConsecutivas || 0 }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);