// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧠 INTELIGÊNCIA DE MARKETING — camada inteligente para o chat
// Implementa: memória persistente, detecção de intenção, raciocínio local para
// marketing, análise de sentimento de resposta, cache semântico, aprendizado com
// feedback, detecção de pergunta ambígua e personalização.
// Só serve marketing de Prancheta e Ceifalume. Nenhuma rede social fora desse escopo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. MEMÓRIA PERSISTENTE DE CONVERSA
// Lembra o que o dono disse entre sessões: último jogo, tom preferido, horários,
// metas atuais, últimas conversas.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ARQUIVO_MEMORIA = path.join(MARKETING_DIR, 'memoria-conversa.json');

let cacheMemoria = null;
function carregarMemoria() {
  if (cacheMemoria) return cacheMemoria;
  try {
    if (fs.existsSync(ARQUIVO_MEMORIA)) {
      cacheMemoria = JSON.parse(fs.readFileSync(ARQUIVO_MEMORIA, 'utf8'));
      return cacheMemoria;
    }
  } catch (e) {}
  cacheMemoria = {
    ultimoJogo: null,
    tomPreferido: 'neutro',
    horariosPreferidos: [],
    metas: {},
    ultimasConversas: [], // até 20
    preferencias: {},
    atualizadoEm: new Date().toISOString(),
  };
  return cacheMemoria;
}

function salvarMemoria() {
  try {
    cacheMemoria.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_MEMORIA, JSON.stringify(cacheMemoria, null, 2), 'utf8');
  } catch (e) {}
}

function salvarMemoriaConversa(chave, valor) {
  const m = carregarMemoria();
  m[chave] = { valor, atualizadoEm: new Date().toISOString() };
  cacheMemoria = m;
  salvarMemoria();
  return { ok: true, chave, valor };
}

function lerMemoriaConversa(chave) {
  const m = carregarMemoria();
  return m[chave] ? m[chave].valor : null;
}

function adicionarConversaMemoria(pergunta, resposta, intencao, jogo) {
  const m = carregarMemoria();
  m.ultimasConversas.push({
    quando: new Date().toISOString(),
    pergunta: pergunta.slice(0, 200),
    resposta: resposta.slice(0, 200),
    intencao,
    jogo,
  });
  if (m.ultimasConversas.length > 20) {
    m.ultimasConversas = m.ultimasConversas.slice(-20);
  }
  if (jogo) m.ultimoJogo = jogo;
  cacheMemoria = m;
  salvarMemoria();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. DETECÇÃO DE INTENÇÃO
// Classifica automaticamente o que o dono quer fazer: postar, medir, criar,
// ajustar, conversar.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SINAIS_INTENCAO = {
  postar: ['poste', 'publique', 'divulgue', 'lan\u00e7e', 'post', 'tweet', 'toot', 'reel', 'compartilhe', 'mande', 'envie', 'coloque no ar'],
  medir: ['m\u00e9trica', 'acesso', 'inscrito', 'seguidor', 'download', 'visualiza\u00e7\u00e3o', 'quanto', 'qual o placar', 'estat\u00edstica', 'desempenho', 'resultado', 'contagem'],
  criar: ['crie', 'escreva', 'gere', 'produza', 'roteiro', 'texto', 'legenda', 'imagem', 'desenhe', 'roteirize', 'esboce'],
  ajustar: ['mude', 'altere', 'configure', 'defina', 'ajuste', 'hor\u00e1rio', 'frequ\u00eancia', 'tom', 'mem\u00f3ria', 'prefer\u00eancia'],
  conversar: ['oi', 'ol\u00e1', 'tudo bem', 'como vai', 'e a\u00ed', 'beleza', 'sumiu'],
};

