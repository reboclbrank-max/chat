// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚨 ALERTA DE QUEDA + RECUPERAÇÃO — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_alertas_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
      alertas: [],
      recuperacoes: [],
      proximoId: 1,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };
  }
  function salvar(c) {
    try {
      c.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(c));
    } catch (e) {}
  }

  window.__queda_detectarQueda = function (metrica, valorAtual, limiarPct) {
    const c = carregar();
    limiarPct = limiarPct || 10;

    const historico = c.alertas
      .filter(a => a.metrica === metrica)
      .sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));

    let alerta = null;

    if (historico.length > 0) {
      const anterior = historico[0].valorAtual;
      const diferenca = valorAtual - anterior;
      const pctDiferenca = anterior !== 0 ? (diferenca / anterior) * 100 : 0;

      if (pctDiferenca <= -limiarPct) {
        const severidade = pctDiferenca <= -30 ? 'alta' : pctDiferenca <= -20 ? 'media' : 'baixa';

        alerta = {
          id: 'alerta_' + c.proximoId++,
          metrica,
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
      }
    }

    c.alertas.push({
      id: 'ref_' + c.proximoId++,
      metrica,
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

    salvar(c);
    return { alerta, historico };
  };

  window.__queda_listarAlertas = function (status) {
    const c = carregar();
    if (status) return c.alertas.filter(a => a.status === status);
    return c.alertas;
  };

  window.__queda_sugerirRecuperacao = function (idAlerta) {
    const c = carregar();
    const alerta = c.alertas.find(a => a.id === idAlerta);
    if (!alerta) return { ok: false, erro: 'Alerta não encontrado' };

    const sugestoes = {
      downloads: '📥 Crie uma campanha de reativação para usuários inativos.',
      inscritos: '👥 Publique um teaser exclusivo e convide seguidores a se inscreverem.',
      ctr: '🔗 Revise as chamadas para ação (CTA) e imagens dos posts.',
      conversao: '🎯 Simplifique o fluxo de download e verifique o link.',
      churn: '🔄 Lance uma campanha de win-back para quem saiu.',
      receita: '💰 Crie uma oferta relâmpago.',
    };

    const sugestao = sugestoes[alerta.metrica] ||
      '📊 Revise a estratégia para ' + alerta.metrica + '.';

    alerta.acaoSugerida = sugestao;
    alerta.atualizadoEm = new Date().toISOString();
    salvar(c);

    return { ok: true, alerta, sugestao };
  };

  window.__queda_executarRecuperacao = function (idAlerta, acao, detalhes) {
    const c = carregar();
    const alerta = c.alertas.find(a => a.id === idAlerta);
    if (!alerta) return { ok: false, erro: 'Alerta não encontrado' };

    const recuperacao = {
      id: 'rec_' + c.proximoId++,
      idAlerta,
      acao,
      detalhes,
      executadoEm: new Date().toISOString(),
      sucesso: null,
    };

    alerta.acaoExecutada = acao;
    alerta.status = 'em_recuperacao';
    alerta.atualizadoEm = new Date().toISOString();

    c.recuperacoes.push(recuperacao);
    salvar(c);

    return { ok: true, alerta, recuperacao };
  };

  window.__queda_resolverAlerta = function (idAlerta, sucesso) {
    const c = carregar();
    const alerta = c.alertas.find(a => a.id === idAlerta);
    if (!alerta) return { ok: false, erro: 'Alerta não encontrado' };

    alerta.status = sucesso ? 'resolvido' : 'nao_resolvido';
    alerta.resolvidoEm = new Date().toISOString();
    salvar(c);

    for (const rec of c.recuperacoes) {
      if (rec.idAlerta === idAlerta) rec.sucesso = sucesso;
    }
    salvar(c);

    return { ok: true, alerta };
  };

  window.__queda_estatisticasAlertas = function () {
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
      total, ativos, resolvidos, naoResolvidos, emRecuperacao,
      porMetrica, porSeveridade,
      totalRecuperacoes: c.recuperacoes.length,
    };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);