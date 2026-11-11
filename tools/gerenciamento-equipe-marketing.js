// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 👥 GERENCIAMENTO DE EQUIPE DE MARKETING — controle de membros da equipe
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'equipe-marketing.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { membros: [], funcoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarMembroEquipe(nome, funcao, jogo, email, telefone) {
  const c = carregar();
  const id = 'eq_' + c.proximoId++;
  const m = { id, nome: nome || '', funcao: funcao || 'analista', jogo: jogo || 'ambos', email: email || '', telefone: telefone || '', ativo: true, criadoEm: new Date().toISOString() };
  c.membros.push(m);
  salvar();
  return { ok: true, membro: m };
}

function atribuirFuncao(membroId, funcao, jogo) {
  const c = carregar();
  const m = c.membros.find(x => x.id === membroId);
  if (!m) return { ok: false, erro: 'Membro não encontrado' };
  m.funcao = funcao || 'analista';
  m.jogo = jogo || 'ambos';
  salvar();
  return { ok: true, membro: m };
}

function listarMembrosEquipe(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.membros;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l;
}

function estatisticasEquipe() {
  const c = carregar();
  const total = c.membros.length;
  const ativos = c.membros.filter(x => x.ativo).length;
  return { total, ativos, inativos: total - ativos };
}

module.exports = { adicionarMembroEquipe, atribuirFuncao, listarMembrosEquipe, estatisticasEquipe, carregar, salvar, ARQ };