function detectarIntencao(texto) {
  if (!texto) return { intencao: 'conversar', confianca: 0 };
  const t = texto.toLowerCase();
  let melhorIntencao = 'conversar';
  let melhorPontuacao = 0;
  for (const [intencao, palavras] of Object.entries(SINAIS_INTENCAO)) {
    let pontuacao = 0;
    for (const p of palavras) {
      if (t.includes(p)) pontuacao++;
    }
    if (pontuacao > melhorPontuacao) {
      melhorPontuacao = pontuacao;
      melhorIntencao = intencao;
    }
  }
  const confianca = melhorPontuacao > 0 ? Math.min(melhorPontuacao / 3, 1) : 0.3;
  return { intencao: melhorIntencao, confianca };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. RACIOCÍNIO LOCAL PARA MARKETING
// Cálculos exatos sem API: projeção de inscritos, taxa de conversão, tempo por
// post, break-even, melhor horário, ROI de tempo.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function raciocinioMarketing(pergunta) {
  if (!pergunta) return null;
  const t = pergunta.toLowerCase();

  // Projeção de inscritos: "tenho 1000 inscritos, cresço 5% ao dia, em 30 dias?"
  const m1 = t.match(/(\d+(?:[.,]\d+)?)\s*inscritos.*?(\d+(?:[.,]\d+)?)%\s*ao\s*dia.*?(\d+)\s*dias/);
  if (m1) {
    const atuais = parseFloat(m1[1].replace(',', '.'));
    const taxa = parseFloat(m1[2].replace(',', '.')) / 100;
    const dias = parseInt(m1[3], 10);
    const projetado = Math.round(atuais * Math.pow(1 + taxa, dias));
    const ganho = projetado - atuais;
    return {
      ferramenta: 'marketing-projecao-inscritos',
      texto: `Em ${dias} dias: ${projetado.toLocaleString('pt-BR')} inscritos (ganho de ${ganho.toLocaleString('pt-BR')})`,
      dados: { atuais, taxa, dias, projetado, ganho },
    };
  }

  // Taxa de conversão: "1000 cliques, 50 downloads"
  const m2 = t.match(/(\d+(?:[.,]\d+)?)\s*cliques.*?(\d+(?:[.,]\d+)?)\s*downloads/);
  if (m2) {
    const cliques = parseFloat(m2[1].replace(',', '.'));
    const downloads = parseFloat(m2[2].replace(',', '.'));
    const taxa = cliques > 0 ? Math.round((downloads / cliques) * 100) : 0;
    return {
      ferramenta: 'marketing-taxa-conversao',
      texto: `Taxa de conversão: ${taxa}% (${downloads.toLocaleString('pt-BR')}/${cliques.toLocaleString('pt-BR')})`,
      dados: { cliques, downloads, taxa },
    };
  }

  // Tempo por post: "5 horas, 10 posts"
  const m3 = t.match(/(\d+(?:[.,]\d+)?)\s*horas?.*?(\d+(?:[.,]\d+)?)\s*posts/);
  if (m3) {
    const horas = parseFloat(m3[1].replace(',', '.'));
    const posts = parseFloat(m3[2].replace(',', '.'));
    const minutosPorPost = posts > 0 ? Math.round((horas * 60) / posts) : 0;
    return {
      ferramenta: 'marketing-tempo-por-post',
      texto: `${minutosPorPost} minutos por post`,
      dados: { horas, posts, minutosPorPost },
    };
  }

  // Break-even de tempo: "quero X downloads, faço Y posts por dia, cada post leva Z minutos"
  const m4 = t.match(/quero\s*(\d+(?:[.,]\d+)?)\s*downloads.*?(\d+(?:[.,]\d+)?)\s*posts?\s*por\s*dia.*?cada\s*post\s*leva\s*(\d+(?:[.,]\d+)?)\s*minutos?/);
  if (m4) {
    const alvo = parseFloat(m4[1].replace(',', '.'));
    const postsDia = parseFloat(m4[2].replace(',', '.'));
    const minPorPost = parseFloat(m4[3].replace(',', '.'));
    const diasNecessarios = alvo > 0 && postsDia > 0 ? Math.ceil(alvo / postsDia) : 0;
    const tempoTotal = diasNecessarios * postsDia * minPorPost;
    return {
      ferramenta: 'marketing-break-even',
      texto: `Para ${alvo.toLocaleString('pt-BR')} downloads: ${diasNecessarios} dias, ${tempoTotal.toLocaleString('pt-BR')} minutos totais`,
      dados: { alvo, postsDia, minPorPost, diasNecessarios, tempoTotal },
    };
  }

  // Melhor horário baseado em fluxo de acesso
  const m5 = t.match(/melhor\s*hor[aa]rio|qual\s*hor[aa]rio|quando\s*postar|hor[aa]rio\s*de\s*acesso/);
  if (m5) {
    const memoria = carregarMemoria();
    const fluxos = memoria.preferencias.fluxoAcesso || {};
    let melhor = null;
    let melhorValor = -1;
    for (const [hora, acessos] of Object.entries(fluxos)) {
      if (acessos > melhorValor) {
        melhorValor = acessos;
        melhor = hora;
      }
    }
    if (melhor) {
      return {
        ferramenta: 'marketing-melhor-horario',
        texto: `Melhor horário para postar: ${melhor}h (${melhorValor} acessos no histórico)`,
        dados: { melhorHorario: melhor, acessos: melhorValor },
      };
    }
    return {
      ferramenta: 'marketing-melhor-horario',
      texto: 'Ainda não há dados de fluxo de acesso suficientes. Comece a registrar acessos com registrarFluxoAcesso().',
      dados: null,
    };
  }

  // ROI de tempo: "gastei 10 horas, obtive 500 downloads"
  const m6 = t.match(/(\d+(?:[.,]\d+)?)\s*horas?.*?(\d+(?:[.,]\d+)?)\s*downloads/);
  if (m6) {
    const horas = parseFloat(m6[1].replace(',', '.'));
    const downloads = parseFloat(m6[2].replace(',', '.'));
    const downloadsPorHora = horas > 0 ? Math.round(downloads / horas) : 0;
    return {
      ferramenta: 'marketing-roi-tempo',
      texto: `${downloadsPorHora.toLocaleString('pt-BR')} downloads por hora de trabalho`,
      dados: { horas, downloads, downloadsPorHora },
    };
  }

  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. ANÁLISE DE SENTIMENTO DAS RESPOSTAS PRÓPRIAS
// Avalia se a resposta gerada pelo chat é boa para marketing antes de entregar.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PALAVRAS_POSITIVAS_MK = [
  'grátis', 'jogue', 'baixe', 'teste', 'veja', 'descubra', 'simule', 'link', 'apk',
  'incrível', 'excelente', 'maravilhoso', 'fantástico', 'sensacional', 'top',
  'imperdível', 'vale a pena', 'parabéns', 'nota 10', 'aprovado', 'recomendo',
];
const PALAVRAS_NEGATIVAS_MK = [
  'não', 'nunca', 'jamais', 'nenhum', 'nada', 'erro', 'falha', 'bug', 'lixo',
  'ruim', 'péssimo', 'horrível', 'odeio', 'decepção', 'perda de tempo', 'travar',
  'cobrança', 'pago', 'assinatura',
];
const CTAS = ['baixe', 'jogue', 'acesse', 'confira', 'veja', 'teste', 'link', 'download', 'jogue agora', 'baixe agora'];

