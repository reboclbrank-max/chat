// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 PLANO SEMANAL — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_planos_v1';

  const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];
  const REDES = ['instagram', 'x', 'nostr'];

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return { planos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  }
  function salvar(c) {
    try {
      c.atualizadoEm = new Date().toISOString();
      localStorage.setItem(CHAVE, JSON.stringify(c));
    } catch (e) {}
  }

  window.__plano_gerarPlanoSemanal = function (jogo, dadosDesempenho) {
    const c = carregar();
    const agora = new Date();
    const semanaInicial = new Date(agora);
    semanaInicial.setDate(agora.getDate() - agora.getDay());
    semanaInicial.setHours(0, 0, 0, 0);

    const id = 'plano_' + c.proximoId++;
    const melhorHorarioPorRede = {};
    for (const rede of REDES) {
      melhorHorarioPorRede[rede] = (dadosDesempenho && dadosDesempenho[rede]) || '10:00';
    }

    const temasPorDia = {
      domingo: 'Descanso / Revisão de métricas',
      segunda: 'Início de semana - apresentação do jogo',
      terca: 'Destaque de característica',
      quarta: 'Meio de semana - gameplay ou dica',
      quinta: 'Depoimento ou comunidade',
      sexta: 'Último chamado / urgência',
      sabado: 'Conteúdo leve / interação',
    };

    const plano = {
      id, semanaInicio: semanaInicial.toISOString(),
      semanaFim: new Date(semanaInicial.getTime() + 6 * 24 * 60 * 60 * 1000).toISOString(),
      jogo: jogo || 'ambos', geradoEm: new Date().toISOString(), status: 'ativo',
      cronograma: [],
    };

    for (let d = 0; d < 7; d++) {
      const diaData = new Date(semanaInicial.getTime() + d * 24 * 60 * 60 * 1000);
      const diaNome = DIAS_SEMANA[d];
      const tema = temasPorDia[diaNome];
      for (const rede of REDES) {
        plano.cronograma.push({
          dia: diaNome, data: diaData.toISOString(), rede, tema,
          horario: melhorHorarioPorRede[rede], status: 'pendente',
          textoSugerido: 'Post de ' + diaNome + ' para ' + rede + ' — ' + tema,
        });
      }
    }

    c.planos.push(plano);
    salvar(c);
    return { ok: true, plano };
  };

  window.__plano_listarPlanos = function (ativoApenas) {
    const c = carregar();
    let planos = c.planos.sort((a, b) => new Date(b.geradoEm) - new Date(a.geradoEm));
    if (ativoApenas) planos = planos.filter(p => p.status === 'ativo');
    return planos;
  };

  window.__plano_estatisticasPlanos = function () {
    const c = carregar();
    const total = c.planos.length;
    const ativos = c.planos.filter(p => p.status === 'ativo').length;
    const totalPosts = c.planos.reduce((s, p) => s + p.cronograma.length, 0);
    const postsPendentes = c.planos.reduce((s, p) => s + p.cronograma.filter(c => c.status === 'pendente').length, 0);
    return { total, ativos, totalPosts, postsPendentes };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);