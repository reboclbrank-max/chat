// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ⭐ GERENCIAMENTO DE AVALIAÇÕES — controle de avaliações de usuários
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'avaliacoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { avaliacoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registrarAvaliacao(usuario, jogo, nota, comentario, rede) {
  const c = carregar();
  const id = 'ava_' + c.proximoId++;
  const a = { id, usuario: usuario || '', jogo: jogo || 'ambos', nota: Number(nota) || 0, comentario: comentario || '', rede: rede || 'todos', ativo: true, criadoEm: new Date().toISOString() };
  c.avaliacoes.push(a);
  salvar();
  return { ok: true, avaliacao: a };
}

function listarAvaliacoes(jogo = null, notaMinima = null) {
  const c = carregar();
  let l = c.avaliacoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (notaMinima !== null) l = l.filter(x => x.nota >= Number(notaMinima));
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasAvaliacoes() {
  const c = carregar();
  const total = c.avaliacoes.length;
  const mediaNota = total > 0 ? (c.avaliacoes.reduce((s, a) => s + a.nota, 0) / total).toFixed(2) : 0;
  return { total, mediaNota, positivas: c.avaliacoes.filter(x => x.nota >= 4).length, negativas: c.avaliacoes.filter(x => x.nota <= 2).length };
}

module.exports = { registrarAvaliacao, listarAvaliacoes, estatisticasAvaliacoes, carregar, salvar, ARQ };