// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 ORQUESTRADOR MÁXIMO MARKETING — browser (expondo __omm_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_orquestrador-maximo-marketing';
  function ler() {
    try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, modo: 'limite', coordenacoes: [], ajuste_automatico: true, limite_maximo: true, ultima_execucao: null, historico: [], proximoId: 1 }; } catch (e) { return { ativo: false, modo: 'limite', coordenacoes: [], ajuste_automatico: true, limite_maximo: true, ultima_execucao: null, historico: [], proximoId: 1 }; }
  }
  function gravar(d) { try { d.atualizadoEm = new Date().toISOString(); localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__omm_ler = ler;
  window.__omm_ativar = function(modo, ajusteAutomatico, limiteMaximo) {
    const d = ler(); const id = 'orm_' + d.proximoId++; d.ativo = true; d.modo = modo || 'limite'; d.ajuste_automatico = ajusteAutomatico !== false; d.limite_maximo = limiteMaximo !== false;
    const coord = { id, modo: d.modo, ativo: true, executadoEm: new Date().toISOString(), acoes: 0 };
    d.coordenacoes.push(coord); d.ultima_execucao = coord.executadoEm; gravar(d);
    return { ok: true, orquestrador: d, coord };
  };
  window.__omm_desativar = function() { const d = ler(); d.ativo = false; gravar(d); return { ok: true }; };
  window.__omm_coordenar = function() {
    const d = ler(); if (!d.ativo) return { ok: false, erro: 'Orquestrador não ativo' };
    const exec = { id: 'exec_' + d.proximoId++, executadoEm: new Date().toISOString(), camadas: [], acoes_disparadas: 0 };
    const camadas = ['relatorios-conteudo','gamificacao','calendario-editorial','hashtags','cupons','afiliados','discord','telegram','webhooks','fuso-horario','detecao-spam','moderacao','velocidade-resposta','indicacoes-rede','recompensas-engajamento','monitoramento-mencoes','roi-campanha','segmentacao-publico','influenciadores','calendario-lancamentos','sazonalidade','alertas-engajamento','automacao-followup','gerenciamento-assets','analise-concorrencia-rede','planner-visual','aprovacao-cliente','exportacao-multipla','backup-nuvem','notificacoes-push','templates-resposta','monitoramento-marca','cupom-indicacao','analise-concorrencia-preco','relatorio-executivo','metricas-ricao','conteudo-viral','gestao-comunidade','teste-assunto-email','relatorio-mensal','desempenho-rede','ciclo-vida-cliente','automacao-redes-sociais','hashtags-avancado','plano-acao','dashboard-realtime','concorrencia-conteudo','tendencias','equipe-marketing','desempenho-mensal','piloto-automatico'];
    camadas.forEach(camada => { exec.camadas.push({ camada, status: 'sincronizado', timestamp: new Date().toISOString() }); exec.acoes_disparadas++; });
    d.coordenacoes.push(exec); d.ultima_execucao = exec.executadoEm; d.historico.push({ tipo: 'coordenacao', executadoEm: exec.executadoEm, acoes: exec.acoes_disparadas }); if (d.historico.length > 300) d.historico = d.historico.slice(-300); gravar(d);
    return { ok: true, execucao: exec };
  };
  window.__omm_estatisticas = function() { const d = ler(); return { ativo: d.ativo, modo: d.modo, ajuste_automatico: d.ajuste_automatico, limite_maximo: d.limite_maximo, total_coordenacoes: d.coordenacoes.length, ultima_execucao: d.ultima_execucao, total_execucoes: d.historico.length }; };
  window.__omm_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();