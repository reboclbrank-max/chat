// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎯 METAS E ACOMPANHAMENTO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_metas_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { metas: [], acompanhamentos: [], proximoId: 1 }; } catch (e) { return { metas: [], acompanhamentos: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__met_criarMeta = function (descricao, valorAlvo, periodo, jogo, tipoMetrica) {
    const d = c(); const id = 'meta_' + d.proximoId++;
    const meta = { id, descricao, valorAlvo: Number(valorAlvo), valorAtual: 0, periodo, jogo: jogo || 'ambos', tipoMetrica, status: 'ativa', criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString(), concluidaEm: null };
    d.metas.push(meta); s(d); return { ok: true, meta };
  };
  window.__met_atualizarProgressoMeta = function (id, valorAtual) {
    const d = c(); const meta = d.metas.find(m => m.id === id);
    if (!meta) return { ok: false, erro: 'Meta não encontrada' };
    meta.valorAtual = Number(valorAtual); meta.atualizadoEm = new Date().toISOString();
    if (meta.valorAtual >= meta.valorAlvo && meta.status === 'ativa') { meta.status = 'concluida'; meta.concluidaEm = new Date().toISOString(); }
    s(d); return { ok: true, meta };
  };
  window.__met_listarMetas = function (status, jogo) {
    const d = c(); let l = d.metas; if (status) l = l.filter(m => m.status === status); if (jogo) l = l.filter(m => m.jogo === jogo || m.jogo === 'ambos'); return l;
  };
  window.__met_adicionarAcompanhamento = function (metaId, observacao, valor) {
    const d = c(); const id = 'acomp_' + d.proximoId++;
    const ac = { id, metaId, observacao, valor: Number(valor) || 0, criadoEm: new Date().toISOString() };
    d.acompanhamentos.push(ac); s(d); return { ok: true, acompanhamento: ac };
  };
  window.__met_estatisticasMetas = function () { const d = c(); const total = d.metas.length; const ativas = d.metas.filter(m => m.status === 'ativa').length; const concluidas = d.metas.filter(m => m.status === 'concluida').length; const emRisco = d.metas.filter(m => m.status === 'ativa' && m.valorAlvo > 0 && (m.valorAtual / m.valorAlvo) < 0.5).length; return { total, ativas, concluidas, emRisco }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);