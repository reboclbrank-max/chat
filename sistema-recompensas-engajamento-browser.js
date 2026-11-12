// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏆 SISTEMA DE RECOMPENSAS DE ENGAJAMENTO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_recompensas_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { recompensas: [], resgates: [], proximoId: 1 }; } catch (e) { return { recompensas: [], resgates: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__rec_cadastrarRecompensa = function (nome, tipo, pontosNecessarios, descricao, jogo) {
    const d = c(); const id = 'rec_' + d.proximoId++;
    const r = { id, nome, tipo: tipo || 'desconto', pontosNecessarios: Number(pontosNecessarios) || 0, descricao: descricao || '', jogo: jogo || 'ambos', ativa: true, criadoEm: new Date().toISOString() };
    d.recompensas.push(r); s(d); return { ok: true, recompensa: r };
  };
  window.__rec_resgatarRecompensa = function (idUsuario, recompensaId, jogo) {
    const d = c(); const r = d.recompensas.find(x => x.id === recompensaId); if (!r) return { ok: false, erro: 'Recompensa não encontrada' };
    if (!r.ativa) return { ok: false, erro: 'Recompensa inativa' };
    const id = 'resg_' + d.proximoId++;
    const resgate = { id, idUsuario, recompensaId, jogo: jogo || 'ambos', pontosGastos: r.pontosNecessarios, criadoEm: new Date().toISOString(), status: 'pendente' };
    d.resgates.push(resgate); s(d); return { ok: true, resgate: resgate };
  };
  window.__rec_listarRecompensas = function (jogo, ativa) { const d = c(); let l = d.recompensas; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (ativa !== null) l = l.filter(x => x.ativa === ativa); return l; };
  window.__rec_estatisticasRecompensas = function () { const d = c(); const total = d.recompensas.length; return { total, ativas: d.recompensas.filter(x => x.ativa).length, totalResgates: d.resgates.length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);