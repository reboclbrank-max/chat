// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📄 RELATÓRIO SEMANAL — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_relatorios_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return { relatorios: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  }
  function salvar(c) {
    try {
      c.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(c));
    } catch (e) {}
  }

  window.__rel_gerarRelatorioSemanal = function (dados) {
    const c = carregar();
    const agora = new Date();
    const semanaInicial = new Date(agora);
    semanaInicial.setDate(agora.getDate() - agora.getDay());
    semanaInicial.setHours(0, 0, 0, 0);

    const id = 'rel_' + c.proximoId++;
    const relatorio = {
      id, semanaInicio: semanaInicial.toISOString(),
      semanaFim: new Date(semanaInicial.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      geradoEm: agora.toISOString(), jogo: 'ambos',
      metricas: dados.metricas || { inscritos: 0, downloads: 0, cliques: 0, impressoes: 0, receita: 0 },
      alertas: dados.alertas || [],
      campanhasAtivas: dados.campanhasAtivas || 0,
      postsAgendados: dados.postsAgendados || 0,
      imagensCriadas: dados.imagensCriadas || 0,
      recuperacoesExecutadas: dados.recuperacoesExecutadas || 0,
      recomendacoes: [], conclusao: '',
    };

    const recs = [];
    if (relatorio.metricas.downloads < 10) recs.push('📥 Downloads baixos esta semana. Considere criar campanha de reativação.');
    if (relatorio.alertas.length > 0) recs.push('🚨 Há alertas ativos. Priorize recuperação de métricas em queda.');
    if (relatorio.postsAgendados === 0) recs.push('🕐 Nenhum post agendado para a próxima semana. Crie agenda de posts.');
    if (recs.length === 0) recs.push('✅ Semana estável. Continue com a estratégia atual.');
    relatorio.recomendacoes = recs;
    relatorio.conclusao = recs.join(' ');

    c.relatorios.push(relatorio);
    salvar(c);
    return { ok: true, relatorio };
  };

  window.__rel_listarRelatorios = function (limite) {
    const c = carregar();
    return c.relatorios.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm)).slice(0, limite || 10);
  };

  window.__rel_estatisticasRelatorios = function () {
    const c = carregar();
    return { total: c.relatorios.length, ultimo: c.relatorios.length > 0 ? c.relatorios[c.relatorios.length - 1].geradoEm : null };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);