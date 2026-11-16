// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎨 GERENCIAMENTO DE CURADORIA — curadoria de conteúdos selecionados
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'curadoria.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { curadorias: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarCuradoria(titulo, jogo, conteudo, fonte, categoria, status) {
  const c = carregar();
  const id = 'cur_' + c.proximoId++;
  const cur = { id, titulo: titulo || '', jogo: jogo || 'ambos', conteudo: conteudo || '', fonte: fonte || '', categoria: categoria || '', status: status || 'pendente', aprovado: false, criadoEm: new Date().toISOString() };
  c.curadorias.push(cur);
  salvar();
  return { ok: true, curadoria: cur };
}

function aprovarCuradoria(id) {
  const c = carregar();
  const cur = c.curadorias.find(x => x.id === id);
  if (!cur) return { ok: false, erro: 'Curadoria não encontrada' };
  cur.aprovado = true;
  cur.status = 'aprovado';
  salvar();
  return { ok: true, curadoria: cur };
}

function listarCuradorias(jogo = null, status = null) {
  const c = carregar();
  let l = c.curadorias;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasCuradoria() {
  const c = carregar();
  const total = c.curadorias.length;
  const aprovados = c.curadorias.filter(x => x.aprovado).length;
  return { total, aprovados, pendentes: total - aprovados };
}

module.exports = { criarCuradoria, aprovarCuradoria, listarCuradorias, estatisticasCuradoria, carregar, salvar, ARQ };