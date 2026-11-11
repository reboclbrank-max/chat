// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔍 VALIDAÇÃO DE LINK AVANÇADA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_validacao_link_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { validacoes: [], linksBloqueados: [], proximoId: 1 }; } catch (e) { return { validacoes: [], linksBloqueados: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__val_validarLink = function (url, contexto) {
    const d = c(); const id = 'val_' + d.proximoId++;
    const bloqueado = d.linksBloqueados.some(b => url.includes(b));
    const valido = url.startsWith('http') && !bloqueado;
    const v = { id, url, contexto: contexto || '', valido, bloqueado, criadoEm: new Date().toISOString() };
    d.validacoes.push(v); s(d); return { ok: true, valido, bloqueado, link: v };
  };
  window.__val_bloquearLink = function (palavra) { const d = c(); if (!d.linksBloqueados.includes(palavra)) d.linksBloqueados.push(palavra); s(d); return { ok: true, linksBloqueados: d.linksBloqueados }; };
  window.__val_listarValidacoes = function (limite) { const d = c(); return d.validacoes.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite || 20); };
  window.__val_estatisticasValidacao = function () { const d = c(); const total = d.validacoes.length; return { total, validos: d.validacoes.filter(v => v.valido).length, bloqueados: d.validacoes.filter(v => v.bloqueado).length, linksBloqueados: d.linksBloqueados.length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);