// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🎟️ SISTEMA DE CUpons — códigos promocionais para downloads
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'cupons.json');

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

function criarCupom(codigo, jogo, desconto, limiteUsos, expiracao) {
  const c = carregar();
  const id = 'cup_' + c.proximoId++;
  const cup = { id, codigo, jogo: jogo || 'ambos', desconto: desconto || '', limiteUsos: Number(limiteUsos) || 0, usos: 0, expiracao: expiracao || null, ativo: true, criadoEm: new Date().toISOString() };
  c.cupons.push(cup);
  salvar();
  return { ok: true, cupom: cup };
}

function usarCupom(codigo) {
  const c = carregar();
  const cup = c.cupons.find(x => x.codigo === codigo);
  if (!cup) return { ok: false, erro: 'Cupom não encontrado' };
  if (!cup.ativo) return { ok: false, erro: 'Cupom inativo' };
  if (cup.limiteUsos > 0 && cup.usos >= cup.limiteUsos) return { ok: false, erro: 'Limite de usos esgotado' };
  cup.usos++;
  salvar();
  return { ok: true, cupom: cup };
}

function listarCupons(jogo = null, ativo = null) {
  const c = carregar();
  let l = c.cupons;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativo !== null) l = l.filter(x => x.ativo === ativo);
  return l;
}

function estatisticasCupons() {
  const c = carregar();
  const total = c.cupons.length;
  const ativos = c.cupons.filter(x => x.ativo).length;
  const totalUsos = c.cupons.reduce((s, c) => s + (c.usos || 0), 0);
  return { total, ativos, totalUsos };
}

module.exports = { criarCupom, usarCupom, listarCupons, estatisticasCupons, carregar, salvar, ARQ };