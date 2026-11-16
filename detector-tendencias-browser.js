// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📈 DETECTOR DE TENDÊNCIAS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_tendencias_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return { deteccoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  }
  function salvar(c) {
    try {
      c.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(c));
    } catch (e) {}
  }

  window.__tend_detectarTendencia = function (metricas) {
    const c = carregar();
    const agora = new Date();
    const id = 'tend_' + c.proximoId++;

    const quedas = [], altas = [], estaveis = [];

    for (const [metrica, valores] of Object.entries(metricas || {})) {
      const atual = valores.atual;
      const anterior = valores.anterior;
      if (anterior === 0) continue;
      const pctMudanca = ((atual - anterior) / anterior) * 100;

      if (pctMudanca <= -15) quedas.push({ metrica, atual, anterior, pctMudanca: pctMudanca.toFixed(2) });
      else if (pctMudanca >= 15) altas.push({ metrica, atual, anterior, pctMudanca: pctMudanca.toFixed(2) });
      else estaveis.push({ metrica, atual, anterior, pctMudanca: pctMudanca.toFixed(2) });
    }

    let severidade = 'baixa', tipo = 'estavel', mensagem = '', acao = '';

    if (quedas.length >= 2) {
      severidade = 'alta'; tipo = 'queda_correlacionada';
      mensagem = 'QUEDA CORRELACIONADA: ' + quedas.length + ' métricas caíram (' + quedas.map(q => q.metrica + ' ' + q.pctMudanca + '%').join(', ') + ')';
      acao = 'Criar campanha de recuperação imediata';
    } else if (quedas.length === 1) {
      severidade = 'media'; tipo = 'queda_isolada';
      mensagem = 'Queda isolada em ' + quedas[0].metrica + ': ' + quedas[0].pctMudanca + '%';
      acao = 'Investigar causa da queda';
    } else if (altas.length >= 2) {
      severidade = 'baixa'; tipo = 'alta_correlacionada';
      mensagem = 'ALTA CORRELACIONADA: ' + altas.length + ' métricas subiram';
      acao = 'Replicar o que funcionou';
    } else {
      mensagem = 'Nenhuma tendência significativa detectada';
      acao = 'Continuar estratégia atual';
    }

    const deteccao = { id, tipo, severidade, mensagem, acao, quedas, altas, estaveis, criadoEm: agora.toISOString() };
    c.deteccoes.push(deteccao);
    salvar(c);
    return { ok: true, deteccao };
  };

  window.__tend_listarDeteccoes = function (limite) {
    const c = carregar();
    return c.deteccoes.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm)).slice(0, limite || 10);
  };

  window.__tend_estatisticasTendencias = function () {
    const c = carregar();
    const total = c.deteccoes.length;
    const porTipo = {}, porSeveridade = {};
    for (const d of c.deteccoes) {
      if (!porTipo[d.tipo]) porTipo[d.tipo] = 0; porTipo[d.tipo]++;
      if (!porSeveridade[d.severidade]) porSeveridade[d.severidade] = 0; porSeveridade[d.severidade]++;
    }
    return { total, porTipo, porSeveridade };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);