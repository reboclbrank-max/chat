// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌍 AGENDAMENTO POR FUSO HORÁRIO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_fuso_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { fusos: [], proximoId: 1 }; } catch (e) { return { fusos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__fuso_configurarFuso = function (rede, fuso, horarioPadrao, jogo) {
    const d = c(); const id = 'fuso_' + d.proximoId++;
    const f = { id, rede: rede || 'todos', fuso: fuso || 'America/Sao_Paulo', horarioPadrao: horarioPadrao || '10:00', jogo: jogo || 'ambos', ativo: true, criadoEm: new Date().toISOString() };
    d.fusos.push(f); s(d); return { ok: true, fuso: f };
  };
  window.__fuso_converterHorario = function (horarioLocal, fusoOrigem, fusoDestino) {
    const offsets = { 'America/Sao_Paulo': -3, 'America/New_York': -5, 'Europe/London': 0, 'Asia/Tokyo': 9, 'UTC': 0 };
    const o1 = offsets[fusoOrigem] || -3; const o2 = offsets[fusoDestino] || -3;
    const [h, m] = horarioLocal.split(':').map(Number);
    let novaHora = ((h + o2 - o1) % 24 + 24) % 24;
    return { hora: novaHora.toString().padStart(2, '0') + ':' + m.toString().padStart(2, '0') };
  };
  window.__fuso_listarFusos = function (jogo) { const d = c(); if (jogo) return d.fusos.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.fusos; };
  window.__fuso_estatisticasFusos = function () { const d = c(); return { total: d.fusos.length, ativos: d.fusos.filter(x => x.ativo).length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);