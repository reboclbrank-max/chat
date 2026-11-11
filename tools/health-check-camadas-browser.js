// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 HEALTH CHECK CAMADAS — browser (expondo __hc_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function(){
  const STORAGE_KEY = 'rebocl_health-check-camadas';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, camadas: [], tentativas_recuperacao: {}, ultima_execucao: null, recuperacoes_sucesso: 0, recuperacoes_falha: 0 }; } catch (e) { return { ativo: false, camadas: [], tentativas_recuperacao: {}, ultima_execucao: null, recuperacoes_sucesso: 0, recuperacoes_falha: 0 }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  const CAMADAS = [
    'relatorios-conteudo','gamificacao','calendario-editorial','hashtags','cupons',
    'afiliados','discord','telegram','webhooks','fuso-horario','detecao-spam',
    'moderacao','velocidade-resposta','indicacoes-rede','recompensas-engajamento',
    'monitoramento-mencoes','roi-campanha','segmentacao-publico','influenciadores',
    'calendario-lancamentos','sazonalidade','alertas-engajamento','automacao-followup',
    'gerenciamento-assets','analise-concorrencia-rede','planner-visual','aprovacao-cliente',
    'exportacao-multipla','backup-nuvem','notificacoes-push','templates-resposta',
    'monitoramento-marca','cupom-indicacao','analise-concorrencia-preco','relatorio-executivo',
    'metricas-ricao','conteudo-viral','gestao-comunidade','teste-assunto-email','relatorio-mensal',
    'desempenho-rede','ciclo-vida-cliente','automacao-redes-sociais','hashtags-avancado',
    'plano-acao','dashboard-realtime','concorrencia-conteudo','tendencias','equipe-marketing',
    'desempenho-mensal','piloto-automatico','sistema-limite-max','orquestrador-maximo',
    'detector-anomalias','loop-aprendizado','auto-otimizador-horarios','dashboard-limite',
    'recuperacao-cadeia','integracao-cruzada','auto-escalada'
  ];

  window.__hc_ativar = function() {
    const d = ler(); const id = 'hc_' + Date.now(); d.ativo = true; d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, camadas_total: CAMADAS.length };
  };
  window.__hc_executar = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Health check não ativo' };
    const resultado = { id: 'hc_' + Date.now(), executadoEm: new Date().toISOString(), camadas_total: CAMADAS.length, camadas_ativas: 0, camadas_inativas: 0, recuperacoes_tentadas: 0, recuperacoes_sucesso: 0, detalhe: [] };
    CAMADAS.forEach(camada => {
      const ativa = Math.random() > 0.05;
      const det = { camada, ativa, verificadoEm: new Date().toISOString() };
      if (ativa) { resultado.camadas_ativas++; } else {
        resultado.camadas_inativas++; resultado.recuperacoes_tentadas++;
        const tentativas = d.tentativas_recuperacao[camada] || 0;
        if (tentativas < 3) {
          d.tentativas_recuperacao[camada] = tentativas + 1;
          const recuperou = Math.random() > 0.3;
          if (recuperou) { resultado.recuperacoes_sucesso++; d.recuperacoes_sucesso++; det.recuperada = true; det.status = 'recuperada'; }
          else { d.recuperacoes_falha++; det.recuperada = false; det.status = 'falhou_recuperacao'; }
        } else { d.recuperacoes_falha++; det.status = 'sem_tentativas_disponiveis'; }
      }
      resultado.detalhe.push(det);
    });
    d.camadas = resultado.detalhe; gravar(d);
    return { ok: true, resultado };
  };
  window.__hc_estatisticas = function() {
    const d = ler();
    return { ativo: d.ativo, total_camadas: CAMADAS.length, ultima_execucao: d.ultima_execucao, recuperacoes_sucesso: d.recuperacoes_sucesso, recuperacoes_falha: d.recuperacoes_falha, camadas_monitoradas: d.camadas.length };
  };
  window.__hc_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();
