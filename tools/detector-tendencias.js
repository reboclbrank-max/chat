// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 DETECTOR DE TENDÊNCIAS CORRELACIONADAS
// Monitora múltiplas métricas simultaneamente e detecta padrões de queda/alta correlacionada.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_TENDENCIAS = path.join(MARKETING_DIR, 'tendencias.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try {
    if (fs.existsSync(ARQUIVO_TENDENCIAS)) {
      cache = JSON.parse(fs.readFileSync(ARQUIVO_TENDENCIAS, 'utf8'));
      return cache;
    }
  } catch (e) {}
  cache = {
    deteccoes: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cache;
}
function salvar() {
  try {
    cache.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_TENDENCIAS, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DETECTAR TENDÊNCIA CORRELACIONADA
// Compara múltiplas métricas e identifica quedas/altas simultâneas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function detectarTendencia(metricas) {
  // metricas: { downloads: { atual: 80, anterior: 100 }, ctr: { atual: 1.5, anterior: 2.5 }, ... }
  const c = carregar();
  const agora = new Date();
  const id = 'tend_' + c.proximoId++;

  const quedas = [];
  const altas = [];
  const estaveis = [];

  for (const [metrica, valores] of Object.entries(metricas)) {
    const atual = valores.atual;
    const anterior = valores.anterior;
    if (anterior === 0) continue;

    const pctMudanca = ((atual - anterior) / anterior) * 100;

    if (pctMudanca <= -15) {
      quedas.push({ metrica, atual, anterior, pctMudanca: pctMudanca.toFixed(2) });
    } else if (pctMudanca >= 15) {
      altas.push({ metrica, atual, anterior, pctMudanca: pctMudanca.toFixed(2) });
    } else {
      estaveis.push({ metrica, atual, anterior, pctMudanca: pctMudanca.toFixed(2) });
    }
  }

  let severidade = 'baixa';
  let tipo = 'estavel';
  let mensagem = '';
  let acao = '';

  if (quedas.length >= 2) {
    severidade = 'alta';
    tipo = 'queda_correlacionada';
    mensagem = `QUEDA CORRELACIONADA detectada: ${quedas.length} métricas caíram simultaneamente (${quedas.map(q => q.metrica + ' ' + q.pctMudanca + '%').join(', ')})`;
    acao = 'Criar campanha de recuperação imediata e revisar estratégia de postagem';
  } else if (quedas.length === 1) {
    severidade = 'media';
    tipo = 'queda_isolada';
    mensagem = `Queda isolada em ${quedas[0].metrica}: ${quedas[0].pctMudanca}%`;
    acao = 'Investigar causa da queda em ' + quedas[0].metrica;
  } else if (altas.length >= 2) {
    severidade = 'baixa';
    tipo = 'alta_correlacionada';
    mensagem = `ALTA CORRELACIONADA: ${altas.length} métricas subiram simultaneamente`;
    acao = 'Replicar o que funcionou para manter o crescimento';
  } else {
    tipo = 'estavel';
    mensagem = 'Nenhuma tendência significativa detectada';
    acao = 'Continuar estratégia atual';
  }

  const deteccao = {
    id,
    tipo,
    severidade,
    mensagem,
    acao,
    quedas,
    altas,
    estaveis,
    criadoEm: agora.toISOString(),
  };

  c.deteccoes.push(deteccao);
  salvar();
  return { ok: true, deteccao };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR DETECÇÕES
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarDeteccoes(limite = 10) {
  const c = carregar();
  return c.deteccoes.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasTendencias() {
  const c = carregar();
  const total = c.deteccoes.length;
  const porTipo = {};
  const porSeveridade = {};
  for (const d of c.deteccoes) {
    if (!porTipo[d.tipo]) porTipo[d.tipo] = 0;
    porTipo[d.tipo]++;
    if (!porSeveridade[d.severidade]) porSeveridade[d.severidade] = 0;
    porSeveridade[d.severidade]++;
  }
  return { total, porTipo, porSeveridade };
}

module.exports = {
  detectarTendencia,
  listarDeteccoes,
  estatisticasTendencias,
  carregar,
  salvar,
  ARQUIVO_TENDENCIAS,
};