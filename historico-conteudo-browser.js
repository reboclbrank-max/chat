// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📚 HISTÓRICO DE CONTEÚDO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_historico_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { versoes: [], proximoId: 1 }; } catch (e) { return { versoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__hist_registrarVersao = function (conteudoId, conteudo, versao, autor, mudanca) {
    const d = c(); const id = 'ver_' + d.proximoId++;
    const v = { id, conteudoId, conteudo, versao: versao || '1.0', autor: autor || 'sistema', mudanca: mudanca || '', criadoEm: new Date().toISOString() };
    d.versoes.push(v); s(d); return { ok: true, versao: v };
  };
  window.__hist_listarVersoes = function (conteudoId) { const d = c(); return d.versoes.filter(v => v.conteudoId === conteudoId).sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__hist_restaurarVersao = function (versaoId) { const d = c(); const v = d.versoes.find(v => v.id === versaoId); if (!v) return { ok: false, erro: 'Versão não encontrada' }; return { ok: true, conteudo: v.conteudo, versao: v }; };
  window.__hist_estatisticasHistorico = function () { const d = c(); return { totalVersoes: d.versoes.length, conteudosUnicos: new Set(d.versoes.map(v => v.conteudoId)).size }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);