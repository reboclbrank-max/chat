// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 AUTO-CORREÇÃO E LOOP DE APRENDIZADO
// O chat aprende com seus próprios erros e sucessos, ajustando:
// - Seleção de modelo por tipo de pergunta
// - Tom de resposta por sentimento do público
// - Horário de postagem por desempenho real
// - Conteúdo que funciona vs não funciona
// - Blacklist de palavras que geram reprovação
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_APRENDIZAGEM = path.join(MARKETING_DIR, 'aprendizado.json');

let cacheAprendizado = null;
function carregar() {
  if (cacheAprendizado) return cacheAprendizado;
  try {
    if (fs.existsSync(ARQUIVO_APRENDIZAGEM)) {
      cacheAprendizado = JSON.parse(fs.readFileSync(ARQUIVO_APRENDIZAGEM, 'utf8'));
      return cacheAprendizado;
    }
  } catch (e) {}
  cacheAprendizado = {
    modeloPorIntencao: {},        // { intencao: { modelo: 'groq', acertos: 10, erros: 2 } }
    tomPorSentimento: {},         // { sentimento: { tom: 'entusiasta', sucessos: 5 } }
    horarioPorDesempenho: {},     // { rede: { horario: '14h', engajamentoMedio: 120 } }
    palavrasBloqueadas: [],       // palavras que geraram reprovação
    conteudoQueFunciona: [],      // { texto, tipo, rede, desempenho }
    conteudoQueNaoFunciona: [],   // { texto, tipo, rede, motivo }
    planosExecutados: [],         // { plano, resultado, sucesso }
    versoes: [],                  // histórico de mudanças
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cacheAprendizado;
}
function salvar() {
  try {
    cacheAprendizado.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_APRENDIZAGEM, JSON.stringify(cacheAprendizado, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 1. REGISTRAR RESULTADO DE MODELO POR INTENÇÃO
// Qual modelo funciona melhor para cada tipo de pergunta
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarResultadoModelo(intencao, modelo, sucesso, confianca) {
  const a = carregar();
  const chave = intencao;
  if (!a.modeloPorIntencao[chave]) {
    a.modeloPorIntencao[chave] = {};
  }
  if (!a.modeloPorIntencao[chave][modelo]) {
    a.modeloPorIntencao[chave][modelo] = { acertos: 0, erros: 0, confiancaMedia: 0, total: 0 };
  }
  const m = a.modeloPorIntencao[chave][modelo];
  if (sucesso) m.acertos++; else m.erros++;
  m.total++;
  m.confiancaMedia = ((m.confiancaMedia * (m.total - 1)) + confianca) / m.total;
  salvar();
  return { ok: true, intencao, modelo, sucesso };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 2. MELHOR MODELO PARA UMA INTENÇÃO
// Retorna o modelo com maior taxa de acerto para uma intenção
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function melhorModeloParaIntencao(intencao) {
  const a = carregar();
  const modelos = a.modeloPorIntencao[intencao];
  if (!modelos) return null;
  let melhor = null;
  let melhorTaxa = -1;
  for (const [modelo, stats] of Object.entries(modelos)) {
    if (stats.total < 3) continue; // precisa de amostragem mínima
    const taxa = stats.acertos / stats.total;
    if (taxa > melhorTaxa) {
      melhorTaxa = taxa;
      melhor = modelo;
    }
  }
  return melhor ? { modelo: melhor, taxaAcerto: melhorTaxa, total: modelos[melhor].total } : null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 3. REGISTRAR TOM POR SENTIMENTO
// Qual tom funciona melhor para cada sentimento do público
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarTomPorSentimento(sentimentoPublico, tomUsado, sucesso) {
  const a = carregar();
  if (!a.tomPorSentimento[sentimentoPublico]) {
    a.tomPorSentimento[sentimentoPublico] = {};
  }
  if (!a.tomPorSentimento[sentimentoPublico][tomUsado]) {
    a.tomPorSentimento[sentimentoPublico][tomUsado] = { sucessos: 0, falhas: 0, total: 0 };
  }
  const t = a.tomPorSentimento[sentimentoPublico][tomUsado];
  if (sucesso) t.sucessos++; else t.falhas++;
  t.total++;
  salvar();
  return { ok: true, sentimento: sentimentoPublico, tom: tomUsado, sucesso };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 4. MELHOR TOM PARA UM SENTIMENTO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function melhorTomParaSentimento(sentimentoPublico) {
  const a = carregar();
  const tons = a.tomPorSentimento[sentimentoPublico];
  if (!tons) return null;
  let melhor = null;
  let melhorTaxa = -1;
  for (const [tom, stats] of Object.entries(tons)) {
    if (stats.total < 3) continue;
    const taxa = stats.sucessos / stats.total;
    if (taxa > melhorTaxa) {
      melhorTaxa = taxa;
      melhor = tom;
    }
  }
  return melhor ? { tom: melhor, taxaSucesso: melhorTaxa, total: tons[melhor].total } : null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 5. REGISTRAR HORÁRIO POR DESEMPENHO
// Qual horário funciona melhor para cada rede
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarHorarioDesempenho(rede, horario, engajamento, sucesso) {
  const a = carregar();
  if (!a.horarioPorDesempenho[rede]) {
    a.horarioPorDesempenho[rede] = {};
  }
  if (!a.horarioPorDesempenho[rede][horario]) {
    a.horarioPorDesempenho[rede][horario] = { engajamentoTotal: 0, posts: 0, sucessos: 0 };
  }
  const h = a.horarioPorDesempenho[rede][horario];
  h.engajamentoTotal += engajamento || 0;
  h.posts++;
  if (sucesso) h.sucessos++;
  salvar();
  return { ok: true, rede, horario, engajamento };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 6. MELHOR HORÁRIO PARA UMA REDE
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function melhorHorarioParaRede(rede) {
  const a = carregar();
  const horarios = a.horarioPorDesempenho[rede];
  if (!horarios) return null;
  let melhor = null;
  let melhorEngajamento = -1;
  for (const [horario, stats] of Object.entries(horarios)) {
    if (stats.posts < 2) continue;
    const medio = stats.engajamentoTotal / stats.posts;
    if (medio > melhorEngajamento) {
      melhorEngajamento = medio;
      melhor = horario;
    }
  }
  return melhor ? { horario: melhor, engajamentoMedio: melhorEngajamento, posts: horarios[melhor].posts } : null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 7. BLACKLIST DE PALAVRAS
// Palavras que geraram reprovação são evitadas
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function adicionarPalavraBloqueada(palavra, motivo) {
  const a = carregar();
  const existe = a.palavrasBloqueadas.find(p => p.palavra === palavra);
  if (existe) {
    existe.ocorrencias++;
    existe.ultimaOcorrencia = new Date().toISOString();
  } else {
    a.palavrasBloqueadas.push({ palavra, motivo, ocorrencias: 1, primeiraOcorrencia: new Date().toISOString() });
  }
  salvar();
  return { ok: true, palavra };
}

function verificarPalavrasBloqueadas(texto) {
  const a = carregar();
  const encontradas = [];
  const lower = texto.toLowerCase();
  for (const p of a.palavrasBloqueadas) {
    if (lower.includes(p.palavra.toLowerCase())) {
      encontradas.push(p);
    }
  }
  return {
    limpo: encontradas.length === 0,
    palavrasBloqueadasEncontradas: encontradas,
    sugestao: encontradas.length > 0 ? 'Remova ou substitua estas palavras: ' + encontradas.map(p => p.palavra).join(', ') : null,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 8. REGISTRAR CONTEÚDO QUE FUNCIONA / NÃO FUNCIONA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarConteudoResultado(texto, tipo, rede, desempenho, jogos) {
  const a = carregar();
  const entrada = {
    texto: texto.slice(0, 200),
    tipo, // 'post', 'comentario', 'email', etc.
    rede,
    desempenho, // 'alto', 'medio', 'baixo'
    jogos: jogos || [],
    quando: new Date().toISOString(),
  };
  if (desempenho === 'alto') {
    a.conteudoQueFunciona.push(entrada);
    if (a.conteudoQueFunciona.length > 200) a.conteudoQueFunciona = a.conteudoQueFunciona.slice(-200);
  } else if (desempenho === 'baixo') {
    a.conteudoQueNaoFunciona.push(entrada);
    if (a.conteudoQueNaoFunciona.length > 200) a.conteudoQueNaoFunciona = a.conteudoQueNaoFunciona.slice(-200);
  }
  salvar();
  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 9. SUGERIR CONTEÚDO BASEADO NO QUE FUNCIONA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function sugerirConteudo(tipo, rede, jogos) {
  const a = carregar();
  const candidatos = a.conteudoQueFunciona.filter(c => c.tipo === tipo && c.rede === rede);
  if (jogos && jogos.length) {
    const filtrados = candidatos.filter(c => c.jogos.some(j => jogos.includes(j)));
    if (filtrados.length) return filtrados[Math.floor(Math.random() * filtrados.length)];
  }
  if (candidatos.length) return candidatos[Math.floor(Math.random() * candidatos.length)];
  return null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 10. REGISTRAR PLANO EXECUTADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarPlano(plano, resultado, sucesso) {
  const a = carregar();
  a.planosExecutados.push({
    plano: plano.slice(0, 200),
    resultado: resultado.slice(0, 500),
    sucesso,
    quando: new Date().toISOString(),
  });
  if (a.planosExecutados.length > 100) a.planosExecutados = a.planosExecutados.slice(-100);
  salvar();
  return { ok: true };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 11. ESTATÍSTICAS DE APRENDIZADO
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasAprendizado() {
  const a = carregar();
  const totalModelos = Object.values(a.modeloPorIntencao).reduce((s, m) => s + Object.values(m).reduce((t, mm) => t + mm.total, 0), 0);
  const totalTons = Object.values(a.tomPorSentimento).reduce((s, t) => s + Object.values(t).reduce((tt, tm) => tt + tm.total, 0), 0);
  const totalHorarios = Object.values(a.horarioPorDesempenho).reduce((s, h) => s + Object.values(h).reduce((th, tm) => th + tm.posts, 0), 0);
  return {
    versoes: a.versoes.length,
    modeloPorIntencao: Object.keys(a.modeloPorIntencao).length,
    tomPorSentimento: Object.keys(a.tomPorSentimento).length,
    horarioPorRede: Object.keys(a.horarioPorDesempenho).length,
    palavrasBloqueadas: a.palavrasBloqueadas.length,
    conteudoQueFunciona: a.conteudoQueFunciona.length,
    conteudoQueNaoFunciona: a.conteudoQueNaoFunciona.length,
    planosExecutados: a.planosExecutados.length,
    totalAmostrasModelos: totalModelos,
    totalAmostrasTons: totalTons,
    totalAmostrasHorarios: totalHorarios,
  };
}

module.exports = {
  registrarResultadoModelo,
  melhorModeloParaIntencao,
  registrarTomPorSentimento,
  melhorTomParaSentimento,
  registrarHorarioDesempenho,
  melhorHorarioParaRede,
  adicionarPalavraBloqueada,
  verificarPalavrasBloqueadas,
  registrarConteudoResultado,
  sugerirConteudo,
  registrarPlano,
  estatisticasAprendizado,
  carregar,
  salvar,
  ARQUIVO_APRENDIZAGEM,
};