// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🌐 SISTEMA LIMITE MÁXIMO — browser (expondo __slm_*)
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function(){
  const STORAGE_KEY = 'rebocl_sistema-limite-max';
  function ler() { try { const b = localStorage.getItem(STORAGE_KEY); return b ? JSON.parse(b) : { ativo: false, limite_maximo: true, camadas_ativas: 0, orquestrador_ativo: false, piloto_ativo: false, ultima_ativacao: null, proximoId: 1 }; } catch (e) { return { ativo: false, limite_maximo: true, camadas_ativas: 0, orquestrador_ativo: false, piloto_ativo: false, ultima_ativacao: null, proximoId: 1 }; } }
  function gravar(d) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch (e) {} }

  window.__slm_ativar = function() { const d = ler(); const id = 'slm_' + d.proximoId++; d.ativo = true; d.limite_maximo = true; d.ultima_ativacao = new Date().toISOString();
    const camadas = ['relatorios-conteudo','gamificacao','calendario-editorial','hashtags','cupons','afiliados','discord','telegram','webhooks','fuso-horario','detecao-spam','moderacao','velocidade-resposta','indicacoes-rede','recompensas-engajamento','monitoramento-mencoes','roi-campanha','segmentacao-publico','influenciadores','calendario-lancamentos','sazonalidade','alertas-engajamento','automacao-followup','gerenciamento-assets','analise-concorrencia-rede','planner-visual','aprovacao-cliente','exportacao-multipla','backup-nuvem','notificacoes-push','templates-resposta','monitoramento-marca','cupom-indicacao','analise-concorrencia-preco','relatorio-executivo','metricas-ricao','conteudo-viral','gestao-comunidade','teste-assunto-email','relatorio-mensal','desempenho-rede','ciclo-vida-cliente','automacao-redes-sociais','hashtags-avancado','plano-acao','dashboard-realtime','concorrencia-conteudo','tendencias','equipe-marketing','desempenho-mensal','piloto-automatico','orquestrador-maximo','detector-anomalias','loop-aprendizado','auto-otimizador-horarios','dashboard-limite','recuperacao-cadeia','integracao-cruzada','auto-escalada'];
    d.camadas_ativas = camadas.length; d.orquestrador_ativo = true; d.piloto_ativo = true; gravar(d); return { ok: true, sistema: d, camadas_ativas: d.camadas_ativas }; };
  window.__slm_desativar = function() { const d = ler(); d.ativo = false; d.limite_maximo = false; gravar(d); return { ok: true }; };
  window.__slm_status = function() { const d = ler(); return { ativo: d.ativo, limite_maximo: d.limite_maximo, camadas_ativas: d.camadas_ativas, orquestrador_ativo: d.orquestrador_ativo, piloto_ativo: d.piloto_ativo, ultima_ativacao: d.ultima_ativacao }; };
  window.__slm_limpar = function() { localStorage.removeItem(STORAGE_KEY); return { ok: true }; };
})();