function avaliarQualidadeResposta(texto, contexto = 'geral') {
  if (!texto) return { aprovado: false, problemas: ['texto vazio'], sugestao: 'Escreva uma resposta antes de enviar' };
  const problemas = [];
  const t = texto.toLowerCase();

  if (texto.length < 15) problemas.push('resposta muito curta para marketing');

  if (contexto === 'divulgacao') {
    const temCTA = CTAS.some(c => t.includes(c));
    if (!temCTA) problemas.push('sem chamada para ação (CTA) clara');
  }

  const negacoes = (t.match(/\b(não|nunca|jamais|nenhum|nada)\b/g) || []).length;
  if (negacoes > 2) problemas.push('muitas negações (tom pode desanimar)');

  const hashtags = (texto.match(/#\w+/g) || []).length;
  if (hashtags > 3) problemas.push(`muitas hashtags (${hashtags}, máximo 3)`);

  const pontuacao = texto.length > 0 ? 10 - problemas.length * 2 : 0;
  const aprovado = problemas.length === 0;

  return {
    aprovado,
    pontuacao: Math.max(pontuacao, 0),
    problemas,
    sugestao: aprovado ? 'resposta aprovada para marketing' : 'reescreva com tom mais positivo e CTA claro',
  };
}

function reescreverRespostaMarketing(texto, jogo = null) {
  if (!texto) return texto;
  const nomeJogo = jogo ? ` do ${jogo}` : '';
  let nova = texto.trim();
  if (!nova.endsWith('.') && !nova.endsWith('!') && !nova.endsWith('?')) nova += '.';
  const temCTA = CTAS.some(c => nova.toLowerCase().includes(c));
  if (!temCTA) {
    nova += ` Baixe${nomeJogo} agora: reboclbrank-max.itch.io`;
  }
  return nova;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. CACHE SEMÂNTICO
// Cache por similaridade (coeficiente de Jaccard) entre palavras-chave.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CACHE_SEMANTICO_DIR = path.join(MARKETING_DIR, 'cache-semantico.json');
let cacheSemanticoMem = null;
function carregarCacheSemantico() {
  if (cacheSemanticoMem) return cacheSemanticoMem;
  try {
    if (fs.existsSync(CACHE_SEMANTICO_DIR)) {
      cacheSemanticoMem = JSON.parse(fs.readFileSync(CACHE_SEMANTICO_DIR, 'utf8'));
      return cacheSemanticoMem;
    }
  } catch (e) {}
  cacheSemanticoMem = { entradas: [], criadoEm: new Date().toISOString() };
  return cacheSemanticoMem;
}
function salvarCacheSemantico() {
  try {
    cacheSemanticoMem.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(CACHE_SEMANTICO_DIR, JSON.stringify(cacheSemanticoMem, null, 2), 'utf8');
  } catch (e) {}
}

function normalizarPalavras(texto) {
  return texto.toLowerCase()
    .replace(/[^\w\sáàâãéêíóôõúç]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2);
}

function similaridadeJaccard(a, b) {
  const setA = new Set(normalizarPalavras(a));
  const setB = new Set(normalizarPalavras(b));
  const intersecao = new Set([...setA].filter(x => setB.has(x)));
  const uniao = new Set([...setA, ...setB]);
  if (uniao.size === 0) return 0;
  return intersecao.size / uniao.size;
}

function buscarCacheSemantico(pergunta, limite = 0.7) {
  const cache = carregarCacheSemantico();
  let melhor = null;
  let melhorSim = 0;
  for (const e of cache.entradas) {
    const sim = similaridadeJaccard(pergunta, e.pergunta);
    if (sim > melhorSim && sim >= limite) {
      melhorSim = sim;
      melhor = e;
    }
  }
  if (melhor) {
    melhor.usos = (melhor.usos || 0) + 1;
    melhor.ultimoUso = new Date().toISOString();
    salvarCacheSemantico();
    return { resposta: melhor.resposta, similaridade: melhorSim };
  }
  return null;
}

function salvarCacheSemanticoEntrada(pergunta, resposta) {
  const cache = carregarCacheSemantico();
  cache.entradas.push({
    pergunta: pergunta.slice(0, 200),
    resposta: resposta.slice(0, 500),
    criadoEm: new Date().toISOString(),
    usos: 1,
  });
  if (cache.entradas.length > 500) {
    cache.entradas = cache.entradas.sort((a, b) => (b.usos || 0) - (a.usos || 0)).slice(0, 500);
  }
  cacheSemanticoMem = cache;
  salvarCacheSemantico();
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. APRENDIZADO COM FEEDBACK
// Salva aprovação/reprovação de respostas e ajusta modelos e tom.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ARQUIVO_FEEDBACK = path.join(MARKETING_DIR, 'feedback.json');
let feedbackMem = null;
function carregarFeedback() {
  if (feedbackMem) return feedbackMem;
  try {
    if (fs.existsSync(ARQUIVO_FEEDBACK)) {
      feedbackMem = JSON.parse(fs.readFileSync(ARQUIVO_FEEDBACK, 'utf8'));
      return feedbackMem;
    }
  } catch (e) {}
  feedbackMem = { entradas: [], criadoEm: new Date().toISOString() };
  return feedbackMem;
}
function salvarFeedback() {
  try {
    feedbackMem.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_FEEDBACK, JSON.stringify(feedbackMem, null, 2), 'utf8');
  } catch (e) {}
}

function registrarFeedback(pergunta, resposta, aprovado, rede, modelo, intencao) {
  const fb = carregarFeedback();
  fb.entradas.push({
    quando: new Date().toISOString(),
    pergunta: pergunta.slice(0, 200),
    resposta: resposta.slice(0, 200),
    aprovado,
    rede: rede || null,
    modelo: modelo || null,
    intencao: intencao || null,
  });
  if (fb.entradas.length > 1000) {
    fb.entradas = fb.entradas.slice(-1000);
  }
  feedbackMem = fb;
  salvarFeedback();
  return { ok: true };
}

function estatisticasFeedback() {
  const fb = carregarFeedback();
  const total = fb.entradas.length;
  const aprovados = fb.entradas.filter(e => e.aprovado).length;
  const reprovados = total - aprovados;
  const porRede = {};
  for (const e of fb.entradas) {
    const r = e.rede || 'sem-rede';
    if (!porRede[r]) porRede[r] = { total: 0, aprovados: 0 };
    porRede[r].total++;
    if (e.aprovado) porRede[r].aprovados++;
  }
  return {
    total,
    aprovados,
    reprovados,
    taxaAprovacao: total > 0 ? Math.round((aprovados / total) * 100) : 0,
    porRede,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. DETECÇÃO DE PERGUNTA AMBÍGUA
// Identifica quando a pergunta não é clara o suficiente e pede esclarecimento.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const PALAVRAS_AMBIGUAS = ['isso', 'aquilo', 'aquela', 'aquele', 'talvez', 'tal', 'qualquer', 'coisa', 'algo'];
const SINAIS_AMBIGUIDADE = ['talvez', 'acho que', 'não sei', 'dá pra', 'dá para', 'será que', 'pode ser'];

function detectarPerguntaAmbigua(pergunta) {
  if (!pergunta) return { ambigua: false };
  const t = pergunta.toLowerCase().trim();
  const sinais = SINAIS_AMBIGUIDADE.filter(s => t.includes(s));
  const palavrasVagas = PALAVRAS_AMBIGUAS.filter(p => t.includes(p));
  const muitoCurta = t.length < 10;
  const semVerbo = !/\b(faz|fazer|poste|postar|crie|criar|escreva|escrever|mude|mudar|me|diga|dizer|qual|como|quando|onde|por que|quanto)\b/.test(t);
  const ambigua = sinais.length > 0 || palavrasVagas.length > 1 || (muitoCurta && semVerbo);
  return {
    ambigua,
    sinais,
    palavrasVagas,
    muitoCurta,
    semVerbo,
    sugestao: ambigua ? 'Sua pergunta não ficou clara. Pode reformular com mais detalhes? Ex: "poste no Instagram sobre o Ceifalume"' : null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. PERSONALIZAÇÃO
// Preferências do dono: tom, jogos prioritários, redes ativas, horários.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const JOGOS_PERMITIDOS = ['ceifalume', 'prancheta'];

function obterPreferencias() {
  const m = carregarMemoria();
  return {
    ultimoJogo: m.ultimoJogo,
    tomPreferido: m.tomPreferido || 'neutro',
    horariosPreferidos: m.horariosPreferidos || [],
    metas: m.metas || {},
    preferencias: m.preferencias || {},
    jogos: JOGOS_PERMITIDOS,
  };
}

function salvarPreferencias(prefs) {
  const m = carregarMemoria();
  if (prefs.tomPreferido) m.tomPreferido = prefs.tomPreferido;
  if (prefs.horariosPreferidos) m.horariosPreferidos = prefs.horariosPreferidos;
  if (prefs.metas) m.metas = prefs.metas;
  if (prefs.preferencias) m.preferencias = prefs.preferencias;
  if (prefs.ultimoJogo) m.ultimoJogo = prefs.ultimoJogo;
  cacheMemoria = m;
  salvarMemoria();
  return { ok: true };
}

function validarJogo(jogo) {
  return JOGOS_PERMITIDOS.includes(jogo);
}

function jogoDaPergunta(pergunta) {
  if (!pergunta) return null;
  const t = pergunta.toLowerCase();
  for (const j of JOGOS_PERMITIDOS) {
    if (t.includes(j)) return j;
  }
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// FLUXO PRINCIPAL — processar mensagem do dono com toda a camada de inteligência
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function processarMensagemDono(pergunta, contexto = {}) {
  const resultado = {
    pergunta,
    quando: new Date().toISOString(),
    intencao: null,
    jogo: null,
    ambiguidade: null,
    raciocinioMarketing: null,
    sentimentoResposta: null,
    cacheHit: null,
    feedback: null,
    preferencias: null,
    acaoRecomendada: null,
    respostaDireta: null,
  };

  // Detecção de intenção
  resultado.intencao = detectarIntencao(pergunta);

  // Detecção de jogo
  resultado.jogo = jogoDaPergunta(pergunta) || lerMemoriaConversa('ultimoJogo');

  // Detecção de ambiguidade
  resultado.ambiguidade = detectarPerguntaAmbigua(pergunta);

  // Raciocínio local para marketing
  resultado.raciocinioMarketing = raciocinioMarketing(pergunta);

  // Cache semântico
  const cacheHit = buscarCacheSemantico(pergunta);
  resultado.cacheHit = cacheHit;

  // Preferências
  resultado.preferencias = obterPreferencias();

  // Se há cache semântico, usar diretamente
  if (cacheHit) {
    resultado.acaoRecomendada = 'responder_cache';
    resultado.respostaDireta = cacheHit.resposta;
    adicionarConversaMemoria(pergunta, cacheHit.resposta, resultado.intencao.intencao, resultado.jogo);
    salvarCacheSemanticoEntrada(pergunta, cacheHit.resposta);
    return resultado;
  }

  // Se ambígua, pedir esclarecimento
  if (resultado.ambiguidade.ambigua) {
    resultado.acaoRecomendada = 'pedir_esclarecimento';
    resultado.respostaDireta = resultado.ambiguidade.sugestao;
    adicionarConversaMemoria(pergunta, resultado.respostaDireta, resultado.intencao.intencao, resultado.jogo);
    return resultado;
  }

  // Se tem raciocínio de marketing, usar
  if (resultado.raciocinioMarketing) {
    resultado.acaoRecomendada = 'responder_raciocinio';
    resultado.respostaDireta = resultado.raciocinioMarketing.texto;
    adicionarConversaMemoria(pergunta, resultado.respostaDireta, resultado.intencao.intencao, resultado.jogo);
    salvarCacheSemanticoEntrada(pergunta, resultado.respostaDireta);
    return resultado;
  }

  // Ação padrão: deixar o roteador de IA decidir
  resultado.acaoRecomendada = 'encaminhar_ia';
  return resultado;
}

function finalizarResposta(pergunta, resposta, aprovado, rede, modelo, intencao, jogo) {
  const qualidade = avaliarQualidadeResposta(resposta, 'geral');
  registrarFeedback(pergunta, resposta, aprovado, rede, modelo, intencao);
  adicionarConversaMemoria(pergunta, resposta, intencao, jogo);
  salvarCacheSemanticoEntrada(pergunta, resposta);
  return { qualidade, aprovado };
}

module.exports = {
  // Memória
  salvarMemoriaConversa,
  lerMemoriaConversa,
  adicionarConversaMemoria,
  carregarMemoria,
  salvarMemoria,
  // Intenção
  detectarIntencao,
  // Raciocínio marketing
  raciocinioMarketing,
  // Sentimento resposta
  avaliarQualidadeResposta,
  reescreverRespostaMarketing,
  // Cache semântico
  buscarCacheSemantico,
  salvarCacheSemanticoEntrada,
  normalizarPalavras,
  similaridadeJaccard,
  // Feedback
  registrarFeedback,
  estatisticasFeedback,
  // Ambiguidade
  detectarPerguntaAmbigua,
  // Personalização
  obterPreferencias,
  salvarPreferencias,
  validarJogo,
  jogoDaPergunta,
  JOGOS_PERMITIDOS,
  // Fluxo principal
  processarMensagemDono,
  finalizarResposta,
  MARKETING_DIR,
};