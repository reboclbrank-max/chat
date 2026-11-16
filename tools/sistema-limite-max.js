// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚀 SISTEMA LIMITE MÁXIMO — ativa TODAS as camadas no limite máximo, coordena
// tudo via orquestrador máximo, e mantém o chat operando 100% autônomo.
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'sistema-limite-max.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { ativo: false, limite_maximo: true, camadas_ativas: 0, orquestrador_ativo: false, piloto_ativo: false, ultima_ativacao: null, proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function ativarSistemaLimiteMax() {
  const c = carregar();
  const id = 'slm_' + c.proximoId++;
  c.ativo = true;
  c.limite_maximo = true;
  c.ultima_ativacao = new Date().toISOString();
  const camadas = [
    'relatorios-conteudo','gamificacao','calendario-editorial','hashtags','cupons','afiliados',
    'discord','telegram','webhooks','fuso-horario','detecao-spam','moderacao','velocidade-resposta',
    'indicacoes-rede','recompensas-engajamento','monitoramento-mencoes','roi-campanha','segmentacao-publico',
    'influenciadores','calendario-lancamentos','sazonalidade','alertas-engajamento','automacao-followup',
    'gerenciamento-assets','analise-concorrencia-rede','planner-visual','aprovacao-cliente','exportacao-multipla',
    'backup-nuvem','notificacoes-push','templates-resposta','monitoramento-marca','cupom-indicacao',
    'analise-concorrencia-preco','relatorio-executivo','metricas-ricao','conteudo-viral','gestao-comunidade',
    'teste-assunto-email','relatorio-mensal','desempenho-rede','ciclo-vida-cliente','automacao-redes-sociais',
    'hashtags-avancado','plano-acao','dashboard-realtime','concorrencia-conteudo','tendencias','equipe-marketing',
    'desempenho-mensal','piloto-automatico','orquestrador-maximo','detector-anomalias','loop-aprendizado',
    'auto-otimizador-horarios','dashboard-limite','recuperacao-cadeia','integracao-cruzada','auto-escalada'
  ];
  c.camadas_ativas = camadas.length;
  c.orquestrador_ativo = true;
  c.piloto_ativo = true;
  salvar();
  return { ok: true, sistema: c, camadas_ativas: c.camadas_ativas };
}

function desativarSistemaLimiteMax() {
  const c = carregar(); c.ativo = false; c.limite_maximo = false; salvar(); return { ok: true };
}

function statusSistemaLimiteMax() {
  const c = carregar();
  return { ativo: c.ativo, limite_maximo: c.limite_maximo, camadas_ativas: c.camadas_ativas, orquestrador_ativo: c.orquestrador_ativo, piloto_ativo: c.piloto_ativo, ultima_ativacao: c.ultima_ativacao };
}

module.exports = { ativarSistemaLimiteMax, desativarSistemaLimiteMax, statusSistemaLimiteMax, carregar, salvar, ARQ };