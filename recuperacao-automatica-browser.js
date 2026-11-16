// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🔄 RECUPERAÇÃO AUTOMÁTICA — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_recuperacao_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
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

  window.__rec_processarQueda = function (idAlerta) {
    const c = carregar();
    const alertas = window.__queda_listarAlertas ? window.__queda_listarAlertas('ativo') : [];
    const alerta = alertas.find(a => a.id === idAlerta);
    if (!alerta) return { ok: false, erro: 'Alerta não encontrado ou não ativo' };
    if (!['media', 'alta'].includes(alerta.severidade)) {
      return { ok: false, motivo: 'severidade baixa — não cria campanha automaticamente' };
    }

    const existente = c.recuperacoes.find(r => r.idAlerta === idAlerta && r.status !== 'cancelada');
    if (existente) {
      return { ok: false, motivo: 'recuperação já existe para este alerta' };
    }

    const id = 'rec_auto_' + c.proximoId++;
    const nomeCampanha = 'Recuperação automática — ' + alerta.metrica + ' (' + alerta.severidade + ')';

    const campResult = window.__camp_criarCampanha
      ? window.__camp_criarCampanha(nomeCampanha, 'reativacao', 'ambos', new Date().toISOString())
      : null;

    if (!campResult || !campResult.ok) {
      return { ok: false, erro: 'não foi possível criar campanha' };
    }

    const campanha = campResult.campanha;
    const redes = ['instagram', 'x', 'nostr'];
    const textosRecuperacao = {
      downloads: '📥 Baixe o jogo novamente! Tem novidades esperando por você.',
      inscritos: '👥 Volte a fazer parte da nossa comunidade. Novidades por aí!',
      ctr: '🎮 Confira as novidades do jogo — clique para saber mais!',
      conversao: '📥 O download é gratuito e rápido. Baixe agora!',
      churn: '🔄 Sentimos sua falta! Volte a jogar e descubra o que há de novo.',
      receita: '💰 Oferta especial por tempo limitado. Não perca!',
    };

    const postsCriados = [];
    for (const rede of redes) {
      const texto = textosRecuperacao[alerta.metrica] || 'Confira as novidades do jogo!';
      const agendResult = window.__agend_agendarPost
        ? window.__agend_agendarPost(texto, rede, 'ambos')
        : null;
      if (agendResult && agendResult.ok) {
        postsCriados.push({ rede, id: agendResult.id, horario: agendResult.horarioAgendado });
      }
    }

    const recuperacao = {
      id,
      idAlerta: alerta.id,
      idCampanha: campanha.id,
      metrica: alerta.metrica,
      severidade: alerta.severidade,
      status: 'ativa',
      tentativa: 0,
      maxTentativas: 3,
      backoffNiveis: [1, 4, 24],
      proximaTentativa: null,
      postsCriados,
      campanhaId: campanha.id,
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
      resolvidaEm: null,
    };

    c.recuperacoes.push(recuperacao);
    salvar(c);

    return { ok: true, recuperacao, campanha, postsCriados };
  };

  window.__rec_listarRecuperacoes = function (status) {
    const c = carregar();
    if (status) return c.recuperacoes.filter(r => r.status === status);
    return c.recuperacoes;
  };

  window.__rec_estatisticasRecuperacao = function () {
    const c = carregar();
    const total = c.recuperacoes.length;
    const ativas = c.recuperacoes.filter(r => r.status === 'ativa').length;
    const resolvidas = c.recuperacoes.filter(r => r.status === 'resolvida').length;
    const exauridas = c.recuperacoes.filter(r => r.status === 'exaurida').length;
    const canceladas = c.recuperacoes.filter(r => r.status === 'cancelada').length;

    const porMetrica = {};
    for (const r of c.recuperacoes) {
      if (!porMetrica[r.metrica]) porMetrica[r.metrica] = { total: 0, resolvidas: 0, exauridas: 0 };
      porMetrica[r.metrica].total++;
      if (r.status === 'resolvida') porMetrica[r.metrica].resolvidas++;
      if (r.status === 'exaurida') porMetrica[r.metrica].exauridas++;
    }

    return { total, ativas, resolvidas, exauridas, canceladas, porMetrica };
  };

  window.__rec_cancelarRecuperacao = function (id) {
    const c = carregar();
    const rec = c.recuperacoes.find(r => r.id === id);
    if (!rec) return { ok: false, erro: 'Recuperação não encontrada' };
    rec.status = 'cancelada';
    rec.atualizadoEm = new Date().toISOString();
    salvar(c);
    return { ok: true };
  };

  window.__rec_verificarPendentes = function () {
    const c = carregar();
    const agora = new Date();
    const resultados = [];

    for (const rec of c.recuperacoes) {
      if (rec.status !== 'ativa') continue;
      if (rec.tentativa >= rec.maxTentativas) {
        rec.status = 'exaurida';
        continue;
      }
      if (rec.proximaTentativa && new Date(rec.proximaTentativa) > agora) continue;

      const camp = window.__camp_obterCampanha ? window.__camp_obterCampanha(rec.campanhaId) : null;
      if (camp) {
        const passosPendentes = camp.passos.filter(p => p.status === 'pendente');
        if (passosPendentes.length > 0) {
          const passo = passosPendentes[0];
          const nivelBackoff = rec.backoffNiveis[rec.tentativa] || 24;
          const execResult = window.__camp_executarPasso
            ? window.__camp_executarPasso(camp.id, passo.id, {
                acao: 'recuperacao_automatica_tentativa_' + (rec.tentativa + 1),
                backoffHoras: nivelBackoff,
              }, true)
            : null;

          rec.tentativa++;
          rec.atualizadoEm = new Date().toISOString();

          const proxima = new Date();
          proxima.setHours(proxima.getHours() + nivelBackoff);
          rec.proximaTentativa = proxima.toISOString();

          salvar(c);

          resultados.push({
            idRecuperacao: rec.id,
            tentativa: rec.tentativa,
            backoffHoras: nivelBackoff,
            passoExecutado: passo.acao,
          });
        } else {
          rec.status = 'resolvida';
          rec.resolvidaEm = new Date().toISOString();
          salvar(c);
          resultados.push({ idRecuperacao: rec.id, status: 'resolvida' });
        }
      }
    }

    return resultados;
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);