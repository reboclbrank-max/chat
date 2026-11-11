// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ✅ WORKFLOW DE APROVAÇÃO HUMANA
// Rascunho → Revisão → Agendamento → Publicação → Pós-publicação
// Só serve marketing de Prancheta e Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');

const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) {
  fs.mkdirSync(MARKETING_DIR, { recursive: true });
}

const ARQUIVO_APROVACAO = path.join(MARKETING_DIR, 'aprovacao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try {
    if (fs.existsSync(ARQUIVO_APROVACAO)) {
      cache = JSON.parse(fs.readFileSync(ARQUIVO_APROVACAO, 'utf8'));
      return cache;
    }
  } catch (e) {}
  cache = {
    rascunhos: [],
    pendentes: [],     // aguardando aprovação humana
    aprovados: [],     // aprovados, prontos para agendar
    publicados: [],    // já publicados
    rejeitados: [],    // rejeitados pelo humano
    proximoId: 1,
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
  };
  return cache;
}
function salvar() {
  try {
    cache.atualizadoEm = new Date().toISOString();
    fs.writeFileSync(ARQUIVO_APROVACAO, JSON.stringify(cache, null, 2), 'utf8');
  } catch (e) {}
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CRIAR RASCUNHO
// O chat cria o post mas não publica ainda
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function criarRascunho(texto, rede, jogo, tipoPost = 'normal', metadados = {}) {
  const c = carregar();
  const id = 'aprov_' + c.proximoId++;
  const rascunho = {
    id,
    texto,
    rede,
    jogo: jogo || 'ambos',
    tipoPost,
    status: 'rascunho',
    criadoEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    revisadoPor: null,
    revisadoEm: null,
    motivoRejeicao: null,
    agendadoPara: null,
    publicadoEm: null,
    resultadoPublicacao: null,
    ...metadados,
  };
  c.rascunhos.push(rascunho);
  salvar();
  return { ok: true, rascunho };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ENVIAR PARA REVISÃO (muda de rascunho para pendente)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function enviarParaRevisao(id) {
  const c = carregar();
  const idx = c.rascunhos.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false, erro: 'Rascunho não encontrado' };
  const rascunho = c.rascunhos[idx];
  rascunho.status = 'pendente';
  rascunho.atualizadoEm = new Date().toISOString();
  c.pendentes.push(rascunho);
  c.rascunhos.splice(idx, 1);
  salvar();
  return { ok: true, rascunho };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// APROVAR (muda de pendente para aprovado)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function aprovar(id, revisadoPor = 'humano') {
  const c = carregar();
  const idx = c.pendentes.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false, erro: 'Item pendente não encontrado' };
  const item = c.pendentes[idx];
  item.status = 'aprovado';
  item.revisadoPor = revisadoPor;
  item.revisadoEm = new Date().toISOString();
  item.atualizadoEm = new Date().toISOString();
  c.aprovados.push(item);
  c.pendentes.splice(idx, 1);
  salvar();
  return { ok: true, item };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REJEITAR (muda de pendente para rejeitado)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function rejeitar(id, motivo, revisadoPor = 'humano') {
  const c = carregar();
  const idx = c.pendentes.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false, erro: 'Item pendente não encontrado' };
  const item = c.pendentes[idx];
  item.status = 'rejeitado';
  item.revisadoPor = revisadoPor;
  item.revisadoEm = new Date().toISOString();
  item.motivoRejeicao = motivo;
  item.atualizadoEm = new Date().toISOString();
  c.rejeitados.push(item);
  c.pendentes.splice(idx, 1);
  salvar();
  return { ok: true, item };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// AGENDAR APROVADO (muda de aprovado para agendado, usando o módulo de agendamento)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function agendarAprovado(id, horarioISO) {
  const c = carregar();
  const idx = c.aprovados.findIndex(r => r.id === id);
  if (idx < 0) return { ok: false, erro: 'Item aprovado não encontrado' };
  const item = c.aprovados[idx];

  const agendamento = require('./agendamento-inteligente');
  const resultado = agendamento.agendarPost(item.texto, item.rede, item.jogo, horarioISO);

  if (!resultado.ok) {
    return { ok: false, erro: 'não foi possível agendar: ' + resultado.erro };
  }

  item.status = 'agendado';
  item.agendadoPara = resultado.horarioAgendado;
  item.atualizadoEm = new Date().toISOString();
  c.aprovados.splice(idx, 1);
  c.publicados.push(item); // vamos usar publicados como "em fila/publicados"
  salvar();
  return { ok: true, item, agendamento: resultado };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// REGISTRAR PUBLICAÇÃO REAL (pós-publicação)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function registrarPublicacao(id, resultado) {
  const c = carregar();
  const item = c.publicados.find(p => p.id === id);
  if (!item) return { ok: false, erro: 'Item não encontrado na fila de publicados' };
  item.status = 'publicado';
  item.publicadoEm = new Date().toISOString();
  item.resultadoPublicacao = resultado;
  item.atualizadoEm = new Date().toISOString();
  salvar();
  return { ok: true, item };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// LISTAR POR STATUS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function listar(status = null) {
  const c = carregar();
  if (status) {
    if (!c[status]) return [];
    return c[status];
  }
  return {
    rascunhos: c.rascunhos,
    pendentes: c.pendentes,
    aprovados: c.aprovados,
    publicados: c.publicados,
    rejeitados: c.rejeitados,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ESTATÍSTICAS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function estatisticas() {
  const c = carregar();
  return {
    rascunhos: c.rascunhos.length,
    pendentes: c.pendentes.length,
    aprovados: c.aprovados.length,
    publicados: c.publicados.length,
    rejeitados: c.rejeitados.length,
    total: c.rascunhos.length + c.pendentes.length + c.aprovados.length + c.publicados.length + c.rejeitados.length,
  };
}

module.exports = {
  criarRascunho,
  enviarParaRevisao,
  aprovar,
  rejeitar,
  agendarAprovado,
  registrarPublicacao,
  listar,
  estatisticas,
  carregar,
  salvar,
  ARQUIVO_APROVACAO,
};