// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛡️ MODERAÇÃO DE CONTEÚDO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_moderacao_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { conteudos: [], proximoId: 1 }; } catch (e) { return { conteudos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__mod_submeterConteudo = function (texto, tipo, rede, jogo, autor) {
    const d = c(); const id = 'mod_' + d.proximoId++;
    const con = { id, texto: texto || '', tipo: tipo || 'post', rede: rede || 'todos', jogo: jogo || 'ambos', autor: autor || '', status: 'pendente', motivo: '', criadoEm: new Date().toISOString(), revisadoEm: null, revisadoPor: null };
    d.conteudos.push(con); s(d); return { ok: true, conteudo: con };
  };
  window.__mod_aprovarConteudo = function (id, revisadoPor, motivo) {
    const d = c(); const con = d.conteudos.find(x => x.id === id); if (!con) return { ok: false, erro: 'Conteúdo não encontrado' };
    con.status = 'aprovado'; con.revisadoPor = revisadoPor || 'sistema'; con.motivo = motivo || ''; con.revisadoEm = new Date().toISOString(); s(d); return { ok: true, conteudo: con };
  };
  window.__mod_rejeitarConteudo = function (id, revisadoPor, motivo) {
    const d = c(); const con = d.conteudos.find(x => x.id === id); if (!con) return { ok: false, erro: 'Conteúdo não encontrado' };
    con.status = 'rejeitado'; con.revisadoPor = revisadoPor || 'sistema'; con.motivo = motivo || ''; con.revisadoEm = new Date().toISOString(); s(d); return { ok: true, conteudo: con };
  };
  window.__mod_listarConteudos = function (status, jogo) { const d = c(); let l = d.conteudos; if (status) l = l.filter(x => x.status === status); if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__mod_estatisticasModeracao = function () { const d = c(); const total = d.conteudos.length; return { total, pendentes: d.conteudos.filter(x => x.status === 'pendente').length, aprovados: d.conteudos.filter(x => x.status === 'aprovado').length, rejeitados: d.conteudos.filter(x => x.status === 'rejeitado').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);