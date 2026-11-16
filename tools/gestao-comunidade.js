// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 GESTÃO DE COMUNIDADE — controle de membros e engajamento comunitário
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'gestao-comunidade.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { membros: [], interacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarMembro(nome, rede, jogo, cargo, dataEntrada) {
  const c = carregar();
  const id = 'mem_' + c.proximoId++;
  const m = { id, nome: nome || '', rede: rede || 'todos', jogo: jogo || 'ambos', cargo: cargo || 'membro', dataEntrada: dataEntrada || new Date().toISOString(), ativo: true, interacoes: 0, criadoEm: new Date().toISOString() };
  c.membros.push(m);
  salvar();
  return { ok: true, membro: m };
}

function registrarInteracaoComunidade(idMembro, tipo, jogo) {
  const c = carregar();
  const m = c.membros.find(x => x.id === idMembro);
  if (!m) return { ok: false, erro: 'Membro não encontrado' };
  const id = 'int_' + c.proximoId++;
  const i = { id, idMembro, tipo: tipo || 'comentario', jogo: jogo || 'ambos', criadoEm: new Date().toISOString() };
  c.interacoes.push(i);
  m.interacoes++;
  salvar();
  return { ok: true, interacao: i };
}

function listarMembros(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.membros;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => b.interacoes - a.interacoes);
}

function estatisticasComunidade() {
  const c = carregar();
  const total = c.membros.length;
  const ativos = c.membros.filter(x => x.ativo).length;
  const totalInteracoes = c.interacoes.length;
  return { total, ativos, totalInteracoes };
}

module.exports = { adicionarMembro, registrarInteracaoComunidade, listarMembros, estatisticasComunidade, carregar, salvar, ARQ };