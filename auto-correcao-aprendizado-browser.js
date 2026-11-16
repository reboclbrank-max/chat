// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 AUTO-CORREÇÃO E LOOP DE APRENDIZADO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_aprendizado_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
      modeloPorIntencao: {},
      tomPorSentimento: {},
      horarioPorDesempenho: {},
      palavrasBloqueadas: [],
      conteudoQueFunciona: [],
      conteudoQueNaoFunciona: [],
      planosExecutados: [],
      versoes: [],
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
  }
  function salvar(a) {
    try {
      a.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(a));
    } catch (e) {}
  }

  window.__aprend_registrarResultadoModelo = function (intencao, modelo, sucesso, confianca) {
    const a = carregar();
    if (!a.modeloPorIntencao[intencao]) a.modeloPorIntencao[intencao] = {};
    if (!a.modeloPorIntencao[intencao][modelo]) {
      a.modeloPorIntencao[intencao][modelo] = { acertos: 0, erros: 0, confiancaMedia: 0, total: 0 };
    }
    const m = a.modeloPorIntencao[intencao][modelo];
    if (sucesso) m.acertos++; else m.erros++;
    m.total++;
    m.confiancaMedia = ((m.confiancaMedia * (m.total - 1)) + confianca) / m.total;
    salvar(a);
    return { ok: true };
  };

  window.__aprend_melhorModeloParaIntencao = function (intencao) {
    const a = carregar();
    const modelos = a.modeloPorIntencao[intencao];
    if (!modelos) return null;
    let melhor = null; let melhorTaxa = -1;
    for (const [modelo, stats] of Object.entries(modelos)) {
      if (stats.total < 3) continue;
      const taxa = stats.acertos / stats.total;
      if (taxa > melhorTaxa) { melhorTaxa = taxa; melhor = modelo; }
    }
    return melhor ? { modelo: melhor, taxaAcerto: melhorTaxa, total: modelos[melhor].total } : null;
  };

  window.__aprend_registrarTomPorSentimento = function (sentimentoPublico, tomUsado, sucesso) {
    const a = carregar();
    if (!a.tomPorSentimento[sentimentoPublico]) a.tomPorSentimento[sentimentoPublico] = {};
    if (!a.tomPorSentimento[sentimentoPublico][tomUsado]) {
      a.tomPorSentimento[sentimentoPublico][tomUsado] = { sucessos: 0, falhas: 0, total: 0 };
    }
    const t = a.tomPorSentimento[sentimentoPublico][tomUsado];
    if (sucesso) t.sucessos++; else t.falhas++;
    t.total++;
    salvar(a);
    return { ok: true };
  };

  window.__aprend_melhorTomParaSentimento = function (sentimentoPublico) {
    const a = carregar();
    const tons = a.tomPorSentimento[sentimentoPublico];
    if (!tons) return null;
    let melhor = null; let melhorTaxa = -1;
    for (const [tom, stats] of Object.entries(tons)) {
      if (stats.total < 3) continue;
      const taxa = stats.sucessos / stats.total;
      if (taxa > melhorTaxa) { melhorTaxa = taxa; melhor = tom; }
    }
    return melhor ? { tom: melhor, taxaSucesso: melhorTaxa, total: tons[melhor].total } : null;
  };

  window.__aprend_registrarHorarioDesempenho = function (rede, horario, engajamento, sucesso) {
    const a = carregar();
    if (!a.horarioPorDesempenho[rede]) a.horarioPorDesempenho[rede] = {};
    if (!a.horarioPorDesempenho[rede][horario]) {
      a.horarioPorDesempenho[rede][horario] = { engajamentoTotal: 0, posts: 0, sucessos: 0 };
    }
    const h = a.horarioPorDesempenho[rede][horario];
    h.engajamentoTotal += engajamento || 0;
    h.posts++;
    if (sucesso) h.sucessos++;
    salvar(a);
    return { ok: true };
  };

  window.__aprend_melhorHorarioParaRede = function (rede) {
    const a = carregar();
    const horarios = a.horarioPorDesempenho[rede];
    if (!horarios) return null;
    let melhor = null; let melhorEngajamento = -1;
    for (const [horario, stats] of Object.entries(horarios)) {
      if (stats.posts < 2) continue;
      const medio = stats.engajamentoTotal / stats.posts;
      if (medio > melhorEngajamento) { melhorEngajamento = medio; melhor = horario; }
    }
    return melhor ? { horario: melhor, engajamentoMedio: melhorEngajamento, posts: horarios[melhor].posts } : null;
  };

  window.__aprend_adicionarPalavraBloqueada = function (palavra, motivo) {
    const a = carregar();
    const existe = a.palavrasBloqueadas.find(p => p.palavra === palavra);
    if (existe) { existe.ocorrencias++; existe.ultimaOcorrencia = new Date().toISOString(); }
    else { a.palavrasBloqueadas.push({ palavra, motivo, ocorrencias: 1, primeiraOcorrencia: new Date().toISOString() }); }
    salvar(a);
    return { ok: true, palavra };
  };

  window.__aprend_verificarPalavrasBloqueadas = function (texto) {
    const a = carregar();
    const encontradas = [];
    const lower = texto.toLowerCase();
    for (const p of a.palavrasBloqueadas) {
      if (lower.includes(p.palavra.toLowerCase())) encontradas.push(p);
    }
    return {
      limpo: encontradas.length === 0,
      palavrasBloqueadasEncontradas: encontradas,
      sugestao: encontradas.length > 0 ? 'Remova ou substitua: ' + encontradas.map(p => p.palavra).join(', ') : null,
    };
  };

  window.__aprend_registrarConteudoResultado = function (texto, tipo, rede, desempenho, jogos) {
    const a = carregar();
    const entrada = { texto: String(texto || '').slice(0, 200), tipo, rede, desempenho, jogos: jogos || [], quando: new Date().toISOString() };
    if (desempenho === 'alto') { a.conteudoQueFunciona.push(entrada); if (a.conteudoQueFunciona.length > 200) a.conteudoQueFunciona = a.conteudoQueFunciona.slice(-200); }
    else if (desempenho === 'baixo') { a.conteudoQueNaoFunciona.push(entrada); if (a.conteudoQueNaoFunciona.length > 200) a.conteudoQueNaoFunciona = a.conteudoQueNaoFunciona.slice(-200); }
    salvar(a);
    return { ok: true };
  };

  window.__aprend_sugerirConteudo = function (tipo, rede, jogos) {
    const a = carregar();
    const candidatos = a.conteudoQueFunciona.filter(c => c.tipo === tipo && c.rede === rede);
    if (jogos && jogos.length) {
      const filtrados = candidatos.filter(c => c.jogos.some(j => jogos.includes(j)));
      if (filtrados.length) return filtrados[Math.floor(Math.random() * filtrados.length)];
    }
    if (candidatos.length) return candidatos[Math.floor(Math.random() * candidatos.length)];
    return null;
  };

  window.__aprend_registrarPlano = function (plano, resultado, sucesso) {
    const a = carregar();
    a.planosExecutados.push({ plano: String(plano || '').slice(0, 200), resultado: String(resultado || '').slice(0, 500), sucesso, quando: new Date().toISOString() });
    if (a.planosExecutados.length > 100) a.planosExecutados = a.planosExecutados.slice(-100);
    salvar(a);
    return { ok: true };
  };

  window.__aprend_estatisticasAprendizado = function () {
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
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);