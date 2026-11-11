// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 ALERTA DE QUEDA + RECUPERAÇÃO AUTOMÁTICA
// Detecta quedas de métricas (downloads, inscritos, CTR, conversão) e sugere
// ou executa ações de recuperação automática.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_ALERTAS = path.join(MARKETING_DIR, 'alertas-queda.json');

let cacheAlertas = null;
function carregar() {
  if (cacheAlertas) return cacheAlertas;
  try {
    if (fs.existsSync(ARQUIVO_ALERTAS)) {
      cacheAlertas = JSON.parse(fs.readFileSync(ARQUIVO_ALERTAS, 'utf8'));
      return cacheAlertas;
    }
  } catch (e) {}
  cacheAlertas = {
    alertas: [],
    recuperacoes: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cacheAlertas;
}
function salvar() {
  try {
    cacheAlertas.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_ALERTAS, JSON.stringify(cacheAlertas, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DETECTAR QUEDA DE MÉTRICA
// Compara o valor atual com o anterior e registra alerta se houver queda
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectarQueda(metrica, valorAtual, tipoMetrica = 'numero', limiarPct = 10) {
  const c = carregar();

  // Carregar histórico da métrica
  const historico = c.alertas
    .filter(a => a.metrica === metrica)
    .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

  let alerta = null;

  if (historico.length > 0) {
    const anterior = historico[0].valor;
    const diferenca = valorAtual - anterior;
    const pctDiferenca = anterior !== 0 ? (diferenca / anterior) * 100 : 0;

    if (pctDiferenca <= -limiarPct) {
      const severidade = pctDiferenca <= -30 ? 'alta' : pctDiferenca <= -20 ? 'media' : 'baixa';

      alerta = {
        id: 'alerta_' + c.proximoId++,
        metrica,
        tipoMetrica,
        valorAnterior: anterior,
        valorAtual,
        pctQueda: Math.abs(pctDiferenca).toFixed(2),
        severidade,
        status: 'ativo',
        criadoEm: new Date().toISOString(),
        resolvidoEm: null,
        acaoSugerida: null,
        acaoExecutada: null,
      };

      c.alertas.push(alerta);
      salvar();
    }
  }

  // Registrar o valor atual como novo ponto de referência
  c.alertas.push({
    id: 'ref_' + c.proximoId++,
    metrica,
    tipoMetrica,
    valorAnterior: null,
    valorAtual,
    pctQueda: null,
    severidade: null,
    status: 'referencia',
    criadoEm: new Date().toISOString(),
    resolvidoEm: null,
    acaoSugerida: null,
    acaoExecutada: null,
  });
  salvar();

  return { alerta, historico };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR ALERTAS ATIVOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarAlertas(status = null) {
  const c = carregar();
  if (status) {
    return c.alertas.filter(a => a.status === status);
  }
  return c.alertas;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SUGERIR AÇÃO DE RECUPERAÇÃO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function sugerirRecuperacao(idAlerta) {
  const c = carregar();
  const alerta = c.alertas.find(a => a.id === idAlerta);
  if (!alerta) return { ok: false, erro: 'Alerta não encontrado' };

  const sugestoes = {
    downloads: '📥 Crie uma campanha de reativação para usuários inativos e faça um post de "última chance" para download.',
    inscritos: '👥 Publique um teaser exclusivo e convide seguidores a se inscreverem na lista de e-mails.',
    ctr: '🔗 Revise as chamadas para ação (CTA) e use imagens mais atrativas nos posts.',
    conversao: '🎯 Simplifique o fluxo de download e verifique se o link UML está funcionando.',
    churn: '🔄 Lance uma campanha de win-back com desconto ou conteúdo exclusivo para quem saiu.',
    receita: '💰 Crie uma oferta relâmpago para impulsionar vendas rapidamente.',
  };

  const sugestao = sugestoes[alerta.metrica] ||
    '📊 Revise a estratégia de postagem para a métrica ' + alerta.metrica + '.';

  alerta.acaoSugerida = sugestao;
  alerta.atualizadoEm = new Date().toISOString();
  salvar();

  return { ok: true, alerta, sugestao };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTAR RECUPERAÇÃO
// Registra que uma ação de recuperação foi executada para um alerta
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function executarRecuperacao(idAlerta, acao, detalhes) {
  const c = carregar();
  const alerta = c.alertas.find(a => a.id === idAlerta);
  if (!alerta) return { ok: false, erro: 'Alerta não encontrado' };

  const recuperacao = {
    id: 'rec_' + c.proximoId++,
    idAlerta,
    acao,
    detalhes,
    executadoEm: new Date().toISOString(),
    sucesso: null, // será preenchido quando o resultado for conhecido
  };

  alerta.acaoExecutada = acao;
  alerta.status = 'em_recuperacao';
  alerta.atualizadoEm = new Date().toISOString();

  c.recuperacoes.push(recuperacao);
  salvar();

  return { ok: true, alerta, recuperacao };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// RESOLVER ALERTA
// Marca um alerta como resolvido após recuperação
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function resolverAlerta(idAlerta, sucesso) {
  const c = carregar();
  const alerta = c.alertas.find(a => a.id === idAlerta);
  if (!alerta) return { ok: false, erro: 'Alerta não encontrado' };

  alerta.status = sucesso ? 'resolvido' : 'nao_resolvido';
  alerta.resolvidoEm = new Date().toISOString();
  salvar();

  // Atualizar recuperações relacionadas
  for (const rec of c.recuperacoes) {
    if (rec.idAlerta === idAlerta) {
      rec.sucesso = sucesso;
    }
  }
  salvar();

  return { ok: true, alerta };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS DE ALERTAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasAlertas() {
  const c = carregar();
  const total = c.alertas.length;
  const ativos = c.alertas.filter(a => a.status === 'ativo').length;
  const resolvidos = c.alertas.filter(a => a.status === 'resolvido').length;
  const naoResolvidos = c.alertas.filter(a => a.status === 'nao_resolvido').length;
  const emRecuperacao = c.alertas.filter(a => a.status === 'em_recuperacao').length;

  const porMetrica = {};
  for (const a of c.alertas) {
    if (a.status !== 'referencia') {
      if (!porMetrica[a.metrica]) porMetrica[a.metrica] = { total: 0, ativos: 0, resolvidos: 0 };
      porMetrica[a.metrica].total++;
      if (a.status === 'ativo') porMetrica[a.metrica].ativos++;
      if (a.status === 'resolvido') porMetrica[a.metrica].resolvidos++;
    }
  }

  const porSeveridade = {};
  for (const a of c.alertas) {
    if (a.severidade) {
      if (!porSeveridade[a.severidade]) porSeveridade[a.severidade] = 0;
      porSeveridade[a.severidade]++;
    }
  }

  return {
    total,
    ativos,
    resolvidos,
    naoResolvidos,
    emRecuperacao,
    porMetrica,
    porSeveridade,
    totalRecuperacoes: c.recuperacoes.length,
  };
}

module.exports = {
  detectarQueda,
  listarAlertas,
  sugerirRecuperacao,
  executarRecuperacao,
  resolverAlerta,
  estatisticasAlertas,
  carregar,
  salvar,
  ARQUIVO_ALERTAS,
};