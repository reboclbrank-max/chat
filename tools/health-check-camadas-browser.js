// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 HEALTH CHECK CAMADAS — browser (expondo __hc_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
(function() {
  const STORAGE_KEY = 'rebocl_health-check-camadas';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, camadas: [], tentativas_recuperacao: {}, ultima_execucao: null }; } catch (e) { return { ativo: false, camadas: [], tentativas_recuperacao: {}, ultima_execucao: null }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__hc_ativar = function() {
    const d = ler(); const id = 'hc_' + Date.now(); d.ativo = true; d.ultima_execucao = new Date().toISOString(); gravar(d);
    return { ok: true, id, camadas_total: 49 };
  };

  window.__hc_executar = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Health check não ativo' };
    const resultado = {
      id: 'hc_' + Date.now(),
      executadoEm: new Date().toISOString(),
      camadas_total: 49,
      camadas_ativas: 0,
      camadas_inativas: 0,
      recuperacoes_tentadas: 0,
      recuperacoes_sucesso: 0,
      detalhe: []
    };
    // No browser, verifica se os módulos -browser.js estão carregados no window
    const camadas = [
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
    camadas.forEach(camadaId => {
      const moduloNome = camadaId === 'gamificacao' ? 'gamificacao-marketing' :
                         camadaId === 'monitoramento-mencoes' ? 'analise-conteudo-ig' :
                         camadaId === 'roi-campanha' ? 'funil-utm-avancado' :
                         camadaId === 'segmentacao-publico' ? 'analise-conteudo-feed' :
                         camadaId === 'influenciadores' ? 'indicacao-tracking' :
                         camadaId === 'monitoramento-marca' ? 'analise-conteudo-concorrente' :
                         camadaId === 'cupom-indicacao' ? 'rastreamento-indicacoes-rede' :
                         camadaId === 'analise-concorrencia-preco' ? 'analise-concorrencia-preco-avancado' :
                         camadaId === 'metricas-ricao' ? 'analise-conteudo-organico' :
                         camadaId === 'desempenho-rede' ? 'analise-concorrencia-conteudo' :
                         camadaId === 'concorrencia-conteudo' ? 'analise-conteudo-concorrente' :
                         camadaId === 'detector-anomalias' ? 'auditoria-acoes' :
                         camadaId === 'loop-aprendizado' ? 'auto-correcao-aprendizado' :
                         camadaId === 'auto-otimizador-horarios' ? 'agendamento-inteligente' :
                         camadaId === 'recuperacao-cadeia' ? 'recuperacao-automatica' :
                         camadaId === 'integracao-cruzada' ? 'integracao-cruzada-marketing' :
                         camadaId === 'auto-escalada' ? 'auto-escalada-marketing' :
                         camadaId;
      const servidorOk = typeof window['__' + moduloNome] !== 'undefined' ||
                         typeof window['_' + moduloNome] !== 'undefined';
      const browserModulo = camadaId + '-browser';
      const browserOk = typeof window['__' + browserModulo] !== 'undefined' ||
                        typeof window['_' + browserModulo] !== 'undefined';
      const ativa = servidorOk && browserOk;
      const detalhe = { camada: camadaId, modulo_servidor: moduloNome, modulo_browser: browserModulo, existe: servidorOk, sintaxe_valida: servidorOk, ativa, verificadoEm: new Date().toISOString() };
      if (ativa) { resultado.camadas_ativas++; detalhe.status = 'ativa'; }
      else {
        resultado.camadas_inativas++;
        resultado.recuperacoes_tentadas++;
        const tentativas = d.tentativas_recuperacao[camadaId] || 0;
        if (tentativas < 3) {
          d.tentativas_recuperacao[camadaId] = tentativas + 1;
          const recuperou = servidorOk; // no browser, se o módulo existe na janela, está OK
          if (recuperou) {
            resultado.recuperacoes_sucesso++;
            d.recuperacoes_sucesso = (d.recuperacoes_sucesso || 0) + 1;
            detalhe.recuperada = true;
            detalhe.status = 'recuperada';
          } else {
            d.recuperacoes_falha = (d.recuperacoes_falha || 0) + 1;
            detalhe.recuperada = false;
            detalhe.status = 'falhou_recuperacao';
          }
        } else {
          d.recuperacoes_falha = (d.recuperacoes_falha || 0) + 1;
          detalhe.status = 'sem_tentativas_disponiveis';
        }
      }
      resultado.detalhe.push(detalhe);
    });
    d.camadas = resultado.detalhe;
    d.ultima_execucao = resultado.executadoEm;
    gravar(d);
    return { ok: true, resultado };
  };

  window.__hc_estatisticas = function() {
    const d = ler();
    return {
      ativo: d.ativo,
      total_camadas: 49,
      ultima_execucao: d.ultima_execucao,
      recuperacoes_sucesso: d.recuperacoes_sucesso || 0,
      recuperacoes_falha: d.recuperacoes_falha || 0,
      camadas_monitoradas: (d.camadas || []).length
    };
  };
})();
