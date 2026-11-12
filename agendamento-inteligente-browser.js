// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🕐 AGENDAMENTO INTELIGENTE — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_agenda_v1';

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
      fila: [],
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

  window.__agend_agendarPost = function (texto, rede, jogo, horarioISO) {
    const c = carregar();

    let horario = horarioISO;
    if (!horario) {
      const agora = new Date();
      // Default: amanhã às 10h BRT
      const amanha = new Date(agora);
      amanha.setDate(amanha.getDate() + 1);
      amanha.setHours(10, 0, 0, 0);
      horario = amanha.toISOString();
    }

    const id = 'agend_' + c.proximoId++;
    const item = {
      id, texto,
      rede,
      jogo: jogo || 'ambos',
      horarioAgendado: horario,
      status: 'agendado',
      criadoEm: new Date().toISOString(),
      executadoEm: null,
      resultado: null,
      tentativa: 0,
    };

    c.fila.push(item);
    c.fila.sort((a, b) => new Date(a.horarioAgendado) - new Date(b.horarioAgendado));
    salvar(c);
    return { ok: true, id, horarioAgendado: horario };
  };

  window.__agend_listarAgendamento = function (status) {
    const c = carregar();
    if (status) return c.fila.filter(item => item.status === status);
    return c.fila;
  };

  window.__agend_obterPostsParaExecutar = function () {
    const c = carregar();
    const agora = new Date();
    return c.fila.filter(item => item.status === 'agendado' && new Date(item.horarioAgendado) <= agora);
  };

  window.__agend_marcarExecutado = function (id, resultado, sucesso) {
    const c = carregar();
    const item = c.fila.find(i => i.id === id);
    if (!item) return { ok: false, erro: 'Item não encontrado' };
    item.status = sucesso ? 'executado' : 'falhou';
    item.executadoEm = new Date().toISOString();
    item.resultado = resultado;
    salvar(c);
    return { ok: true, item };
  };

  window.__agend_cancelarAgendamento = function (id) {
    const c = carregar();
    const idx = c.fila.findIndex(i => i.id === id);
    if (idx < 0) return { ok: false, erro: 'Item não encontrado' };
    c.fila[idx].status = 'cancelado';
    salvar(c);
    return { ok: true };
  };

  window.__agend_estatisticasAgenda = function () {
    const c = carregar();
    const total = c.fila.length;
    const agendados = c.fila.filter(i => i.status === 'agendado').length;
    const executados = c.fila.filter(i => i.status === 'executado').length;
    const falhos = c.fila.filter(i => i.status === 'falhou').length;
    const cancelados = c.fila.filter(i => i.status === 'cancelado').length;

    const porRede = {};
    for (const item of c.fila) {
      if (!porRede[item.rede]) porRede[item.rede] = { total: 0, executados: 0, falhos: 0 };
      porRede[item.rede].total++;
      if (item.status === 'executado') porRede[item.rede].executados++;
      if (item.status === 'falhou') porRede[item.rede].falhos++;
    }

    return {
      total, agendados, executados, falhos, cancelados, porRede,
      proximoAgendamento: c.fila
        .filter(i => i.status === 'agendado')
        .sort((a, b) => new Date(a.horarioAgendado) - new Date(b.horarioAgendado))[0],
    };
  };

})(typeof globalThis !== 'undefined' ? globalThis : this);