// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// 📊 RELATÓRIOS COMPARATIVOS — Ceifalume vs Prancheta lado a lado
// marketing Prancheta + Ceifalume.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const fs = require('fs');
const path = require('path');
const MARKETING_DIR = path.join(__dirname, '..', 'posts', 'marketing');
if (!fs.existsSync(MARKETING_DIR)) fs.mkdirSync(MARKETING_DIR, { recursive: true });
const ARQ = path.join(MARKETING_DIR, 'relatorios-comparativos.json');

let cache = null;
function carregar() {
  if (cache) return cache;
  try { if (fs.existsSync(ARQ)) cache = JSON.parse(fs.readFileSync(ARQ, 'utf8')); } catch (e) {}
  cache = { comparativos: [], proximoId: 1, criadoEm: new Date().toISOString(), atualizadoEm: new Date().toISOString() };
  return cache;
}
function salvar() {
  try { cache.atualizadoEm = new Date().toISOString(); fs.writeFileSync(ARQ, JSON.stringify(cache, null, 2), 'utf8'); } catch (e) {}
}

function adicionarComparativo(metrica, valorCeifalume, valorPrancheta, vencedor, contexto) {
  const c = carregar();
  const id = 'cmp_' + c.proximoId++;
  const comp = { id, metrica, valorCeifalume: Number(valorCeifalume) || 0, valorPrancheta: Number(valorPrancheta) || 0, vencedor: vencedor || 'empate', contexto: contexto || '', diferenca: Math.abs(Number(valorCeifalume) - Number(valorPrancheta)), criadoEm: new Date().toISOString() };
  c.comparativos.push(comp);
  salvar();
  return { ok: true, comparativo: comp };
}

function listarComparativos(metrica = null) {
  const c = carregar();
  if (metrica) return c.comparativos.filter(x => x.metrica === metrica);
  return c.comparativos.sort((a, b) => new Date(b.criadoEm) - new Date(a.criadoEm));
}

function estatisticasComparativos() {
  const c = carregar();
  const total = c.comparativos.length;
  const vCeifalume = c.comparativos.filter(x => x.vencedor === 'ceifalume').length;
  const vPrancheta = c.comparativos.filter(x => x.vencedor === 'prancheta').length;
  const empates = c.comparativos.filter(x => x.vencedor === 'empate').length;
  return { total, ceifalume: vCeifalume, prancheta: vPrancheta, empates };
}

module.exports = { adicionarComparativo, listarComparativos, estatisticasComparativos, carregar, salvar, ARQ };