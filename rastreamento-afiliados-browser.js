// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🤝 RASTREAMENTO DE AFILIADOS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_afiliados_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { afiliados: [], indicacoes: [], proximoId: 1 }; } catch (e) { return { afiliados: [], indicacoes: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__af_cadastrarAfiliado = function (nome, jogo, codigo, comissao) {
    const d = c(); const id = 'af_' + d.proximoId++;
    const a = { id, nome, jogo: jogo || 'ambos', codigo: codigo || '', comissao: comissao || '0%', indicacoes: 0, conversoes: 0, ganhos: 0, ativo: true, criadoEm: new Date().toISOString() };
    d.afiliados.push(a); s(d); return { ok: true, afiliado: a };
  };
  window.__af_registrarIndicacaoAfiliado = function (codigoAfiliado, indicado, jogo) {
    const d = c(); const af = d.afiliados.find(x => x.codigo === codigoAfiliado); if (!af) return { ok: false, erro: 'Afiliado não encontrado' };
    const id = 'ind_' + d.proximoId++;
    const ind = { id, codigoAfiliado, indicado, jogo: jogo || 'ambos', convertido: false, criadoEm: new Date().toISOString() };
    d.indicacoes.push(ind); af.indicacoes++; s(d); return { ok: true, indicacao: ind };
  };
  window.__af_converterIndicacaoAfiliado = function (idIndicacao) {
    const d = c(); const ind = d.indicacoes.find(x => x.id === idIndicacao); if (!ind) return { ok: false, erro: 'Indicação não encontrada' };
    ind.convertido = true; const af = d.afiliados.find(x => x.codigo === ind.codigoAfiliado); if (af) { af.conversoes++; af.ganhos = (af.ganhos || 0) + 10; }
    s(d); return { ok: true, indicacao: ind };
  };
  window.__af_listarAfiliados = function (jogo, ativo) { const d = c(); let l = d.afiliados; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (ativo !== null) l = l.filter(x => x.ativo === ativo); return l.sort((a, b) => b.conversoes - a.conversoes); };
  window.__af_estatisticasAfiliados = function () { const d = c(); const total = d.afiliados.length; return { total, totalConversoes: d.afiliados.reduce((s, a) => s + (a.conversoes || 0), 0), totalGanhos: d.afiliados.reduce((s, a) => s + (a.ganhos || 0), 0) }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);