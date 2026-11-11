// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 OTIMIZAÇÃO DE HORÁRIO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_horario_semana_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { desempenhos: [], proximoId: 1 }; } catch (e) { return { desempenhos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__hor_registrarDesempenho = function (rede, diaSemana, hora, engajamento, jogo) {
    const d = c(); const id = 'hor_' + d.proximoId++;
    const h = { id, rede: rede || 'todos', diaSemana, hora: Number(hora), engajamento: Number(engajamento), jogo: jogo || 'ambos', criadoEm: new Date().toISOString() };
    d.desempenhos.push(h); s(d); return { ok: true, desempenho: h };
  };
  window.__hor_melhorHorarioPorDiaESemana = function (rede, jogo) {
    const d = c(); let l = d.desempenhos.filter(x => x.rede === rede); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
    const pd = {}; for (const x of l) { if (!pd[x.diaSemana]) pd[x.diaSemana] = []; pd[x.diaSemana].push(x); }
    const r = {}; for (const [dia, itens] of Object.entries(pd)) { const mel = itens.reduce((a, b) => b.engajamento > a.engajamento ? b : a); r[dia] = { hora: mel.hora, engajamento: mel.engajamento }; }
    return r;
  };
  window.__hor_listarDesempenhos = function (rede) { const d = c(); if (rede) return d.desempenhos.filter(x => x.rede === rede); return d.desempenhos; };
  window.__hor_estatisticasHorario = function () { const d = c(); return { totalRegistros: d.desempenhos.length, redes: [...new Set(d.desempenhos.map(x => x.rede))] }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);