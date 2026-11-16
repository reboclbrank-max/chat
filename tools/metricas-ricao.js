// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 MÉTRICAS DE RICAO — custo de aquisição por usuário
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'metricas-ricao.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { metricas: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function registraRicao(jogo, rede, custo, novosUsuarios, periodo) {
  const c = carregar();
  const id = 'ria_' + c.proximoId++;
  const cust = Number(custo) || 0;
  const nus = Number(novosUsuarios) || 1;
  const m = { id, jogo: jogo || 'ambos', rede: rede || 'todos', custo, novosUsuarios, custoPorUsuario: cust / nus, periodo: periodo || '', criadoEm: new Date().toISOString() };
  c.metricas.push(m);
  salvar();
  return { ok: true, metrica: m };
}

function listarRicao(jogo = null, rede = null) {
  const c = carregar();
  let l = c.metricas;
  if (jogo) l = l.filter(x => x.jogo === jogo || x.jogo === 'ambos');
  if (rede) l = l.filter(x => x.rede === rede || x.rede === 'todos');
  return l.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasRicao() {
  const c = carregar();
  const total = c.metricas.length;
  const totalCusto = c.metricas.reduce((s, m) => s + m.custo, 0);
  const totalUsuarios = c.metricas.reduce((s, m) => s + m.novosUsuarios, 0);
  return { total, totalCusto, totalUsuarios, custoMedio: totalUsuarios > 0 ? (totalCusto / totalUsuarios).toFixed(2) : 0 };
}

module.exports = { registraRicao, listarRicao, estatisticasRicao, carregar, salvar, ARQ };