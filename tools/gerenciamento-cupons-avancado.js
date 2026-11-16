// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎟️ GERENCIAMENTO DE CUpons AVANÇADO — cupons com regras complexas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'cupons-avancado.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { cupons: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarCupomAvancado(codigo, jogo, tipoDesconto, valor, limiteUsos, expiracao, produtoAplicavel) {
  const c = carregar();
  const id = 'cua_' + c.proximoId++;
  const cup = { id, codigo, jogo: jogo || 'ambos', tipoDesconto: tipoDesconto || 'percentual', valor: Number(valor) || 0, limiteUsos: Number(limiteUsos) || 0, usos: 0, expiracao: expiracao || null, produtoAplicavel: produtoAplicavel || 'todos', ativo: true, criadoEm: new Date().toISOString() };
  c.cupons.push(cup);
  salvar();
  return { ok: true, cupom: cup };
}

function validarCupomAvancado(codigo, jogo) {
  const c = carregar();
  const cup = c.cupons.find(x => x.codigo === codigo && (x.jogo === jogo || x.jogo === 'ambos'));
  if (!cup) return { ok: false, erro: 'Cupom não encontrado' };
  if (!cup.ativo) return { ok: false, erro: 'Cupom inativo' };
  if (cup.expiracao && new Date(cup.expiracao) < new Date()) return { ok: false, erro: 'Cupom expirado' };
  if (cup.limiteUsos > 0 && cup.usos >= cup.limiteUsos) return { ok: false, erro: 'Limite esgotado' };
  return { ok: true, cupom, desconto: cup.valor };
}

function usarCupomAvancado(codigo) {
  const c = carregar();
  const cup = c.cupons.find(x => x.codigo === codigo);
  if (!cup) return { ok: false, erro: 'Cupom não encontrado' };
  cup.usos++;
  salvar();
  return { ok: true, cupom };
}

function listarCuponsAvancados(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.cupons;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l;
}

function estatisticasCuponsAvancados() {
  const c = carregar();
  const total = c.cupons.length;
  const ativos = c.cupons.filter(x => x.ativo).length;
  const totalUsos = c.cupons.reduce((s, c) => s + (c.usos || 0), 0);
  return { total, ativos, totalUsos };
}

module.exports = { criarCupomAvancado, validarCupomAvancado, usarCupomAvancado, listarCuponsAvancados, estatisticasCuponsAvancados, carregar, salvar, ARQ };