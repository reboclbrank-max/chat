// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🚫 GERENCIAMENTO DE LISTA NEGRA — bloqueio de usuários e contatos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'lista-negra.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { bloqueados: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarListaNegra(identificador, rede, jogo, motivo, tipo) {
  const c = carregar();
  const id = 'ln_' + c.proximoId++;
  const b = { id, identificador: identificador || '', rede: rede || 'todos', jogo: jogo || 'ambos', motivo: motivo || '', tipo: tipo || 'usuario', ativo: true, criadoEm: new Date().toISOString() };
  c.bloqueados.push(b);
  salvar();
  return { ok: true, bloqueado: b };
}

function removerListaNegra(id) {
  const c = carregar();
  const idx = c.bloqueados.findIndex(x => x.id === id);
  if (idx === -1) return { ok: false, erro: 'Não encontrado na lista negra' };
  c.bloqueados.splice(idx, 1);
  salvar();
  return { ok: true };
}

function listarListaNegra(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.bloqueados;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasListaNegra() {
  const c = carregar();
  const total = c.bloqueados.length;
  const ativos = c.bloqueados.filter(x => x.ativo).length;
  return { total, ativos, inativos: total - ativos };
}

module.exports = { adicionarListaNegra, removerListaNegra, listarListaNegra, estatisticasListaNegra, carregar, salvar, ARQ };