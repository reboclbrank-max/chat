// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🛣️ GERENCIAMENTO DE ROTA DE CONTEÚDO — fluxo de distribuição de conteúdo
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'rota-conteudo.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { rotas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarRotaConteudo(nome, jogo, descricao, origens, destinos, status) {
  const c = carregar();
  const id = 'rot_' + c.proximoId++;
  const r = { id, nome: nome || '', jogo: jogo || 'ambos', descricao: descricao || '', origens: origens || [], destinos: destinos || [], status: status || 'ativa', usos: 0, criadoEm: new Date().toISOString() };
  c.rotas.push(r);
  salvar();
  return { ok: true, rota: r };
}

function usarRotaConteudo(id, jogo) {
  const c = carregar();
  const r = c.rotas.find(x => x.id === id);
  if (!r) return { ok: false, erro: 'Rota não encontrada' };
  if (r.status !== 'ativa') return { ok: false, erro: 'Rota inativa' };
  r.usos++;
  salvar();
  return { ok: true, rota: r };
}

function listarRotasConteudo(jogo = null, status = null) {
  const c = carregar();
  let l = c.rotas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (status) l = l.filter(x => x.status === status);
  return l.sort((a, b) => b.usos - a.usos);
}

function estatisticasRotaConteudo() {
  const c = carregar();
  const total = c.rotas.length;
  const ativas = c.rotas.filter(x => x.status === 'ativa').length;
  const totalUsos = c.rotas.reduce((s, r) => s + (r.usos || 0), 0);
  return { total, ativas, totalUsos };
}

module.exports = { criarRotaConteudo, usarRotaConteudo, listarRotasConteudo, estatisticasRotaConteudo, carregar, salvar, ARQ };