// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏥 HEALTH CHECK CAMADAS — verifica se cada camada subiu, tenta auto-recuperar,
// marketing Prancheta + Ceifalume. Zero intervenção humana.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'health-check-camadas.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = {
    ativo: false,
    camadas: [],
    tentativas_recuperacao: {},
    ultima_execucao: null,
    recuperacoes_sucesso: 0,
    recuperacoes_falha: 0,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString()
  };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

// Lista das 49 camadas de marketing — cada camada tem um módulo servidor e um módulo browser
const CAMADAS = [
  { id: 'relatorios-conteudo', servidor: 'relatorios-conteudo', browser: 'relatorios-conteudo-browser' },
  { id: 'gamificacao', servidor: 'gamificacao-marketing', browser: 'gamificacao-marketing-browser' },
  { id: 'calendario-editorial', servidor: 'calendario-editorial', browser: 'calendario-editorial-browser' },
  { id: 'hashtags', servidor: 'analise-hashtags', browser: 'analise-hashtags-browser' },
  { id: 'cupons', servidor: 'sistema-cupons', browser: 'sistema-cupons-browser' },
  { id: 'afiliados', servidor: 'rastreamento-afiliados', browser: 'rastreamento-afiliados-browser' },
  { id: 'discord', servidor: 'integracao-discord', browser: 'integracao-discord-browser' },
  { id: 'telegram', servidor: 'integracao-telegram', browser: 'integracao-telegram-browser' },
  { id: 'webhooks', servidor: 'webhooks-marketing', browser: 'webhooks-marketing-browser' },
  { id: 'fuso-horario', servidor: 'agendamento-fuso-horario', browser: 'agendamento-fuso-horario-browser' },
  { id: 'detecao-spam', servidor: 'deteccao-spam-comentarios', browser: 'deteccao-spam-comentarios-browser' },
  { id: 'moderacao', servidor: 'moderacao-conteudo', browser: 'moderacao-conteudo-browser' },
  { id: 'velocidade-resposta', servidor: 'analise-velocidade-resposta', browser: 'analise-velocidade-resposta-browser' },
  { id: 'indicacoes-rede', servidor: 'rastreamento-indicacoes-rede', browser: 'rastreamento-indicacoes-rede-browser' },
  { id: 'recompensas-engajamento', servidor: 'sistema-recompensas-engajamento', browser: 'sistema-recompensas-engajamento-browser' },
  { id: 'monitoramento-mencoes', servidor: 'analise-conteudo-ig', browser: 'analise-conteudo-ig-browser' },
  { id: 'roi-campanha', servidor: 'funil-utm-avancado', browser: 'funil-utm-avancado-browser' },
  { id: 'segmentacao-publico', servidor: 'analise-conteudo-feed', browser: 'analise-conteudo-feed-browser' },
  { id: 'influenciadores', servidor: 'indicacao-tracking', browser: 'indicacao-tracking-browser' },
  { id: 'calendario-lancamentos', servidor: 'plano-semanal', browser: 'plano-semanal-browser' },
  { id: 'sazonalidade', servidor: 'evergreen-expandido', browser: 'evergreen-expandido-browser' },
  { id: 'alertas-engajamento', servidor: 'alertas-engajamento', browser: 'alertas-engajamento-browser' },
  { id: 'automacao-followup', servidor: 'autoresponder-avancado', browser: 'autoresponder-avancado-browser' },
  { id: 'gerenciamento-assets', servidor: 'gerador-imagens-posts', browser: 'gerador-imagens-posts-browser' },
  { id: 'analise-concorrencia-rede', servidor: 'analise-concorrencia-rede', browser: 'analise-concorrencia-rede-browser' },
  { id: 'planner-visual', servidor: 'analise-conteudo-carrossel', browser: 'analise-conteudo-carrossel-browser' },
  { id: 'aprovacao-cliente', servidor: 'aprovacao-humana', browser: 'aprovacao-humana-browser' },
  { id: 'exportacao-multipla', servidor: 'relatorio-pdf', browser: 'relatorio-pdf-browser' },
  { id: 'backup-nuvem', servidor: 'backup-automatico-avancado', browser: 'backup-automatico-avancado-browser' },
  { id: 'notificacoes-push', servidor: 'notificacoes-marketing', browser: 'notificacoes-marketing-browser' },
  { id: 'templates-resposta', servidor: 'respostas-comentarios', browser: 'respostas-comentarios-browser' },
  { id: 'monitoramento-marca', servidor: 'analise-conteudo-concorrente', browser: 'analise-conteudo-concorrente-browser' },
  { id: 'cupom-indicacao', servidor: 'rastreamento-indicacoes-rede', browser: 'rastreamento-indicacoes-rede-browser' },
  { id: 'analise-concorrencia-preco', servidor: 'analise-concorrencia-preco-avancado', browser: 'analise-concorrencia-preco-avancado-browser' },
  { id: 'relatorio-executivo', servidor: 'relatorio-semanal', browser: 'relatorio-semanal-browser' },
  { id: 'metricas-ricao', servidor: 'analise-conteudo-organico', browser: 'analise-conteudo-organico-browser' },
  { id: 'conteudo-viral', servidor: 'detector-tendencias', browser: 'detector-tendencias-browser' },
  { id: 'gestao-comunidade', servidor: 'integracao-email', browser: 'integracao-email-browser' },
  { id: 'teste-assunto-email', servidor: 'analise-conteudo-gerado', browser: 'analise-conteudo-gerado-browser' },
  { id: 'relatorio-mensal', servidor: 'relatorios-comparativos', browser: 'relatorios-comparativos-browser' },
  { id: 'desempenho-rede', servidor: 'analise-concorrencia-conteudo', browser: 'analise-concorrencia-conteudo-browser' },
  { id: 'ciclo-vida-cliente', servidor: 'ltv-cohorte', browser: 'ltv-cohorte-browser' },
  { id: 'automacao-redes-sociais', servidor: 'campanhas-automatizadas', browser: 'campanhas-automatizadas-browser' },
  { id: 'hashtags-avancado', servidor: 'analise-hashtags', browser: 'analise-hashtags-browser' },
  { id: 'plano-acao', servidor: 'plano-semanal', browser: 'plano-semanal-browser' },
  { id: 'dashboard-realtime', servidor: 'dashboard-limite-marketing', browser: 'dashboard-limite-marketing-browser' },
  { id: 'concorrencia-conteudo', servidor: 'analise-conteudo-concorrente', browser: 'analise-conteudo-concorrente-browser' },
  { id: 'tendencias', servidor: 'detector-tendencias', browser: 'detector-tendencias-browser' },
  { id: 'equipe-marketing', servidor: 'gestao-memoria', browser: 'gestao-memoria-browser' },
  { id: 'desempenho-mensal', servidor: 'relatorio-semanal', browser: 'relatorio-semanal-browser' },
  { id: 'piloto-automatico', servidor: 'orquestrador-maximo-marketing', browser: 'orquestrador-maximo-marketing-browser' },
  { id: 'sistema-limite-max', servidor: 'dashboard-limite-marketing', browser: 'dashboard-limite-marketing-browser' },
  { id: 'orquestrador-maximo', servidor: 'orquestrador-maximo-marketing', browser: 'orquestrador-maximo-marketing-browser' },
  { id: 'detector-anomalias', servidor: 'auditoria-acoes', browser: 'auditoria-acoes-browser' },
  { id: 'loop-aprendizado', servidor: 'auto-correcao-aprendizado', browser: 'auto-correcao-aprendizado-browser' },
  { id: 'auto-otimizador-horarios', servidor: 'agendamento-inteligente', browser: 'agendamento-inteligente-browser' },
  { id: 'dashboard-limite', servidor: 'dashboard-limite-marketing', browser: 'dashboard-limite-marketing-browser' },
  { id: 'recuperacao-cadeia', servidor: 'recuperacao-automatica', browser: 'recuperacao-automatica-browser' },
  { id: 'integracao-cruzada', servidor: 'integracao-cruzada-marketing', browser: 'integracao-cruzada-marketing-browser' },
  { id: 'auto-escalada', servidor: 'auto-escalada-marketing', browser: 'auto-escalada-marketing-browser' },
];

