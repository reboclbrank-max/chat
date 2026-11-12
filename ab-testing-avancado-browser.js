// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧪 A/B TESTING AVANÇADO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_ab_testing_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { testes: [], variantes: [], resultados: [], proximoId: 1 }; } catch (e) { return { testes: [], variantes: [], resultados: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__ab_criarTeste = function (nome, descricao, jogo, metricaVencedor) {
    const d = c(); const id = 'ab_' + d.proximoId++;
    const t = { id, nome, descricao: descricao || '', jogo: jogo || 'ambos', metricaVencedor: metricaVencedor || 'cliques', status: 'ativo', criadoEm: new Date().toISOString(), vencedor: null };
    d.testes.push(t); s(d); return { ok: true, teste: t };
  };
  window.__ab_adicionarVariante = function (testeId, nome, conteudo, rede) {
    const d = c(); const id = 'var_' + d.proximoId++;
    const v = { id, testeId, nome: nome || '', conteudo: conteudo || '', rede: rede || 'todos', cliques: 0, conversoes: 0, impressoes: 0, criadoEm: new Date().toISOString() };
    d.variantes.push(v); s(d); return { ok: true, variante: v };
  };
  window.__ab_registrarResultadoVariante = function (varianteId, cliques, conversoes, impressoes) {
    const d = c(); const v = d.variantes.find(x => x.id === varianteId); if (!v) return { ok: false, erro: 'Variante não encontrada' };
    v.cliques = Number(cliques) || 0; v.conversoes = Number(conversoes) || 0; v.impressoes = Number(impressoes) || 0; s(d); return { ok: true, variante: v };
  };
  window.__ab_declararVencedor = function (testeId) {
    const d = c(); const t = d.testes.find(x => x.id === testeId); if (!t) return { ok: false, erro: 'Teste não encontrado' };
    const variantes = d.variantes.filter(v => v.testeId === testeId); if (!variantes.length) return { ok: false, erro: 'Sem variantes' };
    const vencedor = variantes.reduce((a, b) => { const sa = (a.cliques || 0) + (a.conversoes || 0) * 10; const sb = (b.cliques || 0) + (b.conversoes || 0) * 10; return sb > sa ? b : a; });
    t.vencedor = vencedor.id; t.status = 'concluido'; s(d); return { ok: true, vencedor: vencedor, teste: t };
  };
  window.__ab_listarTestes = function (jogo) { const d = c(); if (jogo) return d.testes.filter(x => x.jogo === jogo || x.jogo === 'ambos'); return d.testes; };
  window.__ab_estatisticasAB = function () { const d = c(); const total = d.testes.length; return { total, concluidos: d.testes.filter(x => x.status === 'concluido').length, ativos: d.testes.filter(x => x.status === 'ativo').length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);