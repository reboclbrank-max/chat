// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎮 GAMIFICAÇÃO DE MARKETING — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_gamificacao_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { usuarios: [], badges: [], proximoId: 1 }; } catch (e) { return { usuarios: [], badges: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__gam_adicionarPontos = function (idUsuario, pontos, jogo, acao) {
    const d = c(); const id = 'gam_' + d.proximoId++;
    let u = d.usuarios.find(x => x.idUsuario === idUsuario);
    if (!u) { u = { id, idUsuario, jogo: jogo || 'ambos', pontos: 0, nivel: 1, badges: [], criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() }; d.usuarios.push(u); }
    u.pontos += Number(pontos) || 0; u.nivel = Math.floor(u.pontos / 100) + 1; u.atualizadoEm = new Date().toISOString();
    if (acao && !u.badges.includes(acao)) u.badges.push(acao);
    s(d); return { ok: true, usuario: u };
  };
  window.__gam_listarUsuarios = function (jogo) { const d = c(); if (jogo) return d.usuarios.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.usuarios.sort((a, b) => b.pontos - a.pontos); };
  window.__gam_estatisticasGamificacao = function () { const d = c(); const total = d.usuarios.length; const tp = d.usuarios.reduce((s, u) => s + u.pontos, 0); return { total, totalPontos: tp, mediaPontos: total > 0 ? (tp / total).toFixed(2) : 0 }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);