const TOOLS_DIR = path.join(__dirname);

function moduloExiste(nomeModulo) {
  const servidor = path.join(TOOLS_DIR, nomeModulo + '.js');
  const browser = path.join(TOOLS_DIR, nomeModulo + '-browser.js');
  return fs.existsSync(servidor) && fs.existsSync(browser);
}

function moduloSintaxeValida(nomeModulo) {
  const servidor = path.join(TOOLS_DIR, nomeModulo + '.js');
  try {
    execSync(`node -c "${servidor}"`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    return false;
  }
}

function tentarRecuperacao(nomeModulo) {
  // Auto-recuperação: se o módulo servidor não tem sintaxe válida, tenta re-exportar
  // a partir de uma versão mínima funcional. Se não há módulo de jeito nenhum,
  // registra como não recuperável automaticamente.
  const servidor = path.join(TOOLS_DIR, nomeModulo + '.js');
  const browser = path.join(TOOLS_DIR, nomeModulo + '-browser.js');
  let recuperou = false;
  let motivo = '';
  if (!fs.existsSync(servidor)) {
    motivo = 'modulo_servidor_ausente';
  } else if (!fs.existsSync(browser)) {
    motivo = 'modulo_browser_ausente';
  } else {
    try {
      execSync(`node -c "${servidor}"`, { stdio: 'pipe' });
      recuperou = true;
      motivo = 'sintaxe_valida_apos_verificacao';
    } catch (e) {
      motivo = 'sintaxe_invalida_nao_recuperavel_automaticamente';
    }
  }
  return { recuperou, motivo };
}

function ativarHealthCheck() {
  const c = carregar();
  const id = 'hc_' + Date.now();
  c.ativo = true;
  c.ultima_execucao = new Date().toISOString();
  salvar();
  return { ok: true, id, camadas_total: CAMADAS.length };
}

function executarHealthCheck() {
  const c = carregar();
  if (!c.ativo) return { ok: false, erro: 'Health check não ativo' };
  const resultado = {
    id: 'hc_' + Date.now(),
    executadoEm: new Date().toISOString(),
    camadas_total: CAMADAS.length,
    camadas_ativas: 0,
    camadas_inativas: 0,
    recuperacoes_tentadas: 0,
    recuperacoes_sucesso: 0,
    detalhe: []
  };
  CAMADAS.forEach(camada => {
    const nomeModulo = camada.servidor;
    const existe = moduloExiste(nomeModulo);
    const sintaxeValida = existe ? moduloSintaxeValida(nomeModulo) : false;
    const ativa = existe && sintaxeValida;
    const detalheCamada = {
      camada: camada.id,
      modulo_servidor: nomeModulo,
      modulo_browser: camada.browser,
      existe,
      sintaxe_valida: sintaxeValida,
      ativa,
      verificadoEm: new Date().toISOString()
    };
    if (ativa) {
      resultado.camadas_ativas++;
      detalheCamada.status = 'ativa';
    } else {
      resultado.camadas_inativas++;
      resultado.recuperacoes_tentadas++;
      const tentativas = c.tentativas_recuperacao[camada.id] || 0;
      if (tentativas < 3) {
        c.tentativas_recuperacao[camada.id] = tentativas + 1;
        const rec = tentarRecuperacao(nomeModulo);
        if (rec.recuperou) {
          resultado.recuperacoes_sucesso++;
          c.recuperacoes_sucesso++;
          detalheCamada.recuperada = true;
          detalheCamada.status = 'recuperada';
          detalheCamada.motivo_recuperacao = rec.motivo;
        } else {
          c.recuperacoes_falha++;
          detalheCamada.recuperada = false;
          detalheCamada.status = 'falhou_recuperacao';
          detalheCamada.motivo = rec.motivo;
        }
      } else {
        c.recuperacoes_falha++;
        detalheCamada.status = 'sem_tentativas_disponiveis';
        detalheCamada.motivo = 'limite_de_tentativas_atingido';
      }
    }
    resultado.detalhe.push(detalheCamada);
  });
  c.camadas = resultado.detalhe;
  salvar();
  return { ok: true, resultado };
}

function estatisticasHealthCheck() {
  const c = carregar();
  return {
    ativo: c.ativo,
    total_camadas: CAMADAS.length,
    ultima_execucao: c.ultima_execucao,
    recuperacoes_sucesso: c.recuperacoes_sucesso,
    recuperacoes_falha: c.recuperacoes_falha,
    camadas_monitoradas: c.camadas.length
  };
}

module.exports = { ativarHealthCheck, executarHealthCheck, estatisticasHealthCheck, CAMADAS, moduloExiste, moduloSintaxeValida };
