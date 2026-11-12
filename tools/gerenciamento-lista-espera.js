// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⏳ GERENCIAMENTO DE LISTA DE ESPERA — lista de espera para lançamentos
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'lista-espera.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { inscritos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarListaEspera(nome, email, jogo, produto, origem) {
  const c = carregar();
  const id = 'le_' + c.proximoId++;
  const ins = { id, nome: nome || '', email: email || '', jogo: jogo || 'ambos', produto: produto || '', origem: origem || '', ativo: true, inscritoEm: new Date().toISOString() };
  c.inscritos.push(ins);
  salvar();
  return { ok: true, inscricao: ins };
}

function removerListaEspera(id) {
  const c = carregar();
  const idx = c.inscritos.findIndex(x => x.id === id);
  if (idx === -1) return { ok: false, erro: 'Não encontrado na lista de espera' };
  c.inscritos.splice(idx, 1);
  salvar();
  return { ok: true };
}

function listarListaEspera(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.inscritos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l.sort((a, b) => new Date(b.inscritoEm) - new Date(a.inscritoEm));
}

function estatisticasListaEspera() {
  const c = carregar();
  const total = c.inscritos.length;
  const ativos = c.inscritos.filter(x => x.ativo).length;
  return { total, ativos, inativos: total - ativos };
}

module.exports = { adicionarListaEspera, removerListaEspera, listarListaEspera, estatisticasListaEspera, carregar, salvar, ARQ };