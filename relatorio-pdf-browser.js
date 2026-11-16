// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 RELATÓRIO PDF — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function (g) {
  'use strict';
  const CHAVE = 'assistente_rebocl_relatorios_pdf_v1';
  function c() { try { return JSON.parse(localStorage.getItem(CHAVE)) || { relatorios: [], proximoId: 1 }; } catch (e) { return { relatorios: [], proximoId: 1 }; } }
  function s(d) { try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch (e) {} }
  window.__pdf_gerarRelatorio = function (titulo, conteudo, jogo, tipo) {
    const d = c(); const id = 'pdf_' + d.proximoId++;
    const r = { id, titulo, conteudo: conteudo || '', jogo: jogo || 'ambos', tipo: tipo || 'semanal', arquivo: 'relatorio_' + id + '.pdf', criadoEm: new Date().toISOString(), enviado: false };
    d.relatorios.push(r); s(d); return { ok: true, relatorio: r };
  };
  window.__pdf_listarRelatorios = function (jogo, tipo) { const d = c(); let l = d.relatorios; if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos'); if (tipo) l = l.filter(x => x.tipo === tipo); return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)); };
  window.__pdf_marcarEnviado = function (id) { const d = c(); const r = d.relatorios.find(x => x.id === id); if (!r) return { ok: false, erro: 'Relatório não encontrado' }; r.enviado = true; s(d); return { ok: true, relatorio: r }; };
  window.__pdf_estatisticasRelatoriosPDF = function () { const d = c(); const total = d.relatorios.length; return { total, enviados: d.relatorios.filter(x => x.enviado).length, naoEnviados: d.relatorios.filter(x => !x.enviado).length }; };
})(typeof globalThis !== 'undefined' ? globalThis : this);