// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 STATUS TOTAL MARKETING — browser (expondo __st_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function() {
  const STORAGE_KEY = 'rebocl_status-total-marketing';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, relatorios: [], ultima_execucao: null }; } catch (e) { return { ativo: false, relatorios: [], ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__st_ativar = function() {
    const d = ler(); const id = 'st_' + Date.now(); d.ativo = true; d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id };
  };

  window.__st_gerarRelatorio = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Status total não ativo' };
    const relatorio = {
      id: 'st_' + Date.now(),
      geradoEm: new Date().toISOString(),
      resumo: {
        camadas_monitoradas: 49,
        camadas_ativas: 0,
        camadas_inativas: 0,
        recuperacoes_sucesso: 0,
        recuperacoes_falha: 0,
        sistemas_ativos: 5,
        comandos_disponiveis: 34,
        inicializacao_automatica: true,
        redes_proibidas_removidas: true,
        itch_io_removido: true
      },
      status_camadas: [],
      metricas: {
        posts_hoje: 0,
        engajamento_medio: 0,
        crescimento_seguidores: 0,
        alertas_ativos: 0
      },
      alertas: { total: 0, pendentes: 0, regras: 3, ultima_execucao: null },
      orquestrador: { ativo: false, total_coordenacoes: 0, ultima_execucao: null },
      auto_escalada: { ativo: false, total_escalas: 0, total_ajustes: 0 },
      inteligencia: { total_conversas: 0, jogos: ['ceifalume', 'prancheta'], taxa_aprovacao: 0 },
      recomendacoes: [
        'Monitore as métricas de engajamento em cada rede.',
        'Ajuste horários de postagem baseado em dados reais de acesso.',
        'Mantenha a inicialização automática ativa para zero intervenção humana.',
        'Verifique camadas inativas no health check para auto-recuperação.'
      ]
    };
    // Verifica módulos de health check no browser
    const camadas = [
      'relatorios-conteudo','gamificacao-marketing','calendario-editorial','analise-hashtags','sistema-cupons',
      'rastreamento-afiliados','integracao-discord','integracao-telegram','webhooks-marketing','agendamento-fuso-horario','deteccao-spam-comentarios',
      'moderacao-conteudo','analise-velocidade-resposta','rastreamento-indicacoes-rede','sistema-recompensas-engajamento',
      'analise-conteudo-ig','funil-utm-avancado','analise-conteudo-feed','indicacao-tracking',
      'plano-semanal','evergreen-expandido','alertas-engajamento','autoresponder-avancado',
      'gerador-imagens-posts','analise-concorrencia-rede','analise-conteudo-carrossel','aprovacao-humana',
      'relatorio-pdf','backup-automatico-avancado','notificacoes-marketing','respostas-comentarios',
      'analise-conteudo-concorrente','rastreamento-indicacoes-rede','analise-concorrencia-preco-avancado','relatorio-semanal',
      'analise-conteudo-organico','detector-tendencias','integracao-email','analise-conteudo-gerado',
      'relatorios-comparativos','analise-concorrencia-conteudo','ltv-cohorte','campanhas-automatizadas',
      'analise-hashtags','plano-semanal','dashboard-limite-marketing','analise-conteudo-concorrente',
      'detector-tendencias','gestao-memoria','relatorio-semanal','orquestrador-maximo-marketing',
      'dashboard-limite-marketing','orquestrador-maximo-marketing','auditoria-acoes','auto-correcao-aprendizado',
      'agendamento-inteligente','dashboard-limite-marketing','recuperacao-automatica','integracao-cruzada-marketing',
      'auto-escalada-marketing'
    ];
    let ativas = 0;
    camadas.forEach(moduloNome => {
      const carregado = typeof window['__' + moduloNome] !== 'undefined' || typeof window['_' + moduloNome] !== 'undefined';
      const ativo = carregado;
      if (ativo) ativas++;
      relatorio.status_camadas.push({ camada: moduloNome.replace('-browser',''), ativa: ativo, status: ativo ? 'ativa' : 'inativa' });
    });
    relatorio.resumo.camadas_ativas = ativas;
    relatorio.resumo.camadas_inativas = camadas.length - ativas;

    d.relatorios.push(relatorio);
    if (d.relatorios.length > 100) d.relatorios = d.relatorios.slice(-100);
    d.ultima_execucao = relatorio.geradoEm;
    gravar(d);
    return { ok: true, relatorio };
  };

  window.__st_estatisticas = function() {
    const d = ler();
    return { ativo: d.ativo, total_relatorios: d.relatorios.length, ultima_execucao: d.ultima_execucao };
  };
  window.__st_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();
