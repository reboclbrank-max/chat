// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🧠 INTELIGÊNCIA DE MARKETING — versão navegador (localStorage)
// Integra com index.html: memória, intenção, raciocínio marketing, sentimento,
// cache semântico, feedback, ambiguidade, personalização.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE_MEMORIA = 'assistente_rebocl_inteligencia_memoria_v1';
  const CHAVE_FEEDBACK = 'assistente_rebocl_inteligencia_feedback_v1';
  const CHAVE_CACHE = 'assistente_rebocl_inteligencia_cache_v1';
  const CHAVE_PREFERENCIAS = 'assistente_rebocl_inteligencia_prefs_v1';

  const JOGOS_PERMITIDOS = ['ceifalume', 'prancheta'];

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 1. MEMÓRIA PERSISTENTE (localStorage)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function carregarMemoria() {
    try {
      const b = localStorage.getItem(CHAVE_MEMORIA);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
      ultimoJogo: null,
      tomPreferido: 'neutro',
      horariosPreferidos: [],
      metas: {},
      ultimasConversas: [],
      preferencias: {},
      atualizadoEm: new Date().toISOString(),
    };
  }

  function salvarMemoria(m) {
    try {
      m.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE_MEMORIA, JSON.stringify(m));
    } catch (e) {}
  }

  window.__inteligencia_salvarMemoriaConversa = function (chave, valor) {
    const m = carregarMemoria();
    m[chave] = { valor, atualizadoEm: new Date().toISOString() };
    salvarMemoria(m);
    return { ok: true, chave, valor };
  };

  window.__inteligencia_lerMemoriaConversa = function (chave) {
    const m = carregarMemoria();
    return m[chave] ? m[chave].valor : null;
  };

  window.__inteligencia_adicionarConversaMemoria = function (pergunta, resposta, intencao, jogo) {
    const m = carregarMemoria();
    m.ultimasConversas.push({
      quando: new Date().toISOString(),
      pergunta: String(pergunta || '').slice(0, 200),
      resposta: String(resposta || '').slice(0, 200),
      intencao: intencao || null,
      jogo: jogo || null,
    });
    if (m.ultimasConversas.length > 20) m.ultimasConversas = m.ultimasConversas.slice(-20);
    if (jogo) m.ultimoJogo = jogo;
    salvarMemoria(m);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 2. DETECÇÃO DE INTENÇÃO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const SINAIS_INTENCAO = {
    postar: ['poste', 'publique', 'divulgue', 'lan\u00e7e', 'post', 'tweet', 'toot', 'reel', 'compartilhe', 'mande', 'envie', 'coloque no ar'],
    medir: ['m\u00e9trica', 'acesso', 'inscrito', 'seguidor', 'download', 'visualiza\u00e7\u00e3o', 'quanto', 'qual o placar', 'estat\u00edstica', 'desempenho', 'resultado', 'contagem'],
    criar: ['crie', 'escreva', 'gere', 'produza', 'roteiro', 'texto', 'legenda', 'imagem', 'desenhe', 'roteirize', 'esboce'],
    ajustar: ['mude', 'altere', 'configure', 'defina', 'ajuste', 'hor\u00e1rio', 'frequ\u00eancia', 'tom', 'mem\u00f3ria', 'prefer\u00eancia'],
    conversar: ['oi', 'ol\u00e1', 'tudo bem', 'como vai', 'e a\u00ed', 'beleza', 'sumiu'],
  };

  window.__inteligencia_detectarIntencao = function (texto) {
    if (!texto) return { intencao: 'conversar', confianca: 0 };
    const t = texto.toLowerCase();
    let melhorIntencao = 'conversar';
    let melhorPontuacao = 0;
    for (const [intencao, palavras] of Object.entries(SINAIS_INTENCAO)) {
      let pontuacao = 0;
      for (const p of palavras) { if (t.includes(p)) pontuacao++; }
      if (pontuacao > melhorPontuacao) { melhorPontuacao = pontuacao; melhorIntencao = intencao; }
    }
    const confianca = melhorPontuacao > 0 ? Math.min(melhorPontuacao / 3, 1) : 0.3;
    return { intencao: melhorIntencao, confianca };
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 3. RACIOCÍNIO LOCAL PARA MARKETING
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__inteligencia_raciocinioMarketing = function (pergunta) {
    if (!pergunta) return null;
    const t = pergunta.toLowerCase();

    // Projeção de inscritos
    const m1 = t.match(/(\d+(?:[.,]\d+)?)\s*inscritos.*?(\d+(?:[.,]\d+)?)%\s*ao\s*dia.*?(\d+)\s*dias/);
    if (m1) {
      const atuais = parseFloat(m1[1].replace(',', '.'));
      const taxa = parseFloat(m2 = m1[2].replace(',', '.')) / 100;
      const dias = parseInt(m1[3], 10);
      const projetado = Math.round(atuais * Math.pow(1 + taxa, dias));
      const ganho = projetado - atuais;
      return {
        ferramenta: 'marketing-projecao-inscritos',
        texto: 'Em ' + dias + ' dias: ' + projetado.toLocaleString('pt-BR') + ' inscritos (ganho de ' + ganho.toLocaleString('pt-BR') + ')',
        dados: { atuais, taxa, dias, projetado, ganho },
      };
    }

    // Taxa de conversão
    const m2 = t.match(/(\d+(?:[.,]\d+)?)\s*cliques.*?(\d+(?:[.,]\d+)?)\s*downloads/);
    if (m2) {
      const cliques = parseFloat(m2[1].replace(',', '.'));
      const downloads = parseFloat(m2[2].replace(',', '.'));
      const taxa = cliques > 0 ? Math.round((downloads / cliques) * 100) : 0;
      return {
        ferramenta: 'marketing-taxa-conversao',
        texto: 'Taxa de convers\u00e3o: ' + taxa + '% (' + downloads.toLocaleString('pt-BR') + '/' + cliques.toLocaleString('pt-BR') + ')',
        dados: { cliques, downloads, taxa },
      };
    }

    // Tempo por post
    const m3 = t.match(/(\d+(?:[.,]\d+)?)\s*horas?.*?(\d+(?:[.,]\d+)?)\s*posts/);
    if (m3) {
      const horas = parseFloat(m3[1].replace(',', '.'));
      const posts = parseFloat(m3[2].replace(',', '.'));
      const minutosPorPost = posts > 0 ? Math.round((horas * 60) / posts) : 0;
      return {
        ferramenta: 'marketing-tempo-por-post',
        texto: minutosPorPost + ' minutos por post',
        dados: { horas, posts, minutosPorPost },
      };
    }

    // Break-even de tempo
    const m4 = t.match(/quero\s*(\d+(?:[.,]\d+)?)\s*downloads.*?(\d+(?:[.,]\d+)?)\s*posts?\s*por\s*dia.*?cada\s*post\s*leva\s*(\d+(?:[.,]\d+)?)\s*minutos?/);
    if (m4) {
      const alvo = parseFloat(m4[1].replace(',', '.'));
      const postsDia = parseFloat(m4[2].replace(',', '.'));
      const minPorPost = parseFloat(m4[3].replace(',', '.'));
      const diasNecessarios = alvo > 0 && postsDia > 0 ? Math.ceil(alvo / postsDia) : 0;
      const tempoTotal = diasNecessarios * postsDia * minPorPost;
      return {
        ferramenta: 'marketing-break-even',
        texto: 'Para ' + alvo.toLocaleString('pt-BR') + ' downloads: ' + diasNecessarios + ' dias, ' + tempoTotal.toLocaleString('pt-BR') + ' minutos totais',
        dados: { alvo, postsDia, minPorPost, diasNecessarios, tempoTotal },
      };
    }

    // Melhor horário
    const m5 = t.match(/melhor\s*hor[aa]rio|qual\s*hor[aa]rio|quando\s*postar|hor[aa]rio\s*de\s*acesso/);
    if (m5) {
      const m = carregarMemoria();
      const fluxos = m.preferencias.fluxoAcesso || {};
      let melhor = null;
      let melhorValor = -1;
      for (const [hora, acessos] of Object.entries(fluxos)) {
        if (acessos > melhorValor) { melhorValor = acessos; melhor = hora; }
      }
      if (melhor) {
        return {
          ferramenta: 'marketing-melhor-horario',
          texto: 'Melhor hor\u00e1rio para postar: ' + melhor + 'h (' + melhorValor + ' acessos no hist\u00f3rico)',
          dados: { melhorHorario: melhor, acessos: melhorValor },
        };
      }
      return {
        ferramenta: 'marketing-melhor-horario',
        texto: 'Ainda n\u00e3o h\u00e1 dados de fluxo de acesso suficientes. Use registrarFluxoAcesso().',
        dados: null,
      };
    }

    // ROI de tempo
    const m6 = t.match(/(\d+(?:[.,]\d+)?)\s*horas?.*?(\d+(?:[.,]\d+)?)\s*downloads/);
    if (m6) {
      const horas = parseFloat(m6[1].replace(',', '.'));
      const downloads = parseFloat(m6[2].replace(',', '.'));
      const downloadsPorHora = horas > 0 ? Math.round(downloads / horas) : 0;
      return {
        ferramenta: 'marketing-roi-tempo',
        texto: downloadsPorHora.toLocaleString('pt-BR') + ' downloads por hora de trabalho',
        dados: { horas, downloads, downloadsPorHora },
      };
    }

    return null;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 4. ANÁLISE DE SENTIMENTO DAS RESPOSTAS PRÓPRIAS
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const PALAVRAS_POSITIVAS_MK = [
    'gr\u00e1tis', 'jogue', 'baixe', 'teste', 'veja', 'descubra', 'simule', 'link', 'apk',
    'incr\u00edvel', 'excelente', 'maravilhoso', 'fant\u00e1stico', 'sensacional', 'top',
    'imperd\u00edvel', 'vale a pena', 'parab\u00e9ns', 'nota 10', 'aprovado', 'recomendo',
  ];
  const PALAVRAS_NEGATIVAS_MK = [
    'n\u00e3o', 'nunca', 'jamais', 'nenhum', 'nada', 'erro', 'falha', 'bug', 'lixo',
    'ruim', 'p\u00e9ssimo', 'horr\u00edvel', 'odeio', 'decep\u00e7\u00e3o', 'perda de tempo', 'travar',
    'cobran\u00e7a', 'pago', 'assinatura',
  ];
  const CTAS = ['baixe', 'jogue', 'acesse', 'confira', 'veja', 'teste', 'link', 'download', 'jogue agora', 'baixe agora'];

  window.__inteligencia_avaliarQualidadeResposta = function (texto, contexto) {
    if (!texto) return { aprovado: false, problemas: ['texto vazio'], sugestao: 'Escreva uma resposta antes de enviar' };
    const problemas = [];
    const t = texto.toLowerCase();

    if (texto.length < 15) problemas.push('resposta muito curta para marketing');

    if (contexto === 'divulgacao') {
      const temCTA = CTAS.some(c => t.includes(c));
      if (!temCTA) problemas.push('sem chamada para a\u00e7\u00e3o (CTA) clara');
    }

    const negacoes = (t.match(/\b(n\u00e3o|nunca|jamais|nenhum|nada)\b/g) || []).length;
    if (negacoes > 2) problemas.push('muitas nega\u00e7\u00f5es (tom pode desanimar)');

    const hashtags = (texto.match(/#\w+/g) || []).length;
    if (hashtags > 3) problemas.push('muitas hashtags (' + hashtags + ', m\u00e1ximo 3)');

    const pontuacao = texto.length > 0 ? 10 - problemas.length * 2 : 0;
    const aprovado = problemas.length === 0;

    return {
      aprovado,
      pontuacao: Math.max(pontuacao, 0),
      problemas,
      sugestao: aprovado ? 'resposta aprovada para marketing' : 'reescreva com tom mais positivo e CTA claro',
    };
  };

  window.__inteligencia_reescreverRespostaMarketing = function (texto, jogo) {
    if (!texto) return texto;
    const nomeJogo = jogo ? ' do ' + jogo : '';
    let nova = texto.trim();
    if (!nova.endsWith('.') && !nova.endsWith('!') && !nova.endsWith('?')) nova += '.';
    const temCTA = CTAS.some(c => nova.toLowerCase().includes(c));
    if (!temCTA) {
      nova += ' Baixe' + nomeJogo + ' agora: reboclbrank-max.itch.io';
    }
    return nova;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 5. CACHE SEMÂNTICO (localStorage)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function carregarCache() {
    try {
      const b = localStorage.getItem(CHAVE_CACHE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return { entradas: [], criadoEm: new Date().toISOString() };
  }
  function salvarCache(c) {
    try { localStorage.setItem(CHAVE_CACHE, JSON.stringify(c)); } catch (e) {}
  }

  function normalizarPalavras(texto) {
    return texto.toLowerCase().replace(/[^\w\s\u00e0-\u00fc]/g, ' ').split(/\s+/).filter(w => w.length > 2);
  }

  function similaridadeJaccard(a, b) {
    const setA = new Set(normalizarPalavras(a));
    const setB = new Set(normalizarPalavras(b));
    const intersecao = new Set([...setA].filter(x => setB.has(x)));
    const uniao = new Set([...setA, ...setB]);
    if (uniao.size === 0) return 0;
    return intersecao.size / uniao.size;
  }

  window.__inteligencia_buscarCacheSemantico = function (pergunta, limite) {
    if (limite == null) limite = 0.7;
    const cache = carregarCache();
    let melhor = null;
    let melhorSim = 0;
    for (const e of cache.entradas) {
      const sim = similaridadeJaccard(pergunta, e.pergunta);
      if (sim > melhorSim && sim >= limite) { melhorSim = sim; melhor = e; }
    }
    if (melhor) {
      melhor.usos = (melhor.usos || 0) + 1;
      melhor.ultimoUso = new Date().toISOString();
      salvarCache(cache);
      return { resposta: melhor.resposta, similaridade: melhorSim };
    }
    return null;
  };

  window.__inteligencia_salvarCacheSemantico = function (pergunta, resposta) {
    const cache = carregarCache();
    cache.entradas.push({
      pergunta: String(pergunta || '').slice(0, 200),
      resposta: String(resposta || '').slice(0, 500),
      criadoEm: new Date().toISOString(),
      usos: 1,
    });
    if (cache.entradas.length > 500) {
      cache.entradas = cache.entradas.sort((a, b) => (b.usos || 0) - (a.usos || 0)).slice(0, 500);
    }
    salvarCache(cache);
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 6. APRENDIZADO COM FEEDBACK (localStorage)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  function carregarFeedback() {
    try {
      const b = localStorage.getItem(CHAVE_FEEDBACK);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return { entradas: [], criadoEm: new Date().toISOString() };
  }
  function salvarFeedback(fb) {
    try { localStorage.setItem(CHAVE_FEEDBACK, JSON.stringify(fb)); } catch (e) {}
  }

  window.__inteligencia_registrarFeedback = function (pergunta, resposta, aprovado, rede, modelo, intencao) {
    const fb = carregarFeedback();
    fb.entradas.push({
      quando: new Date().toISOString(),
      pergunta: String(pergunta || '').slice(0, 200),
      resposta: String(resposta || '').slice(0, 200),
      aprovado: !!aprovado,
      rede: rede || null,
      modelo: modelo || null,
      intencao: intencao || null,
    });
    if (fb.entradas.length > 1000) fb.entradas = fb.entradas.slice(-1000);
    salvarFeedback(fb);
    return { ok: true };
  };

  window.__inteligencia_estatisticasFeedback = function () {
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
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 7. DETECÇÃO DE PERGUNTA AMBÍGUA
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  const PALAVRAS_AMBIGUAS = ['isso', 'aquilo', 'aquela', 'aquele', 'talvez', 'tal', 'qualquer', 'coisa', 'algo'];
  const SINAIS_AMBIGUIDADE = ['talvez', 'acho que', 'n\u00e3o sei', 'd\u00e1 pra', 'd\u00e1 para', 'ser\u00e1 que', 'pode ser'];

  window.__inteligencia_detectarPerguntaAmbigua = function (pergunta) {
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
      sugestao: ambigua ? 'Sua pergunta n\u00e3o ficou clara. Pode reformular com mais detalhes? Ex: "poste no Instagram sobre o Ceifalume"' : null,
    };
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // 8. PERSONALIZAÇÃO
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__inteligencia_obterPreferencias = function () {
    const m = carregarMemoria();
    return {
      ultimoJogo: m.ultimoJogo,
      tomPreferido: m.tomPreferido || 'neutro',
      horariosPreferidos: m.horariosPreferidos || [],
      metas: m.metas || {},
      preferencias: m.preferencias || {},
      jogos: JOGOS_PERMITIDOS,
    };
  };

  window.__inteligencia_salvarPreferencias = function (prefs) {
    const m = carregarMemoria();
    if (prefs.tomPreferido) m.tomPreferido = prefs.tomPreferido;
    if (prefs.horariosPreferidos) m.horariosPreferidos = prefs.horariosPreferidos;
    if (prefs.metas) m.metas = prefs.metas;
    if (prefs.preferencias) m.preferencias = prefs.preferencias;
    if (prefs.ultimoJogo) m.ultimoJogo = prefs.ultimoJogo;
    salvarMemoria(m);
    return { ok: true };
  };

  window.__inteligencia_validarJogo = function (jogo) {
    return JOGOS_PERMITIDOS.includes(jogo);
  };

  window.__inteligencia_jogoDaPergunta = function (pergunta) {
    if (!pergunta) return null;
    const t = pergunta.toLowerCase();
    for (const j of JOGOS_PERMITIDOS) { if (t.includes(j)) return j; }
    return null;
  };

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FLUXO PRINCIPAL — processar mensagem do dono
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  window.__inteligencia_processarMensagemDono = function (pergunta) {
    const resultado = {
      pergunta,
      quando: new Date().toISOString(),
      intencao: null,
      jogo: null,
      ambiguidade: null,
      raciocinioMarketing: null,
      sentimentoResposta: null,
      cacheHit: null,
      preferencias: null,
      acaoRecomendada: null,
      respostaDireta: null,
    };

    resultado.intencao = window.__inteligencia_detectarIntencao(pergunta);
    resultado.jogo = window.__inteligencia_jogoDaPergunta(pergunta) || window.__inteligencia_lerMemoriaConversa('ultimoJogo');
    resultado.ambiguidade = window.__inteligencia_detectarPerguntaAmbigua(pergunta);
    resultado.raciocinioMarketing = window.__inteligencia_raciocinioMarketing(pergunta);
    resultado.cacheHit = window.__inteligencia_buscarCacheSemantico(pergunta);
    resultado.preferencias = window.__inteligencia_obterPreferencias();

    if (resultado.cacheHit) {
      resultado.acaoRecomendada = 'responder_cache';
      resultado.respostaDireta = resultado.cacheHit.resposta;
      window.__inteligencia_adicionarConversaMemoria(pergunta, resultado.respostaDireta, resultado.intencao.intencao, resultado.jogo);
      window.__inteligencia_salvarCacheSemantico(pergunta, resultado.respostaDireta);
      return resultado;
    }

    if (resultado.ambiguidade.ambigua) {
      resultado.acaoRecomendada = 'pedir_esclarecimento';
      resultado.respostaDireta = resultado.ambiguidade.sugestao;
      window.__inteligencia_adicionarConversaMemoria(pergunta, resultado.respostaDireta, resultado.intencao.intencao, resultado.jogo);
      return resultado;
    }

    if (resultado.raciocinioMarketing) {
      resultado.acaoRecomendada = 'responder_raciocinio';
      resultado.respostaDireta = resultado.raciocinioMarketing.texto;
      window.__inteligencia_adicionarConversaMemoria(pergunta, resultado.respostaDireta, resultado.intencao.intencao, resultado.jogo);
      window.__inteligencia_salvarCacheSemantico(pergunta, resultado.respostaDireta);
      return resultado;
    }

    resultado.acaoRecomendada = 'encaminhar_ia';
    return resultado;
  };

  window.__inteligencia_finalizarResposta = function (pergunta, resposta, aprovado, rede, modelo, intencao, jogo) {
    const qualidade = window.__inteligencia_avaliarQualidadeResposta(resposta, 'geral');
    window.__inteligencia_registrarFeedback(pergunta, resposta, aprovado, rede, modelo, intencao);
    window.__inteligencia_adicionarConversaMemoria(pergunta, resposta, intencao, jogo);
    window.__inteligencia_salvarCacheSemantico(pergunta, resposta);
    return { qualidade, aprovado };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);