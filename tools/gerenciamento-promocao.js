// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 🏷️ GERENCIAMENTO DE PROMOÇÃO — controle de promoções e ofertas
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'promocoes.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { promocoes: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function criarPromocao(nome, jogo, descricao, desconto, dataInicio, dataFim, rede) {
  const c = carregar();
  const id = 'prom_' + c.proximoId++;
  const p = { id, nome: nome || '', jogo: jogo || 'ambos', descricao: descricao || '', desconto: desconto || '', dataInicio: dataInicio || '', dataFim: dataFim || '', rede: rede || 'todos', ativa: true, usos: 0, criadoEm: new Date().toISOString() };
  c.promocoes.push(p);
  salvar();
  return { ok: true, promocao: p };
}

function usarPromocao(id) {
  const c = carregar();
  const p = c.promocoes.find(x => x.id === id);
  if (!p) return { ok: false, erro: 'Promoção não encontrada' };
  if (!p.ativa) return { ok: false, erro: 'Promoção inativa' };
  p.usos++;
  salvar();
  return { ok: true, promocao: p };
}

function listarPromocoes(jogo = null, ativa = null) {
  const c = carregar();
  let l = c.promocoes;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (ativa !== null) l = l.filter(x => x.ativa === ativa);
  return l.sort((a, b) => b.usos - a.usos);
}

function estatisticasPromocao() {
  const c = carregar();
  const total = c.promocoes.length;
  const ativas = c.promocoes.filter(x => x.ativa).length;
  const totalUsos = c.promocoes.reduce((s, p) => s + (p.usos || 0), 0);
  return { total, ativas, totalUsos };
}

module.exports = { criarPromocao, usarPromocao, listarPromocoes, estatisticasPromocao, carregar, salvar, ARQ };