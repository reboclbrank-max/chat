// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📢 CAMPANHAS AUTOMATIZADAS — versão navegador (localStorage)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

(function (global) {
  'use strict';

  const CHAVE = 'assistente_rebocl_campanhas_v1';

  const TIPOS_CAMPANHA = {
    lancamento: {
      nome: 'Lançamento de Jogo',
      descricao: 'Campanha de 7 dias para lançamento de novo jogo ou atualização',
      padraoPassos: [
        { dia: 0, acao: 'teaser', rede: 'todos', texto: 'Algo novo está chegando… fique ligado! 🎮' },
        { dia: 1, acao: 'revelacao', rede: 'todos', texto: 'Conheça o novo jogo! Baixe agora gratuitamente.' },
        { dia: 2, acao: 'gameplay', rede: 'todos', texto: 'Veja o gameplay em ação. Jogue agora no itch.io.' },
        { dia: 3, acao: 'depoimento', rede: 'todos', texto: 'O que os jogadores estão dizendo sobre o jogo.' },
        { dia: 4, acao: 'destaque', rede: 'todos', texto: 'Recurso especial que você vai adorar no jogo.' },
        { dia: 5, acao: 'urgencia', rede: 'todos', texto: 'Últimos dias para baixar gratuitamente!' },
        { dia: 6, acao: 'fechamento', rede: 'todos', texto: 'Baixe agora e comece a jogar imediatamente!' },
      ],
    },
    sazonal: {
      nome: 'Campanha Sazonal',
      descricao: 'Posts temáticos para datas comemorativas',
      padraoPassos: [
        { dia: -2, acao: 'antecipacao', rede: 'todos', texto: 'Prepare-se para a data especial!' },
        { dia: 0, acao: 'celebracao', rede: 'todos', texto: 'Celebre conosco! Jogo gratuito para todos.' },
        { dia: 1, acao: 'agradecimento', rede: 'todos', texto: 'Obrigado por celebrar conosco!' },
      ],
    },
    reativacao: {
      nome: 'Reativação de Usuários',
      descricao: 'Campanha para trazer de volta usuários inativos',
      padraoPassos: [
        { dia: 0, acao: 'saudade', rede: 'todos', texto: 'Sentimos sua falta! Volte a jogar.' },
        { dia: 2, acao: 'novidade', rede: 'todos', texto: 'Novidades chegaram ao jogo desde que você saiu.' },
        { dia: 5, acao: 'convite', rede: 'todos', texto: 'Convide um amigo e joguem juntos!' },
      ],
    },
    indicacao: {
      nome: 'Programa de Indicação',
      descricao: 'Incentivar usuários a indicarem amigos',
      padraoPassos: [
        { dia: 0, acao: 'convite', rede: 'todos', texto: 'Indique um amigo e ambos ganhem benefícios!' },
        { dia: 3, acao: 'lembrete', rede: 'todos', texto: 'Não esqueça de indicar seus amigos.' },
        { dia: 7, acao: 'agradecimento', rede: 'todos', texto: 'Obrigado por indicar o jogo!' },
      ],
    },
  };

  function carregar() {
    try {
      const b = localStorage.getItem(CHAVE);
      if (b) return JSON.parse(b);
    } catch (e) {}
    return {
      campanhas: [],
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

  window.__camp_criarCampanha = function (nome, tipo, jogo, dataInicio) {
    const c = carregar();
    const tipoDef = TIPOS_CAMPANHA[tipo];
    if (!tipoDef) return { ok: false, erro: 'Tipo desconhecido: ' + tipo };

    const id = 'camp_' + c.proximoId++;
    const passos = tipoDef.padraoPassos.map((p, idx) => ({
      id: id + '_passo_' + idx,
      dia: p.dia,
      acao: p.acao,
      rede: p.rede,
      texto: p.texto,
      status: 'pendente',
      executadoEm: null,
      resultado: null,
    }));

    const campanha = {
      id, nome, tipo, jogo: jogo || 'ambos',
      dataInicio: dataInicio || new Date().toISOString(),
      status: 'ativa',
      passos, resultado: {},
      criadoEm: new Date().toISOString(),
      atualizadoEm: new Date().toISOString(),
    };

    c.campanhas.push(campanha);
    salvar(c);
    return { ok: true, campanha };
  };

  window.__camp_listarCampanhas = function (status) {
    const c = carregar();
    if (status) return c.campanhas.filter(camp => camp.status === status);
    return c.campanhas;
  };

  window.__camp_obterCampanha = function (id) {
    const c = carregar();
    return c.campanhas.find(camp => camp.id === id) || null;
  };

  window.__camp_executarPasso = function (idCampanha, idPasso, resultado, sucesso) {
    const c = carregar();
    const campanha = c.campanhas.find(camp => camp.id === idCampanha);
    if (!campanha) return { ok: false, erro: 'Campanha não encontrada' };
    const passo = campanha.passos.find(p => p.id === idPasso);
    if (!passo) return { ok: false, erro: 'Passo não encontrado' };
    passo.status = sucesso ? 'concluido' : 'falhou';
    passo.executadoEm = new Date().toISOString();
    passo.resultado = resultado;
    const todosConcluidos = campanha.passos.every(p => p.status === 'concluido' || p.status === 'falhou');
    if (todosConcluidos) {
      campanha.status = 'concluida';
      campanha.resultado = {
        totalPassos: campanha.passos.length,
        concluidos: campanha.passos.filter(p => p.status === 'concluido').length,
        falhos: campanha.passos.filter(p => p.status === 'falhou').length,
      };
    }
    campanha.atualizadoEm = new Date().toISOString();
    salvar(c);
    return { ok: true, campanha, passo };
  };

  window.__camp_obterPassosParaHoje = function () {
    const c = carregar();
    const hoje = new Date();
    const passos = [];
    for (const campanha of c.campanhas) {
      if (campanha.status !== 'ativa') continue;
      const inicio = new Date(campanha.dataInicio);
      const diasDecorrido = Math.floor((hoje - inicio) / (1000 * 60 * 60 * 24));
      for (const passo of campanha.passos) {
        if (passo.status !== 'pendente') continue;
        if (passo.dia === diasDecorrido) {
          passos.push({ campanhaId: campanha.id, campanhaNome: campanha.nome, passo });
        }
      }
    }
    return passos;
  };

  window.__camp_estatisticasCampanhas = function () {
    const c = carregar();
    const total = c.campanhas.length;
    const ativas = c.campanhas.filter(camp => camp.status === 'ativa').length;
    const concluidas = c.campanhas.filter(camp => camp.status === 'concluida').length;
    const falhas = c.campanhas.filter(camp => camp.status === 'falhou').length;
    const porTipo = {};
    for (const camp of c.campanhas) {
      if (!porTipo[camp.tipo]) porTipo[camp.tipo] = { total: 0, concluidas: 0 };
      porTipo[camp.tipo].total++;
      if (camp.status === 'concluida') porTipo[camp.tipo].concluidas++;
    }
    return {
      total, ativas, concluidas, falhas, porTipo,
      tiposDisponiveis: Object.keys(TIPOS_CAMPANHA).map(t => ({ id: t, nome: TIPOS_CAMPANHA[t].nome })),
    };
  };

  window.__camp_TIPOS_CAMPANHA = TIPOS_CAMPANHA;

})(typeof globalThis !== 'undefined' ? globalThis : this);