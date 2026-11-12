// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 PLANO SEMANAL DE MARKETING
// Gera cronograma de posts por dia/rede baseado em dados de desempenho.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_PLANOS = path.join(MARKETING_DIR, 'planos-semanais.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try {
    if (fs.existsSync(ARQUIVO_PLANOS)) {
      cache = JSON.parse(fs.readFileSync(ARQUIVO_PLANOS, 'utf8'));
      return cache;
    }
  } catch (e) {}
  cache = {
    planos: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cache;
}
function salvar() {
  try {
    cache.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_PLANOS, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
const REDES = ['instagram', 'x', 'nostr'];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// GERAR PLANO SEMANAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function gerarPlanoSemanal(jogo, dadosDesempenho = {}) {
  const c = carregar();
  const agora = new Date();
  const semanaInicial = new Date(agora);
  semanaInicial.setDate(agora.getDate() - agora.getDay());
  semanaInicial.setHours(0, 0, 0, 0);

  const id = 'plano_' + c.proximoId++;

  // Melhor horário por rede baseado em dados de desempenho
  const melhorHorarioPorRede = {};
  for (const rede of REDES) {
    melhorHorarioPorRede[rede] = dadosDesempenho[rede] || '10:00';
  }

  const plano = {
    id,
    semanaInicio: semanaInicial.toISOString(),
    semanaFim: new Date(semanaInicial.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    jogo: jogo || 'ambos',
    geradoEm: new Date().toISOString(),
    status: 'ativo',
    cronograma: [],
  };

  // Gerar cronograma: 1 post por dia por rede (3 posts/dia no total)
  const temasPorDia = {
    domingo: 'Descanso / Revisão de métricas',
    segunda: 'Início de semana - apresentação do jogo',
    terca: 'Destaque de característica',
    quarta: 'Meio de semana - gameplay ou dica',
    quinta: 'Depoimento ou comunidade',
    sexta: 'Último chamado / urgência',
    sabado: 'Conteúdo leve / interação',
  };

  for (let d = 0; d < 7; d++) {
    const diaData = new Date(semanaInicial.getTime() + d * 24 * 60 * 60 * 1000);
    const diaNome = DIAS_SEMANA[d];
    const tema = temasPorDia[diaNome];

    for (const rede of REDES) {
      plano.cronograma.push({
        dia: diaNome,
        data: diaData.toISOString(),
        rede,
        tema,
        horario: melhorHorarioPorRede[rede],
        status: 'pendente',
        textoSugerido: `Post de ${diaNome} para ${rede} — ${tema}`,
      });
    }
  }

  c.planos.push(plano);
  salvar();
  return { ok: true, plano };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR PLANOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarPlanos(ativoApenas = false) {
  const c = carregar();
  let planos = c.planos.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
  if (ativoApenas) planos = planos.filter(p => p.status === 'ativo');
  return planos;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasPlanos() {
  const c = carregar();
  const total = c.planos.length;
  const ativos = c.planos.filter(p => p.status === 'ativo').length;
  const totalPosts = c.planos.reduce((s, p) => s + p.cronograma.length, 0);
  const postsPendentes = c.planos.reduce((s, p) => s + p.cronograma.filter(c => c.status === 'pendente').length, 0);
  return { total, ativos, totalPosts, postsPendentes };
}

module.exports = {
  gerarPlanoSemanal,
  listarPlanos,
  estatisticasPlanos,
  carregar,
  salvar,
  ARQUIVO_PLANOS,
};