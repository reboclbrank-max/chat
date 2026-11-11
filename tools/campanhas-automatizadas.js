// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📢 CAMPANHAS AUTOMATIZADAS DE MARKETING
// Planejamento multi-passo para campanhas de lançamento, sazonal, reativação, etc.
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_CAMPANHAS = path.join(MARKETING_DIR, 'campanhas.json');

let cacheCampanhas = null;
function carregar() {
  if (cacheCampanhas) return cacheCampanhas;
  try {
    if (fs.existsSync(ARQUIVO_CAMPANHAS)) {
      cacheCampanhas = JSON.parse(fs.readFileSync(ARQUIVO_CAMPANHAS, 'utf8'));
      return cacheCampanhas;
    }
  } catch (e) {}
  cacheCampanhas = {
    campanhas: [],
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cacheCampanhas;
}
function salvar() {
  try {
    cacheCampanhas.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_CAMPANHAS, JSON.stringify(cacheCampanhas, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// TIPOS DE CAMPANHA SUPORTADOS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRIAR CAMPANHA
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function criarCampanha(nome, tipo, jogo, dataInicio, opcoes = {}) {
  const c = carregar();
  const tipoDef = TIPOS_CAMPANHA[tipo];
  if (!tipoDef) return { ok: false, erro: 'Tipo de campanha desconhecido: ' + tipo };

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
    id,
    nome,
    tipo,
    jogo: jogo || 'ambos',
    dataInicio: dataInicio || new Date().toISOString(),
    status: 'ativa',
    passos,
    resultado: {},
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };

  c.campanhas.push(campanha);
  salvar();
  return { ok: true, campanha };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR CAMPANHAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listarCampanhas(status = null) {
  const c = carregar();
  if (status) {
    return c.campanhas.filter(camp => camp.status === status);
  }
  return c.campanhas;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OBTER CAMPANHA POR ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function obterCampanha(id) {
  const c = carregar();
  return c.campanhas.find(camp => camp.id === id) || null;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EXECUTAR PASSO DE CAMPANHA
// Marca um passo como executado e registra o resultado
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function executarPasso(idCampanha, idPasso, resultado, sucesso) {
  const c = carregar();
  const campanha = c.campanhas.find(camp => camp.id === idCampanha);
  if (!campanha) return { ok: false, erro: 'Campanha não encontrada' };

  const passo = campanha.passos.find(p => p.id === idPasso);
  if (!passo) return { ok: false, erro: 'Passo não encontrado' };

  passo.status = sucesso ? 'concluido' : 'falhou';
  passo.executadoEm = new Date().toISOString();
  passo.resultado = resultado;

  // Verificar se todos os passos foram concluídos
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
  salvar();
  return { ok: true, campanha, passo };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// OBTER PRÓXIMOS PASSOS A EXECUTAR
// Retorna passos que devem ser executados hoje (baseado na data de início)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function obterPassosParaHoje() {
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
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS DE CAMPANHAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticasCampanhas() {
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
    total,
    ativas,
    concluidas,
    falhas,
    porTipo,
    tiposDisponiveis: Object.keys(TIPOS_CAMPANHA).map(t => ({ id: t, nome: TIPOS_CAMPANHA[t].nome })),
  };
}

module.exports = {
  criarCampanha,
  listarCampanhas,
  obterCampanha,
  executarPasso,
  obterPassosParaHoje,
  estatisticasCampanhas,
  TIPOS_CAMPANHA,
  carregar,
  salvar,
  ARQUIVO_CAMPANHAS,
};