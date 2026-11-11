// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📅 CALENDÁRIO DE LANÇAMENTOS — planejamento de lançamentos por jogo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'lancamentos.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { lancamentos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarLancamento(titulo, jogo, dataLancamento, rede, tipo, descricao) {
  const c = carregar();
  const id = 'lan_' + c.proximoId++;
  const l = { id, titulo: titulo || '', jogo: jogo || 'ambos', dataLancamento, rede: rede || 'todos', tipo: tipo || 'atualizacao', descricao: descricao || '', status: 'planejado', publicado: false, criadoEm: new Date().toISOString() };
  c.lancamentos.push(l);
  salvar();
  return { ok: true, lancamento: l };
}

function listarLancamentos(jogo = null, status = null) {
  const c = carregar();
  let l = c.lancamentos;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => a.dataLancamento.localeCompare(b.dataLancamento));
}

function marcarLancamentoPublicado(id) {
  const c = carregar();
  const l = c.lancamentos.find(x => x.id === id);
  if (!l) return { ok: false, erro: 'Lançamento não encontrado' };
  l.publicado = true;
  l.status = 'publicado';
  salvar();
  return { ok: true, lancamento: l };
}

function estatisticasLancamentos() {
  const c = carregar();
  const total = c.lancamentos.length;
  const publicados = c.lancamentos.filter(x => x.publicado).length;
  return { total, publicados, pendentes: total - publicados };
}

module.exports = { criarLancamento, listarLancamentos, marcarLancamentoPublicado, estatisticasLancamentos, carregar, salvar, ARQ };