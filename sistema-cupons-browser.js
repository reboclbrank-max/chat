// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎟️ SISTEMA DE CUpons — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_cupons_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { cupons: [], proximoId: 1 }; } catch (e) { return { cupons: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__cup_criarCupom = function (codigo, jogo, desconto, limiteUsos, expiracao) {
    const d = c(); const id = 'cup_' + d.proximoId++;
    const cup = { id, codigo, jogo: jogo || 'ambos', desconto: desconto || '', limiteUsos: Number(limiteUsos) || 0, usos: 0, expiracao: expiracao || null, ativo: true, criadoEm: new Date().toISOString() };
    d.cupons.push(cup); s(d); return { ok: true, cupom: cup };
  };
  window.__cup_usarCupom = function (codigo) {
    const d = c(); const cup = d.cupons.find(x => x.codigo === codigo); if (!cup) return { ok: false, erro: 'Cupom não encontrado' };
    if (!cup.ativo) return { ok: false, erro: 'Cupom inativo' };
    if (cup.limiteUsos > 0 && cup.usos >= cup.limiteUsos) return { ok: false, erro: 'Limite esgotado' };
    cup.usos++; s(d); return { ok: true, cupom: cup };
  };
  window.__cup_listarCupons = function (jogo, ativo) { const d = c(); let l = d.cupons; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (ativo !== null) l = l.filter(x => x.ativo === ativo); return l; };
  window.__cup_estatisticasCupons = function () { const d = c(); const total = d.cupons.length; return { total, ativos: d.cupons.filter(x => x.ativo).length, totalUsos: d.cupons.reduce((s, c) => s + (c.usos || 0), 0) }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);